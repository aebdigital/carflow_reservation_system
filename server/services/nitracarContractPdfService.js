/**
 * NitraCar Dynamic Contract PDF Generator
 * Generates rental contracts from scratch without using templates
 * Uses Roboto font for proper Slovak diacritics support
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

class NitraCarContractPdfService {
  constructor() {
    // NitraCar logo path (from email templates)
    this.logoPath = path.join(__dirname, '../templates_nitracar/email/nitracarlogo.png');

    // QR code for terms and conditions
    this.qrCodePath = path.join(__dirname, '../templates_nitracar/email/qr_nitracar.png');

    // Font paths for Slovak diacritics support
    this.fontPath = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
    this.fontBoldPath = path.join(__dirname, '../fonts/Roboto-Bold.ttf');

    // Company details (static)
    this.companyInfo = {
      name: 'NITRA CAR s.r.o.',
      address: 'Štefánikova trieda 79',
      city: '949 01 Nitra',
      ico: '50 229 486',
      dic: '2120258502',
      email: 'info@nitra-car.sk',
      website: 'www.nitra-car.sk',
      phone: '+421 911 123 456'
    };
  }

  /**
   * Register custom fonts for Slovak diacritics support
   */
  registerFonts(doc) {
    // Register Roboto fonts if available
    if (fs.existsSync(this.fontPath) && fs.existsSync(this.fontBoldPath)) {
      doc.registerFont('Roboto', this.fontPath);
      doc.registerFont('Roboto-Bold', this.fontBoldPath);
      console.log('📄 [NITRACAR PDF] Custom fonts registered successfully');
      return true;
    } else {
      console.log('📄 [NITRACAR PDF] Custom fonts not found, using Helvetica (diacritics may not display correctly)');
      return false;
    }
  }

  /**
   * Generate NitraCar rental contract PDF
   * @param {Object} contractData - Contract data from database
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateContract(contractData) {
    return new Promise((resolve, reject) => {
      try {
        console.log('📄 [NITRACAR PDF] Starting dynamic contract generation');
        console.log('📄 [NITRACAR PDF] Contract number:', contractData.contractNumber);

        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 40, bottom: 40, left: 40, right: 40 },
          info: {
            Title: `Zmluva o prenájme vozidla - ${contractData.contractNumber}`,
            Author: 'NitraCar s.r.o.',
            Subject: 'Zmluva o prenájme motorového vozidla',
            Creator: 'CarFlow Reservation System'
          }
        });

        // Register custom fonts
        const hasCustomFonts = this.registerFonts(doc);
        this.fontRegular = hasCustomFonts ? 'Roboto' : 'Helvetica';
        this.fontBold = hasCustomFonts ? 'Roboto-Bold' : 'Helvetica-Bold';

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('📄 [NITRACAR PDF] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Generate the contract content
        this.generateHeader(doc, contractData);
        this.generateSection1_Prenajimatel(doc);
        this.generateSection2_Najomca(doc, contractData);
        this.generateSection3_PredmetNajmu(doc, contractData);
        this.generateSection4_DobaNajmu(doc, contractData);
        this.generateSection5_Najomne(doc, contractData);

        // Add page break before handover protocol
        doc.addPage();
        this.generateSection6_PreberaciProtokol(doc, contractData);
        this.generateSectionNotes(doc, contractData);
        this.generateSection7_Podpisy(doc, contractData);
        this.generateTermsAcceptance(doc);

        // Finalize the PDF
        doc.end();

      } catch (error) {
        console.error('📄 [NITRACAR PDF] Error generating contract:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate PDF header with logo and contract number
   */
  generateHeader(doc, contractData) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Try to add logo
    if (fs.existsSync(this.logoPath)) {
      try {
        doc.image(this.logoPath, doc.page.margins.left, 30, { width: 120 });
      } catch (e) {
        console.log('📄 [NITRACAR PDF] Could not load logo, using text instead');
        doc.fontSize(20).font(this.fontBold).text('NITRA CAR', doc.page.margins.left, 40);
      }
    } else {
      // Fallback to text logo
      doc.fontSize(20).font(this.fontBold).fillColor('#0891B2').text('NITRA CAR', doc.page.margins.left, 40);
    }

    // Contract number and date on the right (use reservation number)
    doc.fontSize(10).font(this.fontRegular).fillColor('black');
    doc.text(`Číslo zmluvy: ${contractData.reservationNumber || contractData.contractNumber || 'N/A'}`, doc.page.width - 200, 40, { width: 160, align: 'right' });
    doc.text(`Dátum: ${this.formatDate(new Date())}`, doc.page.width - 200, 70, { width: 160, align: 'right' });

    // Title - single line centered (reset x position to left margin first)
    doc.x = doc.page.margins.left;
    doc.y = 100;
    doc.fontSize(14).font(this.fontBold).fillColor('black');
    doc.text('ZMLUVA O PRENÁJME MOTOROVÉHO VOZIDLA', doc.page.margins.left, doc.y, { width: pageWidth, align: 'center' });

    // Sposob uhrady - blank for pen filling
    doc.moveDown(0.5);
    doc.fontSize(10).font(this.fontRegular);
    doc.text('Spôsob úhrady: _______________________', doc.page.margins.left, doc.y, { width: pageWidth, align: 'center' });

    doc.moveDown(1.5);
  }

  /**
   * Section I - Prenajímateľ (Lessor)
   */
  generateSection1_Prenajimatel(doc) {
    this.drawSectionHeaderLeft(doc, 'I. Prenajímateľ');

    const info = this.companyInfo;
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + 150;

    doc.fontSize(9).font(this.fontRegular);

    this.drawLabelValue(doc, 'Názov spoločnosti:', info.name, leftCol, rightCol);
    this.drawLabelValue(doc, 'Adresa:', `${info.address}, ${info.city}`, leftCol, rightCol);
    this.drawLabelValue(doc, 'IČO:', info.ico, leftCol, rightCol);
    this.drawLabelValue(doc, 'DIČ:', info.dic, leftCol, rightCol);
    this.drawLabelValue(doc, 'E-mail:', info.email, leftCol, rightCol);
    this.drawLabelValue(doc, 'Web:', info.website, leftCol, rightCol);
    this.drawLabelValue(doc, 'Telefón:', info.phone, leftCol, rightCol);

    doc.moveDown(1);
  }

  /**
   * Section II - Nájomca (Tenant/Customer)
   */
  generateSection2_Najomca(doc, contractData) {
    this.drawSectionHeaderLeft(doc, 'II. Nájomca');

    const customer = contractData.customer || {};
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + 150;

    doc.fontSize(9).font(this.fontRegular);

    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Neuvedené';
    const address = this.formatAddress(customer.address);

    this.drawLabelValue(doc, 'Meno / Názov:', fullName, leftCol, rightCol);
    this.drawLabelValue(doc, 'Bydlisko / Sídlo:', address, leftCol, rightCol);
    this.drawLabelValue(doc, 'Číslo OP / Pas:', customer.idNumber || 'Neuvedené', leftCol, rightCol);
    if (customer.rodneCislo) {
      this.drawLabelValue(doc, 'Rodné číslo:', customer.rodneCislo, leftCol, rightCol);
    }
    this.drawLabelValue(doc, 'Telefón:', customer.phone || 'Neuvedené', leftCol, rightCol);
    this.drawLabelValue(doc, 'E-mail:', customer.email || 'Neuvedené', leftCol, rightCol);

    doc.moveDown(1);
  }

  /**
   * Section III - Predmet nájmu (Vehicle)
   */
  generateSection3_PredmetNajmu(doc, contractData) {
    this.drawSectionHeaderLeft(doc, 'III. Predmet nájmu (Údaje o vozidle)');

    const vehicle = contractData.vehicle || {};
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + 150;

    doc.fontSize(9).font(this.fontRegular);

    const vehicleType = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Neuvedené';

    this.drawLabelValue(doc, 'Typ vozidla:', vehicleType, leftCol, rightCol);
    this.drawLabelValue(doc, 'EČV:', vehicle.registrationNumber || 'Neuvedené', leftCol, rightCol);
    this.drawLabelValue(doc, 'VIN:', vehicle.vin || 'Neuvedené', leftCol, rightCol);
    this.drawLabelValue(doc, 'Rok výroby:', vehicle.year?.toString() || 'Neuvedené', leftCol, rightCol);

    doc.moveDown(1);
  }

  /**
   * Section IV - Doba nájmu (Rental Period)
   */
  generateSection4_DobaNajmu(doc, contractData) {
    this.drawSectionHeaderLeft(doc, 'IV. Doba nájmu');

    const rental = contractData.rental || {};
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + 150;

    doc.fontSize(9).font(this.fontRegular);

    const startDateTime = this.formatDateTime(rental.startDate);
    const endDateTime = this.formatDateTime(rental.endDate);

    this.drawLabelValue(doc, 'Začiatok nájmu:', startDateTime, leftCol, rightCol);
    this.drawLabelValue(doc, 'Ukončenie nájmu:', endDateTime, leftCol, rightCol);
    this.drawLabelValue(doc, 'Počet dní:', rental.totalDays?.toString() || 'Neuvedené', leftCol, rightCol);
    this.drawLabelValue(doc, 'Miesto prevzatia:', rental.pickupLocation || 'Neuvedené', leftCol, rightCol);
    this.drawLabelValue(doc, 'Miesto vrátenia:', rental.returnLocation || 'Neuvedené', leftCol, rightCol);

    doc.moveDown(1);
  }

  /**
   * Section V - Nájomné (Rental Fee)
   */
  generateSection5_Najomne(doc, contractData) {
    this.drawSectionHeaderLeft(doc, 'V. Nájomné');

    const rental = contractData.rental || {};
    const rentalRules = contractData.rentalRules || {};
    const additionalServices = contractData.additionalServices || [];
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + 200;

    doc.fontSize(9).font(this.fontRegular);

    const dailyKmLimit = rentalRules.dailyKmLimit || 200;
    const totalDays = rental.totalDays || 1;
    const totalKmLimit = dailyKmLimit * totalDays;

    this.drawLabelValue(doc, 'Denná sadzba:', `${this.formatPrice(rental.dailyRate)} EUR`, leftCol, rightCol);
    this.drawLabelValue(doc, 'Kilometrový limit za deň:', `${dailyKmLimit} km`, leftCol, rightCol);
    this.drawLabelValue(doc, 'Celkovo km:', `${totalKmLimit} km`, leftCol, rightCol);
    this.drawLabelValue(doc, 'Sadzba nad limit:', `${this.formatPrice(rentalRules.excessKmFee || 0.25)} EUR/km`, leftCol, rightCol);

    // Additional services
    if (additionalServices.length > 0) {
      doc.moveDown(0.5);
      doc.font(this.fontBold).text('Služby a príplatky:', leftCol);
      doc.font(this.fontRegular);

      additionalServices.forEach(service => {
        const servicePrice = (service.price || 0) * (service.quantity || 1);
        doc.text(`  - ${service.name}: ${this.formatPrice(servicePrice)} EUR`, leftCol + 10);
      });
    }

    // Total calculation
    doc.moveDown(0.5);
    const servicesTotal = additionalServices.reduce((sum, s) => sum + ((s.price || 0) * (s.quantity || 1)), 0);
    const totalAmount = (rental.totalAmount || 0);

    doc.font(this.fontBold);
    this.drawLabelValue(doc, 'Spolu k úhrade:', `${this.formatPrice(totalAmount)} EUR`, leftCol, rightCol);
    doc.font(this.fontRegular);

    // Deposit info
    if (contractData.deposit) {
      doc.moveDown(0.3);
      this.drawLabelValue(doc, 'Depozit:', `${this.formatPrice(contractData.deposit)} EUR`, leftCol, rightCol);
    }

    doc.moveDown(1);
  }

  /**
   * Section VI - Preberací protokol (Handover Protocol)
   */
  generateSection6_PreberaciProtokol(doc, contractData) {
    this.drawSectionHeaderLeft(doc, 'VI. Preberací protokol');

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = (pageWidth - 20) / 2;
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + colWidth + 20;

    // Two-column layout
    doc.fontSize(10).font(this.fontBold);
    doc.text('Pri prevzatí vozidla:', leftCol, doc.y, { width: colWidth });
    doc.text('Pri vrátení vozidla:', rightCol, doc.y - 12, { width: colWidth });

    doc.moveDown(0.5);
    doc.fontSize(9).font(this.fontRegular);
    const startY = doc.y;

    // Left column - Handover (from lessor) - blank for pen filling
    let y = startY;
    y = this.drawBlankTextItem(doc, 'Poškodenia:', leftCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Stav PHM v nádrži:', leftCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Depozit uhradený:', leftCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Stav počítadla v km:', leftCol, y, colWidth);
    y += 25;
    doc.text('Podpis odovzdávajúceho: ________________', leftCol, y);
    y += 18;
    doc.text('Podpis preberajúceho: ________________', leftCol, y);

    // Right column - Return (from tenant) - blank for pen filling
    y = startY;
    y = this.drawBlankTextItem(doc, 'Poškodenia:', rightCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Stav PHM v nádrži:', rightCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Depozit vrátený:', rightCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Stav počítadla v km:', rightCol, y, colWidth);
    y += 25;
    doc.text('Podpis odovzdávajúceho: ________________', rightCol, y);
    y += 18;
    doc.text('Podpis preberajúceho: ________________', rightCol, y);

    doc.y = Math.max(doc.y, y + 30);
  }

  /**
   * Notes Section - Poznámky
   */
  generateSectionNotes(doc, contractData) {
    doc.moveDown(1.5);
    this.drawSectionHeaderLeft(doc, 'Poznámky');

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftCol = doc.page.margins.left;

    doc.fontSize(9).font(this.fontRegular);

    // Draw lines for handwritten notes
    const lineSpacing = 20;
    const numLines = 4;
    let y = doc.y + 5;

    for (let i = 0; i < numLines; i++) {
      doc.moveTo(leftCol, y)
         .lineTo(leftCol + pageWidth, y)
         .strokeColor('#cccccc')
         .lineWidth(0.5)
         .stroke();
      y += lineSpacing;
    }

    doc.y = y + 10;
  }

  /**
   * Section VII - Podpisy (Signatures)
   */
  generateSection7_Podpisy(doc, contractData) {
    doc.moveDown(1);
    this.drawSectionHeaderLeft(doc, 'VII. Podpisy zmluvných strán');

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / 2 - 20;
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + pageWidth / 2 + 10;

    doc.moveDown(1);
    const y = doc.y;

    // Left - Lessor signature
    doc.fontSize(9).font(this.fontRegular);
    doc.text('Za prenajímateľa:', leftCol, y);
    doc.moveDown(2);
    doc.text('_________________________________', leftCol);
    doc.text('Podpis', leftCol);

    // Right - Tenant signature
    doc.text('Nájomca:', rightCol, y);
    doc.y = y + 30;
    doc.text('_________________________________', rightCol);
    doc.text('Podpis', rightCol);

    // Date and place
    doc.moveDown(2);
    doc.text(`V Nitre, dňa ${this.formatDate(new Date())}`, leftCol);
  }

  /**
   * Terms acceptance section with QR code
   */
  generateTermsAcceptance(doc) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftCol = doc.page.margins.left;

    doc.moveDown(2);

    // Add QR code if available
    if (fs.existsSync(this.qrCodePath)) {
      try {
        // Center the QR code
        const qrSize = 80;
        const qrX = leftCol + (pageWidth - qrSize) / 2;
        doc.image(this.qrCodePath, qrX, doc.y, { width: qrSize });
        doc.y += qrSize + 10;
      } catch (e) {
        console.log('📄 [NITRACAR PDF] Could not load QR code:', e.message);
      }
    }

    // Terms acceptance text
    doc.fontSize(8).font(this.fontRegular).fillColor('#666666');
    doc.text(
      'Svojím podpisom nájomca potvrdzuje, že sa oboznámil s Podmienkami nájmu (dostupné po naskenovaní QR kódu) a súhlasí s nimi.',
      leftCol,
      doc.y,
      { width: pageWidth, align: 'center' }
    );
  }

  // Helper methods

  drawSectionHeaderLeft(doc, title) {
    doc.fontSize(11).font(this.fontBold).fillColor('#0891B2');
    doc.text(title, doc.page.margins.left, doc.y, { align: 'left' });
    doc.moveTo(doc.page.margins.left, doc.y)
       .lineTo(doc.page.width - doc.page.margins.right, doc.y)
       .strokeColor('#0891B2')
       .lineWidth(0.5)
       .stroke();
    doc.fillColor('black');
    doc.moveDown(0.5);
  }

  drawLabelValue(doc, label, value, leftCol, rightCol) {
    const y = doc.y;
    doc.font(this.fontBold).text(label, leftCol, y, { continued: false });
    doc.font(this.fontRegular).text(value || 'Neuvedené', rightCol, y);
  }

  drawCheckboxItem(doc, label, checked, x, y) {
    const checkbox = checked ? '[X]' : '[ ]';
    doc.text(`${checkbox} ${label}`, x, y);
    return y + 14;
  }

  drawTextItem(doc, label, value, x, y, width) {
    doc.font(this.fontBold).text(label, x, y, { continued: true, width: width });
    doc.font(this.fontRegular).text(` ${value || 'Neuvedené'}`);
    return doc.y + 2;
  }

  drawBlankTextItem(doc, label, x, y, width) {
    doc.font(this.fontBold).text(label, x, y, { continued: true, width: width });
    doc.font(this.fontRegular).text(' _______________________');
    return doc.y + 8; // Extra space for pen filling
  }

  formatDate(date) {
    if (!date) return 'Neuvedené';
    const d = new Date(date);
    return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatDateTime(date) {
    if (!date) return 'Neuvedené';
    const d = new Date(date);
    return `${d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`;
  }

  formatPrice(price) {
    if (price === null || price === undefined) return '0.00';
    return Number(price).toFixed(2);
  }

  formatAddress(address) {
    if (!address) return 'Neuvedené';
    if (typeof address === 'string') return address;

    const parts = [
      address.street,
      address.zipCode,
      address.city,
      address.country
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : 'Neuvedené';
  }

  getFuelLevelText(level) {
    const levels = {
      'empty': 'Prázdna',
      'quarter': '1/4',
      'third': '1/3',
      'half': '1/2',
      'three-quarters': '3/4',
      'full': 'Plná (1/1)'
    };
    return levels[level] || level || '______';
  }

  getPaymentMethodText(method) {
    const methods = {
      'cash': 'Hotovosť',
      'hotovost': 'Hotovosť',
      'card': 'Karta',
      'karta': 'Karta',
      'invoice': 'Faktúra',
      'faktura': 'Faktúra',
      'prevod': 'Bankový prevod',
      'stripe': 'Online platba (Stripe)'
    };
    return methods[method?.toLowerCase()] || method || 'Neuvedené';
  }
}

module.exports = new NitraCarContractPdfService();
