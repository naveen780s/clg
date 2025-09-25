import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import passService from '../services/passService';
import { dateUtils } from '../services/utils';
// import Loader from '../components/common/Loader';

const QRScanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [scanning, setScanning] = useState(false);
  const [passData, setPassData] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState('prompt');
  const [manualPassId, setManualPassId] = useState(searchParams.get('pass') || '');

  useEffect(() => {
    // Check if user has permission to scan QR codes
    if (user.role !== 'security' && user.role !== 'hod') {
      navigate('/dashboard');
      return;
    }

    // Initialize camera when component mounts
    initializeCamera();
    
    return () => {
      stopCamera();
    };
  }, [user.role, navigate]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraPermission('granted');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraPermission('denied');
      setError('Camera access denied. Please enable camera permissions to scan QR codes.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const startScanning = () => {
    if (cameraPermission !== 'granted') {
      initializeCamera();
      return;
    }
    
    setScanning(true);
    setError('');
    scanQRCode();
  };

  const stopScanning = () => {
    setScanning(false);
  };

  const scanQRCode = () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simulate QR code detection (in real app, use a QR code library like jsQR)
    // For demo purposes, we'll use manual pass ID input
    
    if (scanning) {
      setTimeout(scanQRCode, 100); // Scan every 100ms
    }
  };

  const handleManualLookup = async () => {
    if (!manualPassId) {
      setError('Please enter a pass ID');
      return;
    }

    try {
      setError('');
      const pass = await passService.getPass(manualPassId);
      handlePassScanned(pass);
    } catch (err) {
      setError('Pass not found or invalid pass ID');
    }
  };

  const handlePassScanned = (pass) => {
    setPassData(pass);
    setScanning(false);
    
    // Validate pass status
    if (pass.status !== 'approved' && pass.status !== 'active') {
      setScanResult({
        type: 'error',
        message: `Pass is ${pass.status}. Only approved passes can be processed.`,
        pass
      });
      return;
    }

    // Check if pass is expired
    if (new Date(pass.expectedReturnTime) < new Date() && pass.status === 'active') {
      setScanResult({
        type: 'warning',
        message: 'Pass is overdue for return. Please proceed with check-in.',
        pass
      });
      return;
    }

    // Check if it's checkout or checkin time
    if (pass.status === 'approved') {
      setScanResult({
        type: 'checkout',
        message: 'Ready for checkout. Verify student identity and proceed.',
        pass
      });
    } else if (pass.status === 'active') {
      setScanResult({
        type: 'checkin',
        message: 'Student returning. Proceed with check-in.',
        pass
      });
    }
  };

  const handleCheckout = async () => {
    try {
      await passService.checkOut(passData._id, {
        securityOfficer: user._id,
        timestamp: new Date().toISOString(),
        notes: 'Checked out via QR scanner'
      });
      
      setScanResult({
        type: 'success',
        message: 'Student successfully checked out!',
        pass: { ...passData, status: 'active' }
      });
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        resetScanner();
      }, 3000);
      
    } catch (error) {
      setError('Failed to process checkout: ' + error.message);
    }
  };

  const handleCheckin = async () => {
    try {
      await passService.checkIn(passData._id, {
        securityOfficer: user._id,
        timestamp: new Date().toISOString(),
        notes: 'Checked in via QR scanner'
      });
      
      setScanResult({
        type: 'success',
        message: 'Student successfully checked in!',
        pass: { ...passData, status: 'completed' }
      });
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        resetScanner();
      }, 3000);
      
    } catch (error) {
      setError('Failed to process check-in: ' + error.message);
    }
  };

  const resetScanner = () => {
    setPassData(null);
    setScanResult(null);
    setError('');
    setManualPassId('');
  };

  if (user.role !== 'security' && user.role !== 'hod') {
    return (
      <div className="error-page">
        <h2>Access Denied</h2>
        <p>You don't have permission to access the QR scanner.</p>
      </div>
    );
  }

  return (
    <div className="qr-scanner-page">
      <div className="page-container">
        {/* Header */}
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="header-content">
            <h1 className="page-title">
              QR Code Scanner 📱
            </h1>
            <p className="page-subtitle">
              Scan student gate passes for checkout and check-in
            </p>
          </div>
          
          <div className="header-actions">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-outline"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>

        <div className="scanner-content">
          {/* Camera Section */}
          <motion.div 
            className="scanner-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="camera-container">
              {cameraPermission === 'denied' ? (
                <div className="camera-error">
                  <div className="error-icon">📷</div>
                  <h3>Camera Access Required</h3>
                  <p>Please enable camera permissions to scan QR codes</p>
                  <button
                    onClick={initializeCamera}
                    className="btn btn-primary"
                  >
                    Enable Camera
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="camera-video"
                  />
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />
                  
                  <div className="scanner-overlay">
                    <div className="scanner-frame">
                      <div className="frame-corner tl"></div>
                      <div className="frame-corner tr"></div>
                      <div className="frame-corner bl"></div>
                      <div className="frame-corner br"></div>
                      
                      {scanning && (
                        <div className="scanning-line"></div>
                      )}
                    </div>
                    
                    <div className="scanner-instructions">
                      <p>Position QR code within the frame</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="scanner-controls">
              {!scanning ? (
                <button
                  onClick={startScanning}
                  disabled={cameraPermission !== 'granted'}
                  className="btn btn-success btn-large"
                >
                  📱 Start Scanning
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="btn btn-danger btn-large"
                >
                  ⏹️ Stop Scanning
                </button>
              )}
            </div>
          </motion.div>

          {/* Manual Input Section */}
          <motion.div 
            className="manual-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="manual-input">
              <h3>Manual Pass Lookup</h3>
              <p>Enter pass ID if QR scanning is not available</p>
              
              <div className="input-group">
                <input
                  type="text"
                  value={manualPassId}
                  onChange={(e) => setManualPassId(e.target.value)}
                  placeholder="Enter Pass ID (e.g., 507f1f77bcf86cd799439011)"
                  className="form-input"
                />
                <button
                  onClick={handleManualLookup}
                  className="btn btn-primary"
                >
                  Lookup Pass
                </button>
              </div>
            </div>
          </motion.div>

          {/* Error Display */}
          {error && (
            <motion.div 
              className="error-alert"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="alert alert-danger">
                <div className="alert-icon">⚠️</div>
                <div className="alert-content">
                  <strong>Error:</strong> {error}
                </div>
                <button
                  onClick={() => setError('')}
                  className="alert-close"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}

          {/* Scan Result */}
          {scanResult && passData && (
            <motion.div 
              className="scan-result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className={`result-card ${scanResult.type}`}>
                <div className="result-header">
                  <div className="result-icon">
                    {scanResult.type === 'success' && '✅'}
                    {scanResult.type === 'error' && '❌'}
                    {scanResult.type === 'warning' && '⚠️'}
                    {scanResult.type === 'checkout' && '🚪'}
                    {scanResult.type === 'checkin' && '🏠'}
                  </div>
                  <div className="result-message">
                    <h3>{scanResult.message}</h3>
                  </div>
                </div>

                <div className="pass-info">
                  <div className="student-section">
                    <div className="student-avatar">
                      {passData.student?.name?.charAt(0)}
                    </div>
                    <div className="student-details">
                      <h4>{passData.student?.name}</h4>
                      <p>{passData.student?.regNumber} • {passData.student?.year} Year</p>
                      <p>🏛️ {passData.student?.department}</p>
                    </div>
                  </div>

                  <div className="pass-details">
                    <div className="detail-row">
                      <span className="detail-label">Reason:</span>
                      <span className="detail-value">{passData.reason}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Destination:</span>
                      <span className="detail-value">📍 {passData.destination}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Exit Time:</span>
                      <span className="detail-value">
                        {dateUtils.formatDateTime(passData.exitTime)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Return Time:</span>
                      <span className="detail-value">
                        {dateUtils.formatDateTime(passData.expectedReturnTime)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span className={`detail-value status-${passData.status}`}>
                        {passData.status.charAt(0).toUpperCase() + passData.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="result-actions">
                  {scanResult.type === 'checkout' && (
                    <button
                      onClick={handleCheckout}
                      className="btn btn-success btn-large"
                    >
                      ✅ Confirm Checkout
                    </button>
                  )}
                  
                  {scanResult.type === 'checkin' && (
                    <button
                      onClick={handleCheckin}
                      className="btn btn-primary btn-large"
                    >
                      🏠 Confirm Check-in
                    </button>
                  )}
                  
                  {scanResult.type === 'warning' && (
                    <button
                      onClick={handleCheckin}
                      className="btn btn-warning btn-large"
                    >
                      ⚠️ Process Overdue Return
                    </button>
                  )}
                  
                  <button
                    onClick={resetScanner}
                    className="btn btn-outline"
                  >
                    Scan Another Pass
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Instructions */}
          <motion.div 
            className="instructions-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="instructions-card">
              <h3>📋 Scanner Instructions</h3>
              
              <div className="instruction-steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h5>Position QR Code</h5>
                    <p>Hold the student's phone steady within the scanning frame</p>
                  </div>
                </div>
                
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h5>Verify Identity</h5>
                    <p>Check student ID card matches the scanned pass information</p>
                  </div>
                </div>
                
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h5>Process Action</h5>
                    <p>Confirm checkout for exit or check-in for return</p>
                  </div>
                </div>
              </div>
              
              <div className="security-tips">
                <h5>🔒 Security Guidelines</h5>
                <ul>
                  <li>Always verify student identity with ID card</li>
                  <li>Check pass status is approved before checkout</li>
                  <li>Record any unusual circumstances in notes</li>
                  <li>Contact HOD for suspicious or expired passes</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;