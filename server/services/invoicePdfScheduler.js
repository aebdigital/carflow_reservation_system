const cron = require('node-cron');
const Reservation = require('../models/Reservation');
const krosApiService = require('./krosApiService');
const emailService = require('./emailService');

class InvoicePdfScheduler {
  constructor() {
    this.isRunning = false;
    this.init();
  }

  init() {
    console.log('📧 Initializing Invoice PDF Scheduler...');
    
    // Schedule to run every hour to check for pending invoice PDF emails
    cron.schedule('0 * * * *', async () => {
      if (this.isRunning) {
        console.log('📧 Invoice PDF scheduler already running, skipping...');
        return;
      }
      
      await this.processScheduledInvoicePdfs();
    });

    console.log('✅ Invoice PDF Scheduler initialized - will run every hour');
  }

  /**
   * Process all scheduled invoice PDF emails that are due
   */
  async processScheduledInvoicePdfs() {
    this.isRunning = true;
    
    try {
      console.log('📧 Checking for scheduled invoice PDF emails...');
      
      const now = new Date();
      
      // Find reservations that need invoice PDF emails sent
      const reservations = await Reservation.find({
        invoicePdfScheduledAt: { $lte: now },
        invoicePdfSentAt: { $exists: false },
        krosInvoiceId: { $exists: true, $ne: null },
        status: 'completed'
      }).populate([
        { path: 'customer', select: 'firstName lastName email phone' },
        { path: 'car', select: 'brand model year registrationNumber images imageUrl pricing deposit' }
      ]);

      console.log(`📧 Found ${reservations.length} reservations needing invoice PDF emails`);

      for (const reservation of reservations) {
        try {
          await this.sendInvoicePdfEmail(reservation);
        } catch (error) {
          console.error(`❌ Failed to send invoice PDF for reservation ${reservation.reservationNumber}:`, error.message);
        }
      }

    } catch (error) {
      console.error('❌ Error in invoice PDF scheduler:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send invoice PDF email for a specific reservation
   * @param {Object} reservation - Reservation document
   */
  async sendInvoicePdfEmail(reservation) {
    try {
      console.log(`📧 Sending invoice PDF email for reservation: ${reservation.reservationNumber}`);

      if (!krosApiService.isReady()) {
        throw new Error('Kros API not configured');
      }

      if (!emailService.isConfigured) {
        throw new Error('Email service not configured');
      }

      // Get the invoice PDF from Kros API
      const pdfResult = await krosApiService.getInvoicePDF(reservation.krosInvoiceId);
      
      if (!pdfResult.success) {
        throw new Error('Failed to retrieve invoice PDF from Kros API');
      }

      // Prepare email data using the existing review request template structure
      const customerName = `${reservation.customer.firstName} ${reservation.customer.lastName}`;
      const carInfo = `${reservation.car.brand} ${reservation.car.model} (${reservation.car.year})`;
      const startDate = new Date(reservation.startDate).toLocaleDateString('sk-SK');
      const endDate = new Date(reservation.endDate).toLocaleDateString('sk-SK');

      const emailData = {
        customerName,
        reservationNumber: reservation.reservationNumber,
        carBrand: reservation.car.brand,
        carModel: reservation.car.model,
        carYear: reservation.car.year,
        carInfo,
        startDate,
        endDate,
        totalAmount: reservation.pricing.totalAmount,
        businessName: 'CarFlow Rental', // Could be made configurable
        contactEmail: process.env.COMPANY_EMAIL || 'info@carflow.sk',
        contactPhone: process.env.COMPANY_PHONE || '+421 XXX XXX XXX'
      };

      // Send email with PDF attachment using the existing email service
      const result = await this.sendEmailWithAttachment(
        reservation.customer.email,
        'Faktúra za prenájom vozidla',
        'invoice-completion', // Template name
        emailData,
        {
          filename: pdfResult.filename,
          content: pdfResult.data,
          contentType: pdfResult.contentType
        }
      );

      if (result.success) {
        // Mark as sent
        reservation.invoicePdfSentAt = new Date();
        await reservation.save();
        
        console.log(`✅ Invoice PDF email sent successfully to: ${reservation.customer.email}`);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }

    } catch (error) {
      console.error(`❌ Error sending invoice PDF email for ${reservation.reservationNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Send email with PDF attachment
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} templateName - Email template name
   * @param {Object} templateData - Template variables
   * @param {Object} attachment - Attachment object
   */
  async sendEmailWithAttachment(to, subject, templateName, templateData, attachment) {
    try {
      // Use the existing SMTP2GO service to send email with attachment
      const smtp2goService = require('./smtp2goService');
      
      if (!smtp2goService.isConfigured) {
        throw new Error('SMTP2GO not configured');
      }

      // Load and process email template
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '..', 'templates', 'email', `${templateName}.html`);
      
      let html;
      if (fs.existsSync(templatePath)) {
        html = fs.readFileSync(templatePath, 'utf8');
        
        // Replace template variables
        Object.keys(templateData).forEach(key => {
          const value = templateData[key] || '';
          html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
      } else {
        // Fallback HTML if template doesn't exist
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Faktúra za prenájom vozidla</h2>
            <p>Vážený/-á ${templateData.customerName},</p>
            <p>V prílohe nájdete faktúru za prenájom vozidla ${templateData.carInfo}.</p>
            <p><strong>Rezervácia:</strong> ${templateData.reservationNumber}</p>
            <p><strong>Obdobie:</strong> ${templateData.startDate} - ${templateData.endDate}</p>
            <p><strong>Celková suma:</strong> ${templateData.totalAmount}€</p>
            <p>Ďakujeme za využitie našich služieb!</p>
            <p>S pozdravom,<br>${templateData.businessName}</p>
          </div>
        `;
      }

      // Send email with attachment using SMTP2GO
      const result = await smtp2goService.sendEmailWithAttachment(
        to,
        subject,
        html,
        [{
          filename: attachment.filename,
          content: attachment.content.toString('base64'),
          type: attachment.contentType
        }]
      );

      return { success: true, result };
      
    } catch (error) {
      console.error('❌ Error sending email with attachment:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Manually trigger invoice PDF sending for a specific reservation
   * @param {string} reservationId - Reservation ID
   */
  async sendInvoicePdfNow(reservationId) {
    try {
      const reservation = await Reservation.findById(reservationId).populate([
        { path: 'customer', select: 'firstName lastName email phone' },
        { path: 'car', select: 'brand model year registrationNumber images imageUrl pricing deposit' }
      ]);

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status !== 'completed') {
        throw new Error('Reservation must be completed to send invoice PDF');
      }

      if (!reservation.krosInvoiceId) {
        throw new Error('No Kros invoice ID found for this reservation');
      }

      await this.sendInvoicePdfEmail(reservation);
      return { success: true, message: 'Invoice PDF sent successfully' };
      
    } catch (error) {
      console.error('❌ Error manually sending invoice PDF:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new InvoicePdfScheduler();