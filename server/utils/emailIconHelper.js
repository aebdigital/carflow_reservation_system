const fs = require('fs');
const path = require('path');

/**
 * Email Icon Helper
 * Converts social media icons to base64 data URIs for email templates
 */
class EmailIconHelper {
  constructor() {
    this.iconsCache = new Map();
    this.defaultTemplatesPath = path.join(__dirname, '../templates/email');
    this.nitracarTemplatesPath = path.join(__dirname, '../templates_nitracar/email');
  }

  /**
   * Get base64 data URI for an icon
   * @param {string} iconName - Name of the icon file (e.g., 'facebook_icon.png')
   * @param {string} templatesPath - Path to the templates directory
   * @returns {string} Base64 data URI
   */
  getIconBase64(iconName, templatesPath = null) {
    const templatePath = templatesPath || this.defaultTemplatesPath;
    const cacheKey = `${templatePath}_${iconName}`;

    // Check cache first
    if (this.iconsCache.has(cacheKey)) {
      return this.iconsCache.get(cacheKey);
    }

    try {
      const iconPath = path.join(templatePath, iconName);

      // Check if file exists
      if (!fs.existsSync(iconPath)) {
        console.warn(`⚠️ Icon file not found: ${iconPath}`);
        return this.getFallbackIcon(iconName);
      }

      // Read and convert to base64
      const iconBuffer = fs.readFileSync(iconPath);
      const base64 = iconBuffer.toString('base64');
      const mimeType = this.getMimeType(iconName);
      const dataUri = `data:${mimeType};base64,${base64}`;

      // Cache the result
      this.iconsCache.set(cacheKey, dataUri);

      return dataUri;
    } catch (error) {
      console.error(`❌ Error loading icon ${iconName}:`, error.message);
      return this.getFallbackIcon(iconName);
    }
  }

  /**
   * Get MIME type for icon file
   * @param {string} filename - Icon filename
   * @returns {string} MIME type
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'image/png';
  }

  /**
   * Get fallback icon (small transparent PNG or emoji)
   * @param {string} iconName - Original icon name
   * @returns {string} Fallback data URI or emoji
   */
  getFallbackIcon(iconName) {
    // Simple fallback emojis for social media
    if (iconName.includes('facebook')) {
      return '📘'; // Facebook emoji fallback
    }
    if (iconName.includes('instagram')) {
      return '📷'; // Instagram emoji fallback
    }

    // 1x1 transparent PNG as ultimate fallback
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  }

  /**
   * Get social media icons for email templates
   * @param {string} templatesPath - Path to templates (for tenant-specific icons)
   * @returns {Object} Object with small data URIs for social icons
   */
  getSocialIcons(templatesPath = null) {
    // Use small data URIs that work reliably in all email clients
    return {
      facebook: this.getIconBase64('facebook_icon_small.png', templatesPath),
      instagram: this.getIconBase64('instagram_icon_small.png', templatesPath),
    };
  }

  /**
   * Get template variables with social media icons included
   * @param {Object} variables - Existing template variables
   * @param {string} senderEmail - Sender email to determine template folder
   * @returns {Object} Variables with social icons added
   */
  addSocialIconsToVariables(variables = {}, senderEmail = null) {
    // Determine template path based on sender email (same logic as EmailTemplateService)
    const isNitracarEmail = senderEmail && senderEmail === process.env.NITRACAR_EMAIL_FROM;
    const templatesPath = isNitracarEmail ? this.nitracarTemplatesPath : this.defaultTemplatesPath;

    const socialIcons = this.getSocialIcons(templatesPath);

    return {
      ...variables,
      facebook_icon: socialIcons.facebook,
      instagram_icon: socialIcons.instagram,
    };
  }

  /**
   * Clear icons cache (useful for development)
   */
  clearCache() {
    this.iconsCache.clear();
    console.log('Email icons cache cleared');
  }
}

module.exports = new EmailIconHelper();