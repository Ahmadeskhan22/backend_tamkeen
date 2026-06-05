const mongoose = require("mongoose");

const pledgeSchema = new mongoose.Schema({
  donor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  pledgeType: { 
    type: String, 
    required: true 
  }, // مثل: "كفالة تعليمية"، "وجبات"
  status: { 
    type: String, 
    default: "قيد الانتظار" 
  }, // عشان الإدارة تقدر تغير حالته لاحقاً
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model("Pledge", pledgeSchema);