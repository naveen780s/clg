// API Response utilities
export const apiResponse = {
  success: (data) => ({
    success: true,
    data,
    error: null,
  }),

  error: (error) => ({
    success: false,
    data: null,
    error: error.message || 'An error occurred',
  }),
};

// Date utilities
export const dateUtils = {
  formatDate: (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  formatDateTime: (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  formatTime: (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  isToday: (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return (
      checkDate.getDate() === today.getDate() &&
      checkDate.getMonth() === today.getMonth() &&
      checkDate.getFullYear() === today.getFullYear()
    );
  },

  isFuture: (date) => {
    return new Date(date) > new Date();
  },

  isPast: (date) => {
    return new Date(date) < new Date();
  },

  getTimeUntil: (date) => {
    const now = new Date();
    const target = new Date(date);
    const diff = target - now;

    if (diff <= 0) return 'Past due';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },
};

// Storage utilities
export const storageUtils = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};

// Validation utilities
export const validationUtils = {
  isEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isPhone: (phone) => {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  isStrongPassword: (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  },

  isValidRegNumber: (regNumber) => {
    // College registration number format (customize as needed)
    const regNumberRegex = /^[0-9]{2}[A-Z]{2}[0-9]{4}$/;
    return regNumberRegex.test(regNumber);
  },

  validatePassData: (passData) => {
    const errors = {};

    if (!passData.reason || passData.reason.trim().length < 10) {
      errors.reason = 'Reason must be at least 10 characters long';
    }

    if (!passData.exitTime) {
      errors.exitTime = 'Exit time is required';
    }

    if (!passData.expectedReturnTime) {
      errors.expectedReturnTime = 'Expected return time is required';
    }

    if (passData.exitTime && passData.expectedReturnTime) {
      if (new Date(passData.exitTime) >= new Date(passData.expectedReturnTime)) {
        errors.expectedReturnTime = 'Return time must be after exit time';
      }
    }

    if (passData.exitTime && new Date(passData.exitTime) <= new Date()) {
      errors.exitTime = 'Exit time must be in the future';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};

// Format utilities
export const formatUtils = {
  capitalize: (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  titleCase: (str) => {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  truncate: (str, length = 50) => {
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  },

  formatPassStatus: (status) => {
    const statusMap = {
      pending: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
      active: 'Active',
      completed: 'Completed',
      expired: 'Expired',
    };
    return statusMap[status] || status;
  },

  formatUserRole: (role) => {
    const roleMap = {
      student: 'Student',
      mentor: 'Mentor',
      hod: 'Head of Department',
      security: 'Security',
      admin: 'Administrator',
    };
    return roleMap[role] || role;
  },

  formatDepartment: (dept) => {
    const deptMap = {
      cse: 'Computer Science',
      ece: 'Electronics & Communication',
      me: 'Mechanical Engineering',
      ce: 'Civil Engineering',
      eee: 'Electrical Engineering',
      it: 'Information Technology',
    };
    return deptMap[dept] || dept;
  },
};

// Error handling utilities
export const errorUtils = {
  getErrorMessage: (error) => {
    if (error.response) {
      // Server responded with error status
      return error.response.data?.message || 'Server error occurred';
    } else if (error.request) {
      // Request made but no response received
      return 'Network error. Please check your connection.';
    } else {
      // Something else happened
      return error.message || 'An unexpected error occurred';
    }
  },

  isNetworkError: (error) => {
    return !error.response && error.request;
  },

  isAuthError: (error) => {
    return error.response?.status === 401;
  },

  isForbiddenError: (error) => {
    return error.response?.status === 403;
  },

  isValidationError: (error) => {
    return error.response?.status === 400;
  },
};

// Notification utilities
export const notificationUtils = {
  show: (message, type = 'info') => {
    // This would integrate with your notification system
    console.log(`${type.toUpperCase()}: ${message}`);
  },

  success: (message) => {
    notificationUtils.show(message, 'success');
  },

  error: (message) => {
    notificationUtils.show(message, 'error');
  },

  warning: (message) => {
    notificationUtils.show(message, 'warning');
  },

  info: (message) => {
    notificationUtils.show(message, 'info');
  },
};

// Debounce utility
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// QR Code utilities
export const qrUtils = {
  generatePassQRData: (pass) => {
    return JSON.stringify({
      id: pass._id,
      student: pass.student.name,
      regNumber: pass.student.regNumber,
      reason: pass.reason,
      exitTime: pass.exitTime,
      expectedReturnTime: pass.expectedReturnTime,
      securityToken: pass.securityToken,
    });
  },

  parseQRData: (qrData) => {
    try {
      return JSON.parse(qrData);
    } catch (error) {
      console.error('Invalid QR data:', error);
      return null;
    }
  },
};

// Permission utilities
export const permissionUtils = {
  canApprovePass: (userRole, passLevel) => {
    if (userRole === 'admin') return true;
    if (userRole === 'hod') return true;
    if (userRole === 'mentor' && passLevel === 'mentor') return true;
    return false;
  },

  canViewAllPasses: (userRole) => {
    return ['admin', 'hod', 'security'].includes(userRole);
  },

  canManageUsers: (userRole) => {
    return ['admin'].includes(userRole);
  },

  canViewStatistics: (userRole) => {
    return ['admin', 'hod'].includes(userRole);
  },
};

const utils = {
  apiResponse,
  dateUtils,
  storageUtils,
  validationUtils,
  formatUtils,
  errorUtils,
  notificationUtils,
  debounce,
  qrUtils,
  permissionUtils,
};

export default utils;