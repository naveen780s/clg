const express = require('express');
const { body, validationResult } = require('express-validator');
const GatePass = require('../models/GatePass');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { requireRole, requirePermission, requireMentorRelation } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const QRService = require('../services/qrService');
const PDFService = require('../services/pdfService');

const router = express.Router();

// Validation rules
const createPassValidation = [
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
  body('destination')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Destination must be between 3 and 200 characters'),
  body('departure_time')
    .isISO8601()
    .toDate()
    .withMessage('Invalid departure time format'),
  body('return_time')
    .isISO8601()
    .toDate()
    .withMessage('Invalid return time format'),
  body('category')
    .isIn(['medical', 'family', 'academic', 'personal', 'emergency', 'other'])
    .withMessage('Invalid category'),
  body('emergency_contact.name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Emergency contact name must be between 2 and 50 characters'),
  body('emergency_contact.phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid emergency contact phone number'),
  body('emergency_contact.relation')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Emergency contact relation must be between 2 and 30 characters')
];

// @route   POST /api/passes
// @desc    Create a new gate pass request
// @access  Private (Students only)
router.post('/', requireRole('student'), createPassValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      reason,
      destination,
      departure_time,
      return_time,
      category,
      emergency_contact,
      priority = 'medium'
    } = req.body;

    // Validate departure and return times
    const now = new Date();
    if (new Date(departure_time) <= now) {
      return res.status(400).json({
        success: false,
        error: 'Invalid departure time',
        message: 'Departure time must be in the future'
      });
    }

    if (new Date(return_time) <= new Date(departure_time)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid return time',
        message: 'Return time must be after departure time'
      });
    }

    // Check for pending passes
    const pendingPasses = await GatePass.find({
      student_id: req.user._id,
      status: { $in: ['pending', 'mentor_approved', 'approved'] }
    });

    if (pendingPasses.length >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Too many pending passes',
        message: 'You cannot have more than 3 pending gate passes at a time'
      });
    }

    // Get student's mentor and HOD
    const student = await User.findById(req.user._id).populate('mentor_id');
    if (!student.mentor_id) {
      return res.status(400).json({
        success: false,
        error: 'No mentor assigned',
        message: 'You must have an assigned mentor to request gate passes'
      });
    }

    const hod = await User.findOne({ 
      role: 'hod', 
      department: student.department 
    });

    if (!hod) {
      return res.status(400).json({
        success: false,
        error: 'No HOD found',
        message: 'No HOD found for your department'
      });
    }

    // Create gate pass
    const gatePass = await GatePass.create({
      student_id: req.user._id,
      mentor_id: student.mentor_id._id,
      hod_id: hod._id,
      reason,
      destination,
      departure_time: new Date(departure_time),
      return_time: new Date(return_time),
      category,
      emergency_contact,
      priority,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    // Populate references
    await gatePass.populate([
      { path: 'student_id', select: 'name email student_id phone' },
      { path: 'mentor_id', select: 'name email phone' },
      { path: 'hod_id', select: 'name email phone' }
    ]);

    // Send notification to mentor
    await NotificationService.notifyPassSubmitted(
      student.mentor_id._id,
      req.user._id,
      {
        _id: gatePass._id,
        studentName: student.name,
        category: gatePass.category,
        reason: gatePass.reason
      }
    );

    // Emit real-time notification
    if (global.io) {
      global.io.to(`mentor_${student.mentor_id._id}`).emit('new_pass_request', {
        pass: gatePass,
        student: student.name
      });
    }

    res.status(201).json({
      success: true,
      message: 'Gate pass request submitted successfully',
      data: {
        gatePass
      }
    });

  } catch (error) {
    console.error('Gate pass creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create gate pass',
      message: 'An error occurred while creating your gate pass request'
    });
  }
});

// @route   GET /api/passes
// @desc    Get user's gate passes
// @access  Private
router.get('/', async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        { path: 'student_id', select: 'name email student_id phone' },
        { path: 'mentor_id', select: 'name email phone' },
        { path: 'hod_id', select: 'name email phone' }
      ]
    };

    // Build query based on user role
    switch (req.user.role) {
      case 'student':
        query.student_id = req.user._id;
        break;
      case 'mentor':
        query.mentor_id = req.user._id;
        break;
      case 'hod':
        const hodStudents = await User.find({ 
          department: req.user.department,
          role: 'student'
        }).select('_id');
        query.student_id = { $in: hodStudents.map(s => s._id) };
        break;
      case 'security':
        // Security can see approved passes
        query.status = { $in: ['approved', 'used'] };
        break;
    }

    // Apply status filter
    if (status) {
      query.status = status;
    }

    const passes = await GatePass.paginate(query, options);

    res.json({
      success: true,
      data: {
        passes: passes.docs,
        pagination: {
          page: passes.page,
          pages: passes.totalPages,
          total: passes.totalDocs,
          limit: passes.limit
        }
      }
    });

  } catch (error) {
    console.error('Gate passes fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gate passes',
      message: 'An error occurred while fetching gate passes'
    });
  }
});

