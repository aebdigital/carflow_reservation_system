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
      
      // Log the exact payload size and structure for debugging
      const payloadString = JSON.stringify(invoiceData);
      console.log('📊 Payload stats:');
      console.log('   - Size:', payloadString.length, 'characters');
      console.log('   - Has data wrapper:', !!invoiceData.data);
      console.log('   - Partner structure:', !!invoiceData.data?.partner);
      console.log('   - Items count:', invoiceData.data?.items?.length || 0);
      
      const axiosInstance = this.getAxiosInstance();
      console.log('🌐 Making request to:', `${this.baseURL}/invoices`);
      console.log('🔑 Using token:', this.apiToken ? `${this.apiToken.substring(0, 10)}...` : 'NONE');
      
      const response = await axiosInstance.post('/invoices', invoiceData);

      console.log('✅ Invoice creation request sent to Kros API');
      console.log('📋 Response status:', response.status);
      console.log('📋 Response data:', JSON.stringify(response.data, null, 2));

      // Handle different KROS response formats
      const invoiceId = response.data?.id || response.data?.documentId || response.data?.invoiceId;
      const requestId = response.data?.requestId;
      
      console.log('📋 [KROS] Response analysis:', {
        status: response.status,
        hasId: !!invoiceId,
        hasRequestId: !!requestId,
        responseKeys: Object.keys(response.data || {})
      });

      return {
        success: true,
        data: response.data,
        status: response.status,
        invoiceId: invoiceId || null,
        requestId: requestId || null,
        isAsync: response.status === 202 && !invoiceId // KROS async processing
      };

    } catch (error) {
      console.error('❌ Error creating invoice in Kros API:', error.message);
      console.error('📋 HTTP Status:', error.response?.status);
      console.error('📋 Response headers:', error.response?.headers);
      console.error('📋 Full error response:', JSON.stringify(error.response?.data, null, 2));
      
      if (invoiceData) {
        console.error('📋 Sent payload (first 1000 chars):', JSON.stringify(invoiceData, null, 2).substring(0, 1000));
        console.error('📋 Payload structure validation:');
        console.error('   - Has data wrapper:', !!invoiceData.data);
        console.error('   - Has partner:', !!invoiceData.data?.partner);
        console.error('   - Has myCompany:', !!invoiceData.data?.myCompany);
        console.error('   - Has items:', !!invoiceData.data?.items && invoiceData.data.items.length > 0);
        console.error('   - Has required fields:', !!invoiceData.data?.issueDate && !!invoiceData.data?.dueDate);
      }
      
      // Enhanced error message extraction
      let errorMessage = 'Unknown error';
      if (error.response?.data) {
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          const errorDetails = error.response.data.errors.map(e => `${e.propertyPath}: ${e.errorMessage}`).join(', ');
          errorMessage = `Validation errors: ${errorDetails}`;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
      } else {
        errorMessage = error.response?.statusText || error.message;
      }
      
      throw new Error(`Failed to create invoice: ${errorMessage}`);
    }
  }

  /**
   * Create final invoice in Kros API (rental only, no deposit)
   * @param {Object} reservation - Reservation object
   * @returns {Object} Invoice creation result
   */
  async createFinalInvoice(reservation) {
    if (!this.isConfigured) {
      throw new Error('Kros API not configured. Please set KROS_API_TOKEN');
    }

    try {
      console.log(`📄 Creating final invoice (no deposit) for reservation: ${reservation.reservationNumber}`);

      // Format reservation data for final invoice (without deposit)
      const invoiceData = this.formatReservationForFinalInvoice(reservation);
      
      console.log('📋 Generated KROS final invoice payload:', JSON.stringify(invoiceData, null, 2));
      console.log('📊 Final invoice payload stats:');
      console.log('   - Size:', JSON.stringify(invoiceData).length, 'characters');
      console.log('   - Has data wrapper:', !!invoiceData.data);
      console.log('   - Partner structure:', !!invoiceData.data?.partner);
      console.log('   - Items count:', invoiceData.data?.items?.length || 0);

      const axiosInstance = this.getAxiosInstance();
      const response = await axiosInstance.post('/invoices', invoiceData);

      console.log('✅ Final invoice creation request sent to Kros API');
      console.log('📋 Response status:', response.status);
      console.log('📋 Response data:', JSON.stringify(response.data, null, 2));

      // Handle different KROS response formats
      const invoiceId = response.data?.id || response.data?.documentId || response.data?.invoiceId;
      const requestId = response.data?.requestId;
      
      console.log('📋 [KROS] Final invoice response analysis:', {
        status: response.status,
        hasId: !!invoiceId,
        hasRequestId: !!requestId,
        responseKeys: Object.keys(response.data || {})
      });

      return {
        success: true,
        data: response.data,
        status: response.status,
        invoiceId: invoiceId || null,
        requestId: requestId || null,
        isAsync: response.status === 202 && !invoiceId // KROS async processing
      };

    } catch (error) {
      console.error('❌ Error creating final invoice in Kros API:', error.message);
      console.error('📋 HTTP Status:', error.response?.status);
      console.error('📋 Response headers:', error.response?.headers);
      console.error('📋 Full error response:', error.response?.data);

      throw new Error(`Failed to create final invoice: ${error.response?.data?.message || error.message}`);
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

    // Calculate prices with VAT
    const vatRate = 20.0; // 20% VAT in Slovakia

    // Format invoice items according to correct KROS schema
    const items = [];

    // Main rental item (including deposit)
    const rentalUnitPrice = reservation.pricing.pricePerDay || reservation.pricing.dailyRate || 0;
    const rentalTotalDays = reservation.pricing.totalDays || 1;
    const baseRentalExclVat = rentalUnitPrice * rentalTotalDays;
    
    // Get deposit amount from multiple possible sources
    const depositAmount = reservation.car?.pricing?.deposit || 
                         reservation.car?.deposit || 
                         reservation.pricing?.deposit || 
                         200; // Default deposit if none configured
    
    // Total rental + deposit (excluding VAT)
    const rentalTotalExclVat = baseRentalExclVat + depositAmount;
    const rentalTotalInclVat = rentalTotalExclVat * (1 + vatRate / 100);
    
    console.log('💰 [KROS] Price calculation (with deposit):', {
      rentalUnitPrice,
      rentalTotalDays,
      baseRentalExclVat,
      depositAmount,
      rentalTotalExclVat: rentalTotalExclVat,
      rentalTotalInclVat
    });

    items.push({
      name: `Prenájom vozidla ${reservation.car.brand} ${reservation.car.model} (${reservation.car.year}) + depozit`,
      description: `Prenájom vozidla na obdobie ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} - ${new Date(reservation.endDate).toLocaleDateString('sk-SK')} (vrátane depozitu ${depositAmount}€)`,
      amount: rentalTotalDays,
      measureUnit: 'deň',
      vatRate: vatRate,
      totalPriceInclVat: Math.round((rentalTotalInclVat || 0) * 100) / 100
    });

    // Add additional services as separate line items
    if (reservation.additionalServices && reservation.additionalServices.length > 0) {
      reservation.additionalServices.forEach(service => {
        const serviceQuantity = service.quantity || 1;
        const serviceTotalExclVat = service.price * serviceQuantity;
        const serviceTotalInclVat = serviceTotalExclVat * (1 + vatRate / 100);

        items.push({
          name: service.name,
          description: service.name,
          amount: serviceQuantity,
          measureUnit: 'ks',
          vatRate: vatRate,
          totalPriceInclVat: Math.round((serviceTotalInclVat || 0) * 100) / 100
        });
      });
    }

    // Format customer address
    const customerAddress = {
      businessName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
      contactName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
      street: reservation.customer.address || 'Nezadané',
      postCode: reservation.customer.postalCode || '00000',
      city: reservation.customer.city || 'Nezadané',
      country: reservation.customer.country || 'SK'
    };

    // Format partner (customer) information according to correct KROS schema
    const partner = {
      address: customerAddress,
      postalAddress: customerAddress, // Same as address for individuals
      phoneNumber: reservation.customer.phone || '',
      email: reservation.customer.email
    };

    // Only add business IDs if they exist
    if (reservation.customer.registrationNumber) {
      partner.registrationId = reservation.customer.registrationNumber;
    }
    if (reservation.customer.taxNumber) {
      partner.taxId = reservation.customer.taxNumber;
    }
    if (reservation.customer.vatNumber) {
      partner.vatId = reservation.customer.vatNumber;
    }

    // Company information (your rental company)
    const myCompany = {
      address: {
        businessName: process.env.COMPANY_NAME || 'CarFlow Rental',
        contactName: process.env.COMPANY_CONTACT || 'Admin',
        street: process.env.COMPANY_ADDRESS || 'Hlavná 1',
        postCode: process.env.COMPANY_POSTAL_CODE || '81101',
        city: process.env.COMPANY_CITY || 'Bratislava',
        country: 'SK'
      },
      registrationId: process.env.COMPANY_REGISTRATION_ID || '12345678',
      taxId: process.env.COMPANY_TAX_ID || '2020123456',
      vatId: process.env.COMPANY_VAT_ID || 'SK2020123456',
      phoneNumber: process.env.COMPANY_PHONE || '+421 XXX XXX XXX',
      email: process.env.COMPANY_EMAIL || 'info@carflow.sk',
      web: process.env.COMPANY_WEB || 'www.carflow.sk'
    };

    // Format the invoice for KROS API with correct official schema structure
    const invoiceData = {
      data: {
        externalId: reservation._id.toString(),
        partner: partner,
        myCompany: myCompany,
        items: items,
        internalNote: `Rezervácia č. ${reservation.reservationNumber}`,
        printedNote: `Rezervácia č. ${reservation.reservationNumber}\nObdobie: ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} - ${new Date(reservation.endDate).toLocaleDateString('sk-SK')}`,
        vatPayerType: 1, // 1 = VAT Payer
        useParagraph7or7a: false,
        culture: 'sk-SK',
        openingText: `Faktúra za prenájom vozidla ${reservation.car.brand} ${reservation.car.model} vrátane depozitu`,
        closingText: 'Ďakujeme za dôveru a tešíme sa na ďalšiu spoluprácu.',
        registrationCourtText: 'Firma zapísaná v Obchodnom registri Okresného súdu Bratislava I.',
        dueDate: dueDate,
        currency: 'EUR',
        exchangeRate: 1,
        discountPercent: 0,
        discountTotalPriceInclVat: 0,
        issueDate: issueDate,
        orderNumber: reservation.reservationNumber.slice(0, 20), // Max 20 chars for KROS
        paymentType: 'Bankový prevod',
        variableSymbol: null, // Set to null as KROS expects
        // bankAccount: {  // Remove IBAN validation issue - let KROS use company default
        //   iban: process.env.COMPANY_IBAN || 'SK6807200002891987426353',
        //   accountNumber: '',
        //   isForeign: false,
        //   swift: process.env.COMPANY_SWIFT || 'CEKOSKBX'
        // },
        deliveryDate: new Date(reservation.startDate).toISOString().split('T')[0],
        advancePaymentDeduction: 0,
        numberingSequence: 'OF', // Use standard OF sequence as per example
        documentNumber: '',
        invoiceType: 0,
        creditedInvoiceNumber: '',
        // mandatoryText: 'Ďakujeme za využitie našich služieb.', // Remove - only for 0% VAT items
        // mandatoryTextType: 0,
        ossTaxState: 0,
        customFields: [
          {
            label: 'Rezervácia č.',
            value: reservation.reservationNumber
          }
        ],
        accountingDetails: {
          syntheticAccount: '311',
          analyticalAccount: '001',
          descriptionAccounting: 'Prenájom vozidiel'
        }
      }
    };

    return invoiceData;
  }

  /**
   * Format reservation data for final invoice (rental only, no deposit)
   * @param {Object} reservation - Reservation object
   * @returns {Object} Formatted invoice data for Kros API
   */
  formatReservationForFinalInvoice(reservation) {
    // Calculate dates in ISO 8601 format
    const issueDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 14 days from now

    // Calculate prices with VAT
    const vatRate = 20.0; // 20% VAT in Slovakia

    // Format invoice items according to correct KROS schema
    const items = [];

    // Main rental item (NO DEPOSIT - rental only)
    const rentalUnitPrice = reservation.pricing.pricePerDay || reservation.pricing.dailyRate || 0;
    const rentalTotalDays = reservation.pricing.totalDays || 1;
    const rentalTotalExclVat = rentalUnitPrice * rentalTotalDays;
    const rentalTotalInclVat = rentalTotalExclVat * (1 + vatRate / 100);
    
    console.log('💰 [KROS] Final invoice price calculation (rental only):', {
      rentalUnitPrice,
      rentalTotalDays,
      rentalTotalExclVat,
      rentalTotalInclVat,
      note: 'NO DEPOSIT INCLUDED'
    });

    items.push({
      name: `Prenájom vozidla ${reservation.car.brand} ${reservation.car.model} (${reservation.car.year})`,
      description: `Finálna faktúra za prenájom vozidla na obdobie ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} - ${new Date(reservation.endDate).toLocaleDateString('sk-SK')}`,
      amount: rentalTotalDays,
      measureUnit: 'deň',
      vatRate: vatRate,
      totalPriceInclVat: Math.round((rentalTotalInclVat || 0) * 100) / 100
    });

    // Add additional services as separate line items
    if (reservation.additionalServices && reservation.additionalServices.length > 0) {
      reservation.additionalServices.forEach(service => {
        const serviceQuantity = service.quantity || 1;
        const serviceTotalExclVat = service.price * serviceQuantity;
        const serviceTotalInclVat = serviceTotalExclVat * (1 + vatRate / 100);

        items.push({
          name: service.name,
          description: service.name,
          amount: serviceQuantity,
          measureUnit: 'ks',
          vatRate: vatRate,
          totalPriceInclVat: Math.round((serviceTotalInclVat || 0) * 100) / 100
        });
      });
    }

    // Format customer address
    const customerAddress = {
      businessName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
      contactName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
      postCode: reservation.customer.address?.zipCode || '00000',
      city: reservation.customer.address?.city || 'Nezadané',
      country: reservation.customer.address?.country || 'SK'
    };

    // Format company information
    const myCompany = {
      address: {
        businessName: process.env.COMPANY_NAME || 'CarFlow Rental',
        contactName: process.env.COMPANY_CONTACT_NAME || 'Admin',
        street: process.env.COMPANY_STREET || 'Hlavná 1',
        postCode: process.env.COMPANY_POST_CODE || '81101',
        city: process.env.COMPANY_CITY || 'Bratislava',
        country: process.env.COMPANY_COUNTRY || 'SK'
      },
      registrationId: process.env.COMPANY_REG_ID || '12345678',
      taxId: process.env.COMPANY_TAX_ID || '2020123456',
      vatId: process.env.COMPANY_VAT_ID || 'SK2020123456',
      phoneNumber: process.env.COMPANY_PHONE || '+421907827771',
      email: process.env.COMPANY_EMAIL || 'rivalslovakia@yahoo.com',
      web: process.env.COMPANY_WEB || 'www.carflow.sk'
    };

    return {
      data: {
        externalId: reservation._id.toString(),
        partner: {
          address: customerAddress,
          postalAddress: customerAddress,
          phoneNumber: reservation.customer.phone,
          email: reservation.customer.email
        },
        myCompany: myCompany,
        items: items,
        internalNote: `Finálna faktúra č. ${reservation.reservationNumber}`,
        printedNote: `Finálna faktúra č. ${reservation.reservationNumber}\nObdobie: ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} - ${new Date(reservation.endDate).toLocaleDateString('sk-SK')}`,
        vatPayerType: 1, // 1 = VAT Payer
        useParagraph7or7a: false,
        culture: 'sk-SK',
        openingText: `Finálna faktúra za prenájom vozidla ${reservation.car.brand} ${reservation.car.model}`,
        closingText: 'Ďakujeme za využitie našich služieb.',
        registrationCourtText: 'Firma zapísaná v Obchodnom registri Okresného súdu Bratislava I.',
        dueDate: dueDate,
        currency: 'EUR',
        exchangeRate: 1,
        discountPercent: 0,
        discountTotalPriceInclVat: 0,
        issueDate: issueDate,
        orderNumber: `FINAL-${reservation.reservationNumber}`.slice(0, 20), // Max 20 chars for KROS
        paymentType: 'Bankový prevod',
        variableSymbol: null, // Set to null as KROS expects
        deliveryDate: new Date(reservation.startDate).toISOString().split('T')[0],
        advancePaymentDeduction: 0,
        numberingSequence: 'OF', // Use standard OF sequence as per example
        documentNumber: '',
        invoiceType: 0,
        creditedInvoiceNumber: '',
        // mandatoryText: 'Ďakujeme za využitie našich služieb.', // Remove - only for 0% VAT items
        // mandatoryTextType: 0,
        ossTaxState: 0,
        customFields: [
          {
            label: 'Finálna faktúra č.',
            value: reservation.reservationNumber
          }
        ],
        accountingDetails: {
          syntheticAccount: '311',
          analyticalAccount: '001',
          descriptionAccounting: 'Prenájom vozidiel - finálna faktúra'
        }
      }
    };
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