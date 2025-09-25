<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# College Gate Pass Management System

A comprehensive MERN stack web application for managing hostel student gate passes with multi-level approval workflow, real-time notifications, and single-use pass security.

## 🚀 Overview

This system digitizes the traditional gate pass approval process for college hostel students, providing a secure, efficient, and transparent way to manage student exit permissions. The application features multi-role authentication, real-time notifications, automated pass expiry, and single-use security tokens.

## ✨ Key Features

### 🔐 Role-Based Authentication

- **Students**: Submit gate pass requests, track approval status
- **Mentors**: Approve/reject student requests from assigned mentees
- **HODs**: Final approval authority with department-wide oversight
- JWT-based authentication with role-specific permissions


### 📱 Multi-Channel Notifications

- **Real-time notifications** via Socket.io for instant updates
- **SMS notifications** via Twilio for critical updates
- **Browser push notifications** for desktop users
- **Email alerts** for high-priority notifications


### 🔒 Advanced Security Features

- **Single-use passes** with unique verification tokens
- **1-hour automatic expiry** after final approval
- **QR code generation** for mobile verification
- **Audit trail** for all approval actions
- **IP-based access control** and session management


### ⚡ Smart Pass Management

- **Automated expiry system** with cron jobs
- **Pass status tracking** (pending, approved, used, expired)
- **PDF generation** with timestamps and approval chain
- **Multi-department support** with isolated data access


## 🛠 Technical Stack

### Frontend

- **React.js** - User interface and component management
- **Socket.io-client** - Real-time notifications
- **Axios** - HTTP client for API calls
- **React Router** - Navigation and protected routes
- **Material-UI/Tailwind CSS** - UI components and styling


### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework and API routes
- **Socket.io** - Real-time communication
- **JWT** - Authentication and authorization
- **Bcrypt** - Password encryption
- **Multer** - File upload handling


### Database

- **MongoDB** - Primary database with collections:
    - Users (students, mentors, HODs)
    - GatePasses (requests and approvals)
    - Notifications (system alerts)
    - Sessions (device-specific login tracking)


### External Services

- **Twilio** - SMS notifications
- **QRCode.js** - QR code generation
- **PDFKit** - PDF document generation
- **Node-cron** - Automated task scheduling


## 🏗 System Architecture

```
Frontend (React)     Backend (Node.js)     Database (MongoDB)
     |                      |                      |
  [Student UI]    ←→   [Auth Middleware]    ←→   [User Collection]
  [Mentor UI]     ←→   [RBAC System]       ←→   [GatePass Collection]
  [HOD UI]        ←→   [Notification API]  ←→   [Notification Collection]
     |                      |                      |
[Socket.io Client] ←→ [Socket.io Server]  ←→   [Session Management]
     |                      |
[Push Notifications] ← [SMS Service (Twilio)]
```


## 📋 Database Schema

### User Schema

```javascript
{
  name: String (required),
  email: String (unique, required),
  password: String (hashed, required),
  role: Enum ['student', 'mentor', 'hod'],
  department: String (required),
  phone: String (required),
  hostel_block: String, // Students only
  student_id: String, // Students only
  mentor_id: ObjectId, // Students only
  permissions: [String],
  createdAt: Date,
  updatedAt: Date
}
```


### GatePass Schema

```javascript
{
  passId: String (unique, required),
  student_id: ObjectId (ref: 'User'),
  mentor_id: ObjectId (ref: 'User'),
  hod_id: ObjectId (ref: 'User'),
  reason: String (required),
  destination: String (required),
  departure_time: Date (required),
  return_time: Date (required),
  mentor_approval: {
    status: Enum ['pending', 'approved', 'rejected'],
    timestamp: Date,
    comments: String
  },
  hod_approval: {
    status: Enum ['pending', 'approved', 'rejected'],
    timestamp: Date,
    comments: String
  },
  uniqueToken: String, // Single-use verification
  qrCode: String, // Base64 QR code
  isUsed: Boolean (default: false),
  usedAt: Date,
  usedBy: String, // Security guard ID
  expiresAt: Date,
  status: Enum ['pending', 'approved', 'used', 'expired'],
  pdfUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```


## 🔄 Approval Workflow

1. **Student Submission**
    - Student fills request form with reason, destination, timing
    - System assigns mentor based on student-mentor mapping
    - Real-time notification sent to assigned mentor
2. **Mentor Approval**
    - Mentor reviews request and approves/rejects
    - If approved, notification sent to department HOD
    - If rejected, student receives rejection notification
