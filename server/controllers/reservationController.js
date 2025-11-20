const Reservation = require('../models/Reservation');
const Car = require('../models/Car');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { DiscountCode } = require('../models/WebsiteSettings');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const PDFDocument = require('pdfkit');
const pdfService = require('../services/pdfService');
const { processReservationDates } = require('../utils/dateHelpers');

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
        query = query.populate('car', 'brand model year registrationNumber category pricing mileageLimits dailyRate images status');
      } else if (field === 'payment') {
        query = query.populate('payment');
      } else if (field === 'selectedServices.service') {
        query = query.populate('selectedServices.service', 'name category pricing');
      } else if (field === 'selectedInsurance.insurance') {
        query = query.populate('selectedInsurance.insurance', 'name type coverage');
      } else {
        query = query.populate(field);
      }
    });
  } else {
    // Default population
    query = query.populate('customer', 'firstName lastName email phone')
                 .populate('car', 'brand model year registrationNumber images')
                 .populate('payment', 'status amount paymentMethod')
                 .populate('selectedServices.service', 'name category pricing')
                 .populate('selectedServices._id', 'name category pricing')
                 .populate('selectedAdditionalInsurance.insuranceId', 'name type coverage pricing')
                 .populate('selectedExtendedInsurance.insuranceId', 'name type coverage pricing');
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
    .populate('selectedServices.service', 'name category pricing')
    .populate('selectedServices._id', 'name category pricing')
    .populate('selectedAdditionalInsurance.insuranceId', 'name type coverage pricing')
    .populate('selectedExtendedInsurance.insuranceId', 'name type coverage pricing')
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
    // Customer auto-creation fields
    customerDetails,
    car,
    startDate,
    endDate,
    pickupLocation,
    dropoffLocation,
    additionalDrivers,
    specialRequests,
    discountCode,
    // ✅ ADDITIONAL SERVICES AND INSURANCE FIELDS
    selectedServices,
    servicesTotal,
    selectedAdditionalInsurance,
    selectedExtendedInsurance,
    insurancePrices,
    extendedInsurancePrices,
    calculatedTotal,
    extraOptions,
    // Payment type (optional: 'stripe' or 'prevod')
    paymentType
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

  let customerDoc;

  // Handle customer creation or validation
  if (customerDetails) {
    // Auto-create customer if details provided
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      address,
      licenseNumber,
      licenseExpiry
    } = customerDetails;

    // Validate required customer fields
    if (!firstName || !lastName || !email || !phone || !licenseNumber) {
      return next(new AppError('Chýbajú povinné polia zákazníka: firstName, lastName, email, phone, licenseNumber', 400));
    }

    // Check if customer already exists for this tenant
    const existingCustomer = await User.findOne({ 
      email: email.toLowerCase(),
      tenantId: req.user.tenantId 
    });

    if (existingCustomer) {
      // Use existing customer
      customerDoc = existingCustomer;
    } else {
      // Check if customer exists in a different tenant
      const existingGlobalCustomer = await User.findOne({ 
        email: email.toLowerCase()
      });

      let uniqueLicenseNumber = licenseNumber;
      
      if (existingGlobalCustomer) {
        // Create unique license number for cross-tenant customer
        uniqueLicenseNumber = `${licenseNumber}-${req.user.tenantId.toString().slice(-4)}`;
      }

      // Create new customer
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      
      customerDoc = await User.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: await bcrypt.hash('customer123', salt),
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        address: {
          street: address?.street || '',
          city: address?.city || '',
          state: address?.state || '',
          zipCode: address?.zipCode || '',
          country: address?.country || ''
        },
        licenseNumber: uniqueLicenseNumber,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
        role: 'customer',
        isActive: true,
        tenantId: req.user.tenantId
      });

      console.log('🔍 [RESERVATION CONTROLLER] Created new customer:', {
        id: customerDoc._id,
        email: customerDoc.email,
        tenantId: customerDoc.tenantId,
        status: customerDoc.status,
        isActive: customerDoc.isActive,
        role: customerDoc.role
      });
    }
  } else if (customer) {
    // Validate existing customer by ID (tenant-scoped)
    customerDoc = await User.findOne({ 
      _id: customer, 
      tenantId: req.user.tenantId 
    });
    if (!customerDoc) {
      return next(new AppError('Zákazník nebol nájdený', 404));
    }
  } else {
    return next(new AppError('Musíte zadať buď ID zákazníka alebo údaje zákazníka', 400));
  }

  // Check for overlapping reservations (tenant-scoped)
  // Process dates to ensure proper time information
  const { start, end } = processReservationDates(startDate, endDate);
  
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
  
  // Add services and insurance costs
  const additionalServicesTotal = (servicesTotal || 0);
  let insuranceTotal = 0;
  
  // Calculate insurance totals if provided
  if (selectedAdditionalInsurance && selectedAdditionalInsurance.length > 0) {
    insuranceTotal += selectedAdditionalInsurance.reduce((sum, insurance) => {
      return sum + (insurance.calculatedPrice || insurance.totalPrice || insurance.price || insurance.amount || 0);
    }, 0);
  }
  
  if (selectedExtendedInsurance && selectedExtendedInsurance.length > 0) {
    insuranceTotal += selectedExtendedInsurance.reduce((sum, insurance) => {
      return sum + (insurance.calculatedPrice || insurance.totalPrice || insurance.price || insurance.amount || 0);
    }, 0);
  }
  
  console.log('💰 [RESERVATION] Pricing breakdown:', {
    subtotal,
    additionalServicesTotal,
    insuranceTotal,
    calculatedTotal: calculatedTotal || (subtotal + additionalServicesTotal + insuranceTotal)
  });
  
  // Initialize pricing object
  let pricing = {
    dailyRate,
    totalDays: days,
    subtotal,
    taxes,
    discounts: [],
    // Use provided calculatedTotal or calculate from components
    totalAmount: calculatedTotal || (subtotal + taxes + additionalServicesTotal + insuranceTotal)
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

    // Recalculate total amount including services and insurance
    pricing.totalAmount = (calculatedTotal || (subtotal + taxes + additionalServicesTotal + insuranceTotal)) - discountAmount;
  }

  const reservationData = {
    customer: customerDoc._id,
    car,
    startDate: start, // Now includes proper time information
    endDate: end, // Now includes proper time information
    pickupLocation,
    dropoffLocation,
    pricing,
    appliedDiscountCodes,
    additionalDrivers,
    specialRequests,
    // ✅ ADDITIONAL SERVICES AND INSURANCE DATA
    selectedServices: selectedServices || [],
    servicesTotal: servicesTotal || 0,
    selectedAdditionalInsurance: selectedAdditionalInsurance || [],
    selectedExtendedInsurance: selectedExtendedInsurance || [],
    insurancePrices: insurancePrices || {},
    extendedInsurancePrices: extendedInsurancePrices || {},
    // Payment type (optional: 'stripe' or 'prevod')
    paymentType: paymentType || undefined,
    tenantId: req.user.tenantId,
    createdBy: req.user._id
  };

  const reservation = await Reservation.create(reservationData);

  // 🆕 Generate bySquare QR payment codes for admin reservations
  try {
    const bySquareService = require('../services/bySquareService');

    // Get tenant email for configuration
    const User = require('../models/User');
    const tenantUser = await User.findById(req.user.tenantId);
    const tenantEmail = tenantUser?.email || null;

    if (bySquareService.isConfigured()) {
      console.log('🔄 [QR] Generating bySquare QR codes for admin reservation...');

      const qrResult = await bySquareService.generateReservationQR(reservation, carDoc, customerDoc, tenantEmail);
      
      if (qrResult.success && qrResult.qrCodes) {
        // Calculate total amount including deposit
        const rentalAmount = pricing.totalAmount || (pricing.dailyRate * pricing.totalDays) || 0;
        const depositAmount = carDoc.pricing?.deposit || 0;
        const totalAmount = rentalAmount + depositAmount;
        
        // Generate variable symbol from reservation number and ID
        const reservationDigits = reservation.reservationNumber ? 
          reservation.reservationNumber.replace(/[^0-9]/g, '') : 
          reservation._id.toString().slice(-8);
        const variableSymbol = reservationDigits.slice(-10).padStart(10, '0');
        
        // Update reservation with QR codes - use new separate structure
        reservation.qrCodes = {
          payBySquareRental: qrResult.qrCodes.payBySquareRental,
          payBySquareDeposit: qrResult.qrCodes.payBySquareDeposit,
          generatedAt: new Date(),
          lastUpdated: new Date(),
          isActive: true,
          bankAccount: 'SK6807200000000000000000',
          variableSymbol: variableSymbol,
          constantSymbol: '0308',
          specificSymbol: '',
          amount: totalAmount,
          beneficiaryName: 'CarFlow Rental',
          paymentNote: `Car rental + deposit: ${carDoc.brand} ${carDoc.model} (${start.toISOString().split('T')[0]} - ${end.toISOString().split('T')[0]})`
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
    { path: 'car', select: 'brand model year registrationNumber images imageUrl pricing deposit' },
    { path: 'appliedDiscountCodes.discountCode', select: 'code description discountType discountValue' }
  ]);

  // 📧 Send admin notification and customer confirmation emails
  try {
    const { sendReservationEmails } = require('../utils/emailHelpers');
    
    console.log('📧 [EMAIL] Sending reservation emails for new admin reservation...');
    console.log('📧 [EMAIL] Environment:', process.env.NODE_ENV || 'development');
    console.log('📧 [EMAIL] Email provider:', process.env.EMAIL_PROVIDER || 'nodemailer');
    console.log('📧 [EMAIL] SMTP2GO configured:', process.env.SMTP2GO_API_KEY ? 'YES' : 'NO');
    
    // Send email notifications to both admin and customer
    const emailResult = await sendReservationEmails(reservation, carDoc, customerDoc, req.user);
    
    if (emailResult.success) {
      console.log('✅ [EMAIL] Reservation emails sent successfully');
      console.log('📧 [EMAIL] Results:', emailResult.results);
    } else {
      console.warn('⚠️ [EMAIL] Reservation emails failed:', emailResult.error);
    }
  } catch (emailError) {
    console.error('❌ [EMAIL] Error sending reservation emails:', emailError.message);
    console.error('❌ [EMAIL] Stack:', emailError.stack);
    // Don't fail the reservation if email fails
  }

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

    // Ensure time information is preserved for new dates
    if (req.body.startDate) {
      const { processReservationDate } = require('../utils/dateHelpers');
      req.body.startDate = processReservationDate(req.body.startDate, false);
    }

    if (req.body.endDate) {
      const { processReservationDate } = require('../utils/dateHelpers');
      req.body.endDate = processReservationDate(req.body.endDate, true);
    }

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

  // Store original values for comparison
  const originalReservation = await Reservation.findById(req.params.id).populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'car', select: 'brand model year registrationNumber images imageUrl pricing deposit' }
  ]);

  reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'car', select: 'brand model year registrationNumber images imageUrl pricing deposit' },
    { path: 'payment' }
  ]);

  // Check if critical fields were changed and send email notification
  const criticalFieldsChanged = (
    (req.body.startDate && originalReservation.startDate.toISOString() !== new Date(req.body.startDate).toISOString()) ||
    (req.body.endDate && originalReservation.endDate.toISOString() !== new Date(req.body.endDate).toISOString()) ||
    (req.body.car && originalReservation.car._id.toString() !== req.body.car.toString())
  );

  // Send email notification if critical fields changed and customer exists
  if (criticalFieldsChanged && reservation.customer && reservation.customer.email) {
    try {
      const emailService = require('../services/emailService');
      const emailHelpers = require('../utils/emailHelpers');
      
      if (emailService.isConfigured) {
        // Prepare reservation data using existing helper
        const emailData = emailHelpers.prepareReservationEmailData(reservation, reservation.car, reservation.customer);
        
        // Send edit notification email using new template, pass both emailData and raw reservation
        await emailService.sendCustomerReservationEdited(reservation.customer.email, emailData, req.user, reservation);
        console.log('✅ [EMAIL] Reservation edit notification sent to customer:', reservation.customer.email);
      }
    } catch (emailError) {
      console.error('❌ [EMAIL] Failed to send edit notification:', emailError.message);
      // Don't fail the update if email fails
    }
  }

  res.status(200).json({
    success: true,
    data: reservation
  });
});

