const { DiscountCode } = require('../models/WebsiteSettings');
const Car = require('../models/Car');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get all discount codes for tenant
// @route   GET /api/discount-codes
// @access  Private
const getDiscountCodes = asyncHandler(async (req, res, next) => {
  // Start with tenant filter
  const baseQuery = { tenantId: req.user.tenantId };

  // Copy req.query and merge with tenant filter
  const reqQuery = { ...req.query };

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify({ ...baseQuery, ...reqQuery });

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource with tenant filter
  let query = DiscountCode.find(JSON.parse(queryStr));

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
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
  const total = await DiscountCode.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Populate references
  query = query.populate('createdBy', 'firstName lastName email')
               .populate('lastModifiedBy', 'firstName lastName email');

  // Execute query
  const discountCodes = await query;

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
    count: discountCodes.length,
    pagination,
    data: discountCodes
  });
});

// @desc    Get single discount code
// @route   GET /api/discount-codes/:id
// @access  Private
const getDiscountCode = asyncHandler(async (req, res, next) => {
  const discountCode = await DiscountCode.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  }).populate('createdBy', 'firstName lastName email')
    .populate('lastModifiedBy', 'firstName lastName email')
    .populate('usedBy.customer', 'firstName lastName email')
    .populate('usedBy.reservation', 'reservationNumber totalAmount');

  if (!discountCode) {
    return next(new AppError(`Discount code not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: discountCode
  });
});

// @desc    Create new discount code
// @route   POST /api/discount-codes
// @access  Private/Admin
const createDiscountCode = asyncHandler(async (req, res, next) => {
  // Add tenant information to discount code data
  const discountCodeData = { 
    ...req.body,
    tenantId: req.user.tenantId,
    createdBy: req.user._id,
    lastModifiedBy: req.user._id
  };

  // Validate end date is after start date if both provided
  if (discountCodeData.startDate && discountCodeData.endDate) {
    const start = new Date(discountCodeData.startDate);
    const end = new Date(discountCodeData.endDate);
    
    if (end <= start) {
      return next(new AppError('End date must be after start date', 400));
    }
  }

  // Validate minimum value requirements
  if (discountCodeData.hasMinimumValue && !discountCodeData.minimumValue) {
    return next(new AppError('Minimum value is required when minimum value restriction is enabled', 400));
  }

  // Validate usage limit requirements
  if (discountCodeData.usageLimit === 'limited' && !discountCodeData.maxUsageCount) {
    return next(new AppError('Maximum usage count is required when usage limit is set to limited', 400));
  }

  const discountCode = await DiscountCode.create(discountCodeData);

  // Populate the created discount code
  const populatedDiscountCode = await DiscountCode.findById(discountCode._id)
    .populate('createdBy', 'firstName lastName email')
    .populate('lastModifiedBy', 'firstName lastName email');

  res.status(201).json({
    success: true,
    data: populatedDiscountCode,
    message: 'Discount code created successfully'
  });
});

// @desc    Update discount code
// @route   PUT /api/discount-codes/:id
// @access  Private/Admin
const updateDiscountCode = asyncHandler(async (req, res, next) => {
  const updateData = {
    ...req.body,
    lastModifiedBy: req.user._id
  };

  // Validate end date is after start date if both provided
  if (updateData.startDate && updateData.endDate) {
    const start = new Date(updateData.startDate);
    const end = new Date(updateData.endDate);
    
    if (end <= start) {
      return next(new AppError('End date must be after start date', 400));
    }
  }

  // Validate minimum value requirements
  if (updateData.hasMinimumValue && !updateData.minimumValue) {
    return next(new AppError('Minimum value is required when minimum value restriction is enabled', 400));
  }

  // Validate usage limit requirements
  if (updateData.usageLimit === 'limited' && !updateData.maxUsageCount) {
    return next(new AppError('Maximum usage count is required when usage limit is set to limited', 400));
  }

  const discountCode = await DiscountCode.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('createdBy', 'firstName lastName email')
   .populate('lastModifiedBy', 'firstName lastName email');

  if (!discountCode) {
    return next(new AppError(`Discount code not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: discountCode,
    message: 'Discount code updated successfully'
  });
});

