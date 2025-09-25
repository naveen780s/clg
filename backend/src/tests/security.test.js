const request = require('supertest');
const mongoose = require('mongoose');
const createTestApp = require('../testServer');
const User = require('../models/User');
const GatePass = require('../models/GatePass');

describe('API Security Tests', () => {
  let app;
  let studentToken;
  let mentorToken;
  let testStudent;
  let testMentor;

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

    // Create test student
    testStudent = await User.create({
      name: 'Test Student',
      email: 'student@test.com',
      password: 'TestPass123!',
      phone: '9876543211',
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
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await GatePass.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Authentication Security', () => {
    test('should prevent access without token', async () => {
      const response = await request(app)
        .get('/api/passes')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    test('should prevent access with invalid token', async () => {
      const response = await request(app)
        .get('/api/passes')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should prevent access with malformed token', async () => {
      const response = await request(app)
        .get('/api/passes')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should reject weak passwords during registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'weak@test.com',
          password: '123', // Weak password
          phone: '+1234567892',
          role: 'student',
          department: 'Computer Science'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('Authorization Security', () => {
    test('should prevent students from approving passes', async () => {
      // Create a test gate pass
      const gatePass = await GatePass.create({
        student: testStudent._id,
        reason: 'Medical appointment',
        destination: 'Hospital',
        exitTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        returnTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        status: 'pending'
      });

      const response = await request(app)
        .patch(`/api/passes/${gatePass._id}/approve`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          status: 'approved',
          remarks: 'Approved'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });

    test('should prevent accessing other users data', async () => {
      const response = await request(app)
        .get(`/api/users/${testMentor._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Input Validation Security', () => {
    test('should prevent SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "'; DROP TABLE users; --",
          password: 'anything'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should prevent XSS in gate pass creation', async () => {
      const response = await request(app)
        .post('/api/passes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          reason: '<script>alert("XSS")</script>',
          destination: 'Test location',
          exitTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          returnTime: new Date(Date.now() + 4 * 60 * 60 * 1000)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    test('should validate MongoDB ObjectIds', async () => {
      const response = await request(app)
        .get('/api/passes/invalid-id')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should enforce field length limits', async () => {
      const longString = 'A'.repeat(1000);
      
      const response = await request(app)
        .post('/api/passes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          reason: longString,
          destination: 'Test location',
          exitTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          returnTime: new Date(Date.now() + 4 * 60 * 60 * 1000)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting Security', () => {
    test('should rate limit login attempts', async () => {
      const requests = [];
      
      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'wrong@test.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should rate limit API requests', async () => {
      const requests = [];
      
      // Make many API requests
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app)
            .get('/api/passes')
            .set('Authorization', `Bearer ${studentToken}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Data Protection Security', () => {
    test('should not expose sensitive user data', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.__v).toBeUndefined();
    });

    test('should hash passwords in database', async () => {
      const user = await User.findById(testStudent._id);
      expect(user.password).not.toBe('TestPass123!');
      expect(user.password.length).toBeGreaterThan(20); // Hashed password should be longer
    });
  });

  describe('CORS Security', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/auth/login');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/api/auth/login');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });
});