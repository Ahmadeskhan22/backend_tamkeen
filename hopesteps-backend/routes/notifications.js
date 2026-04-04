const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

// All notification routes require authentication
router.use(protect);

// @route  GET /api/notifications
// @desc   Get my notifications
// @access Private
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { recipient: req.user._id };
    if (unreadOnly === "true") filter.isRead = false;

    const notifications = await Notification.find(filter)
      .populate("sender", "name avatar role")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort("-createdAt");

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

    res.status(200).json({
      status: "success",
      count: notifications.length,
      total,
      unreadCount,
      pages: Math.ceil(total / limit),
      data: notifications,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  PUT /api/notifications/:id/read
// @desc   Mark a notification as read
// @access Private
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ status: "error", message: "Notification not found" });
    res.status(200).json({ status: "success", data: notification });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  PUT /api/notifications/read-all
// @desc   Mark all notifications as read
// @access Private
router.put("/read-all", async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.status(200).json({ status: "success", message: `${result.modifiedCount} notifications marked as read` });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  DELETE /api/notifications/:id
// @desc   Delete a notification
// @access Private
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return res.status(404).json({ status: "error", message: "Notification not found" });
    res.status(200).json({ status: "success", message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  DELETE /api/notifications
// @desc   Delete all my notifications
// @access Private
router.delete("/", async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user._id });
    res.status(200).json({ status: "success", message: `${result.deletedCount} notifications deleted` });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;
