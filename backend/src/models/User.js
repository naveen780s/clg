const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'mentor', 'hod', 'security'],
    required: [true, 'Role is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: [
      'Computer Science',
      'Information Technology', 
      'Electronics',
      'Mechanical',
      'Civil',
      'Electrical',
      'Chemical',
      'Biotechnology',
      'MBA',
      'Other'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number']
  },
  // Student specific fields
  hostel_block: {
    type: String,
    required: function() { return this.role === 'student'; }
  },
  room_number: {
    type: String,
    required: function() { return this.role === 'student'; }
  },
  student_id: {
    type: String,
    required: function() { return this.role === 'student'; },
    unique: true,
    sparse: true
  },
  year: {
    type: Number,
    required: function() { return this.role === 'student'; },
    min: [1, 'Year must be between 1 and 4'],
    max: [4, 'Year must be between 1 and 4']
  },
  // Reference to mentor (for students)
  mentor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.role === 'student'; }
  },
  // Mentor specific fields
  mentees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Security and permissions
  permissions: {
    type: [String],
    default: function() {
      switch(this.role) {
        case 'student':
          return ['create_pass', 'view_own_passes'];
        case 'mentor':
          return ['approve_mentee_passes', 'view_mentee_passes'];
        case 'hod':
          return ['final_approve_passes', 'view_department_passes', 'generate_reports'];
        case 'security':
          return ['verify_passes', 'scan_qr'];
        default:
          return [];
      }
    }
  },
  // Profile and preferences
  profile_picture: {
    type: String,
    default: null
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    theme: { type: String, default: 'doodle' }
  },
  // Account status
  is_active: {
    type: Boolean,
    default: true
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  last_login: {
    type: Date,
    default: null
  },
  login_count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ student_id: 1 });
userSchema.index({ role: 1, department: 1 });
userSchema.index({ mentor_id: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.last_login = new Date();
  this.login_count += 1;
  return this.save();
};

// Virtual for full name
userSchema.virtual('initials').get(function() {
  return this.name.split(' ').map(n => n[0]).join('').toUpperCase();
});

// Static method to find mentees of a mentor
userSchema.statics.findMentees = function(mentorId) {
  return this.find({ mentor_id: mentorId, role: 'student' });
};

// Static method to find users by role and department
userSchema.statics.findByRoleAndDepartment = function(role, department) {
  return this.find({ role, department, is_active: true });
};

module.exports = mongoose.model('User', userSchema);