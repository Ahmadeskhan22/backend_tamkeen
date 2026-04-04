
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true, 
      trim: true 
    },
    description: { 
      type: String, 
      required: true, 
      trim: true 
    },
    type: {
      type: String,
      required: true,
      enum: [
        "financial",
        "academic",
        "psychological",
        "housing",
        "food",
        "other",
        "clothes",      // الزي المدرسي والملابس
        "stationery",   // الأدوات المدرسية
        "tutoring"      // الدروس التطوعية
      ],
    },
    urgency: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    isPublic: { 
      type: Boolean, 
      default: true 
    },
    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Student", 
      required: true 
    },
    status: {
      type: String,
      enum: [
        "pending",
        "under_review",
        "approved",
        "in_progress",
        "fulfilled",
        "rejected",
        "closed",
      ],
      default: "pending",
    },
    amountNeeded: { 
      type: Number 
    },
    amountRaised: { 
      type: Number, 
      default: 0 
    },
    assignedVolunteer: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Volunteer" 
    },
    reviewedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    reviewedAt: { 
      type: Date 
    },
    reviewNote: { 
      type: String 
    },
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);