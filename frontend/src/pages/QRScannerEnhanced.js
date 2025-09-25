import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'react-hot-toast';
import passService from '../services/passService';
import { useSocket } from '../contexts/SocketContext';

const QRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentScans, setRecentScans] = useState([]);
  const [scanStats, setScanStats] = useState({
    totalScans: 0,
    successfulScans: 0,
    failedScans: 0
  });
  const html5QrcodeScannerRef = useRef(null);
  const { emitEvent, isConnected } = useSocket();

  useEffect(() => {
    // Load recent scans and stats from localStorage
    const saved = localStorage.getItem('recentScans');
    const savedStats = localStorage.getItem('scanStats');
    
    if (saved) {
      setRecentScans(JSON.parse(saved));
    }
    if (savedStats) {
      setScanStats(JSON.parse(savedStats));
    }

    return () => {
      // Cleanup scanner on unmount
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      // Check camera permissions
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } else {
        throw new Error('Camera not supported on this device');
      }

      if (html5QrcodeScannerRef.current) {
        await html5QrcodeScannerRef.current.clear();
      }

      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
          rememberLastUsedCamera: true,
          supportedScanTypes: []
        },
        false
      );

      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      html5QrcodeScannerRef.current = html5QrcodeScanner;
      setIsScanning(true);
      setError('');
      toast.success('Camera scanner started successfully');
    } catch (err) {
      setError('Failed to start camera: ' + err.message);
      toast.error('Camera access denied or not available');
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeScannerRef.current) {
      try {
        await html5QrcodeScannerRef.current.clear();
        setIsScanning(false);
        toast.success('Scanner stopped');
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const onScanSuccess = async (decodedText, decodedResult) => {
    console.log('QR Code scanned:', decodedText);
    setScanResult(null);
    await processQRCode(decodedText);
  };

  const onScanFailure = (error) => {
    // Handle scan failure silently (common with moving camera)
    if (error.includes('NotFoundException') === false) {
      console.log('QR scan error:', error);
    }
  };

  const processQRCode = async (qrData) => {
    setIsLoading(true);
    setError('');

    try {
      // Show loading toast
      const loadingToast = toast.loading('Verifying QR code...');

      // Try to verify the QR code with the backend
      const response = await passService.verifyQRCode(qrData, 'exit');
      
      toast.dismiss(loadingToast);

      if (response.success) {
        const scanRecord = {
          id: Date.now(),
          qrData: qrData,
          passId: response.data.gatePass.passId,
          studentName: response.data.gatePass.student_id.name,
          studentId: response.data.gatePass.student_id.student_id,
          destination: response.data.gatePass.destination,
          status: response.data.gatePass.status,
          returnTime: response.data.gatePass.return_time,
          timestamp: new Date().toISOString(),
          action: 'exit',
          success: true
        };

        // Update stats
        const newStats = {
          totalScans: scanStats.totalScans + 1,
          successfulScans: scanStats.successfulScans + 1,
          failedScans: scanStats.failedScans
        };
        setScanStats(newStats);
        localStorage.setItem('scanStats', JSON.stringify(newStats));

        // Add to recent scans
        const updatedScans = [scanRecord, ...recentScans.slice(0, 19)];
        setRecentScans(updatedScans);
        localStorage.setItem('recentScans', JSON.stringify(updatedScans));

        // Emit socket event for real-time updates
        if (isConnected) {
          emitEvent('qr_scan_success', scanRecord);
        }

        setScanResult({
          success: true,
          data: response.data.gatePass,
          message: '✅ QR Code verified successfully! Student can exit.'
        });

        toast.success(`${scanRecord.studentName} - Exit approved`, {
          duration: 4000,
          icon: '🚪'
        });

      } else {
        throw new Error(response.message || 'Invalid QR Code');
      }
    } catch (err) {
      // Update failed stats
      const newStats = {
        totalScans: scanStats.totalScans + 1,
        successfulScans: scanStats.successfulScans,
        failedScans: scanStats.failedScans + 1
      };
      setScanStats(newStats);
      localStorage.setItem('scanStats', JSON.stringify(newStats));

      const errorMessage = err.message || 'QR Code verification failed';
      setError(errorMessage);
      setScanResult({
        success: false,
        message: errorMessage
      });

      toast.error(errorMessage, {
        duration: 5000,
        icon: '❌'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEntry = async () => {
    if (!manualCode.trim()) {
      setError('Please enter a valid pass ID or QR code');
      toast.error('Please enter a valid code');
      return;
    }
    
    await processQRCode(manualCode.trim());
    setManualCode('');
  };

  const clearResult = () => {
    setScanResult(null);
    setError('');
  };

  const clearRecentScans = () => {
    setRecentScans([]);
    localStorage.removeItem('recentScans');
    toast.success('Recent scans cleared');
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'approved': 'var(--success)',
      'used': 'var(--warning)',
      'expired': 'var(--error)',
      'rejected': 'var(--error)',
      'overdue': 'var(--error)'
    };
    return colors[status] || 'var(--ink-light)';
  };

  const getSuccessRate = () => {
    if (scanStats.totalScans === 0) return 0;
    return Math.round((scanStats.successfulScans / scanStats.totalScans) * 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="qr-scanner-container"
    >
      <div className="scanner-header">
        <h2>🔍 QR Code Scanner</h2>
        <p>Scan student gate passes for entry/exit verification</p>
        
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-number">{scanStats.totalScans}</div>
          <div className="stat-label">Total Scans</div>
        </div>
        <div className="stat-card success">
          <div className="stat-number">{scanStats.successfulScans}</div>
          <div className="stat-label">Successful</div>
        </div>
        <div className="stat-card error">
          <div className="stat-number">{scanStats.failedScans}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{getSuccessRate()}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
      </div>

      <div className="scanner-main">
        {/* Scanner Section */}
        <div className="scanner-section">
          <div className="scanner-controls">
            {!isScanning ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="primary-button"
                onClick={startScanner}
              >
                📷 Start Camera Scanner
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={ { scale: 0.95 }}
                className="secondary-button"
                onClick={stopScanner}
              >
                ⏹️ Stop Scanner
              </motion.button>
            )}
          </div>

          {/* QR Scanner Container */}
          <div id="qr-reader" className="qr-reader-container">
            {!isScanning && (
              <div className="scanner-placeholder">
                <div className="scanner-icon">📱</div>
                <p>Click "Start Camera Scanner" to begin</p>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Verifying QR Code...</p>
            </div>
          )}

          {/* Manual Entry */}
          <div className="manual-entry">
            <h4>📝 Manual Entry</h4>
            <div className="input-group">
              <input
                type="text"
                placeholder="Enter Pass ID or QR Code manually"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="manual-input"
                onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
              />
              <button
                onClick={handleManualEntry}
                className="primary-button"
                disabled={isLoading}
              >
                {isLoading ? '⏳' : '✓'} Verify
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="results-section">
          {error && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="error-message"
            >
              ❌ {error}
              <button onClick={clearResult} className="clear-btn">×</button>
            </motion.div>
          )}

          {scanResult && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`scan-result ${scanResult.success ? 'success' : 'error'}`}
            >
              <h4>{scanResult.success ? '✅ Scan Successful' : '❌ Scan Failed'}</h4>
              <p>{scanResult.message}</p>
              
              {scanResult.success && scanResult.data && (
                <div className="pass-details">
                  <div className="detail-row">
                    <span>Student:</span>
                    <strong>{scanResult.data.student.name}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Student ID:</span>
                    <strong>{scanResult.data.student.student_id}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Pass ID:</span>
                    <strong>{scanResult.data.passId}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Status:</span>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(scanResult.data.status) }}
                    >
                      {scanResult.data.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Destination:</span>
                    <strong>{scanResult.data.destination}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Return Time:</span>
                    <strong>{formatDateTime(scanResult.data.return_time)}</strong>
                  </div>
                </div>
              )}
              
              <button onClick={clearResult} className="secondary-button">
                ✓ Continue Scanning
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <div className="recent-scans">
          <div className="section-header">
            <h3>📋 Recent Scans</h3>
            <button onClick={clearRecentScans} className="clear-all-btn">
              🗑️ Clear All
            </button>
          </div>
          <div className="scans-list">
            {recentScans.map((scan) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`scan-item ${scan.success ? 'success' : 'failed'}`}
              >
                <div className="scan-info">
                  <div className="scan-header">
                    <strong>{scan.studentName || 'Unknown Student'}</strong>
                    <span className="scan-time">
                      {formatDateTime(scan.timestamp)}
                    </span>
                  </div>
                  <div className="scan-details">
                    <div className="scan-meta">
                      <span>ID: {scan.studentId}</span>
                      <span>Pass: {scan.passId}</span>
                    </div>
                    <span 
                      className="status-badge small"
                      style={{ backgroundColor: getStatusColor(scan.status) }}
                    >
                      {scan.status}
                    </span>
                  </div>
                  {scan.destination && (
                    <div className="scan-destination">
                      📍 {scan.destination}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .qr-scanner-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .scanner-header {
          text-align: center;
          margin-bottom: 2rem;
          position: relative;
        }

        .scanner-header h2 {
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .connection-status {
          position: absolute;
          top: 0;
          right: 0;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .connection-status.connected {
          background: var(--success-light);
          color: var(--success-dark);
        }

        .connection-status.disconnected {
          background: var(--error-light);
          color: var(--error-dark);
        }

        .stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: var(--background);
          border: 2px solid var(--primary);
          border-radius: 15px;
          padding: 1.5rem;
          text-align: center;
        }

        .stat-card.success {
          border-color: var(--success);
        }

        .stat-card.error {
          border-color: var(--error);
        }

        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .stat-card.success .stat-number {
          color: var(--success);
        }

        .stat-card.error .stat-number {
          color: var(--error);
        }

        .stat-label {
          font-size: 0.9rem;
          color: var(--ink-light);
        }

        .scanner-main {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .scanner-section {
          background: var(--background);
          border: 2px solid var(--primary);
          border-radius: 15px;
          padding: 1.5rem;
          position: relative;
        }

        .scanner-controls {
          text-align: center;
          margin-bottom: 1rem;
        }

        .qr-reader-container {
          border: 2px dashed var(--primary);
          border-radius: 10px;
          min-height: 350px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1rem 0;
          background: var(--secondary-light);
          position: relative;
        }

        .scanner-placeholder {
          text-align: center;
          color: var(--ink-light);
        }

        .scanner-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--primary-light);
          border-top: 4px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .manual-entry {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }

        .manual-entry h4 {
          margin-bottom: 0.5rem;
          color: var(--ink-black);
        }

        .input-group {
          display: flex;
          gap: 0.5rem;
        }

        .manual-input {
          flex: 1;
          padding: 0.75rem;
          border: 2px solid var(--border);
          border-radius: 8px;
          font-family: var(--font-family);
        }

        .results-section {
          background: var(--background);
          border: 2px solid var(--secondary);
          border-radius: 15px;
          padding: 1.5rem;
        }

        .error-message {
          background: var(--error-light);
          border: 2px solid var(--error);
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1rem;
          position: relative;
        }

        .scan-result {
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .scan-result.success {
          background: var(--success-light);
          border: 2px solid var(--success);
        }

        .scan-result.error {
          background: var(--error-light);
          border: 2px solid var(--error);
        }

        .pass-details {
          margin: 1rem 0;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0.5rem 0;
          padding: 0.25rem 0;
          border-bottom: 1px solid var(--border);
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 15px;
          color: white;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .status-badge.small {
          padding: 0.2rem 0.5rem;
          font-size: 0.7rem;
        }

        .recent-scans {
          background: var(--background);
          border: 2px solid var(--accent);
          border-radius: 15px;
          padding: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-header h3 {
          color: var(--accent);
          margin: 0;
        }

        .clear-all-btn {
          background: var(--error-light);
          border: 1px solid var(--error);
          color: var(--error-dark);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .scans-list {
          display: grid;
          gap: 0.75rem;
          max-height: 400px;
          overflow-y: auto;
        }

        .scan-item {
          border-radius: 8px;
          padding: 1rem;
          border-left: 4px solid var(--success);
        }

        .scan-item.success {
          background: var(--success-light);
          border-left-color: var(--success);
        }

        .scan-item.failed {
          background: var(--error-light);
          border-left-color: var(--error);
        }

        .scan-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .scan-time {
          font-size: 0.8rem;
          color: var(--ink-light);
        }

        .scan-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .scan-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.9rem;
          color: var(--ink-dark);
        }

        .scan-destination {
          font-size: 0.8rem;
          color: var(--ink-light);
          margin-top: 0.25rem;
        }

        .clear-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: var(--error);
        }

        @media (max-width: 768px) {
          .scanner-main {
            grid-template-columns: 1fr;
          }
          
          .qr-scanner-container {
            padding: 1rem;
          }

          .stats-section {
            grid-template-columns: repeat(2, 1fr);
          }

          .connection-status {
            position: static;
            display: inline-block;
            margin-top: 1rem;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default QRScanner;