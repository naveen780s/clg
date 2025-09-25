import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const { user, token } = useAuth();

  // Initialize socket connection
  useEffect(() => {
    if (user && token) {
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', {
        auth: {
          token: token,
          userId: user._id,
          role: user.role,
          department: user.department
        },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
      };
    }
  }, [user, token]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 Connected to server');
      setIsConnected(true);
      
      // Join user room for personalized notifications
      socket.emit('join', user._id);
      
      // Join role-specific rooms
      socket.emit('join_role', {
        userId: user._id,
        role: user.role,
        department: user.department
      });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Gate pass notifications
    socket.on('new_pass_request', (data) => {
      toast.success(`📋 New gate pass request from ${data.student}`, {
        duration: 5000,
        onClick: () => window.location.href = '/approvals',
        style: {
          cursor: 'pointer',
          background: 'var(--info-light)',
          color: 'var(--ink-black)',
        }
      });
      
      // Add to notifications
      setNotifications(prev => [{
        id: Date.now(),
        type: 'pass_request',
        message: `New gate pass request from ${data.student}`,
        timestamp: new Date(),
        data: data
      }, ...prev]);
    });

    socket.on('pass_approved', (data) => {
      const message = data.type === 'mentor' 
        ? `✅ Your gate pass has been approved by ${data.approver}. Waiting for HOD approval.`
        : `🎉 Your gate pass has been fully approved by ${data.approver}!`;
      
      toast.success(message, {
        duration: 6000,
        onClick: () => window.location.href = `/passes/${data.pass._id}`,
        style: {
          cursor: 'pointer',
          background: 'var(--success-light)',
          color: 'var(--ink-black)',
        }
      });
      
      setNotifications(prev => [{
        id: Date.now(),
        type: 'pass_approved',
        message: message,
        timestamp: new Date(),
        data: data
      }, ...prev]);
    });

    socket.on('pass_rejected', (data) => {
      toast.error(`❌ Your gate pass has been rejected by ${data.rejector}${data.reason ? `: ${data.reason}` : ''}`, {
        duration: 7000,
        onClick: () => window.location.href = `/passes/${data.pass._id}`,
        style: {
          cursor: 'pointer',
          background: 'var(--error-light)',
          color: 'var(--ink-black)',
        }
      });
      
      setNotifications(prev => [{
        id: Date.now(),
        type: 'pass_rejected',
        message: `Pass rejected by ${data.rejector}`,
        timestamp: new Date(),
        data: data
      }, ...prev]);
    });

    socket.on('pass_used', (data) => {
      toast.info(`🚪 Your gate pass has been used for exit by ${data.usedBy}`, {
        duration: 4000,
        style: {
          background: 'var(--info-light)',
          color: 'var(--ink-black)',
        }
      });
      
      setNotifications(prev => [{
        id: Date.now(),
        type: 'pass_used',
        message: `Gate pass used for exit`,
        timestamp: new Date(),
        data: data
      }, ...prev]);
    });

    socket.on('pass_fully_approved', (data) => {
      toast.success(`🎊 Congratulations! Your gate pass is now ready to use!`, {
        duration: 8000,
        onClick: () => window.location.href = `/passes/${data.pass._id}`,
        style: {
          cursor: 'pointer',
          background: 'var(--success)',
          color: 'white',
        }
      });
    });

    socket.on('pass_expired', (data) => {
      toast.warning(`⏰ Your gate pass has expired`, {
        duration: 5000,
        style: {
          background: 'var(--warning-light)',
          color: 'var(--ink-black)',
        }
      });
      
      setNotifications(prev => [{
        id: Date.now(),
        type: 'pass_expired',
        message: 'Gate pass expired',
        timestamp: new Date(),
        data: data
      }, ...prev]);
    });

    // System notifications
    socket.on('system_notification', (data) => {
      toast(data.message, {
        icon: data.icon || '📢',
        duration: data.duration || 4000,
        style: {
          background: 'var(--secondary-light)',
          color: 'var(--ink-black)',
        }
      });
      
      setNotifications(prev => [{
        id: Date.now(),
        type: 'system',
        message: data.message,
        timestamp: new Date(),
        data: data
      }, ...prev]);
    });

    // Online users update
    socket.on('users_online', (usersList) => {
      setOnlineUsers(usersList);
    });

    // Cleanup listeners
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('new_pass_request');
      socket.off('pass_approved');
      socket.off('pass_rejected');
      socket.off('pass_used');
      socket.off('pass_fully_approved');
      socket.off('pass_expired');
      socket.off('system_notification');
      socket.off('users_online');
    };
  }, [socket, user]);

  // Emit custom events
  const emitEvent = useCallback((eventName, data) => {
    if (socket && isConnected) {
      socket.emit(eventName, data);
    }
  }, [socket, isConnected]);

  // Join a specific room
  const joinRoom = useCallback((roomName) => {
    if (socket && isConnected) {
      socket.emit('join_room', roomName);
    }
  }, [socket, isConnected]);

  // Leave a specific room
  const leaveRoom = useCallback((roomName) => {
    if (socket && isConnected) {
      socket.emit('leave_room', roomName);
    }
  }, [socket, isConnected]);

  // Send real-time message
  const sendMessage = useCallback((message, roomName) => {
    if (socket && isConnected) {
      socket.emit('send_message', {
        message,
        room: roomName,
        sender: user._id,
        timestamp: new Date()
      });
    }
  }, [socket, isConnected, user]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  }, []);

  // Get unread notification count
  const getUnreadCount = useCallback(() => {
    return notifications.length;
  }, [notifications]);

  // Connection status indicator
  const getConnectionStatus = useCallback(() => {
    if (!socket) return 'disconnected';
    if (isConnected) return 'connected';
    return 'connecting';
  }, [socket, isConnected]);

  const value = {
    // State
    socket,
    isConnected,
    onlineUsers,
    notifications,

    // Actions
    emitEvent,
    joinRoom,
    leaveRoom,
    sendMessage,
    clearNotifications,
    removeNotification,

    // Utilities
    getUnreadCount,
    getConnectionStatus,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};