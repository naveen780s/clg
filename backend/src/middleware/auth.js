const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No authentication token provided'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user and attach to request
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact admin.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Server error',
        message: 'An error occurred during authentication'
      });
    }
  }
};

// Middleware to check user roles
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Middleware to check specific permissions
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Permission denied',
        message: `You don't have the required permissions: ${requiredPermissions.join(', ')}`
      });
    }

    next();
  };
};

// Middleware to check if user can access specific resource
const requireOwnership = (resourceField = 'student_id') => {
  return (req, res, next) => {
    // Allow HODs and mentors to access resources in their domain
    if (req.user.role === 'hod' || req.user.role === 'mentor') {
      return next();
    }

    // For students, check if they own the resource
    if (req.user.role === 'student') {
      const resourceUserId = req.params.userId || req.body[resourceField] || req.query[resourceField];
      
      if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own resources'
        });
      }
    }

    next();
  };
};

// Middleware to check department access
const requireSameDepartment = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      return next(); // Students can only see their own stuff anyway
    }

    // For mentors and HODs, they should only access users in their department
    if (req.params.userId) {
      const targetUser = await User.findById(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist'
        });
      }

      if (targetUser.department !== req.user.department) {
        return res.status(403).json({
          error: 'Department access denied',
          message: 'You can only access users from your department'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Department check error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while checking department access'
    });
  }
};

// Middleware to validate mentor-student relationship
const requireMentorRelation = async (req, res, next) => {
  try {
    if (req.user.role !== 'mentor') {
      return next(); // Skip check for non-mentors
    }

    const studentId = req.params.studentId || req.body.student_id;
    if (!studentId) {
      return res.status(400).json({
        error: 'Missing student ID',
        message: 'Student ID is required for this operation'
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        message: 'The specified student does not exist'
      });
    }

    if (student.mentor_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Mentor relationship required',
        message: 'You can only perform this action for your mentees'
      });
    }

    next();
  } catch (error) {
    console.error('Mentor relation check error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while checking mentor relationship'
    });
  }
};

// Middleware to log user activity
const logActivity = (action) => {
  return (req, res, next) => {
    req.userActivity = {
      action,
      timestamp: new Date(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    next();
  };
};

// Optional authentication (for public endpoints that may use auth if provided)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.is_active) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role,
      department: user.department
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  requireOwnership,
  requireSameDepartment,
  requireMentorRelation,
  logActivity,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};