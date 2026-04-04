const mongoose = require("mongoose");

const volunteerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    skills: [{ type: String, trim: true }],
    availability: {
      type: String,
      enum: ["full-time", "part-time", "weekends", "flexible"],
      default: "flexible",
    },
    languages: [{ type: String, trim: true }],
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    bio: { type: String, maxlength: 500 },
    specializations: [
      {
        type: String,
        enum: ["academic", "psychological", "legal", "financial", "technical", "other"],
      },
    ],
    totalHoursVolunteered: { type: Number, default: 0 },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Volunteer", volunteerSchema);
