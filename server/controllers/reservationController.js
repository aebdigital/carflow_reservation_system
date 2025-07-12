const Reservation = require('../models/Reservation');
const Car = require('../models/Car');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { DiscountCode } = require('../models/WebsiteSettings');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const PDFDocument = require('pdfkit');

// @desc    Get all reservations (tenant-scoped)
// @route   GET /api/reservations
// @access  Private/Staff
const getReservations = asyncHandler(async (req, res, next) => {
  // Start with tenant filter
  const baseQuery = { tenantId: req.user.tenantId };

  // Copy req.query and merge with tenant filter
  const reqQuery = { ...req.query };

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit', 'populate'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify({ ...baseQuery, ...reqQuery });

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource with tenant filter
  let query = Reservation.find(JSON.parse(queryStr));

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Populate
  if (req.query.populate) {
    const populateFields = req.query.populate.split(',');
    populateFields.forEach(field => {
      if (field === 'customer') {
        query = query.populate('customer', 'firstName lastName email phone licenseNumber');
      } else if (field === 'car') {
        query = query.populate('car', 'brand model year registrationNumber dailyRate images status');
      } else if (field === 'payment') {
        query = query.populate('payment');
      } else {
        query = query.populate(field);
      }
    });
  } else {
    // Default population
    query = query.populate('customer', 'firstName lastName email phone')
                 .populate('car', 'brand model year registrationNumber images')
                 .populate('payment', 'status amount paymentMethod');
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Reservation.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Execute query
  const reservations = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: reservations.length,
    pagination,
    data: reservations
  });
});

// @desc    Get single reservation (tenant-scoped)
// @route   GET /api/reservations/:id
// @access  Private
const getReservation = asyncHandler(async (req, res, next) => {
  const reservation = await Reservation.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  })
    .populate('customer')
    .populate('car')
    .populate('payment')
    .populate('createdBy', 'firstName lastName email')
    .populate('lastModifiedBy', 'firstName lastName email')
    .populate('checkIn.staffMember', 'firstName lastName')
    .populate('checkOut.staffMember', 'firstName lastName');

  if (!reservation) {
    return next(new AppError(`Rezervácia s ID ${req.params.id} nebola nájdená`, 404));
  }

  // Check if user owns the reservation or is staff
  if (req.user.role === 'customer' && reservation.customer._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Nemáte oprávnenie na prístup k tejto rezervácii', 403));
  }

  res.status(200).json({
    success: true,
    data: reservation
  });
});

