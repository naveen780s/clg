const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { v4: uuidv4 } = require('uuid');

const gatePassSchema = new mongoose.Schema({
  passId: {
    type: String,
    unique: true,
    default: () => `GP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  },
  // References
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  mentor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Mentor ID is required']
  },
  hod_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'HOD ID is required']
  },
  
  // Pass details
  reason: {
    type: String,
    required: [true, 'Reason for exit is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    maxlength: [200, 'Destination cannot exceed 200 characters']
  },
  departure_time: {
    type: Date,
    required: [true, 'Departure time is required'],
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Departure time must be in the future'
    }
  },
  return_time: {
    type: Date,
    required: [true, 'Return time is required'],
    validate: {
      validator: function(v) {
        return v > this.departure_time;
      },
      message: 'Return time must be after departure time'
    }
  },
  
  // Emergency contact
  emergency_contact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relation: { type: String, required: true }
  },
  
  // Approval workflow
  mentor_approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    timestamp: Date,
    comments: {
      type: String,
      maxlength: [300, 'Comments cannot exceed 300 characters']
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  hod_approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    timestamp: Date,
    comments: {
      type: String,
      maxlength: [300, 'Comments cannot exceed 300 characters']
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Security features
  uniqueToken: {
    type: String,
    unique: true,
    default: uuidv4
  },
  qrCode: {
    type: String, // Base64 encoded QR code
    default: null
  },
  securityCode: {
    type: String,
    default: () => Math.random().toString(36).substr(2, 8).toUpperCase()
  },
  
  // Usage tracking
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date,
    default: null
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Security guard who verified the pass
    default: null
  },
  entry_time: {
    type: Date,
    default: null
  },
  
  // Pass lifecycle
  status: {
    type: String,
    enum: ['pending', 'mentor_approved', 'approved', 'used', 'expired', 'rejected'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    default: null
  },
  
  // Document generation
  pdfUrl: {
    type: String,
    default: null
  },
  pdfGenerated: {
    type: Boolean,
    default: false
  },
  
  // Additional metadata
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['medical', 'family', 'academic', 'personal', 'emergency', 'other'],
    required: true
  },
  
  // Tracking and audit
  ip_address: String,
  user_agent: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  
  // Pass history
  history: [{
    action: {
      type: String,
      enum: ['created', 'mentor_approved', 'mentor_rejected', 'hod_approved', 'hod_rejected', 'used', 'expired', 'cancelled']
    },
    timestamp: { type: Date, default: Date.now },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comments: String,
    metadata: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Indexes for performance
gatePassSchema.index({ passId: 1 });
gatePassSchema.index({ student_id: 1 });
gatePassSchema.index({ mentor_id: 1 });
gatePassSchema.index({ hod_id: 1 });
gatePassSchema.index({ status: 1 });
gatePassSchema.index({ createdAt: -1 });
gatePassSchema.index({ expiresAt: 1 });
gatePassSchema.index({ uniqueToken: 1 });

// Compound indexes
gatePassSchema.index({ student_id: 1, status: 1 });
gatePassSchema.index({ mentor_id: 1, 'mentor_approval.status': 1 });
gatePassSchema.index({ hod_id: 1, 'hod_approval.status': 1 });

// Virtual for overall approval status
gatePassSchema.virtual('approvalStatus').get(function() {
  if (this.status === 'rejected') return 'rejected';
  if (this.mentor_approval.status === 'rejected' || this.hod_approval.status === 'rejected') {
    return 'rejected';
  }
  if (this.mentor_approval.status === 'approved' && this.hod_approval.status === 'approved') {
    return 'approved';
  }
  if (this.mentor_approval.status === 'approved') {
    return 'mentor_approved';
  }
  return 'pending';
});

// Virtual for time remaining
gatePassSchema.virtual('timeRemaining').get(function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const diff = this.expiresAt - now;
  return diff > 0 ? Math.floor(diff / (1000 * 60)) : 0; // minutes
});

// Pre-save middleware
gatePassSchema.pre('save', function(next) {
  // Add to history if status changed
  if (this.isModified('status')) {
    this.history.push({
      action: this.status,
      timestamp: new Date(),
      by: this._currentUser || null,
      comments: this._statusChangeComment || null
    });
  }
  
  // Set expiry time when fully approved
  if (this.status === 'approved' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  }
  
  next();
});

// Static methods
gatePassSchema.statics.findPendingForMentor = function(mentorId) {
  return this.find({
    mentor_id: mentorId,
    'mentor_approval.status': 'pending'
  }).populate('student_id', 'name email student_id phone');
};

gatePassSchema.statics.findPendingForHOD = function(hodId) {
  return this.find({
    hod_id: hodId,
    'mentor_approval.status': 'approved',
    'hod_approval.status': 'pending'
  }).populate('student_id', 'name email student_id phone')
    .populate('mentor_id', 'name email');
};

gatePassSchema.statics.findExpiredPasses = function() {
  return this.find({
    status: 'approved',
    expiresAt: { $lt: new Date() },
    isUsed: false
  });
};

gatePassSchema.statics.generateDailyReport = function(date, department) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'student_id',
        foreignField: '_id',
        as: 'student'
      }
    },
    {
      $match: department ? { 'student.department': department } : {}
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance methods
gatePassSchema.methods.addToHistory = function(action, userId, comments, metadata) {
  this.history.push({
    action,
    by: userId,
    comments,
    metadata
  });
  return this.save();
};

gatePassSchema.methods.approve = function(approverType, approverId, comments) {
  if (approverType === 'mentor') {
    this.mentor_approval = {
      status: 'approved',
      timestamp: new Date(),
      comments: comments,
      approved_by: approverId
    };
    this.status = 'mentor_approved';
  } else if (approverType === 'hod') {
    this.hod_approval = {
      status: 'approved',
      timestamp: new Date(),
      comments: comments,
      approved_by: approverId
    };
    this.status = 'approved';
    this.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
  }
  
  this._currentUser = approverId;
  this._statusChangeComment = comments;
  return this.save();
};

gatePassSchema.methods.reject = function(approverType, approverId, comments) {
  if (approverType === 'mentor') {
    this.mentor_approval = {
      status: 'rejected',
      timestamp: new Date(),
      comments: comments,
      approved_by: approverId
    };
  } else if (approverType === 'hod') {
    this.hod_approval = {
      status: 'rejected',
      timestamp: new Date(),
      comments: comments,
      approved_by: approverId
    };
  }
  
  this.status = 'rejected';
  this._currentUser = approverId;
  this._statusChangeComment = comments;
  return this.save();
};

gatePassSchema.methods.markAsUsed = function(securityGuardId) {
  this.isUsed = true;
  this.usedAt = new Date();
  this.usedBy = securityGuardId;
  this.status = 'used';
  this._currentUser = securityGuardId;
  return this.save();
};

// Add pagination plugin
gatePassSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('GatePass', gatePassSchema);