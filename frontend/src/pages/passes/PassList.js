import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import passService from '../../services/passService';
import { dateUtils } from '../../services/utils';
import Loader from '../../components/common/Loader';

const PassList = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || 'all',
    dateRange: 'all',
    searchTerm: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPasses: 0,
    passesPerPage: 10
  });

  useEffect(() => {
    fetchPasses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.currentPage]);

  const fetchPasses = async () => {
    try {
      setLoading(true);
      
      const query = {
        status: filters.status !== 'all' ? filters.status : undefined,
        search: filters.searchTerm || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: pagination.currentPage,
        limit: pagination.passesPerPage,
        dateRange: filters.dateRange !== 'all' ? filters.dateRange : undefined
      };

      // Remove undefined values
      Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);

      const response = await passService.getUserPasses(query);
      
      setPasses(response.passes || response);
      setPagination(prev => ({
        ...prev,
        totalPages: response.totalPages || 1,
        totalPasses: response.totalPasses || (response.passes ? response.passes.length : response.length)
      }));
    } catch (error) {
      console.error('Error fetching passes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
      active: 'info',
      completed: 'success',
      expired: 'secondary',
      cancelled: 'danger'
    };
    return statusColors[status] || 'secondary';
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
      active: '🏃',
      completed: '✨',
      expired: '⏰',
      cancelled: '🚫'
    };
    return statusIcons[status] || '📄';
  };

  const canCancelPass = (pass) => {
    return pass.student_id?._id === user._id && 
           ['pending', 'approved'].includes(pass.status) &&
           new Date(pass.departure_time) > new Date();
  };

  const handleCancelPass = async (passId) => {
    if (window.confirm('Are you sure you want to cancel this pass?')) {
      try {
        await passService.cancelPass(passId);
        fetchPasses();
      } catch (error) {
        console.error('Error cancelling pass:', error);
      }
    }
  };

  if (loading) {
    return <Loader message="Loading passes..." />;
  }

  return (
    <div className="pass-list-page">
      <div className="passes-container">
        {/* Header */}
        <motion.div 
          className="passes-header"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h1 className="page-title">
              {filters.status === 'all' ? 'All Passes' : `${filters.status.charAt(0).toUpperCase() + filters.status.slice(1)} Passes`}
            </h1>
            <p className="passes-count">
              {pagination.totalPasses} passes found
            </p>
          </div>
          
          {user.role === 'student' && (
            <Link to="/passes/create" className="create-pass-btn">
              <span>Create New Pass</span>
              <span>✨</span>
            </Link>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div 
          className="filters-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="filters-grid">
            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={filters.status} 
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Date Range:</label>
              <select 
                value={filters.dateRange} 
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="filter-select"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div className="filter-group search-group">
              <label>Search:</label>
              <input
                type="text"
                placeholder="Search by reason, destination..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Sort By:</label>
              <select 
                value={filters.sortBy} 
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="filter-select"
              >
                <option value="createdAt">Created Date</option>
                <option value="departure_time">Exit Time</option>
                <option value="status">Status</option>
                <option value="reason">Reason</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Order:</label>
              <select 
                value={filters.sortOrder} 
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="filter-select"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Passes List */}
        <motion.div 
          className="passes-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {passes.length > 0 ? (
            <div className="passes-grid">
              {passes.map((pass, index) => (
                <motion.div 
                  key={pass._id}
                  className={`pass-card ${pass.status}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="pass-header">
                    <div className="pass-status">
                      <span className={`status-badge ${getStatusColor(pass.status)}`}>
                        {getStatusIcon(pass.status)} {pass.status.charAt(0).toUpperCase() + pass.status.slice(1)}
                      </span>
                    </div>
                    <div className="pass-date">
                      {dateUtils.formatDate(pass.createdAt)}
                    </div>
                  </div>

                  <div className="pass-content">
                    <div className="pass-info">
                      <h3 className="pass-reason">{pass.reason}</h3>
                      <p className="pass-destination">📍 {pass.destination}</p>
                      
                      <div className="pass-timing">
                        <div className="timing-item">
                          <span className="timing-label">Exit:</span>
                          <span className="timing-value">
                            {dateUtils.formatDateTime(pass.departure_time)}
                          </span>
                        </div>
                        <div className="timing-item">
                          <span className="timing-label">Return:</span>
                          <span className="timing-value">
                            {dateUtils.formatDateTime(pass.return_time)}
                          </span>
                        </div>
                      </div>

                      {pass.approvals && (
                        <div className="pass-approvals">
                          <div className="approval-chain">
                            {pass.approvals.mentor && (
                              <div className="approval-item">
                                <span className="approval-role">Mentor:</span>
                                <span className={`approval-status ${pass.approvals.mentor.status}`}>
                                  {pass.approvals.mentor.status === 'approved' ? '✅' : '⏳'} 
                                  {pass.approvals.mentor.status}
                                </span>
                              </div>
                            )}
                            {pass.approvals.hod && (
                              <div className="approval-item">
                                <span className="approval-role">HOD:</span>
                                <span className={`approval-status ${pass.approvals.hod.status}`}>
                                  {pass.approvals.hod.status === 'approved' ? '✅' : '⏳'} 
                                  {pass.approvals.hod.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {user.role === 'student' && pass.student_id?._id === user._id && (
                      <div className="student-info">
                        <p className="student-name">👤 {pass.student_id.name}</p>
                        <p className="student-reg">{pass.student_id.student_id}</p>
                      </div>
                    )}
                  </div>

                  <div className="pass-actions">
                    <Link 
                      to={`/passes/${pass._id}`}
                      className="btn btn-outline btn-sm"
                    >
                      View Details
                    </Link>
                    
                    {canCancelPass(pass) && (
                      <button
                        onClick={() => handleCancelPass(pass._id)}
                        className="btn btn-danger btn-sm"
                      >
                        Cancel
                      </button>
                    )}
                    
                    {pass.status === 'approved' && pass.qrCode && (
                      <Link 
                        to={`/passes/${pass._id}/qr`}
                        className="btn btn-success btn-sm"
                      >
                        Show QR
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No passes found</h3>
              <p>
                {filters.status === 'all' 
                  ? "You haven't created any passes yet." 
                  : `No ${filters.status} passes found.`
                }
              </p>
              <Link to="/passes/create" className="btn btn-primary">
                Create Your First Pass
              </Link>
            </div>
          )}
        </motion.div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <motion.div 
            className="pagination-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="pagination">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              
              <div className="pagination-info">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PassList;