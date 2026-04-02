import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getStudentQRCode } from '../services/api';

function StudentQRDisplay({ studentData }) {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStudentQR();
  }, []);

  const loadStudentQR = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getStudentQRCode();
      setQrCode(res.data?.qrCode);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load your QR code');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📱 Your Attendance QR Code</h3>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p className="text-muted">Loading your QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📱 Your Attendance QR Code</h3>
        </div>
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-primary btn-block mt-3" onClick={loadStudentQR}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📱 Your Attendance QR Code</h3>
      </div>
      
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p className="text-muted" style={{ marginBottom: '20px' }}>
          Show this QR code to your teacher to mark attendance
        </p>

        {qrCode && (
          <div style={{
            display: 'inline-block',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            border: '2px solid #e0e0e0'
          }}>
            <QRCodeSVG 
              value={qrCode.qrImage || qrCode.qrContent || ''} 
              size={250}
              level="H"
              includeMargin={true}
            />
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <p className="text-sm text-muted">
            <strong>Enrollment:</strong> {qrCode?.enrollmentNo}
          </p>
          <p className="text-sm text-muted">
            <strong>Name:</strong> {qrCode?.fullName}
          </p>
        </div>

        <button className="btn btn-secondary btn-block mt-4" onClick={loadStudentQR}>
          🔄 Regenerate QR Code
        </button>
      </div>

      <div className="alert alert-info" style={{ margin: '0 20px 20px' }}>
        <strong>ℹ️ Instructions:</strong>
        <ul style={{ marginTop: '10px', marginBottom: '0', paddingLeft: '20px' }}>
          <li>Keep this QR code visible on your screen</li>
          <li>Your teacher will scan this code during class</li>
          <li>Make sure your phone screen is bright enough to scan</li>
        </ul>
      </div>
    </div>
  );
}

export default StudentQRDisplay;
