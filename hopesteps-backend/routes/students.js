const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// @route  GET /api/students
// @desc   Get all students (admin/volunteer only)
// @access Private
router.get("/", protect, authorize("admin", "volunteer"), async (req, res) => {
  try {
    const { page = 1, limit = 20, country, needsAssistance, isVerified } = req.query;
    const filter = {};
    if (country) filter.country = country;
    if (needsAssistance !== undefined) filter.needsAssistance = needsAssistance === "true";
    if (isVerified !== undefined) filter.isVerified = isVerified === "true";

    const students = await Student.find(filter)
      .populate("user", "name email phone avatar isActive")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort("-createdAt");

    const total = await Student.countDocuments(filter);
    res.status(200).json({
      status: "success",
      count: students.length,
      total,
      pages: Math.ceil(total / limit),
      data: students,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  GET /api/students/me
// @desc   Get my student profile
// @access Private (student)
router.get("/me", protect, authorize("student"), async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id }).populate("user", "name email phone avatar");
    if (!student) return res.status(404).json({ status: "error", message: "Student profile not found" });
    res.status(200).json({ status: "success", data: student });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  GET /api/students/:id
// @desc   Get student by ID
// @access Private
router.get("/:id", protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("user", "name email phone avatar");
    if (!student) return res.status(404).json({ status: "error", message: "Student not found" });
    res.status(200).json({ status: "success", data: student });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  PUT /api/students/me
// @desc   Update my student profile
// @access Private (student)
router.put("/me", protect, authorize("student"), async (req, res) => {
  try {
    const allowed = ["university", "major", "year", "gpa", "country", "city", "bio", "needsAssistance", "assistanceType"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const student = await Student.findOneAndUpdate({ user: req.user._id }, updates, {
      new: true, runValidators: true,
    }).populate("user", "name email phone avatar");

    if (!student) return res.status(404).json({ status: "error", message: "Student profile not found" });
    res.status(200).json({ status: "success", data: student });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  PUT /api/students/:id/verify
// @desc   Verify a student (admin only)
// @access Private (admin)
router.put("/:id/verify", protect, authorize("admin"), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, verifiedBy: req.user._id, verifiedAt: new Date() },
      { new: true }
    );
    if (!student) return res.status(404).json({ status: "error", message: "Student not found" });

    // Also verify the linked user account
    await User.findByIdAndUpdate(student.user, { isVerified: true });

    res.status(200).json({ status: "success", message: "Student verified", data: student });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;
