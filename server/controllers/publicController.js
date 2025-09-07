const Car = require('../models/Car');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');
const { DiscountCode } = require('../models/WebsiteSettings');
const pdfService = require('../services/pdfService');

// Helper function to get tenant by user email
const getTenantByUserEmail = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError(`User not found with email: ${email}`, 404);
  }
  return user.tenantId;
};

// @desc    Get cars for a specific user/tenant (public) with advanced filtering
// @route   GET /api/public/users/:email/cars
// @access  Public
const getCarsByUser = asyncHandler(async (req, res, next) => {
  const { email } = req.params;
  
  // Get tenant ID from user email
  const tenantId = await getTenantByUserEmail(email);
  
  // Extract filtering parameters
  const {
    // Basic filters
    category,
    fuelType,
    transmission,
    seats,
    
    // Date availability filters
    startDate,
    endDate,
    
    // Advanced filters
    carClass,
    unlimitedKm,
    petsAllowed,
    childSeat,
    navigation,
    roofBox,
    internationalTravel,
    
    // Pagination and sorting
    page = 1,
    limit = 25,
    sort,
    select
  } = req.query;

  // Build base query with tenant filter
  let baseQuery = { 
    tenantId, 
    isActive: true, 
    status: 'active' 
  };

  // Enhanced category mapping for car classes
  if (carClass) {
    const carClassMapping = {
      'ekonomicka': ['economy', 'compact'],
      'stredna': ['midsize'],
      'vyssia': ['fullsize', 'luxury'],
      'viacmiestne': ['minivan'],
      'uzitkove': ['utility'],
      'karavany': ['caravan'],
      'motorky': ['motorcycle'],
      'sportove': ['sports'],
      'elektromobily': ['electric']
    };
    
    if (carClassMapping[carClass]) {
      baseQuery.category = { $in: carClassMapping[carClass] };
    }
  } else if (category) {
    // Standard category filter
    if (Array.isArray(category)) {
      baseQuery.category = { $in: category };
    } else {
      baseQuery.category = category;
    }
  }

  // Fuel type filter
  if (fuelType) {
    if (Array.isArray(fuelType)) {
      baseQuery.fuelType = { $in: fuelType };
    } else {
      baseQuery.fuelType = fuelType;
    }
  }

  // Transmission filter
  if (transmission) {
    if (Array.isArray(transmission)) {
      baseQuery.transmission = { $in: transmission };
    } else {
      baseQuery.transmission = transmission;
    }
  }

  // Seats filter
  if (seats) {
    if (Array.isArray(seats)) {
      baseQuery.seats = { $in: seats.map(s => parseInt(s)) };
    } else {
      baseQuery.seats = parseInt(seats);
    }
  }

  // Additional services filters
  const serviceFilters = [];
  
  if (unlimitedKm === 'true') {
    serviceFilters.push('unlimited_km');
  }
  if (petsAllowed === 'true') {
    serviceFilters.push('pets_allowed');
  }
  if (childSeat === 'true') {
    serviceFilters.push('child_seat');
  }
  if (navigation === 'true') {
    serviceFilters.push('navigation');
  }
  if (roofBox === 'true') {
    serviceFilters.push('roof_box');
  }
  if (internationalTravel === 'true') {
    serviceFilters.push('international_travel');
  }

  if (serviceFilters.length > 0) {
    baseQuery.features = { $all: serviceFilters };
  }

  let availableCars = [];
  let totalAvailable = 0;
  let hasDateFilter = false;

  // Date availability filtering
  if (startDate && endDate) {
    hasDateFilter = true;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return next(new AppError('End date must be after start date', 400));
    }

    // Find cars that are available for the specified dates
    const allCars = await Car.find(baseQuery);
    
    for (const car of allCars) {
      // Check for overlapping reservations
      const overlappingReservations = await Reservation.find({
        car: car._id,
        tenantId: car.tenantId,
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

      if (overlappingReservations.length === 0) {
        availableCars.push(car);
      }
    }

    totalAvailable = availableCars.length;
  } else {
    // No date filter, use regular query
    const query = Car.find(baseQuery);
    availableCars = await query;
    totalAvailable = await Car.countDocuments(baseQuery);
  }

  // Fallback logic when no results found
  if (availableCars.length === 0 && hasDateFilter) {
    // Show available alternatives for the date, sorted by price
    const fallbackQuery = {
      tenantId,
      status: 'active',
      isActive: true
    };

    const fallbackCars = await Car.find(fallbackQuery);
    const availableFallbackCars = [];
    
    for (const car of fallbackCars) {
      const overlappingReservations = await Reservation.find({
        car: car._id,
        tenantId: car.tenantId,
        status: { $in: ['confirmed', 'ongoing'] },
        $or: [
          {
            startDate: { $lte: new Date(startDate) },
            endDate: { $gte: new Date(startDate) }
          },
          {
            startDate: { $lte: new Date(endDate) },
            endDate: { $gte: new Date(endDate) }
          },
          {
            startDate: { $gte: new Date(startDate) },
            endDate: { $lte: new Date(endDate) }
          }
        ]
      });

      if (overlappingReservations.length === 0) {
        availableFallbackCars.push(car);
      }
    }

    // Sort by price ascending
    availableFallbackCars.sort((a, b) => {
      const priceA = a.pricing?.dailyRate || a.dailyRate || 0;
      const priceB = b.pricing?.dailyRate || b.dailyRate || 0;
      return priceA - priceB;
    });

    return res.status(200).json({
      success: true,
      count: availableFallbackCars.length,
      total: availableFallbackCars.length,
      isFallback: true,
      message: 'Vami vybrané vozidlo momentálne nie je dostupné. Zobrazujeme dostupné alternatívy pre zadaný dátum vzostupne podľa ceny.',
      data: availableFallbackCars.slice(0, parseInt(limit))
    });
  }

  // Apply sorting
  if (sort) {
    const sortBy = sort.split(',').join(' ');
    if (sort.includes('price') || sort.includes('dailyRate')) {
      // Custom price sorting
      availableCars.sort((a, b) => {
        const priceA = a.pricing?.dailyRate || a.dailyRate || 0;
        const priceB = b.pricing?.dailyRate || b.dailyRate || 0;
        return sort.startsWith('-') ? priceB - priceA : priceA - priceB;
      });
    }
  } else {
    // Default sorting by daily rate ascending
    availableCars.sort((a, b) => {
      const priceA = a.pricing?.dailyRate || a.dailyRate || 0;
      const priceB = b.pricing?.dailyRate || b.dailyRate || 0;
      return priceA - priceB;
    });
  }

  // Apply pagination
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedCars = availableCars.slice(startIndex, endIndex);

  // Apply field selection
  let responseData = paginatedCars;
  if (select) {
    const fields = select.split(',');
    responseData = paginatedCars.map(car => {
      const selected = {};
      fields.forEach(field => {
        if (car[field] !== undefined) {
          selected[field] = car[field];
        }
      });
      return selected;
    });
  } else {
    // Default safe fields
    const publicFields = ['_id', 'brand', 'model', 'year', 'color', 'category', 'fuelType', 'engine', 'transmission', 'seats', 'doors', 'description', 'pricing', 'mileageLimits', 'location', 'features', 'images', 'equipment', 'badges', 'status'];
    responseData = paginatedCars.map(car => {
      const safeData = {};
      publicFields.forEach(field => {
        if (car[field] !== undefined) {
          safeData[field] = car[field];
        }
      });
      return safeData;
    });
  }

  // Pagination metadata
  const pagination = {};
  if (endIndex < totalAvailable) {
    pagination.next = {
      page: parseInt(page) + 1,
      limit: parseInt(limit)
    };
  }
  if (startIndex > 0) {
    pagination.prev = {
      page: parseInt(page) - 1,
      limit: parseInt(limit)
    };
  }

  res.status(200).json({
    success: true,
    count: responseData.length,
    total: totalAvailable,
    pagination,
    filters: {
      carClass,
      category,
      fuelType,
      transmission,
      seats,
      startDate,
      endDate,
      additionalServices: serviceFilters
    },
    data: responseData
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
  }).select('brand model year color category fuelType engine transmission seats doors description dailyRate weeklyRate monthlyRate location features images status mileage mileageLimits equipment badges pricing');
  
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
    isAvailable: car.status === 'active',
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
    
    availability.isAvailableForDates = overlappingReservations.length === 0 && car.status === 'active';
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
    status: 'active'
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
  
  // Get all cars for this tenant
  const cars = await Car.find({ 
    tenantId,
    isActive: true 
  }).select('features equipment');
  
  // Collect all unique features (legacy)
  const features = await Car.distinct('features', { 
    tenantId,
    isActive: true 
  });
  
  // Collect all unique equipment across all cars
  const equipmentMap = new Map();
  
  cars.forEach(car => {
    if (car.equipment && Array.isArray(car.equipment)) {
      car.equipment.forEach(item => {
        if (item && item.name) {
          const key = item.name.toLowerCase().trim();
          if (!equipmentMap.has(key)) {
            equipmentMap.set(key, {
              name: item.name,
              icon: item.icon,
              description: item.description,
              category: item.category || 'standard',
              isStandard: item.isStandard || false
            });
          }
        }
      });
    }
  });
  
  // Convert map to array
  const globalEquipment = Array.from(equipmentMap.values());
  
  res.status(200).json({
    success: true,
    data: {
      features, // Legacy features array
      equipment: globalEquipment // Global equipment available for all cars
    }
  });
});

// @desc    Create a reservation for a specific user/tenant (auto-create customer if needed)
// @route   POST /api/public/users/:email/reservations
// @access  Public
const createReservationByUser = asyncHandler(async (req, res, next) => {
  const { email } = req.params; // This is now ignored - kept for API compatibility
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
    discountCode, // Add discount code support
    
    // ✅ ADDITIONAL SERVICES AND INSURANCE FIELDS (PUBLIC API)
    selectedServices,
    servicesTotal,
    selectedAdditionalInsurance,
    selectedExtendedInsurance,
    insurancePrices,
    extendedInsurancePrices,
    calculatedTotal,
    extraOptions,
    
    // 🔧 NEW: Frontend pricing override support
    pricing: frontendPricing
  } = req.body;

  // 🔍 DEBUG: Log incoming services and insurance data structure for createReservationByUser
  console.log('🔍 [PUBLIC API createReservationByUser] Incoming services and insurance data:');
  console.log('📦 selectedServices:', JSON.stringify(selectedServices, null, 2));
  console.log('📦 selectedAdditionalInsurance:', JSON.stringify(selectedAdditionalInsurance, null, 2));
  console.log('📦 selectedExtendedInsurance:', JSON.stringify(selectedExtendedInsurance, null, 2));
  console.log('📦 servicesTotal:', servicesTotal);
  console.log('📦 insurancePrices:', JSON.stringify(insurancePrices, null, 2));
  console.log('📦 extendedInsurancePrices:', JSON.stringify(extendedInsurancePrices, null, 2));

  // ✅ VALIDATION: Validate services and insurance data integrity
  if (selectedServices && Array.isArray(selectedServices)) {
    for (const service of selectedServices) {
      if (!service.name || !service.totalPrice) {
        console.warn('⚠️ [VALIDATION] Invalid service object missing name or totalPrice:', service);
      }
      if (typeof service.totalPrice !== 'number' || service.totalPrice < 0) {
        console.warn('⚠️ [VALIDATION] Invalid service totalPrice:', service.totalPrice);
      }
    }
  }

  if (selectedAdditionalInsurance && Array.isArray(selectedAdditionalInsurance)) {
    for (const insurance of selectedAdditionalInsurance) {
      if (!insurance.name || (insurance.calculatedPrice === undefined && insurance.price === undefined)) {
        console.warn('⚠️ [VALIDATION] Invalid additional insurance missing name or price:', insurance);
      }
    }
  }

  if (selectedExtendedInsurance && Array.isArray(selectedExtendedInsurance)) {
    for (const insurance of selectedExtendedInsurance) {
      if (!insurance.name || (insurance.calculatedPrice === undefined && insurance.price === undefined)) {
        console.warn('⚠️ [VALIDATION] Invalid extended insurance missing name or price:', insurance);
      }
    }
  }

  // 🔧 FIX: Don't fallback to admin email - require customer email in request body
  // Accept both 'customerEmail' and 'email' for backwards compatibility
  const finalCustomerEmail = customerEmail || email;
  
  if (!finalCustomerEmail) {
    return next(new AppError('customerEmail (or email) is required in request body', 400));
  }

  // 🔧 MAJOR FIX: Get tenant ID from the car being booked, not from email parameter
  if (!carId) {
    return next(new AppError('carId is required to determine the car rental company', 400));
  }

  // Check if car exists and get tenant ID from it
  const car = await Car.findOne({ 
    _id: carId,
    isActive: true 
  });
  
  if (!car) {
    return next(new AppError('Car not found', 404));
  }

  if (car.status !== 'active') {
    return next(new AppError('Car is not available for booking', 400));
  }

  // 🔧 FIX: Use car's tenant ID instead of trying to resolve from customer email
  const tenantId = car.tenantId;
  if (!tenantId) {
    return next(new AppError('Car has no associated tenant/car rental company', 400));
  }

  console.log('🔧 [TENANT FIX] Using tenant ID from car:', tenantId);
  console.log('🔧 [TENANT FIX] Car:', `${car.brand} ${car.model} (${car._id})`);
  console.log('🔧 [TENANT FIX] Customer email:', finalCustomerEmail);

  // Validate required fields
  if (!firstName || !lastName || !finalCustomerEmail || !phone || !licenseNumber || !carId || !startDate || !endDate) {
    return next(new AppError('Missing required fields: firstName, lastName, email, phone, licenseNumber, carId, startDate, endDate', 400));
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

    console.log('🔍 [CUSTOMER DEBUG] Checking for existing customer...');
    console.log('📧 [CUSTOMER DEBUG] Email search:', finalCustomerEmail.toLowerCase());
    console.log('🏢 [CUSTOMER DEBUG] Tenant ID:', tenantId);
    console.log('👤 [CUSTOMER DEBUG] Existing customer found:', customer ? 'YES' : 'NO');
    
    if (customer) {
      console.log('✅ [CUSTOMER DEBUG] Using existing customer:', {
        id: customer._id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        createdAt: customer.createdAt
      });
    }

    if (!customer) {
      console.log('🔄 [CUSTOMER DEBUG] No existing customer found in this tenant - creating new customer...');
      
      // Create new customer for this tenant - same email is OK in different tenants
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('customer123', salt);

      const newCustomerData = {
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
      };

      console.log('📝 [CUSTOMER DEBUG] Creating customer with data:', {
        firstName: newCustomerData.firstName,
        lastName: newCustomerData.lastName,
        email: newCustomerData.email,
        phone: newCustomerData.phone,
        licenseNumber: newCustomerData.licenseNumber,
        tenantId: newCustomerData.tenantId,
        role: newCustomerData.role
      });

      customer = await User.create(newCustomerData);
      
      console.log('✅ [CUSTOMER DEBUG] New customer created successfully:', {
        id: customer._id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        tenantId: customer.tenantId,
        createdAt: customer.createdAt
      });
    } else {
      // Update existing customer with new information if provided
      console.log('🔄 [CUSTOMER DEBUG] Updating existing customer with new information...');
      
      let updated = false;
      if (firstName && firstName !== customer.firstName) {
        customer.firstName = firstName;
        updated = true;
      }
      if (lastName && lastName !== customer.lastName) {
        customer.lastName = lastName;
        updated = true;
      }
      if (phone && phone !== customer.phone) {
        customer.phone = phone;
        updated = true;
      }
      if (dateOfBirth && dateOfBirth !== customer.dateOfBirth) {
        customer.dateOfBirth = new Date(dateOfBirth);
        updated = true;
      }
      if (licenseNumber && licenseNumber !== customer.licenseNumber) {
        customer.licenseNumber = licenseNumber;
        updated = true;
      }
      if (licenseExpiry && licenseExpiry !== customer.licenseExpiry) {
        customer.licenseExpiry = new Date(licenseExpiry);
        updated = true;
      }
      if (address) {
        customer.address = {
          street: address.street || customer.address?.street || '',
          city: address.city || customer.address?.city || '',
          state: address.state || customer.address?.state || '',
          zipCode: address.zipCode || customer.address?.zipCode || '',
          country: address.country || customer.address?.country || ''
        };
        updated = true;
      }
      
      if (updated) {
        await customer.save();
        console.log('✅ [CUSTOMER DEBUG] Customer updated successfully');
      } else {
        console.log('ℹ️ [CUSTOMER DEBUG] No updates needed for existing customer');
      }
    }

    // Calculate rental duration
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // 🔧 MAJOR FIX: Support frontend pricing override to fix the pricing bug
    let finalPricing;
    
    if (frontendPricing && frontendPricing.totalAmount && frontendPricing.dailyRate) {
      // Use frontend pricing when provided (trusted source)
      console.log('🔧 [PRICING FIX] Using frontend pricing override for user-specific reservation');
      console.log('📊 Frontend pricing:', JSON.stringify(frontendPricing, null, 2));
      
      finalPricing = {
        dailyRate: frontendPricing.dailyRate,
        totalDays: durationDays,
        subtotal: frontendPricing.rentalCost || frontendPricing.totalAmount,
        taxes: frontendPricing.taxes || 0,
        fees: frontendPricing.fees || [],
        discounts: frontendPricing.discounts || [],
        totalAmount: frontendPricing.totalAmount,
        deposit: frontendPricing.deposit || 0,
        source: 'frontend' // Mark as frontend-calculated
      };
      
      console.log('✅ [PRICING FIX] Final pricing applied:', JSON.stringify(finalPricing, null, 2));
    } else {
      // Fallback to backend calculation with debugging
      console.log('⚠️  [PRICING DEBUG] No frontend pricing provided, using backend calculation');
      console.log('🚗 Car pricing data:');
      console.log('   - car.dailyRate (legacy):', car.dailyRate);
      console.log('   - car.pricing.dailyRate (new):', car.pricing?.dailyRate);
      console.log('   - car.weeklyRate:', car.weeklyRate);
      console.log('   - car.monthlyRate:', car.monthlyRate);
      
      // Use car's calculateRate method which handles pricing intelligently
      let subtotal;
      try {
        subtotal = car.calculateRate(durationDays);
        console.log('✅ [PRICING DEBUG] Using car.calculateRate():', subtotal);
      } catch (error) {
        console.error('❌ [PRICING DEBUG] car.calculateRate() failed:', error);
        // Fallback to simple daily rate
        const dailyRate = car.pricing?.dailyRate || car.dailyRate || 50; // 50€ default
        subtotal = dailyRate * durationDays;
        console.log('🔄 [PRICING DEBUG] Fallback calculation:', `${dailyRate} × ${durationDays} = ${subtotal}`);
      }

      // 🔧 REMOVED TAX CALCULATION - No taxes added in admin
      const taxes = 0; // No taxes applied
      
      // Initialize pricing object
      finalPricing = {
        dailyRate: car.pricing?.dailyRate || car.dailyRate || 50,
        totalDays: durationDays,
        subtotal: subtotal,
        taxes: taxes,
        fees: [],
        discounts: [],
        totalAmount: subtotal + taxes, // Just subtotal since taxes = 0
        source: 'backend' // Mark as backend-calculated
      };
      
      console.log('📊 [PRICING DEBUG] Backend calculated pricing (no taxes):', JSON.stringify(finalPricing, null, 2));
    }

    // ✅ ENHANCE: Add services and insurance costs to backend calculation for createReservationByUser
    if (finalPricing.source === 'backend') {
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
      
      console.log('💰 [PUBLIC API createReservationByUser] Services & Insurance calculation:', {
        additionalServicesTotal,
        insuranceTotal,
        originalTotal: finalPricing.totalAmount,
        enhancedTotal: finalPricing.totalAmount + additionalServicesTotal + insuranceTotal
      });
      
      // Add services and insurance to final pricing
      finalPricing.totalAmount = finalPricing.totalAmount + additionalServicesTotal + insuranceTotal;
    }

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
        finalPricing.subtotal, 
        durationDays, 
        car.category
      );

      if (discountResult.reason) {
        return next(new AppError(discountResult.reason, 400));
      }

      // Apply discount
      const discountAmount = discountResult.discount;
      
      finalPricing.discounts.push({
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
      finalPricing.totalAmount = finalPricing.subtotal + finalPricing.taxes - discountAmount;
    }

    // Default pickup/dropoff locations if not provided - get from settings
    let defaultPickupFromSettings = {
      name: 'Banska Bystrica',
      address: 'Banska Bystrica, Slovensko'
    };
    
    try {
      const Settings = require('../models/Settings');
      const settings = await Settings.getForTenant(tenantId);
      const defaultLocationData = settings.business.pickupLocations.find(loc => loc.isDefault);
      if (defaultLocationData) {
        defaultPickupFromSettings = {
          name: defaultLocationData.name,
          address: defaultLocationData.address
        };
      }
    } catch (error) {
      console.warn('⚠️ [PUBLIC] Could not fetch pickup location from settings, using fallback:', error.message);
    }
    
    const defaultPickup = pickupLocation || defaultPickupFromSettings;

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
      status: 'pending', // 🔧 ADMIN APPROVAL: Set to pending, requires admin confirmation
      pricing: finalPricing, // Use calculated or frontend pricing
      appliedDiscountCodes,
      additionalDrivers: additionalDrivers || [],
      specialRequests: specialRequests || '',
      notes: notes || '',
      // ✅ ADDITIONAL SERVICES AND INSURANCE DATA (PUBLIC API)
      selectedServices: selectedServices || [],
      servicesTotal: servicesTotal || 0,
      selectedAdditionalInsurance: selectedAdditionalInsurance || [],
      selectedExtendedInsurance: selectedExtendedInsurance || [],
      insurancePrices: insurancePrices || {},
      extendedInsurancePrices: extendedInsurancePrices || {},
      terms: {
        mileageLimit: -1,
        fuelPolicy: 'full-to-full',
        cancellationPolicy: 'Free cancellation up to 24 hours before pickup',
        lateReturnFee: 50
      }
    });

    // 🆕 Generate bySquare QR payment codes
    try {
      const bySquareService = require('../services/bySquareService');
      
      if (bySquareService.isConfigured()) {
        console.log('🔄 [QR] Generating bySquare QR codes for tenant reservation...');
        
        const qrResult = await bySquareService.generateReservationQR(reservation, car, customer);
        
        if (qrResult.success && qrResult.qrCodes) {
          // Calculate total amount including deposit
          const rentalAmount = finalPricing.totalAmount || (finalPricing.dailyRate * finalPricing.totalDays) || 0;
          const depositAmount = car.pricing?.deposit || 0;
          const totalAmount = rentalAmount + depositAmount;
          
          // Generate variable symbol from reservation number and ID
          const reservationDigits = reservation.reservationNumber ? 
            reservation.reservationNumber.replace(/[^0-9]/g, '') : 
            reservation._id.toString().slice(-8);
          const variableSymbol = reservationDigits.slice(-10).padStart(10, '0');
          
          // Update reservation with QR codes
          reservation.qrCodes = {
            payBySquareRental: qrResult.qrCodes.payBySquareRental,
            payBySquareDeposit: qrResult.qrCodes.payBySquareDeposit,
            generatedAt: new Date(),
            lastUpdated: new Date(),
            isActive: true,
            bankAccount: 'SK1234567890123456789012',
            variableSymbol: variableSymbol,
            constantSymbol: '0308',
            specificSymbol: '',
            amount: totalAmount,
            beneficiaryName: 'CarFlow Rental',
            paymentNote: `Car rental + deposit: ${car.brand} ${car.model} (${start.toISOString().split('T')[0]} - ${end.toISOString().split('T')[0]})`
          };
          
          await reservation.save();
          console.log('✅ [QR] bySquare QR codes generated and saved for tenant reservation');
        } else {
          console.warn('⚠️ [QR] Failed to generate bySquare QR codes:', qrResult.error);
        }
      } else {
        console.log('ℹ️ [QR] bySquare not configured, skipping QR generation');
      }
    } catch (qrError) {
      console.error('❌ [QR] Error generating QR codes for tenant reservation:', qrError.message);
      // Don't fail the reservation if QR generation fails
    }

    // Save the reservation
    const savedReservation = await reservation.save();

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
                reservation: savedReservation._id,
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
        totalRevenue: finalPricing.totalAmount
      }
    });

    // Update customer stats
    await User.findByIdAndUpdate(customer._id, {
      $inc: { 
        totalBookings: 1, 
        totalSpent: finalPricing.totalAmount 
      }
    });

    // Populate reservation details for response
    const populatedReservation = await Reservation.findById(savedReservation._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('car', 'brand model year registrationNumber images')
      .populate('appliedDiscountCodes.discountCode', 'code description discountType discountValue');

    // 📧 Send admin notification and customer confirmation emails
    try {
      const { sendReservationEmails } = require('../utils/emailHelpers');
      
      console.log('📧 [EMAIL] Sending reservation emails for new public reservation...');
      console.log('📧 [EMAIL] Environment:', process.env.NODE_ENV || 'development');
      console.log('📧 [EMAIL] Email provider:', process.env.EMAIL_PROVIDER || 'nodemailer');
      console.log('📧 [EMAIL] SMTP2GO configured:', process.env.SMTP2GO_API_KEY ? 'YES' : 'NO');
      
      // Get tenant admin user for email configuration
      const tenantAdminEmail = req.params.email; // nitra-car@nitra-car.sk
      let tenantAdminUser = null;
      
      if (tenantAdminEmail) {
        try {
          const User = require('../models/User');
          tenantAdminUser = await User.findOne({ 
            email: tenantAdminEmail.toLowerCase(),
            tenantId: tenantId 
          });
          console.log('📧 [EMAIL] Tenant admin user found:', tenantAdminUser ? tenantAdminEmail : 'Not found');
        } catch (userError) {
          console.warn('⚠️ [EMAIL] Could not fetch tenant admin user:', userError.message);
        }
      }
      
      // Send email notifications to both admin and customer
      const emailResult = await sendReservationEmails(populatedReservation, car, customer, tenantAdminUser);
      
      if (emailResult.success) {
        console.log('✅ [EMAIL] Reservation emails sent successfully for new public reservation');
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
      message: 'Reservation confirmed successfully! You will receive a confirmation email shortly.',
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
        debug: {
          pricingSource: finalPricing.source,
          frontendPricingProvided: !!frontendPricing,
          calculatedPricing: finalPricing
        }
      }
    });

  } catch (error) {
    console.error('❌ [CUSTOMER DEBUG] Error in customer creation/update process:', error);
    console.error('❌ [CUSTOMER DEBUG] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    // Handle duplicate key errors more gracefully
    if (error.code === 11000) {
      console.error('❌ [CUSTOMER DEBUG] Duplicate key error detected:', error.keyValue);
      
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      
      if (field === 'email') {
        // For email duplicates within the same tenant, find and use the existing customer
        console.log('🔧 [CUSTOMER DEBUG] Email duplicate detected, finding existing customer in this tenant...');
        
        try {
          const existingCustomer = await User.findOne({
            email: value.toLowerCase(),
            tenantId: tenantId,
            role: 'customer',
            isActive: true
          });
          
          if (existingCustomer) {
            console.log('✅ [CUSTOMER DEBUG] Found existing customer in this tenant, using existing customer');
            customer = existingCustomer;
            // Continue with reservation creation using existing customer
          } else {
            console.log('❌ [CUSTOMER DEBUG] No existing customer found in this tenant despite duplicate error');
            return res.status(400).json({
              success: false,
              message: `An account with email '${value}' already exists. Please try again or contact support.`
            });
          }
        } catch (findError) {
          console.error('❌ [CUSTOMER DEBUG] Error finding existing customer:', findError);
          return res.status(400).json({
            success: false,
            message: `An account with email '${value}' already exists. Please try again or contact support.`
          });
        }
      } else if (field === 'licenseNumber') {
        return res.status(400).json({
          success: false,
          message: `A customer with license number '${value}' already exists. Please verify your license number or contact support.`
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Duplicate field value: ${field} = '${value}'. Please use another value.`
        });
      }
    } else {
      throw error;
    }
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
    notes,
    
    // ✅ ADDITIONAL SERVICES AND INSURANCE FIELDS (PUBLIC API)
    selectedServices,
    servicesTotal,
    selectedAdditionalInsurance,
    selectedExtendedInsurance,
    insurancePrices,
    extendedInsurancePrices,
    calculatedTotal,
    extraOptions,
    
    // 🔧 NEW: Frontend pricing override support
    pricing: frontendPricing
  } = req.body;

  // 🔍 DEBUG: Log incoming services and insurance data structure for createPublicReservation
  console.log('🔍 [PUBLIC API createPublicReservation] Incoming services and insurance data:');
  console.log('📦 selectedServices:', JSON.stringify(selectedServices, null, 2));
  console.log('📦 selectedAdditionalInsurance:', JSON.stringify(selectedAdditionalInsurance, null, 2));
  console.log('📦 selectedExtendedInsurance:', JSON.stringify(selectedExtendedInsurance, null, 2));
  console.log('📦 servicesTotal:', servicesTotal);
  console.log('📦 insurancePrices:', JSON.stringify(insurancePrices, null, 2));
  console.log('📦 extendedInsurancePrices:', JSON.stringify(extendedInsurancePrices, null, 2));

  // ✅ VALIDATION: Validate services and insurance data integrity
  if (selectedServices && Array.isArray(selectedServices)) {
    for (const service of selectedServices) {
      if (!service.name || !service.totalPrice) {
        console.warn('⚠️ [VALIDATION] Invalid service object missing name or totalPrice:', service);
      }
      if (typeof service.totalPrice !== 'number' || service.totalPrice < 0) {
        console.warn('⚠️ [VALIDATION] Invalid service totalPrice:', service.totalPrice);
      }
    }
  }

  if (selectedAdditionalInsurance && Array.isArray(selectedAdditionalInsurance)) {
    for (const insurance of selectedAdditionalInsurance) {
      if (!insurance.name || (insurance.calculatedPrice === undefined && insurance.price === undefined)) {
        console.warn('⚠️ [VALIDATION] Invalid additional insurance missing name or price:', insurance);
      }
    }
  }

  if (selectedExtendedInsurance && Array.isArray(selectedExtendedInsurance)) {
    for (const insurance of selectedExtendedInsurance) {
      if (!insurance.name || (insurance.calculatedPrice === undefined && insurance.price === undefined)) {
        console.warn('⚠️ [VALIDATION] Invalid extended insurance missing name or price:', insurance);
      }
    }
  }

  // Validate required fields
  if (!firstName || !lastName || !email || !phone || !licenseNumber || !carId || !startDate || !endDate) {
    return next(new AppError('Missing required fields: firstName, lastName, email, phone, licenseNumber, carId, startDate, endDate', 400));
  }

  // 🔧 FIX: Get tenant ID from the car being booked
  // Check if car exists and is available
  const car = await Car.findOne({
    _id: carId,
    isActive: true
  });
  
  if (!car) {
    return next(new AppError('Car not found', 404));
  }

  if (car.status !== 'active') {
    return next(new AppError('Car is not available for booking', 400));
  }

  // 🔧 FIX: Get tenantId from the car to ensure proper assignment
  const tenantId = car.tenantId;
  if (!tenantId) {
    return next(new AppError('Car has no associated tenant/car rental company', 400));
  }

  console.log('🔧 [TENANT FIX] Public reservation - using tenant ID from car:', tenantId);
  console.log('🔧 [TENANT FIX] Car:', `${car.brand} ${car.model} (${car._id})`);
  console.log('🔧 [TENANT FIX] Customer email:', email);

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
    // Check if user already exists for this tenant specifically
    let customer = await User.findOne({ 
      email: email.toLowerCase(),
      tenantId 
    });

    console.log('🔍 [PUBLIC CUSTOMER DEBUG] Checking for existing customer...');
    console.log('📧 [PUBLIC CUSTOMER DEBUG] Email search:', email.toLowerCase());
    console.log('🏢 [PUBLIC CUSTOMER DEBUG] Tenant ID:', tenantId);
    console.log('👤 [PUBLIC CUSTOMER DEBUG] Existing customer found:', customer ? 'YES' : 'NO');
    
    if (customer) {
      console.log('✅ [PUBLIC CUSTOMER DEBUG] Using existing customer:', {
        id: customer._id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        createdAt: customer.createdAt
      });
    }

    if (!customer) {
      console.log('🔄 [PUBLIC CUSTOMER DEBUG] No existing customer found - checking globally...');
      
      // Check if user exists in ANY tenant (global check)
      const existingGlobalCustomer = await User.findOne({ 
        email: email.toLowerCase()
      });

      console.log('🌍 [PUBLIC CUSTOMER DEBUG] Global customer check:', existingGlobalCustomer ? 'FOUND' : 'NOT FOUND');
      
      if (existingGlobalCustomer) {
        console.log('🌍 [PUBLIC CUSTOMER DEBUG] Found customer in different tenant:', {
          currentTenant: existingGlobalCustomer.tenantId,
          targetTenant: tenantId,
          name: `${existingGlobalCustomer.firstName} ${existingGlobalCustomer.lastName}`
        });
        
        // Customer exists in different tenant, create a new one for this tenant
        // Use a unique license number to avoid conflicts
        const uniqueLicenseNumber = `${licenseNumber}-${tenantId.toString().slice(-4)}`;
        
        console.log('🔄 [PUBLIC CUSTOMER DEBUG] Creating cross-tenant customer with unique license:', uniqueLicenseNumber);
        
        customer = await User.create({
          firstName,
          lastName,
          email: email.toLowerCase(),
          password: await bcrypt.hash('customer123', await bcrypt.genSalt(10)),
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
          tenantId
        });
        
        console.log('✅ [PUBLIC CUSTOMER DEBUG] Cross-tenant customer created:', {
          id: customer._id,
          email: customer.email,
          licenseNumber: customer.licenseNumber,
          tenantId: customer.tenantId,
          status: customer.status,
          isActive: customer.isActive,
          role: customer.role
        });
      } else {
        console.log('🔄 [PUBLIC CUSTOMER DEBUG] Creating completely new customer...');
        
        // Create completely new customer
        customer = await User.create({
          firstName,
          lastName,
          email: email.toLowerCase(),
          password: await bcrypt.hash('customer123', await bcrypt.genSalt(10)),
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
        
        console.log('✅ [PUBLIC CUSTOMER DEBUG] New customer created successfully:', {
          id: customer._id,
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          tenantId: customer.tenantId,
          status: customer.status,
          isActive: customer.isActive,
          role: customer.role,
          createdAt: customer.createdAt
        });
      }
    } else {
      // Update existing customer with new information if provided
      console.log('🔄 [PUBLIC CUSTOMER DEBUG] Updating existing customer...');
      
      let updated = false;
      if (firstName && firstName !== customer.firstName) {
        customer.firstName = firstName;
        updated = true;
      }
      if (lastName && lastName !== customer.lastName) {
        customer.lastName = lastName;
        updated = true;
      }
      if (phone && phone !== customer.phone) {
        customer.phone = phone;
        updated = true;
      }
      if (dateOfBirth && dateOfBirth !== customer.dateOfBirth) {
        customer.dateOfBirth = new Date(dateOfBirth);
        updated = true;
      }
      if (licenseNumber && licenseNumber !== customer.licenseNumber) {
        customer.licenseNumber = licenseNumber;
        updated = true;
      }
      if (licenseExpiry && licenseExpiry !== customer.licenseExpiry) {
        customer.licenseExpiry = new Date(licenseExpiry);
        updated = true;
      }
      if (address) {
        customer.address = {
          street: address.street || customer.address?.street || '',
          city: address.city || customer.address?.city || '',
          state: address.state || customer.address?.state || '',
          zipCode: address.zipCode || customer.address?.zipCode || '',
          country: address.country || customer.address?.country || ''
        };
        updated = true;
      }
      
      if (updated) {
        await customer.save();
        console.log('✅ [PUBLIC CUSTOMER DEBUG] Customer updated successfully');
      } else {
        console.log('ℹ️ [PUBLIC CUSTOMER DEBUG] No updates needed for existing customer');
      }
    }

    // Calculate rental duration
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // 🔧 MAJOR FIX: Support frontend pricing override to fix the pricing bug
    let finalPricing;
    
    if (frontendPricing && frontendPricing.totalAmount && frontendPricing.dailyRate) {
      // Use frontend pricing when provided (trusted source)
      console.log('🔧 [PRICING FIX] Using frontend pricing override');
      console.log('📊 Frontend pricing:', JSON.stringify(frontendPricing, null, 2));
      
      finalPricing = {
        dailyRate: frontendPricing.dailyRate,
        totalDays: durationDays,
        subtotal: frontendPricing.rentalCost || frontendPricing.totalAmount,
        taxes: frontendPricing.taxes || 0,
        fees: frontendPricing.fees || [],
        discounts: frontendPricing.discounts || [],
        totalAmount: frontendPricing.totalAmount,
        deposit: frontendPricing.deposit || 0,
        source: 'frontend' // Mark as frontend-calculated
      };
      
      console.log('✅ [PRICING FIX] Final pricing applied:', JSON.stringify(finalPricing, null, 2));
    } else {
      // Fallback to backend calculation with debugging
      console.log('⚠️  [PRICING DEBUG] No frontend pricing provided, using backend calculation');
      console.log('🚗 Car pricing data:');
      console.log('   - car.dailyRate (legacy):', car.dailyRate);
      console.log('   - car.pricing.dailyRate (new):', car.pricing?.dailyRate);
      console.log('   - car.weeklyRate:', car.weeklyRate);
      console.log('   - car.monthlyRate:', car.monthlyRate);
      
      // Use car's calculateRate method which handles pricing intelligently
      let subtotal;
      try {
        subtotal = car.calculateRate(durationDays);
        console.log('✅ [PRICING DEBUG] Using car.calculateRate():', subtotal);
      } catch (error) {
        console.error('❌ [PRICING DEBUG] car.calculateRate() failed:', error);
        // Fallback to simple daily rate
        const dailyRate = car.pricing?.dailyRate || car.dailyRate || 50; // 50€ default
        subtotal = dailyRate * durationDays;
        console.log('🔄 [PRICING DEBUG] Fallback calculation:', `${dailyRate} × ${durationDays} = ${subtotal}`);
      }

      // 🔧 REMOVED TAX CALCULATION - No taxes added in admin
      const taxes = 0; // No taxes applied
      
      // Initialize pricing object
      finalPricing = {
        dailyRate: car.pricing?.dailyRate || car.dailyRate || 50,
        totalDays: durationDays,
        subtotal: subtotal,
        taxes: taxes,
        fees: [],
        discounts: [],
        totalAmount: subtotal + taxes, // Just subtotal since taxes = 0
        source: 'backend' // Mark as backend-calculated
      };
      
      console.log('📊 [PRICING DEBUG] Backend calculated pricing (no taxes):', JSON.stringify(finalPricing, null, 2));
    }

    // ✅ ENHANCE: Add services and insurance costs to backend calculation for createPublicReservation
    if (finalPricing.source === 'backend') {
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
      
      console.log('💰 [PUBLIC API createPublicReservation] Services & Insurance calculation:', {
        additionalServicesTotal,
        insuranceTotal,
        originalTotal: finalPricing.totalAmount,
        enhancedTotal: finalPricing.totalAmount + additionalServicesTotal + insuranceTotal
      });
      
      // Add services and insurance to final pricing
      finalPricing.totalAmount = finalPricing.totalAmount + additionalServicesTotal + insuranceTotal;
    }

    // Default pickup/dropoff locations if not provided - get from settings
    let defaultPickupFromSettings = {
      name: 'Banska Bystrica',
      address: 'Banska Bystrica, Slovensko'
    };
    
    try {
      const Settings = require('../models/Settings');
      const settings = await Settings.getForTenant(tenantId);
      const defaultLocationData = settings.business.pickupLocations.find(loc => loc.isDefault);
      if (defaultLocationData) {
        defaultPickupFromSettings = {
          name: defaultLocationData.name,
          address: defaultLocationData.address
        };
      }
    } catch (error) {
      console.warn('⚠️ [PUBLIC] Could not fetch pickup location from settings, using fallback:', error.message);
    }
    
    const defaultPickup = pickupLocation || defaultPickupFromSettings;

    const defaultDropoff = dropoffLocation || defaultPickup;

    // Generate unique reservation number
    const reservationNumber = `RES-${tenantId.toString().slice(-4).toUpperCase()}-${Date.now()}`;

    // Create reservation
    const reservation = await Reservation.create({
      tenantId, // 🔧 FIX: Assign tenantId to reservation
      reservationNumber, // 🔧 FIX: Add missing reservationNumber
      customer: customer._id,
      car: carId,
      startDate: start,
      endDate: end,
      pickupLocation: defaultPickup,
      dropoffLocation: defaultDropoff,
      status: 'pending', // 🔧 ADMIN APPROVAL: Set to pending, requires admin confirmation
      pricing: finalPricing, // Use calculated or frontend pricing
      additionalDrivers: additionalDrivers || [],
      specialRequests: specialRequests || '',
      notes: notes || '',
      // ✅ ADDITIONAL SERVICES AND INSURANCE DATA (PUBLIC API)
      selectedServices: selectedServices || [],
      servicesTotal: servicesTotal || 0,
      selectedAdditionalInsurance: selectedAdditionalInsurance || [],
      selectedExtendedInsurance: selectedExtendedInsurance || [],
      insurancePrices: insurancePrices || {},
      extendedInsurancePrices: extendedInsurancePrices || {},
      terms: {
        mileageLimit: -1, // Unlimited
        fuelPolicy: 'full-to-full',
        cancellationPolicy: 'Free cancellation up to 24 hours before pickup',
        lateReturnFee: 50
      }
    });

    // 🆕 Generate bySquare QR payment codes
    try {
      const bySquareService = require('../services/bySquareService');
      
      if (bySquareService.isConfigured()) {
        console.log('🔄 [QR] Generating bySquare QR codes for tenant reservation...');
        
        const qrResult = await bySquareService.generateReservationQR(reservation, car, customer);
        
        if (qrResult.success && qrResult.qrCodes) {
          // Calculate total amount including deposit
          const rentalAmount = finalPricing.totalAmount || (finalPricing.dailyRate * finalPricing.totalDays) || 0;
          const depositAmount = car.pricing?.deposit || 0;
          const totalAmount = rentalAmount + depositAmount;
          
          // Generate variable symbol from reservation number and ID
          const reservationDigits = reservation.reservationNumber ? 
            reservation.reservationNumber.replace(/[^0-9]/g, '') : 
            reservation._id.toString().slice(-8);
          const variableSymbol = reservationDigits.slice(-10).padStart(10, '0');
          
          // Update reservation with QR codes
          reservation.qrCodes = {
            payBySquareRental: qrResult.qrCodes.payBySquareRental,
            payBySquareDeposit: qrResult.qrCodes.payBySquareDeposit,
            generatedAt: new Date(),
            lastUpdated: new Date(),
            isActive: true,
            bankAccount: 'SK1234567890123456789012',
            variableSymbol: variableSymbol,
            constantSymbol: '0308',
            specificSymbol: '',
            amount: totalAmount,
            beneficiaryName: 'CarFlow Rental',
            paymentNote: `Car rental + deposit: ${car.brand} ${car.model} (${start.toISOString().split('T')[0]} - ${end.toISOString().split('T')[0]})`
          };
          
          await reservation.save();
          console.log('✅ [QR] bySquare QR codes generated and saved for tenant reservation');
        } else {
          console.warn('⚠️ [QR] Failed to generate bySquare QR codes:', qrResult.error);
        }
      } else {
        console.log('ℹ️ [QR] bySquare not configured, skipping QR generation');
      }
    } catch (qrError) {
      console.error('❌ [QR] Error generating QR codes for tenant reservation:', qrError.message);
      // Don't fail the reservation if QR generation fails
    }

    // Save the reservation
    const savedReservation = await reservation.save();

    // Update car stats
    await Car.findByIdAndUpdate(car._id, {
      $inc: { 
        totalBookings: 1,
        totalRevenue: finalPricing.totalAmount
      }
    });

    // Create payment record
    let payment = null;

    // Populate the reservation with customer and car details
    const populatedReservation = await Reservation.findById(savedReservation._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('car', 'brand model year registrationNumber dailyRate images');

    // 📧 Send admin notification and customer confirmation emails
    try {
      const { sendReservationEmails } = require('../utils/emailHelpers');
      
      console.log('📧 [EMAIL] Sending reservation emails for new general public reservation...');
      console.log('📧 [EMAIL] Environment:', process.env.NODE_ENV || 'development');
      console.log('📧 [EMAIL] Email provider:', process.env.EMAIL_PROVIDER || 'nodemailer');
      console.log('📧 [EMAIL] SMTP2GO configured:', process.env.SMTP2GO_API_KEY ? 'YES' : 'NO');
      
      // For general public API, no specific tenant admin - use null
      // Send email notifications to both admin and customer
      const emailResult = await sendReservationEmails(populatedReservation, car, customer, null);
      
      if (emailResult.success) {
        console.log('✅ [EMAIL] Reservation emails sent successfully for new general public reservation');
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
      message: 'Reservation confirmed successfully! You will receive a confirmation email shortly.',
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
        debug: {
          pricingSource: finalPricing.source,
          frontendPricingProvided: !!frontendPricing,
          calculatedPricing: finalPricing
        }
      }
    });

  } catch (error) {
    console.error('❌ [PUBLIC CUSTOMER DEBUG] Error in customer creation/update process:', error);
    console.error('❌ [PUBLIC CUSTOMER DEBUG] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    // Handle specific MongoDB duplicate key errors
    if (error.code === 11000) {
      console.error('❌ [PUBLIC CUSTOMER DEBUG] Duplicate key error detected:', error.keyValue);
      
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      
      if (field === 'email') {
        // For email duplicates within the same tenant, find and use the existing customer
        console.log('🔧 [PUBLIC CUSTOMER DEBUG] Email duplicate detected, finding existing customer in this tenant...');
        
        try {
          const existingCustomer = await User.findOne({
            email: value.toLowerCase(),
            tenantId: tenantId,
            role: 'customer',
            isActive: true
          });
          
          if (existingCustomer) {
            console.log('✅ [PUBLIC CUSTOMER DEBUG] Found existing customer in this tenant, using existing customer');
            customer = existingCustomer;
            // Continue with reservation creation using existing customer - don't return here
          } else {
            console.log('❌ [PUBLIC CUSTOMER DEBUG] No existing customer found in this tenant despite duplicate error');
            return next(new AppError(`An account with email '${value}' already exists. Please try again or contact support.`, 400));
          }
        } catch (findError) {
          console.error('❌ [PUBLIC CUSTOMER DEBUG] Error finding existing customer:', findError);
          return next(new AppError(`An account with email '${value}' already exists. Please try again or contact support.`, 400));
        }
      } else if (field === 'licenseNumber') {
        return next(new AppError(`A customer with license number '${value}' already exists. Please verify your license number.`, 400));
      } else {
        return next(new AppError(`Duplicate field value: ${field} = '${value}'. Please use another value.`, 400));
      }
    } else {
      console.error('Error creating customer for public reservation:', error);
      throw error;
    }
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
  
  console.log('🔍 PUBLIC MODAL REQUEST DEBUG:');
  console.log('📧 User Email:', userEmail);
  console.log('📄 Requested Page:', currentPage);
  
  if (!userEmail) {
    return next(new AppError('User email is required', 400));
  }

  try {
    const tenantId = await getTenantByUserEmail(userEmail);
    
    if (!tenantId) {
      console.log('❌ Tenant not found for email:', userEmail);
      return next(new AppError('Tenant not found for this user', 404));
    }

    console.log('✅ Tenant found:', tenantId);

    const { WebsiteSettings } = require('../models/WebsiteSettings');
    
    const settings = await WebsiteSettings.findOne({ tenantId });
    
    if (!settings) {
      console.log('❌ No website settings found for tenant:', tenantId);
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active modal found'
      });
    }

    console.log('✅ Website settings found');
    console.log('📋 Total modals in settings:', settings.modals ? settings.modals.length : 0);

    // ✅ FIXED: Use new multi-modal system instead of old single modal
    if (!settings.modals || settings.modals.length === 0) {
      console.log('❌ No modals array or empty modals array');
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active modal found'
      });
    }

    // ✅ ADD DETAILED MODAL ANALYSIS BEFORE FILTERING
    console.log('🔍 ANALYZING ALL MODALS BEFORE FILTERING:');
    settings.modals.forEach((modal, index) => {
      console.log(`--- Modal ${index + 1}: ${modal.name} ---`);
      console.log(`  ID: ${modal._id}`);
      console.log(`  Title: ${modal.title}`);
      console.log(`  Is Active: ${modal.isActive}`);
      console.log(`  Display Location: ${modal.displayLocation}`);
      console.log(`  Target Pages: ${modal.targetPages}`);
      console.log(`  Is Scheduled: ${modal.isScheduled}`);
      console.log(`  Start Date: ${modal.startDate}`);
      console.log(`  End Date: ${modal.endDate}`);
      console.log(`  Priority: ${modal.priority}`);
      
      // Manual filtering check
      const now = new Date();
      console.log(`  🔍 MANUAL FILTER CHECK:`);
      console.log(`    - Active check: ${modal.isActive} ✅`);
      console.log(`    - Start date check: ${modal.startDate ? `${modal.startDate} <= ${now}? ${now >= modal.startDate}` : 'No start date ✅'}`);
      console.log(`    - End date check: ${modal.endDate ? `${modal.endDate} >= ${now}? ${now <= modal.endDate}` : 'No end date ✅'}`);
      console.log(`    - Display location check: ${modal.displayLocation} !== 'all-pages'? ${modal.displayLocation !== 'all-pages'}`);
      if (modal.displayLocation !== 'all-pages') {
        console.log(`      → Does '${modal.displayLocation}' === '${currentPage}'? ${modal.displayLocation === currentPage}`);
      }
      console.log(`    - Target pages check: ${modal.targetPages ? `Has target pages: ${modal.targetPages.includes(currentPage)}` : 'No target pages ✅'}`);
    });

    // Get active modals using the existing method from WebsiteSettings model
    console.log(`🔍 CALLING getActiveModals('${currentPage}')...`);
    const activeModals = settings.getActiveModals(currentPage);
    
    console.log('📊 FILTERING RESULTS:');
    console.log(`  - Input page: '${currentPage}'`);
    console.log(`  - Active modals found: ${activeModals ? activeModals.length : 0}`);
    
    if (activeModals && activeModals.length > 0) {
      console.log('✅ Active modals details:');
      activeModals.forEach((modal, index) => {
        console.log(`  ${index + 1}. ${modal.name} (Priority: ${modal.priority}, Location: ${modal.displayLocation})`);
      });
    }
    
    if (!activeModals || activeModals.length === 0) {
      console.log('❌ No active modals found after filtering');
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active modal found'
      });
    }

    // Return the highest priority modal (getActiveModals already sorts by priority)
    const modal = activeModals[0];
    console.log(`✅ Returning modal: ${modal.name} (Priority: ${modal.priority})`);

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
        secondaryButtonText: modal.secondaryButtonText,
        discountCode: modal.discountCode,
        discountPercentage: modal.discountPercentage,
        discountType: modal.discountType,
        discountValue: modal.discountValue,
        styling: modal.styling,
        settings: modal.settings,
        priority: modal.priority,
        frequency: modal.frequency
      }
    });

  } catch (error) {
    console.error('❌ Error fetching modal:', error);
    return next(new AppError('Error fetching modal', 500));
  }
});

// @desc    Subscribe to newsletter (public)
// @route   POST /api/public/users/:email/newsletter
// @access  Public
const subscribeToNewsletter = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  const { subscriberEmail, firstName, lastName, phone, consent = true } = req.body;
  
  if (!userEmail || !subscriberEmail) {
    return next(new AppError('User email and subscriber email are required', 400));
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(subscriberEmail)) {
    return next(new AppError('Please enter a valid email address', 400));
  }

  try {
    const tenantId = await getTenantByUserEmail(userEmail);
    
    if (!tenantId) {
      return next(new AppError('Tenant not found for this user', 404));
    }

    // Import EmailSubscription model
    const EmailSubscription = require('../models/EmailSubscription');

    // Check if email already exists for this tenant
    let subscription = await EmailSubscription.findOne({ 
      tenantId: tenantId, 
      email: subscriberEmail 
    });

    if (subscription) {
      // If exists but inactive, reactivate
      if (!subscription.isActive) {
        await subscription.resubscribe();
        return res.status(200).json({
          success: true,
          message: 'Successfully resubscribed to newsletter',
          data: {
            email: subscription.email,
            firstName: subscription.firstName,
            lastName: subscription.lastName,
            subscribedAt: subscription.subscribedDate
          }
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'Email already subscribed to newsletter',
          data: {
            email: subscription.email,
            firstName: subscription.firstName,
            lastName: subscription.lastName,
            subscribedAt: subscription.subscribedDate
          }
        });
      }
    }

    // Create new subscription
    subscription = new EmailSubscription({
      tenantId: tenantId,
      email: subscriberEmail,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || '',
      source: 'website',
      tags: ['newsletter'],
      isActive: true,
      consentGiven: consent,
      consentDate: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress || '',
      userAgent: req.get('User-Agent') || ''
    });

    await subscription.save();

    console.log(`✅ Newsletter subscription saved for tenant ${tenantId}:`, {
      subscriberEmail,
      firstName,
      lastName,
      subscribedAt: subscription.subscribedDate
    });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      data: {
        email: subscription.email,
        firstName: subscription.firstName,
        lastName: subscription.lastName,
        subscribedAt: subscription.subscribedDate
      }
    });

  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return next(new AppError('Error subscribing to newsletter', 500));
  }
});

// @desc    Verify discount code (public)
// @route   POST /api/public/users/:email/verify-discount
// @access  Public
const verifyDiscountCodeByUser = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  const { code, reservationAmount, reservationDays, carCategory } = req.body;
  
  if (!userEmail || !code) {
    return next(new AppError('User email and discount code are required', 400));
  }

  try {
    const tenantId = await getTenantByUserEmail(userEmail);
    
    if (!tenantId) {
      return next(new AppError('Tenant not found for this user', 404));
    }

    console.log('🔍 DEBUG: Discount code verification');
    console.log('📧 User email:', userEmail);
    console.log('🏢 Tenant ID:', tenantId);
    console.log('🎫 Original code:', code);
    console.log('🎫 Uppercase code:', code.toUpperCase());

    // Find the discount code for this tenant
    const discountCode = await DiscountCode.findOne({ 
      code: code.toUpperCase(),
      tenantId: tenantId
    });

    console.log('💾 Database query result:', discountCode ? 'FOUND' : 'NOT FOUND');
    
    // Let's also check all discount codes for this tenant for debugging
    const allCodesForTenant = await DiscountCode.find({ tenantId: tenantId });
    console.log('📋 All discount codes for this tenant:', allCodesForTenant.map(c => ({ code: c.code, isActive: c.isActive })));

    if (!discountCode) {
      return res.status(200).json({
        success: false,
        valid: false,
        reason: 'Neplatný zľavový kód',
        message: 'Zadaný zľavový kód neexistuje alebo nie je platný pre túto spoločnosť.',
        debug: {
          searchedCode: code.toUpperCase(),
          tenantId: tenantId,
          availableCodes: allCodesForTenant.map(c => c.code)
        }
      });
    }

    // Check if code is valid (active and within date range)
    if (!discountCode.isValid()) {
      return res.status(200).json({
        success: false,
        valid: false,
        reason: 'Zľavový kód je neplatný alebo vypršal',
        message: 'Tento zľavový kód nie je aktívny alebo už vypršal.'
      });
    }

    // Check usage limits
    if (discountCode.usageLimit === 'limited' && discountCode.currentUsageCount >= discountCode.maxUsageCount) {
      return res.status(200).json({
        success: false,
        valid: false,
        reason: 'Zľavový kód dosiahol maximálny počet použití',
        message: 'Tento zľavový kód už bol použitý maximálny počet krát.'
      });
    }

    // If no reservation amount provided, just check if code exists and is valid
    if (!reservationAmount) {
      return res.status(200).json({
        success: true,
        valid: true,
        data: {
          code: discountCode.code,
          description: discountCode.description,
          discountType: discountCode.discountType,
          discountValue: discountCode.discountValue,
          isActive: discountCode.isActive,
          usageCount: discountCode.currentUsageCount,
          maxUsage: discountCode.usageLimit === 'limited' ? discountCode.maxUsageCount : 'unlimited'
        },
        message: 'Zľavový kód je platný!'
      });
    }

    // Calculate discount if reservation amount is provided
    const discountResult = discountCode.calculateDiscount(
      reservationAmount, 
      reservationDays || 1, 
      carCategory
    );

    if (discountResult.reason) {
      return res.status(200).json({
        success: false,
        valid: false,
        reason: discountResult.reason,
        message: 'Zľavový kód nie je možné použiť pre túto rezerváciu.'
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      data: {
        code: discountCode.code,
        description: discountCode.description,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        discountAmount: discountResult.discount,
        originalAmount: reservationAmount,
        finalAmount: reservationAmount - discountResult.discount,
        savings: discountResult.discount,
        usageCount: discountCode.currentUsageCount,
        maxUsage: discountCode.usageLimit === 'limited' ? discountCode.maxUsageCount : 'unlimited'
      },
      message: `Zľava ${discountResult.discount}€ bola úspešne aplikovaná!`
    });

  } catch (error) {
    console.error('Error verifying discount code:', error);
    return next(new AppError('Chyba pri overovaní zľavového kódu', 500));
  }
});

// @desc    Get all cars (public - no authentication) with advanced filtering
// @route   GET /api/public/cars
// @access  Public
const getPublicCars = asyncHandler(async (req, res, next) => {
  // Extract filtering parameters
  const {
    // Basic filters
    category,
    fuelType,
    transmission,
    seats,
    
    // Date availability filters
    startDate,
    endDate,
    
    // Advanced filters
    carClass,
    unlimitedKm,
    petsAllowed,
    childSeat,
    navigation,
    roofBox,
    internationalTravel,
    
    // Pagination and sorting
    page = 1,
    limit = 20,
    sort,
    select,
    
    // Tenant filtering (optional)
    tenantId
  } = req.query;

  // Build base query
  let baseQuery = { 
    status: 'active',
    isActive: true
  };

  // Add tenant filter if provided
  if (tenantId) {
    baseQuery.tenantId = tenantId;
  }

  // Enhanced category mapping for car classes
  if (carClass) {
    const carClassMapping = {
      'ekonomicka': ['economy', 'compact'],
      'stredna': ['midsize'],
      'vyssia': ['fullsize', 'luxury'],
      'viacmiestne': ['minivan'],
      'uzitkove': ['utility'],
      'karavany': ['caravan'],
      'motorky': ['motorcycle'],
      'sportove': ['sports'],
      'elektromobily': ['electric']
    };
    
    if (carClassMapping[carClass]) {
      baseQuery.category = { $in: carClassMapping[carClass] };
    }
  } else if (category) {
    // Standard category filter
    if (Array.isArray(category)) {
      baseQuery.category = { $in: category };
    } else {
      baseQuery.category = category;
    }
  }

  // Fuel type filter
  if (fuelType) {
    if (Array.isArray(fuelType)) {
      baseQuery.fuelType = { $in: fuelType };
    } else {
      baseQuery.fuelType = fuelType;
    }
  }

  // Transmission filter
  if (transmission) {
    if (Array.isArray(transmission)) {
      baseQuery.transmission = { $in: transmission };
    } else {
      baseQuery.transmission = transmission;
    }
  }

  // Seats filter
  if (seats) {
    if (Array.isArray(seats)) {
      baseQuery.seats = { $in: seats.map(s => parseInt(s)) };
    } else {
      baseQuery.seats = parseInt(seats);
    }
  }

  // Additional services filters
  const serviceFilters = [];
  
  if (unlimitedKm === 'true') {
    serviceFilters.push('unlimited_km');
  }
  if (petsAllowed === 'true') {
    serviceFilters.push('pets_allowed');
  }
  if (childSeat === 'true') {
    serviceFilters.push('child_seat');
  }
  if (navigation === 'true') {
    serviceFilters.push('navigation');
  }
  if (roofBox === 'true') {
    serviceFilters.push('roof_box');
  }
  if (internationalTravel === 'true') {
    serviceFilters.push('international_travel');
  }

  if (serviceFilters.length > 0) {
    baseQuery.features = { $all: serviceFilters };
  }

  let availableCars = [];
  let totalAvailable = 0;
  let hasDateFilter = false;

  // Date availability filtering
  if (startDate && endDate) {
    hasDateFilter = true;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return next(new AppError('End date must be after start date', 400));
    }

    // Find cars that are available for the specified dates
    const allCars = await Car.find(baseQuery);
    
    for (const car of allCars) {
      // Check for overlapping reservations
      const overlappingReservations = await Reservation.find({
        car: car._id,
        tenantId: car.tenantId,
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

      if (overlappingReservations.length === 0) {
        availableCars.push(car);
      }
    }

    totalAvailable = availableCars.length;
  } else {
    // No date filter, use regular query
    const query = Car.find(baseQuery);
    availableCars = await query;
    totalAvailable = await Car.countDocuments(baseQuery);
  }

  // Fallback logic when no results found
  if (availableCars.length === 0 && hasDateFilter) {
    // Show available alternatives for the date, sorted by price
    const fallbackQuery = {
      status: 'active',
      isActive: true
    };
    
    if (tenantId) {
      fallbackQuery.tenantId = tenantId;
    }

    const fallbackCars = await Car.find(fallbackQuery);
    const availableFallbackCars = [];
    
    for (const car of fallbackCars) {
      const overlappingReservations = await Reservation.find({
        car: car._id,
        tenantId: car.tenantId,
        status: { $in: ['confirmed', 'ongoing'] },
        $or: [
          {
            startDate: { $lte: new Date(startDate) },
            endDate: { $gte: new Date(startDate) }
          },
          {
            startDate: { $lte: new Date(endDate) },
            endDate: { $gte: new Date(endDate) }
          },
          {
            startDate: { $gte: new Date(startDate) },
            endDate: { $lte: new Date(endDate) }
          }
        ]
      });

      if (overlappingReservations.length === 0) {
        availableFallbackCars.push(car);
      }
    }

    // Sort by price ascending
    availableFallbackCars.sort((a, b) => {
      const priceA = a.pricing?.dailyRate || a.dailyRate || 0;
      const priceB = b.pricing?.dailyRate || b.dailyRate || 0;
      return priceA - priceB;
    });

    return res.status(200).json({
      success: true,
      count: availableFallbackCars.length,
      total: availableFallbackCars.length,
      isFallback: true,
      message: 'Vami vybrané vozidlo momentálne nie je dostupné. Zobrazujeme dostupné alternatívy pre zadaný dátum vzostupne podľa ceny.',
      data: availableFallbackCars.slice(0, parseInt(limit))
    });
  }

  // Apply sorting
  if (sort) {
    const sortBy = sort.split(',').join(' ');
    if (sort.includes('price') || sort.includes('dailyRate')) {
      // Custom price sorting
      availableCars.sort((a, b) => {
        const priceA = a.pricing?.dailyRate || a.dailyRate || 0;
        const priceB = b.pricing?.dailyRate || b.dailyRate || 0;
        return sort.startsWith('-') ? priceB - priceA : priceA - priceB;
      });
    }
  } else {
    // Default sorting by daily rate ascending
    availableCars.sort((a, b) => {
      const priceA = a.pricing?.dailyRate || a.dailyRate || 0;
      const priceB = b.pricing?.dailyRate || b.dailyRate || 0;
      return priceA - priceB;
    });
  }

  // Apply pagination
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedCars = availableCars.slice(startIndex, endIndex);

  // Apply field selection
  let responseData = paginatedCars;
  if (select) {
    const fields = select.split(',');
    responseData = paginatedCars.map(car => {
      const selected = {};
      fields.forEach(field => {
        if (car[field] !== undefined) {
          selected[field] = car[field];
        }
      });
      return selected;
    });
  } else {
    // Default safe fields
    const publicFields = ['_id', 'brand', 'model', 'year', 'color', 'category', 'fuelType', 'engine', 'transmission', 'seats', 'doors', 'description', 'pricing', 'mileageLimits', 'location', 'features', 'images', 'equipment', 'badges', 'status'];
    responseData = paginatedCars.map(car => {
      const safeData = {};
      publicFields.forEach(field => {
        if (car[field] !== undefined) {
          safeData[field] = car[field];
        }
      });
      return safeData;
    });
  }

  // Pagination metadata
  const pagination = {};
  if (endIndex < totalAvailable) {
    pagination.next = {
      page: parseInt(page) + 1,
      limit: parseInt(limit)
    };
  }
  if (startIndex > 0) {
    pagination.prev = {
      page: parseInt(page) - 1,
      limit: parseInt(limit)
    };
  }

  res.status(200).json({
    success: true,
    count: responseData.length,
    total: totalAvailable,
    pagination,
    filters: {
      carClass,
      category,
      fuelType,
      transmission,
      seats,
      startDate,
      endDate,
      additionalServices: serviceFilters
    },
    data: responseData
  });
});

// @desc    Get single car (public - no authentication)
// @route   GET /api/public/cars/:id
// @access  Public
const getPublicCar = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({ 
    _id: req.params.id,
    status: 'active',
    isActive: true
  }).select('brand model year color category fuelType engine transmission seats doors description pricing mileageLimits location features images equipment badges status');

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: car
  });
});

// @desc    Get car pricing (public - no authentication)
// @route   GET /api/public/cars/:id/pricing
// @access  Public
const getPublicCarPricing = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { days } = req.query; // Optional: get calculated price for specific duration
  
  try {
    const car = await Car.findOne({
      _id: id,
      isActive: true,
      status: 'active'
    }).select('pricing dailyRate brand model year');
    
    if (!car) {
      return next(new AppError('Car not found', 404));
    }
    
    // Build comprehensive pricing response
    const pricingData = {
      carId: car._id,
      carInfo: {
        brand: car.brand,
        model: car.model,
        year: car.year
      },
      pricing: {
        dailyRate: car.pricing?.dailyRate || car.dailyRate || 0,
        deposit: car.pricing?.deposit || 0,
        rates: {
          '1day': car.pricing?.rates?.['1day'] || null,
          '2-3days': car.pricing?.rates?.['2-3days'] || null,
          '4-10days': car.pricing?.rates?.['4-10days'] || null,
          '11-17days': car.pricing?.rates?.['11-17days'] || null,
          '18-24days': car.pricing?.rates?.['18-24days'] || null,
          '25-29days': car.pricing?.rates?.['25-29days'] || null,
          '30plus': car.pricing?.rates?.['30plus'] || 'dohoda - volať/písať mail'
        },
        weeklyRate: car.pricing?.weeklyRate || null,
        monthlyRate: car.pricing?.monthlyRate || null
      }
    };
    
    // If days parameter is provided, calculate the total price for that duration
    if (days && !isNaN(days) && parseInt(days) > 0) {
      const durationDays = parseInt(days);
      try {
        const calculatedPrice = car.calculateRate(durationDays);
        pricingData.calculation = {
          days: durationDays,
          totalPrice: calculatedPrice,
          dailyRate: calculatedPrice / durationDays,
          appliedRate: getAppliedRateDescription(durationDays, car.pricing?.rates || {})
        };
      } catch (error) {
        console.error('❌ Error calculating price for days:', error);
        // Don't fail the request, just omit calculation
      }
    }
    
    res.status(200).json({
      success: true,
      data: pricingData
    });
  } catch (error) {
    console.error('❌ Error getting public car pricing:', error);
    return next(new AppError('Error retrieving car pricing', 500));
  }
});

// Helper function to describe which rate was applied
const getAppliedRateDescription = (days, rates) => {
  if (days === 1 && rates['1day']) return '1 day rate';
  if (days >= 2 && days <= 3 && rates['2-3days']) return '2-3 days rate';
  if (days >= 4 && days <= 10 && rates['4-10days']) return '4-10 days rate';
  if (days >= 11 && days <= 17 && rates['11-17days']) return '11-17 days rate';
  if (days >= 18 && days <= 24 && rates['18-24days']) return '18-24 days rate';
  if (days >= 25 && days <= 29 && rates['25-29days']) return '25-29 days rate';
  if (days >= 30) return '30+ days rate (contact for pricing)';
  return 'Daily rate (fallback)';
};

// @desc    Get car categories (public - no authentication)
// @route   GET /api/public/cars/categories
// @access  Public
const getPublicCarCategories = asyncHandler(async (req, res, next) => {
  try {
    // Define all available car categories with Slovak translations and descriptions
    const categories = [
      {
        value: 'economy',
        label: 'Ekonomická',
        labelEn: 'Economy',
        description: 'Úsporné a spoľahlivé mestské auto vhodné na každodenné jazdenie aj krátke výlety s dôrazom na jednoduchosť a pohodlie.',
        icon: 'directions_car',
        color: '#4caf50'
      },
      {
        value: 'compact',
        label: 'Kompaktná',
        labelEn: 'Compact',
        description: 'Komfortné vozidlo s dostatkom priestoru a výbavy pre rodinné výlety, služobné cesty aj bežné každodenné používanie.',
        icon: 'directions_car',
        color: '#2196f3'
      },
      {
        value: 'midsize',
        label: 'Stredná',
        labelEn: 'Midsize',
        description: 'Komfortné vozidlo s dostatkom priestoru a výbavy pre rodinné výlety, služobné cesty aj bežné každodenné používanie.',
        icon: 'directions_car',
        color: '#ff9800'
      },
      {
        value: 'fullsize',
        label: 'Veľká',
        labelEn: 'Full-size',
        description: 'Elegantné a výkonné vozidlo s nadštandardnou výbavou vhodné na dlhé trasy, diaľnice a náročnejších zákazníkov.',
        icon: 'directions_car',
        color: '#9c27b0'
      },
      {
        value: 'luxury',
        label: 'Luxusná',
        labelEn: 'Luxury',
        description: 'Elegantné a výkonné vozidlo s nadštandardnou výbavou vhodné na dlhé trasy, diaľnice a náročnejších zákazníkov.',
        icon: 'star',
        color: '#795548'
      },
      {
        value: 'suv',
        label: 'SUV',
        labelEn: 'SUV',
        description: 'Elegantné a výkonné vozidlo s nadštandardnou výbavou vhodné na dlhé trasy, diaľnice a náročnejších zákazníkov.',
        icon: 'terrain',
        color: '#607d8b'
      },
      {
        value: 'minivan',
        label: 'Minivan',
        labelEn: 'Minivan',
        description: 'Priestranné vozidlo ideálne na prepravu väčšej skupiny ľudí, rodinné výlety, firemné transfery alebo letiskové odvozy.',
        icon: 'airport_shuttle',
        color: '#3f51b5'
      },
      {
        value: 'convertible',
        label: 'Kabriolet',
        labelEn: 'Convertible',
        description: 'Športové vozidlo s otvárateľnou strechou pre zážitkovú jazdu a špecialné príležitosti.',
        icon: 'wb_sunny',
        color: '#ffeb3b'
      },
      {
        value: 'sports',
        label: 'Športové',
        labelEn: 'Sports',
        description: 'Dynamické vozidlá pre zážitkovú jazdu, nadštandardný výkon a atraktívny vzhľad. Ideálne pre náročných motoristov.',
        icon: 'speed',
        color: '#f44336'
      },
      {
        value: 'utility',
        label: 'Úžitkové',
        labelEn: 'Utility',
        description: 'Výkonné dodávky určené na prepravu nákladu, zariadenia alebo sťahovanie, s veľkým nakladacím priestorom a 3 miestami na sedenie.',
        icon: 'local_shipping',
        color: '#9e9e9e'
      },
      {
        value: 'caravan',
        label: 'Obytné',
        labelEn: 'Caravan',
        description: 'Plne vybavené obytné vozidlá vhodné na dovolenku, výlety v prírode alebo dlhšie cesty po Európe s maximálnym komfortom.',
        icon: 'rv_hookup',
        color: '#8bc34a'
      },
      {
        value: 'motorcycle',
        label: 'Motorka',
        labelEn: 'Motorcycle',
        description: 'Výkonné a spoľahlivé motorky pre dobrodružných jazdcov, vhodné na krátke aj dlhé trasy – ideálne na víkendové úniky z mesta.',
        icon: 'two_wheeler',
        color: '#ff5722'
      },
      {
        value: 'electric',
        label: 'Elektro',
        labelEn: 'Electric',
        description: 'Tiché, ekologické a moderné autá s okamžitým nástupom výkonu. Ideálne pre jazdu v meste aj medzimestské presuny.',
        icon: 'electric_car',
        color: '#4caf50'
      }
    ];

    // Optional: Filter to only return categories that have active cars
    const { activeOnly } = req.query;
    
    if (activeOnly === 'true') {
      // Get distinct categories from active cars
      const Car = require('../models/Car');
      const activeCategories = await Car.distinct('category', {
        status: 'active',
        isActive: true
      });
      
      // Filter categories to only include those with active cars
      const filteredCategories = categories.filter(cat => 
        activeCategories.includes(cat.value)
      );
      
      // Add count of cars in each category
      for (const category of filteredCategories) {
        const count = await Car.countDocuments({
          category: category.value,
          status: 'active',
          isActive: true
        });
        category.carCount = count;
      }
      
      res.status(200).json({
        success: true,
        count: filteredCategories.length,
        data: filteredCategories.sort((a, b) => (b.carCount || 0) - (a.carCount || 0))
      });
    } else {
      // Return all categories
      res.status(200).json({
        success: true,
        count: categories.length,
        data: categories
      });
    }
  } catch (error) {
    console.error('❌ Error getting car categories:', error);
    return next(new AppError('Error retrieving car categories', 500));
  }
});

// @desc    Get car filter options (public - no authentication)
// @route   GET /api/public/cars/filter-options
// @access  Public
const getPublicCarFilterOptions = asyncHandler(async (req, res, next) => {
  try {
    // Define filter options with Slovak translations
    const filterOptions = {
      fuelType: [
        {
          value: 'gasoline',
          label: 'Benzín',
          labelEn: 'Gasoline',
          icon: 'local_gas_station',
          color: '#ff9800'
        },
        {
          value: 'diesel',
          label: 'Diesel',
          labelEn: 'Diesel',
          icon: 'local_gas_station',
          color: '#795548'
        },
        {
          value: 'hybrid',
          label: 'Hybrid',
          labelEn: 'Hybrid',
          icon: 'eco',
          color: '#4caf50'
        },
        {
          value: 'electric',
          label: 'Elektro',
          labelEn: 'Electric',
          icon: 'electric_car',
          color: '#2196f3'
        },
        {
          value: 'lpg',
          label: 'LPG',
          labelEn: 'LPG',
          icon: 'local_gas_station',
          color: '#9c27b0'
        }
      ],
      transmission: [
        {
          value: 'manual',
          label: 'Manuálna',
          labelEn: 'Manual',
          icon: 'settings',
          color: '#607d8b'
        },
        {
          value: 'automatic',
          label: 'Automatická',
          labelEn: 'Automatic',
          icon: 'settings_backup_restore',
          color: '#3f51b5'
        },
        {
          value: 'cvt',
          label: 'CVT',
          labelEn: 'CVT',
          icon: 'tune',
          color: '#9e9e9e'
        }
      ],
      seats: [
        {
          value: 2,
          label: '2 miesta',
          labelEn: '2 seats',
          icon: 'person',
          color: '#ff5722'
        },
        {
          value: 4,
          label: '4 miesta',
          labelEn: '4 seats', 
          icon: 'people',
          color: '#2196f3'
        },
        {
          value: 5,
          label: '5 miest',
          labelEn: '5 seats',
          icon: 'people',
          color: '#4caf50'
        },
        {
          value: 7,
          label: '7 miest',
          labelEn: '7 seats',
          icon: 'group',
          color: '#ff9800'
        },
        {
          value: 9,
          label: '9 miest',
          labelEn: '9 seats',
          icon: 'groups',
          color: '#9c27b0'
        }
      ]
    };

    // Optional: Filter to only return options that have active cars
    const { activeOnly } = req.query;
    
    if (activeOnly === 'true') {
      const Car = require('../models/Car');
      
      // Get distinct values from active cars
      const [activeFuelTypes, activeTransmissions, activeSeats] = await Promise.all([
        Car.distinct('fuelType', { status: 'active', isActive: true }),
        Car.distinct('transmission', { status: 'active', isActive: true }),
        Car.distinct('seats', { status: 'active', isActive: true })
      ]);
      
      // Filter options to only include those with active cars and add counts
      const filteredOptions = {
        fuelType: [],
        transmission: [],
        seats: []
      };
      
      // Process fuel types
      for (const fuelType of filterOptions.fuelType) {
        if (activeFuelTypes.includes(fuelType.value)) {
          const count = await Car.countDocuments({
            fuelType: fuelType.value,
            status: 'active',
            isActive: true
          });
          filteredOptions.fuelType.push({ ...fuelType, carCount: count });
        }
      }
      
      // Process transmissions
      for (const transmission of filterOptions.transmission) {
        if (activeTransmissions.includes(transmission.value)) {
          const count = await Car.countDocuments({
            transmission: transmission.value,
            status: 'active',
            isActive: true
          });
          filteredOptions.transmission.push({ ...transmission, carCount: count });
        }
      }
      
      // Process seats
      for (const seatOption of filterOptions.seats) {
        if (activeSeats.includes(seatOption.value)) {
          const count = await Car.countDocuments({
            seats: seatOption.value,
            status: 'active',
            isActive: true
          });
          filteredOptions.seats.push({ ...seatOption, carCount: count });
        }
      }
      
      // Sort by car count (descending)
      filteredOptions.fuelType.sort((a, b) => (b.carCount || 0) - (a.carCount || 0));
      filteredOptions.transmission.sort((a, b) => (b.carCount || 0) - (a.carCount || 0));
      filteredOptions.seats.sort((a, b) => (b.carCount || 0) - (a.carCount || 0));
      
      res.status(200).json({
        success: true,
        data: filteredOptions
      });
    } else {
      // Return all filter options
      res.status(200).json({
        success: true,
        data: filterOptions
      });
    }
  } catch (error) {
    console.error('❌ Error getting car filter options:', error);
    return next(new AppError('Error retrieving car filter options', 500));
  }
});

// @desc    Get car booking calendar for a specific user/tenant (public)
// @route   GET /api/public/users/:email/cars/:carId/calendar
// @access  Public
const getCarCalendarByUser = asyncHandler(async (req, res, next) => {
  const { email, carId } = req.params;
  const { startDate, endDate, includePending } = req.query;
  
  // Get tenant ID from user email
  const tenantId = await getTenantByUserEmail(email);
  
  const car = await Car.findOne({ 
    _id: carId, 
    tenantId,
    isActive: true 
  }).select('brand model year status tenantId');
  
  if (!car) {
    return next(new AppError(`Car not found with id: ${carId}`, 404));
  }
  
  // Default to next 6 months if no dates provided
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000);

  // Validate date range
  if (start >= end) {
    return next(new AppError('End date must be after start date', 400));
  }

  // Determine which reservation statuses to include
  const statusesToInclude = ['confirmed', 'ongoing'];
  if (includePending === 'true') {
    statusesToInclude.push('pending');
  }

  // Get all reservations for this car in the date range (tenant-specific)
  const reservations = await Reservation.find({
    car: carId,
    tenantId,
    status: { $in: statusesToInclude },
    $or: [
      {
        startDate: { $lte: end },
        endDate: { $gte: start }
      }
    ]
  }).select('startDate endDate status reservationNumber customer')
    .populate('customer', 'firstName lastName');

  // Create calendar data with booked dates
  const bookedDates = [];
  const reservationDetails = [];
  
  reservations.forEach(reservation => {
    const reservationStart = new Date(Math.max(reservation.startDate, start));
    const reservationEnd = new Date(Math.min(reservation.endDate, end));
    
    // Add reservation summary
    reservationDetails.push({
      reservationNumber: reservation.reservationNumber,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      status: reservation.status,
      customerName: reservation.customer ? 
        `${reservation.customer.firstName} ${reservation.customer.lastName}` : 
        'Unknown Customer'
    });
    
    // Generate daily entries for calendar
    for (let d = new Date(reservationStart); d <= reservationEnd; d.setDate(d.getDate() + 1)) {
      bookedDates.push({
        date: new Date(d).toISOString().split('T')[0],
        reservationNumber: reservation.reservationNumber,
        status: reservation.status,
        isStartDate: d.getTime() === reservation.startDate.getTime(),
        isEndDate: d.getTime() === reservation.endDate.getTime()
      });
    }
  });

  // Sort booked dates chronologically
  bookedDates.sort((a, b) => new Date(a.date) - new Date(b.date));

  res.status(200).json({
    success: true,
    data: {
      carId: car._id,
      car: {
        brand: car.brand,
        model: car.model,
        year: car.year,
        status: car.status
      },
      isOperational: car.status === 'active',
      calendar: {
        startDate: start,
        endDate: end,
        bookedDates: bookedDates,
        totalBookedDays: bookedDates.length,
        uniqueReservations: reservationDetails.length
      },
      reservations: reservationDetails
    }
  });
});

// @desc    Get reserved dates for multiple cars by user/tenant (public)
// @route   GET /api/public/users/:email/cars/reserved-dates
// @access  Public
const getReservedDatesByUser = asyncHandler(async (req, res, next) => {
  const { email } = req.params;
  const { carIds, startDate, endDate, includePending } = req.query;
  
  // Get tenant ID from user email
  const tenantId = await getTenantByUserEmail(email);
  
  // Default to next 3 months if no dates provided
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000);

  // Validate date range
  if (start >= end) {
    return next(new AppError('End date must be after start date', 400));
  }

  // Build car filter
  let carFilter = { tenantId, isActive: true };
  if (carIds) {
    const carIdArray = Array.isArray(carIds) ? carIds : carIds.split(',');
    carFilter._id = { $in: carIdArray };
  }

  // Get cars for this tenant
  const cars = await Car.find(carFilter).select('brand model year status');

  if (cars.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        cars: [],
        reservations: [],
        summary: {
          totalCars: 0,
          totalReservations: 0,
          dateRange: { start, end }
        }
      }
    });
  }

  // Determine which reservation statuses to include
  const statusesToInclude = ['confirmed', 'ongoing'];
  if (includePending === 'true') {
    statusesToInclude.push('pending');
  }

  // Get all reservations for these cars in the date range
  const reservations = await Reservation.find({
    car: { $in: cars.map(car => car._id) },
    tenantId,
    status: { $in: statusesToInclude },
    $or: [
      {
        startDate: { $lte: end },
        endDate: { $gte: start }
      }
    ]
  }).select('car startDate endDate status reservationNumber customer')
    .populate('car', 'brand model year')
    .populate('customer', 'firstName lastName')
    .sort({ startDate: 1 });

  // Group reservations by car
  const carReservations = {};
  cars.forEach(car => {
    carReservations[car._id] = {
      car: {
        id: car._id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        status: car.status
      },
      reservations: [],
      bookedDays: 0
    };
  });

  // Process reservations
  reservations.forEach(reservation => {
    const carId = reservation.car._id.toString();
    if (carReservations[carId]) {
      const reservationStart = new Date(Math.max(reservation.startDate, start));
      const reservationEnd = new Date(Math.min(reservation.endDate, end));
      const days = Math.ceil((reservationEnd - reservationStart) / (1000 * 60 * 60 * 24)) + 1;
      
      carReservations[carId].reservations.push({
        reservationNumber: reservation.reservationNumber,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        status: reservation.status,
        customerName: reservation.customer ? 
          `${reservation.customer.firstName} ${reservation.customer.lastName}` : 
          'Unknown Customer',
        daysInRange: days
      });
      
      carReservations[carId].bookedDays += days;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      cars: Object.values(carReservations),
      summary: {
        totalCars: cars.length,
        totalReservations: reservations.length,
        dateRange: { start, end },
        totalBookedDays: Object.values(carReservations).reduce((sum, car) => sum + car.bookedDays, 0)
      }
    }
  });
});

// @desc    Get general car calendar (public - no tenant restriction)
// @route   GET /api/public/cars/:id/calendar  
// @access  Public
const getPublicCarCalendar = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({ 
    _id: req.params.id,
    status: 'active',
    isActive: true
  }).select('brand model year status tenantId');

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  const { startDate, endDate, includePending } = req.query;
  
  // Default to next 6 months if no dates provided
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000);

  // Validate date range
  if (start >= end) {
    return next(new AppError('End date must be after start date', 400));
  }

  // Determine which reservation statuses to include
  const statusesToInclude = ['confirmed', 'ongoing'];
  if (includePending === 'true') {
    statusesToInclude.push('pending');
  }

  // Get all reservations for this car in the date range
  const reservations = await Reservation.find({
    car: req.params.id,
    tenantId: car.tenantId, // Ensure tenant consistency
    status: { $in: statusesToInclude },
    $or: [
      {
        startDate: { $lte: end },
        endDate: { $gte: start }
      }
    ]
  }).select('startDate endDate status reservationNumber');

  // Create calendar data
  const bookedDates = [];
  reservations.forEach(reservation => {
    const reservationStart = new Date(Math.max(reservation.startDate, start));
    const reservationEnd = new Date(Math.min(reservation.endDate, end));
    
    for (let d = new Date(reservationStart); d <= reservationEnd; d.setDate(d.getDate() + 1)) {
      bookedDates.push({
        date: new Date(d).toISOString().split('T')[0],
        reservationNumber: reservation.reservationNumber,
        status: reservation.status,
        isStartDate: d.getTime() === reservation.startDate.getTime(),
        isEndDate: d.getTime() === reservation.endDate.getTime()
      });
    }
  });

  // Sort booked dates chronologically
  bookedDates.sort((a, b) => new Date(a.date) - new Date(b.date));

  res.status(200).json({
    success: true,
    data: {
      carId: car._id,
      car: {
        brand: car.brand,
        model: car.model,
        year: car.year,
        status: car.status
      },
      isOperational: car.status === 'active',
      calendar: {
        startDate: start,
        endDate: end,
        bookedDates: bookedDates,
        totalBookedDays: bookedDates.length
      }
    }
  });
});

// @desc    Simple newsletter subscription (public)
// @route   POST /api/public/newsletter/subscribe
// @access  Public
const subscribeToNewsletterSimple = asyncHandler(async (req, res, next) => {
  const { email, firstName, lastName, phone, consent = true, tenantId } = req.body;
  
  if (!email) {
    return next(new AppError('Email is required', 400));
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please enter a valid email address', 400));
  }

  try {
    let resolvedTenantId = tenantId;
    
    // If no tenant ID provided, try to resolve from headers or host
    if (!resolvedTenantId) {
      // Try to get tenant ID from header
      resolvedTenantId = req.headers['x-tenant-id'];
      
      // If still no tenant ID, try to resolve from host/subdomain
      if (!resolvedTenantId) {
        const host = req.get('Host') || req.get('host');
        if (host) {
          // Extract subdomain
          const subdomain = host.split('.')[0];
          
          // Try to find tenant by subdomain or domain
          const User = require('../models/User');
          const tenant = await User.findOne({ 
            role: 'admin', 
            $or: [
              { subdomain: subdomain },
              { domain: host },
              { email: { $regex: subdomain, $options: 'i' } }
            ]
          });
          
          if (tenant) {
            resolvedTenantId = tenant._id;
          }
        }
      }
    }
    
    if (!resolvedTenantId) {
      return next(new AppError('Unable to determine tenant. Please provide tenant information.', 400));
    }

    // Import EmailSubscription model
    const EmailSubscription = require('../models/EmailSubscription');

    // Check if email already exists for this tenant
    let subscription = await EmailSubscription.findOne({ 
      tenantId: resolvedTenantId, 
      email: email 
    });

    if (subscription) {
      // If exists but inactive, reactivate
      if (!subscription.isActive) {
        await subscription.resubscribe();
        return res.status(200).json({
          success: true,
          message: 'Successfully resubscribed to newsletter',
          data: {
            email: subscription.email,
            firstName: subscription.firstName,
            lastName: subscription.lastName,
            subscribedAt: subscription.subscribedDate
          }
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'Email already subscribed to newsletter',
          data: {
            email: subscription.email,
            firstName: subscription.firstName,
            lastName: subscription.lastName,
            subscribedAt: subscription.subscribedDate
          }
        });
      }
    }

    // Create new subscription
    subscription = new EmailSubscription({
      tenantId: resolvedTenantId,
      email: email,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || '',
      source: 'website',
      tags: ['newsletter'],
      isActive: true,
      consentGiven: consent,
      consentDate: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress || '',
      userAgent: req.get('User-Agent') || ''
    });

    await subscription.save();

    console.log(`✅ Newsletter subscription saved for tenant ${resolvedTenantId}:`, {
      email,
      firstName,
      lastName,
      subscribedAt: subscription.subscribedDate
    });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      data: {
        email: subscription.email,
        firstName: subscription.firstName,
        lastName: subscription.lastName,
        subscribedAt: subscription.subscribedDate
      }
    });

  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return next(new AppError('Error subscribing to newsletter', 500));
  }
});

// @desc    Get QR payment codes for reservation (public)
// @route   GET /api/public/reservations/:id/qr
// @access  Public
const getReservationQR = asyncHandler(async (req, res, next) => {
  const reservationId = req.params.id;
  const forceRegenerate = req.query.regenerate === 'true'; // Optional query param to force regeneration
  
  if (!reservationId) {
    return next(new AppError('Reservation ID is required', 400));
  }

  try {
    console.log('🔍 [QR API] Getting QR codes for reservation:', reservationId, forceRegenerate ? '(forcing regeneration)' : '');
    
    // Find reservation with QR codes
    const reservation = await Reservation.findById(reservationId)
      .select('qrCodes pricing status customer car startDate endDate reservationNumber')
      .populate('customer', 'firstName lastName email')
      .populate('car', 'brand model year pricing');
    
    if (!reservation) {
      return next(new AppError('Reservation not found', 404));
    }

    console.log('🔍 [QR API] Reservation found:', reservation.reservationNumber);
    console.log('🔍 [QR API] QR codes raw object:', JSON.stringify(reservation.qrCodes, null, 2));
    console.log('🔍 [QR API] QR codes available:', {
      hasQRCodes: !!reservation.qrCodes,
      payBySquare: !!reservation.qrCodes?.payBySquare,
      payBySquareRental: !!reservation.qrCodes?.payBySquareRental,
      payBySquareDeposit: !!reservation.qrCodes?.payBySquareDeposit,
      qrCodesKeys: reservation.qrCodes ? Object.keys(reservation.qrCodes) : []
    });
    
    // Always generate fresh QR codes on demand for consistent dual QR display
    console.log('🔄 [QR API] Generating fresh QR codes on demand (no caching)');
    
    const hasPaymentInfo = reservation.qrCodes && reservation.qrCodes.bankAccount && reservation.qrCodes.variableSymbol && reservation.qrCodes.amount > 0;
    
    console.log('🔍 [QR API] Payment info available:', {
      hasPaymentInfo,
      bankAccount: reservation.qrCodes?.bankAccount,
      amount: reservation.qrCodes?.amount,
      variableSymbol: reservation.qrCodes?.variableSymbol
    });
    
    if (!hasPaymentInfo) {
      console.log('❌ [QR API] No payment info available, cannot generate QR codes');
      return res.status(200).json({
        success: true,
        message: 'QR codes cannot be generated - missing payment information',
        data: {
          hasQRCodes: false,
          reservation: {
            id: reservation._id,
            reservationNumber: reservation.reservationNumber,
            status: reservation.status,
            amount: reservation.pricing?.totalAmount || 0
          }
        }
      });
    }

    // Always generate QR codes fresh using PayBySquare API
    if (hasPaymentInfo) {
      console.log('🔧 [QR API] Attempting to generate QR codes using PayBySquare API');
      
      try {
        const bySquareService = require('../services/bySquareService');
        
        // Check if bySquare service is properly configured
        if (!bySquareService.isConfigured()) {
          console.log('❌ [QR API] PayBySquare service not configured - missing credentials');
          console.log('❌ [QR API] Please configure BYSQUARE_USERNAME and BYSQUARE_PASSWORD environment variables');
        } else {
          console.log('✅ [QR API] PayBySquare service configured, generating QR codes');
          
          const qrResult = await bySquareService.generateReservationQR(
            reservation,
            reservation.car,
            reservation.customer
          );
          
          if (qrResult && qrResult.success && qrResult.qrCodes) {
            console.log('✅ [QR API] Successfully generated QR codes via PayBySquare API');
            
            // Store both generated QR codes
            if (qrResult.qrCodes.payBySquareRental) {
              reservation.qrCodes.payBySquareRental = qrResult.qrCodes.payBySquareRental;
              reservation.qrCodes.payBySquare = qrResult.qrCodes.payBySquareRental; // Legacy compatibility
              console.log('✅ [QR API] Saved rental QR code');
            }
            
            if (qrResult.qrCodes.payBySquareDeposit) {
              reservation.qrCodes.payBySquareDeposit = qrResult.qrCodes.payBySquareDeposit;
              console.log('✅ [QR API] Saved deposit QR code');
            }
            
            await reservation.save();
            console.log('✅ [QR API] PayBySquare QR codes generated and saved successfully');
            
          } else {
            console.log('❌ [QR API] PayBySquare API returned error:', qrResult?.error || 'Unknown error');
          }
        }
        
      } catch (error) {
        console.error('❌ [QR API] Error with PayBySquare API:', error.message);
      }
    }

    // Check if QR generation was successful
    const finalHasValidQRCodes = reservation.qrCodes && (
      (reservation.qrCodes.payBySquareRental && reservation.qrCodes.payBySquareRental !== null) ||
      (reservation.qrCodes.payBySquareDeposit && reservation.qrCodes.payBySquareDeposit !== null) ||
      (reservation.qrCodes.payBySquare && reservation.qrCodes.payBySquare !== null)
    );

    if (!finalHasValidQRCodes) {
      console.log('❌ [QR API] QR code generation failed');
      return res.status(200).json({
        success: true,
        message: 'QR codes could not be generated for this reservation',
        data: {
          hasQRCodes: false,
          reservation: {
            id: reservation._id,
            reservationNumber: reservation.reservationNumber,
            status: reservation.status,
            amount: reservation.pricing?.totalAmount || 0
          },
          // Still include payment details for manual processing
          paymentDetails: hasPaymentInfo ? {
            amount: reservation.qrCodes.amount,
            bankAccount: reservation.qrCodes.bankAccount,
            variableSymbol: reservation.qrCodes.variableSymbol,
            constantSymbol: reservation.qrCodes.constantSymbol,
            beneficiaryName: reservation.qrCodes.beneficiaryName,
            paymentNote: reservation.qrCodes.paymentNote
          } : null
        }
      });
    }

    // Generate QR code image URLs for display
    console.log('✅ [QR API] QR codes available, generating image URLs');
    const bySquareService = require('../services/bySquareService');
    
    const qrImageUrls = {
      payBySquareRental: reservation.qrCodes.payBySquareRental ? 
        bySquareService.generateQRImageUrl(reservation.qrCodes.payBySquareRental, 'png', 300) : 
        (reservation.qrCodes.payBySquare ? bySquareService.generateQRImageUrl(reservation.qrCodes.payBySquare, 'png', 300) : null),
      payBySquareDeposit: reservation.qrCodes.payBySquareDeposit ? 
        bySquareService.generateQRImageUrl(reservation.qrCodes.payBySquareDeposit, 'png', 300) : 
        (reservation.qrCodes.qrPlatbaCz ? bySquareService.generateQRImageUrl(reservation.qrCodes.qrPlatbaCz, 'png', 300) : null)
    };

    res.status(200).json({
      success: true,
      data: {
        hasQRCodes: true,
        reservation: {
          id: reservation._id,
          reservationNumber: reservation.reservationNumber,
          status: reservation.status,
          customer: reservation.customer ? {
            name: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
            email: reservation.customer.email
          } : null,
          car: reservation.car ? {
            brand: reservation.car.brand,
            model: reservation.car.model,
            year: reservation.car.year
          } : null,
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          amount: (reservation.qrCodes.amount && reservation.qrCodes.amount > 0) ? reservation.qrCodes.amount : (reservation.pricing?.totalAmount || (reservation.pricing?.dailyRate * reservation.pricing?.totalDays) || 0),
          car: reservation.car ? {
            ...reservation.car.toObject(),
            pricing: {
              deposit: reservation.car.pricing?.deposit || 0
            }
          } : null
        },
        qrCodes: {
          payBySquareRental: reservation.qrCodes.payBySquareRental ? {
            code: reservation.qrCodes.payBySquareRental,
            imageUrl: qrImageUrls.payBySquareRental,
            format: 'Slovak PayBySquare - Rental'
          } : (reservation.qrCodes.payBySquare ? {
            code: reservation.qrCodes.payBySquare,
            imageUrl: qrImageUrls.payBySquareRental,
            format: 'Slovak PayBySquare - Legacy'
          } : null),
          payBySquareDeposit: reservation.qrCodes.payBySquareDeposit ? {
            code: reservation.qrCodes.payBySquareDeposit,
            imageUrl: qrImageUrls.payBySquareDeposit,
            format: 'Slovak PayBySquare - Deposit'
          } : null,
          // Keep old structure for compatibility
          payBySquare: reservation.qrCodes.payBySquare ? {
            code: reservation.qrCodes.payBySquare,
            imageUrl: qrImageUrls.payBySquareRental,
            format: 'Slovak PayBySquare - Legacy'
          } : null,
          qrPlatbaCz: reservation.qrCodes.qrPlatbaCz ? {
            code: reservation.qrCodes.qrPlatbaCz,
            imageUrl: qrImageUrls.payBySquareDeposit,
            format: 'Czech QR Platba - Legacy'
          } : null
        },
        paymentDetails: {
          amount: reservation.qrCodes.amount,
          bankAccount: reservation.qrCodes.bankAccount,
          variableSymbol: reservation.qrCodes.variableSymbol,
          constantSymbol: reservation.qrCodes.constantSymbol,
          specificSymbol: reservation.qrCodes.specificSymbol,
          beneficiaryName: reservation.qrCodes.beneficiaryName,
          paymentNote: reservation.qrCodes.paymentNote
        },
        metadata: {
          generatedAt: reservation.qrCodes.generatedAt,
          lastUpdated: reservation.qrCodes.lastUpdated,
          isActive: reservation.qrCodes.isActive
        }
      }
    });

  } catch (error) {
    console.error('Error fetching QR codes for reservation:', error);
    return next(new AppError('Error fetching QR codes', 500));
  }
});

// @desc    Get QR payment codes for reservation by user email (public)
// @route   GET /api/public/users/:email/reservations/:id/qr
// @access  Public
const getReservationQRByUser = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  const reservationId = req.params.id;
  
  if (!userEmail || !reservationId) {
    return next(new AppError('User email and reservation ID are required', 400));
  }

  try {
    const tenantId = await getTenantByUserEmail(userEmail);
    
    if (!tenantId) {
      return next(new AppError('Tenant not found for this user', 404));
    }

    // Find reservation with QR codes (tenant-scoped)
    const reservation = await Reservation.findOne({
      _id: reservationId,
      tenantId: tenantId
    })
      .select('qrCodes pricing status customer car startDate endDate reservationNumber')
      .populate('customer', 'firstName lastName email')
      .populate('car', 'brand model year pricing');
    
    if (!reservation) {
      return next(new AppError('Reservation not found', 404));
    }

    // Check if reservation has QR codes
    if (!reservation.qrCodes || (!reservation.qrCodes.payBySquareRental && !reservation.qrCodes.payBySquare)) {
      // Try to generate QR codes if they don't exist
      try {
        const bySquareService = require('../services/bySquareService');
        
        if (bySquareService.isConfigured()) {
          console.log('🔄 [QR] Attempting to generate missing QR codes...');
          
          const qrResult = await bySquareService.generateReservationQR(
            reservation, 
            reservation.car, 
            reservation.customer
          );
          
          if (qrResult.success && qrResult.qrCodes) {
            // Calculate total amount including deposit
            const rentalAmount = reservation.pricing?.totalAmount || 0;
            const depositAmount = reservation.car.pricing?.deposit || 0;
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
              bankAccount: 'SK1234567890123456789012',
              variableSymbol: variableSymbol,
              constantSymbol: '0308',
              specificSymbol: '',
              amount: totalAmount,
              beneficiaryName: 'CarFlow Rental',
              paymentNote: `Car rental + deposit: ${reservation.car.brand} ${reservation.car.model}`
            };
            
            await reservation.save();
            console.log('✅ [QR] Missing QR codes generated successfully');
          }
        }
      } catch (qrError) {
        console.error('❌ [QR] Failed to generate missing QR codes:', qrError.message);
      }
      
      // If still no QR codes after attempt
      if (!reservation.qrCodes || (!reservation.qrCodes.payBySquareRental && !reservation.qrCodes.payBySquare)) {
        return res.status(200).json({
          success: true,
          message: 'QR codes not available for this reservation',
          data: {
            hasQRCodes: false,
            reservation: {
              id: reservation._id,
              reservationNumber: reservation.reservationNumber,
              status: reservation.status,
              amount: reservation.pricing?.totalAmount || 0
            }
          }
        });
      }
    }

    // Generate QR code image URLs for display
    const bySquareService = require('../services/bySquareService');
    
    const qrImageUrls = {
      payBySquareRental: reservation.qrCodes.payBySquareRental ? 
        bySquareService.generateQRImageUrl(reservation.qrCodes.payBySquareRental, 'png', 300) : 
        (reservation.qrCodes.payBySquare ? bySquareService.generateQRImageUrl(reservation.qrCodes.payBySquare, 'png', 300) : null),
      payBySquareDeposit: reservation.qrCodes.payBySquareDeposit ? 
        bySquareService.generateQRImageUrl(reservation.qrCodes.payBySquareDeposit, 'png', 300) : 
        (reservation.qrCodes.qrPlatbaCz ? bySquareService.generateQRImageUrl(reservation.qrCodes.qrPlatbaCz, 'png', 300) : null)
    };

    res.status(200).json({
      success: true,
      data: {
        hasQRCodes: true,
        reservation: {
          id: reservation._id,
          reservationNumber: reservation.reservationNumber,
          status: reservation.status,
          customer: reservation.customer ? {
            name: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
            email: reservation.customer.email
          } : null,
          car: reservation.car ? {
            brand: reservation.car.brand,
            model: reservation.car.model,
            year: reservation.car.year
          } : null,
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          amount: (reservation.qrCodes.amount && reservation.qrCodes.amount > 0) ? reservation.qrCodes.amount : (reservation.pricing?.totalAmount || (reservation.pricing?.dailyRate * reservation.pricing?.totalDays) || 0),
          car: reservation.car ? {
            ...reservation.car.toObject(),
            pricing: {
              deposit: reservation.car.pricing?.deposit || 0
            }
          } : null
        },
        qrCodes: {
          payBySquareRental: reservation.qrCodes.payBySquareRental ? {
            code: reservation.qrCodes.payBySquareRental,
            imageUrl: qrImageUrls.payBySquareRental,
            format: 'Slovak PayBySquare - Rental'
          } : (reservation.qrCodes.payBySquare ? {
            code: reservation.qrCodes.payBySquare,
            imageUrl: qrImageUrls.payBySquareRental,
            format: 'Slovak PayBySquare - Legacy'
          } : null),
          payBySquareDeposit: reservation.qrCodes.payBySquareDeposit ? {
            code: reservation.qrCodes.payBySquareDeposit,
            imageUrl: qrImageUrls.payBySquareDeposit,
            format: 'Slovak PayBySquare - Deposit'
          } : null,
          // Keep old structure for compatibility
          payBySquare: reservation.qrCodes.payBySquare ? {
            code: reservation.qrCodes.payBySquare,
            imageUrl: qrImageUrls.payBySquareRental,
            format: 'Slovak PayBySquare - Legacy'
          } : null,
          qrPlatbaCz: reservation.qrCodes.qrPlatbaCz ? {
            code: reservation.qrCodes.qrPlatbaCz,
            imageUrl: qrImageUrls.payBySquareDeposit,
            format: 'Czech QR Platba - Legacy'
          } : null
        },
        paymentDetails: {
          amount: reservation.qrCodes.amount,
          bankAccount: reservation.qrCodes.bankAccount,
          variableSymbol: reservation.qrCodes.variableSymbol,
          constantSymbol: reservation.qrCodes.constantSymbol,
          specificSymbol: reservation.qrCodes.specificSymbol,
          beneficiaryName: reservation.qrCodes.beneficiaryName,
          paymentNote: reservation.qrCodes.paymentNote
        },
        metadata: {
          generatedAt: reservation.qrCodes.generatedAt,
          lastUpdated: reservation.qrCodes.lastUpdated,
          isActive: reservation.qrCodes.isActive
        }
      }
    });

  } catch (error) {
    console.error('Error fetching QR codes for user reservation:', error);
    return next(new AppError('Error fetching QR codes', 500));
  }
});

// @desc    Get Slovak rental agreement PDF by reservation ID (public)
// @route   GET /api/public/reservations/:id/slovak-agreement
// @access  Public
const getReservationSlovakAgreement = asyncHandler(async (req, res, next) => {
  const reservationId = req.params.id;
  
  if (!reservationId) {
    return next(new AppError('Reservation ID is required', 400));
  }

  try {
    // Find reservation with all necessary data
    const reservation = await Reservation.findById(reservationId)
      .select('reservationNumber customer car startDate endDate pricing status tenantId')
      .populate('customer', 'firstName lastName email phone address licenseNumber')
      .populate('car', 'brand model year registrationNumber vin color category');
    
    if (!reservation) {
      return next(new AppError('Reservation not found', 404));
    }

    console.log('🔄 [PDF] Generating Slovak rental agreement for public reservation:', reservationId);

    // Generate the PDF using the PDF service
    const pdfBuffer = await pdfService.generateRentalAgreement(
      reservation, 
      reservation.car, 
      reservation.customer
    );

    // Set response headers for PDF
    const isPreviewing = req.query.preview === 'true';
    const filename = `zmluva-o-najme-${reservation.reservationNumber || reservationId}.pdf`;
    
    if (isPreviewing) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF
    res.send(pdfBuffer);

    console.log('✅ [PDF] Slovak rental agreement sent successfully (public)');

  } catch (error) {
    console.error('❌ [PDF] Error generating Slovak rental agreement (public):', error);
    return next(new AppError('Error generating rental agreement', 500));
  }
});

// @desc    Get Slovak rental agreement PDF by user email and reservation ID (public)
// @route   GET /api/public/users/:email/reservations/:id/slovak-agreement
// @access  Public
const getReservationSlovakAgreementByUser = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  const reservationId = req.params.id;
  
  if (!userEmail || !reservationId) {
    return next(new AppError('User email and reservation ID are required', 400));
  }

  try {
    const tenantId = await getTenantByUserEmail(userEmail);
    
    if (!tenantId) {
      return next(new AppError('Tenant not found for this user', 404));
    }

    // Find reservation with tenant scope
    const reservation = await Reservation.findOne({
      _id: reservationId,
      tenantId: tenantId
    })
      .select('reservationNumber customer car startDate endDate pricing status tenantId')
      .populate('customer', 'firstName lastName email phone address licenseNumber')
      .populate('car', 'brand model year registrationNumber vin color category');
    
    if (!reservation) {
      return next(new AppError('Reservation not found', 404));
    }

    console.log('🔄 [PDF] Generating Slovak rental agreement for tenant reservation:', reservationId);

    // Generate the PDF using the PDF service
    const pdfBuffer = await pdfService.generateRentalAgreement(
      reservation, 
      reservation.car, 
      reservation.customer
    );

    // Set response headers for PDF
    const isPreviewing = req.query.preview === 'true';
    const filename = `zmluva-o-najme-${reservation.reservationNumber || reservationId}.pdf`;
    
    if (isPreviewing) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF
    res.send(pdfBuffer);

    console.log('✅ [PDF] Slovak rental agreement sent successfully (tenant-scoped)');

  } catch (error) {
    console.error('❌ [PDF] Error generating Slovak rental agreement (tenant-scoped):', error);
    return next(new AppError('Error generating rental agreement', 500));
  }
});

// @desc    Get pickup locations by user email (PUBLIC)
// @route   GET /api/public/users/:email/pickup-locations
// @access  Public
const getPickupLocationsByUser = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  
  if (!userEmail) {
    return next(new AppError('User email is required', 400));
  }

  try {
    // Find user by email to get tenantId
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Get settings for this tenant
    const Settings = require('../models/Settings');
    const settings = await Settings.getForTenant(user.tenantId);
    
    // Get active pickup locations
    const pickupLocations = settings.getActivePickupLocations();
    
    // Return pickup locations
    res.status(200).json({
      success: true,
      data: {
        pickupLocations: pickupLocations.map(location => ({
          id: location._id,
          name: location.name,
          address: location.address,
          openingHours: location.openingHours,
          isDefault: location.isDefault,
          coordinates: location.coordinates,
          notes: location.notes
        })),
        defaultLocation: settings.getDefaultPickupLocation()
      }
    });

    console.log('✅ [PUBLIC] Pickup locations retrieved successfully for:', userEmail);

  } catch (error) {
    console.error('❌ [PUBLIC] Error getting pickup locations:', error);
    return next(new AppError('Error retrieving pickup locations', 500));
  }
});

// @desc    Get car equipment only
// @route   GET /api/public/users/:email/cars/:carId/equipment
// @access  Public
const getCarEquipmentByUser = asyncHandler(async (req, res, next) => {
  const { email, carId } = req.params;
  
  try {
    const tenantId = await getTenantByUserEmail(email);
    
    const car = await Car.findOne({
      _id: carId,
      tenantId,
      isActive: true,
      status: 'active'
    }).select('equipment brand model year');
    
    if (!car) {
      return next(new AppError('Car not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: {
        carId: car._id,
        carInfo: {
          brand: car.brand,
          model: car.model,
          year: car.year
        },
        equipment: car.equipment || []
      }
    });
  } catch (error) {
    console.error('❌ Error getting car equipment:', error);
    return next(new AppError('Error retrieving car equipment', 500));
  }
});

// @desc    Get car badges only
// @route   GET /api/public/users/:email/cars/:carId/badges
// @access  Public
const getCarBadgesByUser = asyncHandler(async (req, res, next) => {
  const { email, carId } = req.params;
  
  try {
    const tenantId = await getTenantByUserEmail(email);
    
    const car = await Car.findOne({
      _id: carId,
      tenantId,
      isActive: true,
      status: 'active'
    }).select('badges brand model year');
    
    if (!car) {
      return next(new AppError('Car not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: {
        carId: car._id,
        carInfo: {
          brand: car.brand,
          model: car.model,
          year: car.year
        },
        badges: car.badges || []
      }
    });
  } catch (error) {
    console.error('❌ Error getting car badges:', error);
    return next(new AppError('Error retrieving car badges', 500));
  }
});

// @desc    Get car extended insurance options only
// @route   GET /api/public/users/:email/cars/:carId/extended-insurance
// @access  Public
const getCarExtendedInsuranceByUser = asyncHandler(async (req, res, next) => {
  const { email, carId } = req.params;
  
  try {
    const tenantId = await getTenantByUserEmail(email);
    
    const car = await Car.findOne({
      _id: carId,
      tenantId,
      isActive: true,
      status: 'active'
    }).select('addons brand model year');
    
    if (!car) {
      return next(new AppError('Car not found', 404));
    }
    
    // Filter addons to only include insurance-related ones
    const extendedInsurance = car.addons ? car.addons.filter(addon => 
      addon.isAvailable && 
      addon.name && 
      (addon.name.toLowerCase().includes('poistenie') || 
       addon.name.toLowerCase().includes('insurance'))
    ) : [];
    
    res.status(200).json({
      success: true,
      data: {
        carId: car._id,
        carInfo: {
          brand: car.brand,
          model: car.model,
          year: car.year
        },
        extendedInsurance: extendedInsurance.map(insurance => ({
          _id: insurance._id,
          name: insurance.name,
          description: insurance.description,
          price: insurance.price,
          unit: insurance.unit
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error getting car extended insurance:', error);
    return next(new AppError('Error retrieving car extended insurance', 500));
  }
});

// @desc    Get car specifications only
// @route   GET /api/public/users/:email/cars/:carId/specifications
// @access  Public
const getCarSpecificationsByUser = asyncHandler(async (req, res, next) => {
  const { email, carId } = req.params;
  
  try {
    const tenantId = await getTenantByUserEmail(email);
    
    const car = await Car.findOne({
      _id: carId,
      tenantId,
      isActive: true,
      status: 'active'
    }).select('technicalSpecs brand model year');
    
    if (!car) {
      return next(new AppError('Car not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: {
        carId: car._id,
        carInfo: {
          brand: car.brand,
          model: car.model,
          year: car.year
        },
        specifications: car.technicalSpecs || {}
      }
    });
  } catch (error) {
    console.error('❌ Error getting car specifications:', error);
    return next(new AppError('Error retrieving car specifications', 500));
  }
});

// @desc    Get car pricing only
// @route   GET /api/public/users/:email/cars/:carId/pricing
// @access  Public
const getCarPricingByUser = asyncHandler(async (req, res, next) => {
  const { email, carId } = req.params;
  
  try {
    const tenantId = await getTenantByUserEmail(email);
    
    const car = await Car.findOne({
      _id: carId,
      tenantId,
      isActive: true,
      status: 'active'
    }).select('pricing dailyRate brand model year');
    
    if (!car) {
      return next(new AppError('Car not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: {
        carId: car._id,
        carInfo: {
          brand: car.brand,
          model: car.model,
          year: car.year
        },
        pricing: car.pricing || { dailyRate: car.dailyRate || 0 }
      }
    });
  } catch (error) {
    console.error('❌ Error getting car pricing:', error);
    return next(new AppError('Error retrieving car pricing', 500));
  }
});

// @desc    Get all available car brands
// @route   GET /api/public/users/:email/cars/brands
// @access  Public
const getCarBrandsByUser = asyncHandler(async (req, res, next) => {
  const { email } = req.params;
  
  try {
    const tenantId = await getTenantByUserEmail(email);
    
    const brands = await Car.distinct('brand', {
      tenantId,
      isActive: true,
      status: 'active'
    });
    
    // Get count for each brand
    const brandCounts = await Promise.all(
      brands.map(async (brand) => {
        const count = await Car.countDocuments({
          tenantId,
          brand,
          isActive: true,
          status: 'active'
        });
        return { brand, count };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        brands: brandCounts.sort((a, b) => a.brand.localeCompare(b.brand)),
        total: brands.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting car brands:', error);
    return next(new AppError('Error retrieving car brands', 500));
  }
});

// @desc    Get cars by specific brand
// @route   GET /api/public/users/:email/cars/by-brand/:brand
// @access  Public
const getCarsByBrandByUser = asyncHandler(async (req, res, next) => {
  const { email, brand } = req.params;
  const { 
    page = 1, 
    limit = 25, 
    category, 
    fuelType, 
    transmission,
    available,
    startDate,
    endDate 
  } = req.query;
  
  try {
    const tenantId = await getTenantByUserEmail(email);
    
    let query = {
      tenantId,
      brand: new RegExp(brand, 'i'), // Case insensitive search
      isActive: true,
      status: 'active'
    };
    
    // Add additional filters
    if (category) query.category = category;
    if (fuelType) query.fuelType = fuelType;
    if (transmission) query.transmission = transmission;
    
    let cars = await Car.find(query)
      .select('_id brand model year color category fuelType transmission seats doors description pricing location features images equipment badges status')
      .sort({ model: 1, year: -1 });
    
    // Filter by availability if dates provided
    if (available === 'true' && startDate && endDate) {
      const availableCars = [];
      
      for (const car of cars) {
        const overlappingReservations = await Reservation.find({
          car: car._id,
          tenantId: car.tenantId,
          status: { $in: ['confirmed', 'ongoing'] },
          $or: [
            {
              startDate: { $lte: new Date(startDate) },
              endDate: { $gte: new Date(startDate) }
            },
            {
              startDate: { $lte: new Date(endDate) },
              endDate: { $gte: new Date(endDate) }
            },
            {
              startDate: { $gte: new Date(startDate) },
              endDate: { $lte: new Date(endDate) }
            }
          ]
        });
        
        if (overlappingReservations.length === 0) {
          availableCars.push(car);
        }
      }
      
      cars = availableCars;
    }
    
    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedCars = cars.slice(startIndex, endIndex);
    
    res.status(200).json({
      success: true,
      data: paginatedCars,
      count: paginatedCars.length,
      total: cars.length,
      brand: brand,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(cars.length / parseInt(limit)),
        hasNext: endIndex < cars.length,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Error getting cars by brand:', error);
    return next(new AppError('Error retrieving cars by brand', 500));
  }
});

// @desc    Get models for specific brand
// @route   GET /api/public/users/:email/cars/models/:brand
// @access  Public
const getCarModelsByBrandByUser = asyncHandler(async (req, res, next) => {
  const { email, brand } = req.params;
  
  try {
    const tenantId = await getTenantByUserEmail(email);
    
    const models = await Car.distinct('model', {
      tenantId,
      brand: new RegExp(brand, 'i'),
      isActive: true,
      status: 'active'
    });
    
    // Get count and year range for each model
    const modelDetails = await Promise.all(
      models.map(async (model) => {
        const cars = await Car.find({
          tenantId,
          brand: new RegExp(brand, 'i'),
          model,
          isActive: true,
          status: 'active'
        }).select('year');
        
        const years = cars.map(car => car.year).filter(year => year);
        const minYear = years.length > 0 ? Math.min(...years) : null;
        const maxYear = years.length > 0 ? Math.max(...years) : null;
        
        return {
          model,
          count: cars.length,
          yearRange: years.length > 0 ? {
            from: minYear,
            to: maxYear
          } : null
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        brand: brand,
        models: modelDetails.sort((a, b) => a.model.localeCompare(b.model)),
        total: models.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting car models:', error);
    return next(new AppError('Error retrieving car models', 500));
  }
});

// @desc    Find cars with specific equipment
// @route   GET /api/public/users/:email/cars/by-equipment/:equipmentName
// @access  Public
const getCarsByEquipmentByUser = asyncHandler(async (req, res, next) => {
  const { email, equipmentName } = req.params;
  const { 
    page = 1, 
    limit = 25, 
    category, 
    brand,
    available,
    startDate,
    endDate 
  } = req.query;
  
  try {
    const tenantId = await getTenantByUserEmail(email);
    
    let query = {
      tenantId,
      isActive: true,
      status: 'active',
      'equipment.name': new RegExp(equipmentName, 'i')
    };
    
    // Add additional filters
    if (category) query.category = category;
    if (brand) query.brand = new RegExp(brand, 'i');
    
    let cars = await Car.find(query)
      .select('_id brand model year color category fuelType transmission seats doors description pricing location features images equipment badges status')
      .sort({ 'pricing.dailyRate': 1, brand: 1, model: 1 });
    
    // Filter by availability if dates provided
    if (available === 'true' && startDate && endDate) {
      const availableCars = [];
      
      for (const car of cars) {
        const overlappingReservations = await Reservation.find({
          car: car._id,
          tenantId: car.tenantId,
          status: { $in: ['confirmed', 'ongoing'] },
          $or: [
            {
              startDate: { $lte: new Date(startDate) },
              endDate: { $gte: new Date(startDate) }
            },
            {
              startDate: { $lte: new Date(endDate) },
              endDate: { $gte: new Date(endDate) }
            },
            {
              startDate: { $gte: new Date(startDate) },
              endDate: { $lte: new Date(endDate) }
            }
          ]
        });
        
        if (overlappingReservations.length === 0) {
          availableCars.push(car);
        }
      }
      
      cars = availableCars;
    }
    
    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedCars = cars.slice(startIndex, endIndex);
    
    res.status(200).json({
      success: true,
      data: paginatedCars,
      count: paginatedCars.length,
      total: cars.length,
      equipment: equipmentName,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(cars.length / parseInt(limit)),
        hasNext: endIndex < cars.length,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Error getting cars by equipment:', error);
    return next(new AppError('Error retrieving cars by equipment', 500));
  }
});

// @desc    Advanced car search with multiple filters
// @route   GET /api/public/users/:email/cars/search
// @access  Public
const searchCarsByUser = asyncHandler(async (req, res, next) => {
  const { email } = req.params;
  const {
    // Search terms
    q, // General search query
    brand,
    model,
    
    // Filters
    category,
    fuelType,
    transmission,
    color,
    yearFrom,
    yearTo,
    priceFrom,
    priceTo,
    seats,
    doors,
    
    // Equipment and badges
    equipment, // comma-separated
    badges, // comma-separated
    
    // Availability
    available,
    startDate,
    endDate,
    
    // Sorting and pagination
    sortBy = 'dailyRate',
    sortOrder = 'asc',
    page = 1,
    limit = 25
  } = req.query;
  
  try {
    const tenantId = await getTenantByUserEmail(email);
    
    let query = {
      tenantId,
      isActive: true,
      status: 'active'
    };
    
    // General search across multiple fields
    if (q) {
      const searchRegex = new RegExp(q, 'i');
      query.$or = [
        { brand: searchRegex },
        { model: searchRegex },
        { color: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
        { 'equipment.name': searchRegex },
        { 'badges.name': searchRegex }
      ];
    }
    
    // Specific filters
    if (brand) query.brand = new RegExp(brand, 'i');
    if (model) query.model = new RegExp(model, 'i');
    if (category) {
      if (category.includes(',')) {
        query.category = { $in: category.split(',') };
      } else {
        query.category = category;
      }
    }
    if (fuelType) {
      if (fuelType.includes(',')) {
        query.fuelType = { $in: fuelType.split(',') };
      } else {
        query.fuelType = fuelType;
      }
    }
    if (transmission) query.transmission = transmission;
    if (color) {
      if (color.includes(',')) {
        query.color = { $in: color.split(',') };
      } else {
        query.color = color;
      }
    }
    
    // Year range
    if (yearFrom || yearTo) {
      query.year = {};
      if (yearFrom) query.year.$gte = parseInt(yearFrom);
      if (yearTo) query.year.$lte = parseInt(yearTo);
    }
    
    // Seats and doors
    if (seats) query.seats = { $gte: parseInt(seats) };
    if (doors) query.doors = parseInt(doors);
    
    // Equipment filter
    if (equipment) {
      const equipmentList = equipment.split(',');
      query['equipment.name'] = { $in: equipmentList.map(eq => new RegExp(eq.trim(), 'i')) };
    }
    
    // Badges filter
    if (badges) {
      const badgesList = badges.split(',');
      query['badges.name'] = { $in: badgesList.map(badge => new RegExp(badge.trim(), 'i')) };
    }
    
    let cars = await Car.find(query)
      .select('_id brand model year color category fuelType transmission seats doors description pricing location features images equipment badges status')
      .lean();
    
    // Price range filter (applied after query since pricing can be in different formats)
    if (priceFrom || priceTo) {
      cars = cars.filter(car => {
        const dailyRate = car.pricing?.dailyRate || car.dailyRate || 0;
        let matchesPrice = true;
        if (priceFrom) matchesPrice = matchesPrice && dailyRate >= parseFloat(priceFrom);
        if (priceTo) matchesPrice = matchesPrice && dailyRate <= parseFloat(priceTo);
        return matchesPrice;
      });
    }
    
    // Filter by availability if dates provided
    if (available === 'true' && startDate && endDate) {
      const availableCars = [];
      
      for (const car of cars) {
        const overlappingReservations = await Reservation.find({
          car: car._id,
          tenantId: car.tenantId,
          status: { $in: ['confirmed', 'ongoing'] },
          $or: [
            {
              startDate: { $lte: new Date(startDate) },
              endDate: { $gte: new Date(startDate) }
            },
            {
              startDate: { $lte: new Date(endDate) },
              endDate: { $gte: new Date(endDate) }
            },
            {
              startDate: { $gte: new Date(startDate) },
              endDate: { $lte: new Date(endDate) }
            }
          ]
        });
        
        if (overlappingReservations.length === 0) {
          availableCars.push(car);
        }
      }
      
      cars = availableCars;
    }
    
    // Apply sorting
    cars.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'dailyRate':
        case 'price':
          aValue = a.pricing?.dailyRate || a.dailyRate || 0;
          bValue = b.pricing?.dailyRate || b.dailyRate || 0;
          break;
        case 'year':
          aValue = a.year || 0;
          bValue = b.year || 0;
          break;
        case 'brand':
          aValue = a.brand || '';
          bValue = b.brand || '';
          break;
        case 'model':
          aValue = a.model || '';
          bValue = b.model || '';
          break;
        case 'seats':
          aValue = a.seats || 0;
          bValue = b.seats || 0;
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
      } else {
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }
    });
    
    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedCars = cars.slice(startIndex, endIndex);
    
    res.status(200).json({
      success: true,
      data: paginatedCars,
      count: paginatedCars.length,
      total: cars.length,
      searchQuery: q,
      filters: {
        brand,
        model,
        category,
        fuelType,
        transmission,
        color,
        yearFrom,
        yearTo,
        priceFrom,
        priceTo,
        equipment,
        badges,
        available,
        startDate,
        endDate
      },
      sorting: {
        sortBy,
        sortOrder
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(cars.length / parseInt(limit)),
        hasNext: endIndex < cars.length,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Error searching cars:', error);
    return next(new AppError('Error searching cars', 500));
  }
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
  verifyDiscountCodeByUser,
  getPublicCars,
  getPublicCar,
  getCarCalendarByUser,
  getReservedDatesByUser,
  getPublicCarCalendar,
  subscribeToNewsletterSimple,
  getReservationQR,
  getReservationQRByUser,
  getReservationSlovakAgreement,
  getReservationSlovakAgreementByUser,
  getPickupLocationsByUser,
  getCarEquipmentByUser,
  getCarBadgesByUser,
  getCarExtendedInsuranceByUser,
  getCarSpecificationsByUser,
  getCarPricingByUser,
  getPublicCarPricing,
  getPublicCarCategories,
  getPublicCarFilterOptions,
  getCarBrandsByUser,
  getCarsByBrandByUser,
  getCarModelsByBrandByUser,
  getCarsByEquipmentByUser,
  searchCarsByUser
}; 