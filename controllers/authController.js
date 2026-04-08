const User = require("../models/User");
const nodemailer = require("nodemailer");

// ─── 1. Register User (إنشاء حساب جديد) ──────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
    });

    const token = user.getSignedJwtToken();

    res.status(201).json({
      status: "success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ status: "error", message: "هذا الإيميل مسجل مسبقاً" });
    }
    res.status(400).json({ status: "error", message: err.message });
  }
};

// ─── 2. Login User (تسجيل الدخول) ────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "الرجاء إدخال الإيميل وكلمة المرور",
        });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(401)
        .json({ status: "error", message: "بيانات الدخول غير صحيحة" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ status: "error", message: "بيانات الدخول غير صحيحة" });
    }

    if (!user.isActive) {
      return res
        .status(401)
        .json({ status: "error", message: "هذا الحساب غير مفعل" });
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      status: "success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// ─── 3. Forgot Password (نسيت كلمة المرور) ──────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const userEmail = req.body.email;

    // 1. التأكد إن الإيميل موجود
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "الإيميل غير مسجل لدينا" });
    }

    // 2. توليد كود من 6 أرقام وحفظه في الداتابيز لمدة 10 دقائق
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // 3. تجهيز الإيميل للإرسال
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "كود استعادة كلمة المرور - تطبيق تمكين",
      text: `مرحباً ${user.name}،\n\nكود التحقق الخاص بك هو: ${resetToken}\n\nهذا الكود صالح لمدة 10 دقائق فقط.`,
    };

    // 4. الإرسال
    await transporter.sendMail(mailOptions);
    res
      .status(200)
      .json({
        status: "success",
        message: "تم إرسال كود الاستعادة إلى إيميلك",
      });
  } catch (error) {
    // التراجع في حال فشل الإرسال
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }
    console.error("Email Error:", error);
    res
      .status(500)
      .json({ status: "error", message: "حدث خطأ أثناء إرسال الإيميل" });
  }
};
