import axios from 'axios';

const configuredApiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').trim();
const trimmedApiBase = configuredApiBase.replace(/\/+$/, '');
const API_BASE = trimmedApiBase.endsWith('/api') ? trimmedApiBase : `${trimmedApiBase}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const isAuthErrorWhitelistedPath = (url = '') => {
  const authPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/student/send-otp',
    '/auth/student/verify-otp',
    '/auth/teacher/send-otp',
    '/auth/teacher/verify-otp',
    '/auth/admin/login',
  ];
  return authPaths.some((path) => url.includes(path));
};

export const getApiErrorMessage = (error, fallbackMessage = 'Something went wrong') => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((item) => item.msg).join(', ');
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error;
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof error?.message === 'string' && error.message.trim() && error.message !== 'Network Error') {
    return error.message;
  }

  if (error?.message === 'Network Error') {
    return 'Cannot connect to server. Please check backend is running and API URL is correct.';
  }

  return fallbackMessage;
};

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
    const requestUrl = error?.config?.url || '';
    const skipAutoRedirect = isAuthErrorWhitelistedPath(requestUrl);
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath === '/login' || currentPath === '/register';

    if (error.response?.status === 401 && !skipAutoRedirect && !isAuthPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
  api.get('/admin/dashboard').then((res) => {
    const statistics = res.data?.statistics || {};
    return {
      ...res,
      data: {
        ...res.data,
        stats: {
          total_students: Number(statistics.totalStudents || 0),
          total_teachers: Number(statistics.totalTeachers || 0),
          total_subjects: Number(statistics.totalSubjects || 0),
          active_sessions: Number(statistics.activeSessions || 0),
          today_sessions: Number(statistics.todaySessions || 0),
          today_attendance: Number(statistics.todayAttendance || 0),
        },
        recent_logs: res.data?.recent_logs || [],
      },
    };
  });

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

export const updateAdminCredentials = (payload) =>
  api.patch('/admin/account/credentials', payload);

// ============= HEALTH CHECK =============

export const healthCheck = () =>
  api.get('/health');

// ============= LEGACY COMPATIBILITY EXPORTS =============

const resolved = (data) => Promise.resolve({ data });

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then((res) => {
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    }
    return res;
  });

export const register = (form) =>
  api.post('/auth/register', form).then((res) => {
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    }
    return res;
  });

export const getCurrentUser = () =>
  api.get('/auth/me');

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return api.post('/auth/logout').catch(() => resolved({ success: true }));
};

export const generateQRToken = () => {
  const payload = `student-token-${Date.now()}`;
  return resolved({ qr_token: payload });
};

export const getAttendanceSummary = () =>
  getStudentDashboard().then((res) => {
    const stats = res.data?.statistics || {};
    return {
      ...res,
      data: {
        overall_percentage: Number(stats.attendancePercentage || 0),
        summary: [],
      },
    };
  });

export const getStudentAttendance = () =>
  getAttendanceHistory().then((res) => {
    const attendance = (res.data?.attendance || []).map((item) => ({
      id: item._id,
      subject_name: item.subjectName || 'Class',
      status: item.attendanceStatus || 'present',
      marked_at: item.scannedAt,
      marked_by: 'QR',
    }));
    return { ...res, data: { attendance } };
  });

export const getActiveSessions = () => resolved({ sessions: [] });

export const getTeacherSubjects = () => resolved({ subjects: [] });

export const getTeacherSessions = () =>
  getTeacherAttendanceRecords().then((res) => ({
    ...res,
    data: {
      sessions: [],
    },
  }));

export const getSessionAttendance = () =>
  resolved({ students: [], present_count: 0, total_students: 0 });

export const startSession = () =>
  resolved({
    session: {
      id: `${Date.now()}`,
      subject_code: 'N/A',
      subject_name: 'Session',
      is_active: true,
      date: new Date().toLocaleDateString(),
    },
  });

export const endSession = () => resolved({ success: true });

export const scanQR = () =>
  resolved({ success: true, message: 'Scanned (compatibility mode)' });

export const manualAttendance = () => resolved({ success: true });

export const getStudents = (params = {}) =>
  getStudentsList(1, 100, params.department, undefined).then((res) => {
    const students = (res.data?.students || []).map((item) => ({
      id: item._id,
      roll_number: item.rollNumber || item.enrollmentNo,
      full_name: item.userId?.fullName || item.enrollmentNo,
      department: item.department,
      semester: item.semester,
      phone: item.mobileNumber || item.userId?.phone,
      user_id: item.userId?._id,
    }));
    return { ...res, data: { students } };
  });

export const getTeachers = (params = {}) =>
  getTeachersList(1, 100, params.department).then((res) => {
    const teachers = (res.data?.teachers || []).map((item) => ({
      id: item._id,
      employee_id: item.employeeId || item.teacherId,
      full_name: item.userId?.fullName || item.teacherId,
      department: item.department,
      designation: item.designation || 'Teacher',
    }));
    return { ...res, data: { teachers } };
  });

export const getDepartments = () =>
  getStudents().then((res) => {
    const departments = [...new Set((res.data.students || []).map((s) => s.department).filter(Boolean))];
    return { ...res, data: { departments } };
  });

export const getSubjects = (params = {}) =>
  api.get('/admin/subjects', { params }).then((res) => {
    const subjects = (res.data?.subjects || []).map((item) => ({
      id: item._id,
      code: item.subjectCode,
      name: item.subjectName,
      department: item.department,
      semester: item.semester,
      teacher_name: item.teacherId?.userId?.fullName || null,
    }));
    return { ...res, data: { ...res.data, subjects } };
  });

export const createTeacher = (payload) =>
  api.post('/admin/teachers', payload);

export const createSubject = (payload) =>
  api.post('/admin/subjects', payload);

export const overrideAttendance = (updates) =>
  bulkUpdateAttendance(updates);

export const getDefaulters = (params = {}) =>
  api.get('/admin/defaulters', { params }).then((res) => ({
    ...res,
    data: {
      ...res.data,
      defaulters: res.data?.defaulters || [],
    },
  }));

export const toggleUser = (userId) =>
  api.patch(`/admin/users/${userId}/toggle`);

export const exportExcel = (params = {}) =>
  api.get('/admin/export/excel', {
    params,
    responseType: 'blob',
  });

export const exportGoogleSheets = (params = {}) =>
  api.get('/admin/export/google-sheets', {
    params,
    responseType: 'blob',
  });

export default api;
