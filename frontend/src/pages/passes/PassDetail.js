import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import passService from '../../services/passService';
import { dateUtils } from '../../services/utils';
import Loader from '../../components/common/Loader';

const PassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPassDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPassDetails = async () => {
    try {
      setLoading(true);
      const response = await passService.getPassById(id);
      setPass(response.gatePass || response);
    } catch (error) {
      console.error('Error fetching pass details:', error);
      navigate('/passes');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (action, role, comments = '') => {
    try {
      setActionLoading(true);
      
      if (role === 'mentor') {
        await passService.mentorApproval(id, action, comments);
      } else if (role === 'hod') {
        await passService.hodApproval(id, action, comments);
      }
      
      fetchPassDetails();
    } catch (error) {
      console.error(`Error ${action} pass:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPass = async () => {
    try {
      await passService.cancelPass(id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error cancelling pass:', error);
    }
  };

  const canTakeAction = () => {
    if (!pass || actionLoading) return false;
    
    // Student can only cancel pending/approved passes
    if (user.role === 'student') {
      return pass.student_id?._id === user._id && 
             ['pending', 'mentor_approved', 'approved'].includes(pass.status) &&
             new Date(pass.departure_time) > new Date();
    }
    
    // Mentor can approve/reject pending passes
    if (user.role === 'mentor') {
      return pass.status === 'pending' && 
             pass.mentor_approval?.status === 'pending';
    }
    
    // HOD can approve/reject mentor-approved passes
    if (user.role === 'hod') {
      return pass.mentor_approval?.status === 'approved' && 
             pass.hod_approval?.status === 'pending';
    }
    
    return false;
  };

  const getStatusInfo = (status) => {
    const statusInfo = {
      pending: { color: 'warning', icon: '⏳', text: 'Awaiting Approval' },
      approved: { color: 'success', icon: '✅', text: 'Approved' },
      rejected: { color: 'danger', icon: '❌', text: 'Rejected' },
      active: { color: 'info', icon: '🏃', text: 'Active - Student Out' },
      completed: { color: 'success', icon: '✨', text: 'Completed' },
      expired: { color: 'secondary', icon: '⏰', text: 'Expired' },
      cancelled: { color: 'danger', icon: '🚫', text: 'Cancelled' }
    };
    return statusInfo[status] || { color: 'secondary', icon: '📄', text: status };
  };

  if (loading) {
    return <Loader message="Loading pass details..." />;
  }

  if (!pass) {
    return (
      <div className="error-page">
        <h2>Pass not found</h2>
        <Link to="/passes" className="btn btn-primary">Back to Passes</Link>
      </div>
    );
  }

  const statusInfo = getStatusInfo(pass.status);

  return (
    <div className="pass-detail-page">
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
              <Link to="/passes">Passes</Link> / Pass Details
            </div>
            <h1 className="page-title">
              Gate Pass Details 🎫
            </h1>
            <div className="pass-status-header">
              <span className={`status-badge large ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.text}
              </span>
            </div>
          </div>
          
          <div className="header-actions">
            {pass.status === 'approved' && pass.qrCode && (
              <Link 
                to={`/passes/${pass._id}/qr`} 
                className="btn btn-success"
              >
                <span>Show QR Code</span>
                <div className="btn-icon">📱</div>
              </Link>
            )}
            <Link to="/passes" className="btn btn-outline">
              Back to List
            </Link>
          </div>
        </motion.div>

        <div className="pass-detail-content">
          <div className="detail-main">
            {/* Pass Information */}
            <motion.div 
              className="detail-section pass-info"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h2 className="section-title">Pass Information</h2>
              
              <div className="info-grid">
                <div className="info-item">
                  <label>Pass ID:</label>
                  <span className="info-value secondary">{pass.passId}</span>
                </div>
                
                <div className="info-item">
                  <label>Reason for Exit:</label>
                  <span className="info-value primary">{pass.reason}</span>
                </div>
                
                <div className="info-item">
                  <label>Category:</label>
                  <span className="info-value">🏷️ {pass.category?.charAt(0).toUpperCase() + pass.category?.slice(1)}</span>
                </div>
                
                <div className="info-item">
                  <label>Destination:</label>
                  <span className="info-value">📍 {pass.destination}</span>
                </div>
                
                <div className="info-item">
                  <label>Priority:</label>
                  <span className={`info-value ${pass.priority === 'high' ? 'danger' : pass.priority === 'medium' ? 'warning' : 'success'}`}>
                    {pass.priority === 'high' ? '🔴' : pass.priority === 'medium' ? '🟡' : '🟢'} {pass.priority?.charAt(0).toUpperCase() + pass.priority?.slice(1)}
                  </span>
                </div>
                
                <div className="info-item">
                  <label>Departure Time:</label>
                  <span className="info-value">
                    🕐 {dateUtils.formatDateTime(pass.departure_time)}
                  </span>
                </div>
                
                <div className="info-item">
                  <label>Expected Return:</label>
                  <span className="info-value">
                    🕐 {dateUtils.formatDateTime(pass.return_time)}
                  </span>
                </div>
                
                {pass.entry_time && (
                  <div className="info-item">
                    <label>Actual Return:</label>
                    <span className="info-value success">
                      ✅ {dateUtils.formatDateTime(pass.entry_time)}
                    </span>
                  </div>
                )}
                
                <div className="info-item">
                  <label>Created:</label>
                  <span className="info-value">
                    {dateUtils.formatDateTime(pass.createdAt)}
                  </span>
                </div>
              </div>

              {/* Emergency Contact Information */}
              {pass.emergency_contact && (
                <div className="emergency-contact">
                  <label>Emergency Contact:</label>
                  <div className="contact-details">
                    <div className="contact-item">
                      <span className="contact-label">Name:</span>
                      <span className="contact-value">{pass.emergency_contact.name}</span>
                    </div>
                    <div className="contact-item">
                      <span className="contact-label">Relation:</span>
                      <span className="contact-value">{pass.emergency_contact.relation}</span>
                    </div>
                    <div className="contact-item">
                      <span className="contact-label">Phone:</span>
                      <span className="contact-value">📞 {pass.emergency_contact.phone}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Student Information */}
            <motion.div 
              className="detail-section student-info"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="section-title">Student Information</h2>
              
              <div className="student-card">
                <div className="student-avatar">
                  {pass.student_id?.name?.charAt(0) || '?'}
                </div>
                <div className="student-details">
                  <h3 className="student-name">{pass.student_id?.name || 'Unknown Student'}</h3>
                  <p className="student-reg">📋 {pass.student_id?.student_id || pass.student_id?.regNumber || 'N/A'}</p>
                  <p className="student-year">🎓 {pass.student_id?.year} Year</p>
                  <p className="student-dept">🏛️ {pass.student_id?.department}</p>
                  {pass.student_id?.phone && (
                    <p className="student-contact">📞 {pass.student_id.phone}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Approval Timeline */}
            <motion.div 
              className="detail-section approval-timeline"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h2 className="section-title">Approval Timeline</h2>
              
              <div className="timeline">
                {/* Student Request */}
                <div className="timeline-item completed">
                  <div className="timeline-icon">👤</div>
                  <div className="timeline-content">
                    <h4>Pass Request Submitted</h4>
                    <p>by {pass.student_id?.name || 'Student'}</p>
                    <span className="timeline-time">
                      {dateUtils.formatDateTime(pass.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Mentor Approval */}
                <div className={`timeline-item ${
                  pass.mentor_approval?.status === 'approved' ? 'completed' :
                  pass.mentor_approval?.status === 'rejected' ? 'rejected' :
                  'pending'
                }`}>
                  <div className="timeline-icon">👨‍🏫</div>
                  <div className="timeline-content">
                    <h4>Mentor Review</h4>
                    {pass.mentor_approval && pass.mentor_approval.status !== 'pending' ? (
                      <>
                        <p>
                          {pass.mentor_approval.status === 'approved' && '✅ Approved'}
                          {pass.mentor_approval.status === 'rejected' && '❌ Rejected'}
                          {pass.mentor_approval.approved_by && 
                            ` by ${pass.mentor_approval.approved_by.name || 'Mentor'}`
                          }
                        </p>
                        {pass.mentor_approval.comments && (
                          <p className="approval-comments">
                            💬 {pass.mentor_approval.comments}
                          </p>
                        )}
                        {pass.mentor_approval.timestamp && (
                          <span className="timeline-time">
                            {dateUtils.formatDateTime(pass.mentor_approval.timestamp)}
                          </span>
                        )}
                      </>
                    ) : (
                      <p>⏳ Awaiting mentor review</p>
                    )}
                  </div>
                </div>

                {/* HOD Approval */}
                <div className={`timeline-item ${
                  pass.hod_approval?.status === 'approved' ? 'completed' :
                  pass.hod_approval?.status === 'rejected' ? 'rejected' :
                  pass.mentor_approval?.status === 'approved' ? 'pending' : 'disabled'
                }`}>
                  <div className="timeline-icon">👨‍💼</div>
                  <div className="timeline-content">
                    <h4>HOD Final Approval</h4>
                    {pass.hod_approval && pass.hod_approval.status !== 'pending' ? (
                      <>
                        <p>
                          {pass.hod_approval.status === 'approved' && '✅ Approved'}
                          {pass.hod_approval.status === 'rejected' && '❌ Rejected'}
                          {pass.hod_approval.approved_by && 
                            ` by ${pass.hod_approval.approved_by.name || 'HOD'}`
                          }
                        </p>
                        {pass.hod_approval.comments && (
                          <p className="approval-comments">
                            💬 {pass.hod_approval.comments}
                          </p>
                        )}
                        {pass.hod_approval.timestamp && (
                          <span className="timeline-time">
                            {dateUtils.formatDateTime(pass.hod_approval.timestamp)}
                          </span>
                        )}
                      </>
                    ) : pass.mentor_approval?.status === 'approved' ? (
                      <p>⏳ Awaiting HOD approval</p>
                    ) : (
                      <p>⚪ Waiting for mentor approval</p>
                    )}
                  </div>
                </div>

                {/* Security Checkout */}
                {pass.status === 'used' || pass.isUsed ? (
                  <div className="timeline-item completed">
                    <div className="timeline-icon">🛡️</div>
                    <div className="timeline-content">
                      <h4>Security Checkout</h4>
                      <p>✅ Student checked out</p>
                      {pass.usedAt && (
                        <span className="timeline-time">
                          {dateUtils.formatDateTime(pass.usedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : pass.status === 'approved' ? (
                  <div className="timeline-item pending">
                    <div className="timeline-icon">🛡️</div>
                    <div className="timeline-content">
                      <h4>Security Checkout</h4>
                      <p>⏳ Ready for checkout</p>
                    </div>
                  </div>
                ) : null}

                {/* Security Checkin */}
                {pass.entry_time && (
                  <div className="timeline-item completed">
                    <div className="timeline-icon">🏠</div>
                    <div className="timeline-content">
                      <h4>Return Check-in</h4>
                      <p>✅ Student returned</p>
                      <span className="timeline-time">
                        {dateUtils.formatDateTime(pass.entry_time)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Actions Sidebar */}
          <div className="detail-sidebar">
            {/* Action Buttons */}
            {canTakeAction() && (
              <motion.div 
                className="sidebar-section actions"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h3 className="sidebar-title">Actions</h3>
                
                {user.role === 'student' && (
                  <div className="action-buttons">
                    <button
                      onClick={handleCancelPass}
                      disabled={actionLoading}
                      className="btn btn-danger btn-block"
                    >
                      {actionLoading ? 'Cancelling...' : '🚫 Cancel Pass'}
                    </button>
                  </div>
                )}

                {user.role === 'mentor' && (
                  <div className="action-buttons">
                    <button
                      onClick={() => handleApproval('approve', 'mentor')}
                      disabled={actionLoading}
                      className="btn btn-success btn-block"
                    >
                      {actionLoading ? 'Processing...' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for rejection (optional):');
                        if (reason !== null) {
                          handleApproval('reject', 'mentor', reason);
                        }
                      }}
                      disabled={actionLoading}
                      className="btn btn-danger btn-block"
                    >
                      {actionLoading ? 'Processing...' : '❌ Reject'}
                    </button>
                  </div>
                )}

                {user.role === 'hod' && (
                  <div className="action-buttons">
                    <button
                      onClick={() => handleApproval('approve', 'hod')}
                      disabled={actionLoading}
                      className="btn btn-success btn-block"
                    >
                      {actionLoading ? 'Processing...' : '✅ Final Approve'}
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for rejection (optional):');
                        if (reason !== null) {
                          handleApproval('reject', 'hod', reason);
                        }
                      }}
                      disabled={actionLoading}
                      className="btn btn-danger btn-block"
                    >
                      {actionLoading ? 'Processing...' : '❌ Reject'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Quick Info */}
            <motion.div 
              className="sidebar-section quick-info"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h3 className="sidebar-title">Quick Info</h3>
              
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Pass ID:</span>
                  <span className="info-value">{pass._id.slice(-6)}</span>
                </div>
                
                <div className="info-row">
                  <span className="info-label">Duration:</span>
                  <span className="info-value">
                    {Math.ceil(
                      (new Date(pass.return_time) - new Date(pass.departure_time)) / 
                      (1000 * 60 * 60)
                    )} hours
                  </span>
                </div>
                
                {(pass.status === 'used' || pass.isUsed) && (
                  <div className="info-row">
                    <span className="info-label">Time Out:</span>
                    <span className="info-value warning">
                      {Math.floor(
                        (new Date() - new Date(pass.usedAt || pass.departure_time)) / 
                        (1000 * 60)
                      )} minutes
                    </span>
                  </div>
                )}
                
                <div className="info-row">
                  <span className="info-label">Priority:</span>
                  <span className={`info-value ${
                    new Date(pass.departure_time) <= new Date() ? 'danger' : 
                    new Date(pass.departure_time) <= new Date(Date.now() + 2 * 60 * 60 * 1000) ? 'warning' : 
                    'success'
                  }`}>
                    {new Date(pass.departure_time) <= new Date() ? 'Urgent' : 
                     new Date(pass.departure_time) <= new Date(Date.now() + 2 * 60 * 60 * 1000) ? 'Soon' : 
                     'Normal'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Related Actions */}
            <motion.div 
              className="sidebar-section related-actions"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h3 className="sidebar-title">Related</h3>
              
              <div className="related-links">
                <Link to="/passes" className="related-link">
                  📋 All Passes
                </Link>
                
                {user.role === 'student' && (
                  <Link to="/passes/create" className="related-link">
                    ➕ Create New Pass
                  </Link>
                )}
                
                <Link to="/notifications" className="related-link">
                  🔔 Notifications
                </Link>
                
                {(user.role === 'mentor' || user.role === 'hod') && (
                  <Link to="/approvals" className="related-link">
                    ⚡ Approval Queue
                  </Link>
                )}
              </div>
            </motion.div>

            {/* QR Code Preview */}
            {pass.status === 'approved' && pass.qrCode && (
              <motion.div 
                className="sidebar-section qr-preview"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <h3 className="sidebar-title">QR Code</h3>
                
                <div className="qr-container">
                  <div className="qr-placeholder">
                    <div className="qr-icon">📱</div>
                    <p>QR Code Ready</p>
                  </div>
                  <Link 
                    to={`/passes/${pass._id}/qr`}
                    className="btn btn-success btn-sm btn-block"
                  >
                    View Full QR
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassDetail;