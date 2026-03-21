const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { Student, Attendance, QRCode } = require('../models');
const QRService = require('../services/QRService');
const router = express.Router();

/**
 * GET /api/student/dashboard
 * Get student dashboard data
 */
router.get('/dashboard', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.userId });
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get attendance statistics
    const totalClasses = await Attendance.countDocuments({ studentId: student._id });
    const presentDays = await Attendance.countDocuments({
      studentId: student._id,
      attendanceStatus: 'present',
    });

    const attendancePercentage = totalClasses > 0 ? ((presentDays / totalClasses) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      student: student.toObject(),
      statistics: {
        totalClasses,
        presentDays,
        attendancePercentage,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/student/scan-qr
 * Student scans QR code for attendance
 */
router.post('/scan-qr', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const { qrHash, encryptedData } = req.body;

    if (!qrHash || !encryptedData) {
      return res.status(400).json({ error: 'QR data required' });
    }

    const student = await Student.findOne({ userId: req.userId });
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Find QR code
    const qrCode = await QRCode.findOne({ qrHash, isActive: true });
    if (!qrCode) {
      return res.status(400).json({ error: 'Invalid or expired QR code' });
    }

    // Verify QR code is not expired
    if (new Date() > qrCode.expiresAt) {
      return res.status(400).json({ error: 'QR code has expired' });
    }

    // Decrypt and verify data
    let qrData;
    try {
      qrData = QRService.decryptData(encryptedData);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid QR data' });
    }

    // Verify QR code validity (30-second window)
    const verification = QRService.verifyQRCode(qrHash, qrCode.generatedAt);
    if (!verification.isValid) {
      return res.status(400).json({ error: verification.error });
    }

    // Create attendance record
    const attendance = new Attendance({
      studentId: student._id,
      enrollmentNo: student.enrollmentNo,
      teacherId: qrData.teacherId,
      qrCodeHash: qrHash,
      qrGeneratedAt: qrCode.generatedAt,
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      attendanceStatus: 'present',
    });

    await attendance.save();

    // Update QR code usage
    qrCode.usageCount += 1;
    qrCode.lastScannedAt = new Date();
    await qrCode.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: attendance.toObject(),
    });
  } catch (error) {
    console.error('Error scanning QR:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/student/attendance-history
 * Get student's attendance history
 */
router.get('/attendance-history', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.userId });
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const { page = 1, limit = 20, month, year } = req.query;

    let filter = { studentId: student._id };

    // Filter by month and year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.scannedAt = { $gte: startDate, $lte: endDate };
    }

    const skip = (page - 1) * limit;
    const attendance = await Attendance.find(filter)
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
