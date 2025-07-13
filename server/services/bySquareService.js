const axios = require('axios');
const xml2js = require('xml2js');

class BySquareService {
  constructor() {
    this.apiUrl = 'https://app.bysquare.com/api/generateStringCodes_v2';
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
      console.log('📋 [BYSQUARE] Input data:', {
        reservation: {
          id: reservation._id,
          number: reservation.reservationNumber,
          pricing: reservation.pricing,
          startDate: reservation.startDate,
          endDate: reservation.endDate
        },
        car: {
          brand: car.brand,
          model: car.model,
          year: car.year,
          deposit: car.pricing?.deposit
        },
        customer: {
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone
        }
      });

      // Prepare invoice data in bySquare format
      const invoiceData = this.prepareInvoiceData(reservation, car, customer);
      console.log('📋 [BYSQUARE] Prepared invoice data:', JSON.stringify(invoiceData, null, 2));
      
      // Convert to XML
      const xmlData = this.buildXMLRequest(invoiceData);
      console.log('📤 [BYSQUARE] Generated XML request:');
      console.log(xmlData);
      
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
      console.log('📥 [BYSQUARE] Response status:', response.status);
      console.log('📥 [BYSQUARE] Response data:', response.data);
      
      // Parse XML response
      const result = await this.parseResponse(response.data);
      
      console.log('✅ [BYSQUARE] QR codes generated successfully');
      console.log('✅ [BYSQUARE] Parsed result:', result);
      
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
        console.error('📋 [BYSQUARE] Error response status:', error.response.status);
        console.error('📋 [BYSQUARE] Error response headers:', error.response.headers);
        console.error('📋 [BYSQUARE] Error response data:', error.response.data);
        
        // Try to parse error response if it's XML
        if (error.response.data && typeof error.response.data === 'string') {
          try {
            const xml2js = require('xml2js');
            const parser = new xml2js.Parser({ explicitArray: false });
            const parsedError = await parser.parseStringPromise(error.response.data);
            console.error('📋 [BYSQUARE] Parsed error response:', JSON.stringify(parsedError, null, 2));
          } catch (parseError) {
            console.error('📋 [BYSQUARE] Could not parse error response as XML:', parseError.message);
          }
        }
      } else if (error.request) {
        console.error('📋 [BYSQUARE] No response received:', error.request);
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
    
    // Calculate total amount including deposit
    const rentalAmount = reservation.pricing?.totalAmount || 0;
    const depositAmount = car.pricing?.deposit || 0;
    const totalAmount = rentalAmount + depositAmount;
    
    // Generate variable symbol from reservation number and ID
    const reservationDigits = reservation.reservationNumber ? 
      reservation.reservationNumber.replace(/[^0-9]/g, '') : 
      reservation._id.toString().slice(-8);
    const variableSymbol = reservationDigits.slice(-10).padStart(10, '0');
    
    let result = {
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
      
      // Financial details - NOW INCLUDES DEPOSIT
      amount: totalAmount,
      currencyCode: 'EUR',
      
      // Payment details for QR
      bankAccount: 'SK6807200000000000000000', // Valid Slovak IBAN format
      variableSymbol: variableSymbol,
      constantSymbol: '0308', // Car rental services
      specificSymbol: '',
      beneficiaryName: 'CarFlow Rental',
      paymentNote: `Car rental + deposit: ${car.brand} ${car.model} (${reservation.startDate.toISOString().split('T')[0]} - ${reservation.endDate.toISOString().split('T')[0]})`,
      
      // Invoice items
      items: [
        {
          itemName: `Car Rental - ${car.brand} ${car.model} ${car.year}`,
          periodFromDate: reservation.startDate.toISOString(),
          periodToDate: reservation.endDate.toISOString(),
          quantity: reservation.pricing?.totalDays || 1,
          unitPrice: reservation.pricing?.dailyRate || 50,
          lineTotal: rentalAmount,
          taxRate: 0 // No VAT as per previous requirement
        }
      ]
    };
    
    // Add deposit as separate item if exists
    if (depositAmount > 0) {
      result = {
        ...result,
        items: [
          ...result.items,
          {
            itemName: `Security Deposit - ${car.brand} ${car.model}`,
            periodFromDate: reservation.startDate.toISOString(),
            periodToDate: reservation.endDate.toISOString(),
            quantity: 1,
            unitPrice: depositAmount,
            lineTotal: depositAmount,
            taxRate: 0
          }
        ]
      };
    }
    
    return result;
  }

