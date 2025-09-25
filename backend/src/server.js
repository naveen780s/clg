const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const passRoutes = require('./routes/passes');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const { apiLimiter, authLimiter, readLimiter } = require('./middleware/rateLimiter');
const { performanceMonitor, memoryMonitor } = require('./middleware/monitoring');

// Import services
const NotificationService = require('./services/notificationService');
const CronService = require('./services/cronService');
const SMSService = require('./services/smsService');

const app = express();
const server = createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Global io instance for use in other modules
global.io = io;
global.smsService = SMSService;

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-gate-pass', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('🗄️ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting - apply different limits to different routes
app.use('/api/', apiLimiter); // General API limiter
app.use('/api/auth/login', authLimiter); // Strict limiter for login
app.use('/api/auth/register', authLimiter); // Strict limiter for registration

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring
app.use(performanceMonitor);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/passes', authenticateToken, passRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join user to their room for personalized notifications
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`📡 User ${userId} joined their notification room`);
  });

  // Handle mentor/HOD joining their respective rooms
  socket.on('join_role', ({ userId, role, department }) => {
    if (role === 'mentor') {
      socket.join(`mentor_${userId}`);
    } else if (role === 'hod') {
      socket.join(`hod_${department}`);
    }
    console.log(`🏷️ ${role} ${userId} joined ${role} room`);
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

// Initialize services
NotificationService.initialize(io);
CronService.startAll();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ HTTP server closed.');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed.');
      process.exit(0);
    });
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Socket.io server ready for real-time connections`);
  
  // Start memory monitoring
  memoryMonitor();
  console.log(`📈 Performance monitoring active`);
});

module.exports = { app, server, io };