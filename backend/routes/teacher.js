const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { Teacher, Student, Attendance, Subject } = require('../models');
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
 * POST /api/teacher/start-session
 * Start a new attendance session for a subject
 */
router.post('/start-session', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const { subjectId } = req.body;

    if (!subjectId) {
      return res.status(400).json({ error: 'Subject ID is required' });
    }

    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Create a session ID based on timestamp
    const sessionId = `session_${Date.now()}`;

    res.json({
      success: true,
      session: {
        id: sessionId,
        subjectId: subject._id,
        subject_code: subject.subjectCode,
        subject_name: subject.subjectName,
        is_active: true,
        started_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error starting session:', error);
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
 * POST /api/teacher/scan-student-qr
 * Teacher scans student's personal QR code to mark attendance
 */
router.post('/scan-student-qr', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    const { qrData } = req.body;

    console.log('📨 Received QR Scan Request');
    console.log('QR Data:', qrData);

    if (!qrData) {
      console.error('❌ No QR data provided');
      return res.status(400).json({ error: 'QR data is required' });
    }

    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      console.error('❌ Teacher profile not found for user:', req.userId);
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Decode student QR data
    let decodedData;
    try {
      console.log('🔍 Attempting to decode QR data...');
      decodedData = QRService.decodeStudentQRData(qrData);
      console.log('✅ Decoded data:', decodedData);
    } catch (error) {
      console.error('❌ QR decode error:', error.message);
      return res.status(400).json({ error: 'Invalid QR code format: ' + error.message });
    }

    // Validate QR data contains required fields
    if (!decodedData.enrollmentNo || !decodedData.studentId) {
      console.error('❌ Invalid QR data - missing required fields:', decodedData);
      return res.status(400).json({ error: 'Invalid student QR code data. Missing enrollmentNo or studentId' });
    }

    // Find student
    const student = await Student.findById(decodedData.studentId).populate('userId');
    if (!student) {
      console.error('❌ Student not found with ID:', decodedData.studentId);
      return res.status(404).json({ error: 'Student not found' });
    }

    console.log('✅ Student found:', student.enrollmentNo, student.userId?.fullName);

    // Check if attendance already marked in the last 2 minutes (prevent duplicate scans)
    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      teacherId: teacher._id,
      scannedAt: {
        $gte: new Date(Date.now() - 2 * 60 * 1000), // Within last 2 minutes
      },
    });

    if (existingAttendance) {
      console.log('⚠️ Duplicate scan - attendance already marked in last 2 minutes');
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

    console.log('✅ Attendance marked successfully for:', studentName);

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
    console.error('❌ Error scanning student QR:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/teacher/session-attendance/:sessionId
 * Get today's attendance for a session with optional subject filter
 */
router.get('/session-attendance/:sessionId', verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    console.log('📋 Fetching session attendance for sessionId:', req.params.sessionId);

    const teacher = await Teacher.findOne({ userId: req.userId });
    if (!teacher) {
      console.error('❌ Teacher profile not found');
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    const { subjectId } = req.query;
    console.log('Subject filter:', subjectId);

    // Get all students
    const allStudents = await Student.find({}).populate('userId');
    console.log('Total students found:', allStudents.length);
    
    // Get today's attendance marked by this teacher
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Checking attendance between:', today, 'and', tomorrow);

    const todayRecords = await Attendance.find({
      teacherId: teacher._id,
      scannedAt: {
        $gte: today,
        $lt: tomorrow,
      },
    }).populate('studentId');

    console.log('Attendance records found today:', todayRecords.length);
    todayRecords.forEach(record => {
      console.log('  -', record.studentId?.enrollmentNo, record.attendanceStatus);
    });

    const presentStudentIds = new Set(todayRecords.map(r => String(r.studentId?._id)));

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

    console.log('✅ Attendance list prepared:', presentCount, 'present out of', studentList.length);

    res.json({
      success: true,
      students: studentList,
      present_count: presentCount,
      total_students: studentList.length,
    });
  } catch (error) {
    console.error('❌ Error fetching session attendance:', error);
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
