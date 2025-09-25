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
  let testGatePass;

  beforeAll(async () => {
    try {
      // Skip test cleanup for integration tests
      process.env.SKIP_TEST_CLEANUP = 'true';
      
      // Initialize the test app
      app = createTestApp();
      
      // Clean up any existing data
      await User.deleteMany({});
      await GatePass.deleteMany({});

      // Create test mentor first
      testMentor = await User.create({
        name: 'Test Mentor',
        email: 'mentor@test.com',
        password: 'TestPass123!',
        phone: '9876543212',
        role: 'mentor',
        department: 'Computer Science',
        is_active: true
      });
      console.log('✅ Test mentor created:', testMentor._id);

      // Create test HOD
      testHOD = await User.create({
        name: 'Test HOD',
        email: 'hod@test.com',
        password: 'TestPass123!',
        phone: '9876543211',
        role: 'hod',
        department: 'Computer Science',
        is_active: true
      });
      console.log('✅ Test HOD created:', testHOD._id);

      // Create test security
      const testSecurity = await User.create({
        name: 'Security Guard',
        email: 'security@college.edu',
        password: 'TestPass123!',
        phone: '9876543214',
        role: 'security',
        department: 'Other',
        is_active: true
      });
      console.log('✅ Test security created:', testSecurity._id);

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
        mentor_id: testMentor._id,
        is_active: true
      });
      console.log('✅ Test student created:', testStudent._id);

      // Get auth tokens with error handling
      const studentLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@test.com',
          password: 'TestPass123!'
        });
      
      if (studentLogin.status === 200 && studentLogin.body.data?.token) {
        studentToken = studentLogin.body.data.token;
        console.log('✅ Student token generated');
      } else {
        console.error('❌ Student login failed:', studentLogin.body);
        throw new Error('Student login failed');
      }

      const mentorLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mentor@test.com',
          password: 'TestPass123!'
        });
      
      if (mentorLogin.status === 200 && mentorLogin.body.data?.token) {
        mentorToken = mentorLogin.body.data.token;
        console.log('✅ Mentor token generated');
      } else {
        console.error('❌ Mentor login failed:', mentorLogin.body);
        throw new Error('Mentor login failed');
      }

      const hodLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'hod@test.com',
          password: 'TestPass123!'
        });
      
      if (hodLogin.status === 200 && hodLogin.body.data?.token) {
        hodToken = hodLogin.body.data.token;
        console.log('✅ HOD token generated');
      } else {
        console.error('❌ HOD login failed:', hodLogin.body);
        throw new Error('HOD login failed');
      }

      const securityLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@college.edu',
          password: 'TestPass123!'
        });
      
      if (securityLogin.status === 200 && securityLogin.body.data?.token) {
        securityToken = securityLogin.body.data.token;
        console.log('✅ Security token generated');
      } else {
        console.error('❌ Security login failed:', securityLogin.body);
        throw new Error('Security login failed');
      }

      // Create a test gate pass for testing gate pass endpoints
      testGatePass = await GatePass.create({
        student_id: testStudent._id,
        mentor_id: testMentor._id,
        hod_id: testHOD._id,
        reason: 'Medical appointment',
        destination: 'City Hospital', 
        departure_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
        return_time: new Date(Date.now() + 6 * 60 * 60 * 1000),
        emergency_contact: {
          name: 'Parent Name',
          phone: '9876543210',
          relation: 'Father'
        },
        category: 'medical',
        status: 'pending'
      });
      console.log('✅ Test gate pass created:', testGatePass._id);

    } catch (error) {
      console.error('❌ Test setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await GatePass.deleteMany({});
    
    // Re-enable test cleanup for other tests
    delete process.env.SKIP_TEST_CLEANUP;
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      test('should register a new student successfully', async () => {
        const userData = {
          name: 'New Student',
          email: 'newstudent@test.com',
          password: 'TestPass123!',
          phone: '9876543210',
          role: 'student',
          department: 'Computer Science',
          year: 2,
          student_id: 'CS2022001',
          hostel_block: 'A',
          room_number: '201',
          mentor_id: testMentor._id
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(userData.email);
        expect(response.body.data.user.password).toBeUndefined();
        expect(response.body.data.token).toBeDefined();
      });

      test('should not register user with duplicate email', async () => {
        // First register a user
        const firstUser = {
          name: 'First User',
          email: 'duplicate@test.com',
          password: 'TestPass123!',
          phone: '9876543215',
          role: 'mentor',
          department: 'Computer Science'
        };
        
        await request(app)
          .post('/api/auth/register')
          .send(firstUser)
          .expect(201);

        // Then try to register another user with the same email
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Second User',
            email: 'duplicate@test.com', // Same email
            password: 'TestPass123!',
            phone: '9876543216',
            role: 'hod',
            department: 'Computer Science'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already exists');
      });
    });

    describe('POST /api/auth/login', () => {
      test('should login with valid credentials', async () => {
        // Create a fresh user for login test
        const testUser = await User.create({
          name: 'Login Test User',
          email: 'logintest@test.com',
          password: 'TestPass123!',
          phone: '9876543216',
          role: 'mentor',
          department: 'Computer Science',
          is_active: true
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'logintest@test.com',
            password: 'TestPass123!'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.user.email).toBe('logintest@test.com');
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
        expect(response.body.message).toContain('incorrect');
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
          departure_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          return_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          emergency_contact: {
            name: 'Parent Name',
            phone: '9876543210',
            relation: 'Father'
          },
          category: 'medical'
        };

        const response = await request(app)
          .post('/api/passes')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(passData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.gatePass.reason).toBe(passData.reason);
        expect(response.body.data.gatePass.status).toBe('pending');
        
        testGatePass = response.body.data.gatePass;
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
        expect(Array.isArray(response.body.data.passes)).toBe(true);
        expect(response.body.data.passes.length).toBeGreaterThan(0);
      });

      test('should support pagination', async () => {
        const response = await request(app)
          .get('/api/passes?page=1&limit=5')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(5);
      });
    });

    describe('GET /api/passes/:id', () => {
      test('should get specific gate pass', async () => {
        const response = await request(app)
          .get(`/api/passes/${testGatePass._id}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.gatePass._id).toBe(testGatePass._id);
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

    describe('PUT /api/passes/:id/mentor-approve', () => {
      test('should allow mentor to approve gate pass', async () => {
        const response = await request(app)
          .put(`/api/passes/${testGatePass._id}/mentor-approve`)
          .set('Authorization', `Bearer ${mentorToken}`)
          .send({
            action: 'approve',
            comments: 'Approved by mentor'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.gatePass.status).toBe('mentor_approved');
      });

      test('should not allow student to approve gate pass', async () => {
        const response = await request(app)
          .put(`/api/passes/${testGatePass._id}/mentor-approve`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            action: 'approve',
            comments: 'Self approval attempt'
          })
          .expect(403);

        expect(response.body.error).toBeDefined();
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

        expect(response.body.email).toBe('student@test.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.role).toBe('student');
      });
    });

    describe('PUT /api/users/profile', () => {
      test('should update user profile', async () => {
        const updateData = {
          name: 'Updated Name',
          phone: '9876543297'
        };

        const response = await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.message).toBe('Profile updated successfully');
        expect(response.body.user.name).toBe(updateData.name);
        expect(response.body.user.phone).toBe(updateData.phone);
      });
    });
  });

  describe('Statistics Endpoints', () => {
    describe('GET /api/passes/stats/dashboard', () => {
      test('should get statistics for HOD', async () => {
        const response = await request(app)
          .get('/api/passes/stats/dashboard')
          .set('Authorization', `Bearer ${hodToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.stats).toBeDefined();
        expect(typeof response.body.data.stats.total).toBe('number');
      });

      test('should not allow student to access statistics', async () => {
        const response = await request(app)
          .get('/api/passes/stats/dashboard')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);

        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('QR Code Endpoints', () => {
    describe('GET /api/passes/:id/qr', () => {
      test('should get QR code for gate pass', async () => {
        // First approve the pass by mentor
        await request(app)
          .put(`/api/passes/${testGatePass._id}/mentor-approve`)
          .set('Authorization', `Bearer ${mentorToken}`)
          .send({ action: 'approve', comments: 'Approved for QR test' })
          .expect(200);

        // Then approve by HOD to generate QR code
        await request(app)
          .put(`/api/passes/${testGatePass._id}/hod-approve`)
          .set('Authorization', `Bearer ${hodToken}`)
          .send({ action: 'approve', comments: 'Final approval for QR test' })
          .expect(200);

        // Now get QR code
        const response = await request(app)
          .get(`/api/passes/${testGatePass._id}/qr`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.qrCode).toBeDefined();
        expect(response.body.data.passId).toBe(testGatePass.passId);
      });

      test('should not allow unauthorized access to QR code', async () => {
        const response = await request(app)
          .get(`/api/passes/${testGatePass._id}/qr`)
          .expect(401);

        expect(response.body.error).toBe('Access denied');
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

        expect(Array.isArray(response.body.notifications)).toBe(true);
        expect(typeof response.body.total).toBe('number');
        expect(typeof response.body.currentPage).toBe('number');
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

          expect(response.body.message).toBeDefined();
        }
      });
    });
  });
});