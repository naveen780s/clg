const { logPerformance } = require('../utils/logger');

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Log performance metrics
    logPerformance(
      `${req.method} ${req.path}`,
      duration,
      req,
      {
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length') || 0,
        user: req.user ? { id: req.user.id, role: req.user.role } : null
      }
    );
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

// Memory usage monitoring
const memoryMonitor = () => {
  const { logSystem } = require('../utils/logger');
  
  setInterval(() => {
    const usage = process.memoryUsage();
    const formatBytes = (bytes) => {
      return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB';
    };
    
    const memoryInfo = {
      rss: formatBytes(usage.rss),
      heapTotal: formatBytes(usage.heapTotal),
      heapUsed: formatBytes(usage.heapUsed),
      external: formatBytes(usage.external),
      arrayBuffers: formatBytes(usage.arrayBuffers)
    };
    
    // Log warning if memory usage is high
    if (usage.heapUsed / usage.heapTotal > 0.8) {
      logSystem('High Memory Usage', memoryInfo, 'warn');
    } else {
      logSystem('Memory Usage', memoryInfo, 'debug');
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
};

module.exports = {
  performanceMonitor,
  memoryMonitor
};