// @desc    Cancel reservation
// @route   PUT /api/reservations/:id/cancel
// @access  Private
const cancelReservation = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const reservation = await Reservation.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'car', select: 'brand model year registrationNumber images imageUrl pricing deposit' }
  ]);

  if (!reservation) {
    return next(new AppError('Reservation not found', 404));
  }

  // Check if reservation can be cancelled
  if (reservation.status === 'completed' || reservation.status === 'cancelled') {
    return next(new AppError('Cannot cancel completed or already cancelled reservation', 400));
  }

  reservation.status = 'cancelled';
  reservation.cancellation = {
    date: new Date(),
    reason: reason || 'Cancelled by admin',
    cancelledBy: req.user._id
  };

  await reservation.save();

  // 📧 Send customer notification email about cancellation (only to customer when admin cancels)
  try {
    const emailService = require('../services/emailService');
    
    if (emailService.isConfigured && reservation.customer && reservation.customer.email) {
      const customerName = `${reservation.customer.firstName || ''} ${reservation.customer.lastName || ''}`.trim() || 'Vazeny zakaznik';
      const carInfo = `${reservation.car.brand || ''} ${reservation.car.model || ''} ${reservation.car.year || ''}`.trim();
      const startDate = new Date(reservation.startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' });
      const endDate = new Date(reservation.endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' });
      const cancellationDate = new Date().toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' });
      
      // Prepare cancellation data for the simple Slovak email template
      const cancellationData = {
        customerName,
        reservationNumber: reservation.reservationNumber,
        carInfo,
        startDate,
        endDate,
        cancellationDate,
        reason: reason || null
      };

      // Use the simple Slovak cancellation email template from emailService, pass raw reservation
      await emailService.sendCustomerCancellationNotification(reservation.customer.email, cancellationData, req.user, reservation);
      console.log('✅ [EMAIL] Slovak cancellation notification sent to customer:', reservation.customer.email);
    }
  } catch (emailError) {
    console.error('❌ [EMAIL] Failed to send cancellation notification:', emailError.message);
    // Don't fail the cancellation if email fails
  }

  res.status(200).json({
    success: true,
    message: 'Reservation cancelled successfully',
    data: reservation
  });
});

