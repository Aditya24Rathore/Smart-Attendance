const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  enrollmentNo: {
    type: String,
    required: true,
    index: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
    index: true,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
  },
  qrCodeHash: {
    type: String,
    required: true,
    index: true,
  },
  qrGeneratedAt: {
    type: Date,
    required: true,
  },
  scannedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  ipAddress: {
    type: String,
  },
  deviceInfo: {
    type: String,
  },
  attendanceStatus: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    default: 'present',
  },
  remarks: {
    type: String,
  },
  isSynced: {
    type: Boolean,
    default: true,
  },
  syncedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: true });

// Index for efficient querying
attendanceSchema.index({ studentId: 1, scannedAt: 1 });
attendanceSchema.index({ teacherId: 1, scannedAt: 1 });
attendanceSchema.index({ enrollmentNo: 1, scannedAt: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
