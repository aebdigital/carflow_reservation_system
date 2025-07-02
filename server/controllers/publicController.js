const Car = require('../models/Car');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');
const { DiscountCode } = require('../models/WebsiteSettings');

// Helper function to get tenant by user email
const getTenantByUserEmail = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError(`User not found with email: ${email}`, 404);
  }
  return user.tenantId;
};

// @desc    Get cars for a specific user/tenant (public)
// @route   GET /api/public/users/:email/cars
// @access  Public
const getCarsByUser = asyncHandler(async (req, res, next) => {
  const { email } = req.params;
  
  // Get tenant ID from user email
  const tenantId = await getTenantByUserEmail(email);
  
  // Build query with tenant filter
  const baseQuery = { tenantId, isActive: true, status: 'available' };
  
  // Copy req.query and merge with base filter
  const reqQuery = { ...req.query };
  
  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);
  
  // Create query string
  let queryStr = JSON.stringify({ ...baseQuery, ...reqQuery });
  
  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
  
  // Finding resource with tenant filter
  let query = Car.find(JSON.parse(queryStr));
  
  // Select only public fields
  const publicFields = 'brand model year color category fuelType transmission seats doors description dailyRate weeklyRate monthlyRate location features images';
  query = query.select(publicFields);
  
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
  const total = await Car.countDocuments(JSON.parse(queryStr));
  
  query = query.skip(startIndex).limit(limit);
  
  // Execute query
  const cars = await query;
  
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
    count: cars.length,
    total,
    pagination,
    data: cars
  });
});

