const express = require('express');
const { validationResult, body } = require('express-validator');
const { User, Student, Teacher, OTP } = require('../models');
const { generateToken } = require('../middleware/auth');
const OTPService = require('../services/OTPService');
const router = express.Router();

const buildValidationError = (errors) => {
  if (!errors || errors.length === 0) {
    return 'Validation failed';
  }
  return errors.map((item) => item.msg).join(', ');
};

// Validation rules
const validateStudentRegister = [
  body('enrollmentNo').notEmpty().withMessage('Enrollment number required'),
  body('mobileNumber').isMobilePhone().withMessage('Valid mobile number required'),
  body('fullName').notEmpty().withMessage('Full name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('department').notEmpty().withMessage('Department required'),
];

const validateTeacherRegister = [
  body('teacherId').notEmpty().withMessage('Teacher ID required'),
  body('mobileNumber').isMobilePhone().withMessage('Valid mobile number required'),
  body('fullName').notEmpty().withMessage('Full name required'),
  body('department').notEmpty().withMessage('Department required'),
  body('branch').notEmpty().withMessage('Branch required'),
];

const validateLogin = [
  body('username').notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
];

// ============= LEGACY COMPATIBILITY ROUTES =============

/**
 * POST /api/auth/login
 * Legacy username/password login for existing frontend pages
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array();
      return res.status(400).json({
        error: buildValidationError(validationErrors),
        errors: validationErrors,
      });
    }

    const { username, password } = req.body;
    const normalizedUsername = String(username).trim().toLowerCase();

    let user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      const escapedUsername = normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const student = await Student.findOne({
        enrollmentNo: { $regex: new RegExp(`^${escapedUsername}$`, 'i') },
      });

      if (student?.userId) {
        user = await User.findById(student.userId);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Username not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled. Contact administrator.' });
    }

    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = generateToken(user._id);

    const student = user.role === 'student'
      ? await Student.findOne({ userId: user._id })
      : null;

    const teacher = user.role === 'teacher'
      ? await Teacher.findOne({ userId: user._id })
      : null;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON(),
      student: student ? student.toObject() : null,
      teacher: teacher ? teacher.toObject() : null,
    });
  } catch (error) {
    console.error('Error in legacy login:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/register
 * Legacy student registration for existing frontend pages
 */
router.post('/register', async (req, res) => {
  try {
    const {
      password,
      full_name,
      roll_number,
      department,
      course,
      semester,
      year,
      phone,
      email,
    } = req.body;

    const missingFields = [];
    if (!password) missingFields.push('password');
    if (!full_name) missingFields.push('full_name');
    if (!roll_number) missingFields.push('roll_number');
    if (!department) missingFields.push('department');
    if (!course) missingFields.push('course');
    if (!semester) missingFields.push('semester');
    if (!year) missingFields.push('year');
    if (!phone) missingFields.push('phone');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    const normalizedRollNumber = String(roll_number).trim();
    const normalizedUsername = normalizedRollNumber.toLowerCase();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : undefined;
    const parsedSemester = Number.parseInt(semester, 10);
    const parsedYear = Number.parseInt(year, 10);

    if (!Number.isInteger(parsedSemester) || parsedSemester < 1 || parsedSemester > 8) {
      return res.status(400).json({ error: 'Semester must be a number between 1 and 8' });
    }

    if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 4) {
      return res.status(400).json({ error: 'Year must be a number between 1 and 4' });
    }

    if (normalizedEmail) {
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const existingEnrollment = await Student.findOne({ enrollmentNo: normalizedRollNumber });
    if (existingEnrollment) {
      return res.status(409).json({ error: 'Roll number already registered' });
    }

    const user = new User({
      username: normalizedUsername,
      passwordHash: password,
      role: 'student',
      fullName: full_name,
      email: normalizedEmail || undefined,
      phone,
      isActive: true,
      isVerified: true,
    });
    await user.save();

    try {
      const student = new Student({
        userId: user._id,
        enrollmentNo: normalizedRollNumber,
        rollNumber: normalizedRollNumber,
        department,
        course,
        semester: parsedSemester,
        year: parsedYear,
        mobileNumber: phone,
        isVerified: true,
      });
      await student.save();

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: user.toJSON(),
        student: student.toObject(),
      });
    } catch (studentError) {
      await User.findByIdAndDelete(user._id);
      throw studentError;
    }
  } catch (error) {
    console.error('Error in legacy register:', error);

    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
      const mappedField = duplicateField === 'enrollmentNo'
        ? 'roll number'
        : duplicateField;
      return res.status(409).json({ error: `${mappedField} already exists` });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Return current authenticated user and profile
 */
router.get('/me', require('../middleware/auth').verifyToken, async (req, res) => {
  try {
    const user = req.currentUser;
    const student = user.role === 'student'
      ? await Student.findOne({ userId: user._id })
      : null;
    const teacher = user.role === 'teacher'
      ? await Teacher.findOne({ userId: user._id })
      : null;

    res.json({
      success: true,
      user: user.toJSON(),
      student: student ? student.toObject() : null,
      teacher: teacher ? teacher.toObject() : null,
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * JWT logout acknowledgement (client drops token)
 */
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

// ============= STUDENT ROUTES =============

/**
 * POST /api/auth/student/send-otp
 * Send OTP for student registration/login
 */
router.post('/student/send-otp', [
  body('enrollmentNo').notEmpty().withMessage('Enrollment number required'),
  body('mobileNumber').isMobilePhone().withMessage('Valid mobile number required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { enrollmentNo, mobileNumber } = req.body;

    // Check if student exists
    let student = await Student.findOne({ enrollmentNo });
    if (!student) {
      student = {
        enrollmentNo,
        mobileNumber,
      };
    }

    // Create OTP
    const otpResult = await OTPService.createOTP(
      mobileNumber,
      null,
      'registration',
      null
    );

    res.json({
      success: true,
      message: 'OTP sent successfully',
      otpId: otpResult.otpId,
      enrollmentNo,
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/student/verify-otp
 * Verify OTP and register/login student
 */
router.post('/student/verify-otp', [
  body('enrollmentNo').notEmpty().withMessage('Enrollment number required'),
  body('mobileNumber').isMobilePhone().withMessage('Valid mobile number required'),
  body('otpCode').isLength({ min: 6 }).withMessage('Invalid OTP'),
  body('otpId').notEmpty().withMessage('OTP ID required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { enrollmentNo, mobileNumber, otpCode, otpId, fullName, email } = req.body;

    // Verify OTP
    const otpVerification = await OTPService.verifyOTP(mobileNumber, otpCode, otpId);
    if (!otpVerification.isValid) {
      return res.status(400).json({ error: otpVerification.error });
    }

    // Check if student exists
    let student = await Student.findOne({ enrollmentNo });
    let user = null;

    if (!student) {
      // Create new user and student
      user = new User({
        username: enrollmentNo.toLowerCase(),
        passwordHash: 'temp_password', // Will be set later
        role: 'student',
        fullName: fullName || enrollmentNo,
        email,
        phone: mobileNumber,
        isVerified: true,
      });
      await user.save();

      student = new Student({
        userId: user._id,
        enrollmentNo,
        mobileNumber,
        isVerified: true,
      });
      await student.save();
    } else {
      user = await User.findById(student.userId);
      if (user) {
        user.isVerified = true;
        user.phone = mobileNumber;
        await user.save();
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON(),
      student: student ? student.toObject() : null,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= TEACHER ROUTES =============

/**
 * POST /api/auth/teacher/send-otp
 * Send OTP for teacher login
 */
router.post('/teacher/send-otp', [
  body('teacherId').notEmpty().withMessage('Teacher ID required'),
  body('mobileNumber').isMobilePhone().withMessage('Valid mobile number required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teacherId, mobileNumber } = req.body;

    // Check if teacher exists
    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher ID not found' });
    }

    // Create OTP
    const otpResult = await OTPService.createOTP(
      mobileNumber,
      null,
      'login',
      teacher.userId
    );

    res.json({
      success: true,
      message: 'OTP sent successfully',
      otpId: otpResult.otpId,
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/teacher/verify-otp
 * Verify OTP and login teacher
 */
router.post('/teacher/verify-otp', [
  body('teacherId').notEmpty().withMessage('Teacher ID required'),
  body('otpCode').isLength({ min: 6 }).withMessage('Invalid OTP'),
  body('otpId').notEmpty().withMessage('OTP ID required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teacherId, otpCode, otpId } = req.body;

    // Get teacher
    const teacher = await Teacher.findOne({ teacherId }).populate('userId');
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Verify OTP
    const otpVerification = await OTPService.verifyOTP(
      teacher.userId.phone,
      otpCode,
      otpId
    );
    if (!otpVerification.isValid) {
      return res.status(400).json({ error: otpVerification.error });
    }

    const token = generateToken(teacher.userId._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: teacher.userId.toJSON(),
      teacher: teacher.toObject(),
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= ADMIN/HOD ROUTES =============

/**
 * POST /api/auth/admin/login
 * Admin/HOD login with credentials
 */
router.post('/admin/login', [
  body('collegeId').notEmpty().withMessage('College ID required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { collegeId, email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || !['admin', 'hod'].includes(user.role)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
