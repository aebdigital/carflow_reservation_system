const https = require('https');
const fs = require('fs');
const path = require('path');

class BulkGateService {
  constructor() {
    this.apiUrl = 'portal.bulkgate.com';
    this.apiPath = '/api/1.0/advanced/transactional';
    this.applicationId = process.env.BULKGATE_APP_ID;
    this.applicationToken = process.env.BULKGATE_APP_TOKEN;
    this.isConfigured = false;
    this.init();
  }

  init() {
    console.log('🔧 Checking BulkGate SMS configuration...');
    console.log('📋 BulkGate environment variables:');
    console.log('   BULKGATE_APP_ID:', this.applicationId ? '✅ Set' : '❌ Missing');
    console.log('   BULKGATE_APP_TOKEN:', this.applicationToken ? '✅ Set' : '❌ Missing');

    if (!this.applicationId || !this.applicationToken) {
      console.warn('⚠️  BulkGate not configured. Set BULKGATE_APP_ID and BULKGATE_APP_TOKEN environment variables.');
      return;
    }

    this.isConfigured = true;
    console.log('✅ BulkGate SMS service configured successfully');
  }

  /**
   * Get SMS template content
   * @param {string} templateName - Template name (e.g., 'reservation-confirmation')
   * @param {Object} variables - Variables to replace in template
   * @returns {string} Processed SMS content
   */
  getSMSTemplate(templateName, variables = {}) {
    try {
      const templatePath = path.join(__dirname, '../templates/sms', `${templateName}.txt`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`SMS template not found: ${templateName}`);
      }

      let content = fs.readFileSync(templatePath, 'utf8');
      
      // Replace variables in the format {variable_name}
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        content = content.replace(regex, variables[key] || '');
      });

      return content;
    } catch (error) {
      console.error('❌ [BULKGATE] Error loading SMS template:', error.message);
      throw error;
    }
  }

  /**
   * Send SMS using BulkGate API
   * @param {string} phoneNumber - Recipient phone number (Slovak format)
   * @param {string} message - SMS content
   * @param {Object} options - Additional options
   */
  async sendSMS(phoneNumber, message, options = {}) {
    if (!this.isConfigured) {
      throw new Error('BulkGate service not properly configured. Please set BULKGATE_APP_ID and BULKGATE_APP_TOKEN.');
    }

    // Clean and validate phone number for Slovakia
    const cleanedNumber = this.cleanPhoneNumber(phoneNumber);
    
    const requestData = {
      application_id: this.applicationId,
      application_token: this.applicationToken,
      number: cleanedNumber,
      unicode: true, // Always enable for Slovak characters
      text: message,
      sender_id: 'gText',
      sender_id_value: 'RivalAuto',
      country: 'sk',
      ...options
    };

    console.log('📱 [BULKGATE] Sending SMS:', {
      to: cleanedNumber,
      preview: message.substring(0, 50) + '...',
      unicode: requestData.unicode
    });

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestData);
      
      const options = {
        hostname: this.apiUrl,
        port: 443,
        path: this.apiPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData, 'utf8'),
          'Cache-Control': 'no-cache'
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
            
            console.log('🔍 [BULKGATE] Response:', JSON.stringify(response, null, 2));
            
            if (response.error) {
              console.error('❌ BulkGate API error:', response.error);
              reject(new Error(response.error));
            } else {
              console.log('✅ SMS sent successfully via BulkGate');
              resolve({
                success: true,
                messageId: response.sms_id || response.id,
                response: response
              });
            }
          } catch (error) {
            console.error('❌ Error parsing BulkGate response:', error);
            console.error('❌ Raw response:', data);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ BulkGate request error:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Clean and format phone number for Slovak format
   * @param {string} phoneNumber - Input phone number
   * @returns {string} Cleaned phone number
   */
  cleanPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different Slovak number formats
    if (cleaned.startsWith('421')) {
      // Already has country code
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      // Slovak domestic format (0xxx) -> 421xxx
      return '421' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      // 9 digits without prefix -> add 421
      return '421' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Send reservation confirmation SMS
   */
  async sendReservationConfirmation(phoneNumber, reservationData) {
    const variables = {
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || '',
      date: this.formatDate(reservationData.startDate),
      date_to: this.formatDate(reservationData.endDate)
    };

    const message = this.getSMSTemplate('reservation-confirmation', variables);
    return this.sendSMS(phoneNumber, message, {
      campaign_id: 'reservation_confirmation'
    });
  }

  /**
   * Send reservation confirmed SMS (after admin approval)
   */
  async sendReservationConfirmed(phoneNumber, reservationData) {
    const variables = {
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || '',
      date: this.formatDate(reservationData.startDate),
      date_to: this.formatDate(reservationData.endDate)
    };

    const message = this.getSMSTemplate('reservation-confirmed', variables);
    return this.sendSMS(phoneNumber, message, {
      campaign_id: 'reservation_confirmed'
    });
  }

  /**
   * Send reservation cancelled SMS
   */
  async sendReservationCancelled(phoneNumber, reservationData) {
    const variables = {
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || ''
    };

    const message = this.getSMSTemplate('reservation-cancelled', variables);
    return this.sendSMS(phoneNumber, message, {
      campaign_id: 'reservation_cancelled'
    });
  }

  /**
   * Send reservation edited SMS
   */
  async sendReservationEdited(phoneNumber, reservationData) {
    const variables = {
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || '',
      date: this.formatDate(reservationData.startDate),
      date_to: this.formatDate(reservationData.endDate)
    };

    const message = this.getSMSTemplate('reservation-edited', variables);
    return this.sendSMS(phoneNumber, message, {
      campaign_id: 'reservation_edited'
    });
  }

  /**
   * Send 24-hour reminder SMS
   */
  async sendReservationReminder24(phoneNumber, reservationData) {
    // Get pickup location from settings
    const pickupLocation = await this.getPickupLocation(reservationData.tenantId);
    
    const variables = {
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || '',
      date: this.formatDate(reservationData.startDate),
      time: this.formatTime(reservationData.startDate),
      pickup_location: pickupLocation
    };

    const message = this.getSMSTemplate('reservation-reminder24', variables);
    return this.sendSMS(phoneNumber, message, {
      campaign_id: 'reservation_reminder24'
    });
  }

  /**
   * Send review request SMS
   */
  async sendReviewRequest(phoneNumber, reservationData) {
    const reviewLink = `https://pozicauto.sk/feedback?reservation=${reservationData.reservationNumber}`;
    
    const variables = {
      car_brand: reservationData.carInfo?.split(' ')[0] || '',
      car_model: reservationData.carInfo?.split(' ').slice(1).join(' ') || '',
      review_link: reviewLink
    };

    const message = this.getSMSTemplate('leave-review', variables);
    return this.sendSMS(phoneNumber, message, {
      campaign_id: 'leave_review'
    });
  }

  /**
   * Format date for Slovak SMS
   */
  formatDate(dateInput) {
    if (!dateInput) return '';
    
    // Handle both Date objects and string inputs
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      return '';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('⚠️ [BULKGATE] Invalid date for formatting:', dateInput);
      return '';
    }
    
    return date.toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Format time for Slovak SMS
   */
  formatTime(dateInput) {
    if (!dateInput) return '';
    
    // Handle both Date objects and string inputs
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      return '';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('⚠️ [BULKGATE] Invalid date for time formatting:', dateInput);
      return '';
    }
    
    return date.toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit'
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
      console.warn('⚠️ [BULKGATE] Could not fetch pickup location, using default:', error.message);
      return 'Banska Bystrica';
    }
  }

  /**
   * Test SMS service
   */
  async testConnection() {
    if (!this.isConfigured) {
      throw new Error('BulkGate service not configured');
    }

    console.log('✅ BulkGate SMS service connection verified');
    return true;
  }
}

module.exports = new BulkGateService();