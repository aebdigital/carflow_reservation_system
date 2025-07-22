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

  async sendEmail(to, subject, html, text = null) {
    if (!this.isConfigured) {
      throw new Error('Email service not properly configured. Please set SMTP2GO_API_KEY in your environment variables.');
    }

    // Use SMTP2GO service
    return await smtp2goService.sendEmail(to, subject, html, text);
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
  async sendAdminReservationNotification(adminEmail, reservationData) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendAdminReservationNotification(adminEmail, reservationData);
  }

  // Customer reservation confirmation
  async sendCustomerReservationConfirmation(customerEmail, reservationData) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReservationConfirmation(customerEmail, reservationData);
  }

  // Customer reservation confirmed (after admin approval)
  async sendCustomerReservationConfirmed(customerEmail, reservationData) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReservationConfirmed(customerEmail, reservationData);
  }

  // Customer reservation edited notification (after admin edits)
  async sendCustomerReservationEdited(customerEmail, reservationData) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReservationEdited(customerEmail, reservationData);
  }

  // Customer 24-hour reminder notification
  async sendCustomerReservationReminder24(customerEmail, reservationData) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReservationReminder24(customerEmail, reservationData);
  }

  // Customer review request (24h after trip ends)
  async sendCustomerReviewRequest(customerEmail, reservationData) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReviewRequest(customerEmail, reservationData);
  }

  // Customer cancellation notification
  async sendCustomerCancellationNotification(customerEmail, cancellationData) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerCancellationNotification(customerEmail, cancellationData);
  }
}

module.exports = new EmailService();