const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Configure winston colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define different transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      format
    )
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

// Enhanced logging methods
const logError = (error, req = null, additionalInfo = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  };

  if (req) {
    errorInfo.request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
  }

  logger.error('Application Error', errorInfo);
};

const logAuth = (action, user, req, success = true, additionalInfo = {}) => {
  const authInfo = {
    action,
    success,
    user: user ? {
      id: user._id,
      email: user.email,
      role: user.role
    } : null,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    ...additionalInfo
  };

  if (success) {
    logger.info(`Auth Success: ${action}`, authInfo);
  } else {
    logger.warn(`Auth Failed: ${action}`, authInfo);
  }
};

const logGatePass = (action, gatePass, user, req, additionalInfo = {}) => {
  const passInfo = {
    action,
    gatePassId: gatePass._id,
    status: gatePass.status,
    student: gatePass.student,
    user: {
      id: user._id,
      email: user.email,
      role: user.role
    },
    ip: req.ip,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  };

  logger.info(`Gate Pass: ${action}`, passInfo);
};

const logSecurity = (event, details, req, severity = 'warn') => {
  const securityInfo = {
    event,
    details,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    headers: req.headers
  };

  logger[severity](`Security Event: ${event}`, securityInfo);
};

const logPerformance = (operation, duration, req, additionalInfo = {}) => {
  const perfInfo = {
    operation,
    duration: `${duration}ms`,
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  };

  if (duration > 5000) { // Log slow operations (>5s)
    logger.warn(`Slow Operation: ${operation}`, perfInfo);
  } else {
    logger.info(`Performance: ${operation}`, perfInfo);
  }
};

const logSystem = (event, details, severity = 'info') => {
  const systemInfo = {
    event,
    details,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage()
  };

  logger[severity](`System: ${event}`, systemInfo);
};

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = {
  logger,
  logError,
  logAuth,
  logGatePass,
  logSecurity,
  logPerformance,
  logSystem
};