import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import passService from '../../services/passService';
import { dateUtils } from '../../services/utils';
import Loader from '../../components/common/Loader';

const QRCodeDisplay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [qrData, setQrData] = useState(null);
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQRCode = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Debug: Check if token exists
      const token = localStorage.getItem('token');
      console.log('Auth token exists:', !!token);
      
      // Fetch both QR code and pass details
      const [qrResponse, passResponse] = await Promise.all([
        passService.getPassQRCode(id),
        passService.getPassById(id)
      ]);
      
      setQrData(qrResponse);
      setPass(passResponse.gatePass || passResponse);
    } catch (error) {
      console.error('Error fetching QR code:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.message || error.message || 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      fetchQRCode();
    }
  }, [fetchQRCode, user, authLoading, navigate]);

  const downloadQR = () => {
    if (qrData?.qrCode) {
      const link = document.createElement('a');
      link.href = qrData.qrCode;
      link.download = `gate-pass-${qrData.passId}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const shareQR = async () => {
    if (navigator.share && qrData?.qrCode) {
      try {
        // Convert data URL to blob
        const response = await fetch(qrData.qrCode);
        const blob = await response.blob();
        const file = new File([blob], `gate-pass-${qrData.passId}-qr.png`, { type: 'image/png' });
        
        await navigator.share({
          title: `Gate Pass QR Code - ${qrData.passId}`,
          text: `QR Code for Gate Pass ${qrData.passId}`,
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing QR code:', error);
        downloadQR(); // Fallback to download
      }
    } else {
      downloadQR(); // Fallback to download
    }
  };

  if (authLoading) {
    return <Loader message="Checking authentication..." />;
  }

  if (!user) {
    return <Loader message="Redirecting to login..." />;
  }

  if (loading) {
    return <Loader message="Loading QR code..." />;
  }

  if (error) {
    return (
      <div className="qr-error-page">
        <div className="page-container">
          <motion.div 
            className="error-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="error-icon">❌</div>
            <h2>QR Code Not Available</h2>
            <p>{error}</p>
            <div className="error-actions">
              <Link to={`/passes/${id}`} className="btn btn-primary">
                Back to Pass Details
              </Link>
              <Link to="/passes" className="btn btn-outline">
                All Passes
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!qrData || !pass) {
    return (
      <div className="qr-error-page">
        <div className="page-container">
          <div className="error-content">
            <h2>QR Code Not Found</h2>
            <p>The QR code for this pass is not available.</p>
            <Link to="/passes" className="btn btn-primary">Back to Passes</Link>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = qrData.expiresAt && new Date() > new Date(qrData.expiresAt);
  const isExpiringSoon = qrData.expiresAt && 
    new Date(qrData.expiresAt) - new Date() < 30 * 60 * 1000; // 30 minutes

  return (
    <div className="qr-display-page">
      <div className="page-container">
        {/* Header */}
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="header-content">
            <div className="breadcrumb">
              <Link to="/passes">Passes</Link> / 
              <Link to={`/passes/${id}`}>Pass Details</Link> / 
              QR Code
            </div>
            <h1 className="page-title">
              Gate Pass QR Code 📱
            </h1>
            <div className="pass-info-header">
              <span className="pass-id">Pass ID: {qrData.passId}</span>
              {isExpired && (
                <span className="status-badge danger">
                  ⏰ Expired
                </span>
              )}
              {!isExpired && isExpiringSoon && (
                <span className="status-badge warning">
                  ⚠️ Expiring Soon
                </span>
              )}
              {!isExpired && !isExpiringSoon && (
                <span className="status-badge success">
                  ✅ Valid
                </span>
              )}
            </div>
          </div>
          
          <div className="header-actions">
            <button onClick={shareQR} className="btn btn-success">
              <span>Share QR</span>
              <div className="btn-icon">📤</div>
            </button>
            <button onClick={downloadQR} className="btn btn-primary">
              <span>Download</span>
              <div className="btn-icon">⬇️</div>
            </button>
            <Link to={`/passes/${id}`} className="btn btn-outline">
              Back to Details
            </Link>
          </div>
        </motion.div>

        <div className="qr-display-content">
          {/* Main QR Code Display */}
          <motion.div 
            className="qr-main-section"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="qr-container">
              <div className="qr-header">
                <h2>QR Code</h2>
                <p>Show this code to security personnel</p>
              </div>
              
              <div className={`qr-code-wrapper ${isExpired ? 'expired' : ''}`}>
                {isExpired && (
                  <div className="expired-overlay">
                    <div className="expired-message">
                      <span className="expired-icon">⏰</span>
                      <span>EXPIRED</span>
                    </div>
                  </div>
                )}
                <img 
                  src={qrData.qrCode} 
                  alt={`QR Code for Pass ${qrData.passId}`}
                  className="qr-code-image"
                />
              </div>

              <div className="qr-info">
                <div className="qr-code-text">
                  <strong>{qrData.passId}</strong>
                </div>
                {qrData.expiresAt && (
                  <div className="expiry-info">
                    <span className="expiry-label">Valid until:</span>
                    <span className={`expiry-time ${isExpired ? 'expired' : isExpiringSoon ? 'warning' : 'valid'}`}>
                      {dateUtils.formatDateTime(qrData.expiresAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Pass Summary */}
          <motion.div 
            className="qr-pass-summary"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3>Pass Summary</h3>
            
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Student:</div>
                <div className="summary-value">
                  {pass.student_id?.name || 'Unknown Student'}
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-label">Destination:</div>
                <div className="summary-value">
                  📍 {pass.destination}
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-label">Departure:</div>
                <div className="summary-value">
                  🕐 {dateUtils.formatDateTime(pass.departure_time)}
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-label">Expected Return:</div>
                <div className="summary-value">
                  🕐 {dateUtils.formatDateTime(pass.return_time)}
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-label">Category:</div>
                <div className="summary-value">
                  🏷️ {pass.category?.charAt(0).toUpperCase() + pass.category?.slice(1)}
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-label">Priority:</div>
                <div className="summary-value">
                  <span className={`priority-badge ${pass.priority}`}>
                    {pass.priority === 'high' ? '🔴' : pass.priority === 'medium' ? '🟡' : '🟢'} 
                    {pass.priority?.charAt(0).toUpperCase() + pass.priority?.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Instructions */}
          <motion.div 
            className="qr-instructions"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3>Instructions</h3>
            
            <div className="instructions-list">
              <div className="instruction-item">
                <div className="instruction-icon">1️⃣</div>
                <div className="instruction-content">
                  <strong>Show to Security:</strong>
                  <p>Present this QR code to the security personnel at the gate</p>
                </div>
              </div>
              
              <div className="instruction-item">
                <div className="instruction-icon">2️⃣</div>
                <div className="instruction-content">
                  <strong>Keep Phone Charged:</strong>
                  <p>Ensure your phone has enough battery to display the QR code</p>
                </div>
              </div>
              
              <div className="instruction-item">
                <div className="instruction-icon">3️⃣</div>
                <div className="instruction-content">
                  <strong>Return on Time:</strong>
                  <p>Make sure to return before the expected return time</p>
                </div>
              </div>
              
              <div className="instruction-item">
                <div className="instruction-icon">⚠️</div>
                <div className="instruction-content">
                  <strong>Security Code:</strong>
                  <p>Security may ask for the pass ID: <code>{qrData.passId}</code></p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            className="qr-actions"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="action-buttons">
              <button onClick={shareQR} className="btn btn-success btn-large">
                📤 Share QR Code
              </button>
              
              <button onClick={downloadQR} className="btn btn-primary btn-large">
                ⬇️ Download QR Code
              </button>
              
              <Link to={`/passes/${id}/pdf`} className="btn btn-secondary btn-large">
                📄 Download PDF
              </Link>
            </div>

            <div className="navigation-links">
              <Link to={`/passes/${id}`} className="nav-link">
                ← Back to Pass Details
              </Link>
              
              <Link to="/passes" className="nav-link">
                📋 All Passes
              </Link>
              
              <Link to="/dashboard" className="nav-link">
                🏠 Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;