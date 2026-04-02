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

/**
 * GET /api/student/generate-qr
 * Generate and get student's personal QR code
 */
router.get('/generate-qr', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const user = await require('../models').User.findById(req.userId);
    const student = await Student.findOne({ userId: req.userId });
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Generate student QR code
    const studentData = {
      ...student.toObject(),
      fullName: user?.fullName || student.enrollmentNo,
    };

    const qrCode = await QRService.generateStudentQRCode(studentData);

    res.json({
      success: true,
      message: 'Student QR code generated',
      qrCode: {
        qrHash: qrCode.qrHash,
        qrImage: qrCode.qrImage,
        enrollmentNo: student.enrollmentNo,
        fullName: user?.fullName || student.enrollmentNo,
      },
    });
  } catch (error) {
    console.error('Error generating student QR:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
