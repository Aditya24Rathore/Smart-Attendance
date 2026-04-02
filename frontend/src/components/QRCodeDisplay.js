import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateQRToken } from '../services/api';

function QRCodeDisplay({ studentData }) {
  const [qrToken, setQrToken] = useState('');
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);

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

  useEffect(() => {
    fetchToken();
    intervalRef.current = setInterval(fetchToken, 30000);
    timerRef.current = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, [fetchToken]);

  return (
    <div className="qr-container">
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
