import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getStudentQRCode } from '../services/api';

function StudentQRDisplay({ studentData }) {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);

  useEffect(() => {
    loadStudentQR();
  }, []);

  const loadStudentQR = async (forceRegenerate = false) => {
    setLoading(true);
    setError('');
    try {
      const url = forceRegenerate ? '/api/student/generate-qr?force=true' : '/api/student/generate-qr';
      const res = await getStudentQRCode(forceRegenerate);
      setQrCode(res.data?.qrCode);
      setCached(res.data?.cached || false);
      setGeneratedAt(res.data?.qrCode?.generatedAt);
      
      if (forceRegenerate) {
        console.log('✅ QR code regenerated successfully');
      } else if (res.data?.cached) {
        console.log('📦 Using cached QR code from database');
      } else {
        console.log('🆕 Generated new QR code and cached it');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load your QR code');
      console.error('❌ Error loading QR code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateClick = () => {
    console.log('🔄 User clicked regenerate button - forcing new QR code generation');
    loadStudentQR(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return '';
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
        <button className="btn btn-primary btn-block mt-3" onClick={() => loadStudentQR()}>
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

        {cached && (
          <div className="alert alert-info" style={{ marginBottom: '15px' }}>
            ✅ <strong>Cached QR Code:</strong> This QR code was generated on {formatDate(generatedAt)} and reused
          </div>
        )}

        {!cached && (
          <div className="alert alert-success" style={{ marginBottom: '15px' }}>
            🆕 <strong>Fresh QR Code:</strong> Generated on {formatDate(generatedAt)}. It will be cached for future use.
          </div>
        )}

        {qrCode && (
          <div style={{
            display: 'inline-block',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            border: '2px solid #e0e0e0'
          }}>
            <QRCodeSVG 
              value={qrCode.qrContent || ''} 
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

        <button 
          className="btn btn-secondary btn-block mt-4" 
          onClick={handleRegenerateClick}
        >
          🔄 Generate New QR Code (Force)
        </button>
        <p className="text-xs text-muted mt-2">
          Normally, the same QR code is reused. Click above only if you need a fresh code.
        </p>
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
