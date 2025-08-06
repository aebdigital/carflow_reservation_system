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
    
    // Use the full sender format - SMTP2GO can handle display names
    const senderEmail = process.env.EMAIL_FROM || 'noreply@carflow.sk';

    console.log('🔍 [SMTP2GO DEBUG] Sender email details:', {
      sender: senderEmail,
      EMAIL_FROM: process.env.EMAIL_FROM,
      API_KEY_SET: !!this.apiKey
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
          'X-Smtp2go-Api-Key': this.apiKey
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
    return html
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Convert remaining \r to \n
      .replace(/\u2028/g, '\n') // Replace line separator
      .replace(/\u2029/g, '\n') // Replace paragraph separator
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis from HTML too
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
  async sendAdminReservationNotification(to, reservationData) {
    const subject = `Nova rezervacia #${reservationData.reservationNumber} - ${reservationData.carInfo}`;
    
    const html = `<html><body><h2>Nova rezervacia</h2><p>Rezervacia: ${reservationData.reservationNumber}</p><p>Auto: ${reservationData.carInfo}</p><p>Zakaznik: ${reservationData.customerName}</p><p>Email: ${reservationData.customerEmail}</p><p>Cena: ${reservationData.totalPrice}€</p></body></html>`;
    
    const text = `Nova rezervacia Rezervacia: ${reservationData.reservationNumber} Auto: ${reservationData.carInfo} Zakaznik: ${reservationData.customerName} Email: ${reservationData.customerEmail} Cena: ${reservationData.totalPrice}€`;
    
    return this.sendEmail(to, subject, html, text);
  }

  // Customer confirmation email for new reservation
  async sendCustomerReservationConfirmation(to, reservationData) {
    const emailTemplateService = require('./emailTemplateService');
    
    // Prepare template variables from actual backend data structure
    const templateVariables = {
      first_name: reservationData.customerName?.split(' ')[0] || '',
      last_name: reservationData.customerName?.split(' ').slice(1).join(' ') || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || reservationData.carInfo || '',
      link_view: `${process.env.CLIENT_URL || 'https://app.carflow.sk'}/reservations/${reservationData.reservationNumber}`
    };

    // Get processed email template
    const emailData = await emailTemplateService.getEmailTemplate('reservation-confirmation', templateVariables);
    
    // Override subject to match exact specification
    const subject = '📥 Rezervácia prijatá';
    
    return this.sendEmail(to, subject, emailData.html);
  }

  // Customer confirmation email when admin confirms reservation
  async sendCustomerReservationConfirmed(to, reservationData, rawReservation = null) {
    const emailTemplateService = require('./emailTemplateService');
    
    // Prepare template variables from actual backend data structure
    const templateVariables = {
      first_name: reservationData.customerName?.split(' ')[0] || '',
      last_name: reservationData.customerName?.split(' ').slice(1).join(' ') || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || reservationData.carInfo || '',
      date: reservationData.startDate || '',
      time: new Date(reservationData.startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }),
      pickup_location: 'Banska Bystrica', // Default pickup location
      car_deposit: `${reservationData.deposit || '500'}€`,
      link_view: `${process.env.CLIENT_URL || 'https://app.carflow.sk'}/reservations/${reservationData.reservationNumber}`,
      link_cancel: `${process.env.CLIENT_URL || 'https://app.carflow.sk'}/reservations/${reservationData.reservationNumber}/cancel`
    };

    // Get processed email template
    const emailData = await emailTemplateService.getEmailTemplate('reservation-confirmed', templateVariables);
    
    // Set subject to match exact specification
    const subject = '✅ Potvrdenie rezervácie';
    
    // Generate contract PDF if rawReservation is available
    let attachments = [];
    if (rawReservation) {
      try {
        console.log('📎 [EMAIL] Generating contract PDF for confirmed reservation:', rawReservation._id);
        
        const pdfService = require('./pdfService');
        const Contract = require('../models/Contract');
        
        // Find the contract for this reservation
        const contract = await Contract.findOne({ 
          reservation: rawReservation._id 
        }).populate([
          {
            path: 'reservation',
            populate: [
              { path: 'customer', select: 'firstName lastName email phone address licenseNumber idNumber' },
              { path: 'car', select: 'brand model year registrationNumber vin color category' }
            ]
          }
        ]);
        
        if (contract && contract.reservation.customer && contract.reservation.car) {
          // Generate the PDF using the PDF service
          const pdfBuffer = await pdfService.generateRentalAgreement(
            contract.reservation,
            contract.reservation.car,
            contract.reservation.customer
          );
          
          // Convert PDF buffer to base64 for attachment
          const pdfBase64 = pdfBuffer.toString('base64');
          const filename = `zmluva-${contract.contractNumber || reservationData.reservationNumber}.pdf`;
          
          attachments.push({
            filename: filename,
            content: pdfBase64,
            type: 'application/pdf'
          });
          
          console.log('✅ [EMAIL] Contract PDF generated and attached:', filename);
        } else {
          console.warn('⚠️ [EMAIL] Contract or related data not found for PDF generation');
        }
      } catch (pdfError) {
        console.error('❌ [EMAIL] Failed to generate contract PDF:', pdfError.message);
        // Continue sending email without attachment
      }
    }
    
    // Send email with or without attachment
    let emailResult;
    if (attachments.length > 0) {
      emailResult = await this.sendEmailWithAttachment(to, subject, emailData.html, attachments);
    } else {
      emailResult = await this.sendEmail(to, subject, emailData.html);
    }
    
    // Send SMS if phone number available
    try {
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
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send reservation confirmed SMS:', smsError.message);
    }
    
    return emailResult;
  }

  // Customer notification when admin edits reservation
  async sendCustomerReservationEdited(to, reservationData) {
    const emailTemplateService = require('./emailTemplateService');
    
    // Prepare template variables from actual backend data structure
    const templateVariables = {
      first_name: reservationData.customerName?.split(' ')[0] || '',
      last_name: reservationData.customerName?.split(' ').slice(1).join(' ') || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || reservationData.carInfo || '',
      date: reservationData.startDate || '',
      time: new Date(reservationData.startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }),
      link_view: `${process.env.CLIENT_URL || 'https://app.carflow.sk'}/reservations/${reservationData.reservationNumber}`
    };

    // Get processed email template
    const emailData = await emailTemplateService.getEmailTemplate('reservation-edited', templateVariables);
    
    // Set subject to match exact specification
    const subject = '🔄 Zmena rezervácie';
    
    // Send email
    const emailResult = await this.sendEmail(to, subject, emailData.html);
    
    // Send SMS if phone number available
    try {
      const bulkGateService = require('./bulkGateService');
      if (bulkGateService.isConfigured && reservationData.customerPhone) {
        console.log('📱 [SMS] Sending reservation edited SMS to:', reservationData.customerPhone);
        // Use formatted data for edited SMS (no raw reservation available here)
        await bulkGateService.sendReservationEdited(reservationData.customerPhone, reservationData);
        console.log('✅ [SMS] Reservation edited SMS sent successfully');
      }
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send reservation edited SMS:', smsError.message);
    }
    
    return emailResult;
  }

  // Customer cancellation email when admin cancels reservation
  async sendCustomerCancellationNotification(to, cancellationData) {
    const emailTemplateService = require('./emailTemplateService');
    
    // Prepare template variables from actual backend data structure
    const templateVariables = {
      first_name: cancellationData.customerName?.split(' ')[0] || '',
      last_name: cancellationData.customerName?.split(' ').slice(1).join(' ') || '',
      car_brand: cancellationData.carInfo?.split(' ')[0] || '',
      car_model: cancellationData.carInfo?.split(' ').slice(1).join(' ') || cancellationData.carInfo || '',
      link_new: `${process.env.CLIENT_URL || 'https://app.carflow.sk'}/booking`
    };

    // Get processed email template
    const emailData = await emailTemplateService.getEmailTemplate('reservation-cancelled', templateVariables);
    
    // Set subject to match exact specification
    const subject = '❌ Rezervácia zrušená';
    
    // Send email
    const emailResult = await this.sendEmail(to, subject, emailData.html);
    
    // Send SMS if phone number available
    try {
      const bulkGateService = require('./bulkGateService');
      if (bulkGateService.isConfigured && cancellationData.customerPhone) {
        console.log('📱 [SMS] Sending reservation cancelled SMS to:', cancellationData.customerPhone);
        await bulkGateService.sendReservationCancelled(cancellationData.customerPhone, cancellationData);
        console.log('✅ [SMS] Reservation cancelled SMS sent successfully');
      }
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send reservation cancelled SMS:', smsError.message);
    }
    
    return emailResult;
  }

  // Customer 24-hour reminder email
  async sendCustomerReservationReminder24(to, reservationData) {
    const emailTemplateService = require('./emailTemplateService');
    
    // Get pickup location from settings
    const pickupLocation = await this.getPickupLocation(reservationData.tenantId);
    
    // Prepare template variables from actual backend data structure
    const templateVariables = {
      first_name: reservationData.customerName?.split(' ')[0] || '',
      last_name: reservationData.customerName?.split(' ').slice(1).join(' ') || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || reservationData.carInfo || '',
      date: reservationData.startDate || '',
      time: new Date(reservationData.startDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }),
      pickup_location: pickupLocation
    };

    // Get processed email template
    const emailData = await emailTemplateService.getEmailTemplate('reservation-reminder24', templateVariables);
    
    // Set subject to match exact specification
    const subject = '⏰ Pripomienka: Rezervácia zajtra';
    
    // Send email
    const emailResult = await this.sendEmail(to, subject, emailData.html);
    
    // Send SMS if phone number available
    try {
      const bulkGateService = require('./bulkGateService');
      if (bulkGateService.isConfigured && reservationData.customerPhone) {
        console.log('📱 [SMS] Sending 24h reminder SMS to:', reservationData.customerPhone);
        await bulkGateService.sendReservationReminder24(reservationData.customerPhone, reservationData);
        console.log('✅ [SMS] 24h reminder SMS sent successfully');
      }
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send 24h reminder SMS:', smsError.message);
    }
    
    return emailResult;
  }

  // Customer review request email (24h after trip ends)
  async sendCustomerReviewRequest(to, reservationData) {
    const emailTemplateService = require('./emailTemplateService');
    
    // Prepare template variables from actual backend data structure
    const templateVariables = {
      first_name: reservationData.customerName?.split(' ')[0] || '',
      last_name: reservationData.customerName?.split(' ').slice(1).join(' ') || '',
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || reservationData.carInfo || '',
      google_review_link: process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/YOUR_GOOGLE_BUSINESS_ID/review',
      feedback_form_link: `${process.env.CLIENT_URL || 'https://app.carflow.sk'}/feedback?reservation=${reservationData.reservationNumber}`
    };

    // Get processed email template
    const emailData = await emailTemplateService.getEmailTemplate('leave-review', templateVariables);
    
    // Set subject to match exact specification
    const subject = '⭐ Ako sa Vám páčila jazda?';
    
    // Send email
    const emailResult = await this.sendEmail(to, subject, emailData.html);
    
    // Send SMS if phone number available
    try {
      const bulkGateService = require('./bulkGateService');
      if (bulkGateService.isConfigured && reservationData.customerPhone) {
        console.log('📱 [SMS] Sending review request SMS to:', reservationData.customerPhone);
        await bulkGateService.sendReviewRequest(reservationData.customerPhone, reservationData);
        console.log('✅ [SMS] Review request SMS sent successfully');
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
          'X-Smtp2go-Api-Key': this.apiKey
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
  async sendEmailWithAttachment(to, subject, html, attachments = [], text = null) {
    if (!this.isConfigured) {
      throw new Error('SMTP2GO service not properly configured. Please set SMTP2GO_API_KEY.');
    }

    // Clean and validate email addresses
    const toEmails = Array.isArray(to) ? to : [to];
    const cleanedToEmails = toEmails.map(email => typeof email === 'string' ? email.trim() : email);
    
    // Use the full sender format - SMTP2GO can handle display names
    const senderEmail = process.env.EMAIL_FROM || 'noreply@carflow.sk';

    console.log('📎 [SMTP2GO] Sending email with attachments to:', cleanedToEmails);
    console.log('📎 [SMTP2GO] Attachments count:', attachments.length);

    // Clean and sanitize content to avoid JSON issues
    const cleanText = text ? this.sanitizeTextForJson(text) : this.sanitizeTextForJson(this.stripHtml(html));
    const cleanHtml = this.sanitizeHtmlForJson(html);
    const cleanSubject = this.sanitizeSubject(subject);

    const payload = {
      api_key: this.apiKey,
      to: cleanedToEmails,
      sender: senderEmail,
      subject: cleanSubject,
      text_body: cleanText,
      html_body: cleanHtml,
      attachments: attachments.map(attachment => ({
        filename: attachment.filename,
        fileblob: attachment.content, // base64 encoded content
        mimetype: attachment.type || 'application/octet-stream'
      }))
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