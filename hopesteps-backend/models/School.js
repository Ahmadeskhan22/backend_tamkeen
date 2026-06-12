const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    schoolName: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    studentsCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("School", schoolSchema);