const axios = require('axios');

class KrosApiService {
  constructor() {
    this.baseURL = 'https://api-economy.kros.sk/api';
    this.isConfigured = false;
    this.init();
  }

  init() {
    console.log('🔧 Checking Kros API configuration...');
    
    this.apiToken = process.env.KROS_API_TOKEN;
    this.companyId = process.env.KROS_COMPANY_ID;
    
    if (this.apiToken && this.companyId) {
      this.isConfigured = true;
      console.log('✅ Kros API configured successfully');
    } else {
      console.warn('⚠️ Kros API not configured. Missing KROS_API_TOKEN or KROS_COMPANY_ID');
    }
  }

  /**
   * Create axios instance with proper headers
   */
  getAxiosInstance() {
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Create a single invoice in Kros system
   * @param {Object} reservationData - Reservation data to create invoice from
   * @returns {Object} Invoice creation response
   */
  async createInvoice(reservationData) {
    if (!this.isConfigured) {
      throw new Error('Kros API not configured. Please set KROS_API_TOKEN and KROS_COMPANY_ID');
    }

    try {
      console.log('📄 Creating invoice in Kros API for reservation:', reservationData.reservationNumber);

      // Format reservation data for Kros API
      const invoiceData = this.formatReservationForInvoice(reservationData);
      
      const axiosInstance = this.getAxiosInstance();
      const response = await axiosInstance.post('/invoices', invoiceData);

      console.log('✅ Invoice creation request sent to Kros API');
      console.log('📋 Response status:', response.status);
      console.log('📋 Response data:', response.data);

      return {
        success: true,
        data: response.data,
        status: response.status,
        invoiceId: response.data?.id || null
      };

    } catch (error) {
      console.error('❌ Error creating invoice in Kros API:', error.message);
      console.error('📋 Error details:', error.response?.data || error);
      
      throw new Error(`Failed to create invoice: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get invoice PDF from Kros API
   * @param {string} invoiceId - Invoice ID in Kros system
   * @param {number} reportId - Report type (17 - B&W, 19 - color, 101 - editable)
   * @returns {Buffer} PDF file buffer
   */
  async getInvoicePDF(invoiceId, reportId = 19) {
    if (!this.isConfigured) {
      throw new Error('Kros API not configured. Please set KROS_API_TOKEN and KROS_COMPANY_ID');
    }

    try {
      console.log(`📄 Fetching PDF for invoice ${invoiceId} from Kros API`);

      const axiosInstance = this.getAxiosInstance();
      const response = await axiosInstance.get(`/invoices/${invoiceId}/reports/${reportId}`, {
        responseType: 'arraybuffer'
      });

      console.log('✅ Invoice PDF retrieved successfully');
      console.log('📋 PDF size:', response.data.length, 'bytes');

      return {
        success: true,
        data: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'application/pdf',
        filename: `invoice-${invoiceId}.pdf`
      };

    } catch (error) {
      console.error('❌ Error fetching invoice PDF from Kros API:', error.message);
      console.error('📋 Error details:', error.response?.data || error);
      
      throw new Error(`Failed to get invoice PDF: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get invoice data from Kros API
   * @param {string} invoiceId - Invoice ID in Kros system
   * @returns {Object} Invoice data
   */
  async getInvoice(invoiceId) {
    if (!this.isConfigured) {
      throw new Error('Kros API not configured. Please set KROS_API_TOKEN and KROS_COMPANY_ID');
    }

    try {
      console.log(`📄 Fetching invoice data for ${invoiceId} from Kros API`);

      const axiosInstance = this.getAxiosInstance();
      const response = await axiosInstance.get(`/invoices/${invoiceId}`);

      console.log('✅ Invoice data retrieved successfully');

      return {
        success: true,
        data: response.data,
        status: response.status
      };

    } catch (error) {
      console.error('❌ Error fetching invoice from Kros API:', error.message);
      console.error('📋 Error details:', error.response?.data || error);
      
      throw new Error(`Failed to get invoice: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Format reservation data for Kros invoice API
   * @param {Object} reservation - Reservation object
   * @returns {Object} Formatted invoice data for Kros API
   */
  formatReservationForInvoice(reservation) {
    // Calculate dates
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 14 days from now

    // Format customer information
    const customer = {
      name: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
      email: reservation.customer.email,
      phone: reservation.customer.phone || '',
      address: reservation.customer.address || '',
      city: reservation.customer.city || '',
      postalCode: reservation.customer.postalCode || '',
      country: reservation.customer.country || 'SK'
    };

    // Format invoice items
    const items = [
      {
        description: `Prenájom vozidla ${reservation.car.brand} ${reservation.car.model} (${reservation.car.year})`,
        quantity: reservation.pricing.totalDays,
        unit: 'deň',
        unitPrice: reservation.pricing.pricePerDay,
        totalPrice: reservation.pricing.subtotal,
        vatRate: 20.0 // Standard VAT rate in Slovakia
      }
    ];

    // Add additional services as separate line items
    if (reservation.additionalServices && reservation.additionalServices.length > 0) {
      reservation.additionalServices.forEach(service => {
        items.push({
          description: service.name,
          quantity: service.quantity || 1,
          unit: 'ks',
          unitPrice: service.price,
          totalPrice: service.price * (service.quantity || 1),
          vatRate: 20.0
        });
      });
    }

    // Format the invoice for Kros API
    const invoiceData = {
      documentType: 'Invoice',
      issueDate: issueDate,
      dueDate: dueDate,
      paymentMethod: 'BankTransfer',
      currency: 'EUR',
      
      // Customer information
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: {
          street: customer.address,
          city: customer.city,
          postalCode: customer.postalCode,
          country: customer.country
        }
      },

      // Invoice items
      items: items,

      // Additional information
      notes: `Rezervácia č. ${reservation.reservationNumber}\nObdobie: ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} - ${new Date(reservation.endDate).toLocaleDateString('sk-SK')}`,
      
      // Reference numbers
      externalId: reservation._id.toString(),
      orderNumber: reservation.reservationNumber,

      // Payment information
      bankAccount: {
        iban: process.env.COMPANY_IBAN || '',
        swift: process.env.COMPANY_SWIFT || '',
        bankName: process.env.COMPANY_BANK_NAME || ''
      }
    };

    return invoiceData;
  }

  /**
   * Check if Kros API is properly configured
   * @returns {boolean} Configuration status
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Test connection to Kros API
   * @returns {Object} Connection test result
   */
  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Kros API not configured'
      };
    }

    try {
      const axiosInstance = this.getAxiosInstance();
      // Try to make a simple request to test the connection
      const response = await axiosInstance.get('/invoices?limit=1');
      
      return {
        success: true,
        message: 'Connection to Kros API successful',
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new KrosApiService();