// @desc    Create new reservation (tenant-scoped)
// @route   POST /api/reservations
// @access  Private
const createReservation = asyncHandler(async (req, res, next) => {
  const {
    customer,
    car,
    startDate,
    endDate,
    pickupLocation,
    dropoffLocation,
    additionalDrivers,
    specialRequests,
    discountCode
  } = req.body;

  // Validate car exists and is available (tenant-scoped)
  const carDoc = await Car.findOne({ 
    _id: car, 
    tenantId: req.user.tenantId 
  });
  if (!carDoc) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  if (!carDoc.isAvailableForBooking()) {
    return next(new AppError('Vozidlo nie je dostupné na rezerváciu', 400));
  }

  // Validate customer exists (tenant-scoped)
  const customerDoc = await User.findOne({ 
    _id: customer, 
    tenantId: req.user.tenantId 
  });
  if (!customerDoc) {
    return next(new AppError('Zákazník nebol nájdený', 404));
  }

  // Check for overlapping reservations (tenant-scoped)
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const overlappingReservations = await Reservation.find({
    car: car,
    tenantId: req.user.tenantId,
    $or: [
      { startDate: { $lte: end }, endDate: { $gte: start } }
    ],
    status: { $in: ['pending', 'confirmed', 'ongoing'] }
  });
  
  if (overlappingReservations.length > 0) {
    return next(new AppError('Vozidlo nie je dostupné pre vybrané dátumy', 400));
  }

  // Calculate pricing
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const dailyRate = carDoc.dailyRate;
  const subtotal = carDoc.calculateRate(days);
  const taxes = 0; // 🔧 REMOVED TAX CALCULATION - No taxes added in admin
  
  // Initialize pricing object
  let pricing = {
    dailyRate,
    totalDays: days,
    subtotal,
    taxes,
    discounts: [],
    totalAmount: subtotal + taxes // Just subtotal since taxes = 0
  };

  let appliedDiscountCodes = [];

  // Handle discount code if provided
  if (discountCode) {
    const discountCodeDoc = await DiscountCode.findOne({
      code: discountCode.toUpperCase(),
      tenantId: req.user.tenantId
    });

    if (!discountCodeDoc) {
      return next(new AppError('Neplatný zľavový kód', 400));
    }

    // Validate discount code
    if (!discountCodeDoc.isValid()) {
      return next(new AppError('Zľavový kód je neplatný alebo vypršal', 400));
    }

    // Check if customer can use this code
    const canUse = discountCodeDoc.canBeUsedBy(customerDoc);
    if (!canUse.valid) {
      return next(new AppError(canUse.reason, 400));
    }

    // Calculate discount
    const discountResult = discountCodeDoc.calculateDiscount(
      subtotal, 
      days, 
      carDoc.category
    );

    if (discountResult.reason) {
      return next(new AppError(discountResult.reason, 400));
    }

    // Apply discount
    const discountAmount = discountResult.discount;
    
    pricing.discounts.push({
      name: `Zľavový kód: ${discountCodeDoc.code}`,
      amount: discountAmount,
      percentage: discountCodeDoc.discountType === 'percentage' ? discountCodeDoc.discountValue : null,
      description: discountCodeDoc.description || `Zľava ${discountCodeDoc.discountValue}${discountCodeDoc.discountType === 'percentage' ? '%' : '€'}`,
      discountCode: discountCodeDoc._id,
      code: discountCodeDoc.code
    });

    appliedDiscountCodes.push({
      discountCode: discountCodeDoc._id,
      code: discountCodeDoc.code,
      discountAmount: discountAmount
    });

    // Recalculate total amount
    pricing.totalAmount = subtotal + taxes - discountAmount;
  }

  const reservationData = {
    customer,
    car,
    startDate: start,
    endDate: end,
    pickupLocation,
    dropoffLocation,
    pricing,
    appliedDiscountCodes,
    additionalDrivers,
    specialRequests,
    tenantId: req.user.tenantId,
    createdBy: req.user._id
  };

  const reservation = await Reservation.create(reservationData);

  // 🆕 Generate bySquare QR payment codes for admin reservations
  try {
    const bySquareService = require('../services/bySquareService');
    
    if (bySquareService.isConfigured()) {
      console.log('🔄 [QR] Generating bySquare QR codes for admin reservation...');
      
      const qrResult = await bySquareService.generateReservationQR(reservation, carDoc, customerDoc);
      
      if (qrResult.success && qrResult.qrCodes) {
        // Update reservation with QR codes
        reservation.qrCodes = {
          payBySquare: qrResult.qrCodes.payBySquare,
          qrPlatbaCz: qrResult.qrCodes.qrPlatbaCz,
          invoiceBySquare: qrResult.qrCodes.invoiceBySquare,
          generatedAt: new Date(),
          lastUpdated: new Date(),
          isActive: true,
          amount: pricing.totalAmount,
          paymentNote: `Car rental: ${carDoc.brand} ${carDoc.model} (${start.toISOString().split('T')[0]} - ${end.toISOString().split('T')[0]})`
        };
        
        await reservation.save();
        console.log('✅ [QR] bySquare QR codes generated and saved for admin reservation');
      } else {
        console.warn('⚠️ [QR] Failed to generate bySquare QR codes:', qrResult.error);
      }
    } else {
      console.log('ℹ️ [QR] bySquare not configured, skipping QR generation');
    }
  } catch (qrError) {
    console.error('❌ [QR] Error generating QR codes for admin reservation:', qrError.message);
    // Don't fail the reservation if QR generation fails
  }

  // Update discount code usage if applied
  if (appliedDiscountCodes.length > 0) {
    for (const appliedCode of appliedDiscountCodes) {
      await DiscountCode.findByIdAndUpdate(
        appliedCode.discountCode,
        {
          $inc: { currentUsageCount: 1 },
          $push: {
            usedBy: {
              customer: customerDoc._id,
              reservation: reservation._id,
              discountApplied: appliedCode.discountAmount,
              usedAt: new Date()
            }
          }
        }
      );
    }
  }

  // Update car stats but don't change status to booked
  await Car.findOneAndUpdate(
    { _id: car, tenantId: req.user.tenantId },
    {
    $inc: { 
      totalBookings: 1,
      totalRevenue: pricing.totalAmount
    }
    }
  );

  // Update customer stats
  await User.findByIdAndUpdate(customer, {
    $inc: { totalBookings: 1, totalSpent: pricing.totalAmount }
  });

  // Populate the response
  await reservation.populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'car', select: 'brand model year registrationNumber images' },
    { path: 'appliedDiscountCodes.discountCode', select: 'code description discountType discountValue' }
  ]);

  res.status(201).json({
    success: true,
    data: reservation
  });
});

