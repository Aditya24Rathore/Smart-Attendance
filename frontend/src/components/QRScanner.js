import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

function QRScanner({ onScan, isActive = true }) {
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const startScanner = useCallback(async () => {
    if (html5QrRef.current || !scannerRef.current || !isActive) return;

    try {
      const scanner = new Html5Qrcode('qr-reader');
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {} // ignore failures
      );
      setIsScanning(true);
      setError('');
    } catch (err) {
      setError('Unable to access camera. Please grant camera permission.');
      setIsScanning(false);
    }
  }, [onScan, isActive]);

  const stopScanner = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch {}
      html5QrRef.current = null;
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [isActive, startScanner, stopScanner]);

  return (
    <div className="scanner-container">
      <div className="scanner-video">
        <div id="qr-reader" ref={scannerRef} style={{ width: '100%' }} />
      </div>
      {error && (
        <div className="alert alert-error mt-8">
          {error}
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }}
            onClick={startScanner}>
            Retry
          </button>
        </div>
      )}
      {isScanning && (
        <p className="text-center text-sm text-muted mt-8">
          📸 Point camera at student's QR code
        </p>
      )}
    </div>
  );
}

export default QRScanner;