  /**
   * Build XML request for bySquare API
   */
  buildXMLRequest(invoiceData) {
    const builder = new xml2js.Builder({
      rootName: 'BySquareXmlDocuments',
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: {
        pretty: false,
        indent: ''
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
          
          // Number of invoice lines (as shown in API docs)
          NumberOfInvoiceLines: { $: { 'xsi:nil': 'true' } },
          
          // Single invoice line for simplicity - match API docs exactly
          SingleInvoiceLine: {
            ItemName: invoiceData.items[0].itemName,
            PeriodFromDate: { $: { 'xsi:nil': 'true' } },
            PeriodToDate: { $: { 'xsi:nil': 'true' } },
            InvoicedQuantity: invoiceData.items[0].quantity,
            UnitPriceTaxExclusiveAmount: invoiceData.items[0].unitPrice,
            UnitPriceTaxInclusiveAmount: invoiceData.items[0].unitPrice,
            UnitPriceTaxAmount: 0
          },
          
          // Tax category summaries (required by API)
          TaxCategorySummaries: {
            TaxCategorySummary: {
              ClassifiedTaxCategory: 0.0,
              TaxExclusiveAmount: invoiceData.amount,
              TaxInclusiveAmount: invoiceData.amount,
              TaxAmount: 0,
              AlreadyClaimedTaxExclusiveAmount: 0,
              AlreadyClaimedTaxInclusiveAmount: 0,
              AlreadyClaimedTaxAmount: 0,
              DifferenceTaxExclusiveAmount: invoiceData.amount,
              DifferenceTaxInclusiveAmount: invoiceData.amount,
              DifferenceTaxAmount: 0
            }
          },
          
          // Monetary totals
          MonetarySummary: {
            TaxExclusiveAmount: invoiceData.amount,
            TaxInclusiveAmount: invoiceData.amount,
            TaxAmount: 0,
            AlreadyClaimedTaxExclusiveAmount: 0,
            AlreadyClaimedTaxInclusiveAmount: 0,
            AlreadyClaimedTaxAmount: 0,
            DifferenceTaxExclusiveAmount: invoiceData.amount,
            DifferenceTaxInclusiveAmount: invoiceData.amount,
            DifferenceTaxAmount: 0,
            PayableRoundingAmount: 0,
            PaidDepositsAmount: 0,
            PayableAmount: invoiceData.amount
          }
        },
        
        // Payment details for QR generation - Fixed structure according to API docs
        Pay: {
          $: {
            'xsi:type': 'Pay',
            'xmlns': 'http://www.bysquare.com/bysquare'
          },
          Payments: {
            Payment: {
              PaymentOptions: 'paymentorder',
              Amount: { $: { 'xsi:nil': 'true' } },
              CurrencyCode: invoiceData.currencyCode,
              PaymentDueDate: { $: { 'xsi:nil': 'true' } },
              BankAccounts: {
                BankAccount: {
                  IBAN: invoiceData.bankAccount,
                  BIC: 'TATRSKBX'
                }
              },
              VariableSymbol: invoiceData.variableSymbol,
              ConstantSymbol: invoiceData.constantSymbol,
              SpecificSymbol: invoiceData.specificSymbol
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
      console.log('📋 [BYSQUARE] Unexpected response structure:', JSON.stringify(result, null, 2));
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