// @route   GET /api/passes/active
// @desc    Get active passes for current user
// @access  Private
router.get('/active', async (req, res) => {
  try {
    const query = { student_id: req.user._id };
    
    // For students, get their active passes
    if (req.user.role === 'student') {
      query.status = { $in: ['approved', 'used'] };
      query.expiresAt = { $gt: new Date() };
    }
    
    const activePasses = await GatePass.find(query)
      .populate('student_id', 'name email student_id phone')
      .populate('mentor_id', 'name email')
      .populate('hod_id', 'name email')
      .sort('-createdAt')
      .limit(5);

    res.json({
      success: true,
      data: {
        passes: activePasses,
        total: activePasses.length
      }
    });
  } catch (error) {
    console.error('Active passes fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active passes',
      message: 'An error occurred while fetching active passes'
    });
  }
});

// @route   GET /api/passes/:id
// @desc    Get specific gate pass
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const gatePass = await GatePass.findById(req.params.id)
      .populate('student_id', 'name email student_id phone department year hostel_block room_number')
      .populate('mentor_id', 'name email phone')
      .populate('hod_id', 'name email phone')
      .populate('usedBy', 'name email')
      .populate('history.by', 'name role');

    if (!gatePass) {
      return res.status(404).json({
        success: false,
        error: 'Gate pass not found',
        message: 'The requested gate pass does not exist'
      });
    }

    // Check access permissions
    const hasAccess = 
      (req.user.role === 'student' && gatePass.student_id._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'mentor' && gatePass.mentor_id._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'hod' && gatePass.hod_id._id.toString() === req.user._id.toString()) ||
      req.user.role === 'security';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to view this gate pass'
      });
    }

    res.json({
      success: true,
      data: {
        gatePass
      }
    });

  } catch (error) {
    console.error('Gate pass fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gate pass',
      message: 'An error occurred while fetching the gate pass'
    });
  }
});

// @route   PUT /api/passes/:id/mentor-approve
// @desc    Mentor approval for gate pass
// @access  Private (Mentors only)
router.put('/:id/mentor-approve', 
  requireRole('mentor'), 
  [
    body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
    body('comments').optional().trim().isLength({ max: 300 }).withMessage('Comments cannot exceed 300 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { action, comments } = req.body;

      const gatePass = await GatePass.findById(req.params.id)
        .populate('student_id', 'name email phone')
        .populate('hod_id', 'name email');

      if (!gatePass) {
        return res.status(404).json({
          success: false,
          error: 'Gate pass not found'
        });
      }

      // Check if mentor owns this pass
      if (gatePass.mentor_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only approve passes for your mentees'
        });
      }

      // Check if already processed
      if (gatePass.mentor_approval.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Already processed',
          message: 'This gate pass has already been processed by you'
        });
      }

      if (action === 'approve') {
        await gatePass.approve('mentor', req.user._id, comments);
        
        // Notify student of mentor approval
        await NotificationService.notifyPassApproved(
          gatePass.student_id._id,
          gatePass._id,
          req.user.name,
          'mentor'
        );

        // Notify HOD of pending approval
        await NotificationService.notifyPassSubmitted(
          gatePass.hod_id._id,
          gatePass._id,
          gatePass.student_id.name
        );

        // Real-time notifications
        if (global.io) {
          global.io.to(`user_${gatePass.student_id._id}`).emit('pass_approved', {
            pass: gatePass,
            approver: req.user.name,
            type: 'mentor'
          });

          global.io.to(`hod_${req.user.department}`).emit('new_pass_request', {
            pass: gatePass,
            student: gatePass.student_id.name
          });
        }

      } else {
        await gatePass.reject('mentor', req.user._id, comments);
        
        // Notify student of rejection
        await NotificationService.notifyPassRejected(
          gatePass.student_id._id,
          gatePass._id,
          req.user.name,
          comments || 'No reason provided'
        );

        // Real-time notification
        if (global.io) {
          global.io.to(`user_${gatePass.student_id._id}`).emit('pass_rejected', {
            pass: gatePass,
            rejector: req.user.name,
            reason: comments
          });
        }
      }

      res.json({
        success: true,
        message: `Gate pass ${action}d successfully`,
        data: {
          gatePass
        }
      });

    } catch (error) {
      console.error('Mentor approval error:', error);
      res.status(500).json({
        success: false,
        error: 'Approval failed',
        message: 'An error occurred while processing the approval'
      });
    }
  }
);

