const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
  },
  enrollmentNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  rollNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  department: {
    type: String,
    required: true,
  },
  course: {
    type: String,
    required: true,
  },
  semester: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  branch: {
    type: String,
  },
  profilePhoto: {
    type: String,
  },
  deviceFingerprint: {
    type: String,
  },
  mobileNumber: {
    type: String,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
