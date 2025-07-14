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
    const { reservation, car, customer } = reservationData;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">New Reservation - ${reservation.reservationNumber}</h2>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Customer Details</h3>
          <p><strong>Name:</strong> ${customer.firstName} ${customer.lastName}</p>
          <p><strong>Email:</strong> ${customer.email}</p>
          <p><strong>Phone:</strong> ${customer.phone}</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Car Details</h3>
          <p><strong>Car:</strong> ${car.brand} ${car.model} (${car.year})</p>
          <p><strong>Registration:</strong> ${car.registrationNumber}</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Reservation Details</h3>
          <p><strong>Pickup Date:</strong> ${new Date(reservation.pickupDate).toLocaleDateString()}</p>
          <p><strong>Return Date:</strong> ${new Date(reservation.returnDate).toLocaleDateString()}</p>
          <p><strong>Duration:</strong> ${reservation.duration} days</p>
          <p><strong>Total Price:</strong> €${reservation.totalPrice}</p>
          <p><strong>Status:</strong> ${reservation.status}</p>
        </div>
        
        <p>Please review and confirm this reservation in the admin panel.</p>
      </div>
    `;

    return await this.sendEmail(adminEmail, `New Reservation: ${reservation.reservationNumber}`, html);
  }
}

module.exports = new EmailService();