3. **HOD Final Approval**
    - HOD reviews mentor-approved requests
    - Final approval triggers pass generation with:
        - Unique verification token
        - QR code for mobile scanning
        - 1-hour automatic expiry timer
        - PDF document with digital signature
4. **Pass Usage \& Verification**
    - Security guard scans QR code or enters pass ID
    - System verifies token validity and expiry
    - Single-use enforcement prevents reuse
    - Usage timestamp logged for audit trail

## 🚀 Installation \& Setup

### Prerequisites

```bash
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager
- Twilio account for SMS notifications
```


### Backend Setup

```bash
# Clone repository
git clone https://github.com/your-username/college-gate-pass-system.git
cd college-gate-pass-system/backend

# Install dependencies
npm install

# Environment variables (.env)
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gatepass
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Start development server
npm run dev
```


### Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Environment variables (.env)
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000

# Start development server
npm start
```


## 📱 API Endpoints

### Authentication Routes

```javascript
POST /api/auth/login           // Multi-role login
POST /api/auth/register        // User registration
POST /api/auth/logout          // Session termination
GET  /api/auth/profile         // Get user profile
```


### Gate Pass Routes

```javascript
POST /api/passes               // Submit new request (Student)
GET  /api/passes               // Get user-specific passes
GET  /api/passes/pending       // Get pending approvals (Mentor/HOD)
PUT  /api/passes/:id/mentor    // Mentor approval (Mentor)
PUT  /api/passes/:id/hod       // HOD approval (HOD)
POST /api/passes/:id/verify    // Verify and use pass (Security)
GET  /api/passes/:id/pdf       // Download pass PDF
```


### Notification Routes

```javascript
GET  /api/notifications        // Get user notifications
PUT  /api/notifications/:id    // Mark as read
POST /api/notifications/test   // Send test notification
```


## 🔒 Security Implementation

### Authentication Middleware

```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[^1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};
```


### Role-Based Access Control

```javascript
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};
```


### Single-Use Pass Verification

```javascript
const verifyPass = async (passId, securityGuardId) => {
  const pass = await GatePass.findOne({ passId });
  
  if (!pass || pass.isUsed || new Date() > pass.expiresAt) {
    return { success: false, message: 'Invalid or expired pass' };
  }
  
  // Mark as used and log usage
  await GatePass.findByIdAndUpdate(pass._id, {
    isUsed: true,
    usedAt: new Date(),
    usedBy: securityGuardId,
    status: 'used'
  });
  
  return { success: true };
};
```


## 📊 Automated Systems

### Pass Expiry Scheduler

```javascript
// Check for expired passes every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const expiredPasses = await GatePass.find({
    status: 'approved',
    expiresAt: { $lt: new Date() },
    isUsed: false
  });
  
  for (const pass of expiredPasses) {
    await GatePass.findByIdAndUpdate(pass._id, { status: 'expired' });
    await sendExpiryNotification(pass.student_id);
  }
});
```


## 🧪 Testing

### Unit Tests

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```


### Integration Tests

```bash
npm run test:integration  # API endpoint tests
npm run test:db           # Database operation tests
```


## 🚀 Deployment

### Production Environment

```bash
# Build frontend
cd frontend && npm run build

# Start production server
cd backend && npm start

# PM2 Process Management
pm2 start ecosystem.config.js
```


### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```


## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 👥 Team

- **Frontend Developer**: React.js, UI/UX Design
- **Backend Developer**: Node.js, API Development
- **Database Designer**: MongoDB Schema Design
- **DevOps Engineer**: Deployment and Infrastructure


## 📞 Support

For support and queries, contact:

- Email: support@collegegateplass.com
- Issues: [GitHub Issues](https://github.com/your-username/college-gate-pass-system/issues)
- Documentation: [Wiki](https://github.com/your-username/college-gate-pass-system/wiki)

***

**Built with ❤️ using MERN Stack for secure and efficient hostel management.**
<span style="display:none">[^2][^3][^4][^5][^6]</span>

```
<div style="text-align: center">⁂</div>
```

[^1]: https://github.com/Akhilez/GatePassSystem

[^2]: https://github.com/Sajansharma0017/Smart-Gatepass

[^3]: https://www.academia.edu/129213567/Gatepass_Generation_and_Management_System

[^4]: https://www.ijfmr.com/papers/2024/5/27464.pdf

[^5]: https://kalvisalai.in/college-erp-gate-pass-system.php

[^6]: https://dl.ucsc.cmb.ac.lk/jspui/bitstream/123456789/4302/1/2015MIT018.pdf

