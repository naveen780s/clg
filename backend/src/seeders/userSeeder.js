const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-gate-pass', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️ Cleared existing users');

    // Create non-student users first
    const nonStudentUsers = [
      {
        name: 'Dr. Sarah Mentor',
        email: 'mentor@college.edu',
        password: 'password123',
        role: 'mentor',
        department: 'Computer Science',
        phone: '9876543211',
        is_active: true,
        mentees: []
      },
      {
        name: 'Prof. Michael HOD',
        email: 'hod@college.edu',
        password: 'password123',
        role: 'hod',
        department: 'Computer Science',
        phone: '9876543212',
        is_active: true
      },
      {
        name: 'Security Guard',
        email: 'security@college.edu',
        password: 'password123',
        role: 'security',
        department: 'Other',
        phone: '9876543213',
        is_active: true
      }
    ];

    // Create non-student users
    const createdUsers = [];
    for (const userData of nonStudentUsers) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`✅ Created ${user.role}: ${user.email}`);
    }

    // Find the mentor
    const mentor = createdUsers.find(u => u.role === 'mentor');
    
    // Create student with mentor reference
    const studentData = {
      name: 'John Student',
      email: 'student@college.edu',
      password: 'password123',
      role: 'student',
      department: 'Computer Science',
      phone: '9876543210',
      student_id: '21CS001',
      year: 3,
      hostel_block: 'A',
      room_number: '101',
      mentor_id: mentor._id,
      is_active: true
    };

    const student = await User.create(studentData);
    createdUsers.push(student);
    console.log(`✅ Created ${student.role}: ${student.email}`);

    // Link student to mentor's mentees list
    mentor.mentees = [student._id];
    await mentor.save();
    console.log('🔗 Linked student to mentor');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('Student: student@college.edu / password123');
    console.log('Mentor: mentor@college.edu / password123');
    console.log('HOD: hod@college.edu / password123');
    console.log('Security: security@college.edu / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the seeder
seedUsers();