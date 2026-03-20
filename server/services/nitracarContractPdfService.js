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
      name: 'VP Invest s.r.o.',
      address: 'Štefánikova trieda 79',
      city: '949 01 Nitra',
      ico: '50 229 486',
      dic: '2120258502',
      email: 'info@nitra-car.sk',
      website: 'www.nitra-car.sk',
      phone: '+421 911 123 456'
    };

    // Brand colors
    this.colors = {
      primary: '#0891B2',
      primaryDark: '#065F73',
      accent: '#22D3EE',
      dark: '#1a1a1a',
      medium: '#555555',
      light: '#888888',
      border: '#d0d0d0',
      bgLight: '#f7f9fb',
      bgSection: '#eef6f8',
      white: '#ffffff'
    };
  }

  /**
   * Register custom fonts for Slovak diacritics support
   */
  registerFonts(doc) {
    if (fs.existsSync(this.fontPath) && fs.existsSync(this.fontBoldPath)) {
      doc.registerFont('Roboto', this.fontPath);
      doc.registerFont('Roboto-Bold', this.fontBoldPath);
      console.log('[NITRACAR PDF] Custom fonts registered successfully');
      return true;
    } else {
      console.log('[NITRACAR PDF] Custom fonts not found, using Helvetica');
      return false;
    }
  }

  /**
   * Check remaining space on page and add new page if needed
   */
  ensureSpace(doc, requiredHeight) {
    if (doc.y + requiredHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      return true; // new page was added
    }
    return false;
  }

  /**
   * Generate NitraCar rental contract PDF
   */
  async generateContract(contractData) {
    return new Promise((resolve, reject) => {
      try {
        console.log('[NITRACAR PDF] Starting dynamic contract generation');
        console.log('[NITRACAR PDF] Contract number:', contractData.contractNumber);

        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 40, bottom: 40, left: 45, right: 45 },
          autoFirstPage: true,
          info: {
            Title: `Zmluva o prenájme vozidla - ${contractData.contractNumber}`,
            Author: 'VP Invest s.r.o.',
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
          console.log('[NITRACAR PDF] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Page 1: Contract details
        this.generateHeader(doc, contractData);
        this.generateSection1_Prenajimatel(doc);
        this.generateSection2_Najomca(doc, contractData);
        this.generateSection2a_DruhyVodic(doc, contractData);
        this.generateSection3_PredmetNajmu(doc, contractData);
        this.generateSection4_DobaNajmu(doc, contractData);
        this.generateSection5_Najomne(doc, contractData);

        // Handover protocol & signatures (flows naturally, ensureSpace handles page breaks)
        this.generateSection6_PreberaciProtokol(doc, contractData);
        this.generateSection7_PreberaciePodpisy(doc, contractData);
        this.generateSectionNotes(doc, contractData);
        this.generateSection8_Podpisy(doc, contractData);
        this.generateTermsAcceptance(doc);
        this.generateFooter(doc);

        doc.end();

      } catch (error) {
        console.error('[NITRACAR PDF] Error generating contract:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate PDF header with logo and contract number
   */
  generateHeader(doc, contractData) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    // Top accent bar
    doc.save();
    doc.rect(0, 0, doc.page.width, 6).fill(this.colors.primary);
    doc.restore();

    // Logo
    if (fs.existsSync(this.logoPath)) {
      try {
        doc.image(this.logoPath, left, 20, { width: 130 });
      } catch (e) {
        doc.fontSize(22).font(this.fontBold).fillColor(this.colors.primary)
          .text('NITRA CAR', left, 28, { width: pageWidth, lineBreak: false });
      }
    } else {
      doc.fontSize(22).font(this.fontBold).fillColor(this.colors.primary)
        .text('NITRA CAR', left, 28, { width: pageWidth, lineBreak: false });
    }

    // Contract info box on the right
    const boxW = 185;
    const boxX = right - boxW;
    const boxY = 18;
    doc.save();
    doc.roundedRect(boxX, boxY, boxW, 52, 4)
      .fill(this.colors.bgSection);
    doc.restore();

    doc.fontSize(8).font(this.fontRegular).fillColor(this.colors.light)
      .text('ČÍSLO ZMLUVY', boxX + 12, boxY + 8, { width: boxW - 24, lineBreak: false });
    doc.fontSize(12).font(this.fontBold).fillColor(this.colors.primary)
      .text(contractData.contractNumber || contractData.reservationNumber || 'N/A', boxX + 12, boxY + 19, { width: boxW - 24, lineBreak: false });
    doc.fontSize(8).font(this.fontRegular).fillColor(this.colors.light)
      .text(this.formatDate(new Date()), boxX + 12, boxY + 36, { width: boxW - 24, lineBreak: false });

    // Title
    doc.y = 90;
    doc.fontSize(16).font(this.fontBold).fillColor(this.colors.dark);
    doc.text('ZMLUVA O PRENÁJME MOTOROVÉHO VOZIDLA', left, doc.y, {
      width: pageWidth,
      align: 'center',
      lineBreak: false
    });

    // Decorative line under title
    const lineY = doc.y + 5;
    const lineW = 80;
    const lineX = left + (pageWidth - lineW) / 2;
    doc.moveTo(lineX, lineY).lineTo(lineX + lineW, lineY)
      .strokeColor(this.colors.accent).lineWidth(2).stroke();

    doc.y = lineY + 15;
  }

  /**
   * Page 2 mini header
   */
  generatePage2Header(doc, contractData) {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    // Top accent bar
    doc.save();
    doc.rect(0, 0, doc.page.width, 4).fill(this.colors.primary);
    doc.restore();

    // Compact header
    doc.fontSize(9).font(this.fontBold).fillColor(this.colors.primary)
      .text('NITRA-CAR', left, 14, { width: 200, lineBreak: false });
    doc.fontSize(8).font(this.fontRegular).fillColor(this.colors.light)
      .text(`Zmluva č. ${contractData.contractNumber || ''}`, right - 160, 14, { width: 160, align: 'right', lineBreak: false });

    // Thin separator
    doc.moveTo(left, 28).lineTo(right, 28)
      .strokeColor(this.colors.border).lineWidth(0.5).stroke();

    doc.y = 38;
  }

  /**
   * Section I - Prenajimatel (Lessor)
   */
  generateSection1_Prenajimatel(doc) {
    this.drawSectionHeader(doc, 'I.', 'Prenajímateľ');

    const info = this.companyInfo;
    const rows = [
      ['Názov spoločnosti', info.name],
      ['Adresa', `${info.address}, ${info.city}`],
      ['IČO', info.ico],
      ['DIČ', info.dic],
      ['E-mail', info.email],
      ['Web', info.website],
      ['Telefón', info.phone]
    ];

    this.drawInfoTable(doc, rows);
    doc.moveDown(0.6);
  }

  /**
   * Section II - Najomca (Tenant/Customer)
   */
  generateSection2_Najomca(doc, contractData) {
    this.drawSectionHeader(doc, 'II.', 'Nájomca');

    const customer = contractData.customer || {};
    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Neuvedené';
    const address = this.formatAddress(customer.address);

    const rows = [
      ['Meno / Názov', fullName],
      ['Bydlisko / Sídlo', address],
      ['Doklad totožnosti', this.getIdDocumentTypeText(customer.idDocumentType)],
      ['Číslo dokladu', customer.idNumber || 'Neuvedené']
    ];

    if (customer.rodneCislo) {
      rows.push(['Rodné číslo', customer.rodneCislo]);
    }

    rows.push(
      ['Telefón', customer.phone || 'Neuvedené'],
      ['E-mail', customer.email || 'Neuvedené']
    );

    this.drawInfoTable(doc, rows);
    doc.moveDown(0.6);
  }

  /**
   * Section II.a - Druhy vodic (Second Driver) - optional
   */
  generateSection2a_DruhyVodic(doc, contractData) {
    const secondDriver = contractData.secondDriver;
    if (!secondDriver || (!secondDriver.firstName && !secondDriver.lastName)) return;

    this.drawSectionHeader(doc, 'II.a', 'Druhý vodič');

    const driverName = `${secondDriver.firstName || ''} ${secondDriver.lastName || ''}`.trim() || 'Neuvedené';

    const rows = [
      ['Meno a priezvisko', driverName],
      ['Doklad totožnosti', this.getIdDocumentTypeText(secondDriver.idDocumentType)],
      ['Číslo dokladu', secondDriver.idNumber || 'Neuvedené'],
      ['Číslo vodičského preukazu', secondDriver.licenseNumber || 'Neuvedené']
    ];

    if (secondDriver.dateOfBirth) {
      rows.push(['Dátum narodenia', this.formatDate(secondDriver.dateOfBirth)]);
    }

    rows.push(['Telefón', secondDriver.phone || 'Neuvedené']);

    this.drawInfoTable(doc, rows);
    doc.moveDown(0.6);
  }

  /**
   * Section III - Predmet najmu (Vehicle)
   */
  generateSection3_PredmetNajmu(doc, contractData) {
    this.drawSectionHeader(doc, 'III.', 'Predmet nájmu');

    const vehicle = contractData.vehicle || {};
    const vehicleType = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Neuvedené';

    const rows = [
      ['Typ vozidla', vehicleType],
      ['EČV', vehicle.registrationNumber || 'Neuvedené'],
      ['VIN', vehicle.vin || 'Neuvedené'],
      ['Rok výroby', vehicle.year?.toString() || 'Neuvedené']
    ];

    this.drawInfoTable(doc, rows);
    doc.moveDown(0.6);
  }

  /**
   * Section IV - Doba najmu (Rental Period)
   */
  generateSection4_DobaNajmu(doc, contractData) {
    this.drawSectionHeader(doc, 'IV.', 'Doba nájmu');

    const rental = contractData.rental || {};

    const rows = [
      ['Dátum prevzatia', this.formatDate(rental.startDate)],
      ['Čas prevzatia', this.formatTime(rental.startDate)],
      ['Dátum vrátenia', this.formatDate(rental.endDate)],
      ['Čas vrátenia', this.formatTime(rental.endDate)],
      ['Počet dní', rental.totalDays?.toString() || 'Neuvedené'],
      ['Miesto prevzatia', rental.pickupLocation || 'Neuvedené'],
      ['Miesto vrátenia', rental.returnLocation || 'Neuvedené']
    ];

    this.drawInfoTable(doc, rows);
    doc.moveDown(0.6);
  }

  /**
   * Section V - Najomne (Rental Fee)
   */
  generateSection5_Najomne(doc, contractData) {
    this.drawSectionHeader(doc, 'V.', 'Nájomné');

    const rental = contractData.rental || {};
    const rentalRules = contractData.rentalRules || {};
    const additionalServices = contractData.additionalServices || [];
    const left = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const dailyKmLimit = rentalRules.dailyKmLimit || 200;
    const totalDays = rental.totalDays || 1;
    const totalKmLimit = dailyKmLimit * totalDays;

    const rows = [
      ['Denná sadzba', `${this.formatPrice(rental.dailyRate)} EUR`],
      ['Kilometrový limit za deň', `${dailyKmLimit} km`],
      ['Celkovo km', `${totalKmLimit} km`],
      ['Sadzba nad limit', `${this.formatPrice(rentalRules.excessKmFee || 0.25)} EUR/km`]
    ];

    this.drawInfoTable(doc, rows);

    // Additional services
    if (additionalServices.length > 0) {
      this.ensureSpace(doc, 30);
      doc.moveDown(0.4);
      doc.fontSize(9).font(this.fontBold).fillColor(this.colors.dark)
        .text('Služby a príplatky:', left, doc.y, { width: pageWidth, lineBreak: false });
      doc.moveDown(0.3);
      doc.font(this.fontRegular).fillColor(this.colors.medium);

      additionalServices.forEach(service => {
        this.ensureSpace(doc, 14);
        const servicePrice = (service.price || 0) * (service.quantity || 1);
        doc.fontSize(9).text(`    ${service.name}: ${this.formatPrice(servicePrice)} EUR`, left, doc.y, { width: pageWidth, lineBreak: false });
        doc.y += 14;
      });
    }

    // Total
    this.ensureSpace(doc, 50);
    doc.moveDown(0.4);
    const totalAmount = rental.totalAmount || 0;
    const totalY = doc.y;

    // Total highlight box
    doc.save();
    doc.roundedRect(left, totalY - 3, pageWidth, 20, 3)
      .fill(this.colors.bgSection);
    doc.restore();

    doc.fontSize(10).font(this.fontBold).fillColor(this.colors.primary)
      .text(`Spolu k úhrade:  ${this.formatPrice(totalAmount)} EUR`, left + 10, totalY + 1, { width: pageWidth - 20, lineBreak: false });

    doc.fillColor(this.colors.dark);
    doc.y = totalY + 22;

    // Deposit
    if (contractData.deposit) {
      doc.fontSize(9).font(this.fontRegular);
      this.drawLabelValue(doc, 'Depozit:', `${this.formatPrice(contractData.deposit)} EUR`, left, left + 200);
    }

    // Payment method
    doc.fontSize(9).font(this.fontRegular);
    this.drawLabelValue(doc, 'Spôsob úhrady:', this.getPaymentMethodText(contractData.paymentMethod), left, left + 200);
  }

  /**
   * Section VI - Preberaci protokol (Handover Protocol)
   */
  generateSection6_PreberaciProtokol(doc, contractData) {
    this.drawSectionHeader(doc, 'VI.', 'Preberací protokol');

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = (pageWidth - 30) / 2;
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + colWidth + 30;

    // Column headers with background
    const headerY = doc.y;
    doc.save();
    doc.roundedRect(leftCol, headerY - 2, colWidth, 18, 3).fill(this.colors.primary);
    doc.restore();
    doc.save();
    doc.roundedRect(rightCol, headerY - 2, colWidth, 18, 3).fill(this.colors.primaryDark);
    doc.restore();

    doc.fontSize(9).font(this.fontBold).fillColor(this.colors.white)
      .text('PREVZATIE VOZIDLA', leftCol + 8, headerY + 2, { width: colWidth - 16, lineBreak: false });
    doc.fontSize(9).font(this.fontBold).fillColor(this.colors.white)
      .text('VRÁTENIE VOZIDLA', rightCol + 8, headerY + 2, { width: colWidth - 16, lineBreak: false });

    doc.fillColor(this.colors.dark);
    doc.y = headerY + 22;

    doc.fontSize(9).font(this.fontRegular);
    const startY = doc.y;

    // Left column
    let y = startY;
    y = this.drawBlankField(doc, 'Stav PHM v nádrži:', leftCol, y, colWidth);
    y = this.drawBlankField(doc, 'Depozit uhradený:', leftCol, y, colWidth);
    y = this.drawBlankField(doc, 'Stav počítadla v km:', leftCol, y, colWidth);
    y = this.drawBlankField(doc, 'Poškodenia:', leftCol, y, colWidth);

    // Right column
    y = startY;
    y = this.drawBlankField(doc, 'Stav PHM v nádrži:', rightCol, y, colWidth);
    y = this.drawBlankField(doc, 'Depozit vrátený:', rightCol, y, colWidth);
    y = this.drawBlankField(doc, 'Stav počítadla v km:', rightCol, y, colWidth);
    y = this.drawBlankField(doc, 'Poškodenia:', rightCol, y, colWidth);

    doc.y = Math.max(doc.y, y + 10);
  }

  /**
   * Section VII - Podpisy preberacieho protokolu (Handover Signatures)
   */
  generateSection7_PreberaciePodpisy(doc, contractData) {
    this.ensureSpace(doc, 120);
    doc.moveDown(0.6);
    this.drawSectionHeader(doc, 'VII.', 'Podpisy preberacieho protokolu');

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = (pageWidth - 30) / 2;
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + colWidth + 30;

    // Column sub-headers
    const subY = doc.y;
    doc.fontSize(9).font(this.fontBold).fillColor(this.colors.primary);
    doc.text('Pri prevzatí vozidla:', leftCol, subY, { width: colWidth, lineBreak: false });
    doc.text('Pri vrátení vozidla:', rightCol, subY, { width: colWidth, lineBreak: false });
    doc.fillColor(this.colors.dark);

    doc.y = subY + 18;
    const y = doc.y;

    doc.fontSize(9).font(this.fontRegular);

    // Left column signatures
    this.drawSignatureLine(doc, 'Za prenajímateľa', leftCol, y, colWidth - 20);
    this.drawSignatureLine(doc, 'Za nájomcu', leftCol, y + 40, colWidth - 20);

    // Right column signatures
    this.drawSignatureLine(doc, 'Za prenajímateľa', rightCol, y, colWidth - 20);
    this.drawSignatureLine(doc, 'Za nájomcu', rightCol, y + 40, colWidth - 20);

    doc.y = y + 85;
  }

  /**
   * Notes Section - Poznamky
   */
  generateSectionNotes(doc, contractData) {
    this.ensureSpace(doc, 120);
    doc.moveDown(0.5);
    this.drawSectionHeader(doc, '', 'Poznámky');

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftCol = doc.page.margins.left;

    doc.fontSize(9).font(this.fontRegular);

    const lineSpacing = 22;
    const numLines = 5;
    let y = doc.y + 5;

    for (let i = 0; i < numLines; i++) {
      doc.moveTo(leftCol, y)
         .lineTo(leftCol + pageWidth, y)
         .strokeColor(this.colors.border)
         .lineWidth(0.5)
         .dash(3, { space: 3 })
         .stroke();
      y += lineSpacing;
    }
    doc.undash();

    doc.y = y + 5;
  }

  /**
   * Section VIII - Podpisy zmluvnych stran (Contract Signatures)
   */
  generateSection8_Podpisy(doc, contractData) {
    this.ensureSpace(doc, 120);
    doc.moveDown(0.6);
    this.drawSectionHeader(doc, 'VIII.', 'Podpisy zmluvných strán');

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / 2 - 30;
    const leftCol = doc.page.margins.left;
    const rightCol = doc.page.margins.left + pageWidth / 2 + 15;

    doc.moveDown(0.3);

    // Date and place
    doc.fontSize(9).font(this.fontRegular).fillColor(this.colors.medium)
      .text(`V Nitre, dňa ${this.formatDate(new Date())}`, leftCol, doc.y, { width: pageWidth, lineBreak: false });

    doc.y += 18;
    const y = doc.y;

    // Left - Lessor signature
    this.drawSignatureBlock(doc, 'Za prenajímateľa', this.companyInfo.name, leftCol, y, colWidth);

    // Right - Tenant signature
    const customer = contractData.customer || {};
    const tenantName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    this.drawSignatureBlock(doc, 'Nájomca', tenantName, rightCol, y, colWidth);

    doc.y = y + 70;
  }

  /**
   * Terms acceptance section with QR code
   */
  generateTermsAcceptance(doc) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftCol = doc.page.margins.left;

    this.ensureSpace(doc, 110);
    doc.moveDown(0.8);

    // Thin separator
    doc.moveTo(leftCol + pageWidth * 0.2, doc.y)
      .lineTo(leftCol + pageWidth * 0.8, doc.y)
      .strokeColor(this.colors.border).lineWidth(0.5).stroke();

    doc.y += 8;

    // QR code
    if (fs.existsSync(this.qrCodePath)) {
      try {
        const qrSize = 60;
        const qrX = leftCol + (pageWidth - qrSize) / 2;
        doc.image(this.qrCodePath, qrX, doc.y, { width: qrSize });
        doc.y += qrSize + 6;
      } catch (e) {
        console.log('[NITRACAR PDF] Could not load QR code:', e.message);
      }
    }

    doc.fontSize(7.5).font(this.fontRegular).fillColor(this.colors.light);
    doc.text(
      'Svojím podpisom nájomca potvrdzuje, že sa oboznámil s Podmienkami nájmu (dostupné po naskenovaní QR kódu) a súhlasí s nimi.',
      leftCol,
      doc.y,
      { width: pageWidth, align: 'center', lineBreak: true }
    );
  }

  /**
   * Page footer - renders inline after content
   */
  generateFooter(doc) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    doc.y += 8;
    doc.fontSize(7).font(this.fontRegular).fillColor(this.colors.light)
      .text(
        `${this.companyInfo.name}  |  ${this.companyInfo.email}  |  ${this.companyInfo.website}`,
        left, doc.y,
        { width: pageWidth, align: 'center', lineBreak: false }
      );
  }

  // ─── Drawing Helpers ───────────────────────────────────────────────

  /**
   * Draw styled section header with number badge
   */
  drawSectionHeader(doc, number, title) {
    const left = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Ensure space for header + at least one content row
    this.ensureSpace(doc, 45);

    const y = doc.y;

    if (number) {
      // Number badge
      const badgeW = 28;
      const badgeH = 16;
      doc.save();
      doc.roundedRect(left, y - 1, badgeW, badgeH, 3).fill(this.colors.primary);
      doc.restore();
      doc.fontSize(9).font(this.fontBold).fillColor(this.colors.white)
        .text(number, left, y + 1, { width: badgeW, align: 'center', lineBreak: false });

      // Title text
      doc.fontSize(11).font(this.fontBold).fillColor(this.colors.dark)
        .text(title, left + badgeW + 8, y + 1, { width: pageWidth - badgeW - 8, lineBreak: false });
    } else {
      doc.fontSize(11).font(this.fontBold).fillColor(this.colors.dark)
        .text(title, left, y + 1, { width: pageWidth, lineBreak: false });
    }

    // Underline
    const lineY = y + 18;
    doc.moveTo(left, lineY).lineTo(left + pageWidth, lineY)
      .strokeColor(this.colors.accent).lineWidth(1).stroke();

    doc.fillColor(this.colors.dark);
    doc.y = lineY + 8;
  }

  /**
   * Draw a styled key-value info table
   */
  drawInfoTable(doc, rows) {
    const left = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const labelWidth = 180;
    const valueWidth = pageWidth - labelWidth - 16;
    const rowHeight = 16;

    rows.forEach((row, i) => {
      // Check if we need a new page
      this.ensureSpace(doc, rowHeight);

      const y = doc.y;

      // Alternating row background
      if (i % 2 === 0) {
        doc.save();
        doc.rect(left, y - 2, pageWidth, rowHeight).fill(this.colors.bgLight);
        doc.restore();
      }

      doc.fontSize(9).font(this.fontBold).fillColor(this.colors.medium)
        .text(row[0] + ':', left + 8, y + 1, { width: labelWidth, lineBreak: false });
      doc.fontSize(9).font(this.fontRegular).fillColor(this.colors.dark)
        .text(row[1] || 'Neuvedené', left + labelWidth + 8, y + 1, { width: valueWidth, lineBreak: false });

      doc.y = y + rowHeight;
    });
  }

  drawLabelValue(doc, label, value, leftCol, rightCol) {
    const y = doc.y;
    const pageRight = doc.page.width - doc.page.margins.right;
    doc.font(this.fontBold).fillColor(this.colors.medium)
      .text(label, leftCol, y, { width: rightCol - leftCol, lineBreak: false });
    doc.font(this.fontRegular).fillColor(this.colors.dark)
      .text(value || 'Neuvedené', rightCol, y, { width: pageRight - rightCol, lineBreak: false });
    doc.y = y + 14;
  }

  /**
   * Draw a blank field with dotted underline for handwriting
   */
  drawBlankField(doc, label, x, y, width) {
    doc.font(this.fontBold).fillColor(this.colors.medium).fontSize(8.5)
      .text(label, x + 5, y + 2, { width: width - 10, lineBreak: false });

    const lineY = y + 16;
    doc.moveTo(x + 5, lineY)
      .lineTo(x + width - 10, lineY)
      .strokeColor(this.colors.border)
      .lineWidth(0.5)
      .dash(2, { space: 2 })
      .stroke();
    doc.undash();

    return y + 26;
  }

  /**
   * Draw a signature line with label underneath
   */
  drawSignatureLine(doc, label, x, y, width) {
    doc.moveTo(x, y + 20).lineTo(x + width, y + 20)
      .strokeColor(this.colors.border).lineWidth(0.5).stroke();

    doc.fontSize(8).font(this.fontRegular).fillColor(this.colors.light)
      .text(label, x, y + 24, { width: width, align: 'center', lineBreak: false });
  }

  /**
   * Draw a full signature block with label, name placeholder, and line
   */
  drawSignatureBlock(doc, role, name, x, y, width) {
    doc.fontSize(9).font(this.fontBold).fillColor(this.colors.primary)
      .text(role + ':', x, y, { width: width, lineBreak: false });

    // Signature line
    const lineY = y + 40;
    doc.moveTo(x, lineY).lineTo(x + width, lineY)
      .strokeColor(this.colors.dark).lineWidth(0.5).stroke();

    // Name and "Podpis" label
    doc.fontSize(8).font(this.fontRegular).fillColor(this.colors.light)
      .text(name || '', x, lineY + 4, { width: width, align: 'center', lineBreak: false });
    doc.fontSize(7).fillColor(this.colors.border)
      .text('podpis', x, lineY + 15, { width: width, align: 'center', lineBreak: false });
  }

  // ─── Formatting Helpers ────────────────────────────────────────────

  formatDate(date) {
    if (!date) return 'Neuvedené';
    const d = new Date(date);
    return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Bratislava' });
  }

  formatDateTime(date) {
    if (!date) return 'Neuvedené';
    const d = new Date(date);
    return `${d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`;
  }

  formatTime(date) {
    if (!date) return 'Neuvedené';
    const d = new Date(date);
    return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' });
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
      'stripe': 'Online platba (Stripe)',
      'online': 'Online',
      'qr_kod': 'QR kód'
    };
    return methods[method?.toLowerCase()] || method || 'Neuvedené';
  }

  getIdDocumentTypeText(type) {
    const types = {
      'op': 'Občiansky preukaz',
      'pas': 'Pas',
      'pobyt': 'Doklad o povolení na pobyt'
    };
    return types[type?.toLowerCase()] || type || 'Občiansky preukaz';
  }
}

module.exports = new NitraCarContractPdfService();
