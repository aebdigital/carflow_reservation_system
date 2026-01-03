/**
 * NitraCar Dynamic Contract PDF Generator
 * Generates rental contracts from scratch without using templates
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

class NitraCarContractPdfService {
  constructor() {
    // NitraCar logo path
    this.logoPath = path.join(__dirname, '../templates_nitracar/nitracar-logo.png');

    // Company details (static)
    this.companyInfo = {
      name: 'NITRA CAR s.r.o.',
      address: 'Stefanikova trieda 79',
      city: '949 01 Nitra',
      ico: '50 229 486',
      dic: '2120258502',
      email: 'info@nitra-car.sk',
      website: 'www.nitra-car.sk',
      phone: '+421 911 123 456'
    };
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
            Title: `Zmluva o prenajme vozidla - ${contractData.contractNumber}`,
            Author: 'NitraCar s.r.o.',
            Subject: 'Zmluva o prenajme motoroveho vozidla',
            Creator: 'CarFlow Reservation System'
          }
        });

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
        this.generateSection7_Podpisy(doc, contractData);

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
        doc.fontSize(20).font('Helvetica-Bold').text('NITRA CAR', doc.page.margins.left, 40);
      }
    } else {
      // Fallback to text logo
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#0891B2').text('NITRA CAR', doc.page.margins.left, 40);
    }

    // Contract number on the right
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text(`Cislo zmluvy: ${contractData.contractNumber || 'N/A'}`, doc.page.width - 200, 40, { width: 160, align: 'right' });
    doc.text(`Datum: ${this.formatDate(new Date())}`, doc.page.width - 200, 55, { width: 160, align: 'right' });

    // Title
    doc.moveDown(3);
    doc.fontSize(16).font('Helvetica-Bold').fillColor('black');
    doc.text('ZMLUVA O PRENAJME MOTOROVEHO VOZIDLA', { align: 'center' });

    // Subtitle with payment method
    if (contractData.paymentMethod) {
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Sposob uhrady: ${this.getPaymentMethodText(contractData.paymentMethod)}`, { align: 'center' });
    }

    doc.moveDown(1.5);
  }

  /**
   * Section I - Prenajimatel (Lessor)
   */
  generateSection1_Prenajimatel(doc) {
    this.drawSectionHeader(doc, 'I. Prenajimatel');

    const info = this.companyInfo;
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + 150;

    doc.fontSize(9).font('Helvetica');

    this.drawLabelValue(doc, 'Nazov spolocnosti:', info.name, leftCol, rightCol);
    this.drawLabelValue(doc, 'Adresa:', `${info.address}, ${info.city}`, leftCol, rightCol);
    this.drawLabelValue(doc, 'ICO:', info.ico, leftCol, rightCol);
    this.drawLabelValue(doc, 'DIC:', info.dic, leftCol, rightCol);
    this.drawLabelValue(doc, 'E-mail:', info.email, leftCol, rightCol);
    this.drawLabelValue(doc, 'Web:', info.website, leftCol, rightCol);
    this.drawLabelValue(doc, 'Telefon:', info.phone, leftCol, rightCol);

    doc.moveDown(1);
  }

  /**
   * Section II - Najomca (Tenant/Customer)
   */
  generateSection2_Najomca(doc, contractData) {
    this.drawSectionHeader(doc, 'II. Najomca');

    const customer = contractData.customer || {};
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + 150;

    doc.fontSize(9).font('Helvetica');

    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Neuvedene';
    const address = this.formatAddress(customer.address);

    this.drawLabelValue(doc, 'Meno / Nazov:', fullName, leftCol, rightCol);
    this.drawLabelValue(doc, 'Bydlisko / Sidlo:', address, leftCol, rightCol);
    this.drawLabelValue(doc, 'Cislo OP / Pas:', customer.idNumber || 'Neuvedene', leftCol, rightCol);
    this.drawLabelValue(doc, 'Telefon:', customer.phone || 'Neuvedene', leftCol, rightCol);
    this.drawLabelValue(doc, 'E-mail:', customer.email || 'Neuvedene', leftCol, rightCol);

    doc.moveDown(1);
  }

  /**
   * Section III - Predmet najmu (Vehicle)
   */
  generateSection3_PredmetNajmu(doc, contractData) {
    this.drawSectionHeader(doc, 'III. Predmet najmu (Udaje o vozidle)');

    const vehicle = contractData.vehicle || {};
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + 150;

    doc.fontSize(9).font('Helvetica');

    const vehicleType = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Neuvedene';

    this.drawLabelValue(doc, 'Typ vozidla:', vehicleType, leftCol, rightCol);
    this.drawLabelValue(doc, 'ECV:', vehicle.registrationNumber || 'Neuvedene', leftCol, rightCol);
    this.drawLabelValue(doc, 'VIN:', vehicle.vin || 'Neuvedene', leftCol, rightCol);
    this.drawLabelValue(doc, 'Rok vyroby:', vehicle.year?.toString() || 'Neuvedene', leftCol, rightCol);

    doc.moveDown(1);
  }

  /**
   * Section IV - Doba najmu (Rental Period)
   */
  generateSection4_DobaNajmu(doc, contractData) {
    this.drawSectionHeader(doc, 'IV. Doba najmu');

    const rental = contractData.rental || {};
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + 150;

    doc.fontSize(9).font('Helvetica');

    const startDateTime = this.formatDateTime(rental.startDate);
    const endDateTime = this.formatDateTime(rental.endDate);

    this.drawLabelValue(doc, 'Zaciatok najmu:', startDateTime, leftCol, rightCol);
    this.drawLabelValue(doc, 'Ukoncenie najmu:', endDateTime, leftCol, rightCol);
    this.drawLabelValue(doc, 'Pocet dni:', rental.totalDays?.toString() || 'Neuvedene', leftCol, rightCol);
    this.drawLabelValue(doc, 'Miesto prevzatia:', rental.pickupLocation || 'Neuvedene', leftCol, rightCol);
    this.drawLabelValue(doc, 'Miesto vratenia:', rental.returnLocation || 'Neuvedene', leftCol, rightCol);

    doc.moveDown(1);
  }

  /**
   * Section V - Najomne (Rental Fee)
   */
  generateSection5_Najomne(doc, contractData) {
    this.drawSectionHeader(doc, 'V. Najomne');

    const rental = contractData.rental || {};
    const rentalRules = contractData.rentalRules || {};
    const additionalServices = contractData.additionalServices || [];
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + 200;

    doc.fontSize(9).font('Helvetica');

    const dailyKmLimit = rentalRules.dailyKmLimit || 200;
    const totalDays = rental.totalDays || 1;
    const totalKmLimit = dailyKmLimit * totalDays;

    this.drawLabelValue(doc, 'Denna sadzba:', `${this.formatPrice(rental.dailyRate)} EUR`, leftCol, rightCol);
    this.drawLabelValue(doc, 'Kilometrovy limit za den:', `${dailyKmLimit} km`, leftCol, rightCol);
    this.drawLabelValue(doc, 'Celkovo km:', `${totalKmLimit} km`, leftCol, rightCol);
    this.drawLabelValue(doc, 'Sadzba nad limit:', `${this.formatPrice(rentalRules.excessKmFee || 0.25)} EUR/km`, leftCol, rightCol);

    // Additional services
    if (additionalServices.length > 0) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Sluzby a priplatky:', leftCol);
      doc.font('Helvetica');

      additionalServices.forEach(service => {
        const servicePrice = (service.price || 0) * (service.quantity || 1);
        doc.text(`  - ${service.name}: ${this.formatPrice(servicePrice)} EUR`, leftCol + 10);
      });
    }

    // Total calculation
    doc.moveDown(0.5);
    const servicesTotal = additionalServices.reduce((sum, s) => sum + ((s.price || 0) * (s.quantity || 1)), 0);
    const totalAmount = (rental.totalAmount || 0);

    doc.font('Helvetica-Bold');
    this.drawLabelValue(doc, 'Spolu k uhrade:', `${this.formatPrice(totalAmount)} EUR`, leftCol, rightCol);
    doc.font('Helvetica');

    // Deposit info
    if (contractData.deposit) {
      doc.moveDown(0.3);
      this.drawLabelValue(doc, 'Depozit:', `${this.formatPrice(contractData.deposit)} EUR`, leftCol, rightCol);
    }

    doc.moveDown(1);
  }

  /**
   * Section VI - Preberaci protokol (Handover Protocol)
   */
  generateSection6_PreberaciProtokol(doc, contractData) {
    this.drawSectionHeaderLeft(doc, 'VI. Preberaci protokol');

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = (pageWidth - 20) / 2;
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + colWidth + 20;

    // Two-column layout
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Pri prevzati vozidla:', leftCol, doc.y, { width: colWidth });
    doc.text('Pri vrateni vozidla:', rightCol, doc.y - 12, { width: colWidth });

    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    const startY = doc.y;

    // Left column - Handover (from lessor) - blank for pen filling
    let y = startY;
    y = this.drawBlankTextItem(doc, 'Poskodenia:', leftCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Stav PHM v nadrzi:', leftCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Depozit uhradeny:', leftCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Stav pocitadla v km:', leftCol, y, colWidth);
    y += 25;
    doc.text('Podpis odovzdavajuceho: ________________', leftCol, y);
    y += 18;
    doc.text('Podpis preberajuceho: ________________', leftCol, y);

    // Right column - Return (from tenant) - blank for pen filling
    y = startY;
    y = this.drawBlankTextItem(doc, 'Poskodenia:', rightCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Stav PHM v nadrzi:', rightCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Depozit vrateny:', rightCol, y, colWidth);
    y = this.drawBlankTextItem(doc, 'Stav pocitadla v km:', rightCol, y, colWidth);
    y += 25;
    doc.text('Podpis odovzdavajuceho: ________________', rightCol, y);
    y += 18;
    doc.text('Podpis preberajuceho: ________________', rightCol, y);

    doc.y = Math.max(doc.y, y + 30);
  }

  /**
   * Section VII - Podpisy (Signatures)
   */
  generateSection7_Podpisy(doc, contractData) {
    doc.moveDown(2);
    this.drawSectionHeaderLeft(doc, 'VII. Podpisy zmluvnych stran');

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / 2 - 20;
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + pageWidth / 2 + 10;

    doc.moveDown(1);
    const y = doc.y;

    // Left - Lessor signature
    doc.fontSize(9).font('Helvetica');
    doc.text('Za prenajimatel:', leftCol, y);
    doc.moveDown(2);
    doc.text('_________________________________', leftCol);
    doc.text('Podpis a peciatka', leftCol);

    // Right - Tenant signature
    doc.text('Najomca:', rightCol, y);
    doc.y = y + 30;
    doc.text('_________________________________', rightCol);
    doc.text('Podpis', rightCol);

    // Date and place
    doc.moveDown(2);
    doc.text(`V Nitre, dna ${this.formatDate(new Date())}`, leftCol);
  }

  // Helper methods

  drawSectionHeader(doc, title) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0891B2');
    doc.text(title);
    doc.moveTo(doc.page.margins.left, doc.y)
       .lineTo(doc.page.width - doc.page.margins.right, doc.y)
       .strokeColor('#0891B2')
       .lineWidth(0.5)
       .stroke();
    doc.fillColor('black');
    doc.moveDown(0.5);
  }

  drawSectionHeaderLeft(doc, title) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0891B2');
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
    doc.font('Helvetica-Bold').text(label, leftCol, y, { continued: false });
    doc.font('Helvetica').text(value || 'Neuvedene', rightCol, y);
  }

  drawCheckboxItem(doc, label, checked, x, y) {
    const checkbox = checked ? '[X]' : '[ ]';
    doc.text(`${checkbox} ${label}`, x, y);
    return y + 14;
  }

  drawTextItem(doc, label, value, x, y, width) {
    doc.font('Helvetica-Bold').text(label, x, y, { continued: true, width: width });
    doc.font('Helvetica').text(` ${value || 'Neuvedene'}`);
    return doc.y + 2;
  }

  drawBlankTextItem(doc, label, x, y, width) {
    doc.font('Helvetica-Bold').text(label, x, y, { continued: true, width: width });
    doc.font('Helvetica').text(' _______________________');
    return doc.y + 8; // Extra space for pen filling
  }

  formatDate(date) {
    if (!date) return 'Neuvedene';
    const d = new Date(date);
    return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatDateTime(date) {
    if (!date) return 'Neuvedene';
    const d = new Date(date);
    return `${d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`;
  }

  formatPrice(price) {
    if (price === null || price === undefined) return '0.00';
    return Number(price).toFixed(2);
  }

  formatAddress(address) {
    if (!address) return 'Neuvedene';
    if (typeof address === 'string') return address;

    const parts = [
      address.street,
      address.zipCode,
      address.city,
      address.country
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : 'Neuvedene';
  }

  getFuelLevelText(level) {
    const levels = {
      'empty': 'Prazdna',
      'quarter': '1/4',
      'third': '1/3',
      'half': '1/2',
      'three-quarters': '3/4',
      'full': 'Plna (1/1)'
    };
    return levels[level] || level || '______';
  }

  getPaymentMethodText(method) {
    const methods = {
      'cash': 'Hotovost',
      'hotovost': 'Hotovost',
      'card': 'Karta',
      'karta': 'Karta',
      'invoice': 'Faktura',
      'faktura': 'Faktura',
      'prevod': 'Bankovy prevod',
      'stripe': 'Online platba (Stripe)'
    };
    return methods[method?.toLowerCase()] || method || 'Neuvedene';
  }
}

module.exports = new NitraCarContractPdfService();
