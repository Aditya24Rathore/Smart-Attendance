import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StudentQRScanner from '../components/StudentQRScanner';
import { useAuth } from '../App';
import {
  getTeacherSubjects, startSession, endSession,
  getSessionAttendance, getTeacherSessions, manualAttendance,
} from '../services/api';

function TeacherDashboard() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<TeacherHome />} />
          <Route path="*" element={<TeacherHome />} />
        </Routes>
      </div>
    </div>
  );
}

function TeacherHome() {
  const { teacherData } = useAuth();
  const [tab, setTab] = useState('scan');
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [attendance, setAttendance] = useState({ students: [], present_count: 0, total_students: 0 });
  const [scanResult, setScanResult] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubjects();
    loadSessions();
  }, []);

  const loadSubjects = async () => {
    try {
      const res = await getTeacherSubjects();
      setSubjects(res.data.subjects || []);
    } catch {}
  };

  const loadSessions = async () => {
    try {
      const res = await getTeacherSessions();
      const all = res.data.sessions || [];
      setSessions(all);
      const active = all.find(s => s.is_active);
      if (active) {
        setActiveSession(active);
        loadAttendance(active.id);
      }
    } catch {}
  };

  const loadAttendance = async (sessionId) => {
    try {
      const res = await getSessionAttendance(sessionId);
      setAttendance(res.data);
    } catch {}
  };

  const handleStartSession = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    setError('');
    try {
      const res = await startSession(parseInt(selectedSubject));
      setActiveSession(res.data.session);
      loadAttendance(res.data.session.id);
      setTab('scan');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    if (!window.confirm('End this session? All unmarked students will be marked absent.')) return;
    setLoading(true);
    try {
      await endSession(activeSession.id);
      setActiveSession(null);
      setAttendance({ students: [], present_count: 0, total_students: 0 });
      loadSessions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = useCallback((result) => {
    if (result?.student) {
      setScanResult({ 
        type: 'success', 
        message: `✅ ${result.student.name} - Marked Present`,
        student: result.student
      });
      loadAttendance(activeSession?.id);
    }
  }, [activeSession]);

  const handleManualAttendance = async (studentId, status) => {
    if (!activeSession) return;
    try {
      await manualAttendance(studentId, activeSession.id, status);
      loadAttendance(activeSession.id);
    } catch {}
  };

  return (
    <>
      {/* Session Controls */}
      {!activeSession ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Start New Session</h3>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Select Subject</label>
            <select className="form-select" value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}>
              <option value="">Choose a subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-success btn-block" onClick={handleStartSession}
            disabled={!selectedSubject || loading}>
            {loading ? 'Starting...' : '▶ Start Session'}
          </button>
          {subjects.length === 0 && (
            <p className="text-sm text-muted mt-8">No subjects assigned. Contact admin.</p>
          )}
        </div>
      ) : (
        <div className="card" style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: 'white' }}>
          <div className="flex-between">
            <div>
              <h3 style={{ fontWeight: 700 }}>📡 Session Active</h3>
              <p style={{ opacity: 0.9, fontSize: '0.9rem' }}>
                {activeSession.subject_code} - {activeSession.subject_name}
              </p>
              <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
                {attendance.present_count} / {attendance.total_students} Present
              </p>
            </div>
            <button className="btn btn-danger" onClick={handleEndSession} disabled={loading}>
              ⏹ End
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'scan' ? 'active' : ''}`} onClick={() => setTab('scan')}>
          📸 Scan QR
        </button>
        <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
          📋 Attendance ({attendance.present_count}/{attendance.total_students})
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          📜 History
        </button>
      </div>

      {/* QR Scanner Tab */}
      {tab === 'scan' && (
        <>
          {!activeSession ? (
            <div className="card">
              <div className="empty-state">
                <div className="icon">📸</div>
                <h3>Start a Session First</h3>
                <p>You need to start a class session before scanning student QR codes</p>
              </div>
            </div>
          ) : (
            <>
              <StudentQRScanner onScanSuccess={handleScanSuccess} sessionData={activeSession} />
              {scanResult && (
                <div className={`alert alert-${scanResult.type}`} style={{ marginTop: '20px' }}>
                  <strong>{scanResult.message}</strong>
                  {scanResult.student && (
                    <div style={{ marginTop: '8px', fontSize: '14px' }}>
                      <p>ID: {scanResult.student.enrollmentNo}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Attendance List Tab */}
      {tab === 'list' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Live Attendance</h3>
            {activeSession && (
              <button className="btn btn-primary btn-sm"
                onClick={() => loadAttendance(activeSession.id)}>
                Refresh
              </button>
            )}
          </div>
          {attendance.students.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👥</div>
              <h3>No Students Found</h3>
            </div>
          ) : (
            <div className="attendance-list">
              {attendance.students.map((item) => (
                <div key={item.id} className="attendance-item">
                  <div className="student-info">
                    <span className="student-name">{item.full_name}</span>
                    <span className="student-roll">{item.roll_number || item.enrollmentNo}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge badge-${item.status === 'absent' ? 'absent' : 'present'}`}>
                      {item.status}
                    </span>
                    {activeSession && item.status !== 'present' && (
                      <button className="btn btn-success btn-sm"
                        onClick={() => handleManualAttendance(item.id, 'present')}
                        title="Mark Present">
                        ✓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Session History</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>{s.subject_code} - {s.subject_name}</td>
                    <td>{s.date}</td>
                    <td><span className={`badge ${s.is_active ? 'badge-active' : 'badge-present'}`}>
                      {s.is_active ? 'Active' : 'Completed'}
                    </span></td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan="3" className="text-center text-muted" style={{ padding: 30 }}>No sessions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default TeacherDashboard;
