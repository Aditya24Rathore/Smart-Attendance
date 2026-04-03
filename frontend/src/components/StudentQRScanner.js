import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanStudentQR } from '../services/api';

function StudentQRScanner({ onScanSuccess, sessionData }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const qrInstanceRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isScannerInitializedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrInstanceRef.current) {
        qrInstanceRef.current.stop().catch(() => {});
        qrInstanceRef.current = null;
      }
    };
  }, []);

  // Initialize scanner when scanning becomes true
  useEffect(() => {
    if (!scanning || isScannerInitializedRef.current) return;

    const initializeScanner = async () => {
      try {
        isScannerInitializedRef.current = true;
        setError('');
        setScanResult(null);
        isProcessingRef.current = false;

        // Check if scanner container exists (now that React has rendered it)
        const scannerElement = document.getElementById('qr-scanner');
        if (!scannerElement) {
          setError('❌ Scanner element not found. Page rendering delayed. Please try again.');
          setScanning(false);
          isScannerInitializedRef.current = false;
          return;
        }

        // Clear any previous scanner instance
        if (qrInstanceRef.current) {
          try {
            await qrInstanceRef.current.stop();
          } catch (e) {
            console.debug('Error clearing previous scanner:', e);
          }
          qrInstanceRef.current = null;
        }

        // Initialize new scanner instance
        qrInstanceRef.current = new Html5Qrcode('qr-scanner');

        // Get available cameras
        let devices = [];
        try {
          devices = await Html5Qrcode.getCameras();
        } catch (cameraErr) {
          console.error('Camera detection error:', cameraErr);
          if (cameraErr.name === 'NotAllowedError' || cameraErr.message?.includes('Permission')) {
            setError('❌ Camera permission denied. Please allow camera access in your browser settings.');
          } else if (cameraErr.name === 'NotFoundError') {
            setError('❌ No camera found on this device.');
          } else {
            setError(`❌ Cannot detect camera: ${cameraErr.message || 'Unknown error'}`);
          }
          setScanning(false);
          isScannerInitializedRef.current = false;
          return;
        }

        if (!devices || devices.length === 0) {
          setError('❌ No camera found. Please ensure a camera is connected and permissions are granted.');
          setScanning(false);
          isScannerInitializedRef.current = false;
          return;
        }

        // Start scanning with the first available camera
        const cameraId = devices[0].id;

        await qrInstanceRef.current.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
          },
          async (decodedText) => {
            // Prevent processing multiple scans simultaneously
            if (isProcessingRef.current) return;

            isProcessingRef.current = true;
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
              } else {
                setScanResult({
                  type: 'error',
                  message: response.data?.error || 'Failed to mark attendance',
                });
              }
            } catch (err) {
              console.error('Scan processing error:', err);
              
              // Handle different error scenarios
              let errorMsg = 'Failed to mark attendance';
              
              if (err.response?.status === 409) {
                // Duplicate scan within 2 minutes
                errorMsg = err.response?.data?.error || '⚠️ Already marked for this student. Wait 2 minutes before rescanning.';
              } else if (err.response?.data?.error) {
                errorMsg = err.response.data.error;
              } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
              } else if (err.message) {
                errorMsg = err.message;
              }
              
              setScanResult({
                type: 'error',
                message: errorMsg,
              });
              // Don't stop scanning on error, allow retrying
            } finally {
              setIsLoading(false);
              isProcessingRef.current = false;
            }
          },
          (error) => {
            // Ignore "NotFound" errors which are normal during scanning
            if (!error?.includes('NotFound') && !error?.includes('NotFoundException')) {
              console.debug('Scan debug:', error);
            }
          }
        );
      } catch (err) {
        console.error('Scanner initialization error:', err);
        const errorMsg = err.message || 'Failed to start camera';

        if (err.name === 'NotAllowedError') {
          setError('❌ Camera permission denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('❌ No camera found on this device.');
        } else if (err.message?.includes('permission') || err.message?.includes('Permission')) {
          setError('❌ Camera permission required. Please check your browser settings.');
        } else if (err.message?.includes('NotReadable')) {
          setError('❌ Camera is in use by another application. Please close other apps using the camera.');
        } else if (err.message?.includes('HTTPS') || err.message?.includes('https')) {
          setError('❌ HTTPS is required for camera access. Your connection may not be secure.');
        } else {
          setError(`❌ Failed to start camera: ${errorMsg}`);
        }

        setScanning(false);
        isScannerInitializedRef.current = false;
        qrInstanceRef.current = null;
      }
    };

    initializeScanner();
  }, [scanning]);

  const startScanning = () => {
    isScannerInitializedRef.current = false;
    setScanning(true);
  };

  const stopScanning = async () => {
    try {
      if (qrInstanceRef.current) {
        await qrInstanceRef.current.stop();
        qrInstanceRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
    isScannerInitializedRef.current = false;
    setScanning(false);
  };

  return (
    <div className="card" ref={containerRef}>
      <div className="card-header">
        <h3 className="card-title">📱 Scan Student QR Code</h3>
      </div>

      {error && (
        <div className="alert alert-error" style={{ margin: '15px' }}>
          {error}
        </div>
      )}

      {!scanning ? (
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <p className="text-muted mb-3">
            Click below to start scanning students' QR codes
          </p>
          <p style={{ fontSize: '12px', color: '#999', marginBottom: '20px' }}>
            📷 Make sure to allow camera access when your browser prompts you
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={startScanning}
            disabled={isLoading}
            style={{ minWidth: '150px' }}
          >
            🔍 Start Scanning
          </button>
        </div>
      ) : (
        <>
          <div style={{ padding: '0 15px' }}>
            <div 
              id="qr-scanner" 
              style={{ 
                width: '100%', 
                maxWidth: '400px', 
                margin: '20px auto',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid #007bff',
                backgroundColor: '#000',
                aspectRatio: '1/1',
              }} 
            />
          </div>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <button
              className="btn btn-danger"
              onClick={stopScanning}
              disabled={isLoading}
              style={{ minWidth: '150px' }}
            >
              ⛔ Stop Scanning
            </button>
          </div>
        </>
      )}

      {scanResult && (
        <div 
          className={`alert alert-${scanResult.type === 'success' ? 'success' : 'error'}`} 
          style={{ margin: '15px', marginTop: '20px' }}
        >
          <strong>{scanResult.message}</strong>
          {scanResult.student && (
            <div style={{ marginTop: '10px', fontSize: '14px' }}>
              <p style={{ margin: '5px 0' }}>📋 Enrollment: {scanResult.student.enrollmentNo}</p>
              <p style={{ margin: '5px 0' }}>👤 Name: {scanResult.student.name}</p>
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
