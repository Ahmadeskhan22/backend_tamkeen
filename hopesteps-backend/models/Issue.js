const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');

// POST /api/schools/report-issue
router.post('/report-issue', async (req, res) => {
  try {
    const { title, description, imageUrl, city, district, schoolEmail } = req.body;

    if (!title || !description || !city || !district || !schoolEmail) {
      return res.status(400).json({ 
        message: 'الرجاء تعبئة جميع الحقول المطلوبة (العنوان، الوصف، المدينة، المديرية، وإيميل المدرسة)' 
      });
    }

    const newIssue = new Issue({
      title,
      description,
      imageUrl,
      city,
      district,
      schoolEmail
    });

    await newIssue.save();

    res.status(201).json({
      success: true,
      message: 'تم رفع البلاغ ومعلومات المدرسة بنجاح!',
      data: newIssue
    });

  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر أثناء حفظ البيانات' });
  }
});

module.exports = router;