const https = require('https');

class SMTP2GOService {
  constructor() {
    this.apiKey = process.env.SMTP2GO_API_KEY;
    this.apiUrl = 'https://api.smtp2go.com/v3/email/send';
    this.isConfigured = !!this.apiKey;
    
    if (this.isConfigured) {
      console.log('✅ SMTP2GO service initialized');
    } else {
      console.warn('⚠️  SMTP2GO API key not configured');
    }
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.isConfigured) {
      throw new Error('SMTP2GO API key not configured');
    }

    const emailData = {
      api_key: this.apiKey,
      to: Array.isArray(to) ? to : [to],
      sender: process.env.EMAIL_FROM || 'EurocentrumV1 <noreply@eurocentrumv1.com>',
      subject: subject,
      html_body: html,
      text_body: text || this.stripHtml(html)
    };

    try {
      console.log(`📧 Sending email via SMTP2GO to: ${to}`);
      console.log(`📋 Subject: ${subject}`);

      const result = await this.makeRequest(emailData);
      
      console.log('✅ Email sent successfully via SMTP2GO');
      console.log('📧 Request ID:', result.data?.request_id);
      
      return {
        success: true,
        requestId: result.data?.request_id,
        provider: 'smtp2go'
      };

    } catch (error) {
      console.error('❌ SMTP2GO email sending failed:', error.message);
      throw error;
    }
  }

  async makeRequest(data) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: 'api.smtp2go.com',
        port: 443,
        path: '/v3/email/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonResponse = JSON.parse(responseData);
            
            if (res.statusCode === 200 && jsonResponse.data?.succeeded > 0) {
              resolve(jsonResponse);
            } else {
              reject(new Error(`SMTP2GO API error: ${jsonResponse.data?.error_code || 'Unknown error'} - ${jsonResponse.data?.error || responseData}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse SMTP2GO response: ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`SMTP2GO request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  // Helper method to strip HTML tags for plain text
  stripHtml(html) {
    return html.replace(/<[^>]*>?/gm, '');
  }

  // Pre-built email templates
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
        <p>EurocentrumV1 Team</p>
      </div>
    `;
    
    return this.sendEmail(to, subject, html);
  }

  async sendContactForm(to, formData) {
    const subject = `Nová správa z kontaktného formulára - ${formData.subject || 'Bez predmetu'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Nová správa z kontaktného formulára</h2>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Meno:</strong> ${formData.name}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Telefón:</strong> ${formData.phone || 'Nezadané'}</p>
          <p><strong>Predmet:</strong> ${formData.subject || 'Nezadané'}</p>
          ${formData.listingInfo ? `<p><strong>Nehnuteľnosť:</strong> ${formData.listingInfo}</p>` : ''}
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
    try {
      const testEmail = process.env.EMAIL_FROM || 'test@example.com';
      const result = await this.sendEmail(
        testEmail,
        'Test Email - EurocentrumV1 SMTP2GO',
        '<h1>Test Email</h1><p>This is a test email sent via SMTP2GO to verify the service is working.</p>',
        'This is a test email sent via SMTP2GO to verify the service is working.'
      );
      
      return {
        success: true,
        message: 'Test email sent successfully via SMTP2GO',
        details: result
      };
    } catch (error) {
      throw new Error(`SMTP2GO test failed: ${error.message}`);
    }
  }
}

module.exports = new SMTP2GOService(); 