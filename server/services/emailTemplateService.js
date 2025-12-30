const fs = require('fs').promises;
const path = require('path');
const emailIconHelper = require('../utils/emailIconHelper');

class EmailTemplateService {
  constructor() {
    this.defaultTemplatesPath = path.join(__dirname, '../templates/email');
    this.nitracarTemplatesPath = path.join(__dirname, '../templates_nitracar/email');
    this.lerentTemplatesPath = path.join(__dirname, '../templates_lerent/email');
    this.templateCache = new Map();
  }

  /**
   * Determine which template folder to use based on email sender
   * @param {string} senderEmail - The sender email address
   * @returns {string} Template path to use
   */
  getTemplatePath(senderEmail = null) {
    // Check if this is a LeRent email
    const isLerentEmail = senderEmail && (
      senderEmail === process.env.LERENT_EMAIL_FROM ||
      senderEmail.includes('lerent@lerent.sk') ||
      senderEmail.includes('lerent')
    );

    // Check if this is a Nitra-Car email
    const isNitracarEmail = senderEmail && (
      senderEmail === process.env.NITRACAR_EMAIL_FROM ||
      senderEmail.includes('nitra-car@nitra-car.sk') ||
      senderEmail.includes('nitracar') ||
      senderEmail.includes('nitra-car')
    );

    if (isLerentEmail) {
      console.log('📧 [TEMPLATE] Using LERENT templates for email from:', senderEmail);
      return this.lerentTemplatesPath;
    } else if (isNitracarEmail) {
      console.log('📧 [TEMPLATE] Using NITRACAR templates for email from:', senderEmail);
      return this.nitracarTemplatesPath;
    } else {
      console.log('📧 [TEMPLATE] Using default templates for email from:', senderEmail || 'default');
      return this.defaultTemplatesPath;
    }
  }

  /**
   * Load and cache email template
   * @param {string} templateName - Name of the template file (without .html extension)
   * @param {string} senderEmail - The sender email to determine template folder
   * @param {string} language - Language code ('sk' or 'en') for NitraCar templates
   * @returns {Promise<string>} Template HTML content
   */
  async loadTemplate(templateName, senderEmail = null, language = 'sk') {
    try {
      // Create cache key that includes the template source
      const isLerent = senderEmail && (
        senderEmail === process.env.LERENT_EMAIL_FROM ||
        senderEmail.includes('lerent@lerent.sk') ||
        senderEmail.includes('lerent')
      );
      const isNitracar = senderEmail && (
        senderEmail === process.env.NITRACAR_EMAIL_FROM ||
        senderEmail.includes('nitra-car@nitra-car.sk') ||
        senderEmail.includes('nitracar') ||
        senderEmail.includes('nitra-car')
      );

      let templateSource = 'default';
      if (isLerent) templateSource = 'lerent';
      else if (isNitracar) templateSource = 'nitracar';

      // For NitraCar, include language in cache key
      const langSuffix = isNitracar && language === 'en' ? '_en' : '';
      const cacheKey = `${templateName}${langSuffix}_${templateSource}`;

      // Check cache first
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey);
      }

      const templatesPath = this.getTemplatePath(senderEmail);

      // For NitraCar with English language, try to load the -en version first
      let templatePath;
      let templateContent;

      if (isNitracar && language === 'en') {
        const englishTemplatePath = path.join(templatesPath, `${templateName}-en.html`);
        try {
          templateContent = await fs.readFile(englishTemplatePath, 'utf8');
          templatePath = englishTemplatePath;
          console.log(`📧 [NITRACAR] Using English template: ${templateName}-en.html`);
        } catch (engError) {
          // Fallback to Slovak template if English not found
          templatePath = path.join(templatesPath, `${templateName}.html`);
          templateContent = await fs.readFile(templatePath, 'utf8');
          console.log(`📧 [NITRACAR] English template not found, using Slovak: ${templateName}.html`);
        }
      } else {
        templatePath = path.join(templatesPath, `${templateName}.html`);
        templateContent = await fs.readFile(templatePath, 'utf8');
      }

      // Cache the template for future use
      this.templateCache.set(cacheKey, templateContent);