// @desc    Update reservation
// @route   PUT /api/reservations/:id
// @access  Private/Staff
const updateReservation = asyncHandler(async (req, res, next) => {
  let reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    return next(new AppError(`Rezervácia s ID ${req.params.id} nebola nájdená`, 404));
  }

  // Check authorization
  if (req.user.role === 'customer' && reservation.customer.toString() !== req.user._id.toString()) {
    return next(new AppError('Nemáte oprávnenie na aktualizáciu tejto rezervácie', 403));
  }

  // Validate date changes if provided
  if (req.body.startDate || req.body.endDate) {
    const newStartDate = req.body.startDate ? new Date(req.body.startDate) : reservation.startDate;
    const newEndDate = req.body.endDate ? new Date(req.body.endDate) : reservation.endDate;

    if (newStartDate >= newEndDate) {
      return next(new AppError('Dátum ukončenia musí byť po dátume začatia', 400));
    }

    // Check for overlapping reservations (excluding current reservation)
    const overlappingReservations = await Reservation.findOverlapping(
      reservation.car,
      newStartDate,
      newEndDate,
      reservation._id
    );

    if (overlappingReservations.length > 0) {
      return next(new AppError('Vozidlo nie je dostupné pre vybrané dátumy', 400));
    }

    // Recalculate pricing if dates changed
    if (req.body.startDate || req.body.endDate) {
      const car = await Car.findById(reservation.car);
      const days = Math.ceil((newEndDate - newStartDate) / (1000 * 60 * 60 * 24));
      const subtotal = car.calculateRate(days);
      const taxes = 0; // 🔧 REMOVED TAX CALCULATION - No taxes added in admin
      const totalAmount = subtotal + taxes;

      req.body.pricing = {
        ...reservation.pricing,
        totalDays: days,
        subtotal,
        taxes,
        totalAmount
      };
    }
  }

  req.body.lastModifiedBy = req.user._id;

  reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'car', select: 'brand model year registrationNumber images' },
    { path: 'payment' }
  ]);

  res.status(200).json({
    success: true,
    data: reservation
  });
});

// @desc    Cancel reservation
// @route   PUT /api/reservations/:id/cancel
// @access  Private
const cancelReservation = asyncHandler(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    return next(new AppError(`Rezervácia s ID ${req.params.id} nebola nájdená`, 404));
  }

  // Check authorization
  if (req.user.role === 'customer' && reservation.customer.toString() !== req.user._id.toString()) {
    return next(new AppError('Nemáte oprávnenie na zrušenie tejto rezervácie', 403));
  }

  if (!reservation.canBeCancelled()) {
    return next(new AppError('Rezervácia nemôže byť zrušená', 400));
  }

  // Update reservation status
  reservation.status = 'cancelled';
  reservation.lastModifiedBy = req.user._id;
  reservation.notes = req.body.reason || 'Zrušená uživateľom';
  await reservation.save();

  // Update car status back to available
  await Car.findByIdAndUpdate(reservation.car, { status: 'active' });

  // If payment exists, process refund (demo mode)
  if (reservation.payment) {
    const payment = await Payment.findById(reservation.payment);
    if (payment && payment.canBeRefunded()) {
      // In demo mode, just mark as refunded
      payment.status = 'refunded';
      payment.refunds.push({
        refundId: `demo-refund-${Date.now()}`,
        amount: payment.amount,
        reason: 'Rezervácia zrušená',
        status: 'succeeded',
        processedAt: new Date()
      });
      await payment.save();
    }
  }

  res.status(200).json({
    success: true,
    data: reservation
  });
});