// @route   PUT /api/passes/:id/hod-approve
// @desc    HOD final approval for gate pass
// @access  Private (HODs only)
router.put('/:id/hod-approve',
  requireRole('hod'),
  [
    body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
    body('comments').optional().trim().isLength({ max: 300 }).withMessage('Comments cannot exceed 300 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { action, comments } = req.body;

      const gatePass = await GatePass.findById(req.params.id)
        .populate('student_id', 'name email phone department');

      if (!gatePass) {
        return res.status(404).json({
          success: false,
          error: 'Gate pass not found'
        });
      }

      // Check if HOD owns this pass
      if (gatePass.hod_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only approve passes for your department'
        });
      }

      // Check if mentor has approved
      if (gatePass.mentor_approval.status !== 'approved') {
        return res.status(400).json({
          success: false,
          error: 'Mentor approval required',
          message: 'This pass must be approved by the mentor first'
        });
      }

      // Check if already processed
      if (gatePass.hod_approval.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Already processed',
          message: 'This gate pass has already been processed by you'
        });
      }

      if (action === 'approve') {
        await gatePass.approve('hod', req.user._id, comments);
        
        // Generate QR code and PDF
        try {
          const qrCode = await QRService.generateQRCode({
            passId: gatePass.passId,
            token: gatePass.uniqueToken,
            studentId: gatePass.student_id._id
          });
          
          gatePass.qrCode = qrCode;
          await gatePass.save();

          // Generate PDF (async)
          PDFService.generatePassPDF(gatePass).catch(err => 
            console.error('PDF generation error:', err)
          );

        } catch (qrError) {
          console.error('QR code generation error:', qrError);
        }
        
        // Notify student of final approval
        await NotificationService.notifyPassApproved(
          gatePass.student_id._id,
          gatePass._id,
          req.user.name,
          'hod'
        );

        // Real-time notification
        if (global.io) {
          global.io.to(`user_${gatePass.student_id._id}`).emit('pass_fully_approved', {
            pass: gatePass,
            approver: req.user.name
          });
        }

      } else {
        await gatePass.reject('hod', req.user._id, comments);
        
        // Notify student of rejection
        await NotificationService.notifyPassRejected(
          gatePass.student_id._id,
          gatePass._id,
          req.user.name,
          comments || 'No reason provided'
        );

        // Real-time notification
        if (global.io) {
          global.io.to(`user_${gatePass.student_id._id}`).emit('pass_rejected', {
            pass: gatePass,
            rejector: req.user.name,
            reason: comments
          });
        }
      }

      res.json({
        success: true,
        message: `Gate pass ${action}d successfully`,
        data: {
          gatePass
        }
      });

    } catch (error) {
      console.error('HOD approval error:', error);
      res.status(500).json({
        success: false,
        error: 'Approval failed',
        message: 'An error occurred while processing the approval'
      });
    }
  }
);

