import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import passService from '../../services/passService';
import { dateUtils, formatUtils } from '../../services/utils';
import Loader from '../../components/common/Loader';

const HODDashboard = () => {
  const { user } = useAuth();
  const { notifications } = useSocket();
  
  const [dashboardData, setDashboardData] = useState({
    pendingApprovals: [],
    departmentStats: {},
    recentActivities: [],
    analytics: {
      totalPasses: 0,
      approvalRate: 0,
      averageResponseTime: 0,
      activeStudents: 0,
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch pending final approvals (HOD level)
      const pendingApprovals = await passService.getPassesForApproval({ 
        status: 'mentor_approved',
        limit: 8 
      });
      
      // Get department statistics
      const departmentStats = await passService.getPassStatistics({
        department: user?.department,
        timeframe: selectedTimeframe
      });
      
      setDashboardData({
        pendingApprovals,
        departmentStats,
        analytics: departmentStats,
      });
    } catch (error) {
      console.error('Error fetching HOD dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async (passIds) => {
    try {
      await passService.bulkApprove(passIds, {
        comments: 'Bulk approval by HOD',
        level: 'hod'
      });
      
      fetchDashboardData();
    } catch (error) {
      console.error('Error bulk approving passes:', error);
    }
  };



  if (loading) {
    return <Loader message="Loading HOD dashboard..." />;
  }

  return (
    <div className="dashboard hod-dashboard">
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
              Welcome, Prof. {user?.name} 🏛️
            </h1>
            <p className="dashboard-subtitle">
              Head of Department • {formatUtils.formatDepartment(user?.department)}
            </p>
          </div>
          
          <div className="header-actions">
            <div className="timeframe-selector">
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="form-select compact"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>
            <Link to="/statistics" className="btn btn-primary">
              <span>Full Analytics</span>
              <div className="btn-icon">📊</div>
            </Link>
          </div>
        </motion.div>

        {/* Analytics Overview */}
        <motion.div 
          className="dashboard-stats analytics"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <h3>{dashboardData.analytics.totalPasses}</h3>
                <p>Total Passes</p>
                <div className="stat-trend positive">↗ +12%</div>
              </div>
            </div>
            
            <div className="stat-card approval-rate">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>{dashboardData.analytics.approvalRate}%</h3>
                <p>Approval Rate</p>
                <div className="stat-trend positive">↗ +5%</div>
              </div>
            </div>
            
            <div className="stat-card response-time">
              <div className="stat-icon">⚡</div>
              <div className="stat-content">
                <h3>{dashboardData.analytics.averageResponseTime}m</h3>
                <p>Avg Response</p>
                <div className="stat-trend negative">↘ -8m</div>
              </div>
            </div>
            
            <div className="stat-card active-students">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>{dashboardData.analytics.activeStudents}</h3>
                <p>Active Students</p>
                <div className="stat-trend neutral">→ Same</div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="dashboard-content">
          <div className="dashboard-main">
            {/* Final Approvals Needed */}
            <motion.div 
              className="dashboard-section priority"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="section-header">
                <h2 className="section-title">⚡ Final Approvals Required</h2>
                <div className="section-actions">
                  {dashboardData.pendingApprovals.length > 0 && (
                    <button
                      onClick={() => handleBulkApprove(
                        dashboardData.pendingApprovals.map(p => p._id)
                      )}
                      className="btn btn-success btn-sm"
                    >
                      Approve All
                    </button>
                  )}
                  <span className="priority-badge">
                    {dashboardData.pendingApprovals.length} waiting
                  </span>
                </div>
              </div>
              
              <div className="passes-list">
                {dashboardData.pendingApprovals.length > 0 ? (
                  dashboardData.pendingApprovals.map((pass, index) => (
                    <motion.div 
                      key={pass._id}
                      className="pass-card hod-approval-card"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <div className="pass-content">
                        <div className="student-info">
                          <h4 className="student-name">{pass.student?.name}</h4>
                          <p className="student-details">
                            {pass.student?.regNumber} • {pass.student?.section} Section
                          </p>
                        </div>
                        <div className="pass-details">
                          <h5 className="pass-reason">{pass.reason}</h5>
                          <p className="pass-time">
                            Exit: {dateUtils.formatDateTime(pass.exitTime)}
                          </p>
                          <p className="approval-chain">
                            ✅ Approved by: {pass.mentorApproval?.approver?.name}
                          </p>
                        </div>
                        <div className="pass-meta">
                          <span className="submitted-time">
                            Submitted {dateUtils.formatDateTime(pass.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pass-actions">
                        <button
                          onClick={() => handleBulkApprove([pass._id])}
                          className="btn btn-success btn-sm"
                        >
                          Final Approve
                        </button>
                        <Link 
                          to={`/passes/${pass._id}`}
                          className="btn btn-outline btn-sm"
                        >
                          Review
                        </Link>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🎉</div>
                    <h3>All approvals completed!</h3>
                    <p>No passes awaiting final approval.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Department Overview */}
            <motion.div 
              className="dashboard-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="section-header">
                <h2 className="section-title">Department Overview</h2>
                <Link to="/statistics?view=department" className="section-link">
                  Detailed Report →
                </Link>
              </div>
              
              <div className="overview-grid">
                <div className="overview-card">
                  <h4>Pass Trends</h4>
                  <div className="trend-chart">
                    <div className="chart-placeholder">
                      📈 Interactive chart will be rendered here
                    </div>
                  </div>
                </div>
                
                <div className="overview-card">
                  <h4>Popular Destinations</h4>
                  <div className="destinations-list">
                    <div className="destination-item">
                      <span>Hospital/Medical</span>
                      <span className="count">42%</span>
                    </div>
                    <div className="destination-item">
                      <span>Home/Family</span>
                      <span className="count">28%</span>
                    </div>
                    <div className="destination-item">
                      <span>Bank/Official</span>
                      <span className="count">20%</span>
                    </div>
                    <div className="destination-item">
                      <span>Others</span>
                      <span className="count">10%</span>
                    </div>
                  </div>
                </div>
                
                <div className="overview-card">
                  <h4>Performance Metrics</h4>
                  <div className="metrics-list">
                    <div className="metric-item">
                      <span>On-time Returns</span>
                      <span className="metric-value good">94%</span>
                    </div>
                    <div className="metric-item">
                      <span>Response Time</span>
                      <span className="metric-value good">15 min</span>
                    </div>
                    <div className="metric-item">
                      <span>Rejection Rate</span>
                      <span className="metric-value warning">8%</span>
                    </div>
                  </div>
                </div>
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
                  <div className="action-icon">⚡</div>
                  <span>Final Approvals</span>
                  {dashboardData.pendingApprovals.length > 0 && (
                    <div className="notification-badge">
                      {dashboardData.pendingApprovals.length}
                    </div>
                  )}
                </Link>
                
                <Link to="/statistics" className="quick-action">
                  <div className="action-icon">📊</div>
                  <span>Analytics</span>
                </Link>
                
                <Link to="/passes?department=mine" className="quick-action">
                  <div className="action-icon">🏢</div>
                  <span>Dept. Passes</span>
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

            {/* Department Insights */}
            <motion.div 
              className="sidebar-section"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h3 className="sidebar-title">Department Insights</h3>
              <div className="insights-list">
                <div className="insight-item">
                  <div className="insight-icon">📈</div>
                  <div className="insight-content">
                    <h5>Peak Hours</h5>
                    <p>Most passes requested between 2PM - 4PM</p>
                  </div>
                </div>
                
                <div className="insight-item">
                  <div className="insight-icon">👥</div>
                  <div className="insight-content">
                    <h5>Active Students</h5>
                    <p>85% of students have used gate passes this month</p>
                  </div>
                </div>
                
                <div className="insight-item">
                  <div className="insight-icon">⚡</div>
                  <div className="insight-content">
                    <h5>Response Time</h5>
                    <p>Average approval time improved by 25%</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Policy Updates */}
            <motion.div 
              className="sidebar-section"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h3 className="sidebar-title">Policy Updates</h3>
              <div className="updates-list">
                <div className="update-item">
                  <div className="update-date">Sep 25</div>
                  <div className="update-content">
                    <h6>New Emergency Protocol</h6>
                    <p>Updated guidelines for medical emergencies</p>
                  </div>
                </div>
                
                <div className="update-item">
                  <div className="update-date">Sep 20</div>
                  <div className="update-content">
                    <h6>Extended Hours</h6>
                    <p>Gate pass system now available 24/7</p>
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

export default HODDashboard;