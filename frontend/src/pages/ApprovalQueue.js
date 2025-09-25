import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import passService from '../services/passService';
import { dateUtils } from '../services/utils';
import Loader from '../components/common/Loader';

const ApprovalQueue = () => {
  const { user } = useAuth();
  const { notifications } = useSocket();
  
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(new Set());
  const [filters, setFilters] = useState({
    priority: 'all',
    department: 'all',
    sortBy: 'urgency',
    searchTerm: ''
  });
  
  const [selectedPasses, setSelectedPasses] = useState(new Set());

  useEffect(() => {
    fetchApprovalQueue();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchApprovalQueue, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchApprovalQueue = async () => {
    try {
      setLoading(true);
      
      let pendingPasses = [];
      
      if (user.role === 'mentor') {
        // Get passes pending mentor approval
        const response = await passService.getPassesForApproval({
          status: 'pending',
          sortBy: filters.sortBy,
          search: filters.searchTerm || undefined
        });
        pendingPasses = response.passes || [];
      } else if (user.role === 'hod') {
        // Get passes pending HOD approval (mentor-approved)
        const response = await passService.getPassesForApproval({
          status: 'mentor_approved',
          sortBy: filters.sortBy,
          search: filters.searchTerm || undefined
        });
        pendingPasses = response.passes || [];
      }
      
      // Ensure pendingPasses is an array
      if (!Array.isArray(pendingPasses)) {
        pendingPasses = [];
      }
      
      // Apply filters
      let filteredPasses = pendingPasses;
      
      if (filters.priority !== 'all') {
        filteredPasses = filteredPasses.filter(pass => {
          const timeUntilExit = new Date(pass.exitTime) - new Date();
          const hoursUntil = timeUntilExit / (1000 * 60 * 60);
          
          if (filters.priority === 'urgent') return hoursUntil <= 2;
          if (filters.priority === 'soon') return hoursUntil > 2 && hoursUntil <= 6;
          if (filters.priority === 'normal') return hoursUntil > 6;
          return true;
        });
      }
      
      if (filters.department !== 'all') {
        filteredPasses = filteredPasses.filter(pass => 
          pass.student?.department === filters.department
        );
      }
      
      setPasses(filteredPasses);
    } catch (error) {
      console.error('Error fetching approval queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (passId, action, comments = '') => {
    try {
      setActionLoading(prev => new Set(prev).add(passId));
      
      if (user.role === 'mentor') {
        await passService.mentorApproval(passId, action, comments);
      } else if (user.role === 'hod') {
        await passService.hodApproval(passId, action, comments);
      }
      
      // Remove from queue after action
      setPasses(prev => prev.filter(pass => pass._id !== passId));
      setSelectedPasses(prev => {
        const newSet = new Set(prev);
        newSet.delete(passId);
        return newSet;
      });
      
    } catch (error) {
      console.error(`Error ${action} pass:`, error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(passId);
        return newSet;
      });
    }
  };

  const handleBulkApproval = async (action) => {
    if (selectedPasses.size === 0) return;
    
    const confirmMessage = `${action === 'approve' ? 'Approve' : 'Reject'} ${selectedPasses.size} selected passes?`;
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const promises = Array.from(selectedPasses).map(passId => 
        handleApproval(passId, action, `Bulk ${action} by ${user.name}`)
      );
      
      await Promise.all(promises);
      setSelectedPasses(new Set());
    } catch (error) {
      console.error(`Error in bulk ${action}:`, error);
    }
  };

  const getPriorityInfo = (pass) => {
    const timeUntilExit = new Date(pass.exitTime) - new Date();
    const hoursUntil = timeUntilExit / (1000 * 60 * 60);
    
    if (hoursUntil <= 0) {
      return { level: 'overdue', color: 'danger', text: 'OVERDUE', icon: '🚨' };
    } else if (hoursUntil <= 2) {
      return { level: 'urgent', color: 'danger', text: 'URGENT', icon: '⚡' };
    } else if (hoursUntil <= 6) {
      return { level: 'soon', color: 'warning', text: 'SOON', icon: '⏰' };
    }
    return { level: 'normal', color: 'info', text: 'NORMAL', icon: '📋' };
  };

  const handleSelectAll = () => {
    if (selectedPasses.size === passes.length) {
      setSelectedPasses(new Set());
    } else {
      setSelectedPasses(new Set(passes.map(p => p._id)));
    }
  };

  if (loading) {
    return <Loader message="Loading approval queue..." />;
  }

  return (
    <div className="approval-queue-page">
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
              Approval Queue ⚡
            </h1>
            <p className="page-subtitle">
              {passes.length} passes awaiting your approval
              {notifications.length > 0 && (
                <span className="live-indicator">
                  <div className="live-dot"></div>
                  {notifications.length} new updates
                </span>
              )}
            </p>
          </div>
          
          <div className="header-stats">
            <div className="stat-item urgent">
              <span className="stat-value">
                {passes.filter(p => getPriorityInfo(p).level === 'urgent').length}
              </span>
              <span className="stat-label">Urgent</span>
            </div>
            <div className="stat-item soon">
              <span className="stat-value">
                {passes.filter(p => getPriorityInfo(p).level === 'soon').length}
              </span>
              <span className="stat-label">Soon</span>
            </div>
            <div className="stat-item normal">
              <span className="stat-value">
                {passes.filter(p => getPriorityInfo(p).level === 'normal').length}
              </span>
              <span className="stat-label">Normal</span>
            </div>
          </div>
        </motion.div>

        {/* Filters and Controls */}
        <motion.div 
          className="queue-controls"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="controls-row">
            <div className="filters-section">
              <div className="filter-group">
                <label>Priority:</label>
                <select 
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="filter-select"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent (≤2h)</option>
                  <option value="soon">Soon (2-6h)</option>
                  <option value="normal">Normal (&gt;6h)</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Department:</label>
                <select 
                  value={filters.department}
                  onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                  className="filter-select"
                >
                  <option value="all">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                  <option value="Chemical">Chemical</option>
                  <option value="Electrical">Electrical</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Sort By:</label>
                <select 
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="filter-select"
                >
                  <option value="urgency">Urgency</option>
                  <option value="exitTime">Exit Time</option>
                  <option value="createdAt">Request Time</option>
                  <option value="studentName">Student Name</option>
                </select>
              </div>

              <div className="filter-group search-group">
                <label>Search:</label>
                <input
                  type="text"
                  placeholder="Search by student name, reason..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="filter-input"
                />
              </div>
            </div>

            <div className="actions-section">
              <button
                onClick={fetchApprovalQueue}
                className="btn btn-outline btn-sm"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {passes.length > 0 && (
            <div className="bulk-actions">
              <div className="bulk-selection">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={selectedPasses.size === passes.length && passes.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span className="checkmark"></span>
                  Select All ({passes.length})
                </label>
                
                {selectedPasses.size > 0 && (
                  <span className="selected-count">
                    {selectedPasses.size} selected
                  </span>
                )}
              </div>

              {selectedPasses.size > 0 && (
                <div className="bulk-buttons">
                  <button
                    onClick={() => handleBulkApproval('approve')}
                    className="btn btn-success btn-sm"
                  >
                    ✅ Approve Selected ({selectedPasses.size})
                  </button>
                  <button
                    onClick={() => handleBulkApproval('reject')}
                    className="btn btn-danger btn-sm"
                  >
                    ❌ Reject Selected ({selectedPasses.size})
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Approval Queue */}
        <motion.div 
          className="queue-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {passes.length > 0 ? (
            <div className="passes-grid">
              {passes.map((pass, index) => {
                const priority = getPriorityInfo(pass);
                const isSelected = selectedPasses.has(pass._id);
                const isLoading = actionLoading.has(pass._id);
                
                return (
                  <motion.div 
                    key={pass._id}
                    className={`pass-card approval-card ${priority.level} ${isSelected ? 'selected' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <div className="card-header">
                      <div className="card-selection">
                        <label className="checkbox-container">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedPasses);
                              if (e.target.checked) {
                                newSelected.add(pass._id);
                              } else {
                                newSelected.delete(pass._id);
                              }
                              setSelectedPasses(newSelected);
                            }}
                          />
                          <span className="checkmark"></span>
                        </label>
                      </div>
                      
                      <div className="priority-badge">
                        <span className={`priority-indicator ${priority.color}`}>
                          {priority.icon} {priority.text}
                        </span>
                      </div>
                    </div>

                    <div className="card-content">
                      <div className="student-section">
                        <div className="student-avatar">
                          {pass.student?.name?.charAt(0)}
                        </div>
                        <div className="student-info">
                          <h3 className="student-name">{pass.student?.name}</h3>
                          <p className="student-details">
                            {pass.student?.regNumber} • {pass.student?.year} Year
                          </p>
                          <p className="student-dept">🏛️ {pass.student?.department}</p>
                        </div>
                      </div>

                      <div className="pass-details">
                        <div className="pass-reason">
                          <h4>{pass.reason}</h4>
                          <p className="pass-destination">📍 {pass.destination}</p>
                        </div>

                        <div className="pass-timing">
                          <div className="timing-row">
                            <span className="timing-label">Exit:</span>
                            <span className="timing-value">
                              {dateUtils.formatDateTime(pass.exitTime)}
                            </span>
                          </div>
                          <div className="timing-row">
                            <span className="timing-label">Return:</span>
                            <span className="timing-value">
                              {dateUtils.formatDateTime(pass.expectedReturnTime)}
                            </span>
                          </div>
                          <div className="timing-row urgency">
                            <span className="timing-label">Time until exit:</span>
                            <span className={`timing-value ${priority.color}`}>
                              {Math.ceil((new Date(pass.exitTime) - new Date()) / (1000 * 60 * 60))}h
                            </span>
                          </div>
                        </div>

                        {pass.additionalNotes && (
                          <div className="pass-notes">
                            <strong>Notes:</strong> {pass.additionalNotes}
                          </div>
                        )}

                        <div className="pass-metadata">
                          <span className="metadata-item">
                            📅 Requested: {dateUtils.formatRelativeTime(pass.createdAt)}
                          </span>
                          {pass.student_id?.phone && (
                            <span className="metadata-item">
                              📞 {pass.student_id.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="card-actions">
                      <div className="action-buttons">
                        <button
                          onClick={() => handleApproval(pass._id, 'approve')}
                          disabled={isLoading}
                          className="btn btn-success btn-sm"
                        >
                          {isLoading ? '⏳' : '✅'} Approve
                        </button>
                        
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for rejection (optional):');
                            if (reason !== null) {
                              handleApproval(pass._id, 'reject', reason);
                            }
                          }}
                          disabled={isLoading}
                          className="btn btn-danger btn-sm"
                        >
                          {isLoading ? '⏳' : '❌'} Reject
                        </button>
                      </div>
                      
                      <Link 
                        to={`/passes/${pass._id}`}
                        className="btn btn-outline btn-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>All caught up!</h3>
              <p>
                {user.role === 'mentor' 
                  ? "No passes are waiting for mentor approval right now."
                  : "No passes are waiting for HOD approval right now."
                }
              </p>
              <div className="empty-actions">
                <button
                  onClick={fetchApprovalQueue}
                  className="btn btn-outline"
                >
                  🔄 Check Again
                </button>
                <Link to="/dashboard" className="btn btn-primary">
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Stats */}
        {passes.length > 0 && (
          <motion.div 
            className="queue-stats"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{passes.length}</div>
                <div className="stat-label">Total Pending</div>
              </div>
              
              <div className="stat-card urgent">
                <div className="stat-value">
                  {passes.filter(p => getPriorityInfo(p).level === 'urgent' || getPriorityInfo(p).level === 'overdue').length}
                </div>
                <div className="stat-label">Needs Immediate Attention</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value">
                  {Math.round(passes.reduce((acc, pass) => {
                    const timeUntilExit = new Date(pass.exitTime) - new Date();
                    return acc + timeUntilExit / (1000 * 60 * 60);
                  }, 0) / passes.length)}h
                </div>
                <div className="stat-label">Avg Time Until Exit</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value">
                  {new Set(passes.map(p => p.student?.department)).size}
                </div>
                <div className="stat-label">Departments</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;