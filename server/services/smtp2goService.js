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

    console.log('🔍 [SMTP2GO DEBUG] Sender email details:', {
      original: fromEmail,
      cleaned: cleanedFromEmail,
      EMAIL_FROM: process.env.EMAIL_FROM
    });

    // Clean and sanitize content to avoid JSON issues
    const cleanText = text || this.stripHtml(html);
    const cleanHtml = this.sanitizeHtmlForJson(html);
    const cleanSubject = this.sanitizeSubject(subject);

    // Try sending API key in header instead of body (alternative method)
    const emailDataWithoutKey = {
      sender: cleanedFromEmail,
      recipients: cleanedToEmails,
      subject: cleanSubject,
      html: cleanHtml,
      text: cleanText
    };

    console.log('🔍 [SMTP2GO DEBUG] Testing with API key in header instead of body...');

    return new Promise((resolve, reject) => {
      const postDataAlt = JSON.stringify(emailDataWithoutKey);
      
      const optionsAlt = {
        hostname: 'api.smtp2go.com',
        port: 443,
        path: '/v3/email/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postDataAlt.length,
          'X-Smtp2go-Api-Key': this.apiKey
        }
      };

      console.log('🔍 [SMTP2GO DEBUG] Alternative request (API key in header):', JSON.stringify(optionsAlt, null, 2));

      const req = https.request(optionsAlt, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log('🔍 [SMTP2GO DEBUG] Alternative method response:', JSON.stringify(response, null, 2));
            
            if (response.data && response.data.succeeded && response.data.succeeded > 0) {
              console.log('✅ Email sent successfully via SMTP2GO (API key in header)');
              resolve({
                success: true,
                messageId: response.data.email_id,
                response: response
              });
            } else {
              console.log('⚠️ Alternative method also failed, proceeding with original method...');
              // Fall back to original method
              this.sendEmailOriginal(to, subject, html, text).then(resolve).catch(reject);
            }
          } catch (error) {
            console.error('❌ Error parsing alternative response:', error);
            // Fall back to original method
            this.sendEmailOriginal(to, subject, html, text).then(resolve).catch(reject);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Alternative request error:', error);
        // Fall back to original method
        this.sendEmailOriginal(to, subject, html, text).then(resolve).catch(reject);
      });

      req.write(postDataAlt);
      req.end();
    });
  }

  async sendEmailOriginal(to, subject, html, text = null) {
    if (!this.isConfigured) {
      throw new Error('SMTP2GO service not properly configured. Please set SMTP2GO_API_KEY.');
    }

    // Clean and validate email addresses
    const toEmails = Array.isArray(to) ? to : [to];
    const cleanedToEmails = toEmails.map(email => typeof email === 'string' ? email.trim() : email);
    
    // Clean sender email - remove display name format, just use email
    const fromEmail = process.env.EMAIL_FROM || 'noreply@carflow.sk';
    const cleanedFromEmail = fromEmail.replace(/.*<(.+)>.*/, '$1').trim();

    console.log('🔍 [SMTP2GO DEBUG] Sender email details:', {
      original: fromEmail,
      cleaned: cleanedFromEmail,
      EMAIL_FROM: process.env.EMAIL_FROM
    });

    // Clean and sanitize content to avoid JSON issues
    const cleanText = text || this.stripHtml(html);
    const cleanHtml = this.sanitizeHtmlForJson(html);
    const cleanSubject = this.sanitizeSubject(subject);

    // Use the correct SMTP2GO API structure based on official documentation
    // Force redeploy - using correct field names: recipients, html, text
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
      console.log('🔍 [SMTP2GO] Raw JSON being sent:', testJson.substring(0, 500) + '...');
      
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

      console.log('🔍 [SMTP2GO DEBUG] Request options:', JSON.stringify(options, null, 2));
      console.log('🔍 [SMTP2GO DEBUG] Request payload length:', postData.length);

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
    
    // Clean up the HTML content and ensure proper encoding for SMTP2GO
    return html
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Convert remaining \r to \n
      .replace(/\u2028/g, '\n') // Replace line separator
      .replace(/\u2029/g, '\n') // Replace paragraph separator
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis from HTML too
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  }

  // Helper method to sanitize subject line
  sanitizeSubject(subject) {
    if (!subject) return '';
    
    // Clean subject - remove emojis and problematic characters
    return subject
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters (fixed syntax)
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
    const subject = `Nova rezervacia #${reservationData.reservationNumber} - ${reservationData.carInfo}`;
    
    // Use minimal HTML to test if complex template is causing issues
    const html = `
      <html>
      <body>
        <h2>Nova rezervacia</h2>
        <p>Rezervacia: ${reservationData.reservationNumber}</p>
        <p>Auto: ${reservationData.carInfo}</p>
        <p>Zakaznik: ${reservationData.customerName}</p>
        <p>Email: ${reservationData.customerEmail}</p>
        <p>Cena: ${reservationData.totalPrice}€</p>
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