const { body, param, query, validationResult } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('role')
    .isIn(['student', 'mentor', 'hod', 'security'])
    .withMessage('Role must be one of: student, mentor, hod, security'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  
  body('year')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Year must be between 1 and 4'),
  
  body('rollNumber')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Roll number must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Roll number can only contain letters and numbers'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Gate pass creation validation
const validateGatePassCreation = [
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
  
  body('destination')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Destination must be between 3 and 200 characters'),
  
  body('exitTime')
    .isISO8601()
    .withMessage('Exit time must be a valid date')
    .custom((value) => {
      const exitTime = new Date(value);
      const now = new Date();
      if (exitTime <= now) {
        throw new Error('Exit time must be in the future');
      }
      return true;
    }),
  
  body('returnTime')
    .isISO8601()
    .withMessage('Return time must be a valid date')
    .custom((value, { req }) => {
      const returnTime = new Date(value);
      const exitTime = new Date(req.body.exitTime);
      if (returnTime <= exitTime) {
        throw new Error('Return time must be after exit time');
      }
      return true;
    }),
  
  body('emergencyContact')
    .optional()
    .isMobilePhone('any')
    .withMessage('Emergency contact must be a valid phone number'),
  
  body('parentApproval')
    .optional()
    .isBoolean()
    .withMessage('Parent approval must be a boolean value'),
  
  handleValidationErrors
];

// Gate pass approval validation
const validateGatePassApproval = [
  param('id')
    .isMongoId()
    .withMessage('Invalid gate pass ID'),
  
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected'),
  
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters'),
  
  handleValidationErrors
];

// User ID validation
const validateUserId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  handleValidationErrors
];

// Gate pass ID validation
const validateGatePassId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid gate pass ID'),
  
  handleValidationErrors
];

// QR code validation
const validateQRCode = [
  body('qrCode')
    .trim()
    .notEmpty()
    .withMessage('QR code is required')
    .isLength({ min: 10 })
    .withMessage('Invalid QR code format'),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  
  handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

// Password update validation
const validatePasswordUpdate = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  
  body('year')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Year must be between 1 and 4'),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateGatePassCreation,
  validateGatePassApproval,
  validateUserId,
  validateGatePassId,
  validateQRCode,
  validatePagination,
  validateSearch,
  validatePasswordReset,
  validatePasswordUpdate,
  validateProfileUpdate,
  handleValidationErrors
};