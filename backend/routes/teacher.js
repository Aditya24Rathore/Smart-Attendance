const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { Teacher, Student, Attendance, QRCode, Subject } = require('../models');
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
 * GET /api/teacher/subjects
 * Get subjects assigned to the teacher
 */
router.get('/subjects', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    const subjects = await Subject.find({
      $or: [
        { teacherId: teacher._id },
        { assignedTeachers: teacher._id },
      ],
      isActive: true,
    }).sort({ subjectCode: 1 });

    res.json({
      success: true,
      subjects: subjects.map(s => ({
        id: s._id,
        code: s.subjectCode,
        name: s.subjectName,
        department: s.department,
        semester: s.semester,
      })),
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
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

/**
 * POST /api/teacher/mark-attendance-qr
 * Teacher scans student's QR code to mark attendance
 */
router.post('/mark-attendance-qr', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const { qrToken, sessionId } = req.body;

    if (!qrToken || !sessionId) {
      return res.status(400).json({ error: 'QR token and session ID required' });
    }

    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Parse QR token format: "enrollmentNo::timestamp"
    let studentEnrollmentNo = null;
    try {
      const parts = qrToken.split('::');
      studentEnrollmentNo = parts[0]; // Extract enrollment number
    } catch {
      // If token parsing fails, treat entire token as enrollment number
      studentEnrollmentNo = qrToken;
    }

    if (!studentEnrollmentNo || studentEnrollmentNo === 'unknown') {
      return res.status(400).json({ error: 'Invalid QR token - cannot identify student' });
    }

    // Find student by enrollment number
    const student = await Student.findOne({ enrollmentNo: studentEnrollmentNo });
    
    if (!student) {
      return res.status(404).json({ error: `Student with enrollment ${studentEnrollmentNo} not found` });
    }

    // Check if attendance already marked for this student in the last 5 minutes
    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      teacherId: teacher._id,
      scannedAt: {
        $gte: new Date(Date.now() - 5 * 60 * 1000), // Within last 5 minutes
      },
    });

    if (existingAttendance) {
      return res.status(409).json({ error: 'Attendance already marked for this student in the last 5 minutes' });
    }

    // Create attendance record
    const attendance = new Attendance({
      studentId: student._id,
      enrollmentNo: student.enrollmentNo,
      teacherId: teacher._id,
      qrCodeHash: qrToken,
      qrGeneratedAt: new Date(),
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      attendanceStatus: 'present',
      scannedAt: new Date(),
    });

    await attendance.save();

    // Populate student name
    const studentWithUser = await Student.findById(student._id).populate('userId');
    const studentName = studentWithUser?.userId?.fullName || student.enrollmentNo;

    res.json({
      success: true,
      message: `✅ Attendance marked for ${studentName}`,
      attendance: attendance.toObject(),
      student: {
        id: student._id,
        enrollmentNo: student.enrollmentNo,
        name: studentName,
      },
    });
  } catch (error) {
    console.error('Error marking attendance via QR:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/teacher/scan-student-qr
 * Teacher scans student's personal QR code to mark attendance
 */
router.post('/scan-student-qr', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Decode student QR data
    let decodedData;
    try {
      decodedData = QRService.decodeStudentQRData(qrData);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    // Validate QR data contains required fields
    if (!decodedData.enrollmentNo || !decodedData.studentId) {
      return res.status(400).json({ error: 'Invalid student QR code data' });
    }

    // Find student
    const student = await Student.findById(decodedData.studentId).populate('userId');
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if attendance already marked in the last 2 minutes (prevent duplicate scans)
    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      teacherId: teacher._id,
      scannedAt: {
        $gte: new Date(Date.now() - 2 * 60 * 1000), // Within last 2 minutes
      },
    });

    if (existingAttendance) {
      return res.status(409).json({
        error: 'Attendance already marked for this student. Please wait before rescanning.',
        student: {
          id: student._id,
          enrollmentNo: student.enrollmentNo,
          name: student.userId?.fullName || student.enrollmentNo,
        },
      });
    }

    // Create attendance record
    const attendance = new Attendance({
      studentId: student._id,
      enrollmentNo: student.enrollmentNo,
      teacherId: teacher._id,
      qrCodeHash: `student_${decodedData.enrollmentNo}`,
      qrGeneratedAt: new Date(),
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      attendanceStatus: 'present',
      scannedAt: new Date(),
    });

    await attendance.save();

    const studentName = student.userId?.fullName || student.enrollmentNo;

    res.json({
      success: true,
      message: `✅ ${studentName} - Marked Present`,
      attendance: attendance.toObject(),
      student: {
        id: student._id,
        enrollmentNo: student.enrollmentNo,
        name: studentName,
        department: student.department,
      },
    });
  } catch (error) {
    console.error('Error scanning student QR:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/teacher/session-attendance/:sessionId
 * Get attendance list for a specific session (all marked students)
 * sessionId is the QR code hash
 */
router.get('/session-attendance/:sessionId', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Get subjects taught by this teacher
    const subjects = await Subject.find({
      $or: [
        { teacherId: teacher._id },
        { assignedTeachers: teacher._id },
      ],
    });
    const subjectIds = subjects.map(s => s._id);

    // Get all students in these subjects
    const allStudents = await Student.find({}).populate('userId');
    
    // Get attendance records marked for this specific QR session by this teacher
    // sessionId is the QR code hash (qrCodeHash field in Attendance)
    const sessionRecords = await Attendance.find({
      teacherId: teacher._id,
      qrCodeHash: sessionId,
    }).populate('studentId');

    const presentStudentIds = new Set(sessionRecords.map(r => String(r.studentId?._id)));

    // Build student list with attendance status
    const studentList = allStudents.map(student => ({
      id: student._id,
      enrollmentNo: student.enrollmentNo,
      full_name: student.userId?.fullName || student.enrollmentNo,
      roll_number: student.rollNumber || student.enrollmentNo,
      department: student.department,
      status: presentStudentIds.has(String(student._id)) ? 'present' : 'absent',
    }));

    const presentCount = studentList.filter(s => s.status === 'present').length;

    res.json({
      success: true,
      students: studentList,
      present_count: presentCount,
      total_students: studentList.length,
    });
  } catch (error) {
    console.error('Error fetching session attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/teacher/qr-status/:qrHash
 * Deactivate a QR code (end session)
 */
router.patch('/qr-status/:qrHash', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const { qrHash } = req.params;
    const { isActive } = req.body;

    const qrCode = await QRCode.findOne({ qrHash });
    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Verify this QR code belongs to the current teacher
    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher || String(qrCode.teacherId) !== String(teacher._id)) {
      return res.status(403).json({ error: 'Unauthorized - this QR code does not belong to you' });
    }

    // Update isActive status
    qrCode.isActive = isActive === false ? false : true;
    await qrCode.save();

    res.json({
      success: true,
      message: `QR code ${qrCode.isActive ? 'activated' : 'deactivated'}`,
      qrCode: {
        qrHash: qrCode.qrHash,
        isActive: qrCode.isActive,
      },
    });
  } catch (error) {
    console.error('Error updating QR status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/teacher/mark-attendance-manual
 * Manually mark student attendance (teacher action)
 */
router.post('/mark-attendance-manual', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const { studentId, sessionId, status } = req.body;

    if (!studentId || !sessionId || !status) {
      return res.status(400).json({ error: 'Student ID, session ID, and status are required' });
    }

    if (!['present', 'absent', 'late', 'excused'].includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    const student = await Student.findById(studentId).populate('userId');
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if attendance already marked in the last 5 minutes
    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      teacherId: teacher._id,
      scannedAt: {
        $gte: new Date(Date.now() - 5 * 60 * 1000),
      },
    });

    if (existingAttendance) {
      // Update existing record instead of creating duplicate
      existingAttendance.attendanceStatus = status;
      existingAttendance.remarks = 'Manually marked by teacher';
      await existingAttendance.save();

      return res.json({
        success: true,
        message: `Attendance updated for ${student.userId?.fullName || student.enrollmentNo}`,
        attendance: existingAttendance.toObject(),
      });
    }

    // Create new attendance record
    const attendance = new Attendance({
      studentId: student._id,
      enrollmentNo: student.enrollmentNo,
      teacherId: teacher._id,
      qrCodeHash: sessionId,
      qrGeneratedAt: new Date(),
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      attendanceStatus: status,
      remarks: 'Manually marked by teacher',
      scannedAt: new Date(),
    });

    await attendance.save();

    res.json({
      success: true,
      message: `✅ Attendance marked for ${student.userId?.fullName || student.enrollmentNo}`,
      attendance: attendance.toObject(),
    });
  } catch (error) {
    console.error('Error marking manual attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
