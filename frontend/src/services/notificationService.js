import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const notificationService = {
  // Get user notifications
  getNotifications: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        queryParams.append(key, filters[key]);
      }
    });

    const response = await api.get(`/notifications?${queryParams.toString()}`);
    return response.data.notifications || response.data.data || [];
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/mark-all-read');
    return response.data;
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  // Get unread notifications count
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data.data;
  },

  // Get notification preferences
  getPreferences: async () => {
    const response = await api.get('/notifications/preferences');
    return response.data.data;
  },

  // Update notification preferences
  updatePreferences: async (preferences) => {
    const response = await api.put('/notifications/preferences', preferences);
    return response.data.data;
  },

  // Send notification (for admins/system)
  sendNotification: async (notificationData) => {
    const response = await api.post('/notifications/send', notificationData);
    return response.data.data;
  },

  // Send bulk notifications
  sendBulkNotification: async (bulkData) => {
    const response = await api.post('/notifications/send-bulk', bulkData);
    return response.data.data;
  },

  // Subscribe to push notifications
  subscribeToPush: async (subscription) => {
    const response = await api.post('/notifications/subscribe-push', subscription);
    return response.data;
  },

  // Unsubscribe from push notifications
  unsubscribeFromPush: async () => {
    const response = await api.post('/notifications/unsubscribe-push');
    return response.data;
  },

  // Test notification (for development)
  testNotification: async () => {
    const response = await api.post('/notifications/test');
    return response.data;
  },
};

export default notificationService;