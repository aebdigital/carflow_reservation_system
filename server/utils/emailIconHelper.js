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
    this.lerentTemplatesPath = path.join(__dirname, '../templates_lerent/email');
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
   * Get icon file paths for CID attachments
   * @param {string} templatesPath - Path to templates (for tenant-specific icons)
   * @returns {Object} Object with file paths for icons
   */
  getIconFilePaths(templatesPath = null) {
    const templatePath = templatesPath || this.defaultTemplatesPath;

    // Determine logo filename based on template path
    let logoFilename = 'logo.png'; // default
    if (templatePath === this.nitracarTemplatesPath) {
      logoFilename = 'nitracarlogo_optimized.png';
    } else if (templatePath === this.lerentTemplatesPath) {
      logoFilename = 'logoRENT.png'; // Use PNG for better email client compatibility
    }

    return {
      facebook: path.join(templatePath, 'facebook_icon.png'),
      instagram: path.join(templatePath, 'instagram_icon.png'),
      logo: path.join(templatePath, logoFilename),
    };
  }

  /**
   * Get icon attachments for email with CID references
   * @param {string} senderEmail - Sender email to determine template folder
   * @returns {Array} Array of attachment objects with CID
   */
  getIconAttachments(senderEmail = null) {
    // Determine template path based on sender email
    const senderEmailLower = senderEmail ? senderEmail.toLowerCase() : '';

    // Check for LeRent
    const isLerentEmail = senderEmail && (
      senderEmail === process.env.LERENT_EMAIL_FROM ||
      senderEmailLower.includes('lerent@lerent.sk') ||
      senderEmailLower.includes('lerent')
    );

    // Check for Nitra-Car
    const isNitracarEmail = senderEmail && (
      senderEmail === process.env.NITRACAR_EMAIL_FROM ||
      senderEmailLower.includes('nitra-car@nitra-car.sk') ||
      senderEmailLower.includes('nitracar') ||
      senderEmailLower.includes('nitra-car')
    );

    const templatesPath = isLerentEmail ? this.lerentTemplatesPath :
                          isNitracarEmail ? this.nitracarTemplatesPath :
                          this.defaultTemplatesPath;

    const iconPaths = this.getIconFilePaths(templatesPath);
    const attachments = [];

    console.log('🔍 [ICON HELPER] Template detection:', {
      senderEmail,
      isLerentEmail,
      isNitracarEmail,
      templatesPath,
      logoPath: iconPaths.logo
    });

    // NitraCar: Skip logo attachment - templates use text "NITRA-CAR" header instead
    // LeRent: Uses hosted logo URL, no CID attachment needed
    if (isNitracarEmail) {
      console.log('ℹ️  [ICON HELPER] NitraCar uses text header, skipping logo CID attachment');
    } else if (isLerentEmail) {
      console.log('ℹ️  [ICON HELPER] LeRent uses hosted logo URL, skipping CID attachment');
    }

    // Add Facebook icon if exists
    if (fs.existsSync(iconPaths.facebook)) {
      const facebookBuffer = fs.readFileSync(iconPaths.facebook);
      attachments.push({
        filename: 'facebook_icon.png',
        content: facebookBuffer.toString('base64'),
        type: 'image/png',
        cid: 'facebook_icon'
      });
    }

    // Add Instagram icon if exists
    if (fs.existsSync(iconPaths.instagram)) {
      const instagramBuffer = fs.readFileSync(iconPaths.instagram);
      attachments.push({
        filename: 'instagram_icon.png',
        content: instagramBuffer.toString('base64'),
        type: 'image/png',
        cid: 'instagram_icon'
      });
    }

    return attachments;
  }

  /**
   * Get template variables with social media icons and logo included
   * @param {Object} variables - Existing template variables
   * @param {string} senderEmail - Sender email to determine template folder
   * @returns {Object} Variables with social icons and logo added as base64 data URIs
   */
  addSocialIconsToVariables(variables = {}, senderEmail = null) {
    console.log('🔍 [ICON HELPER] addSocialIconsToVariables called:', {
      senderEmail,
      hasVariables: !!variables
    });

    // Check if this is a Nitra-Car email
    // Make detection case-insensitive and handle email format variations
    const senderEmailLower = senderEmail ? senderEmail.toLowerCase() : '';
    const isNitracarEmail = senderEmail && (
      senderEmail === process.env.NITRACAR_EMAIL_FROM ||
      senderEmailLower.includes('nitra-car@nitra-car.sk') ||
      senderEmailLower.includes('nitracar') ||
      senderEmailLower.includes('nitra-car')
    );

    console.log('🔍 [ICON HELPER] Nitra-Car detection:', {
      isNitracarEmail,
      senderEmail,
      senderEmailLower,
      envVar: process.env.NITRACAR_EMAIL_FROM
    });

    const templatesPath = isNitracarEmail ? this.nitracarTemplatesPath : this.defaultTemplatesPath;
    const iconPaths = this.getIconFilePaths(templatesPath);

    // Add Nitra-Car logo - prefer hosted URL, fall back to base64
    if (isNitracarEmail) {
      // Check if a hosted logo URL is configured (more reliable for email clients)
      const hostedLogoUrl = process.env.NITRACAR_LOGO_URL;

      if (hostedLogoUrl) {
        variables.nitracar_logo_base64 = hostedLogoUrl;
        console.log('✅ [ICON HELPER] Using hosted Nitra-Car logo URL:', hostedLogoUrl);
      } else if (iconPaths.logo && fs.existsSync(iconPaths.logo)) {
        // Fall back to base64 embedding (less reliable for large images)
        const logoBuffer = fs.readFileSync(iconPaths.logo);
        const logoBase64 = logoBuffer.toString('base64');
        variables.nitracar_logo_base64 = `data:image/png;base64,${logoBase64}`;
        console.log('✅ [ICON HELPER] Added Nitra-Car logo as base64 data URI:', {
          bytes: logoBuffer.length,
          base64Length: logoBase64.length,
          dataUriLength: variables.nitracar_logo_base64.length,
          preview: variables.nitracar_logo_base64.substring(0, 50) + '...',
          warning: logoBuffer.length > 30000 ? '⚠️ Logo is large (>30KB), consider using NITRACAR_LOGO_URL instead' : null
        });
      } else {
        console.log('⚠️ [ICON HELPER] Logo NOT added:', {
          isNitracarEmail,
          logoExists: iconPaths.logo && fs.existsSync(iconPaths.logo),
          logoPath: iconPaths.logo
        });
      }
    }

    return variables;
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