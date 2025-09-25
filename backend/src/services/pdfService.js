const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRService = require('./qrService');

class PDFService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads/pdfs');
    this.ensureUploadsDirExists();
  }

  ensureUploadsDirExists() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async generatePassPDF(gatePass) {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Create buffer to store PDF
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        doc.on('error', reject);

        // Add content to PDF
        this.addHeader(doc);
        this.addPassDetails(doc, gatePass);
        this.addApprovalSection(doc, gatePass);
        this.addQRCode(doc, gatePass);
        this.addFooter(doc);

        doc.end();
      });

    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  addHeader(doc) {
    // College Logo and Header
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('COLLEGE GATE PASS', 0, 50, { align: 'center' });

    doc.fontSize(16)
       .font('Helvetica')
       .text('Official Gate Pass Document', 0, 80, { align: 'center' });

    // Add line separator
    doc.moveTo(50, 110)
       .lineTo(550, 110)
       .stroke();
  }

  addPassDetails(doc, gatePass) {
    const startY = 140;
    let currentY = startY;

    // Pass ID and Status
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Pass ID:', 50, currentY)
       .font('Helvetica')
       .text(gatePass.passId || gatePass._id.toString().substring(0, 8).toUpperCase(), 150, currentY);

    currentY += 20;

    doc.font('Helvetica-Bold')
       .text('Status:', 50, currentY)
       .font('Helvetica')
       .fillColor(this.getStatusColor(gatePass.status))
       .text(gatePass.status.toUpperCase(), 150, currentY)
       .fillColor('black');

    currentY += 30;

    // Student Details
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Student Information', 50, currentY);
    
    currentY += 25;

    const studentInfo = [
      ['Name:', gatePass.student_id.name],
      ['Student ID:', gatePass.student_id.student_id || 'N/A'],
      ['Department:', gatePass.student_id.department],
      ['Year:', gatePass.student_id.year || 'N/A'],
      ['Phone:', gatePass.student_id.phone],
      ['Email:', gatePass.student_id.email]
    ];

    studentInfo.forEach(([label, value]) => {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(label, 50, currentY)
         .font('Helvetica')
         .text(value || 'N/A', 150, currentY);
      currentY += 18;
    });

    currentY += 20;

    // Pass Details
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Pass Details', 50, currentY);
    
    currentY += 25;

    const passDetails = [
      ['Category:', gatePass.category?.toUpperCase()],
      ['Reason:', gatePass.reason],
      ['Destination:', gatePass.destination],
      ['Departure Time:', this.formatDateTime(gatePass.departure_time)],
      ['Return Time:', this.formatDateTime(gatePass.return_time)],
      ['Priority:', gatePass.priority?.toUpperCase()],
      ['Created On:', this.formatDateTime(gatePass.createdAt)]
    ];

    passDetails.forEach(([label, value]) => {
      if (label === 'Reason:' && value && value.length > 50) {
        // Handle long reason text
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(label, 50, currentY);
        currentY += 15;
        doc.font('Helvetica')
           .text(value, 50, currentY, { width: 500, align: 'justify' });
        currentY += Math.ceil(value.length / 80) * 15 + 5;
      } else {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(label, 50, currentY)
           .font('Helvetica')
           .text(value || 'N/A', 150, currentY);
        currentY += 18;
      }
    });

    // Emergency Contact
    if (gatePass.emergency_contact) {
      currentY += 10;
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Emergency Contact', 50, currentY);
      
      currentY += 25;

      const emergencyDetails = [
        ['Name:', gatePass.emergency_contact.name],
        ['Phone:', gatePass.emergency_contact.phone],
        ['Relation:', gatePass.emergency_contact.relation]
      ];

      emergencyDetails.forEach(([label, value]) => {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(label, 50, currentY)
           .font('Helvetica')
           .text(value || 'N/A', 150, currentY);
        currentY += 18;
      });
    }
  }

  addApprovalSection(doc, gatePass) {
    let currentY = 500; // Start approval section lower

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Approval Details', 50, currentY);
    
    currentY += 25;

    // Mentor Approval
    if (gatePass.mentor_approval) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Mentor Approval:', 50, currentY);
      
      currentY += 20;

      const mentorDetails = [
        ['Status:', gatePass.mentor_approval.status?.toUpperCase()],
        ['Approved By:', gatePass.mentor_id?.name],
        ['Date:', this.formatDateTime(gatePass.mentor_approval.timestamp)],
        ['Comments:', gatePass.mentor_approval.comments || 'No comments']
      ];

      mentorDetails.forEach(([label, value]) => {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text(label, 70, currentY)
           .font('Helvetica')
           .fillColor(label === 'Status:' ? this.getStatusColor(gatePass.mentor_approval.status) : 'black')
           .text(value || 'N/A', 170, currentY)
           .fillColor('black');
        currentY += 15;
      });

      currentY += 10;
    }

    // HOD Approval
    if (gatePass.hod_approval) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('HOD Approval:', 50, currentY);
      
      currentY += 20;

      const hodDetails = [
        ['Status:', gatePass.hod_approval.status?.toUpperCase()],
        ['Approved By:', gatePass.hod_id?.name],
        ['Date:', this.formatDateTime(gatePass.hod_approval.timestamp)],
        ['Comments:', gatePass.hod_approval.comments || 'No comments']
      ];

      hodDetails.forEach(([label, value]) => {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text(label, 70, currentY)
           .font('Helvetica')
           .fillColor(label === 'Status:' ? this.getStatusColor(gatePass.hod_approval.status) : 'black')
           .text(value || 'N/A', 170, currentY)
           .fillColor('black');
        currentY += 15;
      });
    }
  }

  async addQRCode(doc, gatePass) {
    try {
      if (gatePass.qrCode) {
        // Add QR code section
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Security QR Code:', 350, 500);

        // Convert base64 QR code to buffer and add to PDF
        const qrBuffer = Buffer.from(gatePass.qrCode.replace(/^data:image\/png;base64,/, ''), 'base64');
        doc.image(qrBuffer, 350, 520, { width: 150, height: 150 });

        // Add security code
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Security Code:', 350, 680)
           .font('Helvetica')
           .text(gatePass.securityCode || 'N/A', 350, 695);
      }
    } catch (error) {
      console.error('Error adding QR code to PDF:', error);
      // Continue without QR code if there's an error
    }
  }

  addFooter(doc) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 100;

    // Add footer line
    doc.moveTo(50, footerY)
       .lineTo(550, footerY)
       .stroke();

    // Footer text
    doc.fontSize(10)
       .font('Helvetica')
       .text('This is a computer-generated document. No signature required.', 50, footerY + 10)
       .text(`Generated on: ${this.formatDateTime(new Date())}`, 50, footerY + 25)
       .text('For any queries, contact the college administration.', 50, footerY + 40);

    // College contact info (if available)
    doc.text('College Gate Pass Management System', 0, footerY + 60, { align: 'center' });
  }

  formatDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  getStatusColor(status) {
    const colors = {
      'pending': '#FFA500',
      'mentor_approved': '#4169E1',
      'approved': '#008000',
      'rejected': '#FF0000',
      'used': '#800080',
      'expired': '#808080'
    };
    return colors[status] || '#000000';
  }

  // Generate visitor pass PDF
  async generateVisitorPDF(visitorData) {
    try {
      const doc = new PDFDocument({ size: 'A4' });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        doc.on('error', reject);

        // Add visitor pass content
        this.addVisitorHeader(doc);
        this.addVisitorDetails(doc, visitorData);
        this.addVisitorFooter(doc);

        doc.end();
      });

    } catch (error) {
      console.error('Visitor PDF generation error:', error);
      throw error;
    }
  }

  addVisitorHeader(doc) {
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('VISITOR PASS', 0, 50, { align: 'center' });
    
    doc.moveTo(50, 80)
       .lineTo(550, 80)
       .stroke();
  }

  addVisitorDetails(doc, visitorData) {
    let currentY = 120;

    const details = [
      ['Visitor Name:', visitorData.name],
      ['Phone:', visitorData.phone],
      ['Purpose:', visitorData.purpose],
      ['Host Employee:', visitorData.hostEmployee],
      ['Valid From:', this.formatDateTime(visitorData.validFrom)],
      ['Valid Until:', this.formatDateTime(visitorData.validUntil)],
      ['Issue Time:', this.formatDateTime(new Date())]
    ];

    details.forEach(([label, value]) => {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text(label, 50, currentY)
         .font('Helvetica')
         .text(value || 'N/A', 200, currentY);
      currentY += 25;
    });
  }

  addVisitorFooter(doc) {
    doc.fontSize(12)
       .text('Please carry this pass at all times during your visit.', 50, 400)
       .text('Report to security before leaving the premises.', 50, 420);
  }

  // Save PDF file and return file path
  async savePDFFile(pdfBuffer, filename) {
    try {
      const filePath = path.join(this.uploadsDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);
      return `/uploads/pdfs/${filename}`;
    } catch (error) {
      console.error('Error saving PDF file:', error);
      throw error;
    }
  }
}

module.exports = new PDFService();