const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
    index: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
  },
  qrHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  qrData: {
    type: String,
    required: true,
  },
  qrImage: {
    type: String,
    required: true,
  },
  encryptedData: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Auto-delete after expiry
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastScannedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('QRCode', qrCodeSchema);