// @desc    Confirm reservation
// @route   PUT /api/reservations/:id/confirm
// @access  Private
const confirmReservation = asyncHandler(async (req, res, next) => {
  const { notes } = req.body;

  const reservation = await Reservation.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'car', select: 'brand model year registrationNumber images imageUrl pricing deposit' }
  ]);

  if (!reservation) {
    return next(new AppError('Reservation not found', 404));
  }

  // Check if reservation can be confirmed
  if (reservation.status !== 'pending') {
    return next(new AppError('Only pending reservations can be confirmed', 400));
  }

  reservation.status = 'confirmed';
  reservation.confirmation = {
    date: new Date(),
    notes: notes || 'Confirmed by admin',
    confirmedBy: req.user._id
  };

  await reservation.save();

  // 🆕 Generate QR codes for confirmed reservation if not already present
  try {
    console.log('🔄 [QR] Ensuring QR codes exist for confirmed reservation...');
    
    const hasValidQRCodes = reservation.qrCodes && (
      (reservation.qrCodes.payBySquareRental && reservation.qrCodes.payBySquareRental !== null) ||
      (reservation.qrCodes.payBySquareDeposit && reservation.qrCodes.payBySquareDeposit !== null)
    );
    
    if (!hasValidQRCodes) {
      console.log('🔄 [QR] No valid QR codes found, generating fresh QR codes for confirmation email...');
      
      const bySquareService = require('../services/bySquareService');

      // Get tenant email for configuration
      const User = require('../models/User');
      const tenantUser = await User.findById(req.user.tenantId);
      const tenantEmail = tenantUser?.email || null;

      if (bySquareService.isConfigured()) {
        const qrResult = await bySquareService.generateReservationQR(
          reservation,
          reservation.car,
          reservation.customer,
          tenantEmail
        );
        
        if (qrResult.success && qrResult.qrCodes) {
          // Calculate total amount including deposit
                             const rentalAmount = reservation.pricing?.totalAmount || 0;
                   
                   // Check all possible deposit sources (consistent with bySquareService and email)
                   const depositAmount = reservation.car.pricing?.deposit || reservation.car.deposit || reservation.pricing?.deposit || 0;
                   console.log('🔍 [QR CONFIRM] Deposit amount calculation:', {
                     carPricingDeposit: reservation.car.pricing?.deposit,
                     carDeposit: reservation.car.deposit,
                     reservationPricingDeposit: reservation.pricing?.deposit,
                     finalDepositAmount: depositAmount
                   });
          const totalAmount = rentalAmount + depositAmount;
          
          // Generate variable symbol from reservation number and ID
          const reservationDigits = reservation.reservationNumber ? 
            reservation.reservationNumber.replace(/[^0-9]/g, '') : 
            reservation._id.toString().slice(-8);
          const variableSymbol = reservationDigits.slice(-10).padStart(10, '0');
          
          // Update reservation with QR codes - preserve existing structure if it exists
          if (!reservation.qrCodes) {
            reservation.qrCodes = {};
          }
          
          // Add the generated QR codes
          reservation.qrCodes.payBySquareRental = qrResult.qrCodes.payBySquareRental;
          reservation.qrCodes.payBySquareDeposit = qrResult.qrCodes.payBySquareDeposit;
          
          // Add/update metadata
          reservation.qrCodes.generatedAt = reservation.qrCodes.generatedAt || new Date();
          reservation.qrCodes.lastUpdated = new Date();
          reservation.qrCodes.isActive = true;
          reservation.qrCodes.bankAccount = reservation.qrCodes.bankAccount || 'SK6807200000000000000000';
          reservation.qrCodes.variableSymbol = reservation.qrCodes.variableSymbol || variableSymbol;
          reservation.qrCodes.constantSymbol = reservation.qrCodes.constantSymbol || '0308';
          reservation.qrCodes.specificSymbol = reservation.qrCodes.specificSymbol || '';
          reservation.qrCodes.amount = reservation.qrCodes.amount || totalAmount;
          reservation.qrCodes.beneficiaryName = reservation.qrCodes.beneficiaryName || 'CarFlow Rental';
          reservation.qrCodes.paymentNote = reservation.qrCodes.paymentNote || `Car rental + deposit: ${reservation.car.brand} ${reservation.car.model}`;
          
          console.log('🔍 [QR DEBUG] QR codes after update:', {
            payBySquareRental: !!reservation.qrCodes.payBySquareRental,
            payBySquareDeposit: !!reservation.qrCodes.payBySquareDeposit,
            hasRentalQR: reservation.qrCodes.payBySquareRental ? 'YES' : 'NO',
            hasDepositQR: reservation.qrCodes.payBySquareDeposit ? 'YES' : 'NO'
          });
          
          await reservation.save();
          console.log('✅ [QR] QR codes generated and saved for confirmed reservation');
        } else {
          console.warn('⚠️ [QR] Failed to generate QR codes for confirmation:', qrResult.error);
        }
      } else {
        console.log('ℹ️ [QR] bySquare not configured, skipping QR generation');
      }
    } else {
      console.log('✅ [QR] Valid QR codes already exist for confirmed reservation');
    }
  } catch (qrError) {
    console.error('❌ [QR] Error generating QR codes for confirmation:', qrError.message);
    // Don't fail the confirmation if QR generation fails
  }

  // 🔖 Automatically create contract when reservation is confirmed
  try {
    const Contract = require('../models/Contract');
    
    console.log('🔖 [AUTO CONTRACT] Checking if contract exists for reservation:', reservation._id);
    
    // Check if contract already exists
    const existingContract = await Contract.findOne({
      reservation: reservation._id,
      tenantId: req.user.tenantId
    });
    
    if (!existingContract) {
      console.log('🔖 [AUTO CONTRACT] Creating automatic contract for confirmed reservation:', reservation._id);
      
      // Create contract automatically
      const contract = await Contract.createFromReservation(
        reservation._id,
        req.user.tenantId,
        req.user._id
      );
      
      console.log('✅ [AUTO CONTRACT] Contract created automatically with ID:', contract._id);
    } else {
      console.log('ℹ️ [AUTO CONTRACT] Contract already exists for reservation:', reservation._id);
    }
  } catch (contractError) {
    console.error('❌ [AUTO CONTRACT] Failed to create automatic contract:', contractError.message);
    // Don't fail the confirmation if contract creation fails
  }

  // 🧾 Create SuperFaktura invoice for LeRent tenant only
  const SUPERFAKTURA_ENABLED = true; // Automatic invoice creation enabled
  let invoicePdfBuffer = null; // Store PDF for email attachment

  if (SUPERFAKTURA_ENABLED) {
    try {
      const User = require('../models/User');
      const tenantUser = await User.findById(req.user.tenantId);

      if (tenantUser && tenantUser.email.toLowerCase() === 'lerent@lerent.sk') {
        console.log('🧾 [SUPERFAKTURA] LeRent tenant detected - creating invoice...');

        const superfakturaService = require('../services/superfakturaService');

        // Populate full reservation data for invoice
        await reservation.populate([
          { path: 'customer', select: 'firstName lastName email phone address city zip' },
          { path: 'car', select: 'brand model year registrationNumber' }
        ]);

        const invoiceResult = await superfakturaService.createInvoiceFromReservation(reservation);

        if (invoiceResult.success) {
          console.log('✅ [SUPERFAKTURA] Invoice created successfully!');
          console.log('🧾 [SUPERFAKTURA] Invoice ID:', invoiceResult.data?.Invoice?.id);
          console.log('🧾 [SUPERFAKTURA] Invoice number:', invoiceResult.data?.Invoice?.invoice_number);
          console.log('🧾 [SUPERFAKTURA] Invoice token:', invoiceResult.data?.Invoice?.token);

          // Store invoice reference in reservation
          if (invoiceResult.data?.Invoice?.id) {
            reservation.superfakturaInvoiceId = invoiceResult.data.Invoice.id;
            reservation.superfakturaInvoiceNumber = invoiceResult.data.Invoice.invoice_number;
            reservation.superfakturaToken = invoiceResult.data.Invoice.token;
            await reservation.save();

            // Download invoice PDF for email attachment
            try {
              console.log('📥 [SUPERFAKTURA] Downloading invoice PDF...');
              invoicePdfBuffer = await superfakturaService.getInvoicePdf(
                invoiceResult.data.Invoice.id,
                invoiceResult.data.Invoice.token
              );
              console.log('✅ [SUPERFAKTURA] Invoice PDF downloaded successfully');
            } catch (pdfError) {
              console.error('❌ [SUPERFAKTURA] Failed to download invoice PDF:', pdfError.message);
            }
          }
        } else {
          console.error('❌ [SUPERFAKTURA] Invoice creation failed:', invoiceResult.error);
        }
      } else {
        console.log('ℹ️ [SUPERFAKTURA] Not LeRent tenant, skipping invoice creation');
      }
    } catch (superfakturaError) {
      console.error('❌ [SUPERFAKTURA] Error during invoice creation:', superfakturaError.message);
      console.error('❌ [SUPERFAKTURA] Full error:', superfakturaError);
      // Don't fail the confirmation if invoice creation fails
    }
  } else {
    console.log('ℹ️ [SUPERFAKTURA] Invoice creation is currently disabled');
  }

  // 📧 Send customer confirmation email using new template system
  try {
    const emailService = require('../services/emailService');
    const emailHelpers = require('../utils/emailHelpers');
    
    console.log('📧 [EMAIL DEBUG] Starting confirmation email process...');
    console.log('📧 [EMAIL DEBUG] Email service configured:', !!emailService.isConfigured);
    console.log('📧 [EMAIL DEBUG] Customer exists:', !!reservation.customer);
    console.log('📧 [EMAIL DEBUG] Customer email:', reservation.customer?.email);
    console.log('📧 [EMAIL DEBUG] Reservation QR codes exist:', !!reservation.qrCodes);
    console.log('📧 [EMAIL DEBUG] QR codes content:', {
      hasQrCodes: !!reservation.qrCodes,
      qrCodesKeys: reservation.qrCodes ? Object.keys(reservation.qrCodes) : [],
      payBySquareRental: !!reservation.qrCodes?.payBySquareRental,
      payBySquareDeposit: !!reservation.qrCodes?.payBySquareDeposit,
      payBySquare: !!reservation.qrCodes?.payBySquare
    });
    
    if (emailService.isConfigured && reservation.customer && reservation.customer.email) {
      // Prepare reservation data using existing helper
      const emailData = emailHelpers.prepareReservationEmailData(reservation, reservation.car, reservation.customer);
      console.log('📧 [EMAIL DEBUG] Email data prepared:', {
        hasEmailData: !!emailData,
        carBrand: emailData?.car_brand,
        carModel: emailData?.car_model,
        customerName: `${emailData?.first_name} ${emailData?.last_name}`
      });
      
      // Prepare attachments array (invoice PDF for LeRent)
      const attachments = [];
      if (invoicePdfBuffer) {
        attachments.push({
          filename: `Faktura_${reservation.superfakturaInvoiceNumber || reservation.reservationNumber}.pdf`,
          content: invoicePdfBuffer,
          contentType: 'application/pdf'
        });
        console.log('📎 [EMAIL] Adding SuperFaktura invoice PDF attachment');
      }

      // Send confirmation email using new template, pass both emailData and raw reservation
      console.log('📧 [EMAIL DEBUG] Calling sendCustomerReservationConfirmed...');
      await emailService.sendCustomerReservationConfirmed(reservation.customer.email, emailData, req.user, reservation, attachments);
      console.log('✅ [EMAIL] Confirmation notification sent to customer:', reservation.customer.email);
    } else {
      console.log('❌ [EMAIL DEBUG] Email not sent due to missing requirements:', {
        emailConfigured: !!emailService.isConfigured,
        hasCustomer: !!reservation.customer,
        hasEmail: !!reservation.customer?.email
      });
    }
  } catch (emailError) {
    console.error('❌ [EMAIL] Failed to send confirmation notification:', emailError.message);
    console.error('❌ [EMAIL] Full error:', emailError);
    // Don't fail the confirmation if email fails
  }

  // Populate reservation with car and customer data for response
  await reservation.populate([
    { path: 'customer', select: 'firstName lastName email phone licenseNumber' },
    { path: 'car', select: 'brand model year registrationNumber images dailyRate pricing' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Reservation confirmed successfully',
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

  if (reservation.status !== 'zaplatene') {
    return next(new AppError('Len zaplatené rezervácie je možné overiť', 400));
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

  // 📄 Create final invoice in Kros API when checkout is completed (rental only, no deposit)
  try {
    const krosApiService = require('../services/krosApiService');
    
    if (krosApiService.isReady()) {
      console.log('📄 Creating final invoice in Kros API for completed reservation:', reservation.reservationNumber);
      
      const finalInvoiceResult = await krosApiService.createFinalInvoice(reservation);
      
      if (finalInvoiceResult.success) {
        // Store final Kros invoice ID in reservation 
        reservation.krosFinalInvoiceId = finalInvoiceResult.invoiceId || null;
        reservation.krosFinalRequestId = finalInvoiceResult.requestId || null;
        reservation.krosFinalInvoiceCreatedAt = new Date();
        reservation.krosFinalInvoiceStatus = finalInvoiceResult.invoiceId ? 'created' : 'processing';
        await reservation.save();
        
        if (finalInvoiceResult.invoiceId) {
          console.log('✅ Final invoice created successfully in Kros API with ID:', finalInvoiceResult.invoiceId);
        } else {
          console.log('🔄 Final invoice submitted to Kros API for async processing. Request ID:', finalInvoiceResult.requestId);
        }
      } else {
        console.warn('⚠️ Failed to create final invoice in Kros API:', finalInvoiceResult.error);
      }
    } else {
      console.log('ℹ️ Kros API not configured, skipping final invoice creation');
    }
  } catch (finalInvoiceError) {
    console.error('❌ Error creating final invoice in Kros API:', finalInvoiceError.message);
    // Don't fail the checkout if invoice creation fails
  }

  res.status(200).json({
    success: true,
    data: reservation
  });
});

// @desc    Delete reservation permanently (Admin only)
// @route   DELETE /api/reservations/:id
// @access  Private/Admin
const deleteReservation = asyncHandler(async (req, res, next) => {
  const reservation = await Reservation.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'car', select: 'brand model year registrationNumber images imageUrl pricing deposit' },
    { path: 'payment' }
  ]);

  if (!reservation) {
    return next(new AppError('Reservation not found', 404));
  }

  // Only allow admin/staff to delete reservations
  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    return next(new AppError('Only admin and staff can delete reservations permanently', 403));
  }

  // Store reservation info for logging
  const reservationInfo = {
    id: reservation._id,
    number: reservation.reservationNumber,
    customer: reservation.customer ? `${reservation.customer.firstName} ${reservation.customer.lastName}` : 'Unknown',
    car: reservation.car ? `${reservation.car.brand} ${reservation.car.model}` : 'Unknown',
    status: reservation.status,
    deletedBy: req.user._id,
    deletedAt: new Date()
  };

  // If there's a payment associated, we might want to handle it
  if (reservation.payment) {
    console.log(`⚠️ [DELETE] Deleting reservation with associated payment ID: ${reservation.payment._id}`);
    // Note: Payment records are usually kept for audit purposes
    // You might want to mark them as "reservation_deleted" instead of deleting
    await Payment.findByIdAndUpdate(reservation.payment._id, {
      status: 'reservation_deleted',
      notes: `Reservation ${reservation.reservationNumber} was deleted by admin`
    });
  }

  // Update car stats if needed (decrease booking count if appropriate)
  if (reservation.car && reservation.status === 'completed') {
    await Car.findByIdAndUpdate(reservation.car._id, {
      $inc: { 
        totalBookings: -1,
        totalRevenue: -(reservation.pricing?.totalAmount || 0)
      }
    });
  }

  // Update customer stats if needed
  if (reservation.customer && reservation.status === 'completed') {
    await User.findByIdAndUpdate(reservation.customer._id, {
      $inc: { 
        totalBookings: -1, 
        totalSpent: -(reservation.pricing?.totalAmount || 0) 
      }
    });
  }

  // Actually delete the reservation from database
  await Reservation.findByIdAndDelete(req.params.id);

  console.log('🗑️ [DELETE] Reservation permanently deleted:', reservationInfo);

  res.status(200).json({
    success: true,
    message: 'Reservation deleted permanently',
    data: {
      deletedReservation: {
        id: reservationInfo.id,
        number: reservationInfo.number,
        customer: reservationInfo.customer,
        car: reservationInfo.car,
        deletedAt: reservationInfo.deletedAt
      }
    }
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
    doc.fontSize(12).font('Helvetica').fillColor('#333333').text(`Datum vytvorenia: ${new Date(reservation.createdAt).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' })}`, docInfoX, yPos + 40, { align: 'right' });

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
    doc.fontSize(11).font('Helvetica').fillColor('#666666').text(startDate.toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }), margin + 15, yPos + 30);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Datum vratenia:', margin + 15, yPos + 45);
    doc.fontSize(11).font('Helvetica').fillColor('#666666').text(endDate.toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }), margin + 15, yPos + 60);
    
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
    doc.text(`Vygenerovane: ${new Date().toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' })} o ${new Date().toLocaleTimeString('sk-SK', { timeZone: 'Europe/Bratislava' })}`, pageWidth - 200, footerY + 10, { align: 'right' });
    doc.text('Dakujeme za vasu objednavku!', pageWidth - 200, footerY + 25, { align: 'right' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Chyba pri generovani PDF potvrdenia rezervacie:', error);
    return next(new AppError('Chyba pri generovani PDF potvrdenia rezervacie', 500));
  }
});