// @route   POST /api/passes/:id/verify
// @desc    Verify and use gate pass
// @access  Private (Security only)
router.post('/:id/verify', requireRole('security'), async (req, res) => {
  try {
    const { securityCode, action = 'exit' } = req.body;

    const gatePass = await GatePass.findOne({
      $or: [
        { passId: req.params.id },
        { _id: req.params.id },
        { uniqueToken: req.params.id }
      ]
    }).populate('student_id', 'name email student_id phone hostel_block room_number');

    if (!gatePass) {
      return res.status(404).json({
        success: false,
        error: 'Gate pass not found',
        message: 'Invalid gate pass ID or token'
      });
    }

    // Check if pass is approved
    if (gatePass.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Pass not approved',
        message: `This gate pass is ${gatePass.status}`
      });
    }

    // Check if expired
    if (gatePass.expiresAt && new Date() > gatePass.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Pass expired',
        message: 'This gate pass has expired'
      });
    }

    // Verify security code if provided
    if (securityCode && gatePass.securityCode !== securityCode.toUpperCase()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid security code',
        message: 'The security code does not match'
      });
    }

    if (action === 'exit') {
      // Check if already used for exit
      if (gatePass.isUsed) {
        return res.status(400).json({
          success: false,
          error: 'Pass already used',
          message: 'This gate pass has already been used for exit'
        });
      }

      // Mark as used
      await gatePass.markAsUsed(req.user._id);

      // Real-time notification to student
      if (global.io) {
        global.io.to(`user_${gatePass.student_id._id}`).emit('pass_used', {
          pass: gatePass,
          usedBy: req.user.name,
          timestamp: new Date()
        });
      }

    } else if (action === 'entry') {
      // Record entry time
      gatePass.entry_time = new Date();
      await gatePass.save();
    }

    res.json({
      success: true,
      message: `Gate pass verified for ${action}`,
      data: {
        gatePass: {
          passId: gatePass.passId,
          student: gatePass.student_id,
          destination: gatePass.destination,
          departure_time: gatePass.departure_time,
          return_time: gatePass.return_time,
          status: gatePass.status,
          isUsed: gatePass.isUsed,
          usedAt: gatePass.usedAt,
          entry_time: gatePass.entry_time
        }
      }
    });

  } catch (error) {
    console.error('Gate pass verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: 'An error occurred while verifying the gate pass'
    });
  }
});

// @route   GET /api/passes/:id/qr
// @desc    Get QR code for gate pass
// @access  Private
router.get('/:id/qr', async (req, res) => {
  try {
    const gatePass = await GatePass.findById(req.params.id);

    if (!gatePass) {
      return res.status(404).json({
        success: false,
        error: 'Gate pass not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      (req.user.role === 'student' && gatePass.student_id.toString() === req.user._id.toString()) ||
      req.user.role === 'security';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!gatePass.qrCode) {
      return res.status(404).json({
        success: false,
        error: 'QR code not available',
        message: 'QR code has not been generated for this pass'
      });
    }

    res.json({
      success: true,
      data: {
        qrCode: gatePass.qrCode,
        passId: gatePass.passId,
        expiresAt: gatePass.expiresAt
      }
    });

  } catch (error) {
    console.error('QR code fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch QR code'
    });
  }
});

// @route   GET /api/passes/:id/pdf
// @desc    Download gate pass PDF
// @access  Private
router.get('/:id/pdf', async (req, res) => {
  try {
    const gatePass = await GatePass.findById(req.params.id)
      .populate('student_id')
      .populate('mentor_id', 'name')
      .populate('hod_id', 'name');

    if (!gatePass) {
      return res.status(404).json({
        success: false,
        error: 'Gate pass not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      (req.user.role === 'student' && gatePass.student_id._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'mentor' && gatePass.mentor_id._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'hod' && gatePass.hod_id._id.toString() === req.user._id.toString()) ||
      req.user.role === 'security';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (gatePass.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Pass not approved',
        message: 'PDF is only available for approved passes'
      });
    }

    // Generate PDF if not exists
    if (!gatePass.pdfUrl) {
      try {
        const pdfBuffer = await PDFService.generatePassPDF(gatePass);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="gate-pass-${gatePass.passId}.pdf"`);
        res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        return res.status(500).json({
          success: false,
          error: 'PDF generation failed'
        });
      }
    } else {
      // Return existing PDF URL
      res.json({
        success: true,
        data: {
          pdfUrl: gatePass.pdfUrl
        }
      });
    }

  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download PDF'
    });
  }
});

// @route   GET /api/passes/stats/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats/dashboard', async (req, res) => {
  try {
    const query = {};
    
    // Filter by role
    switch (req.user.role) {
      case 'student':
        query.student_id = req.user._id;
        break;
      case 'mentor':
        query.mentor_id = req.user._id;
        break;
      case 'hod':
        const hodStudents = await User.find({ 
          department: req.user.department,
          role: 'student'
        }).select('_id');
        query.student_id = { $in: hodStudents.map(s => s._id) };
        break;
    }

    const stats = await GatePass.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent passes
    const recentPasses = await GatePass.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('student_id', 'name student_id')
      .select('passId status createdAt departure_time');

    // Format stats
    const formattedStats = {
      total: 0,
      pending: 0,
      mentor_approved: 0,
      approved: 0,
      used: 0,
      expired: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });

    res.json({
      success: true,
      data: {
        stats: formattedStats,
        recentPasses
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

module.exports = router;