// @desc    Check-in reservation
// @route   PUT /api/reservations/:id/checkin
// @access  Private/Staff
const checkInReservation = asyncHandler(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    return next(new AppError(`Rezervácia s ID ${req.params.id} nebola nájdená`, 404));
  }

  if (reservation.status !== 'confirmed') {
    return next(new AppError('Len potvrdené rezervácie je možné overiť', 400));
  }

  const { mileage, fuelLevel, condition, notes, photos } = req.body;

  reservation.checkIn = {
    date: new Date(),
    mileage,
    fuelLevel,
    condition,
    notes,
    photos: photos || [],
    staffMember: req.user._id
  };

  reservation.status = 'ongoing';
  reservation.lastModifiedBy = req.user._id;

  await reservation.save();

  res.status(200).json({
    success: true,
    data: reservation
  });
});

// @desc    Check-out reservation
// @route   PUT /api/reservations/:id/checkout
// @access  Private/Staff
const checkOutReservation = asyncHandler(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    return next(new AppError(`Rezervácia s ID ${req.params.id} nebola nájdená`, 404));
  }

  if (reservation.status !== 'ongoing') {
    return next(new AppError('Len prebiehajúce rezervácie je možné overiť', 400));
  }

  const { mileage, fuelLevel, condition, notes, photos, additionalCharges } = req.body;

  reservation.checkOut = {
    date: new Date(),
    mileage,
    fuelLevel,
    condition,
    notes,
    photos: photos || [],
    additionalCharges: additionalCharges || [],
    staffMember: req.user._id
  };

  reservation.status = 'completed';
  reservation.lastModifiedBy = req.user._id;

  await reservation.save();

  // Update car status and mileage
  await Car.findByIdAndUpdate(reservation.car, { 
    status: 'active',
    mileage: {
      current: mileage,
      lastUpdated: new Date(),
      updatedBy: req.user._id
    }
  });

  // Update car revenue and booking count
  await Car.findByIdAndUpdate(reservation.car, {
    $inc: { 
      totalBookings: 1,
      totalRevenue: reservation.pricing.totalAmount 
    }
  });

  res.status(200).json({
    success: true,
    data: reservation
  });
});

// @desc    Get reservation statistics
// @route   GET /api/reservations/stats
// @access  Private/Staff
const getReservationStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  let matchStage = {};
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const stats = await Reservation.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalReservations: { $sum: 1 },
        pendingReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        confirmedReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        ongoingReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] }
        },
        completedReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalRevenue: { $sum: '$pricing.totalAmount' },
        averageReservationValue: { $avg: '$pricing.totalAmount' }
      }
    }
  ]);

  const monthlyStats = await Reservation.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 },
        revenue: { $sum: '$pricing.totalAmount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {
        totalReservations: 0,
        pendingReservations: 0,
        confirmedReservations: 0,
        ongoingReservations: 0,
        completedReservations: 0,
        cancelledReservations: 0,
        totalRevenue: 0,
        averageReservationValue: 0
      },
      monthly: monthlyStats
    }
  });
});

