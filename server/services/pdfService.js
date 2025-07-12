const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

class PDFService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/Zmlu o najme vozidla 2025.pdf');
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
      console.log('🔄 [PDF] Generating Slovak rental agreement...');
      
      // Read the template PDF
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      
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
      const pdfBytes = await pdfDoc.save();
      console.log('✅ [PDF] Slovak rental agreement generated successfully');
      
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error('❌ [PDF] Error generating rental agreement:', error);
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
    
    // Calculate pricing
    const basePrice = reservation.pricing?.subtotal || 0;
    const additionalServices = reservation.pricing?.fees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;
    const totalPrice = reservation.pricing?.totalAmount || 0;
    
    // Customer address formatting
    const address = customer.address ? 
      `${customer.address.street || ''}, ${customer.address.city || ''}, ${customer.address.zipCode || ''}, ${customer.address.country || 'Slovensko'}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',') : 
      'Neuvedené';
    
    return {
      // Customer information - Slovak field names
      'meno_najomcu': `${customer.firstName} ${customer.lastName}`,
      'adresa_najomcu': address,
      'cislo_op': customer.licenseNumber || 'Neuvedené',
      'telefon': customer.phone || 'Neuvedené',
      'email': customer.email || 'Neuvedené',
      
      // Vehicle information
      'meno_vozidla': `${car.brand} ${car.model}`,
      'ECV': car.registrationNumber || 'Neuvedené',
      'VIN': car.vin || 'Neuvedené',
      'rok_vyroby': car.year?.toString() || 'Neuvedené',
      'farba': car.color || 'Neuvedená',
      
      // Rental dates
      'zaciatok_najmu': startDate.toLocaleDateString('sk-SK'),
      'koniec_najmu': endDate.toLocaleDateString('sk-SK'),
      
      // Pricing
      'denna_sadzba': `${reservation.pricing?.dailyRate || 0} €`,
      'pocet_dni': days.toString(),
      'cena_bez_depozitu': `${basePrice.toFixed(2)} €`,
      'sluzby_priplatky': `${additionalServices.toFixed(2)} €`,
      'spolu_cena': `${totalPrice.toFixed(2)} €`,
      
      // Additional data
      'rezervacia_cislo': reservation.reservationNumber || reservation._id.toString().slice(-8),
      'datum_vytvorenia': new Date().toLocaleDateString('sk-SK'),
      'stav_rezervacie': this.getStatusInSlovak(reservation.status)
    };
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
    
    // Define text positions (you may need to adjust these based on your PDF layout)
    const textPositions = {
      'meno_najomcu': { x: 150, y: 750 },
      'adresa_najomcu': { x: 150, y: 720 },
      'telefon': { x: 150, y: 690 },
      'email': { x: 150, y: 660 },
      'meno_vozidla': { x: 150, y: 600 },
      'ECV': { x: 150, y: 570 },
      'rok_vyroby': { x: 150, y: 540 },
      'farba': { x: 150, y: 510 },
      'zaciatok_najmu': { x: 150, y: 450 },
      'koniec_najmu': { x: 350, y: 450 },
      'denna_sadzba': { x: 150, y: 420 },
      'pocet_dni': { x: 350, y: 420 },
      'spolu_cena': { x: 150, y: 350 }
    };
    
    // Add text to PDF
    for (const [key, position] of Object.entries(textPositions)) {
      if (formData[key]) {
        firstPage.drawText(formData[key], {
          x: position.x,
          y: position.y,
          size: 10,
          font: font,
          color: rgb(0, 0, 0)
        });
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