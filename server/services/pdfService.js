const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

class PDFService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/Zmlu o najme vozidla 2025.pdf');
  }

  /**
   * Normalize text to handle special characters properly
   * @param {string} text - Input text
   * @returns {string} Normalized text
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Handle common Slovak special characters
    const charMap = {
      'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
      'Á': 'A', 'À': 'A', 'Ä': 'A', 'Â': 'A', 'Ã': 'A', 'Å': 'A',
      'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
      'É': 'E', 'È': 'E', 'Ë': 'E', 'Ê': 'E',
      'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
      'Í': 'I', 'Ì': 'I', 'Ï': 'I', 'Î': 'I',
      'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o',
      'Ó': 'O', 'Ò': 'O', 'Ö': 'O', 'Ô': 'O', 'Õ': 'O',
      'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
      'Ú': 'U', 'Ù': 'U', 'Ü': 'U', 'Û': 'U',
      'ý': 'y', 'ÿ': 'y',
      'Ý': 'Y', 'Ÿ': 'Y',
      'ľ': 'l', 'Ľ': 'L',
      'ľ': 'l', 'Ľ': 'L',
      'ň': 'n', 'Ň': 'N',
      'ř': 'r', 'Ř': 'R',
      'š': 's', 'Š': 'S',
      'ť': 't', 'Ť': 'T',
      'ž': 'z', 'Ž': 'Z',
      'ĺ': 'l', 'Ĺ': 'L',
      'ŕ': 'r', 'Ŕ': 'R',
      'ô': 'o', 'Ô': 'O',
      'č': 'c', 'Č': 'C',
      'ď': 'd', 'Ď': 'D'
    };
    
    // Replace special characters
    let normalized = text;
    for (const [special, replacement] of Object.entries(charMap)) {
      normalized = normalized.replace(new RegExp(special, 'g'), replacement);
    }
    
    // Don't replace characters in text that looks like numbers, prices, dates, or IDs
    // This prevents question marks in prices like "50.00 €" or dates like "31.12.2024"
    if (/^[\d.,\-\/\s€$]+$/.test(text) || /^\d+[\w\d\-]*$/.test(text)) {
      return text; // Return original for numeric/currency/date/ID patterns
    }
    
    // Remove any remaining non-ASCII characters that might cause issues (only for text fields)
    normalized = normalized.replace(/[^\x00-\x7F]/g, '?');
    
    return normalized;
  }

  /**
   * Generate filled rental agreement PDF
   * @param {Object} reservation - The reservation object
   * @param {Object} car - The car object
   * @param {Object} customer - The customer object
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateRentalAgreement(reservation, car, customer) {
    try {
      console.log('🔄 [PDF Service] Starting generateRentalAgreement');
      console.log('📋 [PDF Service] Input data:', {
        reservationId: reservation?._id,
        reservationNumber: reservation?.reservationNumber,
        carBrand: car?.brand,
        carModel: car?.model,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'N/A',
        templatePath: this.templatePath
      });

      // Check if template exists
      if (!fs.existsSync(this.templatePath)) {
        console.error('❌ [PDF Service] Template file not found at:', this.templatePath);
        throw new Error(`Template file not found at: ${this.templatePath}`);
      }
      console.log('✅ [PDF Service] Template file exists');

      // Read the template PDF
      console.log('🔄 [PDF Service] Reading template file...');
      const templateBytes = fs.readFileSync(this.templatePath);
      console.log('✅ [PDF Service] Template file read successfully:', templateBytes.length, 'bytes');

      console.log('🔄 [PDF Service] Loading PDF document...');
      const pdfDoc = await PDFDocument.load(templateBytes);
      console.log('✅ [PDF Service] PDF document loaded successfully');
      
      // Try to get the form (if it has fillable fields)
      const form = pdfDoc.getForm();
      
      // Check if form has fields
      const fields = form.getFields();
      console.log('📋 [PDF] Found form fields:', fields.length);
      
      if (fields.length > 0) {
        // List all field names for debugging
        fields.forEach((field, index) => {
          console.log(`📝 [PDF] Field ${index + 1}: ${field.getName()} (Type: ${field.constructor.name})`);
        });
        
        // Fill form fields with reservation data
        const formData = this.prepareFormData(reservation, car, customer);
        await this.fillFormFields(form, formData);
        
        // Flatten the form to prevent further editing
        form.flatten();
      } else {
        console.log('ℹ️ [PDF] No form fields found, will use text overlay method');
        
        // If no form fields, use text overlay method
        await this.overlayTextData(pdfDoc, reservation, car, customer);
      }
      
      // Save the filled PDF
      console.log('🔄 [PDF Service] Saving PDF document...');
      const pdfBytes = await pdfDoc.save();
      console.log('✅ [PDF Service] PDF document saved successfully:', pdfBytes.length, 'bytes');

      const buffer = Buffer.from(pdfBytes);
      console.log('✅ [PDF Service] Buffer created successfully:', {
        bufferLength: buffer.length,
        isBuffer: Buffer.isBuffer(buffer)
      });
      console.log('✅ [PDF Service] Slovak rental agreement generated successfully');

      return buffer;

    } catch (error) {
      console.error('❌ [PDF Service] Error generating rental agreement:', error);
      console.error('❌ [PDF Service] Error stack:', error.stack);
      console.error('❌ [PDF Service] Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Prepare form data mapping from reservation
   */
  prepareFormData(reservation, car, customer) {
    const startDate = new Date(reservation.startDate);
    const endDate = new Date(reservation.endDate);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Calculate pricing - use actual dynamic pricing
    const basePrice = reservation.pricing?.subtotal || 0;
    
    // Calculate additional services from actual selected services and insurance
    let additionalServicesTotal = 0;
    
    // Add selected services total
    if (reservation.selectedServices && reservation.selectedServices.length > 0) {
      console.log(`📋 [PDF] Processing ${reservation.selectedServices.length} additional services:`);
      additionalServicesTotal += reservation.selectedServices.reduce((sum, service) => {
        const price = service.totalPrice || service.price || service.amount || 0;
        console.log(`💰 [PDF] Service ${service.name || 'Unknown'}: ${price}€`);
        return sum + price;
      }, 0);
    }
    
    // Add additional insurance total  
    if (reservation.selectedAdditionalInsurance && reservation.selectedAdditionalInsurance.length > 0) {
      console.log(`🛡️ [PDF] Processing ${reservation.selectedAdditionalInsurance.length} additional insurance options:`);
      additionalServicesTotal += reservation.selectedAdditionalInsurance.reduce((sum, insurance) => {
        // Try different price fields for insurance
        const price = insurance.calculatedPrice || insurance.totalPrice || insurance.price || insurance.amount || 0;
        console.log(`💰 [PDF] Additional insurance ${insurance.name || 'Unknown'}: ${price}€`);
        return sum + price;
      }, 0);
    }
    
    // Add extended insurance total
    if (reservation.selectedExtendedInsurance && reservation.selectedExtendedInsurance.length > 0) {
      console.log(`🛡️ [PDF] Processing ${reservation.selectedExtendedInsurance.length} extended insurance options:`);
      additionalServicesTotal += reservation.selectedExtendedInsurance.reduce((sum, insurance) => {
        // Try different price fields for insurance
        const price = insurance.calculatedPrice || insurance.totalPrice || insurance.price || insurance.amount || 0;
        console.log(`💰 [PDF] Extended insurance ${insurance.name || 'Unknown'}: ${price}€`);
        return sum + price;
      }, 0);
    }
    
    // Add any existing fees from pricing
    if (reservation.pricing?.fees && reservation.pricing.fees.length > 0) {
      additionalServicesTotal += reservation.pricing.fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    }
    
    // Ensure total price calculation is consistent
    // Either use the stored totalAmount or calculate base + services + insurance
    const totalPrice = reservation.pricing?.totalAmount || (basePrice + additionalServicesTotal);
    
    // Calculate actual daily rate from total pricing (more accurate than stored dailyRate)
    const actualDailyRate = days > 0 ? (basePrice / days) : (reservation.pricing?.dailyRate || 0);
    
    console.log('💰 [PDF PRICING] Days:', days);
    console.log('💰 [PDF PRICING] Base price (subtotal):', basePrice);
    console.log('💰 [PDF PRICING] Stored daily rate:', reservation.pricing?.dailyRate);
    console.log('💰 [PDF PRICING] Calculated daily rate:', actualDailyRate);
    console.log('💰 [PDF PRICING] Additional services total:', additionalServicesTotal);
    console.log('💰 [PDF PRICING] Stored total amount:', reservation.pricing?.totalAmount);
    console.log('💰 [PDF PRICING] Final total price:', totalPrice);
    console.log('💰 [PDF PRICING] Verification: Base + Services =', basePrice + additionalServicesTotal);
    
    // Customer address formatting for Slovak format
    const formatAddress = (address) => {
      if (!address) return 'Neuvedené';
      
      const parts = [
        address.street,
        address.city,
        address.zipCode,
        address.country || 'Slovensko'
      ].filter(part => part && part.trim());
      
      return parts.length > 0 ? parts.join(', ') : 'Neuvedené';
    };
    
    // Get ID number - try idNumber first, then licenseNumber as fallback
    const getIdNumber = (customer) => {
      return customer.idNumber || customer.licenseNumber || 'Neuvedené';
    };
    
    const formData = {
      // Customer information - Slovak field names
      'meno_najomcu': `${customer.firstName || 'Neuvedené'} ${customer.lastName || 'Neuvedené'}`,
      'adresa_najomcu': formatAddress(customer.address),
      'cislo_op': getIdNumber(customer),
      'telefon': customer.phone || 'Neuvedené',
      'email': customer.email || 'neuvedene@email.sk',
      
      // Vehicle information
      'meno_vozidla': `${car.brand || 'Neuvedené'} ${car.model || 'Neuvedené'}`,
      'ECV': car.registrationNumber || 'Neuvedené',
      'VIN': car.vin || 'Neuvedené',
      'rok_vyroby': car.year?.toString() || new Date().getFullYear().toString(),
      'farba': car.color || 'Neuvedená',
      
      // Rental dates
      'zaciatok_najmu': startDate.toLocaleDateString('sk-SK'),
      'koniec_najmu': endDate.toLocaleDateString('sk-SK'),
      
      // Pricing - use calculated dynamic daily rate
      'denna_sadzba': `${actualDailyRate.toFixed(2)} €`,
      'pocet_dni': days.toString(),
      'cena_bez_depozitu': `${basePrice.toFixed(2)} €`,
      'sluzby_priplatky': `${additionalServicesTotal.toFixed(2)} €`,
      'spolu_cena': `${totalPrice.toFixed(2)} €`,
      
      // Additional data
      'rezervacia_cislo': reservation.reservationNumber || reservation._id.toString().slice(-8),
      'datum_vytvorenia': new Date().toLocaleDateString('sk-SK'),
      'stav_rezervacie': this.getStatusInSlovak(reservation.status)
    };
    
    // Apply text normalization to all string values
    const normalizedFormData = {};
    for (const [key, value] of Object.entries(formData)) {
      normalizedFormData[key] = this.normalizeText(value);
    }
    
    return normalizedFormData;
  }

  /**
   * Fill form fields with data
   */
  async fillFormFields(form, formData) {
    const fields = form.getFields();
    
    // Try different field name variations
    const fieldVariations = {
      'meno_najomcu': ['meno_najomcu', 'meno najomcu', 'menoNajomcu', 'customer_name', 'tenant_name'],
      'adresa_najomcu': ['adresa_najomcu', 'adresa najomcu', 'adresaNajomcu', 'customer_address', 'tenant_address'],
      'cislo_op': ['cislo_op', 'cislo op', 'cisloOp', 'id_number', 'license_number'],
      'telefon': ['telefon', 'phone', 'telefon_cislo'],
      'email': ['email', 'email_address', 'elektronicka_posta'],
      'meno_vozidla': ['meno_vozidla', 'meno vozidla', 'menoVozidla', 'vehicle_name', 'car_name'],
      'ECV': ['ECV', 'ecv', 'registration', 'reg_number'],
      'VIN': ['VIN', 'vin', 'vin_number'],
      'rok_vyroby': ['rok_vyroby', 'rok vyroby', 'rokVyroby', 'year', 'manufacture_year'],
      'farba': ['farba', 'color', 'car_color'],
      'zaciatok_najmu': ['zaciatok_najmu', 'zaciatok najmu', 'zaciatokNajmu', 'start_date', 'rental_start'],
      'koniec_najmu': ['koniec_najmu', 'koniec najmu', 'koniecNajmu', 'end_date', 'rental_end'],
      'denna_sadzba': ['denna_sadzba', 'denna sadzba', 'dennaSadzba', 'daily_rate', 'rate_per_day'],
      'pocet_dni': ['pocet_dni', 'pocet dni', 'pocetDni', 'days', 'number_of_days'],
      'cena_bez_depozitu': ['cena_bez_depozitu', 'cena bez depozitu', 'cenaBezDepozitu', 'price_without_deposit', 'base_price'],
      'sluzby_priplatky': ['sluzby_priplatky', 'sluzby priplatky', 'sluzbyPriplatky', 'additional_services', 'extras'],
      'spolu_cena': ['spolu_cena', 'spolu cena', 'spoluCena', 'total_price', 'total_amount']
    };
    
    // Try to fill each field
    for (const [dataKey, value] of Object.entries(formData)) {
      const variations = fieldVariations[dataKey] || [dataKey];
      let fieldFound = false;
      
      for (const variation of variations) {
        try {
          // Try to find text field
          const textField = form.getTextField(variation);
          if (textField) {
            textField.setText(value);
            console.log(`✅ [PDF] Filled text field '${variation}' with: ${value}`);
            fieldFound = true;
            break;
          }
        } catch (error) {
          // Try to find dropdown field
          try {
            const dropdownField = form.getDropdown(variation);
            if (dropdownField) {
              dropdownField.select(value);
              console.log(`✅ [PDF] Selected dropdown field '${variation}' with: ${value}`);
              fieldFound = true;
              break;
            }
          } catch (error2) {
            // Field not found, continue
          }
        }
      }
      
      if (!fieldFound) {
        console.log(`⚠️ [PDF] Field not found for data: ${dataKey} = ${value}`);
      }
    }
  }

  /**
   * Overlay text data on PDF if no form fields are available
   */
  async overlayTextData(pdfDoc, reservation, car, customer) {
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const formData = this.prepareFormData(reservation, car, customer);
    
    // Define text positions (converted from top-left to bottom-left origin)
    // Original coordinates: top-left origin, max measured Y = 700
    // PDF A4 height ≈ 842 points, so Y = 842 - original_Y
    const textPositions = {
      'meno_najomcu': { x: 322, y: 770 },           // 842 - 68 = 774
      'adresa_najomcu': { x: 322, y: 746 },         // 842 - 96 = 746
      'cislo_op': { x: 322, y: 724 },               // 842 - 118 = 724
      'telefon': { x: 322, y: 701 },                // 842 - 141 = 701
      'email': { x: 322, y: 678 },                  // 842 - 161 = 681
      'meno_vozidla': { x: 34, y: 618 },            // 842 - 222 = 620
      'ECV': { x: 185, y: 618 },                    // 842 - 224 = 618
      'VIN': { x: 294, y: 618 },                    // 842 - 223 = 619
      'rok_vyroby': { x: 468, y: 618 },             // 842 - 224 = 618
      'farba': { x: 516, y: 618 },                  // 842 - 224 = 618
      'zaciatok_najmu': { x: 361, y: 581 },         // 842 - 261 = 581
      'koniec_najmu': { x: 470, y: 581 },           // 842 - 261 = 581
      'denna_sadzba': { x: 223, y: 542 },           // 842 - 300 = 542
      'pocet_dni': { x: 359, y: 542 },              // 842 - 300 = 542
      'cena_bez_depozitu': { x: 466, y: 542 },      // 842 - 300 = 542
      'sluzby_priplatky': { x: 466, y: 523 },       // 842 - 319 = 523
      'spolu_cena': { x: 466, y: 499 }              // 842 - 343 = 499
    };
    
    // Add text to PDF
    for (const [key, position] of Object.entries(textPositions)) {
      if (formData[key]) {
        const normalizedText = this.normalizeText(formData[key]);
        firstPage.drawText(normalizedText, {
          x: position.x,
          y: position.y,
          size: 10,
          font: font,
          color: rgb(0, 0, 0)
        });
        console.log(`✅ [PDF] Added text overlay '${key}' at (${position.x}, ${position.y}): ${normalizedText}`);
      }
    }
    
    console.log('✅ [PDF] Text overlay completed');
  }

  /**
   * Get status in Slovak
   */
  getStatusInSlovak(status) {
    const statusMap = {
      'pending': 'Čakajúca',
      'confirmed': 'Potvrdená',
      'ongoing': 'Prebiehajúca',
      'completed': 'Dokončená',
      'cancelled': 'Zrušená'
    };
    return statusMap[status] || status;
  }

  /**
   * Get available form fields from template
   */
  async getTemplateFields() {
    try {
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      return fields.map(field => ({
        name: field.getName(),
        type: field.constructor.name,
        isRequired: field.isRequired ? field.isRequired() : false
      }));
    } catch (error) {
      console.error('❌ [PDF] Error reading template fields:', error);
      return [];
    }
  }
}

module.exports = new PDFService(); 