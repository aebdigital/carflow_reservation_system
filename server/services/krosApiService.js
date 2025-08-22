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
    
    if (this.apiToken) {
      this.isConfigured = true;
      console.log('✅ Kros API configured successfully');
    } else {
      console.warn('⚠️ Kros API not configured. Missing KROS_API_TOKEN');
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
      throw new Error('Kros API not configured. Please set KROS_API_TOKEN');
    }

    // Format reservation data for Kros API (declare outside try-catch for error logging)
    let invoiceData;
    
    try {
      console.log('📄 Creating invoice in Kros API for reservation:', reservationData.reservationNumber);

      invoiceData = this.formatReservationForInvoice(reservationData);
      console.log('📋 Generated KROS payload:', JSON.stringify(invoiceData, null, 2));
      
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
      console.error('📋 HTTP Status:', error.response?.status);
      console.error('📋 Error details:', error.response?.data || error);
      
      if (invoiceData) {
        console.error('📋 Sent payload:', JSON.stringify(invoiceData, null, 2));
      }
      
      // Provide more detailed error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.response?.statusText || 
                          error.message;
      
      throw new Error(`Failed to create invoice: ${errorMessage}`);
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
      throw new Error('Kros API not configured. Please set KROS_API_TOKEN');
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
      throw new Error('Kros API not configured. Please set KROS_API_TOKEN');
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
    // Calculate dates in ISO 8601 format
    const issueDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 14 days from now

    // Format partner (customer) information according to KROS schema
    const fiscalAddress = {
      businessName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
      contactName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
      street: reservation.customer.address || 'Nezadané',
      city: reservation.customer.city || 'Nezadané', 
      postCode: reservation.customer.postalCode || '00000',
      country: reservation.customer.country || 'SK'
    };
    
    // Only add business fields if they have values (omit empty strings)
    if (reservation.customer.registrationNumber) {
      fiscalAddress.registrationNumber = reservation.customer.registrationNumber;
    }
    if (reservation.customer.taxNumber) {
      fiscalAddress.taxNumber = reservation.customer.taxNumber;
    }
    if (reservation.customer.vatNumber) {
      fiscalAddress.vatNumber = reservation.customer.vatNumber;
    }
    
    const partner = {
      fiscalAddress: fiscalAddress,
      email: reservation.customer.email,
      phone: reservation.customer.phone || '',
      // Additional partner fields that might be required
      partnerType: 1, // 1 = Individual, 2 = Company (assuming individual customers)
      isVatPayer: false // Assuming individual customers are not VAT payers
    };

    // Calculate prices with VAT
    const vatRate = 20.0; // 20% VAT in Slovakia
    const vatMultiplier = 1 + (vatRate / 100); // 1.2 for 20% VAT

    // Format invoice items according to KROS DocumentItem schema
    const items = [];

    // Main rental item
    const rentalUnitPrice = reservation.pricing.pricePerDay;
    const rentalTotalExclVat = rentalUnitPrice * reservation.pricing.totalDays;
    const rentalTotalInclVat = rentalTotalExclVat * vatMultiplier;

    items.push({
      name: `Prenájom vozidla ${reservation.car.brand} ${reservation.car.model} (${reservation.car.year})`,
      description: `Prenájom vozidla na obdobie ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} - ${new Date(reservation.endDate).toLocaleDateString('sk-SK')}`,
      amount: reservation.pricing.totalDays,
      measureUnit: 'deň',
      unitPrice: Math.round(rentalUnitPrice * 100) / 100, // Unit price excl. VAT
      vatRate: vatRate,
      totalPriceInclVat: Math.round(rentalTotalInclVat * 100) / 100, // Total price incl. VAT
      totalPriceExclVat: Math.round(rentalTotalExclVat * 100) / 100, // Total price excl. VAT
      vatAmount: Math.round((rentalTotalInclVat - rentalTotalExclVat) * 100) / 100 // VAT amount
    });

    // Add additional services as separate line items
    if (reservation.additionalServices && reservation.additionalServices.length > 0) {
      reservation.additionalServices.forEach(service => {
        const serviceQuantity = service.quantity || 1;
        const serviceTotalExclVat = service.price * serviceQuantity;
        const serviceTotalInclVat = serviceTotalExclVat * vatMultiplier;

        items.push({
          name: service.name,
          description: service.name,
          amount: serviceQuantity,
          measureUnit: 'ks',
          unitPrice: Math.round(service.price * 100) / 100, // Unit price excl. VAT
          vatRate: vatRate,
          totalPriceInclVat: Math.round(serviceTotalInclVat * 100) / 100, // Total price incl. VAT
          totalPriceExclVat: Math.round(serviceTotalExclVat * 100) / 100, // Total price excl. VAT
          vatAmount: Math.round((serviceTotalInclVat - serviceTotalExclVat) * 100) / 100 // VAT amount
        });
      });
    }

    // Format the invoice for KROS API with correct official schema
    const invoiceData = {
      issueDate: issueDate,
      dueDate: dueDate,
      vatPayerType: 1, // Required: 1 = VAT Payer
      currency: 'EUR',
      
      // Partner (customer) information
      partner: partner,

      // Invoice items
      items: items,
      
      // Additional information
      internalNote: `Rezervácia č. ${reservation.reservationNumber}`,
      printedNote: `Rezervácia č. ${reservation.reservationNumber}\nObdobie: ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} - ${new Date(reservation.endDate).toLocaleDateString('sk-SK')}`,
      
      // Reference numbers
      externalId: reservation._id.toString(),

      // Culture for Slovak formatting
      culture: 'sk-SK'
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