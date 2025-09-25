import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import passService from '../../services/passService';
import notificationService from '../../services/notificationService';
import { dateUtils, formatUtils } from '../../services/utils';
import Loader from '../../components/common/Loader';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { notifications } = useSocket();
  
  const [dashboardData, setDashboardData] = useState({
    recentPasses: [],
    activePass: null,
    statistics: {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
    },
  });
  
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentNotifications();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent passes
      const recentPassesResponse = await passService.getUserPasses({ 
        limit: 5,
        sort: '-createdAt' 
      });
      const recentPasses = recentPassesResponse?.passes || [];
      
      // Get active pass
      const activePassesResponse = await passService.getActivePasses();
      const activePasses = activePassesResponse?.passes || activePassesResponse || [];
      const activePass = activePasses.length > 0 ? activePasses[0] : null;
      
      // Get statistics
      const statistics = await passService.getPassStatistics();
      
      setDashboardData({
        recentPasses,
        activePass,
        statistics,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentNotifications = async () => {
    try {
      const notifications = await notificationService.getNotifications({ 
        limit: 3,
        sort: '-createdAt' 
      });
      setRecentNotifications(Array.isArray(notifications) ? notifications : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setRecentNotifications([]); // Set empty array on error
    }
  };

  const getPassStatusColor = (status) => {
    const colors = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      active: 'status-active',
      completed: 'status-completed',
      expired: 'status-expired',
      cancelled: 'status-cancelled',
    };
    return colors[status] || 'status-default';
  };

  if (loading) {
    return <Loader message="Loading your dashboard..." />;
  }

  return (
    <div className="dashboard">
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
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="dashboard-subtitle">
              {formatUtils.formatDepartment(user?.department)} • {user?.year} Year • Section {user?.section}
            </p>
          </div>
          
          <div className="header-actions">
            <Link to="/passes/create" className="btn btn-primary">
              <span>Create New Pass</span>
              <div className="btn-icon">+</div>
            </Link>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          className="dashboard-stats"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.total}</h3>
                <p>Total Passes</p>
              </div>
            </div>
            
            <div className="stat-card approved">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.approved}</h3>
                <p>Approved</p>
              </div>
            </div>
            
            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.pending}</h3>
                <p>Pending</p>
              </div>
            </div>
            
            <div className="stat-card rejected">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.rejected}</h3>
                <p>Rejected</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="dashboard-content">
          <div className="dashboard-main">
            {/* Active Pass */}
            {dashboardData.activePass && (
              <motion.div 
                className="dashboard-section"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="section-header">
                  <h2 className="section-title">Active Pass</h2>
                </div>
                
                <div className="active-pass-card">
                  <div className="pass-header">
                    <div className="pass-info">
                      <h3>{dashboardData.activePass.reason}</h3>
                      <p className="pass-meta">
                        Exit: {dateUtils.formatDateTime(dashboardData.activePass.exitTime)}
                      </p>
                    </div>
                    <div className={`pass-status ${getPassStatusColor(dashboardData.activePass.status)}`}>
                      {formatUtils.formatPassStatus(dashboardData.activePass.status)}
                    </div>
                  </div>
                  
                  <div className="pass-actions">
                    <Link 
                      to={`/passes/${dashboardData.activePass._id}`}
                      className="btn btn-outline btn-sm"
                    >
                      View Details
                    </Link>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => passService.downloadPassPDF(dashboardData.activePass._id)}
                    >
                      Download QR
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recent Passes */}
            <motion.div 
              className="dashboard-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="section-header">
                <h2 className="section-title">Recent Passes</h2>
                <Link to="/passes" className="section-link">
                  View All →
                </Link>
              </div>
              
              <div className="passes-list">
                {dashboardData.recentPasses.length > 0 ? (
                  dashboardData.recentPasses.map((pass, index) => (
                    <motion.div 
                      key={pass._id}
                      className="pass-card"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="pass-content">
                        <div className="pass-main">
                          <h4 className="pass-title">{pass.reason}</h4>
                          <p className="pass-time">
                            {dateUtils.formatDateTime(pass.exitTime)}
                          </p>
                        </div>
                        <div className={`pass-status ${getPassStatusColor(pass.status)}`}>
                          {formatUtils.formatPassStatus(pass.status)}
                        </div>
                      </div>
                      
                      <div className="pass-footer">
                        <span className="pass-date">
                          {dateUtils.formatDate(pass.createdAt)}
                        </span>
                        <Link 
                          to={`/passes/${pass._id}`}
                          className="pass-link"
                        >
                          View →
                        </Link>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h3>No passes yet</h3>
                    <p>Create your first gate pass to get started!</p>
                    <Link to="/passes/create" className="btn btn-primary">
                      Create Pass
                    </Link>
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
                <Link to="/passes/create" className="quick-action">
                  <div className="action-icon">➕</div>
                  <span>New Pass</span>
                </Link>
                
                <Link to="/passes" className="quick-action">
                  <div className="action-icon">📋</div>
                  <span>My Passes</span>
                </Link>
                
                <Link to="/profile" className="quick-action">
                  <div className="action-icon">👤</div>
                  <span>Profile</span>
                </Link>
                
                <Link to="/notifications" className="quick-action">
                  <div className="action-icon">🔔</div>
                  <span>Notifications</span>
                  {notifications.length > 0 && (
                    <div className="notification-badge">{notifications.length}</div>
                  )}
                </Link>
              </div>
            </motion.div>

            {/* Recent Notifications */}
            <motion.div 
              className="sidebar-section"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h3 className="sidebar-title">Recent Notifications</h3>
              <div className="notifications-list">
                {recentNotifications && recentNotifications.length > 0 ? (
                  recentNotifications.map((notification, index) => (
                    <motion.div 
                      key={notification._id}
                      className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <div className="notification-content">
                        <h5>{notification.title}</h5>
                        <p>{notification.message}</p>
                        <span className="notification-time">
                          {dateUtils.formatDateTime(notification.createdAt)}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="empty-notifications">
                    <p>No recent notifications</p>
                  </div>
                )}
              </div>
              
              {recentNotifications && recentNotifications.length > 0 && (
                <Link to="/notifications" className="view-all-notifications">
                  View All Notifications →
                </Link>
              )}
            </motion.div>

            {/* Help & Tips */}
            <motion.div 
              className="sidebar-section"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h3 className="sidebar-title">Tips & Guidelines</h3>
              <div className="tips-list">
                <div className="tip-item">
                  <div className="tip-icon">💡</div>
                  <p>Apply for passes at least 30 minutes before your exit time</p>
                </div>
                
                <div className="tip-item">
                  <div className="tip-icon">📱</div>
                  <p>Keep your QR code ready for quick scanning at the gate</p>
                </div>
                
                <div className="tip-item">
                  <div className="tip-icon">⏰</div>
                  <p>Return on time to maintain a good record</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;