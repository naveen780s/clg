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

  stopAll() {
    this.jobs.forEach(({ name, job }) => {
      job.destroy();
      console.log(`🛑 Stopped cron job: ${name}`);
    });
    this.jobs = [];
  }
}

module.exports = new CronService();