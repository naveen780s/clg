import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import passService from '../services/passService';
// import { dateUtils } from '../services/utils';
import Loader from '../components/common/Loader';

const Statistics = () => {
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    overview: {
      totalPasses: 0,
      activePasses: 0,
      completedPasses: 0,
      pendingApprovals: 0
    },
    trends: {
      daily: [],
      weekly: [],
      monthly: []
    },
    departments: [],
    reasons: [],
    timeAnalysis: {
      peakHours: [],
      averageDuration: 0,
      overdueRate: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStatistics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // Fetch different statistics based on user role
      const query = {
        timeframe,
        role: user.role,
        department: user.role === 'hod' ? user.department : undefined
      };

      const statisticsData = await passService.getPassStatistics(query);
      setStats(statisticsData);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const getChartData = (data, label) => {
    // Simple chart data preparation
    return {
      labels: data.map(item => item.label || item.date),
      values: data.map(item => item.count || item.value)
    };
  };

  const formatPercentage = (value, total) => {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  if (loading) {
    return <Loader message="Loading statistics..." />;
  }

  return (
    <div className="statistics-page">
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
              Statistics & Analytics 📊
            </h1>
            <p className="page-subtitle">
              Insights into gate pass usage and trends
            </p>
          </div>
          
          <div className="header-controls">
            <div className="timeframe-selector">
              <label>Timeframe:</label>
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="timeframe-select"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          className="stats-tabs"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <span className="tab-icon">📈</span>
            Overview
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          >
            <span className="tab-icon">📊</span>
            Trends
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          >
            <span className="tab-icon">🏛️</span>
            Departments
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            <span className="tab-icon">🔍</span>
            Analytics
          </button>
        </motion.div>

        {/* Content */}
        <div className="stats-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div 
              className="stats-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Key Metrics */}
              <div className="metrics-grid">
                <div className="metric-card total">
                  <div className="metric-icon">📄</div>
                  <div className="metric-content">
                    <h3>{stats.overview.totalPasses}</h3>
                    <p>Total Passes</p>
                    <div className="metric-change positive">
                      +12% from last period
                    </div>
                  </div>
                </div>

                <div className="metric-card active">
                  <div className="metric-icon">🏃</div>
                  <div className="metric-content">
                    <h3>{stats.overview.activePasses}</h3>
                    <p>Currently Active</p>
                    <div className="metric-change neutral">
                      Real-time count
                    </div>
                  </div>
                </div>

                <div className="metric-card completed">
                  <div className="metric-icon">✅</div>
                  <div className="metric-content">
                    <h3>{stats.overview.completedPasses}</h3>
                    <p>Completed</p>
                    <div className="metric-change positive">
                      {formatPercentage(stats.overview.completedPasses, stats.overview.totalPasses)} completion rate
                    </div>
                  </div>
                </div>

                <div className="metric-card pending">
                  <div className="metric-icon">⏳</div>
                  <div className="metric-content">
                    <h3>{stats.overview.pendingApprovals}</h3>
                    <p>Pending Approval</p>
                    <div className="metric-change warning">
                      Needs attention
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="quick-stats">
                <div className="stat-row">
                  <div className="stat-item">
                    <span className="stat-label">Average Processing Time:</span>
                    <span className="stat-value">2.3 hours</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Peak Usage Time:</span>
                    <span className="stat-value">2:00 PM - 4:00 PM</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Most Common Reason:</span>
                    <span className="stat-value">Medical Emergency</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <motion.div 
              className="stats-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="charts-grid">
                {/* Pass Volume Chart */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>📈 Pass Volume Trends</h3>
                    <p>Number of passes over time</p>
                  </div>
                  <div className="chart-container">
                    <div className="simple-chart">
                      {stats.trends.daily.length > 0 ? (
                        <div className="chart-bars">
                          {stats.trends.daily.slice(0, 7).map((day, index) => (
                            <div key={index} className="chart-bar">
                              <div 
                                className="bar-fill"
                                style={{ 
                                  height: `${(day.count / Math.max(...stats.trends.daily.map(d => d.count))) * 100}%` 
                                }}
                              ></div>
                              <div className="bar-label">{day.label}</div>
                              <div className="bar-value">{day.count}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="chart-placeholder">
                          <p>No trend data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Distribution */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>🍕 Status Distribution</h3>
                    <p>Current pass statuses</p>
                  </div>
                  <div className="chart-container">
                    <div className="pie-chart-simple">
                      <div className="pie-segments">
                        <div className="pie-segment completed" style={{width: '40%'}}>
                          <span>Completed (40%)</span>
                        </div>
                        <div className="pie-segment active" style={{width: '25%'}}>
                          <span>Active (25%)</span>
                        </div>
                        <div className="pie-segment pending" style={{width: '20%'}}>
                          <span>Pending (20%)</span>
                        </div>
                        <div className="pie-segment rejected" style={{width: '15%'}}>
                          <span>Other (15%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Analysis */}
              <div className="time-analysis">
                <h3>⏰ Time-based Analysis</h3>
                <div className="time-stats-grid">
                  <div className="time-stat">
                    <div className="time-icon">🌅</div>
                    <div className="time-content">
                      <h4>Morning (6AM-12PM)</h4>
                      <p>23 passes • 28% of total</p>
                      <div className="time-bar">
                        <div className="time-fill" style={{width: '28%'}}></div>
                      </div>
                    </div>
                  </div>

                  <div className="time-stat">
                    <div className="time-icon">☀️</div>
                    <div className="time-content">
                      <h4>Afternoon (12PM-6PM)</h4>
                      <p>45 passes • 55% of total</p>
                      <div className="time-bar">
                        <div className="time-fill" style={{width: '55%'}}></div>
                      </div>
                    </div>
                  </div>

                  <div className="time-stat">
                    <div className="time-icon">🌙</div>
                    <div className="time-content">
                      <h4>Evening (6PM-12AM)</h4>
                      <p>14 passes • 17% of total</p>
                      <div className="time-bar">
                        <div className="time-fill" style={{width: '17%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <motion.div 
              className="stats-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="department-stats">
                <h3>🏛️ Department-wise Statistics</h3>
                
                <div className="department-grid">
                  {[
                    { name: 'Computer Science', passes: 45, active: 8, completion: 89 },
                    { name: 'Electronics', passes: 32, active: 5, completion: 94 },
                    { name: 'Mechanical', passes: 28, active: 3, completion: 92 },
                    { name: 'Civil', passes: 21, active: 2, completion: 95 },
                    { name: 'Chemical', passes: 18, active: 4, completion: 78 },
                    { name: 'Electrical', passes: 15, active: 1, completion: 93 }
                  ].map((dept, index) => (
                    <div key={index} className="department-card">
                      <div className="dept-header">
                        <h4>{dept.name}</h4>
                        <span className="dept-rank">#{index + 1}</span>
                      </div>
                      
                      <div className="dept-metrics">
                        <div className="dept-metric">
                          <span className="metric-label">Total Passes:</span>
                          <span className="metric-value">{dept.passes}</span>
                        </div>
                        <div className="dept-metric">
                          <span className="metric-label">Currently Active:</span>
                          <span className="metric-value active">{dept.active}</span>
                        </div>
                        <div className="dept-metric">
                          <span className="metric-label">Completion Rate:</span>
                          <span className="metric-value success">{dept.completion}%</span>
                        </div>
                      </div>
                      
                      <div className="dept-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${dept.completion}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Ranking */}
              <div className="department-ranking">
                <h3>🏆 Top Performing Departments</h3>
                <div className="ranking-list">
                  <div className="rank-item gold">
                    <div className="rank-position">🥇</div>
                    <div className="rank-info">
                      <h4>Civil Engineering</h4>
                      <p>95% completion rate • 21 passes</p>
                    </div>
                    <div className="rank-score">95%</div>
                  </div>
                  
                  <div className="rank-item silver">
                    <div className="rank-position">🥈</div>
                    <div className="rank-info">
                      <h4>Electronics</h4>
                      <p>94% completion rate • 32 passes</p>
                    </div>
                    <div className="rank-score">94%</div>
                  </div>
                  
                  <div className="rank-item bronze">
                    <div className="rank-position">🥉</div>
                    <div className="rank-info">
                      <h4>Electrical</h4>
                      <p>93% completion rate • 15 passes</p>
                    </div>
                    <div className="rank-score">93%</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <motion.div 
              className="stats-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Pass Reasons Analysis */}
              <div className="analytics-grid">
                <div className="analytics-card">
                  <div className="analytics-header">
                    <h3>📝 Pass Reasons</h3>
                    <p>Most common reasons for exit</p>
                  </div>
                  
                  <div className="reasons-list">
                    {[
                      { reason: 'Medical Emergency', count: 45, percentage: 32 },
                      { reason: 'Family Emergency', count: 28, percentage: 20 },
                      { reason: 'Personal Work', count: 25, percentage: 18 },
                      { reason: 'Bank Work', count: 18, percentage: 13 },
                      { reason: 'Interview', count: 12, percentage: 9 },
                      { reason: 'Others', count: 11, percentage: 8 }
                    ].map((item, index) => (
                      <div key={index} className="reason-item">
                        <div className="reason-info">
                          <span className="reason-name">{item.reason}</span>
                          <span className="reason-count">{item.count} passes</span>
                        </div>
                        <div className="reason-bar">
                          <div 
                            className="reason-fill"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                        <span className="reason-percentage">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="analytics-card">
                  <div className="analytics-header">
                    <h3>⚡ Performance Metrics</h3>
                    <p>System efficiency indicators</p>
                  </div>
                  
                  <div className="performance-metrics">
                    <div className="performance-item">
                      <div className="perf-icon">⏱️</div>
                      <div className="perf-content">
                        <h5>Average Approval Time</h5>
                        <div className="perf-value">2.3 hours</div>
                        <div className="perf-change positive">-15% improvement</div>
                      </div>
                    </div>

                    <div className="performance-item">
                      <div className="perf-icon">🎯</div>
                      <div className="perf-content">
                        <h5>Success Rate</h5>
                        <div className="perf-value">94.2%</div>
                        <div className="perf-change positive">+2.1% this month</div>
                      </div>
                    </div>

                    <div className="performance-item">
                      <div className="perf-icon">📈</div>
                      <div className="perf-content">
                        <h5>Usage Growth</h5>
                        <div className="perf-value">+18%</div>
                        <div className="perf-change positive">vs last month</div>
                      </div>
                    </div>

                    <div className="performance-item">
                      <div className="perf-icon">⚠️</div>
                      <div className="perf-content">
                        <h5>Overdue Rate</h5>
                        <div className="perf-value">3.8%</div>
                        <div className="perf-change negative">+0.5% this week</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="insights-section">
                <h3>💡 Key Insights</h3>
                
                <div className="insights-grid">
                  <div className="insight-card positive">
                    <div className="insight-icon">📈</div>
                    <div className="insight-content">
                      <h4>Peak Usage Identified</h4>
                      <p>Most passes are requested between 2-4 PM. Consider staffing optimization during these hours.</p>
                    </div>
                  </div>

                  <div className="insight-card warning">
                    <div className="insight-icon">⚠️</div>
                    <div className="insight-content">
                      <h4>Overdue Returns Increasing</h4>
                      <p>3.8% of passes are returned late. Implement reminder notifications 30 minutes before expected return.</p>
                    </div>
                  </div>

                  <div className="insight-card info">
                    <div className="insight-icon">🏥</div>
                    <div className="insight-content">
                      <h4>Medical Emergencies Lead</h4>
                      <p>32% of passes are for medical reasons. Consider partnering with nearby healthcare facilities.</p>
                    </div>
                  </div>

                  <div className="insight-card success">
                    <div className="insight-icon">🎯</div>
                    <div className="insight-content">
                      <h4>High Approval Rate</h4>
                      <p>94% of passes are approved successfully. Current approval process is working efficiently.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Export Options */}
        <motion.div 
          className="export-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="export-card">
            <h3>📤 Export Reports</h3>
            <p>Download detailed reports for further analysis</p>
            
            <div className="export-buttons">
              <button className="btn btn-outline">
                📊 Export as Excel
              </button>
              <button className="btn btn-outline">
                📄 Export as PDF
              </button>
              <button className="btn btn-outline">
                📈 Export Charts
              </button>
              <button className="btn btn-primary">
                📧 Email Report
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Statistics;