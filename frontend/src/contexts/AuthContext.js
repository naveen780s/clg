import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import authService from '../services/authService';
import { authReducer, initialState } from '../reducers/authReducer';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch({ type: 'AUTH_LOADING' });
      
      const token = localStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'AUTH_LOADING_COMPLETE' });
        return;
      }

      // Verify token with backend
      const userData = await authService.verifyToken();
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: userData.user,
          token: token
        }
      });

      // Show welcome back message (only for returning users)
      if (userData.user.last_login) {
        toast.success(`Welcome back, ${userData.user.name}! 👋`, {
          duration: 3000,
          icon: '🎒',
        });
      }

    } catch (error) {
      console.error('Auth initialization error:', error);
      
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      dispatch({ type: 'AUTH_LOADING_COMPLETE' });
    }
  };

  const login = async (credentials) => {
    try {
      dispatch({ type: 'AUTH_LOADING' });
      
      const response = await authService.login(credentials);
      
      // Store tokens
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.token
        }
      });

      // Show success message with role-specific emoji
      const roleEmojis = {
        student: '🎓',
        mentor: '👨‍🏫',
        hod: '👔',
        security: '🛡️'
      };
      
      toast.success(
        `Welcome ${response.user.name}! ${roleEmojis[response.user.role] || '👋'}`,
        {
          duration: 4000,
          style: {
            background: 'var(--success-light)',
            color: 'var(--ink-black)',
          }
        }
      );

      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      
      dispatch({
        type: 'AUTH_ERROR',
        payload: errorMessage
      });

      toast.error(errorMessage, {
        duration: 5000,
        style: {
          background: 'var(--error-light)',
          color: 'var(--ink-black)',
        }
      });

      throw error;
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'AUTH_LOADING' });
      
      const response = await authService.register(userData);
      
      // Store tokens
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.token
        }
      });

      toast.success(
        `Account created successfully! Welcome to College Gate Pass System! 🎉`,
        {
          duration: 6000,
          style: {
            background: 'var(--success-light)',
            color: 'var(--ink-black)',
          }
        }
      );

      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      
      dispatch({
        type: 'AUTH_ERROR',
        payload: errorMessage
      });

      toast.error(errorMessage, {
        duration: 5000,
        style: {
          background: 'var(--error-light)',
          color: 'var(--ink-black)',
        }
      });

      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint (for cleanup)
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Clear auth state
      dispatch({ type: 'AUTH_LOGOUT' });
      
      toast.success('Logged out successfully! See you soon! 👋', {
        duration: 3000,
        style: {
          background: 'var(--info-light)',
          color: 'var(--ink-black)',
        }
      });
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      
      dispatch({
        type: 'UPDATE_USER',
        payload: response.user
      });

      toast.success('Profile updated successfully! ✨', {
        duration: 3000,
        style: {
          background: 'var(--success-light)',
          color: 'var(--ink-black)',
        }
      });

      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      
      toast.error(errorMessage, {
        duration: 4000,
        style: {
          background: 'var(--error-light)',
          color: 'var(--ink-black)',
        }
      });

      throw error;
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await authService.changePassword(passwordData);
      
      toast.success('Password changed successfully! 🔒', {
        duration: 3000,
        style: {
          background: 'var(--success-light)',
          color: 'var(--ink-black)',
        }
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      
      toast.error(errorMessage, {
        duration: 4000,
        style: {
          background: 'var(--error-light)',
          color: 'var(--ink-black)',
        }
      });

      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authService.refreshToken(storedRefreshToken);
      
      // Update stored token
      localStorage.setItem('token', response.token);
      
      dispatch({
        type: 'TOKEN_REFRESHED',
        payload: response.token
      });

      return response.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Force logout on refresh failure
      logout();
      throw error;
    }
  };

  // Clear auth error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Check if user has specific permission
  const hasPermission = (permission) => {
    return state.user?.permissions?.includes(permission) || false;
  };

  // Check if user has specific role
  const hasRole = (role) => {
    if (Array.isArray(role)) {
      return role.includes(state.user?.role);
    }
    return state.user?.role === role;
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!state.user?.name) return 'U';
    return state.user.name
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get user status badge info
  const getUserStatusInfo = () => {
    if (!state.user) return null;

    const statusMap = {
      student: { label: 'Student', color: 'primary', emoji: '🎓' },
      mentor: { label: 'Mentor', color: 'secondary', emoji: '👨‍🏫' },
      hod: { label: 'HOD', color: 'accent', emoji: '👔' },
      security: { label: 'Security', color: 'info', emoji: '🛡️' }
    };

    return statusMap[state.user.role] || { label: 'User', color: 'gray', emoji: '👤' };
  };

  const value = {
    // State
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
    clearError,
    
    // Utilities
    hasPermission,
    hasRole,
    getUserInitials,
    getUserStatusInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};