const express = require("express");
const router = express.Router();
const Donor = require("../models/Donor");
const Request = require("../models/Request");
const Notification = require("../models/Notification");
const { protect, authorize } = require("../middleware/auth");

// ─── 1. مسار التبرع العيني البسيط (لواجهة الفلاتر الحالية) ─────────────
// @route   POST /api/donors/pledge
// @access  Private (donor)
router.post("/pledge", protect, authorize("donor"), async (req, res) => {
  try {
    const { pledgeType, description } = req.body;

    // بما أن هذا تبرع عيني (أدوات، ملابس، كفالة)، سنكتفي بإرجاع رسالة نجاح
    // ليتفاعل معها تطبيق الفلاتر وتظهر للمستخدم. (يمكن مستقبلاً حفظها في جدول منفصل)
    res.status(200).json({
      status: "success",
      message: `تم استلام طلب التبرع بـ (${pledgeType}) بنجاح! سنتواصل معك قريباً.`,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── 2. جلب كل المتبرعين (للأدمن) ──────────────────────────────────────
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const donors = await Donor.find()
      .populate("user", "name email phone avatar")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort("-totalDonated");

    const total = await Donor.countDocuments();
    res
      .status(200)
      .json({ status: "success", count: donors.length, total, data: donors });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── 3. جلب ملف المتبرع الشخصي ─────────────────────────────────────────
router.get("/me", protect, authorize("donor"), async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user._id }).populate(
      "user",
      "name email phone avatar",
    );
    if (!donor)
      return res
        .status(404)
        .json({ status: "error", message: "Donor profile not found" });
    res.status(200).json({ status: "success", data: donor });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── 4. تعديل ملف المتبرع الشخصي ───────────────────────────────────────
router.put("/me", protect, authorize("donor"), async (req, res) => {
  try {
    const allowed = [
      "organization",
      "isOrganization",
      "country",
      "city",
      "preferredAssistanceType",
      "isAnonymous",
    ];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const donor = await Donor.findOneAndUpdate(
      { user: req.user._id },
      updates,
      {
        new: true,
        runValidators: true,
      },
    ).populate("user", "name email phone avatar");

    if (!donor)
      return res
        .status(404)
        .json({ status: "error", message: "Donor profile not found" });
    res.status(200).json({ status: "success", data: donor });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── 5. التبرع المالي لطلب معين (مجهز للمستقبل) ────────────────────────
router.post(
  "/donate/:requestId",
  protect,
  authorize("donor"),
  async (req, res) => {
    try {
      const {
        amount,
        currency = "USD",
        note,
        paymentMethod = "other",
      } = req.body;

      if (!amount || amount <= 0) {
        return res
          .status(400)
          .json({ status: "error", message: "Valid amount is required" });
      }

      const request = await Request.findById(req.params.requestId).populate(
        "student",
      );
      if (!request)
        return res
          .status(404)
          .json({ status: "error", message: "Request not found" });
      if (request.type !== "financial") {
        return res
          .status(400)
          .json({
            status: "error",
            message: "This request does not accept financial donations",
          });
      }

      const donor = await Donor.findOne({ user: req.user._id });
      if (!donor)
        return res
          .status(404)
          .json({ status: "error", message: "Donor profile not found" });

      // تسجيل التبرع
      donor.donations.push({
        amount,
        currency,
        note,
        paymentMethod,
        request: request._id,
        student: request.student._id,
        status: "confirmed",
      });
      donor.totalDonated += amount;
      await donor.save();

      // تحديث المبلغ المجموع للطلب
      request.amountRaised = (request.amountRaised || 0) + amount;
      if (request.amountRaised >= request.amountNeeded) {
        request.status = "fulfilled";
      }
      await request.save();

      // إرسال إشعار للطالب
      await Notification.create({
        recipient: request.student.user,
        sender: req.user._id,
        type: "donation_received",
        title: "تلقيت تبرعاً جديداً",
        message: `تم استلام تبرع بمبلغ ${amount} ${currency} لطلبك "${request.title}"`,
        data: { requestId: request._id, amount, currency },
      });

      res
        .status(200)
        .json({
          status: "success",
          message: "Donation recorded successfully",
          data: { amount, currency, request: request._id },
        });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);

module.exports = router;