// @desc    Get single car details for a specific user/tenant (public)
// @route   GET /api/public/users/:email/cars/:carId
// @access  Public
const getCarByUser = asyncHandler(async (req, res, next) => {
  const { email, carId } = req.params;
  
  // Get tenant ID from user email
  const tenantId = await getTenantByUserEmail(email);
  
  const car = await Car.findOne({ 
    _id: carId, 
    tenantId,
    isActive: true 
  }).select('brand model year color category fuelType transmission seats doors description dailyRate weeklyRate monthlyRate location features images status mileage');
  
  if (!car) {
    return next(new AppError(`Car not found with id: ${carId}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: car
  });
});

// @desc    Get car availability for a specific user/tenant (public)
// @route   GET /api/public/users/:email/cars/:carId/availability
// @access  Public
const getCarAvailabilityByUser = asyncHandler(async (req, res, next) => {
  const { email, carId } = req.params;
  const { startDate, endDate } = req.query;
  
  // Get tenant ID from user email
  const tenantId = await getTenantByUserEmail(email);
  
  const car = await Car.findOne({ 
    _id: carId, 
    tenantId,
    isActive: true 
  });
  
  if (!car) {
    return next(new AppError(`Car not found with id: ${carId}`, 404));
  }
  
  let availability = {
    isAvailable: car.status === 'available',
    status: car.status
  };
  
  // If dates are provided, check for overlapping reservations
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return next(new AppError('End date must be after start date', 400));
    }
    
    const overlappingReservations = await Reservation.find({
      car: carId,
      tenantId,
      status: { $in: ['confirmed', 'ongoing'] },
      $or: [
        {
          startDate: { $lte: start },
          endDate: { $gte: start }
        },
        {
          startDate: { $lte: end },
          endDate: { $gte: end }
        },
        {
          startDate: { $gte: start },
          endDate: { $lte: end }
        }
      ]
    });
    
    availability.isAvailableForDates = overlappingReservations.length === 0 && car.status === 'available';
    availability.conflictingReservations = overlappingReservations.length;
  }
  
  res.status(200).json({
    success: true,
    data: availability
  });
});

// @desc    Get cars by category for a specific user/tenant (public)
// @route   GET /api/public/users/:email/cars/category/:category
// @access  Public
const getCarsByCategoryAndUser = asyncHandler(async (req, res, next) => {
  const { email, category } = req.params;
  
  // Get tenant ID from user email
  const tenantId = await getTenantByUserEmail(email);
  
  const cars = await Car.find({
    tenantId,
    category: category.toLowerCase(),
    isActive: true,
    status: 'available'
  }).select('brand model year color dailyRate weeklyRate monthlyRate location features images');
  
  res.status(200).json({
    success: true,
    count: cars.length,
    data: cars
  });
});

// @desc    Get car features/amenities for a specific user/tenant (public)
// @route   GET /api/public/users/:email/features
// @access  Public
const getAvailableFeaturesByUser = asyncHandler(async (req, res, next) => {
  const { email } = req.params;
  
  // Get tenant ID from user email
  const tenantId = await getTenantByUserEmail(email);
  
  const features = await Car.distinct('features', { 
    tenantId,
    isActive: true 
  });
  
  res.status(200).json({
    success: true,
    data: features
  });
});

// @desc    Create a reservation for a specific user/tenant (auto-create customer if needed)
// @route   POST /api/public/users/:email/reservations
// @access  Public
const createReservationByUser = asyncHandler(async (req, res, next) => {
  const { email } = req.params;
  const {
    // Customer details
    firstName,
    lastName,
    customerEmail,
    phone,
    dateOfBirth,
    address,
    licenseNumber,
    licenseExpiry,
    
    // Reservation details
    carId,
    startDate,
    endDate,
    pickupLocation,
    dropoffLocation,
    additionalDrivers,
    specialRequests,
    notes,
    discountCode // Add discount code support
  } = req.body;

  // Use provided customerEmail or fallback to the email in the URL
  const finalCustomerEmail = customerEmail || email;

  // Get tenant ID from user email
  const tenantId = await getTenantByUserEmail(email);

  // Validate required fields
  if (!firstName || !lastName || !finalCustomerEmail || !phone || !licenseNumber || !carId || !startDate || !endDate) {
    return next(new AppError('Missing required fields: firstName, lastName, email, phone, licenseNumber, carId, startDate, endDate', 400));
  }

  // Check if car exists and is available for this tenant
  const car = await Car.findOne({ 
    _id: carId, 
    tenantId,
    isActive: true 
  });
  
  if (!car) {
    return next(new AppError('Car not found', 404));
  }

  if (car.status !== 'available') {
    return next(new AppError('Car is not available for booking', 400));
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (start < now) {
    return next(new AppError('Start date cannot be in the past', 400));
  }

  if (end <= start) {
    return next(new AppError('End date must be after start date', 400));
  }

  // Check for overlapping reservations within the same tenant
  const overlappingReservations = await Reservation.find({
    car: carId,
    tenantId,
    status: { $in: ['confirmed', 'ongoing', 'pending'] },
    $or: [
      {
        startDate: { $lte: start },
        endDate: { $gte: start }
      },
      {
        startDate: { $lte: end },
        endDate: { $gte: end }
      },
      {
        startDate: { $gte: start },
        endDate: { $lte: end }
      }
    ]
  });
  
  if (overlappingReservations.length > 0) {
    return next(new AppError('Car is not available for the selected dates', 400));
  }

  try {
    // Check if customer already exists within this tenant
    let customer = await User.findOne({ 
      email: finalCustomerEmail.toLowerCase(),
      tenantId 
    });

    if (!customer) {
      // Create new customer for this tenant
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('customer123', salt);

      customer = await User.create({
        firstName,
        lastName,
        email: finalCustomerEmail.toLowerCase(),
        password: hashedPassword,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        address: {
          street: address?.street || '',
          city: address?.city || '',
          state: address?.state || '',
          zipCode: address?.zipCode || '',
          country: address?.country || ''
        },
        licenseNumber,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
        role: 'customer',
        isActive: true,
        tenantId
      });
    } else {
      // Update existing customer with new information if provided
      if (phone) customer.phone = phone;
      if (dateOfBirth) customer.dateOfBirth = new Date(dateOfBirth);
      if (licenseNumber) customer.licenseNumber = licenseNumber;
      if (licenseExpiry) customer.licenseExpiry = new Date(licenseExpiry);
      if (address) {
        customer.address = {
          street: address.street || customer.address?.street || '',
          city: address.city || customer.address?.city || '',
          state: address.state || customer.address?.state || '',
          zipCode: address.zipCode || customer.address?.zipCode || '',
          country: address.country || customer.address?.country || ''
        };
      }
      await customer.save();
    }

    // Calculate rental duration and total cost
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    let subtotal = car.dailyRate * durationDays;

    // Apply weekly/monthly rates if applicable
    if (durationDays >= 30 && car.monthlyRate) {
      const months = Math.floor(durationDays / 30);
      const remainingDays = durationDays % 30;
      subtotal = (months * car.monthlyRate) + (remainingDays * car.dailyRate);
    } else if (durationDays >= 7 && car.weeklyRate) {
      const weeks = Math.floor(durationDays / 7);
      const remainingDays = durationDays % 7;
      subtotal = (weeks * car.weeklyRate) + (remainingDays * car.dailyRate);
    }

    // Calculate taxes (assuming 10% tax rate)
    const taxes = subtotal * 0.10;
    
    // Initialize pricing object
    let pricing = {
      dailyRate: car.dailyRate,
      totalDays: durationDays,
      subtotal: subtotal,
      taxes: taxes,
      fees: [],
      discounts: [],
      totalAmount: subtotal + taxes
    };

    let appliedDiscountCodes = [];

    // Handle discount code if provided
    if (discountCode) {
      const discountCodeDoc = await DiscountCode.findOne({
        code: discountCode.toUpperCase(),
        tenantId
      });

      if (!discountCodeDoc) {
        return next(new AppError('Invalid discount code', 400));
      }

      // Validate discount code
      if (!discountCodeDoc.isValid()) {
        return next(new AppError('Discount code has expired or is not active', 400));
      }

      // Check if customer can use this code
      const canUse = discountCodeDoc.canBeUsedBy(customer);
      if (!canUse.valid) {
        return next(new AppError(canUse.reason, 400));
      }

      // Calculate discount
      const discountResult = discountCodeDoc.calculateDiscount(
        subtotal, 
        durationDays, 
        car.category
      );

      if (discountResult.reason) {
        return next(new AppError(discountResult.reason, 400));
      }

      // Apply discount
      const discountAmount = discountResult.discount;
      
      pricing.discounts.push({
        name: `Discount Code: ${discountCodeDoc.code}`,
        amount: discountAmount,
        percentage: discountCodeDoc.discountType === 'percentage' ? discountCodeDoc.discountValue : null,
        description: discountCodeDoc.description || `${discountCodeDoc.discountValue}${discountCodeDoc.discountType === 'percentage' ? '%' : '€'} discount`,
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

    // Default pickup/dropoff locations if not provided
    const defaultPickup = pickupLocation || {
      name: car.location?.name || 'Main Office',
      address: car.location?.address || {
        street: '123 Main St',
        city: 'City',
        state: 'State',
        zipCode: '12345',
        country: 'Country'
      }
    };

    const defaultDropoff = dropoffLocation || defaultPickup;

    // Generate unique reservation number
    const reservationNumber = `RES-${tenantId.toString().slice(-4).toUpperCase()}-${Date.now()}`;

    // Create reservation
    const reservation = await Reservation.create({
      tenantId,
      reservationNumber,
      customer: customer._id,
      car: carId,
      startDate: start,
      endDate: end,
      pickupLocation: defaultPickup,
      dropoffLocation: defaultDropoff,
      status: 'pending',
      pricing,
      appliedDiscountCodes,
      additionalDrivers: additionalDrivers || [],
      specialRequests: specialRequests || '',
      notes: notes || '',
      terms: {
        mileageLimit: -1,
        fuelPolicy: 'full-to-full',
        cancellationPolicy: 'Free cancellation up to 24 hours before pickup',
        lateReturnFee: 50
      }
    });

    // Update discount code usage if applied
    if (appliedDiscountCodes.length > 0) {
      for (const appliedCode of appliedDiscountCodes) {
        await DiscountCode.findByIdAndUpdate(
          appliedCode.discountCode,
          {
            $inc: { currentUsageCount: 1 },
            $push: {
              usedBy: {
                customer: customer._id,
                reservation: reservation._id,
                discountApplied: appliedCode.discountAmount,
                usedAt: new Date()
              }
            }
          }
        );
      }
    }

    // Update car stats
    await Car.findByIdAndUpdate(car._id, {
      $inc: { 
        totalBookings: 1,
        totalRevenue: pricing.totalAmount
      }
    });

    // Populate the reservation with customer and car details
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('car', 'brand model year registrationNumber dailyRate images')
      .populate('appliedDiscountCodes.discountCode', 'code description discountType discountValue');

    res.status(201).json({
      success: true,
      message: 'Reservation request submitted successfully! You will receive a confirmation email shortly.',
      data: {
        reservation: populatedReservation,
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          isNewCustomer: !customer.createdAt || new Date() - customer.createdAt < 1000
        },
        loginInfo: {
          email: customer.email,
          defaultPassword: customer.createdAt && new Date() - customer.createdAt < 1000 ? 'customer123' : 'Use your existing password',
          message: 'You can log in to track your reservation status'
        },
        discount: appliedDiscountCodes.length > 0 ? {
          applied: true,
          codes: appliedDiscountCodes,
          totalSaved: appliedDiscountCodes.reduce((sum, code) => sum + code.discountAmount, 0)
        } : { applied: false }
      }
    });

  } catch (error) {
    throw error;
  }
});

// @desc    Create a public reservation (auto-create customer if needed)
// @route   POST /api/public/reservations
// @access  Public
const createPublicReservation = asyncHandler(async (req, res, next) => {
  const {
    // Customer details
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    address,
    licenseNumber,
    licenseExpiry,
    
    // Reservation details
    carId,
    startDate,
    endDate,
    pickupLocation,
    dropoffLocation,
    additionalDrivers,
    specialRequests,
    notes
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !phone || !licenseNumber || !carId || !startDate || !endDate) {
    return next(new AppError('Missing required fields: firstName, lastName, email, phone, licenseNumber, carId, startDate, endDate', 400));
  }

  // Check if car exists and is available
  const car = await Car.findById(carId);
  if (!car) {
    return next(new AppError('Car not found', 404));
  }

  if (car.status !== 'available') {
    return next(new AppError('Car is not available for booking', 400));
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (start < now) {
    return next(new AppError('Start date cannot be in the past', 400));
  }

  if (end <= start) {
    return next(new AppError('End date must be after start date', 400));
  }

  // Check for overlapping reservations
  const overlappingReservations = await Reservation.findOverlapping(carId, start, end);
  if (overlappingReservations.length > 0) {
    return next(new AppError('Car is not available for the selected dates', 400));
  }

  try {
    // Check if user already exists
    let customer = await User.findOne({ email: email.toLowerCase() });

    if (!customer) {
      // Create new customer
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('customer123', salt); // Default password

      customer = await User.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        address: {
          street: address?.street || '',
          city: address?.city || '',
          state: address?.state || '',
          zipCode: address?.zipCode || '',
          country: address?.country || ''
        },
        licenseNumber,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
        role: 'customer',
        isActive: true
      });
    } else {
      // Update existing customer with new information if provided
      if (phone) customer.phone = phone;
      if (dateOfBirth) customer.dateOfBirth = new Date(dateOfBirth);
      if (licenseNumber) customer.licenseNumber = licenseNumber;
      if (licenseExpiry) customer.licenseExpiry = new Date(licenseExpiry);
      if (address) {
        customer.address = {
          street: address.street || customer.address?.street || '',
          city: address.city || customer.address?.city || '',
          state: address.state || customer.address?.state || '',
          zipCode: address.zipCode || customer.address?.zipCode || '',
          country: address.country || customer.address?.country || ''
        };
      }
      await customer.save();
    }

    // Calculate rental duration and total cost
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    let subtotal = car.dailyRate * durationDays;

    // Apply weekly/monthly rates if applicable
    if (durationDays >= 30 && car.monthlyRate) {
      const months = Math.floor(durationDays / 30);
      const remainingDays = durationDays % 30;
      subtotal = (months * car.monthlyRate) + (remainingDays * car.dailyRate);
    } else if (durationDays >= 7 && car.weeklyRate) {
      const weeks = Math.floor(durationDays / 7);
      const remainingDays = durationDays % 7;
      subtotal = (weeks * car.weeklyRate) + (remainingDays * car.dailyRate);
    }

    // Calculate taxes (assuming 10% tax rate)
    const taxes = subtotal * 0.10;
    const totalAmount = subtotal + taxes;

    // Default pickup/dropoff locations if not provided
    const defaultPickup = pickupLocation || {
      name: car.location?.name || 'Main Office',
      address: car.location?.address || {
        street: '123 Main St',
        city: 'City',
        state: 'State',
        zipCode: '12345',
        country: 'Country'
      }
    };

    const defaultDropoff = dropoffLocation || defaultPickup;

    // Create reservation
    const reservation = await Reservation.create({
      customer: customer._id,
      car: carId,
      startDate: start,
      endDate: end,
      pickupLocation: defaultPickup,
      dropoffLocation: defaultDropoff,
      status: 'pending', // Pending approval from staff
      pricing: {
        dailyRate: car.dailyRate,
        totalDays: durationDays,
        subtotal: subtotal,
        taxes: taxes,
        fees: [],
        discounts: [],
        totalAmount: totalAmount
      },
      additionalDrivers: additionalDrivers || [],
      specialRequests: specialRequests || '',
      notes: notes || '',
      terms: {
        mileageLimit: -1, // Unlimited
        fuelPolicy: 'full-to-full',
        cancellationPolicy: 'Free cancellation up to 24 hours before pickup',
        lateReturnFee: 50
      }
    });

    // Save the reservation
    const savedReservation = await reservation.save();

    // Update car stats
    await Car.findByIdAndUpdate(car._id, {
      $inc: { 
        totalBookings: 1,
        totalRevenue: totalAmount
      }
    });

    // Create payment record
    let payment = null;

    // Populate the reservation with customer and car details
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('car', 'brand model year registrationNumber dailyRate images');

    res.status(201).json({
      success: true,
      message: 'Reservation request submitted successfully! You will receive a confirmation email shortly.',
      data: {
        reservation: populatedReservation,
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          isNewCustomer: !customer.createdAt || new Date() - customer.createdAt < 1000
        },
        loginInfo: {
          email: customer.email,
          defaultPassword: customer.createdAt && new Date() - customer.createdAt < 1000 ? 'customer123' : 'Use your existing password',
          message: 'You can log in to track your reservation status'
        }
      }
    });

  } catch (error) {
    throw error;
  }
});

// @desc    Get website settings for tenant by user email (public)
// @route   GET /api/public/users/:email/website-settings
// @access  Public
const getWebsiteSettingsByUser = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  
  if (!userEmail) {
    return next(new AppError('User email is required', 400));
  }

  try {
    const tenantId = await getTenantByUserEmail(userEmail);
    
    if (!tenantId) {
      return next(new AppError('Tenant not found for this user', 404));
    }

    const { WebsiteSettings } = require('../models/WebsiteSettings');
    
    let settings = await WebsiteSettings.findOne({ tenantId });
    
    // If no settings exist, return default empty settings
    if (!settings) {
      return res.status(200).json({
        success: true,
        data: {
          infoBar: { isActive: false },
          modal: { isActive: false }
        }
      });
    }

    // Return only public-relevant settings
    const publicSettings = {
      infoBar: settings.infoBar || { isActive: false },
      modal: settings.modal || { isActive: false },
      siteName: settings.siteName || 'CarFlow Rental',
      siteDescription: settings.siteDescription || 'Professional car rental service',
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      socialLinks: settings.socialLinks || {},
      metaTitle: settings.metaTitle,
      metaDescription: settings.metaDescription
    };

    res.status(200).json({
      success: true,
      data: publicSettings
    });

  } catch (error) {
    console.error('Error fetching website settings:', error);
    return next(new AppError('Error fetching website settings', 500));
  }
});

// @desc    Get active info bar for tenant by user email
// @route   GET /api/public/users/:email/info-bar
// @access  Public
const getInfoBarByUser = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  const currentPage = req.query.page || 'homepage'; // homepage, pricing, all-pages
  
  if (!userEmail) {
    return next(new AppError('User email is required', 400));
  }

  try {
    const tenantId = await getTenantByUserEmail(userEmail);
    
    if (!tenantId) {
      return next(new AppError('Tenant not found for this user', 404));
    }

    const { WebsiteSettings } = require('../models/WebsiteSettings');
    
    const settings = await WebsiteSettings.findOne({ tenantId });
    
    if (!settings || !settings.infoBar || !settings.infoBar.isActive) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active info bar found'
      });
    }

    const infoBar = settings.infoBar;
    
    // Check if info bar should be displayed on current page
    if (infoBar.displayLocation === 'homepage' && currentPage !== 'homepage') {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Info bar not configured for this page'
      });
    }

    // Check date restrictions
    const now = new Date();
    if (infoBar.startDate && now < new Date(infoBar.startDate)) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Info bar not yet active'
      });
    }
    
    if (infoBar.endDate && now > new Date(infoBar.endDate)) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Info bar has expired'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        text: infoBar.text,
        color: infoBar.color,
        backgroundColor: infoBar.backgroundColor,
        textColor: infoBar.textColor,
        displayLocation: infoBar.displayLocation
      }
    });

  } catch (error) {
    console.error('Error fetching info bar:', error);
    return next(new AppError('Error fetching info bar', 500));
  }
});

// @desc    Get active modal for tenant by user email
// @route   GET /api/public/users/:email/modal
// @access  Public
const getModalByUser = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  const currentPage = req.query.page || 'homepage'; // homepage, pricing, all-pages
  
  if (!userEmail) {
    return next(new AppError('User email is required', 400));
  }

  try {
    const tenantId = await getTenantByUserEmail(userEmail);
    
    if (!tenantId) {
      return next(new AppError('Tenant not found for this user', 404));
    }

    const { WebsiteSettings } = require('../models/WebsiteSettings');
    
    const settings = await WebsiteSettings.findOne({ tenantId });
    
    if (!settings || !settings.modal || !settings.modal.isActive) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active modal found'
      });
    }

    const modal = settings.modal;
    
    // Check if modal should be displayed on current page
    if (modal.displayLocation === 'homepage' && currentPage !== 'homepage') {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Modal not configured for this page'
      });
    }
    
    if (modal.displayLocation === 'pricing' && currentPage !== 'pricing') {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Modal not configured for this page'
      });
    }

    // Check date restrictions
    const now = new Date();
    if (modal.startDate && now < new Date(modal.startDate)) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Modal not yet active'
      });
    }
    
    if (modal.endDate && now > new Date(modal.endDate)) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Modal has expired'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        title: modal.title,
        content: modal.content,
        type: modal.type,
        displayLocation: modal.displayLocation,
        triggerRule: modal.triggerRule,
        emailPlaceholder: modal.emailPlaceholder,
        buttonText: modal.buttonText,
        discountCode: modal.discountCode,
        discountPercentage: modal.discountPercentage,
        backgroundColor: modal.backgroundColor,
        textColor: modal.textColor,
        buttonColor: modal.buttonColor
      }
    });

  } catch (error) {
    console.error('Error fetching modal:', error);
    return next(new AppError('Error fetching modal', 500));
  }
});

// @desc    Subscribe to newsletter (public)
// @route   POST /api/public/users/:email/newsletter
// @access  Public
const subscribeToNewsletter = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  const { subscriberEmail, firstName, lastName } = req.body;
  
  if (!userEmail || !subscriberEmail) {
    return next(new AppError('User email and subscriber email are required', 400));
  }

  try {
    const tenantId = await getTenantByUserEmail(userEmail);
    
    if (!tenantId) {
      return next(new AppError('Tenant not found for this user', 404));
    }

    // Here you could save newsletter subscriptions to a Newsletter model
    // For now, we'll just return success
    console.log(`Newsletter subscription for tenant ${tenantId}:`, {
      subscriberEmail,
      firstName,
      lastName,
      subscribedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Successfully subscribed to newsletter'
    });

  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return next(new AppError('Error subscribing to newsletter', 500));
  }
});

// @desc    Get all cars (public - no authentication)
// @route   GET /api/public/cars
// @access  Public
const getPublicCars = asyncHandler(async (req, res, next) => {
  // Get all active cars without authentication requirement
  const baseQuery = { 
    status: { $ne: 'archived' }, // Don't show archived cars
    isActive: true // Only show active cars
  };

  // Copy req.query and merge with base filter
  const reqQuery = { ...req.query };

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify({ ...baseQuery, ...reqQuery });

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  let query = Car.find(JSON.parse(queryStr));

  // Select fields - hide sensitive data
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  } else {
    // Use same safe field selection as tenant-specific endpoint
    const publicFields = 'brand model year color category fuelType transmission seats doors description pricing location features images equipment badges status';
    query = query.select(publicFields);
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
  const total = await Car.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Execute query
  const cars = await query;

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
    count: cars.length,
    pagination,
    data: cars
  });
});

// @desc    Get single car (public - no authentication)
// @route   GET /api/public/cars/:id
// @access  Public
const getPublicCar = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({ 
    _id: req.params.id,
    status: { $ne: 'archived' },
    isActive: true
  }).select('brand model year color category fuelType transmission seats doors description pricing location features images equipment badges status');

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: car
  });
});

module.exports = {
  createPublicReservation,
  getCarsByUser,
  getCarByUser,
  getCarAvailabilityByUser,
  getCarsByCategoryAndUser,
  getAvailableFeaturesByUser,
  createReservationByUser,
  getWebsiteSettingsByUser,
  getInfoBarByUser,
  getModalByUser,
  subscribeToNewsletter,
  getPublicCars,
  getPublicCar
}; 