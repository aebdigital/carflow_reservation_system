const cron = require('node-cron');
const Reservation = require('../models/Reservation');
const emailService = require('./emailService');
const emailHelpers = require('../utils/emailHelpers');

class ReminderScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  /**
   * Start the reminder scheduler
   * Runs every hour to check for reservations that need 24h reminders
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ [REMINDER] Scheduler already running');
      return;
    }

    // Run every hour at minute 0
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.checkAndSendReminders();
    }, {
      scheduled: false,
      timezone: 'Europe/Bratislava'
    });

    this.cronJob.start();
    this.isRunning = true;
    
    console.log('✅ [REMINDER] Scheduler started - checking hourly for 24h reminders');
  }

  /**
   * Stop the reminder scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('🛑 [REMINDER] Scheduler stopped');
  }

  /**
   * Check for reservations that need 24-hour reminders and review requests
   */
  async checkAndSendReminders() {
    try {
      console.log('🔍 [REMINDER] Checking for reminders and review requests...');

      await this.checkPreTripReminders();
      await this.checkPostTripReviewRequests();

    } catch (error) {
      console.error('❌ [REMINDER] Error checking for reminders:', error.message);
    }
  }

  /**
   * Check for reservations that need 24-hour pre-trip reminders
   */
  async checkPreTripReminders() {
    try {
      // Calculate time window: 24-25 hours from now
      const now = new Date();
      const reminderStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      const reminderEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // 25 hours from now

      // Find confirmed reservations starting in 24-25 hours that haven't been reminded yet
      const reservations = await Reservation.find({
        status: 'confirmed',
        startDate: {
          $gte: reminderStart,
          $lte: reminderEnd
        },
        // Only send reminder once - check if we haven't sent it yet
        'reminder24h.sent': { $ne: true }
      }).populate([
        { path: 'customer', select: 'firstName lastName email phone' },
        { path: 'car', select: 'brand model year registrationNumber pricing' }
      ]);

      console.log(`📧 [REMINDER] Found ${reservations.length} reservations needing 24h reminders`);

      for (const reservation of reservations) {
        await this.sendReminderEmail(reservation);
      }

      if (reservations.length > 0) {
        console.log(`✅ [REMINDER] Processed ${reservations.length} reminder emails`);
      }
    } catch (error) {
      console.error('❌ [REMINDER] Error checking pre-trip reminders:', error.message);
    }
  }

  /**
   * Check for completed reservations that need review requests (24h after trip ends)
   */
  async checkPostTripReviewRequests() {
    try {
      // Calculate time window: 24-25 hours ago from now
      const now = new Date();
      const reviewStart = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
      const reviewEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);   // 24 hours ago

      // Find completed reservations that ended 24-25 hours ago and haven't been sent review request
      const reservations = await Reservation.find({
        status: 'completed',
        endDate: {
          $gte: reviewStart,
          $lte: reviewEnd
        },
        // Only send review request once - check if we haven't sent it yet
        'reviewRequest.sent': { $ne: true }
      }).populate([
        { path: 'customer', select: 'firstName lastName email phone' },
        { path: 'car', select: 'brand model year registrationNumber pricing' }
      ]);

      console.log(`⭐ [REVIEW] Found ${reservations.length} reservations needing review requests`);

      for (const reservation of reservations) {
        await this.sendReviewRequestEmail(reservation);
      }

      if (reservations.length > 0) {
        console.log(`✅ [REVIEW] Processed ${reservations.length} review request emails`);
      }
    } catch (error) {
      console.error('❌ [REVIEW] Error checking post-trip review requests:', error.message);
    }
  }

  /**
   * Send 24-hour reminder email for a specific reservation
   */
  async sendReminderEmail(reservation) {
    try {
      if (!reservation.customer || !reservation.customer.email) {
        console.log('⚠️ [REMINDER] Skipping reminder - no customer email for reservation:', reservation.reservationNumber);
        return;
      }

      if (!emailService.isConfigured) {
        console.log('⚠️ [REMINDER] Email service not configured - skipping reminder');
        return;
      }

      // Prepare email data using existing helper
      const emailData = emailHelpers.prepareReservationEmailData(reservation, reservation.car, reservation.customer);
      
      // Send 24-hour reminder email
      await emailService.sendCustomerReservationReminder24(reservation.customer.email, emailData);

      // Mark reminder as sent
      reservation.reminder24h = {
        sent: true,
        sentAt: new Date()
      };
      await reservation.save();

      console.log('✅ [REMINDER] 24h reminder sent to:', reservation.customer.email, 'for reservation:', reservation.reservationNumber);

    } catch (error) {
      console.error('❌ [REMINDER] Failed to send reminder for reservation:', reservation.reservationNumber, error.message);
    }
  }

  /**
   * Send review request email for a specific completed reservation
   */
  async sendReviewRequestEmail(reservation) {
    try {
      if (!reservation.customer || !reservation.customer.email) {
        console.log('⚠️ [REVIEW] Skipping review request - no customer email for reservation:', reservation.reservationNumber);
        return;
      }

      if (!emailService.isConfigured) {
        console.log('⚠️ [REVIEW] Email service not configured - skipping review request');
        return;
      }

      // Prepare email data using existing helper
      const emailData = emailHelpers.prepareReservationEmailData(reservation, reservation.car, reservation.customer);
      
      // Send review request email
      await emailService.sendCustomerReviewRequest(reservation.customer.email, emailData);

      // Mark review request as sent
      reservation.reviewRequest = {
        sent: true,
        sentAt: new Date()
      };
      await reservation.save();

      console.log('✅ [REVIEW] Review request sent to:', reservation.customer.email, 'for reservation:', reservation.reservationNumber);

    } catch (error) {
      console.error('❌ [REVIEW] Failed to send review request for reservation:', reservation.reservationNumber, error.message);
    }
  }

  /**
   * Manually trigger reminder check (for testing)
   */
  async triggerManualCheck() {
    console.log('🔄 [REMINDER] Manual reminder check triggered');
    await this.checkAndSendReminders();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDates().toString() : null,
      timezone: 'Europe/Bratislava'
    };
  }
}

module.exports = new ReminderScheduler();