import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Auth
export const login = (username, password) =>
  api.post('/api/auth/login', { username, password });

export const register = (data) =>
  api.post('/api/auth/register', data);

export const logout = () =>
  api.post('/api/auth/logout');

export const getCurrentUser = () =>
  api.get('/api/auth/me');

export const updateProfile = (data) =>
  api.put('/api/auth/update-profile', data);

// Student
export const generateQRToken = (data) =>
  api.post('/api/student/qr-token', data);

export const getStudentAttendance = (subjectId) =>
  api.get('/api/student/attendance', { params: { subject_id: subjectId } });

export const getAttendanceSummary = () =>
  api.get('/api/student/attendance-summary');

export const getActiveSessions = () =>
  api.get('/api/student/active-sessions');

export const registerDevice = (fingerprint) =>
  api.post('/api/student/register-device', { device_fingerprint: fingerprint });

// Teacher
export const startSession = (subjectId) =>
  api.post('/api/teacher/start-session', { subject_id: subjectId });

export const endSession = (sessionId) =>
  api.post(`/api/teacher/end-session/${sessionId}`);

export const scanQR = (qrToken, sessionId) =>
  api.post('/api/teacher/scan-qr', { qr_token: qrToken, session_id: sessionId });

export const getSessionAttendance = (sessionId) =>
  api.get(`/api/teacher/session-attendance/${sessionId}`);

export const getTeacherSubjects = () =>
  api.get('/api/teacher/subjects');

export const getTeacherSessions = () =>
  api.get('/api/teacher/sessions');

export const manualAttendance = (studentId, sessionId, status) =>
  api.post('/api/teacher/manual-attendance', { student_id: studentId, session_id: sessionId, status });

// Admin
export const getAdminDashboard = () =>
  api.get('/api/admin/dashboard');

export const getStudents = (params) =>
  api.get('/api/admin/students', { params });

export const getTeachers = () =>
  api.get('/api/admin/teachers');

export const createTeacher = (data) =>
  api.post('/api/admin/create-teacher', data);

export const createSubject = (data) =>
  api.post('/api/admin/create-subject', data);

export const getSubjects = (params) =>
  api.get('/api/admin/subjects', { params });

export const overrideAttendance = (data) =>
  api.post('/api/admin/override-attendance', data);

export const getAttendanceReport = (params) =>
  api.get('/api/admin/attendance-report', { params });

export const getDepartments = () =>
  api.get('/api/admin/departments');

export const exportExcel = (params) =>
  api.get('/api/admin/export-excel', { params, responseType: 'blob' });

export const getDefaulters = (params) =>
  api.get('/api/admin/defaulters', { params });

export const toggleUser = (userId) =>
  api.post(`/api/admin/toggle-user/${userId}`);

export default api;
