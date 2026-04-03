import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanStudentQR } from '../services/api';

function StudentQRScanner({ onScanSuccess, sessionData }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef(null);
  const qrInstanceRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrInstanceRef.current) {
        qrInstanceRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    setScanning(true);
    setError('');
    setScanResult(null);

    try {
      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setError('❌ No camera found. Please ensure a camera is connected and permissions are granted.');
        setScanning(false);
        return;
      }

      // Initialize scanner if not already done
      if (!qrInstanceRef.current) {
        qrInstanceRef.current = new Html5Qrcode('qr-scanner', {
          formatsToSupport: [
            Html5Qrcode.SupportedFormats.QR_CODE,
          ],
          experimentalFeatures: {
            useBarkoderIfSupported: true,
          },
          showTorchButtonIfSupported: true,
        });
      }

      // Start scanning with the first available camera
      const cameraId = devices[0].id;
      
      await qrInstanceRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // QR code scanned
          if (!isLoading) {
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
                await stopScanning();
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
          }
        },
        (error) => {
          // Ignore "NotFound" errors which are normal during scanning
          if (!error.includes('NotFound') && !error.includes('NotFoundException')) {
            console.debug('Scan debug:', error);
          }
        }
      );
    } catch (err) {
      const errorMsg = err.message || 'Failed to start camera';
      
      // Check for specific permission errors
      if (err.name === 'NotAllowedError') {
        setError('❌ Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('❌ No camera found on this device.');
      } else if (err.message?.includes('permission')) {
        setError('❌ Camera permission required. Please check your browser settings.');
      } else {
        setError(`❌ ${errorMsg}`);
      }
      
      setScanning(false);
      console.error('Scanner error:', err);
    }
  };

  const stopScanning = async () => {
    try {
      if (qrInstanceRef.current && qrInstanceRef.current.isScanning) {
        await qrInstanceRef.current.stop();
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
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
          <p style={{ fontSize: '12px', color: '#999' }}>
            Make sure to allow camera access when prompted
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
          <div 
            id="qr-scanner" 
            style={{ 
              width: '100%', 
              maxWidth: '400px', 
              margin: '20px auto',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '2px solid #007bff',
            }} 
          />
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
          ⏳ Processing scan...
        </div>
      )}
    </div>
  );
}

export default StudentQRScanner;