// @desc    Generate Slovak rental agreement PDF
// @route   GET /api/reservations/:id/slovak-agreement
// @access  Private
const generateSlovakAgreement = asyncHandler(async (req, res, next) => {
  try {
    console.log('🔄 [PDF] Starting Slovak rental agreement generation');
    console.log('📋 [PDF] Request params:', {
      reservationId: req.params.id,
      tenantId: req.user.tenantId,
      userId: req.user._id,
      userRole: req.user.role
    });

    const reservation = await Reservation.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    })
      .populate('customer', 'firstName lastName email phone address licenseNumber idNumber')
      .populate('car', 'brand model year registrationNumber vin color category mileageLimit idCardNumber technicalInspection')
      .populate('createdBy', 'firstName lastName');

    if (!reservation) {
      console.error('❌ [PDF] Reservation not found:', req.params.id);
      return next(new AppError(`Rezervácia s ID ${req.params.id} nebola nájdená`, 404));
    }

    console.log('✅ [PDF] Reservation found:', {
      reservationNumber: reservation.reservationNumber,
      customerName: reservation.customer ? `${reservation.customer.firstName} ${reservation.customer.lastName}` : 'N/A',
      carInfo: reservation.car ? `${reservation.car.brand} ${reservation.car.model}` : 'N/A',
      status: reservation.status
    });

    // Check if user owns the reservation or is staff
    if (req.user.role === 'customer' && reservation.customer._id.toString() !== req.user._id.toString()) {
      console.error('❌ [PDF] Access denied - user does not own reservation');
      return next(new AppError('Nemáte oprávnenie na prístup k tejto rezervácii', 403));
    }

    // Get tenant admin email to determine which template to use
    const User = require('../models/User');
    const tenantAdmin = await User.findOne({
      tenantId: req.user.tenantId,
      role: 'admin'
    });

    console.log('🔄 [PDF] Calling pdfService.generateRentalAgreement...');
    console.log('📧 [PDF] Tenant email for template selection:', tenantAdmin?.email || req.user.email);

    // Generate the PDF using the PDF service - pass tenant email for template selection
    const pdfBuffer = await pdfService.generateRentalAgreement(
      reservation,
      reservation.car,
      reservation.customer,
      tenantAdmin?.email || req.user.email
    );

    console.log('✅ [PDF] PDF buffer generated successfully:', {
      bufferLength: pdfBuffer.length,
      bufferType: typeof pdfBuffer,
      isBuffer: Buffer.isBuffer(pdfBuffer)
    });

    // Set response headers for PDF
    const isPreviewing = req.query.preview === 'true';
    const filename = `zmluva-o-najme-${reservation.reservationNumber || req.params.id}.pdf`;

    console.log('📤 [PDF] Setting response headers:', {
      isPreviewing,
      filename,
      contentLength: pdfBuffer.length
    });

    if (isPreviewing) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Send the PDF
    console.log('📤 [PDF] Sending PDF buffer to client...');
    res.send(pdfBuffer);

    console.log('✅ [PDF] Slovak rental agreement sent successfully');

  } catch (error) {
    console.error('❌ [PDF] Error generating Slovak rental agreement:', error);
    console.error('❌ [PDF] Error stack:', error.stack);
    console.error('❌ [PDF] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    return next(new AppError('Chyba pri generovaní zmluvy o nájme', 500));
  }
});

