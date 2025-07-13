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
      this.transporter = nodemailer.createTransport({
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
      
      this.transporter = nodemailer.createTransport({
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

  // NEW: Admin notification email for new reservations
  async sendAdminReservationNotification(to, reservationData) {
    if (this.provider === 'smtp2go') {
      return await smtp2goService.sendAdminReservationNotification(to, reservationData);
    }

    const subject = `🚗 Nová rezervácia #${reservationData.reservationNumber} - ${reservationData.carInfo}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Nová rezervácia</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🚗 Nová Rezervácia</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">#${reservationData.reservationNumber}</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            
            <!-- Customer Info -->
            <div style="margin-bottom: 25px;">
              <h2 style="color: #1976d2; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #e3f2fd; padding-bottom: 5px;">
                👤 Informácie o zákazníkovi
              </h2>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #1976d2;">
                <p style="margin: 0 0 8px 0;"><strong>Meno:</strong> ${reservationData.customerName}</p>
                <p style="margin: 0 0 8px 0;"><strong>Email:</strong> <a href="mailto:${reservationData.customerEmail}" style="color: #1976d2; text-decoration: none;">${reservationData.customerEmail}</a></p>
                <p style="margin: 0 0 8px 0;"><strong>Telefón:</strong> <a href="tel:${reservationData.customerPhone}" style="color: #1976d2; text-decoration: none;">${reservationData.customerPhone}</a></p>
                ${reservationData.customerLicense ? `<p style="margin: 0;"><strong>Vodičský preukaz:</strong> ${reservationData.customerLicense}</p>` : ''}
              </div>
            </div>
            
            <!-- Vehicle Info -->
            <div style="margin-bottom: 25px;">
              <h2 style="color: #1976d2; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #e3f2fd; padding-bottom: 5px;">
                🚙 Informácie o vozidle
              </h2>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50;">
                <p style="margin: 0 0 8px 0;"><strong>Vozidlo:</strong> ${reservationData.carInfo}</p>
                <p style="margin: 0 0 8px 0;"><strong>EČV:</strong> ${reservationData.carRegistration || 'Neuvedené'}</p>
                <p style="margin: 0;"><strong>Kategória:</strong> ${reservationData.carCategory || 'Štandard'}</p>
              </div>
            </div>
            
            <!-- Rental Details -->
            <div style="margin-bottom: 25px;">
              <h2 style="color: #1976d2; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #e3f2fd; padding-bottom: 5px;">
                📅 Detaily rezervácie
              </h2>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800;">
                <p style="margin: 0 0 8px 0;"><strong>Vyzdvihnutie:</strong> ${reservationData.startDate}</p>
                <p style="margin: 0 0 8px 0;"><strong>Vrátenie:</strong> ${reservationData.endDate}</p>
                <p style="margin: 0 0 8px 0;"><strong>Počet dní:</strong> ${reservationData.duration} ${reservationData.duration === 1 ? 'deň' : reservationData.duration < 5 ? 'dni' : 'dní'}</p>
                <p style="margin: 0 0 8px 0;"><strong>Stav:</strong> <span style="background-color: ${reservationData.status === 'confirmed' ? '#4caf50' : reservationData.status === 'pending' ? '#ff9800' : '#9e9e9e'}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${reservationData.statusText}</span></p>
                ${reservationData.specialRequests ? `<p style="margin: 0;"><strong>Špeciálne požiadavky:</strong> ${reservationData.specialRequests}</p>` : ''}
              </div>
            </div>
            
            <!-- Pricing -->
            <div style="margin-bottom: 25px;">
              <h2 style="color: #1976d2; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #e3f2fd; padding-bottom: 5px;">
                💰 Cenové informácie
              </h2>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #9c27b0;">
                <p style="margin: 0 0 8px 0;"><strong>Denná sadzba:</strong> ${reservationData.dailyRate}€</p>
                <p style="margin: 0 0 8px 0;"><strong>Základná cena:</strong> ${reservationData.subtotal}€</p>
                ${reservationData.discount > 0 ? `<p style="margin: 0 0 8px 0; color: #4caf50;"><strong>Zľava:</strong> -${reservationData.discount}€</p>` : ''}
                <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #1976d2;"><strong>Celková cena:</strong> ${reservationData.totalPrice}€</p>
                ${reservationData.deposit > 0 ? `<p style="margin: 0; color: #ff9800;"><strong>Depozit:</strong> ${reservationData.deposit}€</p>` : ''}
              </div>
            </div>
            
            <!-- Actions -->
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://admindemo.carflow.sk/reservations" style="display: inline-block; background-color: #1976d2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">
                📋 Zobraziť v administrácii
              </a>
              <a href="mailto:${reservationData.customerEmail}" style="display: inline-block; background-color: #4caf50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                ✉️ Kontaktovať zákazníka
              </a>
            </div>
            
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              CarFlow Admin Notification System<br>
              <small>Rezervácia vytvorená: ${new Date().toLocaleString('sk-SK')}</small>
            </p>
          </div>
          
        </div>
      </body>
      </html>
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