// @desc    Delete discount code
// @route   DELETE /api/discount-codes/:id
// @access  Private/Admin
const deleteDiscountCode = asyncHandler(async (req, res, next) => {
  const discountCode = await DiscountCode.findOneAndDelete({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!discountCode) {
    return next(new AppError(`Discount code not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {},
    message: 'Discount code deleted successfully'
  });
});

// @desc    Toggle discount code status
// @route   PATCH /api/discount-codes/:id/toggle
// @access  Private/Admin
const toggleDiscountCode = asyncHandler(async (req, res, next) => {
  const discountCode = await DiscountCode.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!discountCode) {
    return next(new AppError(`Discount code not found with id of ${req.params.id}`, 404));
  }

  const newStatus = !discountCode.isActive;
  
  const updatedDiscountCode = await DiscountCode.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { 
      isActive: newStatus,
      lastModifiedBy: req.user._id
    },
    { new: true }
  ).populate('createdBy', 'firstName lastName email')
   .populate('lastModifiedBy', 'firstName lastName email');

  res.status(200).json({
    success: true,
    data: updatedDiscountCode,
    message: `Discount code ${newStatus ? 'activated' : 'deactivated'} successfully`
  });
});

// @desc    Validate discount code (for reservation use)
// @route   POST /api/discount-codes/validate
// @access  Public (used in reservation process)
const validateDiscountCode = asyncHandler(async (req, res, next) => {
  const { code, reservationAmount, reservationDays, carCategory, customerId, carId } = req.body;

  if (!code) {
    return next(new AppError('Discount code is required', 400));
  }

  // Find the car to get tenant information
  const car = await Car.findById(carId);
  if (!car) {
    return next(new AppError('Car not found', 404));
  }

  // Find the discount code for the car's tenant
  const discountCode = await DiscountCode.findOne({ 
    code: code.toUpperCase(),
    tenantId: car.tenantId
  });

  if (!discountCode) {
    return res.status(200).json({
      success: false,
      valid: false,
      reason: 'Invalid discount code'
    });
  }

  // Check if code is valid
  if (!discountCode.isValid()) {
    return res.status(200).json({
      success: false,
      valid: false,
      reason: 'Discount code has expired or is not active'
    });
  }

  // Check if customer can use this code
  const customer = { _id: customerId };
  const canUse = discountCode.canBeUsedBy(customer);
  
  if (!canUse.valid) {
    return res.status(200).json({
      success: false,
      valid: false,
      reason: canUse.reason
    });
  }

  // Calculate discount
  const discountResult = discountCode.calculateDiscount(
    reservationAmount, 
    reservationDays, 
    carCategory
  );

  if (discountResult.reason) {
    return res.status(200).json({
      success: false,
      valid: false,
      reason: discountResult.reason
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
      finalAmount: reservationAmount - discountResult.discount
    }
  });
});

// @desc    Get discount code stats
// @route   GET /api/discount-codes/stats
// @access  Private
const getDiscountCodeStats = asyncHandler(async (req, res, next) => {
  const stats = await DiscountCode.aggregate([
    { $match: { tenantId: req.user.tenantId } },
    {
      $group: {
        _id: null,
        totalCodes: { $sum: 1 },
        activeCodes: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalUsage: { $sum: '$currentUsageCount' },
        totalDiscountGiven: { 
          $sum: { 
            $reduce: {
              input: '$usedBy',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.discountApplied'] }
            }
          }
        }
      }
    }
  ]);

  const result = stats[0] || {
    totalCodes: 0,
    activeCodes: 0,
    totalUsage: 0,
    totalDiscountGiven: 0
  };

  // Get most used codes
  const mostUsedCodes = await DiscountCode.find({ tenantId: req.user.tenantId })
    .sort({ currentUsageCount: -1 })
    .limit(5)
    .select('code description currentUsageCount discountType discountValue');

  res.status(200).json({
    success: true,
    data: {
      ...result,
      mostUsedCodes
    }
  });
});

module.exports = {
  getDiscountCodes,
  getDiscountCode,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  toggleDiscountCode,
  validateDiscountCode,
  getDiscountCodeStats
}; 