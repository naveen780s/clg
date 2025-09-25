import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import notificationService from '../services/notificationService';
import { dateUtils } from '../services/utils';
import Loader from '../components/common/Loader';

const NotificationsPage = () => {
  const { user } = useAuth();
  const { notifications: liveNotifications } = useSocket();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.size === 0) return;
    
    if (window.confirm(`Delete ${selectedNotifications.size} notifications?`)) {
      try {
        await Promise.all(
          Array.from(selectedNotifications).map(id => 
            notificationService.deleteNotification(id)
          )
        );
        
        setNotifications(prev => 
          prev.filter(notif => !selectedNotifications.has(notif._id))
        );
        setSelectedNotifications(new Set());
      } catch (error) {
        console.error('Error deleting notifications:', error);
      }
    }
  };

  const handleSelectAll = () => {
    const filteredNotifs = getFilteredNotifications();
    if (selectedNotifications.size === filteredNotifs.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifs.map(n => n._id)));
    }
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    switch (filter) {
      case 'unread':
        filtered = notifications.filter(n => !n.read);
        break;
      case 'read':
        filtered = notifications.filter(n => n.read);
        break;
      case 'pass_approved':
        filtered = notifications.filter(n => n.type === 'pass_approved');
        break;
      case 'pass_rejected':
        filtered = notifications.filter(n => n.type === 'pass_rejected');
        break;
      case 'pass_submitted':
        filtered = notifications.filter(n => n.type === 'pass_submitted');
        break;
      case 'system':
        filtered = notifications.filter(n => n.type === 'system');
        break;
      default:
        break;
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getNotificationIcon = (type) => {
    const icons = {
      pass_submitted: '📝',
      pass_approved: '✅',
      pass_rejected: '❌',
      pass_expired: '⏰',
      checkout_reminder: '🚪',
      return_reminder: '🏠',
      overdue_alert: '⚠️',
      system: '🔧',
      security: '🛡️',
      general: '📢'
    };
    return icons[type] || '📄';
  };

  const getNotificationColor = (type, read) => {
    if (read) return 'read';
    
    const colors = {
      pass_approved: 'success',
      pass_rejected: 'danger',
      pass_submitted: 'info',
      overdue_alert: 'warning',
      system: 'secondary'
    };
    return colors[type] || 'primary';
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <Loader message="Loading notifications..." />;
  }

  return (
    <div className="notifications-page">
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
              Notifications 🔔
            </h1>
            <p className="page-subtitle">
              {unreadCount > 0 ? (
                <span className="unread-count">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </span>
              ) : (
                'All caught up!'
              )}
            </p>
          </div>
          
          <div className="header-actions">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="btn btn-outline"
              >
                <span>Mark All Read</span>
                <div className="btn-icon">✅</div>
              </button>
            )}
            
            {selectedNotifications.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="btn btn-danger"
              >
                <span>Delete Selected ({selectedNotifications.size})</span>
                <div className="btn-icon">🗑️</div>
              </button>
            )}
          </div>
        </motion.div>

        {/* Live Notifications Alert */}
        {liveNotifications.length > 0 && (
          <motion.div 
            className="live-notifications-alert"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="alert alert-info">
              <div className="alert-icon">🔔</div>
              <div className="alert-content">
                <strong>New notifications received!</strong>
                <button 
                  onClick={fetchNotifications}
                  className="btn btn-sm btn-primary"
                >
                  Refresh to see latest
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters and Controls */}
        <motion.div 
          className="notifications-controls"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="filter-section">
            <div className="filter-group">
              <label>Filter:</label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Notifications</option>
                <option value="unread">Unread Only</option>
                <option value="read">Read Only</option>
                <option value="pass_approved">Pass Approved</option>
                <option value="pass_rejected">Pass Rejected</option>
                <option value="pass_submitted">New Submissions</option>
                <option value="system">System Alerts</option>
              </select>
            </div>
            
            <div className="bulk-actions">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                  onChange={handleSelectAll}
                />
                <span className="checkmark"></span>
                Select All ({filteredNotifications.length})
              </label>
            </div>
          </div>
        </motion.div>

        {/* Notifications List */}
        <motion.div 
          className="notifications-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {filteredNotifications.length > 0 ? (
            <div className="notifications-list">
              {filteredNotifications.map((notification, index) => (
                <motion.div 
                  key={notification._id}
                  className={`notification-card ${getNotificationColor(notification.type, notification.read)} ${
                    selectedNotifications.has(notification._id) ? 'selected' : ''
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <div className="notification-selector">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.has(notification._id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedNotifications);
                          if (e.target.checked) {
                            newSelected.add(notification._id);
                          } else {
                            newSelected.delete(notification._id);
                          }
                          setSelectedNotifications(newSelected);
                        }}
                      />
                      <span className="checkmark"></span>
                    </label>
                  </div>

                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-content">
                    <div className="notification-header">
                      <h4 className="notification-title">
                        {notification.title}
                        {!notification.read && <span className="unread-indicator">●</span>}
                      </h4>
                      <span className="notification-time">
                        {dateUtils.formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="notification-message">
                      {notification.message}
                    </p>

                    {notification.data && (
                      <div className="notification-metadata">
                        {notification.data.passId && (
                          <Link 
                            to={`/passes/${notification.data.passId}`}
                            className="notification-link"
                          >
                            View Pass →
                          </Link>
                        )}
                        
                        {notification.data.studentName && (
                          <span className="metadata-item">
                            👤 {notification.data.studentName}
                          </span>
                        )}
                        
                        {notification.data.reason && (
                          <span className="metadata-item">
                            📝 {notification.data.reason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="notification-actions">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="action-btn read-btn"
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    
                    <button
                      onClick={async () => {
                        if (window.confirm('Delete this notification?')) {
                          try {
                            await notificationService.deleteNotification(notification._id);
                            setNotifications(prev => 
                              prev.filter(n => n._id !== notification._id)
                            );
                          } catch (error) {
                            console.error('Error deleting notification:', error);
                          }
                        }
                      }}
                      className="action-btn delete-btn"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                {filter === 'unread' ? '✅' : '🔔'}
              </div>
              <h3>
                {filter === 'unread' ? 'All caught up!' : 'No notifications'}
              </h3>
              <p>
                {filter === 'unread' 
                  ? "You don't have any unread notifications."
                  : "You don't have any notifications yet."
                }
              </p>
              
              {user.role === 'student' && (
                <Link to="/passes/create" className="btn btn-primary">
                  Create a Pass to Get Started
                </Link>
              )}
            </div>
          )}
        </motion.div>

        {/* Notification Settings */}
        <motion.div 
          className="notification-settings"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="settings-section">
            <h3>Notification Preferences</h3>
            <p className="settings-description">
              Configure what notifications you want to receive
            </p>
            
            <div className="preference-grid">
              <div className="preference-item">
                <div className="preference-content">
                  <h5>📝 Pass Updates</h5>
                  <p>Get notified when your pass status changes</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-content">
                  <h5>⏰ Reminders</h5>
                  <p>Receive checkout and return time reminders</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-content">
                  <h5>🔔 Real-time Alerts</h5>
                  <p>Instant notifications for urgent updates</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {(user.role === 'mentor' || user.role === 'hod') && (
                <div className="preference-item">
                  <div className="preference-content">
                    <h5>📋 Approval Requests</h5>
                    <p>New passes waiting for your approval</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              )}

              {user.role === 'security' && (
                <div className="preference-item">
                  <div className="preference-content">
                    <h5>🛡️ Security Alerts</h5>
                    <p>Overdue returns and security notifications</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotificationsPage;