const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { User, Student, Teacher, Attendance } = require('../models');
const router = express.Router();

/**
 * GET /api/admin/dashboard
 * Get admin dashboard with system statistics
 */
router.get('/dashboard', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalAttendanceRecords = await Attendance.countDocuments();
    const todayAttendance = await Attendance.countDocuments({
      scannedAt: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999),
      },
    });

    res.json({
      success: true,
      statistics: {
        totalStudents,
        totalTeachers,
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
 * GET /api/admin/students
 * Get list of all students with filtering and pagination
 */
router.get('/students', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const { page = 1, limit = 20, department, semester } = req.query;

    let filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = parseInt(semester);

    const skip = (page - 1) * limit;
    const students = await Student.find(filter)
      .populate('userId')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Student.countDocuments(filter);

    res.json({
      success: true,
      students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/teachers
 * Get list of all teachers
 */
router.get('/teachers', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const { page = 1, limit = 20, department } = req.query;

    let filter = {};
    if (department) filter.department = department;

    const skip = (page - 1) * limit;
    const teachers = await Teacher.find(filter)
      .populate('userId')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Teacher.countDocuments(filter);

    res.json({
      success: true,
      teachers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/verify-teacher/:teacherId
 * Verify a teacher account (approve)
 */
router.post('/verify-teacher/:teacherId', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        isVerified: true,
        verificationApprovedBy: req.userId,
      },
      { new: true }
    );

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({
      success: true,
      message: 'Teacher verified successfully',
      teacher: teacher.toObject(),
    });
  } catch (error) {
    console.error('Error verifying teacher:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/reports/attendance
 * Generate attendance reports with filtering
 */
router.get('/reports/attendance', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const { month, year, studentId, department } = req.query;

    let filter = {};

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.scannedAt = { $gte: startDate, $lte: endDate };
    }

    if (studentId) filter.studentId = studentId;
    if (department) {
      const students = await Student.find({ department });
      const studentIds = students.map(s => s._id);
      filter.studentId = { $in: studentIds };
    }

    const records = await Attendance.find(filter)
      .populate('studentId')
      .populate('teacherId')
      .sort({ scannedAt: -1 });

    // Generate summary statistics
    const totalRecords = records.length;
    const presentCount = records.filter(r => r.attendanceStatus === 'present').length;
    const absentCount = records.filter(r => r.attendanceStatus === 'absent').length;
    const lateCount = records.filter(r => r.attendanceStatus === 'late').length;

    res.json({
      success: true,
      report: {
        filter,
        statistics: {
          totalRecords,
          presentCount,
          absentCount,
          lateCount,
          attendancePercentage: totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(2) : 0,
        },
        records,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/bulk-update-attendance
 * Bulk update attendance records (edit, delete)
 */
router.post('/bulk-update-attendance', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, status, remarks }

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    const results = [];
    for (const update of updates) {
      const attendance = await Attendance.findByIdAndUpdate(
        update.id,
        {
          attendanceStatus: update.status,
          remarks: update.remarks,
        },
        { new: true }
      );
      results.push(attendance);
    }

    res.json({
      success: true,
      message: 'Attendance records updated successfully',
      updated: results.length,
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
