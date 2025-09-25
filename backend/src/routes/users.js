const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, requireRole, requireSameDepartment } = require('../middleware/auth');

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      message: error.message 
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, department, year, rollNumber } = req.body;
    const userId = req.user._id;

    // Check if email is being changed and if it already exists
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(department && { department }),
        ...(year && { year }),
        ...(rollNumber && { rollNumber })
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: error.message 
    });
  }
});

// Get users by role (for admin/HOD)
router.get('/by-role/:role', async (req, res) => {
  try {
    // Check if user has permission to view this data
    if (req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }

    const { role } = req.params;
    const { department, page = 1, limit = 20 } = req.query;

    const query = { role };
    if (department && req.user.role === 'hod') {
      query.department = department;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
});

// Get students by department (for mentors/HOD)
router.get('/students/:department', async (req, res) => {
  try {
    const { department } = req.params;
    const { year, search, page = 1, limit = 20 } = req.query;

    // Check if user has permission to view students from this department
    if (req.user.role === 'student' || 
        (req.user.role === 'mentor' && req.user.department !== department) ||
        (req.user.role === 'hod' && req.user.department !== department)) {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }

    const query = { 
      role: 'student',
      department 
    };

    if (year) {
      query.year = year;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(query)
      .select('-password')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ 
      error: 'Failed to fetch students',
      message: error.message 
    });
  }
});

// Get user statistics (for admin/HOD)
router.get('/statistics', async (req, res) => {
  try {
    // Check if user has permission to view statistics
    if (req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }

    const query = {};
    if (req.user.role === 'hod') {
      query.department = req.user.department;
    }

    const [
      totalUsers,
      studentCount,
      mentorCount,
      hodCount,
      securityCount,
      departmentStats
    ] = await Promise.all([
      User.countDocuments(query),
      User.countDocuments({ ...query, role: 'student' }),
      User.countDocuments({ ...query, role: 'mentor' }),
      User.countDocuments({ ...query, role: 'hod' }),
      User.countDocuments({ ...query, role: 'security' }),
      User.aggregate([
        { $match: query },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      totalUsers,
      roleDistribution: {
        students: studentCount,
        mentors: mentorCount,
        hods: hodCount,
        security: securityCount
      },
      departmentStats
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      message: error.message 
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      error: 'Failed to change password',
      message: error.message 
    });
  }
});

module.exports = router;