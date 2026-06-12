// models/Issue.js
const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  imageUrl: { 
    type: String, 
    default: '' 
  },
  // 🌟 الحقول الجديدة الخاصة بمعلومات المدرسة
  city: { 
    type: String, 
    required: true // المدينة (مثال: عمان، الزرقاء، إربد)
  },
  district: { 
    type: String, 
    required: true // المديرية التابعة لها (مثال: لواء الجامعة، مديرية الزرقاء الأولى)
  },
  schoolEmail: { 
    type: String, 
    required: true // إيميل المدرسة للتواصل
  },
  
  status: { 
    type: String, 
    default: 'Pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Issue', issueSchema);