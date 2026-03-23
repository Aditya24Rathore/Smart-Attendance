import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../App';
import {
  getAdminDashboard, getStudents, getTeachers, createTeacher,
  createSubject, getSubjects, overrideAttendance, exportExcel,
  exportGoogleSheets, getDefaulters, toggleUser, getDepartments, updateAdminCredentials,
} from '../services/api';

function AdminDashboard() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="*" element={<AdminHome />} />
        </Routes>
      </div>
    </div>
  );
}

function AdminHome() {
  const { user, handleLogin } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [filterDept, setFilterDept] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportingType, setExportingType] = useState('');
  const [accountForm, setAccountForm] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await getAdminDashboard();
      setStats(res.data.stats);
      setRecentLogs(res.data.recent_logs || []);
    } catch {}
    try {
      const res = await getDepartments();
      setDepartments(res.data.departments || []);
    } catch {}
  };

  const loadStudents = async () => {
    try {
      const res = await getStudents({ department: filterDept, search: searchTerm });
      setStudents(res.data.students || []);
    } catch {}
  };

  const loadTeachers = async () => {
    try {
      const res = await getTeachers();
      setTeachers(res.data.teachers || []);
    } catch {}
  };

  const loadSubjects = async () => {
    try {
      const res = await getSubjects({ department: filterDept });
      setSubjects(res.data.subjects || []);
    } catch {}
  };

  const loadDefaulters = async () => {
    try {
      const res = await getDefaulters({ department: filterDept, min_percentage: 75 });
      setDefaulters(res.data.defaulters || []);
    } catch {}
  };

  useEffect(() => {
    if (tab === 'students') loadStudents();
    else if (tab === 'teachers') loadTeachers();
    else if (tab === 'subjects') loadSubjects();
    else if (tab === 'defaulters') loadDefaulters();
  }, [tab, filterDept]);

  useEffect(() => {
    if (user?.email) {
      setAccountForm((prev) => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const downloadBlob = (blobData, filename) => {
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    setError('');
    setExportingType('excel');
    try {
      const res = await exportExcel({ department: filterDept });
      downloadBlob(res.data, 'attendance_report.xlsx');
      setSuccess('Excel report downloaded successfully');
    } catch {
      setError('Excel export failed');
    } finally {
      setExportingType('');
    }
  };

  const handleExportGoogleSheets = async () => {
    setError('');
    setExportingType('google-sheets');
    try {
      const res = await exportGoogleSheets({ department: filterDept });
      downloadBlob(res.data, 'attendance_google_sheets.csv');
      setSuccess('Google Sheets CSV downloaded successfully');
    } catch {
      setError('Google Sheets export failed');
    } finally {
      setExportingType('');
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      await toggleUser(userId);
      loadStudents();
      loadTeachers();
    } catch {}
  };

  const handleAccountUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = accountForm.email.trim();
    const trimmedNewPassword = accountForm.newPassword.trim();
    const emailChanged = trimmedEmail && trimmedEmail !== (user?.email || '');
    const passwordChanged = !!trimmedNewPassword;

    if (!accountForm.currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!emailChanged && !passwordChanged) {
      setError('No changes to update');
      return;
    }

    if (passwordChanged && trimmedNewPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (passwordChanged && accountForm.newPassword !== accountForm.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    try {
      const payload = {
        currentPassword: accountForm.currentPassword,
      };

      if (emailChanged) {
        payload.email = trimmedEmail;
      }

      if (passwordChanged) {
        payload.newPassword = accountForm.newPassword;
      }

      const res = await updateAdminCredentials(payload);
      const updatedUser = res.data?.user;

      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        handleLogin(updatedUser, null, null);
      }

      setAccountForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setSuccess('Account credentials updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update account credentials');
    }
  };

  return (
    <>
      {/* Tab Navigation */}
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {['overview', 'students', 'teachers', 'subjects', 'defaulters', 'reports', 'settings'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}>
            {t === 'overview' && '📊'} {t === 'students' && '🎓'} {t === 'teachers' && '👨‍🏫'}
            {t === 'subjects' && '📚'} {t === 'defaulters' && '⚠️'} {t === 'reports' && '📄'} {t === 'settings' && '⚙️'}
            {' '}{t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}<button onClick={() => setError('')} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button></div>}
      {success && <div className="alert alert-success">{success}<button onClick={() => setSuccess('')} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button></div>}

      {/* Overview Tab */}
      {tab === 'overview' && stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total_students}</div>
              <div className="stat-label">Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_teachers}</div>
              <div className="stat-label">Teachers</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_subjects}</div>
              <div className="stat-label">Subjects</div>
            </div>
            <div className="stat-card success">
              <div className="stat-value">{stats.active_sessions}</div>
              <div className="stat-label">Active Sessions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.today_sessions}</div>
              <div className="stat-label">Today's Sessions</div>
            </div>
            <div className="stat-card success">
              <div className="stat-value">{stats.today_attendance}</div>
              <div className="stat-label">Today Present</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Action</th><th>Details</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {recentLogs.map((log, i) => (
                    <tr key={i}>
                      <td><span className="badge badge-present">{log.action}</span></td>
                      <td>{log.details}</td>
                      <td className="text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                  {recentLogs.length === 0 && (
                    <tr><td colSpan="3" className="text-center text-muted" style={{ padding: 20 }}>No recent activity</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Students Tab */}
      {tab === 'students' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Student Management</h3>
          </div>
          <div className="grid-2 mb-16">
            <input type="text" className="form-input" placeholder="Search by name or roll number..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadStudents()} />
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-select" value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button className="btn btn-primary" onClick={loadStudents}>Search</button>
            </div>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Roll No</th><th>Name</th><th>Department</th><th>Semester</th><th>Phone</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>{s.roll_number}</td>
                    <td>{s.full_name}</td>
                    <td>{s.department}</td>
                    <td>Sem {s.semester}</td>
                    <td>{s.phone}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => handleToggleUser(s.user_id)}>
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted" style={{ padding: 20 }}>No students found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teachers Tab */}
      {tab === 'teachers' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Teacher Management</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal('teacher')}>
              + Add Teacher
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Employee ID</th><th>Name</th><th>Department</th><th>Designation</th></tr>
              </thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t.id}>
                    <td>{t.employee_id}</td>
                    <td>{t.full_name}</td>
                    <td>{t.department}</td>
                    <td>{t.designation}</td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr><td colSpan="4" className="text-center text-muted" style={{ padding: 20 }}>No teachers yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subjects Tab */}
      {tab === 'subjects' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Subject Management</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal('subject')}>
              + Add Subject
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Department</th><th>Semester</th><th>Teacher</th></tr>
              </thead>
              <tbody>
                {subjects.map(s => (
                  <tr key={s.id}>
                    <td>{s.code}</td>
                    <td>{s.name}</td>
                    <td>{s.department}</td>
                    <td>Sem {s.semester}</td>
                    <td>{s.teacher_name || 'Unassigned'}</td>
                  </tr>
                ))}
                {subjects.length === 0 && (
                  <tr><td colSpan="5" className="text-center text-muted" style={{ padding: 20 }}>No subjects yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Defaulters Tab */}
      {tab === 'defaulters' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Attendance Defaulters (&lt;75%)</h3>
            <select className="form-select" style={{ width: 'auto' }} value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {defaulters.length === 0 ? (
            <div className="empty-state">
              <div className="icon">✅</div>
              <h3>No Defaulters</h3>
              <p>All students meet the minimum attendance requirement</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Roll No</th><th>Name</th><th>Department</th><th>Attended</th><th>Percentage</th></tr>
                </thead>
                <tbody>
                  {defaulters.map(d => (
                    <tr key={d.student.id}>
                      <td>{d.student.roll_number}</td>
                      <td>{d.student.full_name}</td>
                      <td>{d.student.department}</td>
                      <td>{d.attended} / {d.total_sessions}</td>
                      <td>
                        <span className={`badge ${d.percentage >= 50 ? 'badge-late' : 'badge-absent'}`}>
                          {d.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Export Reports</h3>
          </div>
          <p className="text-muted mb-16">
            Download attendance data in Excel format or CSV format ready for Google Sheets import.
          </p>
          <div className="form-group">
            <label className="form-label">Department Filter</label>
            <select className="form-select" value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <button
              className="btn btn-success btn-lg"
              onClick={handleExportExcel}
              disabled={!!exportingType}
            >
              {exportingType === 'excel' ? 'Exporting Excel...' : '📥 Export Excel (.xlsx)'}
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleExportGoogleSheets}
              disabled={!!exportingType}
            >
              {exportingType === 'google-sheets' ? 'Exporting CSV...' : '📄 Export Google Sheets (.csv)'}
            </button>
          </div>
          <p className="text-sm text-muted mt-8">
            Tip: In Google Sheets, use File → Import and select the downloaded CSV file.
          </p>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Account Settings</h3>
          </div>
          <form onSubmit={handleAccountUpdate}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                placeholder="Enter admin email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <input
                type="password"
                className="form-input"
                value={accountForm.currentPassword}
                onChange={(e) => setAccountForm({ ...accountForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={accountForm.newPassword}
                  onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })}
                  placeholder="Leave empty to keep current"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={accountForm.confirmPassword}
                  onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block">
              Save Account Changes
            </button>
          </form>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showModal === 'teacher' && (
        <CreateTeacherModal
          onClose={() => setShowModal(null)}
          onSuccess={() => { setShowModal(null); loadTeachers(); setSuccess('Teacher created successfully'); }}
          setError={setError}
        />
      )}

      {/* Add Subject Modal */}
      {showModal === 'subject' && (
        <CreateSubjectModal
          teachers={teachers}
          onClose={() => setShowModal(null)}
          onSuccess={() => { setShowModal(null); loadSubjects(); setSuccess('Subject created successfully'); }}
          setError={setError}
        />
      )}
    </>
  );
}

function CreateTeacherModal({ onClose, onSuccess, setError }) {
  const [form, setForm] = useState({
    username: '', password: '', full_name: '', employee_id: '',
    department: '', designation: '', phone: '', email: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTeacher(form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create teacher');
    } finally {
      setLoading(false);
    }
  };

  const departments = [
    'Computer Science', 'Information Technology', 'Electronics',
    'Electrical', 'Mechanical', 'Civil', 'Chemical', 'Biotechnology',
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Add New Teacher</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input type="text" className="form-input" value={form.full_name}
              onChange={e => setForm({...form, full_name: e.target.value})} required />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Employee ID *</label>
              <input type="text" className="form-input" value={form.employee_id}
                onChange={e => setForm({...form, employee_id: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select className="form-select" value={form.department}
                onChange={e => setForm({...form, department: e.target.value})} required>
                <option value="">Select</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <input type="text" className="form-input" placeholder="e.g. Assistant Professor"
              value={form.designation}
              onChange={e => setForm({...form, designation: e.target.value})} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input type="text" className="form-input" value={form.username}
                onChange={e => setForm({...form, username: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input type="password" className="form-input" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateSubjectModal({ teachers, onClose, onSuccess, setError }) {
  const [form, setForm] = useState({
    name: '', code: '', department: '', semester: '', teacher_id: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createSubject({
        ...form,
        teacher_id: form.teacher_id || null,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create subject');
    } finally {
      setLoading(false);
    }
  };

  const departments = [
    'Computer Science', 'Information Technology', 'Electronics',
    'Electrical', 'Mechanical', 'Civil', 'Chemical', 'Biotechnology',
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Add New Subject</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Subject Name *</label>
            <input type="text" className="form-input" placeholder="e.g. Data Structures"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Subject Code *</label>
              <input type="text" className="form-input" placeholder="e.g. CS301"
                value={form.code} onChange={e => setForm({...form, code: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Semester *</label>
              <select className="form-select" value={form.semester}
                onChange={e => setForm({...form, semester: e.target.value})} required>
                <option value="">Select</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Department *</label>
            <select className="form-select" value={form.department}
              onChange={e => setForm({...form, department: e.target.value})} required>
              <option value="">Select</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assign Teacher</label>
            <select className="form-select" value={form.teacher_id}
              onChange={e => setForm({...form, teacher_id: e.target.value})}>
              <option value="">Unassigned</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name} ({t.employee_id})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminDashboard;
