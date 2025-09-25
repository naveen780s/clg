const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

// Test user data
const testUsers = {
  mentor: {
    name: "Integration Test Mentor",
    email: "mentor@integration.test",
    password: "TestPass123!",
    phone: "9876543211",
    role: "mentor",
    department: "Computer Science"
  },
  hod: {
    name: "Integration Test HOD",
    email: "hod@integration.test",
    password: "TestPass123!",
    phone: "9876543212",
    role: "hod",
    department: "Computer Science"
  },
  student: {
    name: "Integration Test Student",
    email: "student@integration.test",
    password: "TestPass123!",
    phone: "9876543213",
    role: "student",
    department: "Computer Science",
    year: 3,
    student_id: "CS2023001",
    hostel_block: "A",
    room_number: "101"
  }
};

let tokens = {};
let userIds = {};

async function testRegistration() {
  console.log('🧪 Testing Registration...');
  
  try {
    // Register mentor first
    const mentorResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUsers.mentor);
    console.log('✅ Mentor registered:', mentorResponse.data);
    userIds.mentor = mentorResponse.data.data.user._id;
    
    // Register HOD
    const hodResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUsers.hod);
    console.log('✅ HOD registered:', hodResponse.data);
    userIds.hod = hodResponse.data.data.user._id;
    
    // Register student with mentor reference
    const studentData = {
      ...testUsers.student,
      mentor_id: userIds.mentor
    };
    
    const studentResponse = await axios.post(`${API_BASE_URL}/auth/register`, studentData);
    console.log('✅ Student registered:', studentResponse.data);
    userIds.student = studentResponse.data.data.user._id;
    
  } catch (error) {
    console.error('❌ Registration failed:', error.response?.data || error.message);
  }
}

async function testLogin() {
  console.log('\n🧪 Testing Login...');
  
  try {
    // Login mentor
    const mentorLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUsers.mentor.email,
      password: testUsers.mentor.password
    });
    tokens.mentor = mentorLogin.data.data.token;
    console.log('✅ Mentor logged in');
    
    // Login HOD
    const hodLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUsers.hod.email,
      password: testUsers.hod.password
    });
    tokens.hod = hodLogin.data.data.token;
    console.log('✅ HOD logged in');
    
    // Login student
    const studentLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUsers.student.email,
      password: testUsers.student.password
    });
    tokens.student = studentLogin.data.data.token;
    console.log('✅ Student logged in');
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

async function testGatePassFlow() {
  console.log('\n🧪 Testing Gate Pass Workflow...');
  
  try {
    // Student creates gate pass
    const passData = {
      reason: "Integration test medical appointment",
      destination: "City Hospital",
      exitTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      returnTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      category: "medical",
      emergency_contact: {
        name: "Parent Name",
        phone: "9876543214",
        relation: "Father"
      }
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/passes`, passData, {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });
    console.log('✅ Gate pass created:', createResponse.data);
    
    const passId = createResponse.data.data._id;
    
    // Mentor approves
    const mentorApproval = await axios.put(
      `${API_BASE_URL}/passes/${passId}/mentor-approve`,
      {
        action: 'approve',
        comments: 'Integration test approval'
      },
      {
        headers: { Authorization: `Bearer ${tokens.mentor}` }
      }
    );
    console.log('✅ Mentor approved pass:', mentorApproval.data);
    
    // HOD approves
    const hodApproval = await axios.put(
      `${API_BASE_URL}/passes/${passId}/hod-approve`,
      {
        action: 'approve',
        comments: 'Final integration test approval'
      },
      {
        headers: { Authorization: `Bearer ${tokens.hod}` }
      }
    );
    console.log('✅ HOD approved pass:', hodApproval.data);
    
    // Get QR code
    try {
      const qrResponse = await axios.get(`${API_BASE_URL}/passes/${passId}/qr`, {
        headers: { Authorization: `Bearer ${tokens.student}` }
      });
      console.log('✅ QR code generated successfully');
    } catch (qrError) {
      console.log('⚠️ QR code generation:', qrError.response?.data || qrError.message);
    }
    
  } catch (error) {
    console.error('❌ Gate pass workflow failed:', error.response?.data || error.message);
  }
}

async function testProfileAccess() {
  console.log('\n🧪 Testing Profile Access...');
  
  try {
    const profileResponse = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });
    console.log('✅ Profile accessed successfully:', profileResponse.data.name);
  } catch (error) {
    console.error('❌ Profile access failed:', error.response?.data || error.message);
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting Frontend-Backend Integration Tests\n');
  
  await testRegistration();
  await testLogin();
  await testGatePassFlow();
  await testProfileAccess();
  
  console.log('\n✨ Integration tests completed!');
}

// Run the tests
runIntegrationTests().catch(console.error);