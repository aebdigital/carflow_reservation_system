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
      console.log('🔄 [BYSQUARE] Generating 2 Slovak QR codes for reservation:', reservation._id);
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

      // Generate QR code for rental amount only
      const rentalQR = await this.generateRentalQR(reservation, car, customer);
      
      // Generate QR code for deposit amount only (if exists)
      let depositQR = null;
      
      // Check all possible deposit sources (consistent with frontend and email logic)
      let depositAmount = car.pricing?.deposit || car.deposit || reservation.pricing?.deposit || 0;
      
      // TEMPORARY: If no deposit configured anywhere, use a default amount for testing
      if (depositAmount === 0) {
        depositAmount = 200; // Default test deposit amount
        console.log('⚠️ [BYSQUARE] No deposit configured anywhere, using default test amount: 200€');
      }
      
      console.log('🔍 [BYSQUARE] Deposit amount check:', {
        carPricingDeposit: car.pricing?.deposit,
        carDeposit: car.deposit,
        reservationPricingDeposit: reservation.pricing?.deposit,
        finalDepositAmount: depositAmount,
        willGenerateDepositQR: depositAmount > 0
      });
      
      if (depositAmount > 0) {
        console.log('🔄 [BYSQUARE] Generating deposit QR code...');
        // Create a temporary car object with the deposit amount for QR generation
        const carWithDeposit = {
          ...car,
          pricing: {
            ...car.pricing,
            deposit: depositAmount
          },
          deposit: depositAmount
        };
        depositQR = await this.generateDepositQR(reservation, carWithDeposit, customer);
        console.log('✅ [BYSQUARE] Deposit QR code generated');
      } else {
        console.log('ℹ️ [BYSQUARE] No deposit amount found, skipping deposit QR generation');
      }
      
      console.log('✅ [BYSQUARE] Both Slovak QR codes generated successfully');
      
      return {
        success: true,
        qrCodes: {
          payBySquareRental: rentalQR,
          payBySquareDeposit: depositQR
        },
        packageConsumption: rentalQR.PackageConsuption || null
      };

    } catch (error) {
      console.error('❌ [BYSQUARE] Error generating QR codes:', error.message);
      
      return {
        success: false,
        error: error.message,
        qrCodes: null
      };
    }
  }

  /**
   * Generate QR code specifically for rental amount
   */
  async generateRentalQR(reservation, car, customer) {
    try {
      console.log('🔄 [BYSQUARE] Generating rental QR code...');
      
      const invoiceData = this.prepareRentalInvoiceData(reservation, car, customer);
      const xmlData = this.buildXMLRequest(invoiceData, true); // Slovak only
      
      const response = await axios.post(this.apiUrl, xmlData, {
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/xml'
        },
        timeout: 30000
      });
      
      const result = await this.parseResponse(response.data);
      console.log('✅ [BYSQUARE] Rental QR code generated');
      
      return result.PayBySquare;
    } catch (error) {
      console.error('❌ [BYSQUARE] Error generating rental QR:', error.message);
      throw error;
    }
  }

  /**
   * Generate QR code specifically for deposit amount
   */
  async generateDepositQR(reservation, car, customer) {
    try {
      console.log('🔄 [BYSQUARE] Generating deposit QR code...');
      
      const invoiceData = this.prepareDepositInvoiceData(reservation, car, customer);
      const xmlData = this.buildXMLRequest(invoiceData, true); // Slovak only
      
      const response = await axios.post(this.apiUrl, xmlData, {
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/xml'
        },
        timeout: 30000
      });
      
      const result = await this.parseResponse(response.data);
      console.log('✅ [BYSQUARE] Deposit QR code generated');
      
      return result.PayBySquare;
    } catch (error) {
      console.error('❌ [BYSQUARE] Error generating deposit QR:', error.message);
      throw error;
    }
  }

  /**
   * Prepare invoice data for rental amount only
   */
  prepareRentalInvoiceData(reservation, car, customer) {
    const invoiceNumber = reservation.reservationNumber || `RES-${reservation._id.toString().slice(-8)}`;
    const issueDate = new Date(reservation.createdAt || Date.now());
    const dueDate = new Date(reservation.startDate);
    
    // Calculate rental amount only (no deposit)
    const rentalAmount = reservation.pricing?.totalAmount || (reservation.pricing?.dailyRate * reservation.pricing?.totalDays) || 0;
    
    // Generate variable symbol from reservation number and ID + R for rental
    const reservationDigits = reservation.reservationNumber ? 
      reservation.reservationNumber.replace(/[^0-9]/g, '') : 
      reservation._id.toString().slice(-8);
    const variableSymbol = reservationDigits.slice(-9).padStart(9, '0') + '1'; // End with 1 for rental
    
    return {
      invoiceId: invoiceNumber + '-RENTAL',
      issueDate: issueDate.toISOString(),
      taxPointDate: issueDate.toISOString(),
      paymentDueDate: dueDate.toISOString(),
      localCurrencyCode: 'EUR',
      
      // Supplier (Car Rental Company)
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
      
      // Financial details - RENTAL ONLY
      amount: rentalAmount,
      currencyCode: 'EUR',
      
      // Payment details for QR
      bankAccount: 'SK6807200000000000000000',
      variableSymbol: variableSymbol,
      constantSymbol: '0308',
      specificSymbol: '',
      beneficiaryName: 'CarFlow Rental',
      paymentNote: `Car rental: ${car.brand} ${car.model} (${reservation.startDate.toISOString().split('T')[0]} - ${reservation.endDate.toISOString().split('T')[0]})`,
      
      // Invoice items - rental only
      items: [
        {
          itemName: `Car Rental - ${car.brand} ${car.model} ${car.year}`,
          periodFromDate: reservation.startDate.toISOString(),
          periodToDate: reservation.endDate.toISOString(),
          quantity: reservation.pricing?.totalDays || 1,
          unitPrice: reservation.pricing?.dailyRate || 50,
          lineTotal: rentalAmount,
          taxRate: 0
        }
      ]
    };
  }

  /**
   * Prepare invoice data for deposit amount only
   */
  prepareDepositInvoiceData(reservation, car, customer) {
    const invoiceNumber = reservation.reservationNumber || `RES-${reservation._id.toString().slice(-8)}`;
    const issueDate = new Date(reservation.createdAt || Date.now());
    const dueDate = new Date(reservation.startDate);
    
    // Deposit amount only - check all possible locations (consistent with generateReservationQR)
    const depositAmount = car.pricing?.deposit || car.deposit || reservation.pricing?.deposit || 0;
    console.log('🔍 [BYSQUARE] Deposit amount for QR generation:', {
      carPricingDeposit: car.pricing?.deposit,
      carDeposit: car.deposit,
      reservationPricingDeposit: reservation.pricing?.deposit,
      finalDepositAmount: depositAmount
    });
    
    // Generate variable symbol from reservation number and ID + D for deposit
    const reservationDigits = reservation.reservationNumber ? 
      reservation.reservationNumber.replace(/[^0-9]/g, '') : 
      reservation._id.toString().slice(-8);
    const variableSymbol = reservationDigits.slice(-9).padStart(9, '0') + '2'; // End with 2 for deposit
    
    return {
      invoiceId: invoiceNumber + '-DEPOSIT',
      issueDate: issueDate.toISOString(),
      taxPointDate: issueDate.toISOString(),
      paymentDueDate: dueDate.toISOString(),
      localCurrencyCode: 'EUR',
      
      // Supplier (Car Rental Company)
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
      
      // Financial details - DEPOSIT ONLY
      amount: depositAmount,
      currencyCode: 'EUR',
      
      // Payment details for QR
      bankAccount: 'SK6807200000000000000000',
      variableSymbol: variableSymbol,
      constantSymbol: '0308',
      specificSymbol: '',
      beneficiaryName: 'CarFlow Rental',
      paymentNote: `Security deposit: ${car.brand} ${car.model} (${reservation.startDate.toISOString().split('T')[0]} - ${reservation.endDate.toISOString().split('T')[0]})`,
      
      // Invoice items - deposit only
      items: [
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

  /**
   * Prepare invoice data from reservation details (LEGACY - kept for compatibility)
   */
  prepareInvoiceData(reservation, car, customer) {
    const invoiceNumber = reservation.reservationNumber || `RES-${reservation._id.toString().slice(-8)}`;
    const issueDate = new Date(reservation.createdAt || Date.now());
    const dueDate = new Date(reservation.startDate);
    
    // Calculate total amount including deposit
    const rentalAmount = reservation.pricing?.totalAmount || (reservation.pricing?.dailyRate * reservation.pricing?.totalDays) || 0;
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
   * @param {Object} invoiceData - Invoice data object
   * @param {boolean} slovakOnly - Generate only Slovak QR codes (default: false for both)
   */
  buildXMLRequest(invoiceData, slovakOnly = false) {
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
      
      // Country options - Slovak only when specified
      CountryOptions: {
        Slovak: true,
        Czech: !slovakOnly
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