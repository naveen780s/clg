const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class QRService {
  constructor() {
    this.secretKey = process.env.QR_SECRET_KEY || 'default-qr-secret-key';
  }

  // Generate QR code data for a pass
  async generatePassQR(pass) {
    try {
      const qrData = {
        passId: pass._id,
        studentId: pass.student_id,
        type: pass.category,
        validFrom: pass.departure_time,
        validUntil: pass.return_time,
        status: pass.status,
        securityCode: this.generateSecurityCode(pass._id),
        timestamp: new Date().toISOString()
      };

      // Create JWT token for security
      const token = jwt.sign(qrData, this.secretKey, { expiresIn: '24h' });

      // Generate QR code image
      const qrCodeOptions = {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const qrCodeDataURL = await QRCode.toDataURL(token, qrCodeOptions);

      return {
        qrCode: qrCodeDataURL,
        qrData: token,
        securityCode: qrData.securityCode
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Verify QR code data
  async verifyPassQR(qrToken) {
    try {
      const decoded = jwt.verify(qrToken, this.secretKey);
      
      // Verify security code
      const expectedSecurityCode = this.generateSecurityCode(decoded.passId);
      if (decoded.securityCode !== expectedSecurityCode) {
        throw new Error('Invalid security code');
      }

      // Check if pass is still valid
      const now = new Date();
      const validFrom = new Date(decoded.validFrom);
      const validUntil = new Date(decoded.validUntil);

      if (now < validFrom || now > validUntil) {
        throw new Error('Pass is not valid at this time');
      }

      return {
        valid: true,
        passData: decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Generate security code for pass verification
  generateSecurityCode(passId) {
    const hash = crypto.createHmac('sha256', this.secretKey)
                      .update(passId.toString())
                      .digest('hex');
    return hash.substring(0, 8).toUpperCase();
  }

  // Generate QR code for emergency situations
  async generateEmergencyQR(data) {
    try {
      const emergencyData = {
        type: 'emergency',
        ...data,
        timestamp: new Date().toISOString(),
        validFor: 15 // 15 minutes validity
      };

      const token = jwt.sign(emergencyData, this.secretKey, { expiresIn: '15m' });
      const qrCodeDataURL = await QRCode.toDataURL(token);

      return {
        qrCode: qrCodeDataURL,
        qrData: token,
        validUntil: new Date(Date.now() + 15 * 60 * 1000)
      };
    } catch (error) {
      console.error('Error generating emergency QR code:', error);
      throw error;
    }
  }

  // Batch QR code generation for multiple passes
  async generateBatchQR(passes) {
    try {
      const results = [];

      for (const pass of passes) {
        try {
          const qrResult = await this.generatePassQR(pass);
          results.push({
            passId: pass._id,
            success: true,
            ...qrResult
          });
        } catch (error) {
          results.push({
            passId: pass._id,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error generating batch QR codes:', error);
      throw error;
    }
  }

  // Generate visitor QR code
  async generateVisitorQR(visitorData) {
    try {
      const qrData = {
        type: 'visitor',
        visitorName: visitorData.name,
        phone: visitorData.phone,
        purpose: visitorData.purpose,
        validFrom: visitorData.validFrom,
        validUntil: visitorData.validUntil,
        hostEmployee: visitorData.hostEmployee,
        timestamp: new Date().toISOString()
      };

      const token = jwt.sign(qrData, this.secretKey, { expiresIn: '24h' });
      const qrCodeDataURL = await QRCode.toDataURL(token);

      return {
        qrCode: qrCodeDataURL,
        qrData: token
      };
    } catch (error) {
      console.error('Error generating visitor QR code:', error);
      throw error;
    }
  }
}

module.exports = new QRService();