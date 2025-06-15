const Reservation = require('../models/Reservation');
const Car = require('../models/Car');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

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

module.exports = {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  getReservationStats
}; 