      return templateContent;
    } catch (error) {
      // For LeRent, do NOT fallback - throw error to skip email sending
      const isLerent = senderEmail && (
        senderEmail === process.env.LERENT_EMAIL_FROM ||
        senderEmail.includes('lerent@lerent.sk') ||
        senderEmail.includes('lerent')
      );

      if (isLerent) {
        console.error(`❌ [LERENT] Template '${templateName}' not found - SKIPPING email (no fallback for LeRent)`);
        throw new Error(`LERENT_TEMPLATE_NOT_FOUND: ${templateName}`);
      }

      console.error(`Error loading email template '${templateName}':`, error);
      throw new Error(`Failed to load email template: ${templateName}`);
    }
  }

  /**
   * Process template with variables (simple variable replacement)
   * @param {string} template - HTML template content
   * @param {Object} variables - Variables to replace in template
   * @returns {string} Processed HTML with variables replaced
   */
  processTemplate(template, variables = {}, senderEmail = null) {
    let processedTemplate = template;

    // Add current year and social media icons by default
    const defaultVariables = {
      current_year: new Date().getFullYear(),
      ...variables
    };

    // Add social media icons as base64 data URIs
    const variablesWithIcons = emailIconHelper.addSocialIconsToVariables(defaultVariables, senderEmail);

    // Replace all template variables
    Object.entries(variablesWithIcons).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, value || '');
    });

    return processedTemplate;
  }

  /**
   * Get processed email template ready for sending
   * @param {string} templateName - Template name (without .html)
   * @param {Object} variables - Variables to replace
   * @param {string} senderEmail - Sender email to determine template folder
   * @param {string} language - Language code ('sk' or 'en') for NitraCar templates
   * @returns {Promise<Object>} Email data with subject, html, and headers
   */
  async getEmailTemplate(templateName, variables = {}, senderEmail = null, language = 'sk') {
    try {
      const template = await this.loadTemplate(templateName, senderEmail, language);
      const processedHtml = this.processTemplate(template, variables, senderEmail);

      // Extract subject from variables or use default based on template
      const subject = this.getSubjectForTemplate(templateName, variables, language);

      return {
        subject,
        html: processedHtml,
        headers: this.getEmailHeaders()
      };
    } catch (error) {
      console.error(`Error processing email template '${templateName}':`, error);
      throw error;
    }
  }

  /**
   * Get appropriate subject line for template
   * @param {string} templateName - Template name
   * @param {Object} variables - Template variables
   * @param {string} language - Language code ('sk' or 'en')
   * @returns {string} Email subject
   */
  getSubjectForTemplate(templateName, variables, language = 'sk') {
    // Slovak subjects
    const subjectsSk = {
      'welcome': `🎉 Vitajte v ${variables.company_name || 'našej službe'}!`,
      'reservation-confirmation': `✅ Rezervácia prijatá - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'reservation-confirmed': `✅ Rezervácia potvrdená - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'reservation-cancelled': `❌ Rezervácia zrušená - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'reservation-edited': `📝 Rezervácia upravená - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'reservation-reminder24': `⏰ Pripomienka: Rezervácia zajtra - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'reservation-reminder24after': `⏰ Pripomienka: Vrátenie vozidla zajtra - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'payment-notification': `💰 Upomienka platby - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'payment-receipt': `💳 Potvrdenie platby - Faktúra ${variables.invoice_number || 'XXX'}`,
      'reminder-notification': `🔔 ${variables.reminder_type || 'Pripomienka'} - ${variables.days_remaining || 'X'} dní zostáva!`,
      'newsletter': `📰 ${variables.newsletter_title || 'Newsletter'} - ${variables.company_name || 'Novinky'}`
    };

    // English subjects
    const subjectsEn = {
      'welcome': `🎉 Welcome to ${variables.company_name || 'our service'}!`,
      'reservation-confirmation': `✅ Reservation Received - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'reservation-confirmed': `✅ Reservation Confirmed - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'reservation-cancelled': `❌ Reservation Cancelled - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'reservation-edited': `📝 Reservation Updated - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'reservation-reminder24': `⏰ Reminder: Your Reservation is Tomorrow - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'reservation-reminder24after': `⏰ Reminder: Vehicle Return Tomorrow - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'payment-notification': `💰 Payment Reminder - ${variables.car_brand || ''} ${variables.car_model || ''}`,
      'payment-receipt': `💳 Payment Confirmation - Invoice ${variables.invoice_number || 'XXX'}`,
      'reminder-notification': `🔔 ${variables.reminder_type || 'Reminder'} - ${variables.days_remaining || 'X'} days remaining!`,
      'newsletter': `📰 ${variables.newsletter_title || 'Newsletter'} - ${variables.company_name || 'News'}`
    };

    const subjects = language === 'en' ? subjectsEn : subjectsSk;
    const defaultSubject = language === 'en' ? `📧 ${variables.company_name || 'Email'}` : `📧 ${variables.company_name || 'Email'}`;

    return variables.custom_subject || subjects[templateName] || defaultSubject;
  }

  /**
   * Get email headers with UTF-8 and emoji support
   * @returns {Object} Email headers
   */
  getEmailHeaders() {
    return {
      'Content-Type': 'text/html; charset=UTF-8',
      'Content-Transfer-Encoding': '8bit',
      'MIME-Version': '1.0',
      'X-Mailer': 'CarFlow Email System',
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal'
    };
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache() {
    this.templateCache.clear();
    console.log('Email template cache cleared');
  }

  /**
   * Get list of available templates
   * @returns {Promise<string[]>} Array of template names
   */
  async getAvailableTemplates() {
    try {
      const files = await fs.readdir(this.templatesPath);
      return files
        .filter(file => file.endsWith('.html'))
        .map(file => file.replace('.html', ''));
    } catch (error) {
      console.error('Error reading templates directory:', error);
      return [];
    }
  }

  /**
   * Validate template variables
   * @param {string} templateName - Template name
   * @param {Object} variables - Variables to validate
   * @param {string} senderEmail - Sender email to determine template folder
   * @returns {Object} Validation result with missing variables
   */
  async validateTemplateVariables(templateName, variables = {}, senderEmail = null) {
    try {
      const template = await this.loadTemplate(templateName, senderEmail);
      const variableRegex = /{{([^}]+)}}/g;
      const requiredVariables = new Set();
      let match;

      while ((match = variableRegex.exec(template)) !== null) {
        requiredVariables.add(match[1]);
      }

      const providedVariables = new Set(Object.keys(variables));
      const missingVariables = [...requiredVariables].filter(
        variable => !providedVariables.has(variable) && variable !== 'current_year'
      );

      return {
        valid: missingVariables.length === 0,
        requiredVariables: [...requiredVariables],
        providedVariables: [...providedVariables],
        missingVariables
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = new EmailTemplateService();