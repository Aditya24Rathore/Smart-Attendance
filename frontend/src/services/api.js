import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Add JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============= AUTHENTICATION =============

// Student authentication
export const sendStudentOTP = (enrollmentNo, mobileNumber) =>
  api.post('/auth/student/send-otp', { enrollmentNo, mobileNumber });

export const verifyStudentOTP = (enrollmentNo, mobileNumber, otpCode, otpId, fullName, email) =>
  api.post('/auth/student/verify-otp', {
    enrollmentNo,
    mobileNumber,
    otpCode,
    otpId,
    fullName,
    email,
  });

// Teacher authentication
export const sendTeacherOTP = (teacherId, mobileNumber) =>
  api.post('/auth/teacher/send-otp', { teacherId, mobileNumber });

export const verifyTeacherOTP = (teacherId, otpCode, otpId) =>
  api.post('/auth/teacher/verify-otp', { teacherId, otpCode, otpId });

// Admin authentication
export const adminLogin = (collegeId, email, password) =>
  api.post('/auth/admin/login', { collegeId, email, password });

// ============= STUDENT ROUTES =============

export const getStudentDashboard = () =>
  api.get('/student/dashboard');

export const scanQRCode = (qrHash, encryptedData) =>
  api.post('/student/scan-qr', { qrHash, encryptedData });

export const getAttendanceHistory = (page = 1, limit = 20, month, year) =>
  api.get('/student/attendance-history', {
    params: { page, limit, month, year },
  });

// ============= TEACHER ROUTES =============

export const getTeacherDashboard = () =>
  api.get('/teacher/dashboard');

export const generateDynamicQR = (classId = null) =>
  api.post('/teacher/generate-qr', { classId });

export const checkQRStatus = (qrHash) =>
  api.get(`/teacher/qr-status/${qrHash}`);

export const getTeacherAttendanceRecords = (page = 1, limit = 20, month, year) =>
  api.get('/teacher/attendance-records', {
    params: { page, limit, month, year },
  });

// ============= ADMIN ROUTES =============

export const getAdminDashboard = () =>
  api.get('/admin/dashboard');

export const getStudentsList = (page = 1, limit = 20, department, semester) =>
  api.get('/admin/students', {
    params: { page, limit, department, semester },
  });

export const getTeachersList = (page = 1, limit = 20, department) =>
  api.get('/admin/teachers', {
    params: { page, limit, department },
  });

export const verifyTeacher = (teacherId) =>
  api.post(`/admin/verify-teacher/${teacherId}`);

export const getAttendanceReport = (month, year, studentId, department) =>
  api.get('/admin/reports/attendance', {
    params: { month, year, studentId, department },
  });

export const bulkUpdateAttendance = (updates) =>
  api.post('/admin/bulk-update-attendance', { updates });

// ============= HEALTH CHECK =============

export const healthCheck = () =>
  api.get('/health');

export default api;

export default api;
