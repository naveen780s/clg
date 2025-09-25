const Notification = require('../models/Notification');

class NotificationService {
  constructor() {
    this.io = null;
  }

  initialize(io) {
    this.io = io;
  }

  async createNotification({ recipient, title, message, type, category = 'info', priority = 'medium', relatedPass = null, metadata = {} }) {
    try {
      const notification = new Notification({
        recipient,
        title,
        message,
        type,
        category,
        priority,
        relatedPass,
        metadata
      });

      await notification.save();

      // Send real-time notification
      if (this.io) {
        this.io.to(`user_${recipient}`).emit('new_notification', notification);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async createBulkNotifications(notifications) {
    try {
      const createdNotifications = [];

      for (const notificationData of notifications) {
        const notification = await this.createNotification(notificationData);
        createdNotifications.push(notification);
      }

      return createdNotifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  async getNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    try {
      const query = { recipient: userId };
      if (unreadOnly) {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('relatedPass', 'passId status')
        .populate('sender', 'name role');

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      // Emit read status update
      if (this.io && notification) {
        this.io.to(`user_${userId}`).emit('notification_read', {
          notificationId,
          readAt: notification.readAt
        });
      }

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      // Emit bulk read status update
      if (this.io) {
        this.io.to(`user_${userId}`).emit('all_notifications_read', {
          count: result.modifiedCount
        });
      }

      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });

      if (notification && this.io) {
        this.io.to(`user_${userId}`).emit('notification_deleted', {
          notificationId
        });
      }

      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false
      });
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Real-time pass status notification helper
  async notifyPassStatusUpdate(passId, pass, previousStatus) {
    try {
      const notifications = [];

      // Notify student
      notifications.push({
        userId: pass.studentId,
        title: 'Pass Status Updated',
        message: `Your ${pass.type} pass has been ${pass.status}`,
        type: pass.status === 'approved' ? 'success' : 
              pass.status === 'rejected' ? 'error' : 'info',
        data: { passId, status: pass.status, previousStatus }
      });

      // Notify mentor if pass is pending mentor approval
      if (pass.status === 'pending_mentor' && pass.mentorId) {
        notifications.push({
          userId: pass.mentorId,
          title: 'Pass Approval Required',
          message: `${pass.studentName} has requested a ${pass.type} pass`,
          type: 'warning',
          data: { passId, action: 'approval_required' }
        });
      }

      // Notify HOD if pass is pending HOD approval
      if (pass.status === 'pending_hod' && pass.hodId) {
        notifications.push({
          userId: pass.hodId,
          title: 'Pass Approval Required',
          message: `A ${pass.type} pass requires your approval`,
          type: 'warning',
          data: { passId, action: 'approval_required' }
        });
      }

      await this.createBulkNotifications(notifications);

      // Emit real-time pass update
      if (this.io) {
        this.io.emit('pass_status_updated', {
          passId,
          status: pass.status,
          previousStatus,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Error notifying pass status update:', error);
      throw error;
    }
  }

  // Gate pass specific notifications
  async notifyPassSubmitted(mentorId, studentId, passData) {
    try {
      await this.createNotification({
        recipient: mentorId,
        title: 'New Gate Pass Request',
        message: `${passData.studentName || 'A student'} has submitted a gate pass request for approval`,
        type: 'pass_submitted',
        category: 'info',
        priority: 'medium',
        relatedPass: passData._id || passData.passId,
        metadata: { 
          studentId,
          category: passData.category,
          reason: passData.reason
        }
      });
    } catch (error) {
      console.error('Error notifying pass submission:', error);
      throw error;
    }
  }

  async notifyPassApproved(studentId, passData, approverType) {
    try {
      const title = approverType === 'mentor' ? 'Pass Approved by Mentor' : 'Pass Fully Approved';
      const message = approverType === 'mentor' 
        ? 'Your gate pass has been approved by your mentor and forwarded to HOD'
        : 'Your gate pass has been fully approved and is ready to use';
      
      await this.createNotification({
        recipient: studentId,
        title,
        message,
        type: 'pass_approved',
        category: 'success',
        priority: 'high',
        relatedPass: passData._id || passData.passId,
        metadata: { 
          status: passData.status,
          approverType
        }
      });
    } catch (error) {
      console.error('Error notifying pass approval:', error);
      throw error;
    }
  }

  async notifyPassRejected(studentId, passData, approverType, reason) {
    try {
      await this.createNotification({
        recipient: studentId,
        title: 'Gate Pass Rejected',
        message: `Your gate pass has been rejected by ${approverType}${reason ? ': ' + reason : ''}`,
        type: 'pass_rejected',
        category: 'error',
        priority: 'high',
        relatedPass: passData._id || passData.passId,
        metadata: { 
          rejectedBy: approverType,
          reason
        }
      });
    } catch (error) {
      console.error('Error notifying pass rejection:', error);
      throw error;
    }
  }

  // Emergency notification system
  async sendEmergencyNotification(title, message, targetUsers = 'all') {
    try {
      if (this.io) {
        if (targetUsers === 'all') {
          this.io.emit('emergency_notification', { title, message });
        } else if (Array.isArray(targetUsers)) {
          targetUsers.forEach(userId => {
            this.io.to(`user_${userId}`).emit('emergency_notification', { title, message });
          });
        }
      }
    } catch (error) {
      console.error('Error sending emergency notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();