import React, { useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { scanStudentQR } from '../services/api';

function StudentQRScanner({ onScanSuccess, sessionData }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef(null);

  const startScanning = () => {
    setScanning(true);
    setError('');
    setScanResult(null);

    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        'qr-scanner',
        { fps: 10, qrbox: { width: 300, height: 300 } },
        false
      );
    }

    scannerRef.current.render(
      async (decodedText) => {
        // QR code scanned
        try {
          setIsLoading(true);
          setScanResult(null);

          // Send the scanned QR data to backend
          const response = await scanStudentQR(decodedText);

          if (response.data?.success) {
            setScanResult({
              type: 'success',
              message: response.data?.message || '✅ Attendance Marked',
              student: response.data?.student,
            });

            if (onScanSuccess) {
              onScanSuccess(response.data);
            }

            // Stop scanning after successful scan
            stopScanning();
          }
        } catch (err) {
          const errorMsg = err.response?.data?.error || 'Failed to mark attendance';
          setScanResult({
            type: 'error',
            message: errorMsg,
          });

          // Don't stop scanning on error, allow retrying
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        // Error while scanning
        if (!error.includes('NotFound')) {
          console.debug('Scan error:', error);
        }
      }
    );
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📱 Scan Student QR Code</h3>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!scanning ? (
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <p className="text-muted mb-3">
            Click below to start scanning students' QR codes
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={startScanning}
            disabled={isLoading}
          >
            🔍 Start Scanning
          </button>
        </div>
      ) : (
        <>
          <div id="qr-scanner" style={{ width: '100%', maxWidth: '400px', margin: '20px auto' }} />
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <button
              className="btn btn-danger"
              onClick={stopScanning}
              disabled={isLoading}
            >
              ⛔ Stop Scanning
            </button>
          </div>
        </>
      )}

      {scanResult && (
        <div className={`alert alert-${scanResult.type === 'success' ? 'success' : 'error'}`} style={{ margin: '20px' }}>
          <strong>{scanResult.message}</strong>
          {scanResult.student && (
            <div style={{ marginTop: '10px', fontSize: '14px' }}>
              <p>Enrollment: {scanResult.student.enrollmentNo}</p>
              <p>Name: {scanResult.student.name}</p>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Processing scan...
        </div>
      )}
    </div>
  );
}

export default StudentQRScanner;
