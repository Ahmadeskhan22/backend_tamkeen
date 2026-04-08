const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Student = require("../models/Student");
const Volunteer = require("../models/Volunteer");
const Donor = require("../models/Donor");
const { protect } = require("../middleware/auth");
const nodemailer = require("nodemailer");
// Helper: send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  res.status(statusCode).json({
    status: "success",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
    },
  });
};

// Validation rules
const registerValidation = [
  body("name").notEmpty().withMessage("الاسم مطلوب"),
  body("email").isEmail().withMessage("يرجى إدخال إيميل صحيح"),
  body("password")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "كلمة السر ضعيفة! يجب أن تحتوي على 8 خانات، حرف كبير، حرف صغير، رقم، ورمز خاص (@#$)",
    ),
  body("role").isIn(["student", "volunteer", "donor"]),
];
// @route  POST /api/auth/register
// @desc   Register new user
// @access Public
// router.post("/register", registerValidation, async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ status: "error", errors: errors.array() });
//   }

//   try {
//     const { name, email, password, role, phone } = req.body;

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ status: "error", message: "Email already registered" });
//     }

//     const user = await User.create({ name, email, password, role, phone });

//     // Create role-specific profile
//     if (role === "student") await Student.create({ user: user._id });
//     else if (role === "volunteer") await Volunteer.create({ user: user._id });
//     else if (role === "donor") await Donor.create({ user: user._id });

//     sendTokenResponse(user, 201, res);
//   } catch (err) {
//     console.error("Register error:", err.message);
//     res.status(500).json({ status: "error", message: "Server error during registration" });
//   }
// });

// // @route  POST /api/auth/login
// // @desc   Login user
// // @access Public
// router.post(
//   "/login",
//   [
//     body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
//     body("password").notEmpty().withMessage("Password is required"),
//   ],
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ status: "error", errors: errors.array() });
//     }

//     try {
//       const { email, password } = req.body;
//       const user = await User.findOne({ email }).select("+password");

//       if (!user || !(await user.matchPassword(password))) {
//         return res.status(401).json({ status: "error", message: "Invalid email or password" });
//       }

//       if (!user.isActive) {
//         return res.status(401).json({ status: "error", message: "Account has been deactivated" });
//       }

//       user.lastLogin = new Date();
//       await user.save({ validateBeforeSave: false });

//       sendTokenResponse(user, 200, res);
//     } catch (err) {
//       console.error("Login error:", err.message);
//       res.status(500).json({ status: "error", message: "Server error during login" });
//     }
//   }
// );
/////////////////////
// @route   POST /api/auth/register
router.post("/register", registerValidation, async (req, res, next) => {
  // أضفنا next هنا ✅
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "error", errors: errors.array() });
  }

  try {
    const { name, email, password, role, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ status: "error", message: "Email already registered" });
    }

    const user = await User.create({ name, email, password, role, phone });

    // إنشاء بروفايل حسب النوع (طالب، متطوع، متبرع)
    if (role === "student") await Student.create({ user: user._id });
    else if (role === "volunteer") await Volunteer.create({ user: user._id });
    else if (role === "donor") await Donor.create({ user: user._id });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err); // الآن سيعمل الـ Global Error Handler بنجاح 🚀
  }
});

// @route   POST /api/auth/login
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res, next) => {
    // أضفنا next هنا ✅
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "error", errors: errors.array() });
    }

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("+password");

      if (!user || !(await user.matchPassword(password))) {
        return res
          .status(401)
          .json({ status: "error", message: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res
          .status(401)
          .json({ status: "error", message: "Account has been deactivated" });
      }

      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      sendTokenResponse(user, 200, res);
    } catch (err) {
      next(err);
    }
  },
);

// @route  GET /api/auth/me
// @desc   Get current logged-in user
// @access Private
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ status: "success", data: user });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  PUT /api/auth/update-password
// @desc   Update password
// @access Private
router.put(
  "/update-password",
  protect,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "error", errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user._id).select("+password");
      if (!(await user.matchPassword(req.body.currentPassword))) {
        return res
          .status(401)
          .json({ status: "error", message: "Current password is incorrect" });
      }
      user.password = req.body.newPassword;
      await user.save();
      sendTokenResponse(user, 200, res);
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);

// @route  PUT /api/auth/update-profile
// @desc   Update name / phone / avatar
// @access Private
router.put("/update-profile", protect, async (req, res) => {
  try {
    const allowedFields = {
      name: req.body.name,
      phone: req.body.phone,
      avatar: req.body.avatar,
    };
    // Remove undefined fields
    Object.keys(allowedFields).forEach(
      (k) => allowedFields[k] === undefined && delete allowedFields[k],
    );

    const user = await User.findByIdAndUpdate(req.user._id, allowedFields, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ status: "success", data: user });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  POST /api/auth/logout
// @desc   Logout (client should discard token; placeholder for token blacklist)
// @access Private
router.post("/logout", protect, (req, res) => {
  res
    .status(200)
    .json({ status: "success", message: "Logged out successfully" });
});

// @route   PUT /api/auth/updatepassword
// @desc    Update password
// @access  Private
router.put("/updatepassword", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. جلب المستخدم والتأكد من كلمة السر (مع تضمين الباسورد لأنه مخفي بالديفولت)
    const user = await User.findById(req.user.id).select("+password");

    // 2. التحقق من كلمة السر الحالية
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ status: "error", message: "كلمة المرور الحالية غير صحيحة" });
    }

    // 3. تحديث كلمة السر (الموديل عندك غالباً بشفرها تلقائياً عند الحفظ)
    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ status: "success", message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("🔍 محاولة استعادة الباسورد لـ:", email); // رح يطبع الإيميل في اللوج

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "الإيميل غير موجود" });
    }

    // توليد كود بسيط يدوي عشان نتأكد إنه المشكلة مش من الموديل
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    console.log("✅ تم توليد الكود وحفظه.. جاري محاولة الإرسال...");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "كود التحقق",
      text: `كودك هو: ${resetToken}`,
    });

    console.log("🚀 تم إرسال الإيميل بنجاح!");
    res.status(200).json({ status: "success", message: "وصلك الإيميل!" });
  } catch (error) {
    // 🔥 هاد السطر هو "الكنز" اللي رح يحكيلنا شو المشكلة
    console.error("❌ ERROR DETAIL:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
