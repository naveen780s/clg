const request = require('supertest');
const mongoose = require('mongoose');
const createTestApp = require('../testServer');
const User = require('../models/User');
const GatePass = require('../models/GatePass');

describe('Gate Pass API Integration Tests', () => {
  let app;
  let studentToken;
  let mentorToken;
  let hodToken;
  let securityToken;
  let testStudent;
  let testMentor;
  let testHOD;
  let testSecurity;

  beforeAll(async () => {
    // Create test app
    app = createTestApp();
    
    // Create test mentor first (to reference in student)
    testMentor = await User.create({
      name: 'Test Mentor',
      email: 'mentor@test.com',
      password: 'TestPass123!',
      phone: '9876543210',
      role: 'mentor',
      department: 'Computer Science'
    });

    // Create test HOD
    testHOD = await User.create({
      name: 'Test HOD',
      email: 'hod@test.com',
      password: 'TestPass123!',
      phone: '9876543211',
      role: 'hod',
      department: 'Computer Science'
    });

    // Create test security
    testSecurity = await User.create({
      name: 'Test Security',
      email: 'security@test.com',
      password: 'TestPass123!',
      phone: '9876543212',
      role: 'security',
      department: 'Security'
    });

    // Create test student (with mentor reference)
    testStudent = await User.create({
      name: 'Test Student',
      email: 'student@test.com',
      password: 'TestPass123!',
      phone: '9876543213',
      role: 'student',
      department: 'Computer Science',
      year: 3,
      student_id: 'CS2021001',
      hostel_block: 'A',
      room_number: '101',
      mentor_id: testMentor._id
    });

    // Get auth tokens
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@test.com',
        password: 'TestPass123!'
      });
    studentToken = studentLogin.body.token;

    const mentorLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mentor@test.com',
        password: 'TestPass123!'
      });
    mentorToken = mentorLogin.body.token;

    const hodLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'hod@test.com',
        password: 'TestPass123!'
      });
    hodToken = hodLogin.body.token;

    const securityLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'security@test.com',
        password: 'TestPass123!'
      });
    securityToken = securityLogin.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await GatePass.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      test('should register a new student successfully', async () => {
        const userData = {
          firstName: 'New',
          lastName: 'Student',
          email: 'newstudent@test.com',
          password: 'TestPass123!',
          phone: '+1234567894',
          role: 'student',
          department: 'Computer Science',
          year: 2,
          rollNumber: 'CS2022001'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(userData.email);
        expect(response.body.user.password).toBeUndefined();
        expect(response.body.token).toBeDefined();
      });

      test('should not register user with duplicate email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            firstName: 'Duplicate',
            lastName: 'User',
            email: 'student@test.com', // Already exists
            password: 'TestPass123!',
            phone: '+1234567895',
            role: 'student',
            department: 'Computer Science'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already exists');
      });
    });

    describe('POST /api/auth/login', () => {
      test('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'student@test.com',
            password: 'TestPass123!'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe('student@test.com');
      });

      test('should not login with invalid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'student@test.com',
            password: 'wrongpassword'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('credentials');
      });
    });
  });

  describe('Gate Pass Endpoints', () => {
    let testGatePass;

    describe('POST /api/passes', () => {
      test('should create gate pass for student', async () => {
        const passData = {
          reason: 'Medical appointment with family doctor',
          destination: 'City Hospital, Main Street',
          exitTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          returnTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          emergencyContact: '+1234567896'
        };

        const response = await request(app)
          .post('/api/passes')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(passData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.gatePass.reason).toBe(passData.reason);
        expect(response.body.gatePass.status).toBe('pending');
        
        testGatePass = response.body.gatePass;
      });

      test('should not create gate pass with invalid data', async () => {
        const response = await request(app)
          .post('/api/passes')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            reason: 'Short', // Too short
            destination: '',
            exitTime: 'invalid-date'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/passes', () => {
      test('should get user gate passes', async () => {
        const response = await request(app)
          .get('/api/passes')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.passes)).toBe(true);
        expect(response.body.passes.length).toBeGreaterThan(0);
      });

      test('should support pagination', async () => {
        const response = await request(app)
          .get('/api/passes?page=1&limit=5')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(5);
      });
    });

    describe('GET /api/passes/:id', () => {
      test('should get specific gate pass', async () => {
        const response = await request(app)
          .get(`/api/passes/${testGatePass._id}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.gatePass._id).toBe(testGatePass._id);
      });

      test('should return 404 for non-existent pass', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/passes/${fakeId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PATCH /api/passes/:id/approve', () => {
      test('should allow mentor to approve gate pass', async () => {
        const response = await request(app)
          .patch(`/api/passes/${testGatePass._id}/approve`)
          .set('Authorization', `Bearer ${mentorToken}`)
          .send({
            status: 'approved',
            remarks: 'Approved by mentor'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.gatePass.status).toBe('approved');
        expect(response.body.gatePass.mentorApproval.status).toBe('approved');
      });

      test('should not allow student to approve gate pass', async () => {
        const response = await request(app)
          .patch(`/api/passes/${testGatePass._id}/approve`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            status: 'approved',
            remarks: 'Self approval attempt'
          })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('User Management Endpoints', () => {
    describe('GET /api/users/profile', () => {
      test('should get user profile', async () => {
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe('student@test.com');
        expect(response.body.user.password).toBeUndefined();
      });
    });

    describe('PUT /api/users/profile', () => {
      test('should update user profile', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+1234567897'
        };

        const response = await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.firstName).toBe(updateData.firstName);
        expect(response.body.user.lastName).toBe(updateData.lastName);
      });
    });
  });

  describe('Statistics Endpoints', () => {
    describe('GET /api/passes/stats', () => {
      test('should get statistics for HOD', async () => {
        const response = await request(app)
          .get('/api/passes/stats')
          .set('Authorization', `Bearer ${hodToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.stats).toBeDefined();
        expect(typeof response.body.stats.total).toBe('number');
      });

      test('should not allow student to access statistics', async () => {
        const response = await request(app)
          .get('/api/passes/stats')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('QR Code Endpoints', () => {
    describe('POST /api/passes/scan', () => {
      test('should allow security to scan QR code', async () => {
        // First get the QR code from an approved pass
        const passResponse = await request(app)
          .get(`/api/passes/${testGatePass._id}`)
          .set('Authorization', `Bearer ${studentToken}`);

        const qrCode = passResponse.body.gatePass.qrCode;

        const response = await request(app)
          .post('/api/passes/scan')
          .set('Authorization', `Bearer ${securityToken}`)
          .send({ qrCode })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.gatePass).toBeDefined();
      });

      test('should not allow student to scan QR code', async () => {
        const response = await request(app)
          .post('/api/passes/scan')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ qrCode: 'fake-qr-code' })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Notification Endpoints', () => {
    describe('GET /api/notifications', () => {
      test('should get user notifications', async () => {
        const response = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.notifications)).toBe(true);
      });
    });

    describe('PATCH /api/notifications/:id/read', () => {
      test('should mark notification as read', async () => {
        // First create a notification by creating a gate pass
        const passData = {
          reason: 'Another medical appointment',
          destination: 'Local clinic',
          exitTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          returnTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
        };

        await request(app)
          .post('/api/passes')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(passData);

        // Get notifications
        const notificationsResponse = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${studentToken}`);

        if (notificationsResponse.body.notifications.length > 0) {
          const notificationId = notificationsResponse.body.notifications[0]._id;

          const response = await request(app)
            .patch(`/api/notifications/${notificationId}/read`)
            .set('Authorization', `Bearer ${studentToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
        }
      });
    });
  });
});