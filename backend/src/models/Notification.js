const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient information
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // System notifications have no sender
  },
  
  // Notification content
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  
  // Notification type and category
  type: {
    type: String,
    enum: [
      'pass_submitted',
      'pass_approved',
      'pass_rejected', 
      'pass_expired',
      'pass_used',
      'mentor_assigned',
      'system_alert',
      'reminder',
      'announcement'
    ],
    required: [true, 'Notification type is required']
  },
  category: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'reminder'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Related entities
  relatedPass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GatePass',
    default: null
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Notification status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  
  // Delivery channels
  channels: {
    inApp: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date, default: null }
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date, default: null },
      opened: { type: Boolean, default: false },
      openedAt: { type: Date, default: null }
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date, default: null },
      messageId: { type: String, default: null }
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date, default: null }
    }
  },
  
  // Notification settings
  autoExpire: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Auto-expire after 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  
  // Action buttons for interactive notifications
  actions: [{
    label: { type: String, maxlength: 50 },
    action: { type: String, maxlength: 100 },
    style: {
      type: String,
      enum: ['primary', 'secondary', 'success', 'warning', 'danger'],
      default: 'primary'
    }
  }],
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Scheduling
  scheduledFor: {
    type: Date,
    default: null
  },
  isScheduled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ scheduledFor: 1, isScheduled: 1 });

// Compound indexes
notificationSchema.index({ recipient: 1, type: 1, isRead: 1 });

// Virtual for delivery status
notificationSchema.virtual('deliveryStatus').get(function() {
  const channels = this.channels;
  const totalChannels = Object.keys(channels).filter(channel => 
    channels[channel].sent
  ).length;
  
  if (totalChannels === 0) return 'pending';
  
  const deliveredChannels = Object.keys(channels).filter(channel => 
    channels[channel].delivered
  ).length;
  
  if (deliveredChannels === totalChannels) return 'delivered';
  if (deliveredChannels > 0) return 'partial';
  return 'sent';
});

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Set readAt when marking as read
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Static methods
notificationSchema.statics.findUnreadForUser = function(userId) {
  return this.find({ 
    recipient: userId, 
    isRead: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findByTypeForUser = function(userId, type, limit = 50) {
  return this.find({ 
    recipient: userId, 
    type: type,
    expiresAt: { $gt: new Date() }
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('sender', 'name role')
  .populate('relatedPass', 'passId status')
  .populate('relatedUser', 'name role');
};

notificationSchema.statics.markAllAsReadForUser = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { 
      $set: { 
        isRead: true, 
        readAt: new Date() 
      } 
    }
  );
};

notificationSchema.statics.deleteExpiredNotifications = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    autoExpire: true
  });
};

notificationSchema.statics.getNotificationStats = function(userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        recipient: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        unread: { $sum: { $cond: ['$isRead', 0, 1] } }
      }
    }
  ]);
};

notificationSchema.statics.findScheduledNotifications = function() {
  return this.find({
    isScheduled: true,
    scheduledFor: { $lte: new Date() }
  });
};

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markChannelAsSent = function(channel) {
  if (this.channels[channel]) {
    this.channels[channel].sent = true;
    this.channels[channel].sentAt = new Date();
    return this.save();
  }
  throw new Error(`Invalid channel: ${channel}`);
};

notificationSchema.methods.markChannelAsDelivered = function(channel) {
  if (this.channels[channel]) {
    this.channels[channel].delivered = true;
    this.channels[channel].deliveredAt = new Date();
    return this.save();
  }
  throw new Error(`Invalid channel: ${channel}`);
};

notificationSchema.methods.scheduleFor = function(date) {
  this.scheduledFor = date;
  this.isScheduled = true;
  return this.save();
};

// Notification templates
notificationSchema.statics.createPassSubmittedNotification = function(mentorId, passId, studentName) {
  return this.create({
    recipient: mentorId,
    title: '🎫 New Gate Pass Request',
    message: `${studentName} has submitted a new gate pass request for your approval.`,
    type: 'pass_submitted',
    category: 'info',
    priority: 'medium',
    relatedPass: passId,
    actions: [
      { label: 'Review', action: 'view_pass', style: 'primary' },
      { label: 'Approve', action: 'approve_pass', style: 'success' }
    ]
  });
};

notificationSchema.statics.createPassApprovedNotification = function(studentId, passId, approverName, approverType) {
  const title = approverType === 'mentor' ? 
    '✅ Mentor Approved Your Pass' : 
    '🎉 Pass Fully Approved!';
  
  const message = approverType === 'mentor' ?
    `Your gate pass has been approved by ${approverName}. Waiting for HOD approval.` :
    `Great news! Your gate pass has been fully approved by ${approverName}. You can now use it.`;
  
  return this.create({
    recipient: studentId,
    title,
    message,
    type: 'pass_approved',
    category: 'success',
    priority: 'high',
    relatedPass: passId,
    actions: [
      { label: 'View Pass', action: 'view_pass', style: 'primary' },
      { label: 'Download PDF', action: 'download_pass', style: 'secondary' }
    ]
  });
};

notificationSchema.statics.createPassRejectedNotification = function(studentId, passId, rejectorName, reason) {
  return this.create({
    recipient: studentId,
    title: '❌ Gate Pass Rejected',
    message: `Your gate pass has been rejected by ${rejectorName}. Reason: ${reason}`,
    type: 'pass_rejected',
    category: 'error',
    priority: 'high',
    relatedPass: passId,
    actions: [
      { label: 'View Details', action: 'view_pass', style: 'primary' },
      { label: 'Submit New', action: 'create_pass', style: 'success' }
    ]
  });
};

notificationSchema.statics.createPassExpiredNotification = function(studentId, passId) {
  return this.create({
    recipient: studentId,
    title: '⏰ Gate Pass Expired',
    message: 'Your approved gate pass has expired. Please submit a new request if needed.',
    type: 'pass_expired',
    category: 'warning',
    priority: 'medium',
    relatedPass: passId,
    actions: [
      { label: 'Submit New Pass', action: 'create_pass', style: 'primary' }
    ]
  });
};

module.exports = mongoose.model('Notification', notificationSchema);