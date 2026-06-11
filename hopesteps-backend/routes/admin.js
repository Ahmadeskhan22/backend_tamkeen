const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Volunteer = require("../models/Volunteer");
const Donor = require("../models/Donor");
const Request = require("../models/Request");

// ─── GET /api/admin/dashboard ────────────────────────────────────────────────
// Open route — no auth required (dashboard HTML handles its own JWT header)
router.get("/dashboard", async (req, res) => {
  try {
    const [
      totalStudents,
      totalVolunteers,
      totalDonors,
      totalRequests,
      pendingRequests,
      fulfilledRequests,
      urgentRequests,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "volunteer" }),
      User.countDocuments({ role: "donor" }),
      Request.countDocuments(),
      Request.countDocuments({ status: "pending" }),
      Request.countDocuments({ status: "fulfilled" }),
      Request.countDocuments({ urgency: "high" }),
    ]);

    const totalDonationResult = await Donor.aggregate([
      { $group: { _id: null, total: { $sum: "$totalDonated" } } },
    ]);
    const totalDonationsAmount = totalDonationResult[0]?.total || 0;

    const recentRequests = await Request.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      status: "success",
      data: {
        stats: {
          totalStudents,
          totalVolunteers,
          totalDonors,
          totalRequests,
          pendingRequests,
          fulfilledRequests,
          urgentRequests,
          totalDonationsAmount,
        },
        recentRequests,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── GET /api/admin/pledges ──────────────────────────────────────────────────
// Returns donor records (acting as pledge history since Pledge model is not yet created)
router.get("/pledges", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const donors = await Donor.find({ "donations.0": { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate("user", "name email")
      .lean();

    // Flatten donations into pledge-like rows
    const pledges = [];
    for (const donor of donors) {
      for (const d of donor.donations || []) {
        pledges.push({
          _id: d._id,
          donor: donor.user,
          pledgeType: d.paymentMethod || "other",
          amount: d.amount,
          currency: d.currency,
          status: d.status,
          createdAt: d.donatedAt,
        });
      }
    }
    pledges.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      status: "success",
      count: pledges.length,
      data: pledges.slice(0, limit),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── GET /api/admin/volunteer-requests ──────────────────────────────────────
router.get("/volunteer-requests", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const volunteers = await Volunteer.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "name email phone")
      .lean();

    res.json({ status: "success", count: volunteers.length, data: volunteers });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── PUT /api/admin/volunteers/:id/approve ───────────────────────────────────
router.put("/volunteers/:id/approve", async (req, res) => {
  try {
    const volunteer = await Volunteer.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, approvedAt: new Date() },
      { new: true },
    );
    if (!volunteer)
      return res
        .status(404)
        .json({ status: "error", message: "Volunteer not found" });
    res.json({ status: "success", data: volunteer });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── PUT /api/admin/volunteers/:id/reject ────────────────────────────────────
router.put("/volunteers/:id/reject", async (req, res) => {
  try {
    const volunteer = await Volunteer.findByIdAndUpdate(
      req.params.id,
      { isApproved: false },
      { new: true },
    );
    if (!volunteer)
      return res
        .status(404)
        .json({ status: "error", message: "Volunteer not found" });
    res.json({ status: "success", data: volunteer });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── GET /api/admin/users ────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ status: "success", count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── GET /api/admin/requests ─────────────────────────────────────────────────
router.get("/requests", async (req, res) => {
  try {
    const { status, type, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const requests = await Request.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Request.countDocuments(filter);
    res.json({
      status: "success",
      count: requests.length,
      total,
      data: requests,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
// ─── PUT /api/admin/users/:id/toggle ─────────────────────────────────────────
router.put("/users/:id/toggle", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ status: "error", message: "المستخدم غير موجود" });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.json({ status: "success", data: user });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

// ─── PUT /api/admin/requests/:id/status ──────────────────────────────────────
router.put("/requests/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status, reviewedAt: new Date() },
      { new: true, runValidators: true },
    );
    if (!request)
      return res
        .status(404)
        .json({ status: "error", message: "Request not found" });
    res.json({ status: "success", data: request });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
});

module.exports = router;
