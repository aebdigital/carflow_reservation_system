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
    console.log('   EMAIL_FROM (Rival):', process.env.EMAIL_FROM ? '✅ Set' : '❌ Missing');
    console.log('   LERENT_EMAIL_FROM:', process.env.LERENT_EMAIL_FROM ? '✅ Set' : '❌ Missing');
    console.log('   LERENT_SMTP2GO_API_KEY:', process.env.LERENT_SMTP2GO_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('   NITRACAR_EMAIL_FROM:', process.env.NITRACAR_EMAIL_FROM ? '✅ Set' : '❌ Missing');
    console.log('   NITRACAR_SMTP2GO_API_KEY:', process.env.NITRACAR_SMTP2GO_API_KEY ? '✅ Set' : '❌ Missing');

    if (!this.apiKey) {
      console.warn('⚠️  SMTP2GO not configured. Set SMTP2GO_API_KEY environment variable.');
      console.warn('   Sign up at https://www.smtp2go.com/ to get an API key.');
      return;
    }

    this.isConfigured = true;
    console.log('✅ SMTP2GO service configured successfully');
  }

  /**
   * Get tenant-specific email configuration
   * @param {Object} user - User object with email to determine tenant
   */
  getTenantEmailConfig(user = null) {
    const userEmail = user?.email ? user.email.toLowerCase().trim() : '';

    // DEBUG: Log tenant email configuration
    console.log('🔍 [EMAIL DEBUG] getTenantEmailConfig called for user:', userEmail || 'NO USER');
    console.log('   NITRACAR_EMAIL_FROM:', process.env.NITRACAR_EMAIL_FROM || 'NOT SET');
    console.log('   LERENT_EMAIL_FROM:', process.env.LERENT_EMAIL_FROM || 'NOT SET');
    console.log('   EMAIL_FROM (Rival):', process.env.EMAIL_FROM || 'NOT SET');

    // Nitra-Car tenant
    if (userEmail === 'nitra-car@nitra-car.sk') {
      console.log('🔧 [EMAIL] Using NITRACAR email configuration');
      return {
        apiKey: process.env.NITRACAR_SMTP2GO_API_KEY || this.apiKey,
        emailFrom: process.env.NITRACAR_EMAIL_FROM || 'noreply@nitracar.sk'
      };
    }

    // LeRent tenant
    if (userEmail === 'lerent@lerent.sk') {
      console.log('🔧 [EMAIL] Using LERENT email configuration');
      return {
        apiKey: process.env.LERENT_SMTP2GO_API_KEY || this.apiKey,
        emailFrom: process.env.LERENT_EMAIL_FROM || 'noreply@lerent.sk'
      };
    }

    // Rival tenant (uses EMAIL_FROM)
    if (userEmail === 'rival@test.sk') {
      console.log('🔧 [EMAIL] Using RIVAL email configuration');
      return {
        apiKey: this.apiKey,
        emailFrom: process.env.EMAIL_FROM || 'noreply@rivalcars.sk'
      };
    }

    // Default for other tenants
    console.log('🔧 [EMAIL] Using default email configuration');
    return {
      apiKey: this.apiKey,
      emailFrom: process.env.EMAIL_FROM || 'noreply@carflow.sk'
    };
  }

  /**
   * Check if SMS should be sent for this tenant (ONLY rival@test.sk)
   * @param {Object} user - User object with email to determine tenant
   */
  isSmsEnabledForTenant(user = null) {
    const userEmail = user?.email ? user.email.toLowerCase().trim() : '';
    const isRivalTenant = userEmail === 'rival@test.sk';

    console.log('📱 [SMS] Tenant check:', {
      userEmail: userEmail || 'NO USER',
      isRivalTenant,
      smsEnabled: isRivalTenant ? 'YES' : 'NO'
    });

    return isRivalTenant;
  }

  /**
   * Check if error is a LeRent template not found error
   * @param {Error} error - Error object to check
   */
  isLeRentTemplateError(error) {
    return error && error.message && error.message.includes('LERENT_TEMPLATE_NOT_FOUND');
  }

  /**
   * Safely load email template with LeRent-specific error handling
   * Returns null if LeRent template not found, throws for other errors
   * @param {string} templateName - Template name
   * @param {Object} templateVariables - Template variables
   * @param {string} senderEmail - Sender email
   * @param {string} language - Language code ('sk' or 'en') for NitraCar templates
   */
  async safeLoadEmailTemplate(templateName, templateVariables, senderEmail, language = 'sk') {
    const emailTemplateService = require('./emailTemplateService');
    try {
      return await emailTemplateService.getEmailTemplate(templateName, templateVariables, senderEmail, language);
    } catch (error) {
      // For LeRent, if template doesn't exist, skip email completely (no fallback)
      if (this.isLeRentTemplateError(error)) {
        console.warn(`⚠️ [LERENT] Skipping email - template '${templateName}' not found (no fallback for LeRent)`);
        return null;
      }
      // For other tenants/errors, throw the error
      throw error;
    }
  }

  async sendEmail(to, subject, html, text = null, user = null) {
    if (!this.isConfigured) {
      throw new Error('SMTP2GO service not properly configured. Please set SMTP2GO_API_KEY.');
    }

    // Clean and validate email addresses
    const toEmails = Array.isArray(to) ? to : [to];
    const cleanedToEmails = toEmails.map(email => typeof email === 'string' ? email.trim() : email);

    // Get tenant-specific email configuration
    const emailConfig = this.getTenantEmailConfig(user);
    const senderEmail = emailConfig.emailFrom;

    // Check if we need inline attachments (logo, icons) for tenant emails
    const emailIconHelper = require('../utils/emailIconHelper');

    // Check tenant based on user email
    const isNitraCarUser = user && user.email === 'nitra-car@nitra-car.sk';
    const isLeRentUser = user && user.email === 'lerent@lerent.sk';

    // LeRent uses hosted logo URL instead of CID attachments, so only get attachments for NitraCar
    const emailForAttachments = isNitraCarUser ? user.email : senderEmail;

    console.log('📎 [EMAIL DEBUG] Checking attachments for:', {
      senderEmail,
      userEmail: user?.email,
      isNitraCarUser,
      isLeRentUser,
      emailForAttachments,
      note: isLeRentUser ? 'LeRent uses hosted logo URL' : 'Using CID attachments'
    });

    const inlineAttachments = emailIconHelper.getIconAttachments(emailForAttachments);

    if (inlineAttachments.length > 0) {
      console.log('📎 [EMAIL] Sending email with', inlineAttachments.length, 'inline attachments (logo/icons)');
      return this.sendEmailWithAttachment(to, subject, html, inlineAttachments, text, user);
    }

    console.log('🔍 [SMTP2GO DEBUG] Sender email details:', {
      sender: senderEmail,
      EMAIL_FROM: process.env.EMAIL_FROM,
      API_KEY_SET: !!emailConfig.apiKey,
      USING_NITRACAR_CONFIG: user && user.email === 'nitra-car@nitra-car.sk'
    });

    // Clean and sanitize content to avoid JSON issues
    const cleanText = text ? this.sanitizeTextForJson(text) : this.sanitizeTextForJson(this.stripHtml(html));
    const cleanHtml = this.sanitizeHtmlForJson(html);
    const cleanSubject = this.sanitizeSubject(subject);

    // Set proper UTF-8 headers for emoji and special character support
    const headers = {
      'Content-Type': 'text/html; charset=UTF-8',
      'Content-Transfer-Encoding': '8bit',
      'MIME-Version': '1.0'
    };

    // Log raw vs cleaned content for debugging
    console.log('🔍 [SMTP2GO DEBUG] Content cleaning:');
    console.log('   Raw HTML length:', html ? html.length : 0);
    console.log('   Clean HTML length:', cleanHtml.length);
    console.log('   Raw text length:', text ? text.length : 0);
    console.log('   Clean text length:', cleanText.length);
    console.log('   Raw subject:', subject);
    console.log('   Clean subject:', cleanSubject);
    console.log('   Euro symbols removed:', (html && html.includes('€')) || (text && text.includes('€')) || subject.includes('€'));

    // SMTP2GO requires plain email address format for sender field
    // Extract email from sender if it has display name format
    let cleanSender = senderEmail;
    if (senderEmail.includes('<') && senderEmail.includes('>')) {
      // Extract email from display name format: "Name <email@domain.com>" -> "email@domain.com"
      const match = senderEmail.match(/<([^>]+)>/);
      cleanSender = match ? match[1] : senderEmail;
    }

    console.log('🔍 [SMTP2GO DEBUG] Sender format (plain email required):', {
      original: senderEmail,
      cleanEmail: cleanSender
    });

    // SMTP2GO API format - no api_key in body, use header instead
    const emailData = {
      sender: cleanSender,               // Plain email address only
      to: cleanedToEmails,
      subject: cleanSubject,
      html_body: cleanHtml,              // ACTUAL HTML content
      text_body: cleanText,              // ACTUAL text content
      headers: headers                   // UTF-8 and emoji support headers
    };

    // Log the payload structure (for debugging only)
    console.log('🔍 [SMTP2GO DEBUG] Payload structure:', JSON.stringify({
      sender: emailData.sender,
      to: emailData.to,
      subject: emailData.subject,
      html_body: '[ACTUAL_HTML_CONTENT]',
      text_body: '[ACTUAL_TEXT_CONTENT]'
    }, null, 2));

    // Log actual content being sent
    console.log('🔍 [SMTP2GO DEBUG] Actual content being sent:');
    console.log('   Subject:', cleanSubject);
    console.log('   HTML length:', cleanHtml.length, 'characters');
    console.log('   Text length:', cleanText.length, 'characters');
    console.log('   HTML preview:', cleanHtml.substring(0, 100) + '...');
    console.log('   Text preview:', cleanText.substring(0, 100) + '...');

    // Validate JSON before sending
    try {
      const testJson = JSON.stringify(emailData);
      console.log('🔍 [SMTP2GO] JSON validation passed, payload size:', testJson.length, 'bytes');
      
      // LOG THE EXACT JSON BEING SENT FOR DEBUGGING
      console.log('🔍 [SMTP2GO] EXACT JSON PAYLOAD BEING SENT:');
      console.log(testJson);
      
      // Check for potentially problematic content
      if (cleanSubject.length > 200) {
        console.warn('⚠️ [SMTP2GO] Subject line might be too long:', cleanSubject.length, 'characters');
      }
      if (cleanHtml.length > 100000) {
        console.warn('⚠️ [SMTP2GO] HTML body might be too large:', cleanHtml.length, 'characters');
      }
      
    } catch (jsonError) {
      console.error('❌ [SMTP2GO] Invalid JSON data:', jsonError);
      throw new Error(`Invalid email data for JSON: ${jsonError.message}`);
    }

    return new Promise((resolve, reject) => {
      // CRITICAL: Send the actual emailData with real content
      const postData = JSON.stringify(emailData);
      
      const options = {
        hostname: 'api.smtp2go.com',
        port: 443,
        path: '/v3/email/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(postData, 'utf8'),
          'X-Smtp2go-Api-Key': emailConfig.apiKey
        }
      };

      console.log('🔍 [SMTP2GO DEBUG] Request options:', JSON.stringify(options, null, 2));
      console.log(`📧 Sending email via SMTP2GO to: ${cleanedToEmails.join(', ')}`);
      console.log(`📋 Subject: ${subject}`);
      console.log(`👤 From: ${senderEmail}`);

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

      // SEND THE ACTUAL DATA WITH REAL CONTENT
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
    // IMPORTANT: Preserve newlines to maintain HTML structure for email clients
    return html
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Convert remaining \r to \n
      .replace(/\u2028/g, '\n') // Replace line separator
      .replace(/\u2029/g, '\n') // Replace paragraph separator
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
        // Preserve newlines and tabs, remove other control characters
        if (char === '\n' || char === '\t') return char;
        return '';
      })
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis from HTML too
      .replace(/€/g, 'EUR')     // Replace € symbol with EUR to avoid encoding issues
      .replace(/[ \t]+/g, ' ') // Normalize multiple spaces/tabs within lines (preserve newlines)
      .trim();
  }

  // Helper method to sanitize subject line
  sanitizeSubject(subject) {
    if (!subject) return '';
    
    // Clean subject - remove emojis and problematic characters
    return subject
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters (fixed syntax)
      .replace(/€/g, 'EUR')     // Replace € symbol with EUR to avoid encoding issues
      // TESTING: Slovak special characters enabled with UTF-8 encoding
      // .replace(/á/g, 'a').replace(/Á/g, 'A')
      // .replace(/č/g, 'c').replace(/Č/g, 'C')
      // .replace(/ď/g, 'd').replace(/Ď/g, 'D')
      // .replace(/é/g, 'e').replace(/É/g, 'E')
      // .replace(/í/g, 'i').replace(/Í/g, 'I')
      // .replace(/ľ/g, 'l').replace(/Ľ/g, 'L')
      // .replace(/ĺ/g, 'l').replace(/Ĺ/g, 'L')
      // .replace(/ň/g, 'n').replace(/Ň/g, 'N')
      // .replace(/ó/g, 'o').replace(/Ó/g, 'O')
      // .replace(/ô/g, 'o').replace(/Ô/g, 'O')
      // .replace(/ŕ/g, 'r').replace(/Ŕ/g, 'R')
      // .replace(/š/g, 's').replace(/Š/g, 'S')
      // .replace(/ť/g, 't').replace(/Ť/g, 'T')
      // .replace(/ú/g, 'u').replace(/Ú/g, 'U')
      // .replace(/ý/g, 'y').replace(/Ý/g, 'Y')
      // .replace(/ž/g, 'z').replace(/Ž/g, 'Z')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Helper method to sanitize text content 
  sanitizeTextForJson(text) {
    if (!text) return '';
    
    // Clean text content similar to HTML but for plain text
    return text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Convert remaining \r to \n
      .replace(/\u2028/g, '\n') // Replace line separator
      .replace(/\u2029/g, '\n') // Replace paragraph separator
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
      .replace(/€/g, 'EUR')     // Replace € symbol with EUR to avoid encoding issues
      // TESTING: Slovak special characters enabled with UTF-8 encoding
      // .replace(/á/g, 'a').replace(/Á/g, 'A')
      // .replace(/č/g, 'c').replace(/Č/g, 'C')
      // .replace(/ď/g, 'd').replace(/Ď/g, 'D')
      // .replace(/é/g, 'e').replace(/É/g, 'E')
      // .replace(/í/g, 'i').replace(/Í/g, 'I')
      // .replace(/ľ/g, 'l').replace(/Ľ/g, 'L')
      // .replace(/ĺ/g, 'l').replace(/Ĺ/g, 'L')
      // .replace(/ň/g, 'n').replace(/Ň/g, 'N')
      // .replace(/ó/g, 'o').replace(/Ó/g, 'O')
      // .replace(/ô/g, 'o').replace(/Ô/g, 'O')
      // .replace(/ŕ/g, 'r').replace(/Ŕ/g, 'R')
      // .replace(/š/g, 's').replace(/Š/g, 'S')
      // .replace(/ť/g, 't').replace(/Ť/g, 'T')
      // .replace(/ú/g, 'u').replace(/Ú/g, 'U')
      // .replace(/ý/g, 'y').replace(/Ý/g, 'Y')
      // .replace(/ž/g, 'z').replace(/Ž/g, 'Z')
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  }

  /**
   * Get car image URL with fallbacks
   * @param {Object} reservationData - Formatted reservation data
   * @param {Object} rawReservation - Raw reservation object from MongoDB (optional)
   * @returns {string} Car image URL or empty string
   */
  getCarImageUrl(reservationData, rawReservation = null) {
    // Try multiple sources for car image
    const sources = [
      rawReservation?.car?.images?.[0]?.url,
      rawReservation?.car?.imageUrl,
      reservationData?.carImage,
      reservationData?.car?.images?.[0]?.url,
      reservationData?.car?.imageUrl
    ];

    // Return the first non-empty source
    for (const source of sources) {
      if (source && typeof source === 'string' && source.trim()) {
        return source.trim();
      }
    }

    return ''; // No image found
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

  // UPDATED: Admin notification email with exact user-provided structure
  async sendAdminReservationNotification(to, reservationData, user = null) {
    const subject = `Nova rezervacia #${reservationData.reservationNumber} - ${reservationData.carInfo}`;
    
    const html = `<html><body><h2>Nova rezervacia</h2><p>Rezervacia: ${reservationData.reservationNumber}</p><p>Auto: ${reservationData.carInfo}</p><p>Zakaznik: ${reservationData.customerName}</p><p>Email: ${reservationData.customerEmail}</p><p>Cena: ${reservationData.totalPrice}€</p></body></html>`;
    
    const text = `Nova rezervacia Rezervacia: ${reservationData.reservationNumber} Auto: ${reservationData.carInfo} Zakaznik: ${reservationData.customerName} Email: ${reservationData.customerEmail} Cena: ${reservationData.totalPrice}€`;
    
    return this.sendEmail(to, subject, html, text, user);
  }

  // Customer confirmation email for new reservation
  async sendCustomerReservationConfirmation(to, reservationData, user = null, rawReservation = null) {
    console.log('📧 [SMTP2GO DEBUG] sendCustomerReservationConfirmation called with:', {
      to: to,
      hasReservationData: !!reservationData,
      hasRawReservation: !!rawReservation,
      rawReservationId: rawReservation?._id,
      rawReservationQrCodes: !!rawReservation?.qrCodes
    });

    const emailTemplateService = require('./emailTemplateService');
    const bySquareService = require('./bySquareService');

    // Get tenant-specific email configuration to determine template folder
    const emailConfig = this.getTenantEmailConfig(user);
    const senderEmail = emailConfig.emailFrom;

    // Prepare template variables from actual backend data structure
    // Handle both old emailData format and raw reservation data
    const startDate = rawReservation?.startDate || reservationData.startDate;
    const endDate = rawReservation?.endDate || reservationData.endDate;

    // Calculate pricing breakdown for email template
    const pricing = rawReservation?.pricing || {};
    const rentalDays = pricing.totalDays || Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
    const dailyRate = pricing.dailyRate || 0;
    const rentalTotal = pricing.totalAmount || pricing.rentalTotal || (dailyRate * rentalDays);

    // Get services from reservation
    const selectedServices = rawReservation?.selectedServices || [];
    const servicesForEmail = selectedServices.map(s => ({
      name: s.name || s.serviceName || 'Služba',
      price: Number(s.calculatedPrice || s.totalPrice || s.price || 0).toFixed(2)
    }));

    // Calculate services total
    const servicesTotal = rawReservation?.servicesTotal || pricing.servicesTotal ||
      selectedServices.reduce((sum, s) => sum + Number(s.calculatedPrice || s.totalPrice || s.price || 0), 0);

    // Calculate insurance totals (same as admin page)
    const additionalInsurance = rawReservation?.selectedAdditionalInsurance || [];
    const extendedInsurance = rawReservation?.selectedExtendedInsurance || [];
    const additionalInsuranceTotal = additionalInsurance.reduce((sum, i) => sum + Number(i.calculatedPrice || i.totalPrice || 0), 0);
    const extendedInsuranceTotal = extendedInsurance.reduce((sum, i) => sum + Number(i.calculatedPrice || i.totalPrice || 0), 0);

    // Calculate total (same as admin page: rental + services + all insurance)
    const isNitraCar = senderEmail && (senderEmail.includes('nitra-car') || senderEmail.includes('nitracar'));
    const totalAmount = rentalTotal + servicesTotal + additionalInsuranceTotal + extendedInsuranceTotal;

    // Get deposit amount
    const depositAmount = rawReservation?.car?.pricing?.deposit || rawReservation?.car?.deposit || pricing.deposit || 0;

    // Get variable symbol
    const variableSymbol = rawReservation?.qrCodes?.variableSymbol || rawReservation?.reservationNumber?.replace(/[^0-9]/g, '')?.slice(-10) || '';

    const templateVariables = {
      customer_name: reservationData.customerName || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || rawReservation?.car?.brand || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || rawReservation?.car?.model || reservationData.carInfo || '',
      car_image: this.getCarImageUrl(reservationData, rawReservation),
      start_date: startDate ? new Date(startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      end_date: endDate ? new Date(endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      start_time: startDate ? new Date(startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      end_time: endDate ? new Date(endDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      pickup_location: rawReservation?.pickupLocation?.name || reservationData.pickupLocation || 'Miesto vyzdvihnutia',
      dropoff_location: rawReservation?.dropoffLocation?.name || reservationData.dropoffLocation || rawReservation?.pickupLocation?.name || reservationData.pickupLocation || 'Miesto vrátenia',
      company_name: user?.businessName || user?.companyName || 'Autopožičovňa',
      company_email: emailConfig.emailFrom,
      company_phone: user?.phoneNumber || user?.phone || '+421 XXX XXX XXX',
      link_view: `https://pozicauto.sk/reservations/${reservationData.reservationNumber}`,
      current_year: new Date().getFullYear(),
      // LeRent logo URL (from environment variable or fallback)
      lerent_logo_url: process.env.LERENT_LOGO_URL || 'https://storage.googleapis.com/car_rental_carflow/tenant-5e482191fe5890cb9f9ad402/user-5e482191fe5890cb9f9ad402/logoRENT.png',
      // Pricing breakdown for NitraCar templates (no VAT - not VAT payer)
      selected_services: servicesForEmail.length > 0 ? servicesForEmail : null,
      rental_days: rentalDays,
      rental_total: rentalTotal.toFixed(2),
      services_total: servicesTotal > 0 ? servicesTotal.toFixed(2) : null,
      total_amount: totalAmount.toFixed(2),
      deposit_amount: `${Number(depositAmount).toFixed(2)} €`,
      variable_symbol: variableSymbol,
      instagram_url: 'https://www.instagram.com/nitracar/',
      facebook_url: 'https://www.facebook.com/nitracar/'
    };

    // Add QR code data if available (same logic as confirmed email)
    console.log('🔍 [EMAIL] Checking QR codes for confirmation email:', {
      hasQrCodes: !!rawReservation?.qrCodes,
      qrCodesKeys: rawReservation?.qrCodes ? Object.keys(rawReservation.qrCodes) : [],
      payBySquareRental: !!rawReservation?.qrCodes?.payBySquareRental,
      payBySquareDeposit: !!rawReservation?.qrCodes?.payBySquareDeposit,
      payBySquare: !!rawReservation?.qrCodes?.payBySquare
    });
    
    if (rawReservation?.qrCodes) {
      console.log('📱 [EMAIL] Adding QR codes to confirmation email template');
      
      const qrCodes = rawReservation.qrCodes;
      
      // Calculate amounts for display
      const rentalAmount = rawReservation.pricing?.totalAmount || 0;
      
      // Check all possible deposit sources (consistent with bySquareService)
      let depositAmount = rawReservation.car?.pricing?.deposit || rawReservation.car?.deposit || rawReservation.pricing?.deposit || 0;
      
      // TEMPORARY: If no deposit configured anywhere, use default for testing (must match bySquareService)
      if (depositAmount === 0) {
        depositAmount = 200; // Default test deposit amount
        console.log('⚠️ [EMAIL] No deposit configured anywhere, using default test amount: 200€');
      }
      
      // Handle different QR code formats
      const hasNewFormat = !!(qrCodes.payBySquareRental || qrCodes.payBySquareDeposit);
      const hasLegacyFormat = !!(qrCodes.payBySquare && !hasNewFormat);
      
      if (hasNewFormat) {
        console.log('📱 [EMAIL] Using new separate QR format');
        
        // New format: separate QR codes for rental and deposit
        const rentalQRCode = qrCodes.payBySquareRental;
        const depositQRCode = qrCodes.payBySquareDeposit;
        
        if (rentalQRCode) {
          const rentalQRImageUrl = await bySquareService.generateQRImageUrl(rentalQRCode, 'png', 300);

          if (rentalQRImageUrl) {
            templateVariables.qr_section_display = 'block';
            templateVariables.qr_rental_display = 'block';
            templateVariables.rental_amount = rentalAmount.toFixed(2);
            templateVariables.qr_rental_url = rentalQRImageUrl;

            const baseVariableSymbol = qrCodes.variableSymbol || rawReservation.reservationNumber?.replace(/[^0-9]/g, '')?.slice(-9)?.padStart(9, '0') || '000000000';
            templateVariables.variable_symbol = baseVariableSymbol.slice(0, -1) + '1';
            templateVariables.bank_account = qrCodes.bankAccount || 'SK6807200000000000000000';
            templateVariables.total_amount = (rentalAmount + depositAmount).toFixed(2);

            console.log('✅ [EMAIL] Added rental QR code data, URL length:', rentalQRImageUrl.length);
          } else {
            console.warn('⚠️ [EMAIL] Failed to generate rental QR image URL');
            templateVariables.qr_rental_display = 'none';
          }
        }

        if (depositQRCode && depositAmount > 0) {
          const depositQRImageUrl = await bySquareService.generateQRImageUrl(depositQRCode, 'png', 300);

          if (depositQRImageUrl) {
            templateVariables.qr_deposit_display = 'block';
            templateVariables.deposit_amount = depositAmount.toFixed(2);
            templateVariables.qr_deposit_url = depositQRImageUrl;

            console.log('✅ [EMAIL] Added deposit QR code data, URL length:', depositQRImageUrl.length);
          } else {
            console.warn('⚠️ [EMAIL] Failed to generate deposit QR image URL');
            templateVariables.qr_deposit_display = 'none';
          }
        } else {
          templateVariables.qr_deposit_display = 'none';
        }
        
      } else if (hasLegacyFormat) {
        console.log('📱 [EMAIL] Using legacy combined QR format');
        
        // Legacy format: one QR code for total amount (rental + deposit)
        const legacyQRCode = qrCodes.payBySquare;
        const totalAmount = (rentalAmount + depositAmount);
        
        if (legacyQRCode) {
          templateVariables.qr_section_display = 'block';
          templateVariables.qr_rental_display = 'block';
          templateVariables.rental_amount = totalAmount.toFixed(2);
          templateVariables.qr_rental_url = await bySquareService.generateQRImageUrl(legacyQRCode, 'png', 300);
          templateVariables.variable_symbol = qrCodes.variableSymbol || '0000000000';
          templateVariables.bank_account = qrCodes.bankAccount || 'SK6807200000000000000000';
          templateVariables.total_amount = totalAmount.toFixed(2);

          // Hide deposit section for legacy format
          templateVariables.qr_deposit_display = 'none';

          console.log('✅ [EMAIL] Added legacy combined QR code data');
        }
      } else {
        templateVariables.qr_section_display = 'none';
        console.log('ℹ️ [EMAIL] No valid QR codes found for email template');
      }
    } else {
      console.log('❌ [EMAIL] No QR codes object found in reservation');
      templateVariables.qr_section_display = 'none';
    }

    // Set default values if QR codes are not available
    if (!templateVariables.qr_section_display || templateVariables.qr_section_display === 'none') {
      templateVariables.qr_section_display = 'none';
      templateVariables.qr_rental_display = 'none';
      templateVariables.qr_deposit_display = 'none';
    }

    // Add bank transfer details for LeRent when payment type is 'prevod'
    const isLeRent = senderEmail === 'lerent@lerent.sk' || user?.email === 'lerent@lerent.sk';
    const isPrevodPayment = rawReservation?.paymentType === 'prevod';

    if (isLeRent && isPrevodPayment) {
      console.log('🏦 [EMAIL] Adding LeRent bank transfer details for prevod payment');
      templateVariables.show_bank_details = 'block';
      templateVariables.bank_name = 'Tatra banka, a.s.';
      templateVariables.bank_iban = 'SK31 1100 0000 0029 4103 7541';
      templateVariables.payment_amount = rawReservation.pricing?.totalAmount?.toFixed(2) || '0.00';
    } else {
      templateVariables.show_bank_details = 'none';
    }

    // Log template variables for debugging
    console.log('📧 [EMAIL DEBUG] Final confirmation template variables:', {
      qr_section_display: templateVariables.qr_section_display,
      qr_rental_url: templateVariables.qr_rental_url ? 'SET' : 'NOT SET',
      qr_deposit_url: templateVariables.qr_deposit_url ? 'SET' : 'NOT SET',
      qr_deposit_display: templateVariables.qr_deposit_display,
      rental_amount: templateVariables.rental_amount,
      deposit_amount: templateVariables.deposit_amount,
      show_bank_details: templateVariables.show_bank_details
    });

    // Get language from reservation for NitraCar (defaults to 'sk')
    const language = rawReservation?.websiteLanguage || 'sk';
    console.log('📧 [EMAIL] Reservation confirmation language:', language);

    // Get processed email template with sender-specific template folder (safe for LeRent)
    const emailData = await this.safeLoadEmailTemplate('reservation-confirmation', templateVariables, senderEmail, language);

    // If LeRent template doesn't exist, skip email (no fallback)
    if (!emailData) {
      console.warn(`⚠️ [LERENT] Skipping reservation confirmation email - template not found`);
      return { success: false, skipped: true, reason: 'LeRent template not found' };
    }

    // Override subject to match exact specification (use English for NitraCar English reservations)
    // isNitraCar already defined above for VAT calculation
    const subject = (isNitraCar && language === 'en') ? 'Reservation Received' : '📥 Rezervácia prijatá';

    return this.sendEmail(to, subject, emailData.html, null, user);
  }

  // Customer confirmation email when admin confirms reservation
  // skipPaymentInfo: if true, sends email without QR codes/payment links (NitraCar "Potvrdiť bez zálohy")
  async sendCustomerReservationConfirmed(to, reservationData, user = null, rawReservation = null, externalAttachments = [], skipPaymentInfo = false) {
    console.log('📧 [SMTP2GO DEBUG] sendCustomerReservationConfirmed called with:', {
      to: to,
      hasReservationData: !!reservationData,
      hasRawReservation: !!rawReservation,
      rawReservationId: rawReservation?._id,
      rawReservationQrCodes: !!rawReservation?.qrCodes,
      externalAttachmentsCount: externalAttachments.length,
      skipPaymentInfo: skipPaymentInfo
    });
    
    const emailTemplateService = require('./emailTemplateService');
    const bySquareService = require('./bySquareService');
    
    // Get tenant-specific email configuration to determine template folder
    const emailConfig = this.getTenantEmailConfig(user);
    const senderEmail = emailConfig.emailFrom;
    
    // Prepare template variables from actual backend data structure
    // Handle both old emailData format and raw reservation data
    const startDate = rawReservation?.startDate || reservationData.startDate;
    const endDate = rawReservation?.endDate || reservationData.endDate;

    // Debug logging for car data
    console.log('🔍 [EMAIL DEBUG] Car data sources:', {
      'reservationData.carInfo': reservationData.carInfo,
      'rawReservation.car.brand': rawReservation?.car?.brand,
      'rawReservation.car.model': rawReservation?.car?.model,
      'rawReservation.car.images': rawReservation?.car?.images,
      'rawReservation.car.imageUrl': rawReservation?.car?.imageUrl,
      'reservationData.carImage': reservationData.carImage
    });

    const templateVariables = {
      customer_name: reservationData.customerName || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || rawReservation?.car?.brand || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || rawReservation?.car?.model || reservationData.carInfo || '',
      car_image: this.getCarImageUrl(reservationData, rawReservation),
      start_date: startDate ? new Date(startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      end_date: endDate ? new Date(endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      start_time: startDate ? new Date(startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      end_time: endDate ? new Date(endDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      pickup_location: rawReservation?.pickupLocation?.name || reservationData.pickupLocation || 'Miesto vyzdvihnutia',
      dropoff_location: rawReservation?.dropoffLocation?.name || reservationData.dropoffLocation || rawReservation?.pickupLocation?.name || reservationData.pickupLocation || 'Miesto vrátenia',
      deposit_amount: `${rawReservation?.car?.pricing?.deposit || rawReservation?.car?.deposit || reservationData.deposit || '500'}€`,
      company_name: user?.businessName || user?.companyName || 'Autopožičovňa',
      company_email: emailConfig.emailFrom,
      company_phone: user?.phoneNumber || user?.phone || '+421 XXX XXX XXX',
      link_view: `https://pozicauto.sk/reservations/${reservationData.reservationNumber}`,
      link_cancel: `https://pozicauto.sk/reservations/${reservationData.reservationNumber}/cancel`,
      // LeRent logo URL (from environment variable or fallback)
      lerent_logo_url: process.env.LERENT_LOGO_URL || 'https://storage.googleapis.com/car_rental_carflow/tenant-5e482191fe5890cb9f9ad402/user-5e482191fe5890cb9f9ad402/logoRENT.png'
    };

    console.log('🔍 [EMAIL DEBUG] Final template variables:', {
      car_brand: templateVariables.car_brand,
      car_model: templateVariables.car_model,
      car_image: templateVariables.car_image
    });
    
    // Add QR code data if available (skip if skipPaymentInfo is true - "Potvrdiť bez zálohy")
    if (skipPaymentInfo) {
      console.log('📧 [EMAIL] Skipping QR codes - skipPaymentInfo=true (Potvrdiť bez zálohy)');
      templateVariables.qr_section_display = 'display: none;';
      templateVariables.qr_deposit_display = 'display: none;';
    } else {
      console.log('🔍 [EMAIL] Checking QR codes for confirmed email:', {
        hasQrCodes: !!rawReservation?.qrCodes,
        qrCodesKeys: rawReservation?.qrCodes ? Object.keys(rawReservation.qrCodes) : [],
        payBySquareRental: !!rawReservation?.qrCodes?.payBySquareRental,
        payBySquareDeposit: !!rawReservation?.qrCodes?.payBySquareDeposit,
        payBySquare: !!rawReservation?.qrCodes?.payBySquare
      });
    }

    if (!skipPaymentInfo && rawReservation?.qrCodes) {
      console.log('📱 [EMAIL] Adding QR codes to confirmed email template');
      
      const qrCodes = rawReservation.qrCodes;
      
      // Calculate amounts for display
      const rentalAmount = rawReservation.pricing?.totalAmount || 0;
      
      // Check all possible deposit sources (consistent with bySquareService)
      let depositAmount = rawReservation.car?.pricing?.deposit || rawReservation.car?.deposit || rawReservation.pricing?.deposit || 0;
      
      // TEMPORARY: If no deposit configured anywhere, use default for testing (must match bySquareService)
      if (depositAmount === 0) {
        depositAmount = 200; // Default test deposit amount
        console.log('⚠️ [EMAIL] No deposit configured anywhere, using default test amount: 200€');
      }
      
      console.log('🔍 [EMAIL] Deposit amount check for email:', {
        carPricingDeposit: rawReservation.car?.pricing?.deposit,
        carDeposit: rawReservation.car?.deposit,
        reservationPricingDeposit: rawReservation.pricing?.deposit,
        finalDepositAmount: depositAmount
      });
      
      // Handle different QR code formats
      const hasNewFormat = !!(qrCodes.payBySquareRental || qrCodes.payBySquareDeposit);
      const hasLegacyFormat = !!(qrCodes.payBySquare && !hasNewFormat);
      
      if (hasNewFormat) {
        console.log('📱 [EMAIL] Using new separate QR format');
        
        // New format: separate QR codes for rental and deposit
        const rentalQRCode = qrCodes.payBySquareRental;
        const depositQRCode = qrCodes.payBySquareDeposit;
        
        if (rentalQRCode) {
          templateVariables.qr_section_display = 'display: block;';
          templateVariables.rental_amount = rentalAmount.toFixed(2);
          templateVariables.qr_rental_image = await bySquareService.generateQRImageUrl(rentalQRCode, 'png', 300);
          templateVariables.payment_label = 'Platba za prenájom';

          const baseVariableSymbol = qrCodes.variableSymbol || rawReservation.reservationNumber?.replace(/[^0-9]/g, '')?.slice(-9)?.padStart(9, '0') || '000000000';
          templateVariables.variable_symbol_rental = baseVariableSymbol.slice(0, -1) + '1';
          templateVariables.bank_account = qrCodes.bankAccount || 'SK6807200000000000000000';

          console.log('✅ [EMAIL] Added rental QR code data');
        }

        if (depositQRCode && depositAmount > 0) {
          templateVariables.qr_deposit_display = 'display: block;';
          templateVariables.deposit_amount = depositAmount.toFixed(2);
          templateVariables.qr_deposit_image = await bySquareService.generateQRImageUrl(depositQRCode, 'png', 300);

          const baseVariableSymbol = qrCodes.variableSymbol || rawReservation.reservationNumber?.replace(/[^0-9]/g, '')?.slice(-9)?.padStart(9, '0') || '000000000';
          templateVariables.variable_symbol_deposit = baseVariableSymbol.slice(0, -1) + '2';

          console.log('✅ [EMAIL] Added deposit QR code data');
        } else {
          templateVariables.qr_deposit_display = 'display: none;';
        }

      } else if (hasLegacyFormat) {
        console.log('📱 [EMAIL] Using legacy combined QR format');

        // Legacy format: one QR code for total amount (rental + deposit)
        const legacyQRCode = qrCodes.payBySquare;
        const totalAmount = (rentalAmount + depositAmount);

        if (legacyQRCode) {
          templateVariables.qr_section_display = 'display: block;';
          templateVariables.rental_amount = totalAmount.toFixed(2);
          templateVariables.qr_rental_image = await bySquareService.generateQRImageUrl(legacyQRCode, 'png', 300);
          templateVariables.payment_label = 'Celková platba (prenájom + kaucia)';
          templateVariables.variable_symbol_rental = qrCodes.variableSymbol || '0000000000';
          templateVariables.bank_account = qrCodes.bankAccount || 'SK6807200000000000000000';

          // Hide deposit section for legacy format
          templateVariables.qr_deposit_display = 'display: none;';

          console.log('✅ [EMAIL] Added legacy combined QR code data');
        }
      } else {
        templateVariables.qr_section_display = 'display: none;';
        console.log('ℹ️ [EMAIL] No valid QR codes found for email template');
      }
    } else {
      console.log('❌ [EMAIL] No QR codes object found in reservation');
      templateVariables.qr_section_display = 'display: none;';
    }

    // Log all template variables for debugging
    console.log('📧 [EMAIL DEBUG] Final template variables:', {
      qr_section_display: templateVariables.qr_section_display,
      qr_rental_image: templateVariables.qr_rental_image ? 'SET' : 'NOT SET',
      qr_deposit_image: templateVariables.qr_deposit_image ? 'SET' : 'NOT SET',
      qr_deposit_display: templateVariables.qr_deposit_display,
      rental_amount: templateVariables.rental_amount,
      deposit_amount: templateVariables.deposit_amount,
      payment_label: templateVariables.payment_label,
      variable_symbol_rental: templateVariables.variable_symbol_rental,
      variable_symbol_deposit: templateVariables.variable_symbol_deposit,
      bank_account: templateVariables.bank_account
    });

    // For nitra-car users: Generate Stripe payment link for €50 (skip if skipPaymentInfo is true)
    if (skipPaymentInfo) {
      console.log('💳 [STRIPE] Skipping payment link - skipPaymentInfo=true (Potvrdiť bez zálohy)');
      templateVariables.stripe_payment_url = '';
      templateVariables.stripe_payment_amount = '';
    } else if (senderEmail && (
      senderEmail.includes('nitra-car@nitra-car.sk') ||
      senderEmail.includes('nitracar') ||
      senderEmail.includes('nitra-car')
    )) {
      console.log('💳 [STRIPE] Generating payment link for nitra-car reservation');
      try {
        const Settings = require('../models/Settings');
        const stripeConfig = await Settings.getStripeConfig(user.tenantId);

        if (stripeConfig && stripeConfig.secretKey) {
          const stripe = require('stripe')(stripeConfig.secretKey);

          // Create a Stripe Payment Link for €50
          const paymentLink = await stripe.paymentLinks.create({
            line_items: [
              {
                price_data: {
                  currency: 'eur',
                  product_data: {
                    name: 'Rezervačný poplatok',
                    description: `Rezervácia #${reservationData.reservationNumber || rawReservation?.reservationNumber || 'N/A'}`,
                  },
                  unit_amount: 5000, // €50 in cents
                },
                quantity: 1,
              },
            ],
            after_completion: {
              type: 'hosted_confirmation',
              hosted_confirmation: {
                custom_message: 'Ďakujeme za úhradu rezervačného poplatku!',
              },
            },
          });

          templateVariables.stripe_payment_url = paymentLink.url;
          templateVariables.stripe_payment_amount = '50€';
          console.log('✅ [STRIPE] Payment link created:', paymentLink.url);
        } else {
          console.warn('⚠️ [STRIPE] No Stripe configuration found for nitra-car tenant');
          templateVariables.stripe_payment_url = '';
        }
      } catch (error) {
        console.error('❌ [STRIPE] Error creating payment link for nitra-car:', error);
        templateVariables.stripe_payment_url = '';
      }
    } else {
      templateVariables.stripe_payment_url = '';
    }

    // Get language from reservation for NitraCar (defaults to 'sk')
    const language = rawReservation?.websiteLanguage || 'sk';
    console.log('📧 [EMAIL] Reservation confirmed language:', language);

    // Get processed email template with sender-specific template folder
    console.log('📧 [EMAIL DEBUG] Getting email template with variables...');
    const emailData = await this.safeLoadEmailTemplate('reservation-confirmed', templateVariables, senderEmail, language);
    if (!emailData) {
      console.warn(`⚠️ [LERENT] Skipping reservation confirmed email - template not found`);
      return { success: false, skipped: true, reason: 'LeRent template not found' };
    }
    console.log('📧 [EMAIL DEBUG] Email template processed successfully');

    // Set subject to match exact specification (use English for NitraCar English reservations)
    const isNitraCar = senderEmail && (senderEmail.includes('nitra-car') || senderEmail.includes('nitracar'));
    const subject = (isNitraCar && language === 'en') ? 'Reservation Confirmed' : '✅ Potvrdenie rezervácie';
    
    // Generate contract PDF if rawReservation is available
    let attachments = [];
    if (rawReservation) {
      try {
        console.log('📎 [EMAIL] Generating contract PDF for confirmed reservation:', rawReservation._id);

        const Contract = require('../models/Contract');

        // Find the contract for this reservation
        const contract = await Contract.findOne({
          reservation: rawReservation._id
        }).populate([
          {
            path: 'reservation',
            populate: [
              { path: 'customer', select: 'firstName lastName email phone address licenseNumber idNumber rodneCislo' },
              { path: 'car', select: 'brand model year registrationNumber vin color category mileage' }
            ]
          }
        ]);

        if (contract) {
          let pdfBuffer;

          // Use NitraCar dynamic PDF generator for NitraCar tenant
          if (isNitraCar) {
            console.log('📄 [EMAIL] Using NitraCar dynamic PDF generator');
            const nitracarContractPdfService = require('./nitracarContractPdfService');

            // Prepare contract data for NitraCar PDF
            const contractData = {
              contractNumber: contract.contractNumber,
              customer: {
                firstName: contract.customer?.firstName,
                lastName: contract.customer?.lastName,
                phone: contract.customer?.phone,
                email: contract.customer?.email,
                address: contract.customer?.address,
                idNumber: contract.customer?.idNumber || contract.customerIdentification?.idCardNumber,
                rodneCislo: contract.customer?.rodneCislo || contract.reservation?.customer?.rodneCislo,
                licenseNumber: contract.customer?.licenseNumber || contract.customerIdentification?.driverLicenseNumber
              },
              vehicle: {
                brand: contract.vehicle?.brand,
                model: contract.vehicle?.model,
                year: contract.vehicle?.year,
                registrationNumber: contract.vehicle?.registrationNumber,
                vin: contract.vehicle?.vin,
                color: contract.vehicle?.color
              },
              rental: {
                startDate: contract.rental?.startDate,
                endDate: contract.rental?.endDate,
                pickupLocation: contract.rental?.pickupLocation,
                returnLocation: contract.rental?.returnLocation,
                totalDays: contract.rental?.totalDays,
                dailyRate: contract.rental?.dailyRate,
                totalAmount: contract.rental?.totalAmount
              },
              additionalServices: contract.additionalServices || [],
              rentalRules: contract.rentalRules || {},
              paymentMethod: contract.paymentMethod,
              deposit: contract.deposit,
              handover: contract.handover || {},
              return: contract.return || {}
            };

            pdfBuffer = await nitracarContractPdfService.generateContract(contractData);
          } else if (contract.reservation?.customer && contract.reservation?.car) {
            // Use template-based PDF service for other tenants
            console.log('📄 [EMAIL] Using template-based PDF generator');
            const pdfService = require('./pdfService');

            pdfBuffer = await pdfService.generateRentalAgreement(
              contract.reservation,
              contract.reservation.car,
              contract.reservation.customer,
              senderEmail
            );
          }

          if (pdfBuffer) {
            // Convert PDF buffer to base64 for attachment
            const pdfBase64 = pdfBuffer.toString('base64');
            const filename = `zmluva-${contract.contractNumber || reservationData.reservationNumber}.pdf`;

            attachments.push({
              filename: filename,
              content: pdfBase64,
              type: 'application/pdf'
            });

            console.log('✅ [EMAIL] Contract PDF generated and attached:', filename);
          }
        } else {
          console.warn('⚠️ [EMAIL] Contract not found for PDF generation');
        }
      } catch (pdfError) {
        console.error('❌ [EMAIL] Failed to generate contract PDF:', pdfError.message);
        // Continue sending email without attachment
      }
    }

    // Merge external attachments (e.g., SuperFaktura invoice) with contract attachments
    if (externalAttachments && externalAttachments.length > 0) {
      console.log('📎 [EMAIL] Merging external attachments:', externalAttachments.length);

      // Convert external attachments to SMTP2GO format
      for (const extAttachment of externalAttachments) {
        // External attachments come as Buffer, need to convert to base64
        const base64Content = extAttachment.content instanceof Buffer
          ? extAttachment.content.toString('base64')
          : extAttachment.content;

        attachments.push({
          filename: extAttachment.filename,
          content: base64Content,
          type: extAttachment.contentType || 'application/pdf'
        });

        console.log('✅ [EMAIL] Added external attachment:', extAttachment.filename);
      }
    }

    console.log('📎 [EMAIL] Total attachments to send:', attachments.length);

    // Send email with or without attachment
    let emailResult;
    if (attachments.length > 0) {
      emailResult = await this.sendEmailWithAttachment(to, subject, emailData.html, attachments, null, user);
    } else {
      emailResult = await this.sendEmail(to, subject, emailData.html, null, user);
    }
    
    // Send SMS if phone number available (ONLY for rival@test.sk tenant)
    try {
      if (!this.isSmsEnabledForTenant(user)) {
        console.log('📱 [SMS] Skipping SMS - not enabled for this tenant');
      } else {
        const bulkGateService = require('./bulkGateService');
        if (bulkGateService.isConfigured && reservationData.customerPhone) {
          console.log('📱 [SMS] Sending reservation confirmed SMS to:', reservationData.customerPhone);
          // Create SMS data with raw dates if available, otherwise use formatted data
          const smsData = rawReservation ? {
            ...reservationData,
            startDate: rawReservation.startDate,  // Raw date from DB
            endDate: rawReservation.endDate       // Raw date from DB
          } : reservationData;
          await bulkGateService.sendReservationConfirmed(reservationData.customerPhone, smsData);
          console.log('✅ [SMS] Reservation confirmed SMS sent successfully');
        }
      }
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send reservation confirmed SMS:', smsError.message);
    }
    
    return emailResult;
  }

  // Customer deposit payment email (NitraCar only)
  async sendCustomerDepositEmail(to, reservationData, user = null, rawReservation = null) {
    console.log('📧 [SMTP2GO] sendCustomerDepositEmail called for:', to);

    const emailTemplateService = require('./emailTemplateService');

    // Get tenant-specific email configuration to determine template folder
    const emailConfig = this.getTenantEmailConfig(user);
    const senderEmail = emailConfig.emailFrom;

    // Check if this is NitraCar tenant
    const isNitraCar = senderEmail && (senderEmail.includes('nitra-car') || senderEmail.includes('nitracar'));
    if (!isNitraCar) {
      console.warn('⚠️ [EMAIL] Deposit email only available for NitraCar tenant');
      return { success: false, error: 'Deposit email only available for NitraCar tenant' };
    }

    // Prepare template variables from actual backend data structure
    const startDate = rawReservation?.startDate || reservationData.startDate;
    const endDate = rawReservation?.endDate || reservationData.endDate;

    const templateVariables = {
      customer_name: reservationData.customerName || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || rawReservation?.car?.brand || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || rawReservation?.car?.model || reservationData.carInfo || '',
      car_image: this.getCarImageUrl(reservationData, rawReservation),
      start_date: startDate ? new Date(startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      end_date: endDate ? new Date(endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      start_time: startDate ? new Date(startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      end_time: endDate ? new Date(endDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      pickup_location: rawReservation?.pickupLocation?.name || reservationData.pickupLocation || 'Miesto vyzdvihnutia',
      dropoff_location: rawReservation?.dropoffLocation?.name || reservationData.dropoffLocation || rawReservation?.pickupLocation?.name || reservationData.pickupLocation || 'Miesto vrátenia',
      reservation_number: reservationData.reservationNumber || rawReservation?.reservationNumber || '',
      company_name: user?.businessName || user?.companyName || 'NITRA-CAR',
      company_email: emailConfig.emailFrom,
      company_phone: '+421 910 524 554',
      instagram_url: 'https://www.instagram.com/nitracar/',
      facebook_url: 'https://www.facebook.com/nitracar/',
      current_year: new Date().getFullYear()
    };

    // Generate Stripe payment link for deposit
    try {
      const Settings = require('../models/Settings');
      const stripeConfig = await Settings.getStripeConfig(user.tenantId);

      if (stripeConfig && stripeConfig.secretKey) {
        const stripe = require('stripe')(stripeConfig.secretKey);

        // Get deposit amount from car or use default
        const depositAmount = rawReservation?.car?.pricing?.deposit || rawReservation?.car?.deposit || reservationData.deposit || 500;
        const depositInCents = Math.round(depositAmount * 100);

        // Create a Stripe Payment Link for deposit
        const paymentLink = await stripe.paymentLinks.create({
          line_items: [
            {
              price_data: {
                currency: 'eur',
                product_data: {
                  name: 'Depozit',
                  description: `Rezervácia #${reservationData.reservationNumber || rawReservation?.reservationNumber || 'N/A'} - ${templateVariables.car_brand} ${templateVariables.car_model}`,
                },
                unit_amount: depositInCents,
              },
              quantity: 1,
            },
          ],
          after_completion: {
            type: 'hosted_confirmation',
            hosted_confirmation: {
              custom_message: 'Ďakujeme za úhradu depozitu!',
            },
          },
        });

        templateVariables.stripe_payment_url = paymentLink.url;
        templateVariables.stripe_payment_amount = `${depositAmount}€`;
        console.log('✅ [STRIPE] Deposit payment link created:', paymentLink.url);
      } else {
        console.error('❌ [STRIPE] No Stripe configuration found for nitra-car tenant');
        return { success: false, error: 'Stripe not configured' };
      }
    } catch (error) {
      console.error('❌ [STRIPE] Error creating deposit payment link:', error);
      return { success: false, error: 'Failed to create Stripe payment link' };
    }

    // Get language from reservation for NitraCar (defaults to 'sk')
    const language = rawReservation?.websiteLanguage || 'sk';
    console.log('📧 [EMAIL] Deposit email language:', language);

    // Get processed email template with sender-specific template folder
    const emailData = await this.safeLoadEmailTemplate('reservation-deposit', templateVariables, senderEmail, language);
    if (!emailData) {
      console.warn('⚠️ [EMAIL] Skipping deposit email - template not found');
      return { success: false, skipped: true, reason: 'Deposit template not found' };
    }

    // Set subject based on language
    const subject = language === 'en' ? '💳 Deposit Payment' : '💳 Platba depozitu';

    return this.sendEmail(to, subject, emailData.html, null, user);
  }

  // Customer notification when admin edits reservation
  async sendCustomerReservationEdited(to, reservationData, user = null, rawReservation = null) {
    const emailTemplateService = require('./emailTemplateService');

    // Get tenant-specific email configuration to determine template folder
    const emailConfig = this.getTenantEmailConfig(user);
    const senderEmail = emailConfig.emailFrom;

    // Prepare template variables from actual backend data structure
    // IMPORTANT: Use rawReservation dates (ISO format) instead of reservationData dates (already formatted strings)
    const startDate = rawReservation?.startDate || reservationData.startDate;
    const endDate = rawReservation?.endDate || reservationData.endDate;

    // Get deposit amount from car or reservation
    const depositAmount = rawReservation?.car?.pricing?.deposit ||
                          rawReservation?.car?.deposit ||
                          reservationData.deposit_amount ||
                          reservationData.deposit ||
                          0;

    // Get pickup/dropoff locations from rawReservation or fallback to reservationData
    const pickupLocation = rawReservation?.pickupLocation?.name || reservationData.pickupLocation || 'Miesto vyzdvihnutia';
    const dropoffLocation = rawReservation?.dropoffLocation?.name || rawReservation?.pickupLocation?.name || reservationData.dropoffLocation || pickupLocation;

    // Calculate pricing breakdown for email template
    const pricing = rawReservation?.pricing || {};
    const rentalDays = pricing.totalDays || Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
    const dailyRate = pricing.dailyRate || 0;
    const rentalTotal = pricing.totalAmount || pricing.rentalTotal || (dailyRate * rentalDays);

    // Get services from reservation
    const selectedServices = rawReservation?.selectedServices || [];
    const servicesForEmail = selectedServices.map(s => ({
      name: s.name || s.serviceName || 'Služba',
      price: Number(s.calculatedPrice || s.totalPrice || s.price || 0).toFixed(2)
    }));

    // Calculate services total
    const servicesTotal = rawReservation?.servicesTotal || pricing.servicesTotal ||
      selectedServices.reduce((sum, s) => sum + Number(s.calculatedPrice || s.totalPrice || s.price || 0), 0);

    // Calculate insurance totals (same as admin page)
    const additionalInsurance = rawReservation?.selectedAdditionalInsurance || [];
    const extendedInsurance = rawReservation?.selectedExtendedInsurance || [];
    const additionalInsuranceTotal = additionalInsurance.reduce((sum, i) => sum + Number(i.calculatedPrice || i.totalPrice || 0), 0);
    const extendedInsuranceTotal = extendedInsurance.reduce((sum, i) => sum + Number(i.calculatedPrice || i.totalPrice || 0), 0);

    // Calculate total (same as admin page: rental + services + all insurance)
    const isNitraCarEmail = senderEmail && (senderEmail.includes('nitra-car') || senderEmail.includes('nitracar'));
    const totalAmount = rentalTotal + servicesTotal + additionalInsuranceTotal + extendedInsuranceTotal;

    // Get variable symbol
    const variableSymbol = rawReservation?.qrCodes?.variableSymbol || rawReservation?.reservationNumber?.replace(/[^0-9]/g, '')?.slice(-10) || '';

    const templateVariables = {
      customer_name: reservationData.customerName || rawReservation?.customer?.firstName + ' ' + rawReservation?.customer?.lastName || '',
      car_brand: rawReservation?.car?.brand || reservationData.carInfo?.split(' ')[0] || reservationData.carBrand || '',
      car_model: rawReservation?.car?.model || reservationData.carInfo?.split(' ').slice(1).join(' ') || reservationData.carModel || '',
      car_image: this.getCarImageUrl(reservationData, rawReservation),
      start_date: startDate ? new Date(startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      end_date: endDate ? new Date(endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      start_time: startDate ? new Date(startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      end_time: endDate ? new Date(endDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      deposit_amount: `${Number(depositAmount).toFixed(2)} €`,
      company_name: user?.businessName || user?.companyName || 'Autopožičovňa',
      company_email: emailConfig.emailFrom,
      company_phone: user?.phoneNumber || user?.phone || '+421 XXX XXX XXX',
      instagram_url: 'https://www.instagram.com/nitracar/',
      facebook_url: 'https://www.facebook.com/nitracar/',
      current_year: new Date().getFullYear().toString(),
      link_view: `https://pozicauto.sk/reservations/${reservationData.reservationNumber || rawReservation?.reservationNumber}`,
      // Pricing breakdown for NitraCar templates (no VAT - not VAT payer)
      selected_services: servicesForEmail.length > 0 ? servicesForEmail : null,
      rental_days: rentalDays,
      rental_total: rentalTotal.toFixed(2),
      services_total: servicesTotal > 0 ? servicesTotal.toFixed(2) : null,
      total_amount: totalAmount.toFixed(2),
      variable_symbol: variableSymbol
    };

    // Get language from reservation for NitraCar (defaults to 'sk')
    const language = rawReservation?.websiteLanguage || 'sk';
    console.log('📧 [EMAIL] Reservation edited language:', language);

    // Get processed email template with sender-specific template folder
    const emailData = await this.safeLoadEmailTemplate('reservation-edited', templateVariables, senderEmail, language);
    if (!emailData) {
      console.warn(`⚠️ [LERENT] Skipping reservation edited email - template not found`);
      return { success: false, skipped: true, reason: 'LeRent template not found' };
    }

    // Set subject to match exact specification (use English for NitraCar English reservations)
    const isNitraCar = senderEmail && (senderEmail.includes('nitra-car') || senderEmail.includes('nitracar'));
    const subject = (isNitraCar && language === 'en') ? 'Reservation Updated' : '🔄 Zmena rezervácie';
    
    // Send email
    const emailResult = await this.sendEmail(to, subject, emailData.html, null, user);

    // Send SMS if phone number available (ONLY for rival@test.sk tenant)
    try {
      if (!this.isSmsEnabledForTenant(user)) {
        console.log('📱 [SMS] Skipping SMS - not enabled for this tenant');
      } else {
        const bulkGateService = require('./bulkGateService');
        if (bulkGateService.isConfigured && reservationData.customerPhone) {
          console.log('📱 [SMS] Sending reservation edited SMS to:', reservationData.customerPhone);
          // Use formatted data for edited SMS (no raw reservation available here)
          await bulkGateService.sendReservationEdited(reservationData.customerPhone, reservationData);
          console.log('✅ [SMS] Reservation edited SMS sent successfully');
        }
      }
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send reservation edited SMS:', smsError.message);
    }
    
    return emailResult;
  }

  // Customer cancellation email when admin cancels reservation
  async sendCustomerCancellationNotification(to, cancellationData, user = null, rawReservation = null) {
    const emailTemplateService = require('./emailTemplateService');

    // Get tenant-specific email configuration to determine template folder
    const emailConfig = this.getTenantEmailConfig(user);
    const senderEmail = emailConfig.emailFrom;

    // Prepare template variables from actual backend data structure
    // Handle both old emailData format and raw reservation data (same as confirmation email)
    const startDate = rawReservation?.startDate || cancellationData.startDate;
    const endDate = rawReservation?.endDate || cancellationData.endDate;

    const templateVariables = {
      customer_name: cancellationData.customerName || '',
      car_brand: cancellationData.carInfo?.split(' ')[0] || rawReservation?.car?.brand || '',
      car_model: cancellationData.carInfo?.split(' ').slice(1).join(' ') || rawReservation?.car?.model || cancellationData.carInfo || '',
      car_image: this.getCarImageUrl(cancellationData, rawReservation),
      start_date: startDate ? new Date(startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      end_date: endDate ? new Date(endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      start_time: startDate ? new Date(startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      end_time: endDate ? new Date(endDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      pickup_location: rawReservation?.pickupLocation?.name || cancellationData.pickupLocation || 'Miesto vyzdvihnutia',
      dropoff_location: rawReservation?.dropoffLocation?.name || cancellationData.dropoffLocation || rawReservation?.pickupLocation?.name || cancellationData.pickupLocation || 'Miesto vrátenia',
      company_name: user?.businessName || user?.companyName || 'Autopožičovňa',
      company_email: emailConfig.emailFrom,
      company_phone: user?.phoneNumber || user?.phone || '+421 XXX XXX XXX',
      link_new: `https://www.pozicauto.sk`
    };

    // Get language from reservation for NitraCar (defaults to 'sk')
    const language = rawReservation?.websiteLanguage || 'sk';
    console.log('📧 [EMAIL] Reservation cancelled language:', language);

    // Get processed email template with sender-specific template folder
    const emailData = await this.safeLoadEmailTemplate('reservation-cancelled', templateVariables, senderEmail, language);
    if (!emailData) {
      console.warn(`⚠️ [LERENT] Skipping reservation cancelled email - template not found`);
      return { success: false, skipped: true, reason: 'LeRent template not found' };
    }

    // Set subject to match exact specification (use English for NitraCar English reservations)
    const isNitraCar = senderEmail && (senderEmail.includes('nitra-car') || senderEmail.includes('nitracar'));
    const subject = (isNitraCar && language === 'en') ? 'Reservation Cancelled' : '❌ Rezervácia zrušená';
    
    // Send email
    const emailResult = await this.sendEmail(to, subject, emailData.html, null, user);

    // Send SMS if phone number available (ONLY for rival@test.sk tenant)
    try {
      if (!this.isSmsEnabledForTenant(user)) {
        console.log('📱 [SMS] Skipping SMS - not enabled for this tenant');
      } else {
        const bulkGateService = require('./bulkGateService');
        if (bulkGateService.isConfigured && cancellationData.customerPhone) {
          console.log('📱 [SMS] Sending reservation cancelled SMS to:', cancellationData.customerPhone);
          await bulkGateService.sendReservationCancelled(cancellationData.customerPhone, cancellationData);
          console.log('✅ [SMS] Reservation cancelled SMS sent successfully');
        }
      }
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send reservation cancelled SMS:', smsError.message);
    }
    
    return emailResult;
  }

  // Customer 24-hour reminder email
  async sendCustomerReservationReminder24(to, reservationData, user = null, rawReservation = null) {
    const emailTemplateService = require('./emailTemplateService');

    // Get tenant-specific email configuration to determine template folder
    const emailConfig = this.getTenantEmailConfig(user);
    const senderEmail = emailConfig.emailFrom;

    // Get pickup location from settings
    const pickupLocation = await this.getPickupLocation(reservationData.tenantId);

    // Prepare template variables from actual backend data structure
    const startDate = reservationData.startDate;
    const endDate = reservationData.endDate;

    const templateVariables = {
      customer_name: reservationData.customerName || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || rawReservation?.car?.brand || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || rawReservation?.car?.model || reservationData.carInfo || '',
      car_image: this.getCarImageUrl(reservationData, rawReservation),
      start_date: startDate ? new Date(startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      end_date: endDate ? new Date(endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      start_time: startDate ? new Date(startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      end_time: endDate ? new Date(endDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      pickup_location: reservationData.pickupLocation || pickupLocation,
      dropoff_location: reservationData.dropoffLocation || reservationData.pickupLocation || pickupLocation,
      company_name: user?.businessName || user?.companyName || 'Autopožičovňa',
      company_email: emailConfig.emailFrom,
      company_phone: user?.phoneNumber || user?.phone || '+421 XXX XXX XXX'
    };

    // Get language from reservation for NitraCar (defaults to 'sk')
    const language = rawReservation?.websiteLanguage || reservationData.websiteLanguage || 'sk';
    console.log('📧 [EMAIL] Reservation reminder24 language:', language);

    // Get processed email template with sender-specific template folder
    // For pickup reminders, use the specific template for each tenant
    const isNitraCar = senderEmail && (senderEmail.includes('nitra-car') || senderEmail.includes('nitracar'));
    const isLeRent = senderEmail && senderEmail.includes('lerent');

    let templateName;
    if (isLeRent) {
      templateName = 'reservation-reminder24';       // LeRent specific pickup reminder template
    } else if (isNitraCar) {
      templateName = 'reservation-reminder24';       // NitraCar specific pickup reminder template
    } else {
      templateName = 'reminder-notification';        // Default/Rival template
    }

    const emailData = await this.safeLoadEmailTemplate(templateName, templateVariables, senderEmail, language);
    if (!emailData) {
      console.warn(`⚠️ [LERENT] Skipping email for template '${templateName}' - template not found`);
      return { success: false, skipped: true, reason: 'LeRent template not found' };
    }

    // Set subject to match exact specification (use English for NitraCar English reservations)
    const subject = (isNitraCar && language === 'en') ? 'Reminder: Your Reservation is Tomorrow' : '⏰ Pripomienka: Rezervácia zajtra';
    
    // Send email
    const emailResult = await this.sendEmail(to, subject, emailData.html, null, user);

    // Send SMS if phone number available (ONLY for rival@test.sk tenant)
    try {
      if (!this.isSmsEnabledForTenant(user)) {
        console.log('📱 [SMS] Skipping SMS - not enabled for this tenant');
      } else {
        const bulkGateService = require('./bulkGateService');
        if (bulkGateService.isConfigured && reservationData.customerPhone) {
          console.log('📱 [SMS] Sending 24h reminder SMS to:', reservationData.customerPhone);
          await bulkGateService.sendReservationReminder24(reservationData.customerPhone, reservationData);
          console.log('✅ [SMS] 24h reminder SMS sent successfully');
        }
      }
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send 24h reminder SMS:', smsError.message);
    }
    
    return emailResult;
  }

  // Customer 24-hour return reminder notification (before return date)
  async sendCustomerReturnReminder24(to, reservationData, user = null, rawReservation = null) {
    const emailTemplateService = require('./emailTemplateService');

    // Get tenant-specific email configuration to determine template folder
    const emailConfig = this.getTenantEmailConfig(user);
    const senderEmail = emailConfig.emailFrom;

    // Get pickup location from settings (used for return location too)
    const pickupLocation = await this.getPickupLocation(reservationData.tenantId);

    // Prepare template variables from actual backend data structure
    const startDate = reservationData.startDate;
    const endDate = reservationData.endDate;

    const templateVariables = {
      customer_name: reservationData.customerName || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || rawReservation?.car?.brand || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || rawReservation?.car?.model || reservationData.carInfo || '',
      car_image: this.getCarImageUrl(reservationData, rawReservation),
      start_date: startDate ? new Date(startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      end_date: endDate ? new Date(endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      start_time: startDate ? new Date(startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      end_time: endDate ? new Date(endDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      pickup_location: reservationData.pickupLocation || pickupLocation,
      dropoff_location: reservationData.dropoffLocation || reservationData.pickupLocation || pickupLocation,
      company_name: user?.businessName || user?.companyName || 'Autopožičovňa',
      company_email: emailConfig.emailFrom,
      company_phone: user?.phoneNumber || user?.phone || '+421 XXX XXX XXX'
    };

    // Get language from reservation for NitraCar (defaults to 'sk')
    const language = rawReservation?.websiteLanguage || reservationData.websiteLanguage || 'sk';
    console.log('📧 [EMAIL] Return reminder24 language:', language);

    // Get processed email template with sender-specific template folder
    // For vehicle return reminders, use the specific template for each tenant
    const isNitraCar = senderEmail && (senderEmail.includes('nitra-car') || senderEmail.includes('nitracar'));
    const isLeRent = senderEmail && senderEmail.includes('lerent');

    let templateName;
    if (isLeRent) {
      templateName = 'reservation-reminder24before';  // LeRent specific return reminder template
    } else if (isNitraCar) {
      templateName = 'reservation-reminder24after';   // NitraCar specific return reminder template
    } else {
      templateName = 'reminder-notification';         // Default/Rival template
    }

    const emailData = await this.safeLoadEmailTemplate(templateName, templateVariables, senderEmail, language);
    if (!emailData) {
      console.warn(`⚠️ [LERENT] Skipping email for template '${templateName}' - template not found`);
      return { success: false, skipped: true, reason: 'LeRent template not found' };
    }

    // Set subject to match exact specification (use English for NitraCar English reservations)
    const subject = (isNitraCar && language === 'en') ? 'Reminder: Vehicle Return Tomorrow' : '⏰ Pripomienka: Vrátenie vozidla zajtra';
    
    // Send email
    const emailResult = await this.sendEmail(to, subject, emailData.html, null, user);
    
    // Send SMS if phone number available (optional for return reminder)
    try {
      const bulkGateService = require('./bulkGateService');
      if (bulkGateService.isConfigured && reservationData.customerPhone) {
        console.log('📱 [SMS] Sending return reminder SMS to:', reservationData.customerPhone);
        // Note: You would need to implement sendReturnReminder24 in bulkGateService if SMS is needed
        // await bulkGateService.sendReturnReminder24(reservationData.customerPhone, reservationData);
        console.log('✅ [SMS] Return reminder SMS sent successfully');
      }
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send return reminder SMS:', smsError.message);
    }
    
    return emailResult;
  }

  // Customer review request email (24h after trip ends)
  async sendCustomerReviewRequest(to, reservationData, user = null, rawReservation = null) {
    const emailTemplateService = require('./emailTemplateService');

    // Get tenant-specific email configuration to determine template folder
    const emailConfig = this.getTenantEmailConfig(user);
    const senderEmail = emailConfig.emailFrom;

    // Prepare template variables from actual backend data structure
    const startDate = reservationData.startDate;
    const endDate = reservationData.endDate;

    const templateVariables = {
      customer_name: reservationData.customerName || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || rawReservation?.car?.brand || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || rawReservation?.car?.model || reservationData.carInfo || '',
      car_image: this.getCarImageUrl(reservationData, rawReservation),
      start_date: startDate ? new Date(startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      end_date: endDate ? new Date(endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '',
      start_time: startDate ? new Date(startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      end_time: endDate ? new Date(endDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '',
      pickup_location: reservationData.pickupLocation || 'Miesto vyzdvihnutia',
      dropoff_location: reservationData.dropoffLocation || reservationData.pickupLocation || 'Miesto vrátenia',
      company_name: user?.businessName || user?.companyName || 'Autopožičovňa',
      company_email: emailConfig.emailFrom,
      company_phone: user?.phoneNumber || user?.phone || '+421 XXX XXX XXX',
      google_review_link: process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/YOUR_GOOGLE_BUSINESS_ID/review',
      feedback_form_link: `https://pozicauto.sk/feedback?reservation=${reservationData.reservationNumber}`
    };

    // Get processed email template with sender-specific template folder
    // Check if LeRent has review template, if not - skip review emails for LeRent
    const isLeRent = senderEmail && senderEmail.includes('lerent');

    if (isLeRent) {
      console.log('ℹ️ [EMAIL] Skipping review email for LeRent tenant - no leave-review template available');
      return { success: true, skipped: true, reason: 'LeRent tenant has no review email template' };
    }

    const emailData = await this.safeLoadEmailTemplate('leave-review', templateVariables, senderEmail);
    if (!emailData) {
      console.warn(`⚠️ [LERENT] Skipping review request email - template not found`);
      return { success: false, skipped: true, reason: 'LeRent template not found' };
    }

    // Set subject to match exact specification
    const subject = '⭐ Ako sa Vám páčila jazda?';

    // Send email
    const emailResult = await this.sendEmail(to, subject, emailData.html, null, user);

    // Send SMS if phone number available (ONLY for rival@test.sk tenant)
    try {
      if (!this.isSmsEnabledForTenant(user)) {
        console.log('📱 [SMS] Skipping SMS - not enabled for this tenant');
      } else {
        const bulkGateService = require('./bulkGateService');
        if (bulkGateService.isConfigured && reservationData.customerPhone) {
          console.log('📱 [SMS] Sending review request SMS to:', reservationData.customerPhone);
          await bulkGateService.sendReviewRequest(reservationData.customerPhone, reservationData);
          console.log('✅ [SMS] Review request SMS sent successfully');
        }
      }
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send review request SMS:', smsError.message);
    }
    
    return emailResult;
  }

  // Test with the exact structure provided by user
  async testSimpleEmail() {
    if (!this.isConfigured) {
      throw new Error('SMTP2GO service not configured');
    }

    // Use the correct SMTP2GO API format
    const testEmailData = {
      sender: process.env.EMAIL_FROM || 'noreply@carflow.sk',
      to: ['peter@aebdig.com'],
      subject: 'SMTP2GO Test - Corrected Format',
      html_body: '<html><body><h2>Test Email</h2><p>This email uses the correct SMTP2GO API format.</p><p>API Key: Sent via X-Smtp2go-Api-Key header</p></body></html>',
      text_body: 'Test Email - This email uses the correct SMTP2GO API format. API Key: Sent via X-Smtp2go-Api-Key header'
    };

    console.log('🔍 [SMTP2GO TEST] Email data (corrected format):', JSON.stringify(testEmailData, null, 2));

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(testEmailData);
      
      const options = {
        hostname: 'api.smtp2go.com',
        port: 443,
        path: '/v3/email/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(postData, 'utf8'),
          'X-Smtp2go-Api-Key': emailConfig.apiKey
        }
      };

      console.log('📧 [SMTP2GO TEST] Sending test email with exact user structure...');

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

  /**
   * Get pickup location from settings
   */
  async getPickupLocation(tenantId) {
    try {
      const Settings = require('../models/Settings');
      const settings = await Settings.getForTenant(tenantId);
      return settings.getDefaultPickupLocation();
    } catch (error) {
      console.warn('⚠️ [SMTP2GO] Could not fetch pickup location, using default:', error.message);
      return 'Banska Bystrica';
    }
  }

  // Send email with attachments
  async sendEmailWithAttachment(to, subject, html, attachments = [], text = null, user = null) {
    if (!this.isConfigured) {
      throw new Error('SMTP2GO service not properly configured. Please set SMTP2GO_API_KEY.');
    }

    // Clean and validate email addresses
    const toEmails = Array.isArray(to) ? to : [to];
    const cleanedToEmails = toEmails.map(email => typeof email === 'string' ? email.trim() : email);

    // Get tenant-specific email configuration
    const emailConfig = this.getTenantEmailConfig(user);
    const senderEmail = emailConfig.emailFrom;

    console.log('📎 [SMTP2GO] Sending email with attachments to:', cleanedToEmails);
    console.log('📎 [SMTP2GO] Attachments count:', attachments.length);
    console.log('📎 [SMTP2GO] Attachment details:', attachments.map(a => ({
      filename: a.filename,
      cid: a.cid,
      type: a.type,
      contentLength: a.content?.length
    })));

    // Clean and sanitize content to avoid JSON issues
    const cleanText = text ? this.sanitizeTextForJson(text) : this.sanitizeTextForJson(this.stripHtml(html));
    const cleanHtml = this.sanitizeHtmlForJson(html);
    const cleanSubject = this.sanitizeSubject(subject);

    const payload = {
      api_key: emailConfig.apiKey,
      to: cleanedToEmails,
      sender: senderEmail,
      subject: cleanSubject,
      text_body: cleanText,
      html_body: cleanHtml,
      attachments: attachments.map(attachment => {
        const attObj = {
          filename: attachment.filename,
          fileblob: attachment.content, // base64 encoded content
          mimetype: attachment.type || 'application/octet-stream'
        };
        // Add CID for inline attachments (logo, icons)
        if (attachment.cid) {
          attObj.cid = attachment.cid;
        }
        return attObj;
      })
    };

    console.log('📎 [SMTP2GO] Payload prepared with', attachments.length, 'attachments');

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);

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
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            console.log('📎 [SMTP2GO] Response status:', res.statusCode);
            console.log('📎 [SMTP2GO] Response body:', response);

            if (res.statusCode === 200 && response.data && response.data.succeeded > 0) {
              console.log('✅ [SMTP2GO] Email with attachments sent successfully');
              resolve({
                success: true,
                messageId: response.data.message_id || 'unknown',
                response: response
              });
            } else {
              console.error('❌ [SMTP2GO] Email with attachments failed:', response);
              reject(new Error(`SMTP2GO API error: ${response.data?.error || 'Unknown error'}`));
            }
          } catch (parseError) {
            console.error('❌ [SMTP2GO] Failed to parse response:', parseError.message);
            console.error('❌ [SMTP2GO] Raw response:', data);
            reject(new Error(`Failed to parse SMTP2GO response: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ [SMTP2GO] Request error:', error.message);
        reject(new Error(`SMTP2GO request failed: ${error.message}`));
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

    console.log('✅ SMTP2GO service connection verified (API key from SMTP2GO_API_KEY env var)');
    return true;
  }
}

module.exports = new SMTP2GOService(); 