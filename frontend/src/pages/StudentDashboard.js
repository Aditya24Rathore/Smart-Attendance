import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StudentQRDisplay from '../components/StudentQRDisplay';
import { useAuth } from '../App';
import { getAttendanceSummary, getStudentAttendance, getActiveSessions } from '../services/api';

function StudentDashboard() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<StudentHome />} />
          <Route path="/attendance" element={<StudentAttendanceHistory />} />
          <Route path="*" element={<StudentHome />} />
        </Routes>
      </div>
    </div>
  );
}

function StudentHome() {
  const { studentData } = useAuth();
  const [tab, setTab] = useState('qr');
  const [summary, setSummary] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    loadSummary();
    loadSessions();
  }, []);

  const loadSummary = async () => {
    try {
      const res = await getAttendanceSummary();
      setSummary(res.data);
    } catch {}
  };

  const loadSessions = async () => {
    try {
      const res = await getActiveSessions();
      setActiveSessions(res.data.sessions || []);
    } catch {}
  };

  return (
    <>
      <div className="tabs">
        <button className={`tab ${tab === 'qr' ? 'active' : ''}`} onClick={() => setTab('qr')}>
          📱 My QR Code
        </button>
        <button className={`tab ${tab === 'attendance' ? 'active' : ''}`} onClick={() => setTab('attendance')}>
          📊 Attendance
        </button>
        <button className={`tab ${tab === 'sessions' ? 'active' : ''}`} onClick={() => setTab('sessions')}>
          📚 Sessions
        </button>
      </div>

      {tab === 'qr' && (
        <StudentQRDisplay studentData={studentData} />
      )}

      {tab === 'attendance' && summary && (
        <>
          <div className="stats-grid">
            <div className={`stat-card ${summary.overall_percentage >= 75 ? 'success' : summary.overall_percentage >= 50 ? 'warning' : 'danger'}`}>
              <div className="stat-value">{summary.overall_percentage}%</div>
              <div className="stat-label">Overall</div>
            </div>
            {summary.summary.slice(0, 3).map((s) => (
              <div key={s.subject_id} className={`stat-card ${s.percentage >= 75 ? 'success' : s.percentage >= 50 ? 'warning' : 'danger'}`}>
                <div className="stat-value">{s.percentage}%</div>
                <div className="stat-label">{s.subject_code}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Subject-wise Attendance</h3>
            </div>
            {summary.summary.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📊</div>
                <h3>No Records Yet</h3>
                <p>Your attendance records will appear here</p>
              </div>
            ) : (
              summary.summary.map((s) => (
                <div key={s.subject_id} className="attendance-item">
                  <div className="student-info">
                    <span className="student-name">{s.subject_name}</span>
                    <span className="student-roll">{s.subject_code} • {s.present}P / {s.late}L / {s.absent}A of {s.total_sessions}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${s.percentage >= 75 ? 'badge-present' : s.percentage >= 50 ? 'badge-late' : 'badge-absent'}`}>
                      {s.percentage}%
                    </span>
                    <div className="progress-bar mt-8" style={{ width: 80 }}>
                      <div
                        className={`progress-fill ${s.percentage >= 75 ? 'good' : s.percentage >= 50 ? 'warning' : 'danger'}`}
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'sessions' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Active Class Sessions</h3>
            <button className="btn btn-primary btn-sm" onClick={loadSessions}>Refresh</button>
          </div>
          {activeSessions.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📚</div>
              <h3>No Active Sessions</h3>
              <p>No classes are currently in session</p>
            </div>
          ) : (
            activeSessions.map((s) => (
              <div key={s.id} className="attendance-item">
                <div className="student-info">
                  <span className="student-name">{s.subject_name}</span>
                  <span className="student-roll">{s.subject_code} • {s.teacher_name}</span>
                </div>
                <span className="badge badge-active">Active</span>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

function StudentAttendanceHistory() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getStudentAttendance();
        setRecords(res.data.attendance || []);
      } catch {}
    };
    load();
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Attendance History</h3>
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Status</th>
              <th>Date</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.subject_name}</td>
                <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                <td>{new Date(r.marked_at).toLocaleDateString()}</td>
                <td>{r.marked_by}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan="4" className="text-center text-muted" style={{ padding: 30 }}>No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StudentDashboard;
