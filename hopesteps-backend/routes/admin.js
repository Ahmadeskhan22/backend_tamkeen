const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Student = require("../models/Student");
const Volunteer = require("../models/Volunteer");
const Donor = require("../models/Donor");
const Request = require("../models/Request");
const Notification = require("../models/Notification");
const { protect, authorize } = require('../middleware/auth');

// GET /api/admin/dashboard — donors and volunteers can read stats too
router.get('/dashboard', protect, authorize('admin', 'donor', 'volunteer'), async (req, res) => {
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
      User.countDocuments({ role: 'student',   isActive: true }),
      User.countDocuments({ role: 'volunteer', isActive: true }),
      User.countDocuments({ role: 'donor',     isActive: true }),
      Request.countDocuments(),
      Request.countDocuments({ status: 'pending' }),
      Request.countDocuments({ status: 'fulfilled' }),
      Request.countDocuments({ urgency: 'high', status: { $in: ['pending', 'under_review', 'approved'] } }),
    ]);

    const recentRequests = await Request.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('student', 'name');

    res.json({
      status: 'success',
      data: {
        stats: {
          totalStudents, totalVolunteers, totalDonors,
          totalRequests, pendingRequests, fulfilledRequests, urgentRequests,
        },
        recentRequests,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin-only routes below
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    if (role)     filter.role     = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ status: 'success', count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.put('/users/:id/toggle', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'المستخدم غير موجود' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ status: 'success', data: user });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

router.put('/requests/:id/status', protect, authorize('admin'), async (req, res) => {
  const { status } = req.body;
  try {
    const request = await Request.findByIdAndUpdate(
      req.params.id, { status }, { new: true, runValidators: true }
    );
    if (!request) return res.status(404).json({ status: 'error', message: 'الطلب غير موجود' });
    res.json({ status: 'success', data: request });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

module.exports = router;