// @desc    Get PDF template fields (for debugging)
// @route   GET /api/reservations/pdf-fields
// @access  Private/Staff
const getPDFTemplateFields = asyncHandler(async (req, res, next) => {
  try {
    const fields = await pdfService.getTemplateFields();
    
    res.status(200).json({
      success: true,
      count: fields.length,
      data: fields
    });
  } catch (error) {
    console.error('❌ [PDF] Error getting template fields:', error);
    return next(new AppError('Chyba pri čítaní šablóny PDF', 500));
  }
});

// @desc    Confirm payment for reservation (set status to 'zaplatene')
// @route   PUT /api/reservations/:id/confirm-payment
// @access  Private/Staff
const confirmPayment = asyncHandler(async (req, res, next) => {
  const { notes } = req.body;
  
  const reservation = await Reservation.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'car', select: 'brand model year registrationNumber images imageUrl pricing deposit' }
  ]);

  if (!reservation) {
    return next(new AppError(`Rezervácia s ID ${req.params.id} nebola nájdená`, 404));
  }

  if (reservation.status !== 'confirmed') {
    return next(new AppError('Len potvrdené rezervácie je možné označiť ako zaplatené', 400));
  }

  // Update reservation status and payment tracking
  reservation.status = 'zaplatene';
  reservation.paymentStatus = {
    confirmedAt: new Date(),
    confirmedBy: req.user._id
  };
  
  if (notes) {
    reservation.notes = `${reservation.notes || ''}\n[PLATBA POTVRDENÁ ${new Date().toLocaleString('sk-SK')}]: ${notes}`.trim();
  }

  await reservation.save();

  // 📄 Create invoice in Kros API when payment is confirmed
  try {
    const krosApiService = require('../services/krosApiService');
    
    if (krosApiService.isReady()) {
      console.log('📄 Creating invoice in Kros API for reservation:', reservation.reservationNumber);
      
      const invoiceResult = await krosApiService.createInvoice(reservation);
      
      if (invoiceResult.success) {
        // Handle both sync and async KROS responses
        if (invoiceResult.invoiceId) {
          // Immediate invoice ID available
          reservation.krosInvoiceId = invoiceResult.invoiceId;
          reservation.krosInvoiceCreatedAt = new Date();
          console.log('✅ Invoice created successfully in Kros API with ID:', invoiceResult.invoiceId);
        } else if (invoiceResult.requestId && invoiceResult.isAsync) {
          // KROS async processing - store request ID for tracking
          reservation.krosRequestId = invoiceResult.requestId;
          reservation.krosInvoiceCreatedAt = new Date();
          reservation.krosInvoiceStatus = 'processing';
          console.log('🔄 Invoice submitted to Kros API for async processing. Request ID:', invoiceResult.requestId);
        }
        
        await reservation.save();
        
        // 📧 Send simple payment confirmation email (no PDF)
        try {
          console.log('📧 Sending payment confirmation email...');
          
          const emailService = require('../services/emailService');
          
          if (emailService.isConfigured && reservation.customer && reservation.customer.email) {
            // Prepare email data for payment confirmation
            const customerName = `${reservation.customer.firstName} ${reservation.customer.lastName}`;
            const carInfo = `${reservation.car.brand} ${reservation.car.model} (${reservation.car.year})`;
            const startDate = new Date(reservation.startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' });
            const endDate = new Date(reservation.endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' });

            const emailData = {
              customerName,
              reservationNumber: reservation.reservationNumber,
              carBrand: reservation.car.brand,
              carModel: reservation.car.model,
              carYear: reservation.car.year,
              carInfo,
              startDate,
              endDate,
              totalAmount: reservation.pricing.totalAmount,
              businessName: process.env.COMPANY_NAME || 'CarFlow Rental',
              contactEmail: process.env.COMPANY_EMAIL || 'info@carflow.sk',
              contactPhone: process.env.COMPANY_PHONE || '+421 XXX XXX XXX'
            };

            // Send simple payment confirmation email without attachment
            await emailService.sendPaymentReceivedWithoutInvoice(
              reservation.customer.email,
              emailData,
              req.user
            );
            
            console.log('✅ Payment confirmation email sent to customer:', reservation.customer.email);
          } else {
            console.warn('⚠️ Email service not configured or missing customer email');
          }
        } catch (emailError) {
          console.error('❌ Error sending payment confirmation email:', emailError.message);
          // Don't fail the payment confirmation if email fails
        }
      } else {
        console.warn('⚠️ Failed to create invoice in Kros API:', invoiceResult.error);
      }
    } else {
      console.log('ℹ️ Kros API not configured, skipping invoice creation');
    }
  } catch (invoiceError) {
    console.error('❌ Error creating invoice in Kros API:', invoiceError.message);
    // Don't fail the payment confirmation if invoice creation fails
  }

  res.status(200).json({
    success: true,
    message: 'Platba bola úspešne potvrdená',
    data: reservation
  });
});

