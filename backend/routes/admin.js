const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const { User, Student, Teacher, Subject, Attendance } = require('../models');
const XLSX = require('xlsx');
const router = express.Router();

/**
 * PATCH /api/admin/account/credentials
 * Update current admin/hod email and/or password
 */
router.patch('/account/credentials', verifyToken, requireRole('admin', 'hod'), [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('newPassword').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, email, newPassword } = req.body;
    const user = req.currentUser;

    const isCurrentPasswordValid = await user.checkPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
    const hasEmailUpdate = normalizedEmail && normalizedEmail !== user.email;
    const hasPasswordUpdate = typeof newPassword === 'string' && newPassword.trim().length > 0;

    if (!hasEmailUpdate && !hasPasswordUpdate) {
      return res.status(400).json({ error: 'No changes to update' });
    }

    if (hasEmailUpdate) {
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      user.email = normalizedEmail;
    }

    if (hasPasswordUpdate) {
      user.passwordHash = newPassword;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Account credentials updated successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Error updating admin credentials:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/teachers
 * Create a teacher account and profile
 */
router.post('/teachers', verifyToken, requireRole('admin', 'hod'), [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('employee_id').notEmpty().withMessage('Employee ID is required'),
  body('department').notEmpty().withMessage('Department is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      username,
      password,
      full_name,
      employee_id,
      department,
      designation,
      phone,
      email,
    } = req.body;

    const normalizedUsername = String(username).trim().toLowerCase();
    const normalizedEmployeeId = String(employee_id).trim();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : undefined;

    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    if (normalizedEmail) {
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    const existingTeacher = await Teacher.findOne({
      $or: [{ teacherId: normalizedEmployeeId }, { employeeId: normalizedEmployeeId }],
    });
    if (existingTeacher) {
      return res.status(409).json({ error: 'Employee ID already exists' });
    }

    const user = new User({
      username: normalizedUsername,
      passwordHash: password,
      role: 'teacher',
      fullName: full_name,
      email: normalizedEmail || undefined,
      phone: phone || undefined,
      isActive: true,
      isVerified: true,
    });
    await user.save();

    try {
      const teacher = new Teacher({
        userId: user._id,
        teacherId: normalizedEmployeeId,
        employeeId: normalizedEmployeeId,
        department,
        branch: department,
        semester: 1,
        designation: designation || 'Teacher',
        isVerified: true,
        verificationApprovedBy: req.userId,
      });

      await teacher.save();

      return res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        teacher: await Teacher.findById(teacher._id).populate('userId'),
      });
    } catch (teacherError) {
      await User.findByIdAndDelete(user._id);
      throw teacherError;
    }
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/subjects
 * List subjects with optional department filter
 */
router.get('/subjects', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const { department } = req.query;
    const filter = {};
    if (department) {
      filter.department = department;
    }

    const subjects = await Subject.find(filter)
      .sort({ subjectCode: 1 })
      .populate({
        path: 'teacherId',
        populate: { path: 'userId' },
      });

    res.json({ success: true, subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/subjects
 * Create subject
 */
router.post('/subjects', verifyToken, requireRole('admin', 'hod'), [
  body('name').notEmpty().withMessage('Subject name is required'),
  body('code').notEmpty().withMessage('Subject code is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, code, department, semester, teacher_id } = req.body;
    const normalizedCode = String(code).trim().toUpperCase();

    const existingSubject = await Subject.findOne({ subjectCode: normalizedCode });
    if (existingSubject) {
      return res.status(409).json({ error: 'Subject code already exists' });
    }

    let assignedTeacherId = null;
    if (teacher_id) {
      const teacher = await Teacher.findById(teacher_id);
      if (!teacher) {
        return res.status(404).json({ error: 'Assigned teacher not found' });
      }
      assignedTeacherId = teacher._id;
    }

    const subject = new Subject({
      subjectCode: normalizedCode,
      subjectName: name,
      department,
      semester: parseInt(semester, 10),
      teacherId: assignedTeacherId,
      assignedTeachers: assignedTeacherId ? [assignedTeacherId] : [],
      isActive: true,
    });

    await subject.save();

    if (assignedTeacherId) {
      await Teacher.findByIdAndUpdate(assignedTeacherId, {
        $addToSet: { assignedSubjects: subject._id },
      });
    }

    const populatedSubject = await Subject.findById(subject._id)
      .populate({ path: 'teacherId', populate: { path: 'userId' } });

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      subject: populatedSubject,
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/admin/users/:userId/toggle
 * Activate/deactivate user account
 */
router.patch('/users/:userId/toggle', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (String(user._id) === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot disable your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/defaulters
 * Students with attendance percentage below threshold
 */
router.get('/defaulters', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const { department, min_percentage = 75 } = req.query;
    const threshold = Number(min_percentage) || 75;

    const studentFilter = {};
    if (department) {
      studentFilter.department = department;
    }

    const students = await Student.find(studentFilter).populate('userId');
    const studentIds = students.map((s) => s._id);

    const groupedAttendance = await Attendance.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      {
        $group: {
          _id: '$studentId',
          totalSessions: { $sum: 1 },
          attended: {
            $sum: {
              $cond: [{ $in: ['$attendanceStatus', ['present', 'late']] }, 1, 0],
            },
          },
        },
      },
    ]);

    const attendanceByStudent = new Map(groupedAttendance.map((row) => [String(row._id), row]));

    const defaulters = students
      .map((student) => {
        const summary = attendanceByStudent.get(String(student._id)) || { totalSessions: 0, attended: 0 };
        const percentage = summary.totalSessions > 0
          ? Number(((summary.attended / summary.totalSessions) * 100).toFixed(2))
          : 0;

        return {
          student: {
            id: student._id,
            roll_number: student.rollNumber || student.enrollmentNo,
            full_name: student.userId?.fullName || student.enrollmentNo,
            department: student.department,
          },
          total_sessions: summary.totalSessions,
          attended: summary.attended,
          percentage,
        };
      })
      .filter((item) => item.percentage < threshold)
      .sort((a, b) => a.percentage - b.percentage);

    res.json({ success: true, defaulters });
  } catch (error) {
    console.error('Error fetching defaulters:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/export/excel
 * Export attendance report in Excel format
 */
router.get('/export/excel', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const { department } = req.query;

    const studentFilter = {};
    if (department) {
      studentFilter.department = department;
    }

    const students = await Student.find(studentFilter).populate('userId');
    const studentIdSet = new Set(students.map((s) => String(s._id)));

    const attendanceRecords = await Attendance.find({ studentId: { $in: students.map((s) => s._id) } })
      .populate('studentId')
      .populate('teacherId')
      .populate('subjectId')
      .sort({ scannedAt: -1 });

    const summaryRows = students.map((student) => {
      const records = attendanceRecords.filter((record) => String(record.studentId?._id || record.studentId) === String(student._id));
      const total = records.length;
      const present = records.filter((record) => ['present', 'late'].includes(record.attendanceStatus)).length;
      const percentage = total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0;

      return {
        RollNumber: student.rollNumber || student.enrollmentNo,
        FullName: student.userId?.fullName || '',
        Department: student.department,
        Semester: student.semester,
        TotalSessions: total,
        PresentOrLate: present,
        AttendancePercentage: percentage,
      };
    });

    const detailRows = attendanceRecords
      .filter((record) => studentIdSet.has(String(record.studentId?._id || record.studentId)))
      .map((record) => ({
        Date: new Date(record.scannedAt).toISOString(),
        EnrollmentNo: record.enrollmentNo,
        Student: record.studentId?.enrollmentNo || '',
        TeacherId: record.teacherId?.teacherId || '',
        SubjectCode: record.subjectId?.subjectCode || '',
        SubjectName: record.subjectId?.subjectName || '',
        Status: record.attendanceStatus,
      }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), 'Attendance');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.xlsx"');
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting excel report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/dashboard
 * Get admin dashboard with system statistics
 */
router.get('/dashboard', verifyToken, requireRole('admin', 'hod'), async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalSubjects = await Subject.countDocuments();
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
        totalSubjects,
        activeSessions: 0,
        todaySessions: 0,
        totalAttendanceRecords,
        todayAttendance,
      },
      recent_logs: [],
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
