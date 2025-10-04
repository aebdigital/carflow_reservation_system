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

  async sendEmail(to, subject, html, text = null, user = null) {
    if (!this.isConfigured) {
      throw new Error('Email service not properly configured. Please set SMTP2GO_API_KEY in your environment variables.');
    }

    // Use SMTP2GO service with user context for tenant-specific config
    return await smtp2goService.sendEmail(to, subject, html, text, user);
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
  async sendAdminReservationNotification(adminEmail, reservationData, user = null) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendAdminReservationNotification(adminEmail, reservationData, user);
  }

  // Customer reservation confirmation
  async sendCustomerReservationConfirmation(customerEmail, reservationData, user = null, rawReservation = null) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReservationConfirmation(customerEmail, reservationData, user, rawReservation);
  }

  // Customer reservation confirmed (after admin approval)
  async sendCustomerReservationConfirmed(customerEmail, reservationData, rawReservation = null, user = null) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReservationConfirmed(customerEmail, reservationData, rawReservation, user);
  }

  // Customer reservation edited notification (after admin edits)
  async sendCustomerReservationEdited(customerEmail, reservationData, user = null, rawReservation = null) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReservationEdited(customerEmail, reservationData, user, rawReservation);
  }

  // Customer 24-hour reminder notification (before pickup)
  async sendCustomerReservationReminder24(customerEmail, reservationData, user = null, rawReservation = null) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReservationReminder24(customerEmail, reservationData, user, rawReservation);
  }

  // Customer 24-hour return reminder notification (before return date)
  async sendCustomerReturnReminder24(customerEmail, reservationData, user = null, rawReservation = null) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReturnReminder24(customerEmail, reservationData, user, rawReservation);
  }

  // Customer review request (24h after trip ends)
  async sendCustomerReviewRequest(customerEmail, reservationData, user = null, rawReservation = null) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerReviewRequest(customerEmail, reservationData, user, rawReservation);
  }

  // Customer cancellation notification
  async sendCustomerCancellationNotification(customerEmail, cancellationData, user = null, rawReservation = null) {
    // Use SMTP2GO service which has the correct implementation
    return await smtp2goService.sendCustomerCancellationNotification(customerEmail, cancellationData, user, rawReservation);
  }

  // Send templated email by loading template from templates/email/ folder
  async sendTemplatedEmail(to, subject, templateName, data) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Load template from templates/email/ folder
      const templatePath = path.join(__dirname, '..', 'templates', 'email', `${templateName}.html`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template not found: ${templateName}.html`);
      }
      
      let html = fs.readFileSync(templatePath, 'utf8');
      
      // Handle conditional blocks (simple if/else logic)
      // Handle {{#if variable}} ... {{/if}} blocks
      html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
        const value = data[varName];
        return (value && value !== '' && value !== null && value !== undefined) ? content : '';
      });
      
      // Handle {{#unless variable}} ... {{/unless}} blocks  
      html = html.replace(/\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, varName, content) => {
        const value = data[varName];
        return (!value || value === '' || value === null || value === undefined) ? content : '';
      });
      
      // Replace template variables with data
      // Support both Handlebars-style {{variable}} and simple template replacement
      Object.keys(data).forEach(key => {
        const value = data[key] || '';
        // Replace {{key}} and {{{key}}} patterns
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        html = html.replace(new RegExp(`{{{${key}}}}`, 'g'), value);
      });
      
      // Send the email
      return await this.sendEmail(to, subject, html);
      
    } catch (error) {
      console.error(`Error sending templated email (${templateName}):`, error);
      throw new Error(`Failed to send templated email: ${error.message}`);
    }
  }

  /**
   * Send payment received confirmation email with invoice PDF attachment
   * @param {string} to - Recipient email
   * @param {Object} emailData - Template data
   * @param {Object} pdfAttachment - PDF attachment object
   * @param {Object} user - User object for tenant-specific email config
   */
  async sendPaymentReceivedWithInvoice(to, emailData, pdfAttachment, user = null) {
    try {
      console.log('📧 [EMAIL] Sending payment received email with invoice PDF to:', to);
      
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }

      // Create payment received email HTML
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Platba Potvrdená</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Vaša rezervácia je úspešne zaplatená</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px; background-color: #f8f9fa;">
            <p style="font-size: 16px; color: #333;">Vážený/-á <strong>${emailData.customerName}</strong>,</p>
            
            <p style="color: #666; line-height: 1.6;">
              Vaša platba bola úspešne spracovaná a rezervácia je potvrdená. V prílohe nájdete oficiálnu faktúru.
            </p>

            <!-- Reservation Details -->
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="color: #1976d2; margin: 0 0 15px 0;">Detaily Rezervácie</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Číslo rezervácie:</td>
                  <td style="padding: 8px 0; color: #666;">${emailData.reservationNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Vozidlo:</td>
                  <td style="padding: 8px 0; color: #666;">${emailData.carInfo}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Obdobie prenájmu:</td>
                  <td style="padding: 8px 0; color: #666;">${emailData.startDate} - ${emailData.endDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Celková suma:</td>
                  <td style="padding: 8px 0; color: #4caf50; font-weight: bold; font-size: 18px;">${emailData.totalAmount}€</td>
                </tr>
              </table>
            </div>

            <!-- Payment Status -->
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 18px;">
                ✅ PLATBA ÚSPEŠNE SPRACOVANÁ
              </p>
            </div>

            <!-- Next Steps -->
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin: 0 0 15px 0;">Ďalšie kroky</h3>
              <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
                <li>V prílohe nájdete oficiálnu faktúru</li>
                <li>Rezervácia je potvrdená a vozidlo je pre Vás pripravené</li>
                <li>Pred prevzatím vozidla si pripravte vodičský preukaz a platobný doklad</li>
                <li>V prípade otázok nás kontaktujte na uvedených kontaktoch</li>
              </ul>
            </div>

            <p style="color: #666; line-height: 1.6;">
              Ďakujeme za Vašu dôveru a tešíme sa na Vás!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">${emailData.businessName}</p>
            <p style="margin: 0; font-size: 14px; color: #ccc;">
              📧 ${emailData.contactEmail} | 📞 ${emailData.contactPhone}
            </p>
          </div>
        </div>
      `;

      // Prepare attachment for SMTP2GO
      const attachments = [{
        filename: pdfAttachment.filename,
        content: pdfAttachment.content.toString('base64'),
        type: pdfAttachment.contentType
      }];

      // Send email with attachment using SMTP2GO
      const result = await smtp2goService.sendEmailWithAttachment(
        to,
        'Platba potvrdená - Faktúra za prenájom vozidla',
        html,
        attachments,
        null,
        user
      );

      console.log('✅ [EMAIL] Payment received email with invoice sent successfully');
      return result;

    } catch (error) {
      console.error('❌ [EMAIL] Error sending payment received email:', error.message);
      throw error;
    }
  }

  /**
   * Send payment received confirmation email without invoice PDF (for async processing)
   * @param {string} to - Recipient email
   * @param {Object} emailData - Template data
   * @param {Object} user - User object for tenant-specific email config
   */
  async sendPaymentReceivedWithoutInvoice(to, emailData, user = null) {
    try {
      console.log('📧 [EMAIL] Sending payment received email without invoice PDF to:', to);
      
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }

      // Create payment received email HTML (without PDF attachment)
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Platba Potvrdená</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Vaša rezervácia je úspešne zaplatená</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px; background-color: #f8f9fa;">
            <p style="font-size: 16px; color: #333;">Vážený/-á <strong>${emailData.customerName}</strong>,</p>
            
            <p style="color: #666; line-height: 1.6;">
              Vaša platba bola úspešne spracovaná a rezervácia je potvrdená. Oficiálnu faktúru Vám pošleme v samostatnom emaili.
            </p>

            <!-- Reservation Details -->
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="color: #1976d2; margin: 0 0 15px 0;">Detaily Rezervácie</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Číslo rezervácie:</td>
                  <td style="padding: 8px 0; color: #666;">${emailData.reservationNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Vozidlo:</td>
                  <td style="padding: 8px 0; color: #666;">${emailData.carInfo}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Obdobie prenájmu:</td>
                  <td style="padding: 8px 0; color: #666;">${emailData.startDate} - ${emailData.endDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Celková suma:</td>
                  <td style="padding: 8px 0; color: #4caf50; font-weight: bold; font-size: 18px;">${emailData.totalAmount}€</td>
                </tr>
              </table>
            </div>

            <!-- Payment Status -->
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 18px;">
                ✅ PLATBA ÚSPEŠNE SPRACOVANÁ
              </p>
            </div>

            <!-- Invoice Processing Notice -->
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
              <h4 style="color: #ef6c00; margin: 0 0 10px 0;">📄 Faktúra</h4>
              <p style="color: #666; margin: 0; line-height: 1.5;">
                Vaša faktúra sa práve spracováva. Pošleme Vám ju v samostatnom emaili hneď ako bude pripravená.
              </p>
            </div>

            <!-- Next Steps -->
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin: 0 0 15px 0;">Ďalšie kroky</h3>
              <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
                <li>Rezervácia je potvrdená a vozidlo je pre Vás pripravené</li>
                <li>Faktúru Vám pošleme v samostatnom emaili</li>
                <li>Pred prevzatím vozidla si pripravte vodičský preukaz a platobný doklad</li>
                <li>V prípade otázok nás kontaktujte na uvedených kontaktoch</li>
              </ul>
            </div>

            <p style="color: #666; line-height: 1.6;">
              Ďakujeme za Vašu dôveru a tešíme sa na Vás!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">${emailData.businessName}</p>
            <p style="margin: 0; font-size: 14px; color: #ccc;">
              📧 ${emailData.contactEmail} | 📞 ${emailData.contactPhone}
            </p>
          </div>
        </div>
      `;

      // Send email without attachment using SMTP2GO
      const result = await smtp2goService.sendEmail(
        to,
        'Platba potvrdená - Rezervácia úspešne zaplatená',
        html,
        null,
        user
      );

      console.log('✅ [EMAIL] Payment received email (without PDF) sent successfully');
      return result;

    } catch (error) {
      console.error('❌ [EMAIL] Error sending payment received email without PDF:', error.message);
      throw error;
    }
  }
}

module.exports = new EmailService();