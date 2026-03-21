const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true,
  },
  email: {
    type: String,
    index: true,
  },
  otpCode: {
    type: String,
    required: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'verification', 'password_reset'],
    default: 'login',
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  usedAt: {
    type: Date,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 5,
  },
  expiryTime: {
    type: Date,
    required: true,
    index: { expires: 600 }, // Auto-delete after 10 minutes
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('OTP', otpSchema);
