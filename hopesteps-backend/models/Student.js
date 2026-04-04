const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    university: { type: String, trim: true },
    major: { type: String, trim: true },
    year: {
      type: Number,
      min: [1, "Year must be at least 1"],
      max: [8, "Year cannot exceed 8"],
    },
    gpa: { type: Number, min: 0, max: 4 },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    bio: { type: String, maxlength: 500 },
    documents: [
      {
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    needsAssistance: { type: Boolean, default: false },
    assistanceType: [
      {
        type: String,
        enum: ["financial", "academic", "psychological", "housing", "food", "other"],
      },
    ],
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
