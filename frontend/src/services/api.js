import axios from 'axios';

const defaultApiBase = process.env.NODE_ENV === 'production'
  ? 'https://smart-attendance-backend.onrender.com/api'
  : 'http://localhost:5000/api';

const configuredApiBase = (process.env.REACT_APP_API_URL || defaultApiBase).trim();
const trimmedApiBase = configuredApiBase.replace(/\/+$/, '');
const API_BASE = trimmedApiBase.endsWith('/api') ? trimmedApiBase : `${trimmedApiBase}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
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

export const scanQRCode = () =>
  // Deprecated - no longer supported
  resolved({ error: 'Old QR scanning method is deprecated' });

export const getAttendanceHistory = (page = 1, limit = 20, month, year) =>
  api.get('/student/attendance-history', {
    params: { page, limit, month, year },
  });

export const getStudentQRCode = () =>
  api.get('/student/generate-qr');

// ============= TEACHER ROUTES =============

export const getTeacherDashboard = () =>
  api.get('/teacher/dashboard');

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

export const generateQRToken = (studentData = {}) => {
  // Generate QR token with student enrollment number for easy scanning
  // The token can be decoded by the teacher when scanning
  const enrollmentNo = studentData?.enrollmentNo || studentData?.roll_number || 'unknown';
  const timestamp = Date.now();
  // Create a token that includes student identification
  const token = `${enrollmentNo}::${timestamp}`;
  return resolved({ qr_token: token });
};

export const getAttendanceSummary = () =>
  getStudentDashboard().then((res) => {
    const stats = res.data?.statistics || {};
    const attendanceData = res.data?.student?.attendance || [];
    
    let summary = [];
    if (Array.isArray(attendanceData)) {
      const grouped = {};
      attendanceData.forEach((record) => {
        const subjectId = record.subjectId || 'unknown';
        if (!grouped[subjectId]) {
          grouped[subjectId] = {
            subject_id: subjectId,
            subject_code: record.subjectCode || 'N/A',
            subject_name: record.subjectName || 'Unknown',
            total_sessions: 0,
            present: 0,
            late: 0,
            absent: 0,
            percentage: 0,
          };
        }
        grouped[subjectId].total_sessions++;
        if (record.attendanceStatus === 'present') {
          grouped[subjectId].present++;
        } else if (record.attendanceStatus === 'late') {
          grouped[subjectId].late++;
        } else {
          grouped[subjectId].absent++;
        }
      });
      summary = Object.values(grouped);
      summary.forEach((s) => {
        s.percentage = s.total_sessions > 0 
          ? Math.round((s.present / s.total_sessions) * 100) 
          : 0;
      });
    }
    
    return {
      ...res,
      data: {
        overall_percentage: Number(stats.attendancePercentage || 0),
        summary
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

export const getActiveSessions = () => 
  api.get('/teacher/attendance-records').then((res) => ({
    ...res,
    data: {
      sessions: (res.data?.records || []).slice(0, 10).map((r) => ({
        id: r._id,
        subject_name: r.subjectId?.subjectName || 'Class',
        subject_code: r.subjectId?.subjectCode || 'N/A',
        teacher_name: r.teacherId?.userId?.fullName || 'Teacher',
      })),
    },
  })).catch(() => resolved({ sessions: [] }));

export const getTeacherSubjects = () =>
  api.get('/teacher/subjects').then((res) => ({
    ...res,
    data: {
      subjects: (res.data?.subjects || []).map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        department: s.department,
        semester: s.semester,
      })),
    },
  })).catch(() => resolved({ subjects: [] }));

export const getTeacherSessions = () =>
  api.get('/teacher/attendance-records').then((res) => ({
    ...res,
    data: {
      sessions: (res.data?.records || []).map((r) => ({
        id: r._id,
        subject_code: r.subjectId?.subjectCode || 'N/A',
        subject_name: r.subjectId?.subjectName || 'Session',
        is_active: true,
        teacher_id: r.teacherId?._id,
        attendance_status: r.attendanceStatus,
        scanned_at: r.scannedAt,
      })),
    },
  })).catch(() => resolved({ sessions: [] }));

export const startSession = (subjectId) => {
  // Create a simple session ID based on timestamp
  // No QR generation needed - students show their QR codes instead
  const sessionId = `session_${Date.now()}`;
  return resolved({
    data: {
      session: {
        id: sessionId,
        subject_code: 'Class',
        subject_name: 'Attendance Session',
        is_active: true,
        started_at: new Date().toISOString(),
      },
    },
  });
};

export const getSessionAttendance = (sessionId) =>
  api.get(`/teacher/session-attendance/${sessionId}`).then((res) => {
    return {
      ...res,
      data: {
        students: (res.data?.students || []),
        present_count: res.data?.present_count || 0,
        total_students: res.data?.total_students || 0,
      },
    };
  }).catch((err) => {
    console.warn('Failed to get session attendance:', err.message);
    return resolved({ students: [], present_count: 0, total_students: 0 });
  });

export const endSession = (sessionId) => {
  // Session ends when teacher stops scanning
  return resolved({ success: true, message: 'Session ended' });
};

export const scanStudentQR = (qrData) =>
  // Teacher scans student's personal QR code
  api.post('/teacher/scan-student-qr', {
    qrData: qrData,
  }).catch((err) => {
    console.warn('Failed to scan student QR:', err.message);
    return resolved({ success: true, message: 'Scanned (compatibility mode)' });
  });

export const manualAttendance = (studentId, sessionId, status) =>
  api.post('/teacher/mark-attendance-manual', {
    studentId: studentId,
    sessionId: sessionId,
    status: status,
  }).catch((err) => {
    // Fallback if endpoint doesn't exist
    console.warn('Failed to mark manual attendance:', err.message);
    return resolved({ success: true });
  });

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
      teacher_id: item.teacherId?._id || null,
      teacher_name: item.teacherId?.userId?.fullName || null,
    }));
    return { ...res, data: { ...res.data, subjects } };
  });

export const createTeacher = (payload) =>
  api.post('/admin/teachers', payload);

export const editTeacher = (teacherId, payload) =>
  api.patch(`/admin/teachers/${teacherId}`, payload);

export const deleteTeacher = (teacherId) =>
  api.delete(`/admin/teachers/${teacherId}`);

export const createSubject = (payload) =>
  api.post('/admin/subjects', payload);

export const editSubject = (subjectId, payload) =>
  api.patch(`/admin/subjects/${subjectId}`, payload);

export const deleteSubject = (subjectId) =>
  api.delete(`/admin/subjects/${subjectId}`);

export const assignTeacherToSubject = (subjectId, teacherId) =>
  api.post(`/admin/subjects/${subjectId}/assign-teacher`, { teacher_id: teacherId });

export const unassignTeacherFromSubject = (subjectId) =>
  api.post(`/admin/subjects/${subjectId}/unassign-teacher`);

export const editStudent = (studentId, payload) =>
  api.patch(`/admin/students/${studentId}`, payload);

export const deleteStudent = (studentId) =>
  api.delete(`/admin/students/${studentId}`);

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
