const Reservation = require('../models/Reservation');
const Car = require('../models/Car');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const PDFDocument = require('pdfkit');

// @desc    Get all reservations
// @route   GET /api/reservations
// @access  Private/Staff
const getReservations = asyncHandler(async (req, res, next) => {
  let query = Reservation.find();

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit', 'populate'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  query = Reservation.find(JSON.parse(queryStr));

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

// @desc    Get single reservation
// @route   GET /api/reservations/:id
// @access  Private
const getReservation = asyncHandler(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id)
    .populate('customer')
    .populate('car')
    .populate('payment')
    .populate('createdBy', 'firstName lastName email')
    .populate('lastModifiedBy', 'firstName lastName email')
    .populate('checkIn.staffMember', 'firstName lastName')
    .populate('checkOut.staffMember', 'firstName lastName');

  if (!reservation) {
    return next(new AppError(`Reservation not found with id of ${req.params.id}`, 404));
  }

  // Check if user owns the reservation or is staff
  if (req.user.role === 'customer' && reservation.customer._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this reservation', 403));
  }

  res.status(200).json({
    success: true,
    data: reservation
  });
});

// @desc    Create new reservation
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
    specialRequests
  } = req.body;

  // Validate car exists and is available
  const carDoc = await Car.findById(car);
  if (!carDoc) {
    return next(new AppError('Car not found', 404));
  }

  if (!carDoc.isAvailableForBooking()) {
    return next(new AppError('Car is not available for booking', 400));
  }

  // Validate customer exists
  const customerDoc = await User.findById(customer);
  if (!customerDoc) {
    return next(new AppError('Customer not found', 404));
  }

  // Check for overlapping reservations
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const overlappingReservations = await Reservation.findOverlapping(car, start, end);
  if (overlappingReservations.length > 0) {
    return next(new AppError('Car is not available for the selected dates', 400));
  }

  // Calculate pricing
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const dailyRate = carDoc.dailyRate;
  const subtotal = carDoc.calculateRate(days);
  const taxes = subtotal * 0.1; // 10% tax
  const totalAmount = subtotal + taxes;

  const reservationData = {
    customer,
    car,
    startDate: start,
    endDate: end,
    pickupLocation,
    dropoffLocation,
    pricing: {
      dailyRate,
      totalDays: days,
      subtotal,
      taxes,
      totalAmount
    },
    additionalDrivers,
    specialRequests,
    createdBy: req.user._id
  };

  const reservation = await Reservation.create(reservationData);

  // Update car stats but don't change status to booked
  await Car.findByIdAndUpdate(car, {
    $inc: { 
      totalBookings: 1,
      totalRevenue: totalAmount
    }
  });

  // Update customer stats
  await User.findByIdAndUpdate(customer, {
    $inc: { totalBookings: 1, totalSpent: totalAmount }
  });

  // Populate the response
  await reservation.populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'car', select: 'brand model year registrationNumber images' }
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
    return next(new AppError(`Reservation not found with id of ${req.params.id}`, 404));
  }

  // Check authorization
  if (req.user.role === 'customer' && reservation.customer.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this reservation', 403));
  }

  // Validate date changes if provided
  if (req.body.startDate || req.body.endDate) {
    const newStartDate = req.body.startDate ? new Date(req.body.startDate) : reservation.startDate;
    const newEndDate = req.body.endDate ? new Date(req.body.endDate) : reservation.endDate;

    if (newStartDate >= newEndDate) {
      return next(new AppError('End date must be after start date', 400));
    }

    // Check for overlapping reservations (excluding current reservation)
    const overlappingReservations = await Reservation.findOverlapping(
      reservation.car,
      newStartDate,
      newEndDate,
      reservation._id
    );

    if (overlappingReservations.length > 0) {
      return next(new AppError('Car is not available for the new dates', 400));
    }

    // Recalculate pricing if dates changed
    if (req.body.startDate || req.body.endDate) {
      const car = await Car.findById(reservation.car);
      const days = Math.ceil((newEndDate - newStartDate) / (1000 * 60 * 60 * 24));
      const subtotal = car.calculateRate(days);
      const taxes = subtotal * 0.1;
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
    return next(new AppError(`Reservation not found with id of ${req.params.id}`, 404));
  }

  // Check authorization
  if (req.user.role === 'customer' && reservation.customer.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to cancel this reservation', 403));
  }

  if (!reservation.canBeCancelled()) {
    return next(new AppError('Reservation cannot be cancelled', 400));
  }

  // Update reservation status
  reservation.status = 'cancelled';
  reservation.lastModifiedBy = req.user._id;
  reservation.notes = req.body.reason || 'Cancelled by user';
  await reservation.save();

  // Update car status back to available
  await Car.findByIdAndUpdate(reservation.car, { status: 'available' });

  // If payment exists, process refund (demo mode)
  if (reservation.payment) {
    const payment = await Payment.findById(reservation.payment);
    if (payment && payment.canBeRefunded()) {
      // In demo mode, just mark as refunded
      payment.status = 'refunded';
      payment.refunds.push({
        refundId: `demo-refund-${Date.now()}`,
        amount: payment.amount,
        reason: 'Reservation cancelled',
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
    return next(new AppError(`Reservation not found with id of ${req.params.id}`, 404));
  }

  if (reservation.status !== 'confirmed') {
    return next(new AppError('Only confirmed reservations can be checked in', 400));
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
    return next(new AppError(`Reservation not found with id of ${req.params.id}`, 404));
  }

  if (reservation.status !== 'ongoing') {
    return next(new AppError('Only ongoing reservations can be checked out', 400));
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
    status: 'available',
    mileage: mileage
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
      return next(new AppError(`Reservation not found with id of ${req.params.id}`, 404));
    }

    // Check authorization
    if (req.user.role === 'customer' && reservation.customer._id.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to access this contract', 403));
    }

    // Create PDF document
    const doc = new PDFDocument({ 
      margin: 40,
      size: 'A4',
      info: {
        Title: 'Potvrdenie objednávky - CarFlow',
        Author: 'CarFlow Rental System',
        Subject: 'Potvrdenie rezervácie vozidla',
        Keywords: 'rezervacia, auto, prenajom'
      }
    });
    
    // Set response headers
    const isPreview = req.query.preview === 'true';
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    
    if (isPreview) {
      res.setHeader('Content-Disposition', `inline; filename="potvrdenie-objednavky-${reservation.reservationNumber}.pdf"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="potvrdenie-objednavky-${reservation.reservationNumber}.pdf"`);
    }

    doc.pipe(res);

    // Helper functions
    const addLine = (x1, y1, x2, y2, color = '#E0E0E0') => {
      doc.strokeColor(color).lineWidth(0.5).moveTo(x1, y1).lineTo(x2, y2).stroke();
    };

    const addBox = (x, y, width, height, fillColor = '#F8F9FA', strokeColor = '#E0E0E0') => {
      doc.rect(x, y, width, height).fillAndStroke(fillColor, strokeColor);
    };

    // Document setup
    let yPos = 40;
    const pageWidth = doc.page.width;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);

    // HEADER SECTION
    // Company logo and branding
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#1976D2').text('CarFlow', margin, yPos);
    doc.fontSize(12).font('Helvetica').fillColor('#666666').text('Rental Management System', margin, yPos + 35);
    
    // Document title
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#333333').text('POTVRDENIE OBJEDNAVKY', pageWidth - 300, yPos, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text(`Cislo objednavky: ${reservation.reservationNumber}`, pageWidth - 300, yPos + 30, { align: 'right' });
    doc.text(`Datum vytvorenia: ${new Date(reservation.createdAt).toLocaleDateString('sk-SK')}`, pageWidth - 300, yPos + 45, { align: 'right' });

    yPos += 80;
    addLine(margin, yPos, pageWidth - margin, yPos, '#1976D2');
    yPos += 20;

    // CUSTOMER INFORMATION SECTION
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('INFORMACIE O ZAKAZNIKOVI', margin, yPos);
    yPos += 25;

    if (reservation.customer) {
      const customer = reservation.customer;
      
      // Customer details box
      addBox(margin, yPos, contentWidth / 2 - 10, 120, '#F8F9FA', '#E0E0E0');
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Meno a priezvisko:', margin + 15, yPos + 15);
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text(`${customer.firstName} ${customer.lastName}`, margin + 15, yPos + 30);
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Email:', margin + 15, yPos + 50);
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text(customer.email, margin + 15, yPos + 65);
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Telefon:', margin + 15, yPos + 85);
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text(customer.phone || 'Neuvedene', margin + 15, yPos + 100);
      
      // License info
      if (customer.licenseNumber) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Vodicsky preukaz:', margin + contentWidth / 2 + 10, yPos + 15);
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text(customer.licenseNumber, margin + contentWidth / 2 + 10, yPos + 30);
      }
    }

    yPos += 140;

    // VEHICLE INFORMATION SECTION
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('INFORMACIE O VOZIDLE', margin, yPos);
    yPos += 25;

    if (reservation.car) {
      const car = reservation.car;
      
      // Vehicle details box
      addBox(margin, yPos, contentWidth, 140, '#F8F9FA', '#E0E0E0');
      
      // Left column
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333').text(`${car.brand} ${car.model} (${car.year})`, margin + 15, yPos + 15);
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Kategoria:', margin + 15, yPos + 40);
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text(car.category || 'Neuvedena', margin + 15, yPos + 55);
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Evidencne cislo:', margin + 15, yPos + 75);
      doc.fontSize(11).font('Helvetica').fillColor('#666666').text(car.registrationNumber || 'Neuvedene', margin + 15, yPos + 90);
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Denna sadzba:', margin + 15, yPos + 110);
      doc.fontSize(11).font('Helvetica').fillColor('#1976D2').text(`${car.dailyRate} EUR/den`, margin + 15, yPos + 125);
      
      // Right column
      if (car.vin) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('VIN:', margin + contentWidth / 2, yPos + 40);
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text(car.vin, margin + contentWidth / 2, yPos + 55);
      }
      
      if (car.fuelType) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Typ paliva:', margin + contentWidth / 2, yPos + 75);
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text(car.fuelType, margin + contentWidth / 2, yPos + 90);
      }
      
      if (car.transmission) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Prevodovka:', margin + contentWidth / 2, yPos + 110);
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text(car.transmission, margin + contentWidth / 2, yPos + 125);
      }
    }

    yPos += 160;

    // RESERVATION DETAILS SECTION
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('DETAILY REZERVACIE', margin, yPos);
    yPos += 25;

    // Dates and duration
    addBox(margin, yPos, contentWidth, 100, '#F8F9FA', '#E0E0E0');
    
    const startDate = new Date(reservation.startDate);
    const endDate = new Date(reservation.endDate);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Datum prevzatia:', margin + 15, yPos + 15);
    doc.fontSize(11).font('Helvetica').fillColor('#666666').text(startDate.toLocaleDateString('sk-SK', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }), margin + 15, yPos + 30);
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Datum vratenia:', margin + 15, yPos + 55);
    doc.fontSize(11).font('Helvetica').fillColor('#666666').text(endDate.toLocaleDateString('sk-SK', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }), margin + 15, yPos + 70);
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Doba prenajmu:', margin + contentWidth / 2, yPos + 15);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text(`${duration} dni`, margin + contentWidth / 2, yPos + 35);
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Status rezervacie:', margin + contentWidth / 2, yPos + 65);
    const statusColors = { pending: '#FF9800', confirmed: '#2196F3', ongoing: '#4CAF50', completed: '#8BC34A', cancelled: '#F44336' };
    const statusTexts = { pending: 'Cakajuca', confirmed: 'Potvrdena', ongoing: 'Prebieha', completed: 'Dokoncena', cancelled: 'Zrusena' };
    doc.fontSize(11).font('Helvetica-Bold').fillColor(statusColors[reservation.status] || '#666666').text(statusTexts[reservation.status] || reservation.status, margin + contentWidth / 2, yPos + 80);

    yPos += 120;

    // PICKUP AND RETURN LOCATIONS
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('MIESTA PREVZATIA A VRATENIA', margin, yPos);
    yPos += 25;

    addBox(margin, yPos, contentWidth / 2 - 10, 80, '#E8F5E8', '#4CAF50');
    addBox(margin + contentWidth / 2 + 10, yPos, contentWidth / 2 - 10, 80, '#FFF3E0', '#FF9800');
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2E7D32').text('MIESTO PREVZATIA', margin + 15, yPos + 15);
    doc.fontSize(11).font('Helvetica').fillColor('#333333').text(reservation.pickupLocation?.name || 'Neuvedene', margin + 15, yPos + 35);
    if (reservation.pickupLocation?.address) {
      const addr = reservation.pickupLocation.address;
      doc.fontSize(10).font('Helvetica').fillColor('#666666').text(`${addr.street || ''} ${addr.city || ''} ${addr.zipCode || ''}`.trim(), margin + 15, yPos + 50);
    }
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#E65100').text('MIESTO VRATENIA', margin + contentWidth / 2 + 25, yPos + 15);
    doc.fontSize(11).font('Helvetica').fillColor('#333333').text(reservation.dropoffLocation?.name || 'Neuvedene', margin + contentWidth / 2 + 25, yPos + 35);
    if (reservation.dropoffLocation?.address) {
      const addr = reservation.dropoffLocation.address;
      doc.fontSize(10).font('Helvetica').fillColor('#666666').text(`${addr.street || ''} ${addr.city || ''} ${addr.zipCode || ''}`.trim(), margin + contentWidth / 2 + 25, yPos + 50);
    }

    yPos += 100;

    // PRICING BREAKDOWN
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('CENOVE UDAJE', margin, yPos);
    yPos += 25;

    if (reservation.pricing) {
      addBox(margin, yPos, contentWidth, 120, '#F8F9FA', '#E0E0E0');
      
      const pricing = reservation.pricing;
      
      doc.fontSize(12).font('Helvetica').fillColor('#333333').text('Zakladna cena:', margin + 15, yPos + 15);
      doc.fontSize(12).font('Helvetica').fillColor('#333333').text(`${(pricing.subtotal || 0).toFixed(2)} EUR`, pageWidth - margin - 100, yPos + 15);
      
      doc.fontSize(12).font('Helvetica').fillColor('#333333').text('DPH (20%):', margin + 15, yPos + 35);
      doc.fontSize(12).font('Helvetica').fillColor('#333333').text(`${(pricing.taxes || 0).toFixed(2)} EUR`, pageWidth - margin - 100, yPos + 35);
      
      if (pricing.fees && pricing.fees.length > 0) {
        pricing.fees.forEach((fee, index) => {
          doc.fontSize(12).font('Helvetica').fillColor('#333333').text(`${fee.name}:`, margin + 15, yPos + 55 + (index * 20));
          doc.fontSize(12).font('Helvetica').fillColor('#333333').text(`${(fee.amount || 0).toFixed(2)} EUR`, pageWidth - margin - 100, yPos + 55 + (index * 20));
        });
      }
      
      addLine(margin + 15, yPos + 85, pageWidth - margin - 15, yPos + 85, '#1976D2');
      
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text('CELKOVA SUMA:', margin + 15, yPos + 95);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text(`${(pricing.totalAmount || 0).toFixed(2)} EUR`, pageWidth - margin - 100, yPos + 95);
    }

    yPos += 140;

    // PAYMENT INFORMATION
    if (reservation.payment) {
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('INFORMACIE O PLATBE', margin, yPos);
      yPos += 25;
      
      addBox(margin, yPos, contentWidth, 60, '#F8F9FA', '#E0E0E0');
      
      const payment = reservation.payment;
      const paymentStatusColors = { pending: '#FF9800', succeeded: '#4CAF50', failed: '#F44336' };
      const paymentStatusTexts = { pending: 'Cakajuca', succeeded: 'Uspesna', failed: 'Neuspesna' };
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Status platby:', margin + 15, yPos + 15);
      doc.fontSize(11).font('Helvetica-Bold').fillColor(paymentStatusColors[payment.status] || '#666666').text(paymentStatusTexts[payment.status] || payment.status, margin + 15, yPos + 30);
      
      if (payment.paymentMethod?.type) {
        const methodTexts = { card: 'Platobna karta', bank_transfer: 'Bankovy prevod', cash: 'Hotovost' };
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Sposob platby:', margin + contentWidth / 2, yPos + 15);
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text(methodTexts[payment.paymentMethod.type] || payment.paymentMethod.type, margin + contentWidth / 2, yPos + 30);
      }
      
      yPos += 80;
    }

    // ADDITIONAL INFORMATION
    if (reservation.specialRequests || (reservation.additionalDrivers && reservation.additionalDrivers.length > 0)) {
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('DOPLNUJUCE INFORMACIE', margin, yPos);
      yPos += 25;
      
      if (reservation.specialRequests) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Specialne poziadavky:', margin, yPos);
        yPos += 15;
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text(reservation.specialRequests, margin, yPos, { width: contentWidth });
        yPos += 30;
      }
      
      if (reservation.additionalDrivers && reservation.additionalDrivers.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Doplnkovi vodicii:', margin, yPos);
        yPos += 15;
        reservation.additionalDrivers.forEach((driver, index) => {
          doc.fontSize(11).font('Helvetica').fillColor('#666666').text(`${index + 1}. ${driver.firstName} ${driver.lastName} (${driver.licenseNumber || 'bez udajov'})`, margin, yPos);
          yPos += 15;
        });
        yPos += 15;
      }
    }

    // FOOTER
    yPos = doc.page.height - 100;
    addLine(margin, yPos, pageWidth - margin, yPos, '#1976D2');
    yPos += 15;
    
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text('CarFlow Rental Management System', margin, yPos);
    doc.text('Email: info@carflow.sk | Tel: +421 123 456 789', margin, yPos + 15);
    doc.text(`Vygenerovane: ${new Date().toLocaleDateString('sk-SK')} ${new Date().toLocaleTimeString('sk-SK')}`, pageWidth - 200, yPos, { align: 'right' });
    doc.text('Dakujeme za vasu objednavku!', pageWidth - 200, yPos + 15, { align: 'right' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Reservation PDF Generation Error:', error);
    return next(new AppError('Error generating reservation contract PDF', 500));
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