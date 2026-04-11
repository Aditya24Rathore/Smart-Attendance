import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanStudentQR } from '../services/api';

function StudentQRScanner({ onScanSuccess, sessionData }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [switchingCamera, setSwitchingCamera] = useState(false);
  
  const qrInstanceRef = useRef(null);
  const isProcessingRef = useRef(false);
  const scannerContainerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrInstanceRef.current) {
        try {
          qrInstanceRef.current.stop().catch(() => {});
        } catch (e) {
          console.debug('Cleanup error:', e);
        }
        qrInstanceRef.current = null;
      }
    };
  }, []);

  // When scanning state changes, handle initialization
  useEffect(() => {
    if (!scanning) {
      // Cleanup when stopping
      if (qrInstanceRef.current) {
        qrInstanceRef.current.stop().catch(() => {});
        qrInstanceRef.current = null;
      }
      return;
    }

    // Wait for DOM to render before initializing
    const initTimer = setTimeout(() => {
      initializeScanner(selectedCameraIndex);
    }, 100);

    return () => clearTimeout(initTimer);
  }, [scanning, selectedCameraIndex]);

  const initializeScanner = async (cameraIndex = 0) => {
    try {
      setError('');
      setScanResult(null);
      isProcessingRef.current = false;

      // Check if container ref is available
      if (!scannerContainerRef.current) {
        setError('❌ Scanner container not available. Please refresh the page.');
        setScanning(false);
        return;
      }

      // Clear any previous scanner instance
      if (qrInstanceRef.current) {
        try {
          await qrInstanceRef.current.stop();
          qrInstanceRef.current = null;
        } catch (e) {
          console.debug('Error stopping previous scanner:', e);
        }
      }

      // Initialize new scanner instance
      qrInstanceRef.current = new Html5Qrcode('qr-scanner-div');

      // Get available cameras
      let devices = [];
      try {
        devices = await Html5Qrcode.getCameras();
      } catch (cameraErr) {
        console.error('Camera detection error:', cameraErr);
        if (cameraErr.name === 'NotAllowedError' || cameraErr.message?.includes('Permission denied')) {
          setError('❌ Camera permission denied. Please allow camera access in your browser settings.');
          setPermissionDenied(true);
        } else if (cameraErr.name === 'NotFoundError') {
          setError('❌ No camera found on this device.');
        } else {
          setError(`❌ Cannot detect camera: ${cameraErr.message || 'Unknown error'}`);
        }
        setScanning(false);
        return;
      }

      if (!devices || devices.length === 0) {
        setError('❌ No camera found. Please ensure a camera is connected and permissions are granted.');
        setScanning(false);
        return;
      }

      // Store available cameras
      setAvailableCameras(devices);

      // Use selected camera or default to first
      const selectedIndex = Math.min(cameraIndex, devices.length - 1);
      const cameraId = devices[selectedIndex].id;

      await qrInstanceRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
        },
        async (decodedText) => {
          // Prevent processing multiple scans simultaneously
          if (isProcessingRef.current || !scanning) return;

          isProcessingRef.current = true;
          try {
            setIsLoading(true);
            setScanResult(null);

            console.log('🔍 QR Code Scanned. Raw data:', decodedText);

            // Send the scanned QR data to backend
            const response = await scanStudentQR(decodedText);

            console.log('📤 API Response:', response);
            console.log('📤 Response Status:', response.status);
            console.log('📤 Response Data:', response.data);

            if (response.data?.success) {
              console.log('✅ Scan successful!', response.data);
              setScanResult({
                type: 'success',
                message: response.data?.message || '✅ Attendance Marked',
                student: response.data?.student,
              });

              if (onScanSuccess) {
                onScanSuccess(response.data);
              }

              // Stop scanning after successful scan
              setTimeout(() => stopScanning(), 1500);
            } else {
              console.warn('⚠️ Response data missing success flag');
              setScanResult({
                type: 'error',
                message: response.data?.error || 'Failed to mark attendance',
              });
            }
          } catch (err) {
            console.error('❌ Scan processing error:', err);
            console.error('Error config:', err.config);
            console.error('Error response:', err.response);

            // Handle different error scenarios
            let errorMsg = 'Failed to mark attendance';

            if (err.response?.status === 409) {
              errorMsg = err.response?.data?.error || '⚠️ Already marked for this student. Wait 2 minutes before rescanning.';
            } else if (err.response?.data?.error) {
              errorMsg = err.response.data.error;
            } else if (err.response?.data?.message) {
              errorMsg = err.response.data.message;
            } else if (err.message) {
              errorMsg = err.message;
            }

            console.error('Final error message:', errorMsg);

            setScanResult({
              type: 'error',
              message: errorMsg,
            });
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
        setPermissionDenied(true);
      } else if (err.name === 'NotFoundError') {
        setError('❌ No camera found on this device.');
      } else if (err.message?.includes('permission') || err.message?.includes('Permission')) {
        setError('❌ Camera permission required. Please check your browser settings.');
        setPermissionDenied(true);
      } else if (err.message?.includes('NotReadable')) {
        setError('❌ Camera is in use by another application. Please close other apps using the camera.');
      } else if (err.message?.includes('HTTPS')) {
        setError('❌ HTTPS is required for camera access. Your connection may not be secure.');
      } else {
        setError(`❌ Failed to start camera: ${errorMsg}`);
      }

      setScanning(false);
      qrInstanceRef.current = null;
    }
  };

  const handleStartScanning = () => {
    setPermissionDenied(false);
    setError('');
    setScanning(true);
  };

  const switchCamera = async () => {
    if (availableCameras.length < 2) return;
    
    setSwitchingCamera(true);
    try {
      // Stop current scanner
      if (qrInstanceRef.current) {
        try {
          await qrInstanceRef.current.stop();
          qrInstanceRef.current = null;
        } catch (e) {
          console.debug('Error stopping scanner:', e);
        }
      }

      // Switch to next camera
      const nextIndex = (selectedCameraIndex + 1) % availableCameras.length;
      setSelectedCameraIndex(nextIndex);

      // Restart scanner with the new index
      setTimeout(() => {
        initializeScanner(nextIndex);
        setSwitchingCamera(false);
      }, 300);
    } catch (err) {
      console.error('Error switching camera:', err);
      setSwitchingCamera(false);
      setError('Failed to switch camera. Please try again.');
    }
  };

  const stopScanning = () => {
    setScanning(false);
  };

  return (
    <div className="card" ref={scannerContainerRef}>
      <div className="card-header">
        <h3 className="card-title">📱 Scan Student QR Code</h3>
      </div>

      {error && (
        <div className="alert alert-error" style={{ margin: '15px' }}>
          {error}
          {permissionDenied && (
            <p style={{ marginTop: '10px', fontSize: '12px' }}>
              💡 <strong>Tip:</strong> Refresh the page and try again. Make sure to click "Allow" when your browser prompts for camera access.
            </p>
          )}
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
            onClick={handleStartScanning}
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
              id="qr-scanner-div"
              style={{ 
                width: '100%', 
                maxWidth: '400px', 
                margin: '20px auto',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid #007bff',
                backgroundColor: '#000',
                aspectRatio: '1/1',
                minHeight: '400px',
              }} 
            />
          </div>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ marginBottom: '15px', fontSize: '13px', color: '#666' }}>
              📷 Camera: {selectedCameraIndex + 1} / {availableCameras.length}
              {availableCameras.length > 1 && (
                <p style={{ marginTop: '5px', marginBottom: 0 }}>
                  (Front/Back)
                </p>
              )}
            </div>
            <button
              className="btn btn-danger"
              onClick={stopScanning}
              disabled={isLoading || switchingCamera}
              style={{ minWidth: '120px', marginRight: '10px' }}
            >
              ⛔ Stop
            </button>
            {availableCameras.length > 1 && (
              <button
                className="btn btn-primary"
                onClick={switchCamera}
                disabled={isLoading || switchingCamera}
                style={{ minWidth: '120px' }}
              >
                {switchingCamera ? '🔄 Switching...' : '📷 Switch Camera'}
              </button>
            )}
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
