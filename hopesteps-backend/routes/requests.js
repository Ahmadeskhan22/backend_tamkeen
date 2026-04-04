const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Request = require("../models/Request");
const Student = require("../models/Student");
const Notification = require("../models/Notification");
const { protect, authorize } = require("../middleware/auth");

// ─── 1. جلب كل الطلبات العامة (للمتبرعين والمتطوعين) ─────────────────────────
// @route   GET /api/requests
// @access  Public
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status = "approved",
      urgency,
    } = req.query;
    const filter = { isPublic: true };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;

    const requests = await Request.find(filter)
      .populate({
        path: "student",
        populate: { path: "user", select: "name avatar" },
      })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ urgency: -1, createdAt: -1 });

    const total = await Request.countDocuments(filter);
    res.status(200).json({
      status: "success",
      count: requests.length,
      total,
      pages: Math.ceil(total / limit),
      data: requests,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── 2. جلب طلبات الطالب الحالي (شاشة "طلباتي") ──────────────────────────────
// @route   GET /api/requests/my
// @access  Private (student)
router.get("/my", protect, authorize("student"), async (req, res) => {
  try {
    // التأكد من وجود بروفايل للطالب، وإذا لم يوجد ننشئه تلقائياً (لحل الشاشة الحمراء)
    let student = await Student.findOne({ user: req.user._id });
    if (!student) {
      student = new Student({ user: req.user._id });
      await student.save();
    }

    const requests = await Request.find({ student: student._id }).sort(
      "-createdAt",
    );
    res
      .status(200)
      .json({ status: "success", count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── 3. جلب طلب معين بالـ ID ────────────────────────────────────────────────
// @route   GET /api/requests/:id
router.get("/:id", async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate({
        path: "student",
        populate: { path: "user", select: "name avatar country city" },
      })
      .populate("assignedVolunteer")
      .populate("comments.user", "name avatar role");

    if (!request)
      return res
        .status(404)
        .json({ status: "error", message: "Request not found" });
    res.status(200).json({ status: "success", data: request });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── 4. إنشاء طلب جديد (من شاشة الأدوات، الملابس، إلخ) ──────────────────────
// @route   POST /api/requests
// @access  Private (student)
router.post(
  "/",
  protect,
  authorize("student"),
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required"),
    body("type")
      .isIn([
        "financial",
        "academic",
        "psychological",
        "housing",
        "food",
        "other",
        "clothes",
        "stationery",
        "tutoring", // الأنواع الجديدة
      ])
      .withMessage("Invalid request type"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "error", errors: errors.array() });
    }

    try {
      // التأكد من وجود بروفايل للطالب، وإذا لم يوجد ننشئه تلقائياً
      let student = await Student.findOne({ user: req.user._id });
      if (!student) {
        student = new Student({ user: req.user._id });
        await student.save();
      }

      // استخدام new Request().save() بدل create لحل مشكلة الإيرور
      const newRequest = new Request({
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        urgency: req.body.urgency || "medium",
        isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true,
        student: student._id,
        status: "pending",
      });

      await newRequest.save();
      res.status(201).json({ status: "success", data: newRequest });
    } catch (err) {
      console.error("❌ Error creating request:", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);

// ─── 5. تعديل الطلب ─────────────────────────────────────────────────────────
// @route   PUT /api/requests/:id
// @access  Private (student)
router.put("/:id", protect, authorize("student"), async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student)
      return res
        .status(404)
        .json({ status: "error", message: "Student not found" });

    const request = await Request.findOne({
      _id: req.params.id,
      student: student._id,
    });
    if (!request)
      return res
        .status(404)
        .json({
          status: "error",
          message: "Request not found or not owned by you",
        });

    if (!["pending", "under_review"].includes(request.status)) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Cannot edit request in current status",
        });
    }

    const allowed = [
      "title",
      "description",
      "urgency",
      "amountNeeded",
      "isPublic",
    ];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) request[f] = req.body[f];
    });

    await request.save();
    res.status(200).json({ status: "success", data: request });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── 6. إضافة تعليق على الطلب ───────────────────────────────────────────────
// @route   POST /api/requests/:id/comment
// @access  Private
router.post("/:id/comment", protect, async (req, res) => {
  try {
    if (!req.body.text?.trim()) {
      return res
        .status(400)
        .json({ status: "error", message: "Comment text is required" });
    }
    const request = await Request.findById(req.params.id);
    if (!request)
      return res
        .status(404)
        .json({ status: "error", message: "Request not found" });

    request.comments.push({ user: req.user._id, text: req.body.text.trim() });
    await request.save();
    await request.populate("comments.user", "name avatar role");

    res.status(201).json({ status: "success", data: request.comments });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── 7. تغيير حالة الطلب (من قِبل الإدارة أو المتطوع) ───────────────────────
// @route   PUT /api/requests/:id/status
// @access  Private (admin, volunteer)
router.put(
  "/:id/status",
  protect,
  authorize("admin", "volunteer"),
  async (req, res) => {
    try {
      const { status, reviewNote } = req.body;
      const validStatuses = [
        "under_review",
        "approved",
        "in_progress",
        "fulfilled",
        "rejected",
        "closed",
      ];

      if (!validStatuses.includes(status)) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid status value" });
      }

      const request = await Request.findByIdAndUpdate(
        req.params.id,
        {
          status,
          reviewNote,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
        { new: true },
      ).populate({
        path: "student",
        populate: { path: "user", select: "_id" },
      });

      if (!request)
        return res
          .status(404)
          .json({ status: "error", message: "Request not found" });

      // إرسال إشعار للطالب
      const statusMessages = {
        approved: "تمت الموافقة على طلبك",
        rejected: "تم رفض طلبك",
        in_progress: "طلبك قيد المعالجة الآن",
        fulfilled: "تم تلبية طلبك بنجاح",
      };

      if (statusMessages[status]) {
        await Notification.create({
          recipient: request.student.user._id,
          sender: req.user._id,
          type: `request_${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "updated"}`,
          title: statusMessages[status],
          message: `${statusMessages[status]}: "${request.title}"`,
          data: { requestId: request._id },
        });

        const io = req.app.get("io");
        if (io) {
          io.to(String(request.student.user._id)).emit("notification", {
            type: "request_status_changed",
            message: statusMessages[status],
          });
        }
      }

      res.status(200).json({ status: "success", data: request });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);

module.exports = router;
