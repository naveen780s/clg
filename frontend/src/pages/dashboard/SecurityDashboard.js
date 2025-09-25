import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import passService from '../../services/passService';
import { dateUtils } from '../../services/utils';
import Loader from '../../components/common/Loader';

const SecurityDashboard = () => {
  const { user } = useAuth();
  const { notifications } = useSocket();
  
  const [dashboardData, setDashboardData] = useState({
    activePasses: [],
    todayCheckouts: [],
    pendingCheckins: [],
    statistics: {
      totalCheckouts: 0,
      pendingReturns: 0,
      overdueReturns: 0,
      successfulReturns: 0,
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch active passes (approved and ready for checkout)
      const activePasses = await passService.getActivePasses();
      
      // Get today's checkouts
      const todayCheckouts = await passService.getUserPasses({
        status: 'active',
        date: new Date().toISOString().split('T')[0]
      });
      
      // Get statistics
      const statistics = await passService.getPassStatistics({
        role: 'security',
        timeframe: 'today'
      });
      
      setDashboardData({
        activePasses,
        todayCheckouts,
        statistics,
      });
    } catch (error) {
      console.error('Error fetching security dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckout = async (passId) => {
    try {
      await passService.checkOut(passId, {
        securityOfficer: user._id,
        timestamp: new Date().toISOString(),
        notes: 'Quick checkout from dashboard'
      });
      
      fetchDashboardData();
    } catch (error) {
      console.error('Error checking out pass:', error);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleQuickCheckin = async (passId) => {
    try {
      await passService.checkIn(passId, {
        securityOfficer: user._id,
        timestamp: new Date().toISOString(),
        notes: 'Quick check-in from dashboard'
      });
      
      fetchDashboardData();
    } catch (error) {
      console.error('Error checking in pass:', error);
    }
  };

  if (loading) {
    return <Loader message="Loading security dashboard..." />;
  }

  return (
    <div className="dashboard security-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <motion.div 
          className="dashboard-header"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="header-content">
            <h1 className="dashboard-title">
              Security Control Panel 🛡️
            </h1>
            <p className="dashboard-subtitle">
              Officer {user?.name} • Main Gate
            </p>
          </div>
          
          <div className="header-actions">
            <button
              onClick={() => setScannerActive(!scannerActive)}
              className={`btn ${scannerActive ? 'btn-success' : 'btn-primary'}`}
            >
              <span>{scannerActive ? 'Scanner Active' : 'Start Scanner'}</span>
              <div className="btn-icon">📱</div>
            </button>
            <Link to="/scanner" className="btn btn-outline">
              <span>QR Scanner</span>
            </Link>
          </div>
        </motion.div>

        {/* Real-time Stats */}
        <motion.div 
          className="dashboard-stats security-stats"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="stats-grid">
            <div className="stat-card checkouts">
              <div className="stat-icon">🚪</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.totalCheckouts}</h3>
                <p>Today's Checkouts</p>
                <div className="stat-time">
                  Last: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.pendingReturns}</h3>
                <p>Pending Returns</p>
                <div className="stat-status warning">Awaiting Check-in</div>
              </div>
            </div>
            
            <div className="stat-card overdue">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.overdueReturns}</h3>
                <p>Overdue Returns</p>
                <div className="stat-status danger">Action Required</div>
              </div>
            </div>
            
            <div className="stat-card completed">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.successfulReturns}</h3>
                <p>Completed Today</p>
                <div className="stat-status success">On Time</div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="dashboard-content">
          <div className="dashboard-main">
            {/* Active Scanner Status */}
            {scannerActive && (
              <motion.div 
                className="scanner-status active"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="scanner-indicator">
                  <div className="pulse-dot"></div>
                  <span>QR Scanner Active - Ready to scan passes</span>
                </div>
              </motion.div>
            )}

            {/* Ready for Checkout */}
            <motion.div 
              className="dashboard-section priority"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="section-header">
                <h2 className="section-title">📋 Ready for Checkout</h2>
                <span className="live-badge">
                  <div className="live-dot"></div>
                  LIVE
                </span>
              </div>
              
              <div className="passes-list security-list">
                {dashboardData.activePasses.length > 0 ? (
                  dashboardData.activePasses.map((pass, index) => (
                    <motion.div 
                      key={pass._id}
                      className="pass-card security-card"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <div className="pass-content">
                        <div className="student-photo">
                          <div className="photo-placeholder">
                            {pass.student?.name?.charAt(0)}
                          </div>
                        </div>
                        <div className="student-details">
                          <h4 className="student-name">{pass.student?.name}</h4>
                          <p className="student-info">
                            {pass.student?.regNumber} • {pass.student?.year} Year
                          </p>
                          <p className="pass-reason">{pass.reason}</p>
                          <p className="pass-destination">→ {pass.destination}</p>
                        </div>
                        <div className="pass-timing">
                          <div className="time-info">
                            <span className="time-label">Exit Time:</span>
                            <span className="time-value">
                              {dateUtils.formatTime(pass.exitTime)}
                            </span>
                          </div>
                          <div className="time-info">
                            <span className="time-label">Return by:</span>
                            <span className="time-value">
                              {dateUtils.formatTime(pass.expectedReturnTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pass-actions">
                        <button
                          onClick={() => handleQuickCheckout(pass._id)}
                          className="btn btn-success btn-sm"
                        >
                          ✓ Checkout
                        </button>
                        <Link 
                          to={`/scanner?pass=${pass._id}`}
                          className="btn btn-outline btn-sm"
                        >
                          📱 Scan QR
                        </Link>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">😴</div>
                    <h3>All quiet at the gate</h3>
                    <p>No students waiting for checkout right now.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Today's Activity Log */}
            <motion.div 
              className="dashboard-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="section-header">
                <h2 className="section-title">📊 Today's Activity</h2>
                <div className="refresh-indicator">
                  <button 
                    onClick={fetchDashboardData}
                    className="btn btn-ghost btn-sm"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
              
              <div className="activity-timeline">
                {dashboardData.todayCheckouts.length > 0 ? (
                  dashboardData.todayCheckouts.slice(0, 8).map((pass, index) => (
                    <motion.div 
                      key={pass._id}
                      className="activity-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <div className="activity-time">
                        {dateUtils.formatTime(pass.checkoutTime || pass.createdAt)}
                      </div>
                      <div className="activity-content">
                        <div className="activity-type checkout">OUT</div>
                        <div className="activity-details">
                          <strong>{pass.student?.name}</strong>
                          <span>checked out for {pass.reason}</span>
                        </div>
                      </div>
                      <div className="activity-status">
                        {pass.status === 'completed' ? (
                          <span className="status-returned">Returned</span>
                        ) : (
                          <span className="status-out">Still Out</span>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="empty-timeline">
                    <p>No activity recorded today</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="dashboard-sidebar">
            {/* Quick Actions */}
            <motion.div 
              className="sidebar-section"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h3 className="sidebar-title">Quick Actions</h3>
              <div className="quick-actions">
                <Link to="/scanner" className="quick-action primary">
                  <div className="action-icon">📱</div>
                  <span>QR Scanner</span>
                </Link>
                
                <Link to="/passes?status=active" className="quick-action">
                  <div className="action-icon">👥</div>
                  <span>Active Passes</span>
                </Link>
                
                <Link to="/passes?status=overdue" className="quick-action">
                  <div className="action-icon">⚠️</div>
                  <span>Overdue Returns</span>
                  {dashboardData.statistics.overdueReturns > 0 && (
                    <div className="notification-badge danger">
                      {dashboardData.statistics.overdueReturns}
                    </div>
                  )}
                </Link>
                
                <Link to="/notifications" className="quick-action">
                  <div className="action-icon">🔔</div>
                  <span>Alerts</span>
                  {notifications.length > 0 && (
                    <div className="notification-badge">{notifications.length}</div>
                  )}
                </Link>
              </div>
            </motion.div>

            {/* Security Protocols */}
            <motion.div 
              className="sidebar-section"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h3 className="sidebar-title">Security Protocols</h3>
              <div className="protocols-list">
                <div className="protocol-item">
                  <div className="protocol-icon">🆔</div>
                  <div className="protocol-content">
                    <h5>ID Verification</h5>
                    <p>Always verify student ID with QR pass</p>
                  </div>
                </div>
                
                <div className="protocol-item">
                  <div className="protocol-icon">📱</div>
                  <div className="protocol-content">
                    <h5>QR Validation</h5>
                    <p>Scan QR code for automatic verification</p>
                  </div>
                </div>
                
                <div className="protocol-item">
                  <div className="protocol-icon">⏰</div>
                  <div className="protocol-content">
                    <h5>Time Tracking</h5>
                    <p>Record exact check-in/out times</p>
                  </div>
                </div>
                
                <div className="protocol-item">
                  <div className="protocol-icon">🚨</div>
                  <div className="protocol-content">
                    <h5>Emergency Procedure</h5>
                    <p>Contact HOD for suspicious activity</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Shift Information */}
            <motion.div 
              className="sidebar-section"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h3 className="sidebar-title">Shift Information</h3>
              <div className="shift-info">
                <div className="shift-details">
                  <div className="shift-time">
                    <strong>Current Shift:</strong> Day Shift
                  </div>
                  <div className="shift-duration">
                    <strong>Duration:</strong> 8:00 AM - 6:00 PM
                  </div>
                  <div className="shift-officer">
                    <strong>Officer:</strong> {user?.name}
                  </div>
                </div>
                
                <div className="shift-stats">
                  <div className="shift-stat">
                    <span>Passes Processed:</span>
                    <strong>{dashboardData.statistics.totalCheckouts}</strong>
                  </div>
                  <div className="shift-stat">
                    <span>Avg Processing Time:</span>
                    <strong>2 min</strong>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;