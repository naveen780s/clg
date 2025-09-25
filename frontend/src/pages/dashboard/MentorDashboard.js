import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import passService from '../../services/passService';

import { dateUtils, formatUtils } from '../../services/utils';
import Loader from '../../components/common/Loader';

const MentorDashboard = () => {
  const { user, logout } = useAuth();
  const { notifications } = useSocket();
  const navigate = useNavigate();
  
  const [dashboardData, setDashboardData] = useState({
    pendingPasses: [],
    recentlyApproved: [],
    statistics: {
      totalPending: 0,
      approvedToday: 0,
      myStudents: 0,
      rejectedCount: 0,
    },
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch pending passes for approval
      const pendingResponse = await passService.getPassesForApproval({ 
        status: 'pending',
        limit: 10 
      });
      
      // Get recently approved passes
      const approvedResponse = await passService.getPassesForApproval({ 
        status: 'approved',
        limit: 5,
        sort: '-updatedAt'
      });
      
      // Get statistics
      const statsResponse = await passService.getPassStatistics();
      
      setDashboardData({
        pendingPasses: pendingResponse.passes || [],
        recentlyApproved: approvedResponse.passes || [],
        statistics: statsResponse.stats || {
          totalPending: 0,
          approvedToday: 0,
          myStudents: 0,
          rejectedCount: 0,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApprove = async (passId) => {
    try {
      await passService.mentorApproval(passId, 'approve', 'Quick approval from dashboard');
      
      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error('Error approving pass:', error);
    }
  };

  const getPassStatusColor = (status) => {
    const colors = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      active: 'status-active',
      completed: 'status-completed',
    };
    return colors[status] || 'status-default';
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Logout Button Component
  const LogoutButton = () => (
    <button 
      onClick={handleLogout}
      className="quick-action logout-action"
      style={{ 
        background: 'var(--error-light)',
        color: 'var(--error)',
        border: '2px solid var(--error)',
      }}
    >
      <div className="action-icon">🚪</div>
      <span>Logout</span>
    </button>
  );

  if (loading) {
    return <Loader message="Loading mentor dashboard..." />;
  }

  return (
    <div className="dashboard mentor-dashboard">
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
              Welcome, {user?.name} 👨‍🏫
            </h1>
            <p className="dashboard-subtitle">
              Mentor • {formatUtils.formatDepartment(user?.department)} Department
            </p>
          </div>
          
          <div className="header-actions">
            <Link to="/approvals" className="btn btn-primary">
              <span>Review All Passes</span>
              <div className="btn-icon">📋</div>
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
            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.totalPending}</h3>
                <p>Pending Review</p>
              </div>
            </div>
            
            <div className="stat-card approved">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.approvedToday}</h3>
                <p>Approved Today</p>
              </div>
            </div>
            
            <div className="stat-card students">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.myStudents}</h3>
                <p>My Students</p>
              </div>
            </div>
            
            <div className="stat-card rejected">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <h3>{dashboardData.statistics.rejectedCount}</h3>
                <p>Rejected</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="dashboard-content">
          <div className="dashboard-main">
            {/* Pending Approvals */}
            <motion.div 
              className="dashboard-section priority"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="section-header">
                <h2 className="section-title">🚨 Pending Approvals</h2>
                <span className="priority-badge">
                  {dashboardData.pendingPasses.length} waiting
                </span>
              </div>
              
              <div className="passes-list">
                {dashboardData.pendingPasses.length > 0 ? (
                  dashboardData.pendingPasses.map((pass, index) => (
                    <motion.div 
                      key={pass._id}
                      className="pass-card approval-card"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <div className="pass-content">
                        <div className="student-info">
                          <h4 className="student-name">{pass.student?.name}</h4>
                          <p className="student-details">
                            {pass.student?.regNumber} • {pass.student?.year} Year
                          </p>
                        </div>
                        <div className="pass-details">
                          <h5 className="pass-reason">{pass.reason}</h5>
                          <p className="pass-time">
                            Exit: {dateUtils.formatDateTime(pass.exitTime)}
                          </p>
                          <p className="pass-destination">
                            To: {pass.destination}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pass-actions">
                        <button
                          onClick={() => handleQuickApprove(pass._id)}
                          className="btn btn-success btn-sm"
                        >
                          Quick Approve
                        </button>
                        <Link 
                          to={`/passes/${pass._id}`}
                          className="btn btn-outline btn-sm"
                        >
                          Review Details
                        </Link>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">✅</div>
                    <h3>All caught up!</h3>
                    <p>No pending approvals at the moment.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recently Approved */}
            <motion.div 
              className="dashboard-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="section-header">
                <h2 className="section-title">Recent Approvals</h2>
                <Link to="/approvals?status=approved" className="section-link">
                  View All →
                </Link>
              </div>
              
              <div className="passes-list compact">
                {dashboardData.recentlyApproved.length > 0 ? (
                  dashboardData.recentlyApproved.map((pass, index) => (
                    <motion.div 
                      key={pass._id}
                      className="pass-card compact"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <div className="pass-content">
                        <div className="pass-main">
                          <h5>{pass.student?.name}</h5>
                          <p className="pass-reason">{pass.reason}</p>
                        </div>
                        <div className={`pass-status ${getPassStatusColor(pass.status)}`}>
                          Approved
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="empty-message">
                    <p>No recent approvals</p>
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
                <Link to="/approvals" className="quick-action">
                  <div className="action-icon">📋</div>
                  <span>All Approvals</span>
                  {dashboardData.statistics.totalPending > 0 && (
                    <div className="notification-badge">
                      {dashboardData.statistics.totalPending}
                    </div>
                  )}
                </Link>
                
                <Link to="/passes?mentor=me" className="quick-action">
                  <div className="action-icon">👥</div>
                  <span>My Students</span>
                </Link>
                
                <Link to="/statistics" className="quick-action">
                  <div className="action-icon">📊</div>
                  <span>Statistics</span>
                </Link>
                
                <Link to="/notifications" className="quick-action">
                  <div className="action-icon">🔔</div>
                  <span>Notifications</span>
                  {notifications.length > 0 && (
                    <div className="notification-badge">{notifications.length}</div>
                  )}
                </Link>

                <LogoutButton />
              </div>
            </motion.div>

            {/* Today's Schedule */}
            <motion.div 
              className="sidebar-section"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h3 className="sidebar-title">Today's Overview</h3>
              <div className="schedule-list">
                <div className="schedule-item">
                  <div className="schedule-time">09:00 AM</div>
                  <div className="schedule-event">
                    <strong>3 pending approvals</strong>
                    <p>Review student requests</p>
                  </div>
                </div>
                
                <div className="schedule-item">
                  <div className="schedule-time">02:00 PM</div>
                  <div className="schedule-event">
                    <strong>Department meeting</strong>
                    <p>Discuss gate pass policies</p>
                  </div>
                </div>
                
                <div className="schedule-item">
                  <div className="schedule-time">05:00 PM</div>
                  <div className="schedule-event">
                    <strong>Weekly report</strong>
                    <p>Submit approval statistics</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Guidelines */}
            <motion.div 
              className="sidebar-section"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h3 className="sidebar-title">Approval Guidelines</h3>
              <div className="guidelines-list">
                <div className="guideline-item">
                  <div className="guideline-icon">⚡</div>
                  <p>Review requests within 30 minutes</p>
                </div>
                
                <div className="guideline-item">
                  <div className="guideline-icon">🎯</div>
                  <p>Verify student details and reason</p>
                </div>
                
                <div className="guideline-item">
                  <div className="guideline-icon">💬</div>
                  <p>Add comments for rejections</p>
                </div>
                
                <div className="guideline-item">
                  <div className="guideline-icon">📞</div>
                  <p>Contact student if clarification needed</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorDashboard;