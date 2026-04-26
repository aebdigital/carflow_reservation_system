const smtp2goService = require('./smtp2goService');

class EmailService {
  constructor() {
    this.isConfigured = false;
    this.init();
  }

  init() {
    console.log('🔧 Checking email service configuration...');
    console.log('📋 Email provider: SMTP2GO');
    
    // Use SMTP2GO service only
    this.isConfigured = smtp2goService.isConfigured;
    
    if (this.isConfigured) {
      console.log('✅ Using SMTP2GO email service');
    } else {
      console.error('❌ SMTP2GO not configured. Please check your environment variables.');
    }
  }

  async sendEmail(to, subject, html, text = null, user = null) {
    if (!this.isConfigured) {
      throw new Error('Email service not properly configured. Please set SMTP2GO_API_KEY in your environment variables.');
    }

    // Use SMTP2GO service with user context for tenant-specific config
    return await smtp2goService.sendEmail(to, subject, html, text, user);
  }

  // Helper method to strip HTML tags for text version
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Contact form email sender
  async sendContactForm(recipientEmail, formData) {
    const { name, email, phone, subject, message, type } = formData;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">New Contact Form Submission</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Type:</strong> ${type || 'contact'}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p>Reply to: <a href="mailto:${email}">${email}</a></p>
      </div>
    `;

    return await this.sendEmail(recipientEmail, `Contact Form: ${subject}`, html);
  }

  // Admin reservation notification
  async sendAdminReservationNotification(adminEmail, reservationData, user = null, rawReservation = null) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendAdminReservationNotification(adminEmail, reservationData, user, rawReservation);
  }

  // Reservation-level "do not email this customer" guard.
  // Returns a skipped result if the reservation has disableEmails=true so the call
  // is a safe no-op. Manual admin actions (e.g. payment reminder) bypass this by
  // going through sendTemplatedEmail directly without a rawReservation.
  _isReservationEmailSuppressed(rawReservation, methodName) {
    if (rawReservation && rawReservation.disableEmails === true) {
      console.log(`📭 [EMAIL] Skipping ${methodName} for reservation ${rawReservation.reservationNumber || rawReservation._id}: disableEmails=true`);
      return { success: false, skipped: true, reason: 'Reservation has disableEmails=true' };
    }
    return null;
  }

  // Customer reservation confirmation
  async sendCustomerReservationConfirmation(customerEmail, reservationData, user = null, rawReservation = null) {
    const suppressed = this._isReservationEmailSuppressed(rawReservation, 'sendCustomerReservationConfirmation');
    if (suppressed) return suppressed;
    return await smtp2goService.sendCustomerReservationConfirmation(customerEmail, reservationData, user, rawReservation);
  }

  // Customer reservation confirmed (after admin approval)
  // skipPaymentInfo: if true, sends email without QR codes/payment links (NitraCar "Potvrdiť bez zálohy")
  async sendCustomerReservationConfirmed(customerEmail, reservationData, user = null, rawReservation = null, attachments = [], skipPaymentInfo = false) {
    const suppressed = this._isReservationEmailSuppressed(rawReservation, 'sendCustomerReservationConfirmed');
    if (suppressed) return suppressed;
    return await smtp2goService.sendCustomerReservationConfirmed(customerEmail, reservationData, user, rawReservation, attachments, skipPaymentInfo);
  }

  // Customer deposit email (NitraCar only)
  async sendCustomerDepositEmail(customerEmail, reservationData, user = null, rawReservation = null) {
    const suppressed = this._isReservationEmailSuppressed(rawReservation, 'sendCustomerDepositEmail');
    if (suppressed) return suppressed;
    return await smtp2goService.sendCustomerDepositEmail(customerEmail, reservationData, user, rawReservation);
  }

  // Customer reservation edited notification (after admin edits)
  async sendCustomerReservationEdited(customerEmail, reservationData, user = null, rawReservation = null) {
    const suppressed = this._isReservationEmailSuppressed(rawReservation, 'sendCustomerReservationEdited');
    if (suppressed) return suppressed;
    return await smtp2goService.sendCustomerReservationEdited(customerEmail, reservationData, user, rawReservation);
  }

  // Customer 24-hour reminder notification (before pickup)
  async sendCustomerReservationReminder24(customerEmail, reservationData, user = null, rawReservation = null) {
    const suppressed = this._isReservationEmailSuppressed(rawReservation, 'sendCustomerReservationReminder24');
    if (suppressed) return suppressed;
    return await smtp2goService.sendCustomerReservationReminder24(customerEmail, reservationData, user, rawReservation);
  }

  // Customer 24-hour return reminder notification (before return date)
  async sendCustomerReturnReminder24(customerEmail, reservationData, user = null, rawReservation = null) {
    const suppressed = this._isReservationEmailSuppressed(rawReservation, 'sendCustomerReturnReminder24');
    if (suppressed) return suppressed;
    return await smtp2goService.sendCustomerReturnReminder24(customerEmail, reservationData, user, rawReservation);
  }

  // Customer review request (24h after trip ends)
  async sendCustomerReviewRequest(customerEmail, reservationData, user = null, rawReservation = null) {
    const suppressed = this._isReservationEmailSuppressed(rawReservation, 'sendCustomerReviewRequest');
    if (suppressed) return suppressed;
    return await smtp2goService.sendCustomerReviewRequest(customerEmail, reservationData, user, rawReservation);
  }

  // Customer cancellation notification
  async sendCustomerCancellationNotification(customerEmail, cancellationData, user = null, rawReservation = null) {
    const suppressed = this._isReservationEmailSuppressed(rawReservation, 'sendCustomerCancellationNotification');
    if (suppressed) return suppressed;
    return await smtp2goService.sendCustomerCancellationNotification(customerEmail, cancellationData, user, rawReservation);
  }

  // Send templated email by loading template from templates/email/ folder
  // Now uses tenant-aware template selection via emailTemplateService
  async sendTemplatedEmail(to, subject, templateName, data, user = null) {
    const emailTemplateService = require('./emailTemplateService');

    try {
      // Get tenant-specific email configuration to determine sender
      const senderEmail = user ? smtp2goService.getTenantEmailConfig(user).emailFrom : null;

      // Get language from data for NitraCar (defaults to 'sk')
      const language = data.websiteLanguage || 'sk';
      const isNitraCar = senderEmail && (senderEmail.includes('nitra-car') || senderEmail.includes('nitracar'));

      console.log('📧 [EMAIL SERVICE] sendTemplatedEmail called:', {
        to,
        templateName,
        senderEmail,
        language,
        isNitraCarUser: user?.email === 'nitra-car@nitra-car.sk',
        isLeRentUser: user?.email === 'lerent@lerent.sk'
      });

      // Load template using tenant-aware service with language support
      let template;
      try {
        template = await emailTemplateService.loadTemplate(templateName, senderEmail, language);
      } catch (error) {
        // Check if this is a LeRent template not found error
        if (error.message && error.message.includes('LERENT_TEMPLATE_NOT_FOUND')) {
          console.warn(`⚠️ [LERENT] Skipping email - template '${templateName}' not found (no fallback for LeRent)`);
          return { success: false, skipped: true, reason: 'LeRent template not found' };
        }
        throw error;
      }

      // Override subject for English NitraCar emails
      if (isNitraCar && language === 'en') {
        const englishSubjects = {
          'payment-notification': 'Payment Reminder'
        };
        if (englishSubjects[templateName]) {
          subject = englishSubjects[templateName];
        }
      }

      // Handle conditional blocks (simple if/else logic)
      // Handle {{#if variable}} ... {{/if}} blocks
      let html = template.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
        const value = data[varName];
        return (value && value !== '' && value !== null && value !== undefined) ? content : '';
      });

      // Handle {{#unless variable}} ... {{/unless}} blocks
      html = html.replace(/\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, varName, content) => {
        const value = data[varName];
        return (!value || value === '' || value === null || value === undefined) ? content : '';
      });

      // Add logo and social icons to template variables
      const emailIconHelper = require('../utils/emailIconHelper');
      const dataWithIcons = emailIconHelper.addSocialIconsToVariables(data, senderEmail);

      // Replace template variables with data
      // Support both Handlebars-style {{variable}} and simple template replacement
      Object.keys(dataWithIcons).forEach(key => {
        const value = dataWithIcons[key] || '';
        // Replace {{key}} and {{{key}}} patterns
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        html = html.replace(new RegExp(`{{{${key}}}}`, 'g'), value);
      });

      // Send the email with user context for tenant-specific config
      return await this.sendEmail(to, subject, html, null, user);

    } catch (error) {
      console.error(`Error sending templated email (${templateName}):`, error);
      throw new Error(`Failed to send templated email: ${error.message}`);
    }
  }
}

module.exports = new EmailService();