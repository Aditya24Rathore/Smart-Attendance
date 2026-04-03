import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StudentQRScanner from '../components/StudentQRScanner';
import { useAuth } from '../App';
import { startSession, endSession, getSessionAttendance, getTeacherSubjects } from '../services/api';

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
  const [activeSession, setActiveSession] = useState(null);
  const [attendance, setAttendance] = useState({ students: [], present_count: 0, total_students: 0 });
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const res = await getTeacherSubjects();
        const fetchedSubjects = res.data?.subjects || [];
        setSubjects(fetchedSubjects);
        if (fetchedSubjects.length > 0) {
          setSelectedSubject(fetchedSubjects[0].id);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
        setError('Failed to load subjects');
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  const handleStartSession = async () => {
    if (!selectedSubject) {
      setError('Please select a subject first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await startSession(selectedSubject);
      const newSession = res.data.session;
      setActiveSession(newSession);
      await loadAttendance(newSession.id, selectedSubject);
      setTab('scan');
      setScanResult(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    if (!window.confirm('End this session?')) return;
    setLoading(true);
    try {
      await endSession(activeSession.id);
      setActiveSession(null);
      setAttendance({ students: [], present_count: 0, total_students: 0 });
      setScanResult(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async (sessionId, subId = null) => {
    try {
      const res = await getSessionAttendance(sessionId, subId || selectedSubject);
      setAttendance(res.data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  };

  const handleScanSuccess = useCallback((result) => {
    if (result?.success && activeSession) {
      setScanResult({
        type: 'success',
        message: result.message || '✅ Attendance Marked',
        student: result.student,
      });
      loadAttendance(activeSession.id, selectedSubject);
      setTimeout(() => setScanResult(null), 2000);
    }
  }, [activeSession, selectedSubject]);

  const handleManualAttendance = async (studentId, status) => {
    if (!activeSession) return;
    try {
      await manualAttendance(studentId, activeSession.id, status);
      loadAttendance(activeSession.id, selectedSubject);
    } catch {}
  };

  return (
    <>
      {/* Session Controls */}
      {!activeSession ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Start Attendance Session</h3>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div style={{ padding: '20px' }}>
            <p className="text-muted mb-4">
              Select a subject and start a session to begin scanning student QR codes
            </p>
            
            {loadingSubjects ? (
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <p>Loading subjects...</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="alert alert-warning">
                No subjects assigned to you. Please contact an administrator.
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    📚 Select Subject:
                  </label>
                  <select
                    className="form-control"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    style={{
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      width: '100%',
                    }}
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.code} - {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    className="btn btn-success btn-lg"
                    onClick={handleStartSession}
                    disabled={loading || !selectedSubject}
                  >
                    {loading ? 'Starting...' : '▶️ Start Session'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: 'white' }}>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 700, margin: '0 0 8px 0' }}>🔴 Session Active</h3>
              {activeSession && (
                <p style={{ margin: '4px 0', opacity: 0.9, fontSize: '0.9rem' }}>
                  <strong>Subject:</strong> {activeSession.subject_code} - {activeSession.subject_name}
                </p>
              )}
              <p style={{ margin: '4px 0', opacity: 0.9, fontSize: '0.9rem' }}>
                {attendance.present_count} / {attendance.total_students} students marked
              </p>
            </div>
            <button className="btn btn-danger" onClick={handleEndSession} disabled={loading}>
              ⏹️ End Session
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'scan' ? 'active' : ''}`} onClick={() => setTab('scan')}>
          � Scan QR Code
        </button>
        <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
          👥 Attendance List ({attendance.present_count}/{attendance.total_students})
        </button>
      </div>

      {/* QR Scanner Tab */}
      {tab === 'scan' && (
        <>
          {!activeSession ? (
            <div className="card">
              <div className="empty-state">
                <div className="icon">�</div>
                <h3>No Active Session</h3>
                <p>Start a session first to scan student QR codes</p>
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
                      <p><strong>Name:</strong> {scanResult.student.name}</p>
                      <p><strong>Enrollment:</strong> {scanResult.student.enrollmentNo}</p>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
    </>
  );
}

export default TeacherDashboard;