// @desc    Send payment notification email
// @route   POST /api/reservations/:id/send-payment-notification
// @access  Private/Staff
const sendPaymentNotification = asyncHandler(async (req, res, next) => {
  const emailService = require('../services/emailService');
  
  const reservation = await Reservation.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'car', select: 'brand model year registrationNumber images imageUrl pricing deposit' }
  ]);

  if (!reservation) {
    return next(new AppError(`Rezervácia s ID ${req.params.id} nebola nájdená`, 404));
  }

  if (reservation.status !== 'confirmed') {
    return next(new AppError('Upomienka platby sa môže poslať len pre potvrdené rezervácie', 400));
  }

  if (reservation.status === 'zaplatene') {
    return next(new AppError('Rezervácia je už zaplatená', 400));
  }

  try {
    // Get business/tenant details
    const businessUser = await User.findOne({ tenantId: req.user.tenantId, role: 'admin' });
    
    // Prepare email data with correct variable names for templates
    const depositAmount = reservation.car.deposit || reservation.pricing.deposit || 0;
    const emailData = {
      // Customer info
      customer_name: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
      first_name: reservation.customer.firstName,
      last_name: reservation.customer.lastName,

      // Reservation info
      reservation_number: reservation.reservationNumber,

      // Car info
      car_brand: reservation.car.brand,
      car_model: reservation.car.model,
      car_year: reservation.car.year,

      // Dates and location
      start_date: reservation.startDate.toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }),
      end_date: reservation.endDate.toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }),
      total_days: reservation.pricing.totalDays,
      pickup_location: reservation.pickupLocation.name,

      // Pricing
      total_amount: `${reservation.pricing.totalAmount}€`,
      deposit_amount: `${depositAmount}€`,

      // Payment details
      bank_account: businessUser?.bankAccount || 'SK31 1200 0000 0012 3456 7890',
      variable_symbol: reservation.reservationNumber || '',

      // Company info
      company_name: businessUser?.companyName || 'NITRA-CAR',
      company_phone: businessUser?.phone || '+421 910 524 554',
      company_email: businessUser?.email || 'info@nitra-car.sk',
      company_address: businessUser?.address || '',

      // Social media
      instagram_url: businessUser?.instagramUrl || 'https://www.instagram.com/nitracar',
      facebook_url: businessUser?.facebookUrl || 'https://www.facebook.com/nitracar',

      // Additional
      google_maps_link: businessUser?.googleMapsUrl || '',
      company_website: businessUser?.website || 'https://www.nitra-car.sk',
      current_year: new Date().getFullYear()
    };

    // For nitra-car users: Generate Stripe payment link for €50
    if (req.user?.email && (
      req.user.email.toLowerCase().includes('nitra-car@nitra-car.sk') ||
      req.user.email.toLowerCase().includes('nitracar') ||
      req.user.email.toLowerCase().includes('nitra-car')
    )) {
      console.log('💳 [STRIPE] Generating payment link for nitra-car payment notification');
      try {
        const Settings = require('../models/Settings');
        const stripeConfig = await Settings.getStripeConfig(req.user.tenantId);

        if (stripeConfig && stripeConfig.secretKey) {
          const stripe = require('stripe')(stripeConfig.secretKey);

          // Create a Stripe Payment Link for €50
          const paymentLink = await stripe.paymentLinks.create({
            line_items: [
              {
                price_data: {
                  currency: 'eur',
                  product_data: {
                    name: 'Rezervačný poplatok',
                    description: `Rezervácia #${reservation.reservationNumber}`,
                  },
                  unit_amount: 5000, // €50 in cents
                },
                quantity: 1,
              },
            ],
            after_completion: {
              type: 'hosted_confirmation',
              hosted_confirmation: {
                custom_message: 'Ďakujeme za úhradu rezervačného poplatku!',
              },
            },
          });

          emailData.stripe_payment_url = paymentLink.url;
          emailData.stripe_payment_amount = '50€';
          console.log('✅ [STRIPE] Payment link created for payment notification:', paymentLink.url);
        } else {
          console.warn('⚠️ [STRIPE] No Stripe configuration found for nitra-car tenant');
          emailData.stripe_payment_url = '';
        }
      } catch (error) {
        console.error('❌ [STRIPE] Error creating payment link for nitra-car payment notification:', error);
        emailData.stripe_payment_url = '';
      }
    } else {
      emailData.stripe_payment_url = '';
    }

    // Send payment notification email with user context for tenant-specific templates
    await emailService.sendTemplatedEmail(
      reservation.customer.email,
      'Upomienka platby rezervácie',
      'payment-notification',
      emailData,
      req.user  // Pass user for tenant-specific template selection
    );

    // Update tracking
    reservation.paymentStatus = {
      ...reservation.paymentStatus,
      paymentNotificationSent: true,
      paymentNotificationSentAt: new Date(),
      paymentNotificationSentBy: req.user._id
    };
    
    await reservation.save();

    res.status(200).json({
      success: true,
      message: 'Upomienka platby bola úspešne odoslaná',
      data: {
        sentTo: reservation.customer.email,
        sentAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error sending payment notification:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return next(new AppError(`Chyba pri odosielaní upomienky platby: ${error.message}`, 500));
  }
});

