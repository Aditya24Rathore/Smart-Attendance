const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { Teacher, Attendance, QRCode } = require('../models');
const QRService = require('../services/QRService');
const router = express.Router();

/**
 * GET /api/teacher/dashboard
 * Get teacher dashboard data
 */
router.get('/dashboard', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Get attendance statistics
    const totalAttendanceRecords = await Attendance.countDocuments({ teacherId: teacher._id });
    const todayAttendance = await Attendance.countDocuments({
      teacherId: teacher._id,
      scannedAt: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999),
      },
    });

    res.json({
      success: true,
      teacher: teacher.toObject(),
      statistics: {
        totalAttendanceRecords,
        todayAttendance,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/teacher/generate-qr
 * Generate dynamic QR code for attendance (refreshes every 30 seconds)
 */
router.post('/generate-qr', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const { classId } = req.body;

    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Generate QR code
    const qrData = await QRService.generateQRCode(teacher._id, classId);

    // Save to database
    const qrCode = new QRCode({
      teacherId: teacher._id,
      classId: classId || null,
      qrHash: qrData.qrHash,
      qrData: qrData.qrData,
      qrImage: qrData.qrImage,
      encryptedData: qrData.encryptedData,
      generatedAt: qrData.generatedAt,
      expiresAt: qrData.expiresAt,
      isActive: true,
    });

    await qrCode.save();

    res.json({
      success: true,
      message: 'QR code generated successfully',
      qrCode: {
        qrHash: qrCode.qrHash,
        qrImage: qrCode.qrImage,
        generatedAt: qrCode.generatedAt,
        expiresAt: qrCode.expiresAt,
        refreshInterval: 30000, // 30 seconds
      },
    });
  } catch (error) {
    console.error('Error generating QR:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/teacher/qr-status
 * Check if current QR code needs refresh
 */
router.get('/qr-status/:qrHash', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const { qrHash } = req.params;

    const qrCode = await QRCode.findOne({ qrHash });
    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    const needsRefresh = QRService.needsRefresh(qrCode.generatedAt);

    res.json({
      success: true,
      needsRefresh,
      expiresAt: qrCode.expiresAt,
      usageCount: qrCode.usageCount,
    });
  } catch (error) {
    console.error('Error checking QR status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/teacher/attendance-records
 * Get attendance records created by teacher
 */
router.get('/attendance-records', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    const { page = 1, limit = 20, month, year } = req.query;

    let filter = { teacherId: teacher._id };

    // Filter by month and year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.scannedAt = { $gte: startDate, $lte: endDate };
    }

    const skip = (page - 1) * limit;
    const records = await Attendance.find(filter)
      .populate('studentId')
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
