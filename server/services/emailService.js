const nodemailer = require('nodemailer');
const smtp2goService = require('./smtp2goService');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.provider = process.env.EMAIL_PROVIDER || 'nodemailer'; // 'nodemailer' or 'smtp2go'
    this.init();
  }

  init() {
    console.log('🔧 Checking email service configuration...');
    console.log('📋 Email provider:', this.provider);
    
    if (this.provider === 'smtp2go') {
      // Use SMTP2GO service
      this.isConfigured = smtp2goService.isConfigured;
      console.log('✅ Using SMTP2GO email service');
      return;
    }

    // Default to nodemailer
    try {
      console.log('📋 Nodemailer environment variables:');
      console.log('   EMAIL_HOST:', process.env.EMAIL_HOST ? '✅ Set' : '❌ Missing');
      console.log('   EMAIL_PORT:', process.env.EMAIL_PORT ? '✅ Set' : '❌ Missing');
      console.log('   EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
      console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing');
      console.log('   EMAIL_FROM:', process.env.EMAIL_FROM ? '✅ Set' : '❌ Missing');

      // If no configuration, set up a test account
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️  Nodemailer not configured with environment variables');
        console.warn('   Using Ethereal Email for testing. Configure SMTP for production.');
        this.setupTestAccount();
        return;
      }

      // Configure transporter with environment variables
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      this.isConfigured = true;
      console.log('✅ Nodemailer email service configured successfully');
      
    } catch (error) {
      console.error('❌ Nodemailer configuration failed:', error.message);
      this.setupTestAccount();
    }
  }

  async setupTestAccount() {
    try {
      // Create test account using Ethereal Email
      console.log('🧪 Creating test email account...');
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      this.isConfigured = true;
      console.log('✅ Test email account created successfully');
      console.log('📧 Test account details:');
      console.log('   User:', testAccount.user);
      console.log('   Pass:', testAccount.pass);
      console.log('   Note: Emails will be visible at https://ethereal.email/');
      
    } catch (error) {
      console.error('❌ Failed to create test email account:', error.message);
    }
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.isConfigured) {
      throw new Error('Email service not properly configured');
    }

    // Route to appropriate provider
    if (this.provider === 'smtp2go') {
      return await smtp2goService.sendEmail(to, subject, html, text);
    }

    // Default nodemailer implementation
    try {
      console.log(`📧 Sending email via Nodemailer to: ${to}`);
      console.log(`📋 Subject: ${subject}`);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'CarFlow <noreply@carflow.sk>',
        to: to,
        subject: subject,
        html: html,
        text: text || this.stripHtml(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully via Nodemailer');
      console.log('📧 Message ID:', result.messageId);
      
      // If using test account, provide preview URL
      if (result.messageId.includes('ethereal')) {
        const previewUrl = nodemailer.getTestMessageUrl(result);
        console.log('🔗 Preview URL:', previewUrl);
        return {
          success: true,
          messageId: result.messageId,
          previewUrl: previewUrl
        };
      }

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      throw error;
    }
  }

  // Helper method to strip HTML tags for plain text
  stripHtml(html) {
    return html.replace(/<[^>]*>?/gm, '');
  }

  // Pre-built email templates
  async sendReservationConfirmation(to, reservationData) {
    if (this.provider === 'smtp2go') {
      return await smtp2goService.sendReservationConfirmation(to, reservationData);
    }

    const subject = `Potvrdenie rezervácie #${reservationData.reservationNumber}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Potvrdenie rezervácie</h2>
        <p>Vážený/á ${reservationData.customerName},</p>
        <p>Vaša rezervácia bola úspešne prijatá.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Detaily rezervácie</h3>
          <p><strong>Číslo rezervácie:</strong> ${reservationData.reservationNumber}</p>
          <p><strong>Vozidlo:</strong> ${reservationData.carInfo}</p>
          <p><strong>Dátum vyzdvihnutia:</strong> ${reservationData.startDate}</p>
          <p><strong>Dátum vrátenia:</strong> ${reservationData.endDate}</p>
          <p><strong>Celková cena:</strong> ${reservationData.totalPrice}€</p>
        </div>
        
        <p>Ďakujeme za vašu rezerváciu!</p>
        <p>CarFlow Team</p>
      </div>
    `;
    
    return this.sendEmail(to, subject, html);
  }

  async sendContactForm(to, formData) {
    if (this.provider === 'smtp2go') {
      return await smtp2goService.sendContactForm(to, formData);
    }

    const subject = `Nová správa z kontaktného formulára - ${formData.subject}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Nová správa z kontaktného formulára</h2>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Meno:</strong> ${formData.name}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Telefón:</strong> ${formData.phone || 'Nezadané'}</p>
          <p><strong>Predmet:</strong> ${formData.subject}</p>
          <p><strong>Správa:</strong></p>
          <p style="white-space: pre-wrap;">${formData.message}</p>
        </div>
        
        <p><small>Odoslané: ${new Date().toLocaleString('sk-SK')}</small></p>
      </div>
    `;
    
    return this.sendEmail(to, subject, html);
  }

  // Test email service
  async testConnection() {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    if (this.provider === 'smtp2go') {
      return await smtp2goService.testConnection();
    }

    try {
      await this.transporter.verify();
      console.log('✅ Nodemailer connection verified');
      return true;
    } catch (error) {
      console.error('❌ Nodemailer connection failed:', error.message);
      throw error;
    }
  }
}

module.exports = new EmailService(); 