// @desc    Create SuperFaktura invoice manually for a reservation
// @route   POST /api/reservations/:id/create-invoice
// @access  Private/Admin (LeRent only)
const createInvoice = asyncHandler(async (req, res, next) => {
  console.log('🧾 [CREATE INVOICE] Manual invoice creation requested');
  console.log('🧾 [CREATE INVOICE] Reservation ID:', req.params.id);
  console.log('🧾 [CREATE INVOICE] User:', req.user?.email);
  console.log('🧾 [CREATE INVOICE] Tenant:', req.user?.tenantId);

  try {
    // Check if user is LeRent tenant
    console.log('🧾 [CREATE INVOICE] Current user email:', req.user?.email);

    if (!req.user || req.user.email.toLowerCase() !== 'lerent@lerent.sk') {
      console.log('❌ [CREATE INVOICE] Access denied - not LeRent tenant');
      return next(new AppError('Vytváranie faktúr je dostupné len pre LeRent', 403));
    }

    // Find reservation
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    }).populate([
      { path: 'customer', select: 'firstName lastName email phone address city zip' },
      { path: 'car', select: 'brand model year registrationNumber' }
    ]);

    if (!reservation) {
      console.log('❌ [CREATE INVOICE] Reservation not found');
      return next(new AppError('Rezervácia nenájdená', 404));
    }

    console.log('🧾 [CREATE INVOICE] Reservation found:', reservation.reservationNumber);
    console.log('🧾 [CREATE INVOICE] Customer:', reservation.customer?.email);
    console.log('🧾 [CREATE INVOICE] Car:', reservation.car?.brand, reservation.car?.model);

    // Check if invoice already exists and has token
    if (reservation.superfakturaInvoiceId && reservation.superfakturaToken) {
      console.log('⚠️ [CREATE INVOICE] Invoice already exists:', reservation.superfakturaInvoiceId);
      return res.status(200).json({
        success: true,
        message: 'Faktúra už existuje',
        data: {
          invoiceId: reservation.superfakturaInvoiceId,
          invoiceNumber: reservation.superfakturaInvoiceNumber,
          alreadyExists: true
        }
      });
    }

    // If invoice exists but token is missing, allow re-creation to get token
    if (reservation.superfakturaInvoiceId && !reservation.superfakturaToken) {
      console.log('⚠️ [CREATE INVOICE] Invoice exists but token missing, will re-create to get token');
    }

    // Create invoice via SuperFaktura
    console.log('🧾 [CREATE INVOICE] Calling SuperFaktura service...');
    const superfakturaService = require('../services/superfakturaService');
    const invoiceResult = await superfakturaService.createInvoiceFromReservation(reservation);

    console.log('🧾 [CREATE INVOICE] SuperFaktura response:', JSON.stringify(invoiceResult, null, 2));

    if (!invoiceResult.success) {
      console.error('❌ [CREATE INVOICE] SuperFaktura error:', invoiceResult.error);
      return next(new AppError(`Chyba pri vytváraní faktúry: ${invoiceResult.error}`, 500));
    }

    // Save invoice info to reservation
    const invoice = invoiceResult.data.data.Invoice;
    reservation.superfakturaInvoiceId = invoice.id;
    reservation.superfakturaInvoiceNumber = invoice.invoice_no_formatted;
    reservation.superfakturaToken = invoice.token;
    await reservation.save();

    console.log('✅ [CREATE INVOICE] Invoice created and saved successfully');
    console.log('🧾 [CREATE INVOICE] Invoice ID:', invoice.id);
    console.log('🧾 [CREATE INVOICE] Invoice Number:', invoice.invoice_no_formatted);
    console.log('🧾 [CREATE INVOICE] Invoice Token:', invoice.token);
    console.log('🧾 [CREATE INVOICE] Variable Symbol:', reservation.reservationNumber);

    // Try to download PDF
    let pdfDownloaded = false;
    try {
      console.log('📥 [CREATE INVOICE] Attempting to download invoice PDF...');
      const pdfBuffer = await superfakturaService.getInvoicePdf(
        invoice.id,
        invoice.token
      );
      pdfDownloaded = true;
      console.log('✅ [CREATE INVOICE] PDF downloaded successfully, size:', pdfBuffer.length, 'bytes');
    } catch (pdfError) {
      console.error('❌ [CREATE INVOICE] PDF download failed:', pdfError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Faktúra úspešne vytvorená',
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_no_formatted,
        pdfDownloaded,
        superfakturaResponse: invoiceResult.data
      }
    });

  } catch (error) {
    console.error('❌ [CREATE INVOICE] Unexpected error:', error.message);
    console.error('❌ [CREATE INVOICE] Stack:', error.stack);
    return next(new AppError(`Chyba pri vytváraní faktúry: ${error.message}`, 500));
  }
});

