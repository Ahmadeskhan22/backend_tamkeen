const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // لا يظهر في الاستعلامات العادية للحماية
    },
    role: {
      type: String,
      enum: ["student", "volunteer", "donor", "admin"],
      default: "student",
    },
    phone: { type: String, trim: true },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },

    // حقول استعادة كلمة السر (OTP)
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    lastLogin: Date,
  },
  { timestamps: true },
);

// تشفير كلمة السر قبل الحفظ
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// مقارنة كلمة السر عند تسجيل الدخول
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// إنشاء توكن JWT للجلسة
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// --- دالة توليد كود الـ 6 أرقام (OTP) ---
userSchema.methods.getResetPasswordToken = function () {
  // 1. توليد رقم عشوائي من 6 خانات
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. تخزين الكود في الداتابيز
  this.resetPasswordToken = resetToken;

  this.resetPasswordExpire = Date.now() + 120 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
