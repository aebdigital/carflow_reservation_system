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

    // Clean and validate email addresses
    const toEmails = Array.isArray(to) ? to : [to];
    const cleanedToEmails = toEmails.map(email => typeof email === 'string' ? email.trim() : email);
    
    // Clean sender email - remove display name format, just use email
    const fromEmail = process.env.EMAIL_FROM || 'noreply@carflow.sk';
    const cleanedFromEmail = fromEmail.replace(/.*<(.+)>.*/, '$1').trim();

    // Clean and sanitize content to avoid JSON issues
    const cleanText = text || this.stripHtml(html);
    const cleanHtml = this.sanitizeHtmlForJson(html);
    const cleanSubject = this.sanitizeSubject(subject);

    // Use the correct SMTP2GO API structure based on official documentation
    const emailData = {
      api_key: this.apiKey,
      sender: cleanedFromEmail,
      recipients: cleanedToEmails,  // Changed from 'to' to 'recipients'
      subject: cleanSubject,
      html: cleanHtml,              // Changed from 'html_body' to 'html'
      text: cleanText               // Changed from 'text_body' to 'text'
    };

    console.log('🔍 [SMTP2GO DEBUG] Email payload:', JSON.stringify({
      ...emailData,
      api_key: '[HIDDEN]',
      html: '[HTML_CONTENT_LENGTH:' + cleanHtml.length + ']',
      text: '[TEXT_CONTENT_LENGTH:' + cleanText.length + ']'
    }, null, 2));

    console.log('🔍 [SMTP2GO DEBUG] Subject details:', {
      original: subject,
      cleaned: cleanSubject,
      length: cleanSubject.length,
      hasEmoji: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(cleanSubject)
    });

    // Validate JSON before sending
    try {
      const testJson = JSON.stringify(emailData);
      console.log('🔍 [SMTP2GO] JSON validation passed, payload size:', testJson.length, 'bytes');
      
      // Check for potentially problematic content
      if (cleanSubject.length > 200) {
        console.warn('⚠️ [SMTP2GO] Subject line might be too long:', cleanSubject.length, 'characters');
      }
      if (cleanHtml.length > 100000) {
        console.warn('⚠️ [SMTP2GO] HTML body might be too large:', cleanHtml.length, 'characters');
      }
      
    } catch (jsonError) {
      console.error('❌ [SMTP2GO] Invalid JSON data:', jsonError);
      console.error('❌ [SMTP2GO] Problematic data:', {
        subject: cleanSubject,
        htmlLength: cleanHtml.length,
        textLength: cleanText.length
      });
      throw new Error(`Invalid email data for JSON: ${jsonError.message}`);
    }

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

      console.log(`📧 Sending email via SMTP2GO to: ${cleanedToEmails.join(', ')}`);
      console.log(`📋 Subject: ${subject}`);

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            console.log('🔍 [SMTP2GO DEBUG] Response:', JSON.stringify(response, null, 2));
            
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
            console.error('❌ Raw response:', data);
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
    return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  }

  // Helper method to sanitize HTML content for JSON
  sanitizeHtmlForJson(html) {
    if (!html) return '';
    
    // Clean up the HTML content and ensure proper encoding
    return html
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Convert remaining \r to \n
      .replace(/\u2028/g, '\n') // Replace line separator
      .replace(/\u2029/g, '\n') // Replace paragraph separator
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .trim();
  }

  // Helper method to sanitize subject line
  sanitizeSubject(subject) {
    if (!subject) return '';
    
    // Clean subject but preserve emojis and Slovak characters
    return subject
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
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

  // NEW: Admin notification email for new reservations
  async sendAdminReservationNotification(to, reservationData) {
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

  // Test with simple structure to isolate the issue
  async testSimpleEmail() {
    if (!this.isConfigured) {
      throw new Error('SMTP2GO service not configured');
    }

    // Use the structure from SMTP2GO examples
    const simpleEmailData = {
      api_key: this.apiKey,
      sender: process.env.EMAIL_FROM || 'noreply@carflow.sk',
      recipients: ['peter@aebdig.com'],
      subject: 'Test Email - Simple Structure',
      text: 'This is a simple test email to verify SMTP2GO integration.',
      html: '<html><body><h1>Test Email</h1><p>This is a simple test email to verify SMTP2GO integration.</p></body></html>'
    };

    console.log('🔍 [SMTP2GO TEST] Simple email data:', JSON.stringify(simpleEmailData, null, 2));

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(simpleEmailData);
      
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

      console.log('📧 [SMTP2GO TEST] Sending simple test email...');

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log('🔍 [SMTP2GO TEST] Response:', JSON.stringify(response, null, 2));
            resolve(response);
          } catch (error) {
            console.error('❌ [SMTP2GO TEST] Error parsing response:', error);
            console.error('❌ [SMTP2GO TEST] Raw response:', data);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ [SMTP2GO TEST] Request error:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
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