const twilio = require('twilio');

class SMSService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (this.accountSid && this.authToken && this.phoneNumber) {
      this.client = twilio(this.accountSid, this.authToken);
      this.isEnabled = true;
    } else {
      console.warn('Twilio credentials not configured. SMS service disabled.');
      this.isEnabled = false;
    }
  }

  async sendSMS(to, message) {
    if (!this.isEnabled) {
      console.log('SMS service disabled. Would send:', { to, message });
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      // Format phone number to include country code if needed
      const formattedPhone = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: formattedPhone
      });

      console.log(`SMS sent successfully to ${to}. SID: ${result.sid}`);
      
      return {
        success: true,
        sid: result.sid,
        message: 'SMS sent successfully'
      };

    } catch (error) {
      console.error('SMS sending failed:', error);
      
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If it's an Indian number without country code, add +91
    if (cleanPhone.length === 10 && cleanPhone.startsWith('6') || 
        cleanPhone.startsWith('7') || cleanPhone.startsWith('8') || 
        cleanPhone.startsWith('9')) {
      return `+91${cleanPhone}`;
    }
    
    // If it already has country code
    if (cleanPhone.length > 10) {
      return `+${cleanPhone}`;
    }
    
    return phone; // Return as-is if format is unclear
  }

  // Send pass submission notification
  async notifyPassSubmitted(studentPhone, passId, mentorName) {
    const message = `🎓 Gate Pass Alert: Your pass request (${passId}) has been submitted for approval by ${mentorName}. You'll be notified once reviewed. - College Gate Pass System`;
    
    return await this.sendSMS(studentPhone, message);
  }

  // Send mentor approval notification
  async notifyMentorApproval(studentPhone, passId, status, comments = '') {
    const statusText = status === 'approved' ? 'APPROVED by your mentor' : 'REJECTED by your mentor';
    const commentText = comments ? `\nReason: ${comments}` : '';
    
    const message = `🎓 Gate Pass Update: Your pass ${passId} has been ${statusText}.${commentText} Check the app for details. - College Gate Pass System`;
    
    return await this.sendSMS(studentPhone, message);
  }

  // Send HOD final approval notification
  async notifyFinalApproval(studentPhone, passId, status, comments = '') {
    if (status === 'approved') {
      const message = `🎓 Gate Pass APPROVED: Your pass ${passId} is now APPROVED by HOD! 🎉 Show your QR code at the gate. Valid for limited time. - College Gate Pass System`;
      return await this.sendSMS(studentPhone, message);
    } else {
      const commentText = comments ? `\nReason: ${comments}` : '';
      const message = `🎓 Gate Pass REJECTED: Your pass ${passId} was rejected by HOD.${commentText} Please contact administration if needed. - College Gate Pass System`;
      return await this.sendSMS(studentPhone, message);
    }
  }

  // Send pass usage notification
  async notifyPassUsed(studentPhone, passId, exitTime) {
    const message = `🎓 Gate Pass Used: Your pass ${passId} was used for exit at ${exitTime}. Remember to return on time! Safe travels. - College Gate Pass System`;
    
    return await this.sendSMS(studentPhone, message);
  }

  // Send pass expiry warning
  async notifyPassExpiring(studentPhone, passId, expiryTime) {
    const message = `⚠️ Gate Pass Expiring: Your approved pass ${passId} will expire at ${expiryTime}. Use it soon or it will become invalid! - College Gate Pass System`;
    
    return await this.sendSMS(studentPhone, message);
  }

  // Send pass expiry notification
  async notifyPassExpired(studentPhone, passId) {
    const message = `❌ Gate Pass Expired: Your pass ${passId} has expired and is no longer valid. Please request a new pass if needed. - College Gate Pass System`;
    
    return await this.sendSMS(studentPhone, message);
  }

  // Send return reminder
  async notifyReturnReminder(studentPhone, passId, returnTime) {
    const message = `🔔 Return Reminder: Your return time for pass ${passId} is ${returnTime}. Please return on time to avoid penalties. - College Gate Pass System`;
    
    return await this.sendSMS(studentPhone, message);
  }

  // Send late return warning
  async notifyLateReturn(studentPhone, passId, overdueHours) {
    const message = `⚠️ Late Return Alert: You are ${overdueHours} hours overdue for pass ${passId}. Please return immediately or contact administration. - College Gate Pass System`;
    
    return await this.sendSMS(studentPhone, message);
  }

  // Send emergency notification
  async sendEmergencyNotification(phoneNumbers, message, studentName, passId) {
    const emergencyMessage = `🚨 EMERGENCY ALERT: ${message}\nStudent: ${studentName}\nPass ID: ${passId}\nTime: ${new Date().toLocaleString()}\n- College Gate Pass System`;
    
    const results = [];
    
    for (const phone of phoneNumbers) {
      const result = await this.sendSMS(phone, emergencyMessage);
      results.push({ phone, ...result });
    }
    
    return results;
  }

  // Send bulk notifications (for HODs/Mentors)
  async sendBulkNotification(phoneNumbers, message) {
    const results = [];
    
    for (const phone of phoneNumbers) {
      const result = await this.sendSMS(phone, message);
      results.push({ phone, ...result });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  // Send mentor notification about new pass request
  async notifyMentorNewRequest(mentorPhone, studentName, passId, reason) {
    const message = `🎓 New Pass Request: ${studentName} has requested a gate pass (${passId}) for: ${reason.substring(0, 50)}... Please review in the app. - College Gate Pass System`;
    
    return await this.sendSMS(mentorPhone, message);
  }

  // Send HOD notification about mentor-approved pass
  async notifyHODNewApproval(hodPhone, studentName, passId, mentorName) {
    const message = `🎓 Pass for HOD Review: ${studentName}'s pass (${passId}) has been approved by ${mentorName} and awaits your final approval. Check the app. - College Gate Pass System`;
    
    return await this.sendSMS(hodPhone, message);
  }

  // Send security notification for approved passes
  async notifySecurityApprovedPass(securityPhones, studentName, passId, exitTime) {
    const message = `🔒 Security Alert: New approved gate pass for ${studentName} (${passId}). Expected exit: ${exitTime}. Please verify QR code before allowing exit. - College Gate Pass System`;
    
    const results = [];
    for (const phone of securityPhones) {
      const result = await this.sendSMS(phone, message);
      results.push({ phone, ...result });
    }
    
    return results;
  }

  // Test SMS functionality
  async sendTestSMS(phone) {
    const message = `🧪 Test Message: This is a test SMS from College Gate Pass Management System. SMS service is working correctly! Sent at ${new Date().toLocaleString()}`;
    
    return await this.sendSMS(phone, message);
  }

  // Get SMS service status
  getServiceStatus() {
    return {
      enabled: this.isEnabled,
      configured: !!(this.accountSid && this.authToken && this.phoneNumber),
      phoneNumber: this.phoneNumber ? `***${this.phoneNumber.slice(-4)}` : 'Not configured'
    };
  }
}

module.exports = new SMSService();