import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateQRToken, getAttendanceSummary } from '../services/api';

function QRCodeDisplay({ studentData }) {
  const [qrToken, setQrToken] = useState('');
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [lastCheckedAttendance, setLastCheckedAttendance] = useState(null);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const attendanceCheckRef = useRef(null);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const fp = generateDeviceFingerprint();
      const res = await generateQRToken({ 
        device_fingerprint: fp,
        enrollmentNo: studentData?.enrollmentNo || studentData?.roll_number,
        roll_number: studentData?.roll_number,
      });
      setQrToken(res.data.qr_token);
      setTimer(30);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }, [studentData]);

  // Check if attendance was marked recently
  const checkAttendanceMarked = useCallback(async () => {
    try {
      const res = await getAttendanceSummary();
      const attendanceRecords = res.data?.student?.attendance || [];
      
      if (attendanceRecords.length === 0) return;

      // Find today's attendance records (sorted by date)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date || record.createdAt);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });

      // Check if new attendance was marked (compare with previous check)
      if (lastCheckedAttendance !== null && todayRecords.length > lastCheckedAttendance) {
        // New attendance marked!
        const latestRecord = attendanceRecords[0]; // Most recent
        setSuccess({
          studentName: studentData?.fullName || studentData?.full_name,
          timestamp: new Date(),
          message: '✅ Attendance Marked Successfully!'
        });

        // Play success sound (if available)
        playSuccessSound();

        // Auto-hide success message after 4 seconds
        setTimeout(() => setSuccess(null), 4000);
      }

      setLastCheckedAttendance(todayRecords.length);
    } catch (err) {
      // Silent fail - don't disrupt QR display
    }
  }, [lastCheckedAttendance, studentData]);

  const playSuccessSound = () => {
    try {
      // Create a simple success beep using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      
      // Create three ascending tones for success sound
      const tones = [
        { freq: 800, start: now, duration: 0.1 },
        { freq: 1000, start: now + 0.15, duration: 0.1 },
        { freq: 1200, start: now + 0.3, duration: 0.2 }
      ];

      tones.forEach(({ freq, start, duration }) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        
        oscillator.start(start);
        oscillator.stop(start + duration);
      });
    } catch (err) {
      // Audio context not available, silently continue
    }
  };

  useEffect(() => {
    fetchToken();
    
    // Refresh QR token every 30 seconds
    intervalRef.current = setInterval(fetchToken, 30000);
    
    // Update timer every second
    timerRef.current = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    // Check for attendance every 3 seconds
    attendanceCheckRef.current = setInterval(checkAttendanceMarked, 3000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
      clearInterval(attendanceCheckRef.current);
    };
  }, [fetchToken, checkAttendanceMarked]);

  return (
    <div className="qr-container">
      {/* Success Notification Overlay */}
      {success && (
        <div className="attendance-success-overlay">
          <div className="attendance-success-modal">
            <div className="success-checkmark">
              <svg viewBox="0 0 52 52" className="checkmark-svg">
                <circle cx="26" cy="26" r="25" fill="none" stroke="#4CAF50" strokeWidth="2" />
                <path d="M14.1 27.2l7.1 7.2 16.7-16.8" fill="none" stroke="#4CAF50" strokeWidth="3" 
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="success-title">{success.message}</h2>
            <div className="success-details">
              <p className="success-student">{success.studentName}</p>
              <p className="success-time">
                {success.timestamp.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="qr-wrapper">
        <div className={`qr-timer ${timer <= 5 ? 'expiring' : ''}`}>
          {timer}
        </div>
        {loading && !qrToken ? (
          <div className="flex-center" style={{ width: 250, height: 250 }}>
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="flex-center" style={{ width: 250, height: 250, flexDirection: 'column' }}>
            <span style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚠️</span>
            <p style={{ color: 'var(--danger)', textAlign: 'center', fontSize: '0.85rem' }}>{error}</p>
            <button className="btn btn-primary btn-sm mt-8" onClick={fetchToken}>Retry</button>
          </div>
        ) : (
          <QRCodeSVG
            value={qrToken}
            size={250}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#1e293b"
          />
        )}
      </div>
      <div className="qr-info">
        <h3>{studentData?.fullName || studentData?.full_name}</h3>
        <p>{studentData?.rollNumber || studentData?.roll_number} • {studentData?.department}</p>
        <p className="text-sm text-muted mt-8">
          Show this QR code to your teacher for attendance
        </p>
        <div className="progress-bar mt-8" style={{ maxWidth: 250 }}>
          <div
            className={`progress-fill ${timer > 15 ? 'good' : timer > 5 ? 'warning' : 'danger'}`}
            style={{ width: `${(timer / 30) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted mt-8">Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}

function generateDeviceFingerprint() {
  const { userAgent, language, hardwareConcurrency } = navigator;
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const data = `${userAgent}|${language}|${hardwareConcurrency}|${screen}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export default QRCodeDisplay;
