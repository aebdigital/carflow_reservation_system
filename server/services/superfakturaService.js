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
          variable: invoiceData.invoice.variable || '', // Variable symbol
          constant: invoiceData.invoice.constant || '', // Constant symbol
          specific: invoiceData.invoice.specific || '', // Specific symbol
          payment_type: invoiceData.invoice.payment_type || 'transfer', // transfer, cash, card, etc.
          invoice_currency: invoiceData.invoice.currency || 'EUR',
          comment: invoiceData.invoice.comment || '',
          rounding: 'item', // item, document
          created: invoiceData.invoice.created || new Date().toISOString().split('T')[0], // YYYY-MM-DD
          delivery: invoiceData.invoice.delivery || new Date().toISOString().split('T')[0], // YYYY-MM-DD
          due: invoiceData.invoice.due || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
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
    // Prepare invoice data from reservation
    const invoiceData = {
      reservationId: reservation._id,
      invoice: {
        name: `Faktúra - Rezervácia ${reservation.reservationNumber || reservation._id}`,
        variable: reservation.reservationNumber || '',
        payment_type: reservation.paymentMethod === 'card' ? 'card' :
                     reservation.paymentMethod === 'cash' ? 'cash' : 'transfer',
        currency: 'EUR',
        comment: `Prenájom vozidla: ${reservation.car?.brand} ${reservation.car?.model}\nOd: ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} Do: ${new Date(reservation.endDate).toLocaleDateString('sk-SK')}`,
        created: new Date().toISOString().split('T')[0],
        delivery: new Date().toISOString().split('T')[0],
        due: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 14 days
      },
      items: [
        {
          name: `Prenájom vozidla - ${reservation.car?.brand} ${reservation.car?.model}`,
          description: `Prenájom od ${new Date(reservation.startDate).toLocaleDateString('sk-SK')} do ${new Date(reservation.endDate).toLocaleDateString('sk-SK')}`,
          quantity: 1,
          unit: 'ks',
          unit_price: reservation.totalPrice || 0,
          tax: 20, // 20% VAT
          discount: 0
        }
      ],
      client: {
        name: `${reservation.customer?.firstName || ''} ${reservation.customer?.lastName || ''}`.trim() || 'Test Customer',
        address: reservation.customer?.address || 'Test Address 123',
        city: reservation.customer?.city || 'Bratislava',
        zip: reservation.customer?.zip || '12345',
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
}

module.exports = new SuperFakturaService();