// @desc    Generate reservation contract PDF
// @route   GET /api/reservations/:id/contract
// @access  Private
const generateReservationContract = asyncHandler(async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address licenseNumber')
      .populate('car', 'brand model year registrationNumber category mileage vin fuelType transmission features dailyRate')
      .populate('createdBy', 'firstName lastName')
      .populate('payment', 'status amount paymentMethod');

    if (!reservation) {
      return next(new AppError(`Rezervacia s ID ${req.params.id} nebola najdena`, 404));
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    
    // Set response headers
    const isPreviewing = req.query.preview === 'true';
    if (isPreviewing) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="potvrdenie-objednavky-' + reservation._id + '.pdf"');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="potvrdenie-objednavky-' + reservation._id + '.pdf"');
    }

    doc.pipe(res);

    // Page dimensions
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - (2 * margin);
    let yPos = margin;

    // Helper functions for better layout
    const addBox = (x, y, width, height, fillColor = '#F8F9FA', strokeColor = '#E0E0E0') => {
      doc.rect(x, y, width, height).fillAndStroke(fillColor, strokeColor);
    };

    const addLine = (x1, y1, x2, y2, color = '#E0E0E0') => {
      doc.strokeColor(color).moveTo(x1, y1).lineTo(x2, y2).stroke();
    };

    // HEADER SECTION - Compact
    // Company logo and title
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1976D2').text('CarFlow', margin, yPos);
    doc.fontSize(12).font('Helvetica').fillColor('#666666').text('System spravy prenajmu vozidiel', margin, yPos + 30);
    
    // Document info - right aligned and compact
    const docInfoX = pageWidth - 200;
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1976D2').text('POTVRDENIE OBJEDNAVKY', docInfoX, yPos, { align: 'right' });
    doc.fontSize(12).font('Helvetica').fillColor('#333333').text(`Cislo objednavky: RES${reservation._id.toString().slice(-8)}`, docInfoX, yPos + 25, { align: 'right' });
    doc.fontSize(12).font('Helvetica').fillColor('#333333').text(`Datum vytvorenia: ${new Date(reservation.createdAt).toLocaleDateString('sk-SK')}`, docInfoX, yPos + 40, { align: 'right' });

    yPos += 75;
    
    // Divider line
    addLine(margin, yPos, pageWidth - margin, yPos, '#1976D2');
    yPos += 20;

    // CUSTOMER INFORMATION - Compact
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text('INFORMACIE O ZAKAZNIKOVI', margin, yPos);
    yPos += 20;

    if (reservation.customer) {
      const customer = reservation.customer;
      addBox(margin, yPos, contentWidth, 80, '#F8F9FA', '#E0E0E0');
      
      // Left column
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Meno a priezvisko:', margin + 15, yPos + 15);
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text(`${customer.firstName} ${customer.lastName}`, margin + 15, yPos + 30);
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Email:', margin + 15, yPos + 45);
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text(customer.email, margin + 15, yPos + 60);
      
      // Right column
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Telefon:', margin + contentWidth / 2, yPos + 15);
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text(customer.phone || 'Neuvedene', margin + contentWidth / 2, yPos + 30);
      
      if (customer.licenseNumber) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Vodicsky preukaz:', margin + contentWidth / 2, yPos + 45);
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text(customer.licenseNumber, margin + contentWidth / 2, yPos + 60);
      }
    }

    yPos += 100;

    // VEHICLE INFORMATION - Compact
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text('INFORMACIE O VOZIDLE', margin, yPos);
    yPos += 20;

    if (reservation.car) {
      const car = reservation.car;
      addBox(margin, yPos, contentWidth, 80, '#F8F9FA', '#E0E0E0');
      
      // Vehicle title
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#333333').text(`${car.brand} ${car.model} (${car.year})`, margin + 15, yPos + 15);
      
      // Left column
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Kategoria:', margin + 15, yPos + 35);
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text(car.category || 'Neuvedena', margin + 100, yPos + 35);
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('ECV:', margin + 15, yPos + 50);
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text(car.registrationNumber || 'Neuvedene', margin + 100, yPos + 50);
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Denna sadzba:', margin + 15, yPos + 65);
      doc.fontSize(11).font('Helvetica').fillColor('#1976D2').text(`${car.dailyRate} EUR/den`, margin + 100, yPos + 65);
      
      // Right column
      if (car.vin) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('VIN:', margin + contentWidth / 2, yPos + 35);
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text(car.vin, margin + contentWidth / 2 + 40, yPos + 35);
      }
      
      if (car.fuelType) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Palivo:', margin + contentWidth / 2, yPos + 50);
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text(car.fuelType, margin + contentWidth / 2 + 40, yPos + 50);
      }
      
      if (car.transmission) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Prevodovka:', margin + contentWidth / 2, yPos + 65);
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text(car.transmission, margin + contentWidth / 2 + 70, yPos + 65);
      }
    }

    yPos += 100;

    // RESERVATION DETAILS - Compact
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text('DETAILY REZERVACIE', margin, yPos);
    yPos += 20;

    const startDate = new Date(reservation.startDate);
    const endDate = new Date(reservation.endDate);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    addBox(margin, yPos, contentWidth, 60, '#F8F9FA', '#E0E0E0');
    
    // Left column
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Datum prevzatia:', margin + 15, yPos + 15);
    doc.fontSize(11).font('Helvetica').fillColor('#666666').text(startDate.toLocaleDateString('sk-SK'), margin + 15, yPos + 30);
    
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Datum vratenia:', margin + 15, yPos + 45);
    doc.fontSize(11).font('Helvetica').fillColor('#666666').text(endDate.toLocaleDateString('sk-SK'), margin + 15, yPos + 60);
    
    // Right column
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Doba prenajmu:', margin + contentWidth / 2, yPos + 15);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1976D2').text(`${duration} ${duration === 1 ? 'den' : duration < 5 ? 'dni' : 'dni'}`, margin + contentWidth / 2, yPos + 30);
    
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Stav rezervacie:', margin + contentWidth / 2, yPos + 45);
    const statusTexts = { 
      pending: 'Cakajuca', 
      confirmed: 'Potvrdena', 
      ongoing: 'Prebiehajuca', 
      completed: 'Dokoncena', 
      cancelled: 'Zrusena' 
    };
    doc.fontSize(11).font('Helvetica').fillColor('#1976D2').text(statusTexts[reservation.status] || reservation.status, margin + contentWidth / 2, yPos + 60);

    yPos += 80;

    // PICKUP AND RETURN LOCATIONS - Side by side, compact
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text('MIESTA PREVZATIA A VRATENIA', margin, yPos);
    yPos += 20;

    const locationBoxWidth = (contentWidth - 20) / 2;
    
    // Pickup location
    addBox(margin, yPos, locationBoxWidth, 50, '#E8F5E8', '#4CAF50');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2E7D32').text('MIESTO PREVZATIA', margin + 10, yPos + 10);
    doc.fontSize(10).font('Helvetica').fillColor('#333333').text(reservation.pickupLocation?.name || 'Neuvedene', margin + 10, yPos + 25);
    if (reservation.pickupLocation?.address) {
      const addr = reservation.pickupLocation.address;
      doc.fontSize(9).font('Helvetica').fillColor('#666666').text(`${addr.street || ''} ${addr.city || ''}`.trim(), margin + 10, yPos + 40);
    }
    
    // Return location
    addBox(margin + locationBoxWidth + 20, yPos, locationBoxWidth, 50, '#FFF3E0', '#FF9800');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#E65100').text('MIESTO VRATENIA', margin + locationBoxWidth + 30, yPos + 10);
    doc.fontSize(10).font('Helvetica').fillColor('#333333').text(reservation.dropoffLocation?.name || 'Neuvedene', margin + locationBoxWidth + 30, yPos + 25);
    if (reservation.dropoffLocation?.address) {
      const addr = reservation.dropoffLocation.address;
      doc.fontSize(9).font('Helvetica').fillColor('#666666').text(`${addr.street || ''} ${addr.city || ''}`.trim(), margin + locationBoxWidth + 30, yPos + 40);
    }

    yPos += 70;

    // PRICING BREAKDOWN - Compact, all on one section
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text('CENOVE UDAJE', margin, yPos);
    yPos += 20;

    if (reservation.pricing) {
      const pricing = reservation.pricing;
      addBox(margin, yPos, contentWidth, 80, '#F8F9FA', '#E0E0E0');
      
      // Pricing items
      doc.fontSize(11).font('Helvetica').fillColor('#333333').text('Zakladna cena:', margin + 15, yPos + 15);
      doc.fontSize(11).font('Helvetica').fillColor('#333333').text(`${(pricing.subtotal || 0).toFixed(2)} EUR`, pageWidth - margin - 80, yPos + 15, { align: 'right' });
      
      // VAT/DPH line removed since taxes are always 0
      
      // Additional fees (if any, limited to 1 line)
      if (pricing.fees && pricing.fees.length > 0) {
        const totalFees = pricing.fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
        if (totalFees > 0) {
          doc.fontSize(11).font('Helvetica').fillColor('#333333').text('Dodatocne poplatky:', margin + 15, yPos + 30);
          doc.fontSize(11).font('Helvetica').fillColor('#333333').text(`${totalFees.toFixed(2)} EUR`, pageWidth - margin - 80, yPos + 30, { align: 'right' });
        }
      }
      
      // Total line
      addLine(margin + 15, yPos + 45, pageWidth - margin - 15, yPos + 45, '#1976D2');
      
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#1976D2').text('CELKOVA SUMA:', margin + 15, yPos + 50);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text(`${(pricing.totalAmount || 0).toFixed(2)} EUR`, pageWidth - margin - 80, yPos + 50, { align: 'right' });
    }

    yPos += 100;

    // PAYMENT INFORMATION - Compact
    if (reservation.payment) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text('INFORMACIE O PLATBE', margin, yPos);
      yPos += 20;
      
      addBox(margin, yPos, contentWidth, 40, '#F8F9FA', '#E0E0E0');
      
      const payment = reservation.payment;
      const paymentStatusTexts = { 
        pending: 'Cakajuca', 
        succeeded: 'Uspesna', 
        failed: 'Neuspesna' 
      };
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Stav platby:', margin + 15, yPos + 15);
      doc.fontSize(11).font('Helvetica').fillColor('#1976D2').text(paymentStatusTexts[payment.status] || payment.status, margin + 100, yPos + 15);
      
      if (payment.paymentMethod?.type) {
        const methodTexts = { 
          card: 'Platobna karta', 
          bank_transfer: 'Bankovy prevod', 
          cash: 'Hotovost' 
        };
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Sposob platby:', margin + contentWidth / 2, yPos + 15);
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text(methodTexts[payment.paymentMethod.type] || payment.paymentMethod.type, margin + contentWidth / 2 + 90, yPos + 15);
      }
      
      yPos += 60;
    }

    // ADDITIONAL INFORMATION - Compact
    if (reservation.specialRequests || (reservation.additionalDrivers && reservation.additionalDrivers.length > 0)) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text('DOPLNUJUCE INFORMACIE', margin, yPos);
      yPos += 20;
      
      if (reservation.specialRequests) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Specialne poziadavky:', margin, yPos);
        yPos += 15;
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text(reservation.specialRequests, margin, yPos, { width: contentWidth });
        yPos += 25;
      }
      
      if (reservation.additionalDrivers && reservation.additionalDrivers.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Doplnkovi vodici:', margin, yPos);
        yPos += 15;
        reservation.additionalDrivers.forEach((driver, index) => {
          doc.fontSize(10).font('Helvetica').fillColor('#666666').text(`${index + 1}. ${driver.firstName} ${driver.lastName}`, margin, yPos);
          yPos += 12;
        });
        yPos += 10;
      }
    }

    // FOOTER - Fixed position at bottom
    const footerY = pageHeight - 60;
    addLine(margin, footerY, pageWidth - margin, footerY, '#1976D2');
    
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text('CarFlow - System spravy prenajmu vozidiel', margin, footerY + 10);
    doc.text('Email: info@carflow.sk | Tel: +421 123 456 789', margin, footerY + 25);
    doc.text(`Vygenerovane: ${new Date().toLocaleDateString('sk-SK')} o ${new Date().toLocaleTimeString('sk-SK')}`, pageWidth - 200, footerY + 10, { align: 'right' });
    doc.text('Dakujeme za vasu objednavku!', pageWidth - 200, footerY + 25, { align: 'right' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Chyba pri generovani PDF potvrdenia rezervacie:', error);
    return next(new AppError('Chyba pri generovani PDF potvrdenia rezervacie', 500));
  }
});

module.exports = {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  getReservationStats,
  generateReservationContract
}; 