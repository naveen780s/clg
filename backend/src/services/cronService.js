const cron = require('node-cron');
const GatePass = require('../models/GatePass');
const NotificationService = require('./notificationService');

class CronService {
  constructor() {
    this.jobs = [];
  }

  startAll() {
    this.startPassReminderJob();
    this.startExpiredPassCleanup();
    this.startOverduePassNotifications();
    this.startAutoExpiryJob();
    this.startExpiryWarningJob();
    console.log('🕐 All cron jobs started');
  }

  // Remind users about pending passes every hour
  startPassReminderJob() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // Find passes that have been pending for more than 1 hour
        const pendingPasses = await GatePass.find({
          status: { $in: ['pending_mentor', 'pending_hod'] },
          createdAt: { $lte: oneHourAgo }
        }).populate('studentId mentorId hodId');

        for (const pass of pendingPasses) {
          if (pass.status === 'pending_mentor' && pass.mentorId) {
            await NotificationService.createNotification({
              userId: pass.mentorId._id,
              title: 'Pending Pass Approval',
              message: `${pass.studentId.name}'s ${pass.type} pass is still pending your approval`,
              type: 'warning',
              data: { passId: pass._id, action: 'reminder' }
            });
          }

          if (pass.status === 'pending_hod' && pass.hodId) {
            await NotificationService.createNotification({
              userId: pass.hodId._id,
              title: 'Pending Pass Approval',
              message: `A ${pass.type} pass is still pending your approval`,
              type: 'warning',
              data: { passId: pass._id, action: 'reminder' }
            });
          }
        }

        console.log(`📨 Sent ${pendingPasses.length} pass reminder notifications`);
      } catch (error) {
        console.error('Error in pass reminder job:', error);
      }
    });

    this.jobs.push({ name: 'pass-reminders', job });
  }

  // Clean up expired passes daily at midnight
  startExpiredPassCleanup() {
    const job = cron.schedule('0 0 * * *', async () => {
      try {
        const now = new Date();
        
        // Find passes that have expired (return time has passed)
        const expiredPasses = await GatePass.find({
          status: 'approved',
          returnTime: { $lt: now },
          actualReturnTime: { $exists: false }
        }).populate('studentId');

        // Mark as overdue and notify
        for (const pass of expiredPasses) {
          pass.status = 'overdue';
          await pass.save();

          // Notify student and security
          await NotificationService.createNotification({
            userId: pass.studentId._id,
            title: 'Pass Overdue',
            message: `Your ${pass.type} pass is overdue. Please return immediately.`,
            type: 'error',
            data: { passId: pass._id, action: 'overdue' }
          });
        }

        console.log(`⏰ Processed ${expiredPasses.length} expired passes`);
      } catch (error) {
        console.error('Error in expired pass cleanup job:', error);
      }
    });

    this.jobs.push({ name: 'expired-pass-cleanup', job });
  }

  // Check for overdue passes every 30 minutes
  startOverduePassNotifications() {
    const job = cron.schedule('*/30 * * * *', async () => {
      try {
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

        // Find passes that became overdue in the last 30 minutes
        const overduePasses = await GatePass.find({
          status: 'overdue',
          updatedAt: { $gte: thirtyMinutesAgo }
        }).populate('studentId');

        // Send emergency notifications to security
        if (overduePasses.length > 0) {
          await NotificationService.sendEmergencyNotification(
            'Overdue Passes Alert',
            `${overduePasses.length} passes are currently overdue. Immediate action required.`,
            'security'
          );
        }

        console.log(`🚨 Processed ${overduePasses.length} overdue passes`);
      } catch (error) {
        console.error('Error in overdue pass notifications job:', error);
      }
    });

    this.jobs.push({ name: 'overdue-notifications', job });
  }

  // Auto-expire approved passes after 1 hour (runs every 5 minutes)
  startAutoExpiryJob() {
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        const now = new Date();
        
        // Find passes that have expired (1 hour after approval)
        const expiredPasses = await GatePass.find({
          status: 'approved',
          expiresAt: { $lt: now },
          isUsed: false
        }).populate('student_id', 'name phone email');

        for (const pass of expiredPasses) {
          // Mark as expired
          pass.status = 'expired';
          await pass.save();

          // Notify student
          await NotificationService.createNotification({
            userId: pass.student_id._id,
            title: 'Gate Pass Expired',
            message: `Your gate pass ${pass.passId} has expired and is no longer valid for use.`,
            type: 'error',
            data: { 
              passId: pass._id,
              action: 'expired',
              expiredAt: now
            }
          });

          // Send SMS notification if available
          if (global.smsService && pass.student_id.phone) {
            await global.smsService.notifyPassExpired(
              pass.student_id.phone,
              pass.passId
            );
          }

          console.log(`⏰ Expired pass: ${pass.passId} for student: ${pass.student_id.name}`);
        }

        if (expiredPasses.length > 0) {
          console.log(`⏰ Auto-expired ${expiredPasses.length} passes`);
        }

      } catch (error) {
        console.error('Error in auto-expiry job:', error);
      }
    });

    this.jobs.push({ name: 'auto-expiry', job });
  }

  // Warn users 15 minutes before pass expires (runs every 5 minutes)
  startExpiryWarningJob() {
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        const now = new Date();
        const warningTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
        
        // Find passes that will expire in the next 15 minutes
        const soonToExpirePasses = await GatePass.find({
          status: 'approved',
          expiresAt: { 
            $gte: now,
            $lte: warningTime 
          },
          isUsed: false,
          'metadata.expiryWarningSet': { $ne: true }
        }).populate('student_id', 'name phone email');

        for (const pass of soonToExpirePasses) {
          const minutesLeft = Math.ceil((pass.expiresAt - now) / (1000 * 60));
          
          // Notify student
          await NotificationService.createNotification({
            userId: pass.student_id._id,
            title: 'Gate Pass Expiring Soon',
            message: `Your gate pass ${pass.passId} will expire in ${minutesLeft} minutes. Use it soon!`,
            type: 'warning',
            data: { 
              passId: pass._id,
              action: 'expiry_warning',
              minutesLeft: minutesLeft
            }
          });

          // Send SMS notification if available
          if (global.smsService && pass.student_id.phone) {
            await global.smsService.notifyPassExpiring(
              pass.student_id.phone,
              pass.passId,
              pass.expiresAt.toLocaleString()
            );
          }

          // Mark as warning sent to avoid duplicate warnings
          if (!pass.metadata) pass.metadata = {};
          pass.metadata.expiryWarningSet = true;
          await pass.save();

          console.log(`⚠️ Expiry warning sent for pass: ${pass.passId}`);
        }

        if (soonToExpirePasses.length > 0) {
          console.log(`⚠️ Sent expiry warnings for ${soonToExpirePasses.length} passes`);
        }

      } catch (error) {
        console.error('Error in expiry warning job:', error);
      }
    });

    this.jobs.push({ name: 'expiry-warnings', job });
  }

  stopAll() {
    this.jobs.forEach(({ name, job }) => {
      job.destroy();
      console.log(`🛑 Stopped cron job: ${name}`);
    });
    this.jobs = [];
  }
}

module.exports = new CronService();