const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');

// Get notifications for the current user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user.id;

    const result = await NotificationService.getNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notifications',
      message: error.message 
    });
  }
});

// Get unread notification count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await NotificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ 
      error: 'Failed to fetch unread count',
      message: error.message 
    });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await NotificationService.markAsRead(notificationId, userId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ 
      message: 'Notification marked as read',
      notification 
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark notification as read',
      message: error.message 
    });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await NotificationService.markAllAsRead(userId);

    res.json({ 
      message: 'All notifications marked as read',
      count: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark all notifications as read',
      message: error.message 
    });
  }
});

// Delete notification
router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await NotificationService.deleteNotification(notificationId, userId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      error: 'Failed to delete notification',
      message: error.message 
    });
  }
});

// Create test notification (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test', async (req, res) => {
    try {
      const { title, message, type = 'info' } = req.body;
      const userId = req.user.id;

      const notification = await NotificationService.createNotification({
        userId,
        title,
        message,
        type
      });

      res.json({ 
        message: 'Test notification created',
        notification 
      });
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({ 
        error: 'Failed to create test notification',
        message: error.message 
      });
    }
  });
}

// Send emergency notification (admin only)
router.post('/emergency', async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }

    const { title, message, targetUsers = 'all' } = req.body;

    await NotificationService.sendEmergencyNotification(title, message, targetUsers);

    res.json({ message: 'Emergency notification sent successfully' });
  } catch (error) {
    console.error('Error sending emergency notification:', error);
    res.status(500).json({ 
      error: 'Failed to send emergency notification',
      message: error.message 
    });
  }
});

module.exports = router;