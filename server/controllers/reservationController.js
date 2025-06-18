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
      .populate('car', 'brand model year registrationNumber category mileage vin fuelType transmission')
      .populate('createdBy', 'firstName lastName');

    if (!reservation) {
      return next(new AppError(`Reservation not found with id of ${req.params.id}`, 404));
    }

    // Check authorization
    if (req.user.role === 'customer' && reservation.customer._id.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to access this contract', 403));
    }

    // Create PDF with proper encoding
    const doc = new PDFDocument({ 
      margin: 50,
      info: {
        Title: 'Zmluva o prenájme vozidla',
        Author: 'CarFlow',
        Subject: 'Zmluva o prenájme vozidla'
      }
    });
    
    // Set response headers based on preview mode
    const isPreview = req.query.preview === 'true';
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    
    if (isPreview) {
      res.setHeader('Content-Disposition', `inline; filename="zmluva-${reservation.reservationNumber}.pdf"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="zmluva-${reservation.reservationNumber}.pdf"`);
    }

    // Pipe PDF to response
    doc.pipe(res);

    // Header with company info and barcode area
    doc.fontSize(8).fillColor('#000000')
       .text('Objednávka číslo: ' + (reservation.reservationNumber || ''), 50, 20)
       .text('Zmluva číslo: ZML' + (reservation.reservationNumber || ''), 50, 32);

    // Company logo area (right side)
    doc.fontSize(20).fillColor('#000000').text('CARFLOW', 450, 20);
    doc.fontSize(10).text('RENTAL SERVICES', 450, 45);

    // Main title
    doc.fontSize(16).fillColor('#000000').text('Objednávka / rezervácia požičovne', 200, 65, { align: 'center' });

    // Company details section
    doc.fontSize(12).fillColor('#000000').text('Dodávateľ:', 50, 110);
    doc.fontSize(10).fillColor('#666666')
       .text('Lemi s.r.o.', 50, 125)
       .text('Ferská 1142/50 940 01 Nitra', 50, 140);

    doc.text('IČO:', 50, 160)
       .text('DIČ:', 50, 175)
       .text('IČ DPH:', 50, 190);

    doc.fillColor('#000000')
       .text('50 524 196', 120, 160);

    // Contact section
    doc.fontSize(12).fillColor('#000000').text('Kontaktná osoba', 50, 270);
    doc.fontSize(10).fillColor('#666666');
    
    if (reservation.customer) {
      doc.text('Odberateľ:', 50, 290)
         .text('Telefón:', 50, 305)
         .text('E-mail:', 50, 320);

      doc.fillColor('#000000')
         .text(`${reservation.customer.firstName} ${reservation.customer.lastName}`, 120, 290)
         .text(reservation.customer.phone || '+421 908 907 131', 120, 305)
         .text(reservation.customer.email || 'peter.samuel.bobak@gmail.com', 120, 320);
    }

    // Address section
    doc.fillColor('#666666');
    doc.text('Adresa:', 50, 340)
       .text('Mesto:', 50, 355)
       .text('PSČ:', 50, 370)
       .text('Krajina:', 50, 385);

    doc.fillColor('#000000')
       .text('Andreja Mráza 15', 120, 340)
       .text('Bratislava', 120, 355)
       .text('821 09', 120, 370)
       .text('Slovensko', 120, 385);

    // Pickup and return locations
    doc.fontSize(12).fillColor('#000000').text('Miesto odovzdania', 343, 270);
    doc.fontSize(10).fillColor('#000000').text(reservation.pickupLocation?.name || 'Nitra', 343, 290);

    doc.fontSize(12).fillColor('#000000').text('Miesto vrátenia', 343, 315);
    doc.fontSize(10).fillColor('#000000').text(reservation.dropoffLocation?.name || 'Nitra', 343, 335);

    // Rental dates
    doc.fillColor('#666666');
    doc.text('Dátum vyhotovenia:', 50, 410)
       .text('Spôsob úhrady:', 50, 425);

    doc.fillColor('#000000');
    const createdDate = reservation.createdAt ? new Date(reservation.createdAt) : new Date();
    doc.text(`${createdDate.getDate()}. ${createdDate.toLocaleDateString('sk-SK', { month: 'long' })} ${createdDate.getFullYear()} ${createdDate.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`, 150, 410)
       .text('Hotovosť Blackrent', 150, 425);

    // Vehicle details section
    let yPos = 490;
    doc.fontSize(12).fillColor('#000000').text('Predmet:', 50, yPos);
    
    if (reservation.car) {
      const car = reservation.car;
      doc.fontSize(10).fillColor('#000000')
         .text(`${car.brand} ${car.model} ${car.category || 'xDrive'}`, 120, yPos);
      
      yPos += 20;
      doc.fillColor('#666666').text('Počet dní:', 50, yPos);
      const duration = Math.ceil((new Date(reservation.endDate) - new Date(reservation.startDate)) / (1000 * 60 * 60 * 24));
      doc.fillColor('#000000').text(`${duration} Dni`, 120, yPos);

      yPos += 15;
      doc.fillColor('#666666').text('Dátum od:', 50, yPos);
      const startDate = new Date(reservation.startDate);
      doc.fillColor('#000000').text(`${startDate.getDate()}.${(startDate.getMonth() + 1).toString().padStart(2, '0')}.${startDate.getFullYear()}, ${startDate.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`, 120, yPos);

      yPos += 15;
      doc.fillColor('#666666').text('Dátum do:', 50, yPos);
      const endDate = new Date(reservation.endDate);
      doc.fillColor('#000000').text(`${endDate.getDate()}.${(endDate.getMonth() + 1).toString().padStart(2, '0')}.${endDate.getFullYear()}, ${endDate.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`, 120, yPos);

      // Vehicle specifications
      yPos += 30;
      doc.fillColor('#666666');
      doc.text('VIN:', 343, yPos - 45);
      doc.text('SPZ:', 343, yPos - 30);
      doc.text('Typ:', 343, yPos - 15);
      doc.text('Model:', 343, yPos);

      doc.fillColor('#000000');
      doc.text(car.vin || 'WBAJB51006B372269', 400, yPos - 45);
      doc.text(car.registrationNumber || 'AA348BQ', 400, yPos - 30);
      doc.text('Sedan', 400, yPos - 15);
      doc.text(`${car.model} ${car.category || 'xDrive'}`, 400, yPos);
    }

    // Pricing section
    yPos += 40;
    doc.fontSize(12).fillColor('#000000').text('Denný limit:', 50, yPos);
    doc.text('Limit celkom:', 50, yPos + 15);
    doc.text('Cena za prík. kmíti:', 50, yPos + 30);
    doc.text('Záloha:', 50, yPos + 45);

    const dailyLimit = 250;
    const duration = Math.ceil((new Date(reservation.endDate) - new Date(reservation.startDate)) / (1000 * 60 * 60 * 24));
    const totalLimit = dailyLimit * duration;
    
    doc.text(`${dailyLimit} km`, 150, yPos);
    doc.text(`${totalLimit} km`, 150, yPos + 15);
    doc.text('0,25 € / km', 150, yPos + 30);
    doc.text('1 000,00 €', 150, yPos + 45);

    // Total amount (large)
    doc.fontSize(18).fillColor('#000000').text('Suma k úhrade:', 343, yPos + 20);
    doc.fontSize(24).fillColor('#000000').text(`${(reservation.pricing?.totalAmount || 270).toFixed(2)} €`, 343, yPos + 45);

    // Footer
    doc.fontSize(8).fillColor('#999999')
       .text('Informačný systém', 50, doc.page.height - 40)
       .text('CarFlow™', 50, doc.page.height - 28);

    doc.text('Vygenerované: ' + new Date().toLocaleDateString('sk-SK') + ' ' + new Date().toLocaleTimeString('sk-SK'), 400, doc.page.height - 40);

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