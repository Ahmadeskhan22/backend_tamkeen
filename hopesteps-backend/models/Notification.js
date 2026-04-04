const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      required: true,
      enum: [
        "request_approved",
        "request_rejected",
        "request_fulfilled",
        "request_updated",
        "donation_received",
        "volunteer_assigned",
        "message_received",
        "account_verified",
        "system",
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed },   // extra payload (e.g. requestId)
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);

// Index for fast unread queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
