const axios = require('axios');
const xml2js = require('xml2js');

class BySquareService {
  constructor() {
    this.apiUrl = 'https://app.bysquare.com/api/uploadInvoiceQR_v2';
    this.username = process.env.BYSQUARE_USERNAME || '';
    this.password = process.env.BYSQUARE_PASSWORD || '';
    this.serviceId = process.env.BYSQUARE_SERVICE_ID || '';
    this.serviceUserId = process.env.BYSQUARE_SERVICE_USER_ID || '';
  }

  /**
   * Generate QR payment code for a reservation
   * @param {Object} reservation - The reservation object
   * @param {Object} car - The car object
   * @param {Object} customer - The customer object
   * @returns {Promise<Object>} QR code data
   */
  async generateReservationQR(reservation, car, customer) {
    try {
      console.log('🔄 [BYSQUARE] Generating QR code for reservation:', reservation._id);

      // Prepare invoice data in bySquare format
      const invoiceData = this.prepareInvoiceData(reservation, car, customer);
      
      // Convert to XML
      const xmlData = this.buildXMLRequest(invoiceData);
      
      console.log('📤 [BYSQUARE] Sending request to bySquare API...');
      
      // Make API request
      const response = await axios.post(this.apiUrl, xmlData, {
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/xml'
        },
        timeout: 30000
      });

      console.log('📥 [BYSQUARE] Received response from bySquare API');
      
      // Parse XML response
      const result = await this.parseResponse(response.data);
      
      console.log('✅ [BYSQUARE] QR codes generated successfully');
      
      return {
        success: true,
        qrCodes: {
          payBySquare: result.PayBySquare,
          qrPlatbaCz: result.QrPlatbaCz,
          invoiceBySquare: result.InvoiceBySquare
        },
        packageConsumption: result.PackageConsuption || null
      };

    } catch (error) {
      console.error('❌ [BYSQUARE] Error generating QR code:', error.message);
      
      if (error.response) {
        console.error('📋 [BYSQUARE] API Response:', error.response.data);
      }
      
      return {
        success: false,
        error: error.message,
        qrCodes: null
      };
    }
  }

  /**
   * Prepare invoice data from reservation details
   */
  prepareInvoiceData(reservation, car, customer) {
    const invoiceNumber = reservation.reservationNumber || `RES-${reservation._id.toString().slice(-8)}`;
    const issueDate = new Date(reservation.createdAt || Date.now());
    const dueDate = new Date(reservation.startDate);
    
    return {
      invoiceId: invoiceNumber,
      issueDate: issueDate.toISOString(),
      taxPointDate: issueDate.toISOString(),
      paymentDueDate: dueDate.toISOString(),
      localCurrencyCode: 'EUR',
      
      // Supplier (Car Rental Company) - will be populated from tenant settings
      supplier: {
        partyName: 'CarFlow Rental',
        companyTaxID: '12345678',
        companyVATID: 'SK12345678',
        address: {
          streetName: 'Main Street',
          buildingNumber: '123',
          cityName: 'Bratislava',
          postalZone: '81108',
          country: 'SVK'
        },
        contact: {
          name: 'CarFlow Support',
          email: 'info@carflow.sk'
        }
      },
      
      // Customer
      customer: {
        partyName: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone || '',
        address: customer.address ? {
          streetName: customer.address.street || '',
          cityName: customer.address.city || '',
          postalZone: customer.address.zipCode || '',
          country: customer.address.country || 'SVK'
        } : {}
      },
      
      // Financial details
      amount: reservation.pricing?.totalAmount || 0,
      currencyCode: 'EUR',
      
      // Payment details for QR
      bankAccount: 'SK1234567890123456789012', // Default account
      variableSymbol: invoiceNumber.replace(/[^0-9]/g, '').slice(-10) || '1234567890',
      constantSymbol: '0308', // Car rental services
      specificSymbol: '',
      beneficiaryName: 'CarFlow Rental',
      paymentNote: `Car rental: ${car.brand} ${car.model} (${reservation.startDate.toISOString().split('T')[0]} - ${reservation.endDate.toISOString().split('T')[0]})`,
      
      // Invoice items
      items: [{
        itemName: `Car Rental - ${car.brand} ${car.model} ${car.year}`,
        periodFromDate: reservation.startDate.toISOString(),
        periodToDate: reservation.endDate.toISOString(),
        quantity: reservation.pricing?.totalDays || 1,
        unitPrice: reservation.pricing?.dailyRate || 50,
        lineTotal: reservation.pricing?.totalAmount || 0,
        taxRate: 0 // No VAT as per previous requirement
      }]
    };
  }

  /**
   * Build XML request for bySquare API
   */
  buildXMLRequest(invoiceData) {
    const builder = new xml2js.Builder({
      rootName: 'BySquareXmlDocuments',
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      xmlns: {
        'xsd': 'http://www.w3.org/2001/XMLSchema',
        'xsi': 'http://www.w3.org/2001/XMLSchema-instance'
      }
    });

    const xmlObj = {
      $: {
        'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
      },
      
      // Authentication
      Username: this.username,
      Password: this.password,
      
      // Third-party service credentials (if applicable)
      ...(this.serviceId && this.serviceUserId ? {
        ServiceId: this.serviceId,
        ServiceUserId: this.serviceUserId
      } : {}),
      
      // Country options (Slovak and Czech)
      CountryOptions: {
        Slovak: true,
        Czech: true
      },
      
      // Invoice documents
      Documents: {
        Invoice: {
          $: {
            'xsi:type': 'Invoice',
            'xmlns': 'http://www.bysquare.com/bysquare'
          },
          InvoiceID: invoiceData.invoiceId,
          IssueDate: invoiceData.issueDate,
          TaxPointDate: invoiceData.taxPointDate,
          PaymentDueDate: invoiceData.paymentDueDate,
          LocalCurrencyCode: invoiceData.localCurrencyCode,
          
          // Supplier party
          SupplierParty: {
            PartyName: invoiceData.supplier.partyName,
            CompanyTaxID: invoiceData.supplier.companyTaxID,
            CompanyVATID: invoiceData.supplier.companyVATID,
            PostalAddress: {
              StreetName: invoiceData.supplier.address.streetName,
              BuildingNumber: invoiceData.supplier.address.buildingNumber,
              CityName: invoiceData.supplier.address.cityName,
              PostalZone: invoiceData.supplier.address.postalZone,
              Country: invoiceData.supplier.address.country
            },
            Contact: {
              Name: invoiceData.supplier.contact.name,
              EMail: invoiceData.supplier.contact.email
            }
          },
          
          // Customer party
          CustomerParty: {
            PartyName: invoiceData.customer.partyName,
            EMail: invoiceData.customer.email,
            Phone: invoiceData.customer.phone
          },
          
          // Payment means (bank account for QR)
          PaymentMeans: {
            PaymentMeansCode: '31', // Bank transfer
            PayeeFinancialAccount: {
              ID: invoiceData.bankAccount,
              Name: invoiceData.beneficiaryName,
              VariableSymbol: invoiceData.variableSymbol,
              ConstantSymbol: invoiceData.constantSymbol,
              SpecificSymbol: invoiceData.specificSymbol
            }
          },
          
          // Monetary totals
          LegalMonetaryTotal: {
            TaxExclusiveAmount: invoiceData.amount,
            TaxInclusiveAmount: invoiceData.amount,
            PayableAmount: invoiceData.amount
          },
          
          // Payment note
          PaymentNote: invoiceData.paymentNote
        },
        
        // Payment details for QR generation
        Pay: {
          $: {
            'xsi:type': 'Pay',
            'xmlns': 'http://www.bysquare.com/bysquare'
          },
          PaymentOptions: {
            PaymentOption: {
              BankAccounts: {
                BankAccount: invoiceData.bankAccount
              },
              Amount: invoiceData.amount,
              CurrencyCode: invoiceData.currencyCode,
              PaymentDueDate: invoiceData.paymentDueDate,
              VariableSymbol: invoiceData.variableSymbol,
              ConstantSymbol: invoiceData.constantSymbol,
              SpecificSymbol: invoiceData.specificSymbol,
              BeneficiaryName: invoiceData.beneficiaryName,
              PaymentNote: invoiceData.paymentNote
            }
          }
        }
      }
    };

    return builder.buildObject(xmlObj);
  }

  /**
   * Parse XML response from bySquare API
   */
  async parseResponse(xmlData) {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);
    
    if (result.StringSetOfCodes_v2) {
      return {
        PayBySquare: result.StringSetOfCodes_v2.PayBySquare,
        QrPlatbaCz: result.StringSetOfCodes_v2.QrPlatbaCz,
        InvoiceBySquare: result.StringSetOfCodes_v2.InvoiceBySquare,
        PackageConsuption: result.StringSetOfCodes_v2.PackageConsuption
      };
    } else if (result.StringSetOfCodes) {
      return {
        PayBySquare: result.StringSetOfCodes.PayBySquare,
        QrPlatbaCz: result.StringSetOfCodes.QrPlatbaCz,
        InvoiceBySquare: result.StringSetOfCodes.InvoiceBySquare
      };
    } else if (result.ErrorResponse) {
      throw new Error(`bySquare API Error ${result.ErrorResponse.ErrorCode}: ${result.ErrorResponse.Message}`);
    } else {
      throw new Error('Unexpected response format from bySquare API');
    }
  }

  /**
   * Check if bySquare is configured
   */
  isConfigured() {
    return !!(this.username && this.password);
  }

  /**
   * Generate QR code image URL (for display)
   */
  generateQRImageUrl(qrCode, format = 'png', size = 200) {
    // This would typically use a QR code generator library
    // For now, return a placeholder or use a public QR service
    const encodedData = encodeURIComponent(qrCode);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&format=${format}`;
  }
}

module.exports = new BySquareService(); 