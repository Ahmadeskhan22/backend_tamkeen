const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    organization: { type: String, trim: true },
    isOrganization: { type: Boolean, default: false },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    totalDonated: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    donations: [
      {
        amount: { type: Number, required: true },
        currency: { type: String, default: "USD" },
        request: { type: mongoose.Schema.Types.ObjectId, ref: "Request" },
        student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        note: String,
        donatedAt: { type: Date, default: Date.now },
        paymentMethod: {
          type: String,
          enum: ["bank_transfer", "paypal", "credit_card", "cash", "other"],
          default: "other",
        },
        status: {
          type: String,
          enum: ["pending", "confirmed", "failed"],
          default: "pending",
        },
      },
    ],
    preferredAssistanceType: [
      {
        type: String,
        enum: ["financial", "academic", "psychological", "housing", "food", "other"],
      },
    ],
    isAnonymous: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Donor", donorSchema);
