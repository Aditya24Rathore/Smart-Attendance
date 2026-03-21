const express = require('express');
const { validationResult, body } = require('express-validator');
const { User, Student, Teacher, OTP } = require('../models');
const { generateToken } = require('../middleware/auth');
const OTPService = require('../services/OTPService');
const router = express.Router();

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
