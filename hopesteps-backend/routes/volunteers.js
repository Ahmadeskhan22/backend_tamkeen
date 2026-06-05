const express = require("express");
const router = express.Router();
const Volunteer = require("../models/Volunteer");
const { protect, authorize } = require("../middleware/auth");

// @route  GET /api/volunteers
// @desc   Get all approved volunteers
// @access Private
router.get("/", protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, specialization, availability } = req.query;
    const filter = { isApproved: true };
    if (specialization) filter.specializations = specialization;
    if (availability) filter.availability = availability;

    const volunteers = await Volunteer.find(filter)
      .populate("user", "name email phone avatar")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort("-rating");

    const total = await Volunteer.countDocuments(filter);
    res.status(200).json({ status: "success", count: volunteers.length, total, data: volunteers });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  GET /api/volunteers/me
// @access Private (volunteer)
router.get("/me", protect, authorize("volunteer"), async (req, res) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user._id })
      .populate("user", "name email phone avatar")
      .populate("assignedStudents");
    if (!volunteer) return res.status(404).json({ status: "error", message: "Volunteer profile not found" });
    res.status(200).json({ status: "success", data: volunteer });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  GET /api/volunteers/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id).populate("user", "name email phone avatar");
    if (!volunteer) return res.status(404).json({ status: "error", message: "Volunteer not found" });
    res.status(200).json({ status: "success", data: volunteer });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  PUT /api/volunteers/me
// @access Private (volunteer)
router.put("/me", protect, authorize("volunteer"), async (req, res) => {
  try {
    const allowed = ["skills", "availability", "languages", "country", "city", "bio", "specializations"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const volunteer = await Volunteer.findOneAndUpdate({ user: req.user._id }, updates, {
      new: true, runValidators: true,
    }).populate("user", "name email phone avatar");

    if (!volunteer) return res.status(404).json({ status: "error", message: "Volunteer profile not found" });
    res.status(200).json({ status: "success", data: volunteer });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// @route  PUT /api/volunteers/:id/approve
// @access Private (admin)
router.put("/:id/approve", protect, authorize("admin"), async (req, res) => {
  try {
    const volunteer = await Volunteer.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!volunteer) return res.status(404).json({ status: "error", message: "Volunteer not found" });
    res.status(200).json({ status: "success", message: "Volunteer approved", data: volunteer });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});


// @route   POST /api/volunteers
// @desc    Create a volunteer profile for the logged-in user
// @access  Private (Any logged-in user can apply to be a volunteer)

router.post("/", protect, async (req, res) => {
  try {
    // 1. التأكد أن المستخدم ليس لديه ملف متطوع مسبقاً
    let volunteer = await Volunteer.findOne({ user: req.user._id });
    if (volunteer) {
      return res.status(400).json({ 
        status: "error", 
        message: "أنت مسجل كمتطوع مسبقاً" 
      });
    }

    // 2. استخراج الخيارات السريعة من الطلب (فلاتر سيبعث مصفوفة interests)
    const { interests } = req.body;

    // التحقق من أن المستخدم اختار مجالاً واحداً على الأقل
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "الرجاء اختيار مجال تطوع واحد على الأقل"
      });
    }

    // 3. إنشاء ملف المتطوع السريع
    // سنضع مصفوفة الخيارات داخل specializations، ونتجاهل الحقول المعقدة القديمة
    volunteer = await Volunteer.create({
      user: req.user._id,
      specializations: interests, // تخزين الخيارات هنا
      isApproved: true // (اختياري) خليتها true عشان يتفعل حسابه فوراً بدون انتظار أدمن
    });

    res.status(201).json({ 
      status: "success", 
      message: "تم تسجيلك كمتطوع بنجاح! شكراً لعطائك 🌟", 
      data: volunteer 
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
module.exports = router;
