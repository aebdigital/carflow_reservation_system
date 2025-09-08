const fs = require('fs').promises;
const path = require('path');

class EmailTemplateService {
  constructor() {
    this.defaultTemplatesPath = path.join(__dirname, '../templates/email');
    this.nitracarTemplatesPath = path.join(__dirname, '../templates_nitracar/email');
    this.templateCache = new Map();
  }

  /**
   * Determine which template folder to use based on email sender
   * @param {string} senderEmail - The sender email address
   * @returns {string} Template path to use
   */
  getTemplatePath(senderEmail = null) {
    // If sender email is NITRACAR email, use NITRACAR templates
    const isNitracarEmail = senderEmail && senderEmail === process.env.NITRACAR_EMAIL_FROM;
    
    if (isNitracarEmail) {
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
   * @returns {Promise<string>} Template HTML content
   */
  async loadTemplate(templateName, senderEmail = null) {
    try {
      // Create cache key that includes the template source
      const isNitracar = senderEmail === process.env.NITRACAR_EMAIL_FROM;
      const cacheKey = `${templateName}_${isNitracar ? 'nitracar' : 'default'}`;
      
      // Check cache first
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey);
      }

      const templatesPath = this.getTemplatePath(senderEmail);
      const templatePath = path.join(templatesPath, `${templateName}.html`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Cache the template for future use
      this.templateCache.set(cacheKey, templateContent);
      
      return templateContent;
    } catch (error) {
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
  processTemplate(template, variables = {}) {
    let processedTemplate = template;
    
    // Add current year by default
    const defaultVariables = {
      current_year: new Date().getFullYear(),
      ...variables
    };

    // Replace all template variables
    Object.entries(defaultVariables).forEach(([key, value]) => {
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
   * @returns {Promise<Object>} Email data with subject, html, and headers
   */
  async getEmailTemplate(templateName, variables = {}, senderEmail = null) {
    try {
      const template = await this.loadTemplate(templateName, senderEmail);
      const processedHtml = this.processTemplate(template, variables);
      
      // Extract subject from variables or use default based on template
      const subject = this.getSubjectForTemplate(templateName, variables);
      
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
   * @returns {string} Email subject
   */
  getSubjectForTemplate(templateName, variables) {
    const subjects = {
      'welcome': `🎉 Vitajte v ${variables.company_name || 'našej službe'}!`,
      'reservation-confirmation': `✅ Potvrdenie rezervácie #${variables.reservation_id || 'XXX'}`,
      'payment-receipt': `💳 Potvrdenie platby - Faktúra ${variables.invoice_number || 'XXX'}`,
      'reminder-notification': `🔔 ${variables.reminder_type || 'Pripomienka'} - ${variables.days_remaining || 'X'} dní zostáva!`,
      'newsletter': `📰 ${variables.newsletter_title || 'Newsletter'} - ${variables.company_name || 'Novinky'}`
    };

    return variables.custom_subject || subjects[templateName] || `📧 ${variables.company_name || 'Email'}`;
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