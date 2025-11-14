const axios = require('axios');

/**
 * SuperFaktura API Service for LeRent Invoice Generation
 * Documentation: https://github.com/superfaktura/docs/blob/master/invoice.md
 */

class SuperFakturaService {
  constructor() {
    this.email = process.env.LERENT_FA_EMAIL;
    this.apiKey = process.env.LERENT_FA_API;
    this.companyId = process.env.LERENT_FA_CID;
    this.baseUrl = process.env.LERENT_FA_URL || 'https://moja.superfaktura.sk';
  }

  /**
   * Generate authentication header for SuperFaktura API
   * Format: SFAPI email=YOUR@EMAIL.TLD&apikey=YOURTOKEN&module=API&company_id=YOUR_COMPANY_ID
   */
  getAuthHeader() {
    const params = new URLSearchParams({
      email: this.email,
      apikey: this.apiKey,
      module: 'API',
      company_id: this.companyId
    });
    return `SFAPI ${params.toString()}`;
  }

  /**
   * Create invoice in SuperFaktura
   * @param {Object} invoiceData - Invoice data containing reservation and customer info
   * @returns {Promise<Object>} SuperFaktura API response
   */
  async createInvoice(invoiceData) {
    try {
      console.log('🧾 [SUPERFAKTURA] Creating invoice for reservation:', invoiceData.reservationId);

      // Prepare invoice payload according to SuperFaktura API format
      const payload = {
        Invoice: {
          name: invoiceData.invoice.name || 'Faktúra',
          variable: invoiceData.invoice.variable || '',
          payment_type: invoiceData.invoice.payment_type || 'transfer',
          invoice_currency: invoiceData.invoice.currency || 'EUR',
          comment: invoiceData.invoice.comment || '',
          created: invoiceData.invoice.created || new Date().toISOString().split('T')[0],
          delivery: invoiceData.invoice.delivery || new Date().toISOString().split('T')[0],
          due: invoiceData.invoice.due || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        InvoiceItem: invoiceData.items.map(item => ({
          name: item.name,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'ks', // ks = pieces, hod = hours, dni = days
          unit_price: item.unit_price,
          tax: item.tax || 20, // VAT rate in %
          discount: item.discount || 0,
          discount_description: item.discount_description || ''
        })),
        Client: {
          name: invoiceData.client.name,
          address: invoiceData.client.address || '',
          city: invoiceData.client.city || '',
          zip: invoiceData.client.zip || '',
          country: invoiceData.client.country || 'Slovensko',
          ico: invoiceData.client.ico || '', // Company ID
          dic: invoiceData.client.dic || '', // Tax ID
          ic_dph: invoiceData.client.ic_dph || '', // VAT ID
          email: invoiceData.client.email || '',
          phone: invoiceData.client.phone || ''
        }
      };

      console.log('🧾 [SUPERFAKTURA] Invoice payload:', JSON.stringify(payload, null, 2));

      // Prepare request
      const url = `${this.baseUrl}/invoices/create`;
      const headers = {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      };

      // SuperFaktura expects data in URL-encoded format with 'data' parameter
      const formData = new URLSearchParams();
      formData.append('data', JSON.stringify(payload));

      console.log('🧾 [SUPERFAKTURA] Sending request to:', url);
      console.log('🧾 [SUPERFAKTURA] Auth header:', headers.Authorization.substring(0, 50) + '...');

      // Send request
      const response = await axios.post(url, formData.toString(), { headers });

      console.log('✅ [SUPERFAKTURA] Invoice created successfully!');
      console.log('🧾 [SUPERFAKTURA] Response:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('❌ [SUPERFAKTURA] Error creating invoice:', error.message);

      if (error.response) {
        console.error('❌ [SUPERFAKTURA] Response status:', error.response.status);
        console.error('❌ [SUPERFAKTURA] Response data:', JSON.stringify(error.response.data, null, 2));
      }

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Create invoice from reservation data
   * @param {Object} reservation - Reservation object from database
   * @returns {Promise<Object>} SuperFaktura API response
   */
  async createInvoiceFromReservation(reservation) {
    // Get total price including VAT from reservation
    const totalPriceWithVat = reservation.pricing?.totalAmount || reservation.totalPrice || 0;
    const vatRate = 20; // 20% VAT

    // Calculate price without VAT (SuperFaktura expects unit_price without VAT)
    const unitPriceWithoutVat = Math.round((totalPriceWithVat / (1 + vatRate / 100)) * 100) / 100;

    console.log('💰 [PRICING] Total with VAT:', totalPriceWithVat, 'EUR');
    console.log('💰 [PRICING] Unit price without VAT:', unitPriceWithoutVat, 'EUR');

    // Prepare invoice data from reservation
    const invoiceData = {
      reservationId: reservation._id,
      invoice: {
        name: `Faktúra - Rezervácia ${reservation.reservationNumber || reservation._id}`,
        // Variable symbol will be set after invoice creation to match invoice number
        variable: '',
        payment_type: reservation.paymentMethod === 'card' ? 'card' :
                     reservation.paymentMethod === 'cash' ? 'cash' : 'transfer',
        currency: 'EUR',
        comment: `Prenájom vozidla: ${reservation.car?.brand} ${reservation.car?.model}\nOd: ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} Do: ${new Date(reservation.endDate).toLocaleDateString('sk-SK')}`,
        created: new Date().toISOString().split('T')[0],
        delivery: new Date().toISOString().split('T')[0],
        // Due date is the first day of rental period
        due: new Date(reservation.startDate).toISOString().split('T')[0]
      },
      items: [
        {
          name: `Prenájom vozidla - ${reservation.car?.brand} ${reservation.car?.model}`,
          description: `Prenájom od ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} do ${new Date(reservation.endDate).toLocaleDateString('sk-SK')}`,
          quantity: 1,
          unit: 'ks',
          unit_price: unitPriceWithoutVat, // Price WITHOUT VAT
          tax: vatRate, // 20% VAT
          discount: 0
        }
      ],
      client: {
        name: `${reservation.customer?.firstName || ''} ${reservation.customer?.lastName || ''}`.trim() || 'Test Customer',
        // Use actual customer address from reservation
        address: typeof reservation.customer?.address === 'string'
          ? reservation.customer.address
          : (reservation.customer?.address?.street || ''),
        city: typeof reservation.customer?.address === 'object'
          ? reservation.customer.address.city || ''
          : reservation.customer?.city || '',
        zip: typeof reservation.customer?.address === 'object'
          ? reservation.customer.address.zipCode || ''
          : reservation.customer?.zip || '',
        country: 'Slovensko',
        email: reservation.customer?.email || 'test@example.com',
        phone: reservation.customer?.phone || '+421900000000'
      }
    };

    return this.createInvoice(invoiceData);
  }

  /**
   * Create test invoice with dummy data
   * @returns {Promise<Object>} SuperFaktura API response
   */
  async createTestInvoice() {
    console.log('🧪 [SUPERFAKTURA] Creating TEST invoice with dummy data');

    const testInvoiceData = {
      reservationId: 'TEST-' + Date.now(),
      invoice: {
        name: 'Test Faktúra - Prenájom vozidla',
        variable: '2025001',
        payment_type: 'transfer',
        currency: 'EUR',
        comment: 'Testovacia faktúra pre prenájom vozidla\nVozidlo: BMW X5\nOd: 15.01.2025 Do: 20.01.2025',
        created: new Date().toISOString().split('T')[0],
        delivery: new Date().toISOString().split('T')[0],
        due: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      items: [
        {
          name: 'Prenájom vozidla - BMW X5',
          description: 'Prenájom od 15.01.2025 do 20.01.2025 (5 dní)',
          quantity: 5,
          unit: 'dni',
          unit_price: 80.00,
          tax: 20,
          discount: 0
        },
        {
          name: 'Doplnkové poistenie',
          description: 'Rozšírené poistenie vozidla',
          quantity: 5,
          unit: 'dni',
          unit_price: 15.00,
          tax: 20,
          discount: 0
        }
      ],
      client: {
        name: 'Ján Testovací',
        address: 'Testovacia 123',
        city: 'Bratislava',
        zip: '82101',
        country: 'Slovensko',
        email: 'test@example.com',
        phone: '+421901234567'
      }
    };

    return this.createInvoice(testInvoiceData);
  }

  /**
   * Get invoice PDF from SuperFaktura
   * @param {string|number} invoiceId - SuperFaktura invoice ID
   * @param {string} token - Invoice token from SuperFaktura response
   * @returns {Promise<Buffer>} PDF file buffer
   */
  async getInvoicePdf(invoiceId, token) {
    try {
      console.log('📥 [SUPERFAKTURA PDF] Downloading invoice PDF:', invoiceId);

      // Build URL: /slo/invoices/pdf/{INVOICE_ID}/token:{TOKEN}/bysquare:1
      const url = `${this.baseUrl}/slo/invoices/pdf/${invoiceId}/token:${token}/bysquare:1`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': this.getAuthHeader()
        },
        responseType: 'arraybuffer' // Important: get binary data
      });

      if (response.status === 200) {
        console.log('✅ [SUPERFAKTURA PDF] PDF downloaded successfully, size:', response.data.length, 'bytes');
        return Buffer.from(response.data);
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ [SUPERFAKTURA PDF] Error downloading PDF:', error.message);
      if (error.response) {
        console.error('❌ [SUPERFAKTURA PDF] Response status:', error.response.status);
        console.error('❌ [SUPERFAKTURA PDF] Response data:', error.response.data?.toString?.());
      }
      throw error;
    }
  }

  /**
   * Update invoice variable symbol to match invoice number
   * @param {string|number} invoiceId - SuperFaktura invoice ID
   * @param {string} variableSymbol - New variable symbol
   * @returns {Promise<Object>} SuperFaktura API response
   */
  async updateInvoiceVariable(invoiceId, variableSymbol) {
    try {
      console.log('🔄 [SUPERFAKTURA UPDATE] Updating invoice variable symbol:', invoiceId, 'to', variableSymbol);

      const payload = {
        Invoice: {
          id: invoiceId,
          variable: variableSymbol
        }
      };

      const url = `${this.baseUrl}/invoices/edit`;
      const headers = {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      };

      const formData = new URLSearchParams();
      formData.append('data', JSON.stringify(payload));

      console.log('🔄 [SUPERFAKTURA UPDATE] Payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(url, formData.toString(), { headers });

      console.log('✅ [SUPERFAKTURA UPDATE] Variable symbol updated successfully');

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('❌ [SUPERFAKTURA UPDATE] Error updating variable symbol:', error.message);

      if (error.response) {
        console.error('❌ [SUPERFAKTURA UPDATE] Response status:', error.response.status);
        console.error('❌ [SUPERFAKTURA UPDATE] Response data:', JSON.stringify(error.response.data, null, 2));
      }

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }
}

module.exports = new SuperFakturaService();
