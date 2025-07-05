const https = require('https');
const querystring = require('querystring');

class SMTP2GOService {
  constructor() {
    this.apiKey = process.env.SMTP2GO_API_KEY;
    this.baseUrl = process.env.SMTP2GO_BASE_URL || 'https://api.smtp2go.com/v3';
    this.isConfigured = false;
    this.init();
  }

  init() {
    console.log('🔧 Checking SMTP2GO configuration...');
    console.log('📋 SMTP2GO environment variables:');
    console.log('   SMTP2GO_API_KEY:', process.env.SMTP2GO_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('   SMTP2GO_BASE_URL:', process.env.SMTP2GO_BASE_URL ? '✅ Set' : '❌ Using default');
    console.log('   EMAIL_FROM:', process.env.EMAIL_FROM ? '✅ Set' : '❌ Missing');

    if (!this.apiKey) {
      console.warn('⚠️  SMTP2GO not configured. Set SMTP2GO_API_KEY environment variable.');
      console.warn('   Sign up at https://www.smtp2go.com/ to get an API key.');
      return;
    }

    this.isConfigured = true;
    console.log('✅ SMTP2GO service configured successfully');
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.isConfigured) {
      throw new Error('SMTP2GO service not properly configured. Please set SMTP2GO_API_KEY.');
    }

    const emailData = {
      api_key: this.apiKey,
      to: Array.isArray(to) ? to : [to],
      sender: process.env.EMAIL_FROM || 'CarFlow <noreply@carflow.sk>',
      subject: subject,
      html_body: html,
      text_body: text || this.stripHtml(html)
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(emailData);
      
      const options = {
        hostname: 'api.smtp2go.com',
        port: 443,
        path: '/v3/email/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      console.log(`📧 Sending email via SMTP2GO to: ${to}`);
      console.log(`📋 Subject: ${subject}`);

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (response.data && response.data.succeeded && response.data.succeeded > 0) {
              console.log('✅ Email sent successfully via SMTP2GO');
              console.log('📧 Email ID:', response.data.email_id);
              
              resolve({
                success: true,
                messageId: response.data.email_id,
                response: response
              });
            } else {
              console.error('❌ SMTP2GO API error:', response);
              reject(new Error(response.data?.error || 'Unknown SMTP2GO error'));
            }
          } catch (error) {
            console.error('❌ Error parsing SMTP2GO response:', error);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ SMTP2GO request error:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  // Helper method to strip HTML tags for plain text
  stripHtml(html) {
    return html.replace(/<[^>]*>?/gm, '');
  }

  // Pre-built email templates (same as nodemailer service)
  async sendReservationConfirmation(to, reservationData) {
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
      throw new Error('SMTP2GO service not configured');
    }

    // SMTP2GO doesn't have a specific test endpoint, so we'll just check if API key is present
    console.log('✅ SMTP2GO service connection verified (API key present)');
    return true;
  }
}

module.exports = new SMTP2GOService(); 