// @desc    Download SuperFaktura invoice PDF
// @route   GET /api/reservations/:id/invoice-pdf
// @access  Private/Staff (LeRent only)
const downloadInvoicePdf = asyncHandler(async (req, res, next) => {
  console.log('📥 [DOWNLOAD INVOICE PDF] PDF download requested');
  console.log('📥 [DOWNLOAD INVOICE PDF] Reservation ID:', req.params.id);
  console.log('📥 [DOWNLOAD INVOICE PDF] User:', req.user?.email);

  try {
    // Check if user is LeRent tenant
    if (!req.user || req.user.email.toLowerCase() !== 'lerent@lerent.sk') {
      console.log('❌ [DOWNLOAD INVOICE PDF] Access denied - not LeRent tenant');
      return next(new AppError('Sťahovanie faktúr je dostupné len pre LeRent', 403));
    }

    // Find reservation with invoice info
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!reservation) {
      console.log('❌ [DOWNLOAD INVOICE PDF] Reservation not found');
      return next(new AppError('Rezervácia nenájdená', 404));
    }

    // Log what we have
    console.log('📥 [DOWNLOAD INVOICE PDF] Checking invoice data...');
    console.log('📥 [DOWNLOAD INVOICE PDF] Invoice ID:', reservation.superfakturaInvoiceId);
    console.log('📥 [DOWNLOAD INVOICE PDF] Invoice Number:', reservation.superfakturaInvoiceNumber);
    console.log('📥 [DOWNLOAD INVOICE PDF] Invoice Token:', reservation.superfakturaToken ? 'EXISTS' : 'MISSING');

    // Check if invoice exists
    if (!reservation.superfakturaInvoiceId || !reservation.superfakturaToken) {
      console.log('❌ [DOWNLOAD INVOICE PDF] Invoice data incomplete');
      if (!reservation.superfakturaInvoiceId) {
        console.log('❌ [DOWNLOAD INVOICE PDF] Missing: Invoice ID');
      }
      if (!reservation.superfakturaToken) {
        console.log('❌ [DOWNLOAD INVOICE PDF] Missing: Invoice Token - Invoice was created before token-saving was implemented');
      }
      return next(new AppError('Pre túto rezerváciu chýba token faktúry. Vytvorte faktúru znova.', 404));
    }

    // Download PDF from SuperFaktura
    const superfakturaService = require('../services/superfakturaService');
    const pdfBuffer = await superfakturaService.getInvoicePdf(
      reservation.superfakturaInvoiceId,
      reservation.superfakturaToken
    );

    console.log('✅ [DOWNLOAD INVOICE PDF] PDF downloaded successfully, size:', pdfBuffer.length, 'bytes');

    // Set headers for PDF download
    const filename = `Faktura_${reservation.superfakturaInvoiceNumber || reservation.reservationNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ [DOWNLOAD INVOICE PDF] Error:', error.message);
    console.error('❌ [DOWNLOAD INVOICE PDF] Stack:', error.stack);
    return next(new AppError(`Chyba pri sťahovaní faktúry: ${error.message}`, 500));
  }
});

module.exports = {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  confirmReservation,
  checkInReservation,
  checkOutReservation,
  deleteReservation,
  getReservationStats,
  generateReservationContract,
  generateSlovakAgreement,
  getPDFTemplateFields,
  confirmPayment,
  sendPaymentNotification,
  createInvoice,
  downloadInvoicePdf
}; 