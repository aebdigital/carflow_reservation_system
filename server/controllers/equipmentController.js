const Equipment = require('../models/Equipment');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get all equipment for tenant
// @route   GET /api/equipment
// @access  Private
const getEquipment = asyncHandler(async (req, res, next) => {
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
  let query = Equipment.find(JSON.parse(queryStr));

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
    query = query.sort('category name');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Equipment.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Populate references
  query = query.populate('createdBy', 'firstName lastName email')
               .populate('lastModifiedBy', 'firstName lastName email');

  // Execute query
  const equipment = await query;

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
    count: equipment.length,
    pagination,
    data: equipment
  });
});

// @desc    Get single equipment item
// @route   GET /api/equipment/:id
// @access  Private
const getEquipmentItem = asyncHandler(async (req, res, next) => {
  const equipment = await Equipment.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  }).populate('createdBy', 'firstName lastName email')
    .populate('lastModifiedBy', 'firstName lastName email');

  if (!equipment) {
    return next(new AppError(`Equipment not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: equipment
  });
});

// @desc    Create new equipment
// @route   POST /api/equipment
// @access  Private/Admin
const createEquipment = asyncHandler(async (req, res, next) => {
  // Add tenant information to equipment data
  const equipmentData = { 
    ...req.body,
    tenantId: req.user.tenantId,
    createdBy: req.user._id,
    lastModifiedBy: req.user._id
  };

  const equipment = await Equipment.create(equipmentData);

  // Populate the created equipment
  const populatedEquipment = await Equipment.findById(equipment._id)
    .populate('createdBy', 'firstName lastName email')
    .populate('lastModifiedBy', 'firstName lastName email');

  res.status(201).json({
    success: true,
    data: populatedEquipment,
    message: 'Equipment created successfully'
  });
});

// @desc    Update equipment
// @route   PUT /api/equipment/:id
// @access  Private/Admin
const updateEquipment = asyncHandler(async (req, res, next) => {
  const updateData = {
    ...req.body,
    lastModifiedBy: req.user._id
  };

  const equipment = await Equipment.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('createdBy', 'firstName lastName email')
   .populate('lastModifiedBy', 'firstName lastName email');

  if (!equipment) {
    return next(new AppError(`Equipment not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: equipment,
    message: 'Equipment updated successfully'
  });
});

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private/Admin
const deleteEquipment = asyncHandler(async (req, res, next) => {
  const equipment = await Equipment.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!equipment) {
    return next(new AppError(`Equipment not found with id of ${req.params.id}`, 404));
  }

  // Check if equipment is being used by any cars
  const Car = require('../models/Car');
  const carsUsingEquipment = await Car.find({
    tenantId: req.user.tenantId,
    'equipment._id': req.params.id
  }).countDocuments();

  if (carsUsingEquipment > 0) {
    return next(new AppError(`Cannot delete equipment. It is currently used by ${carsUsingEquipment} car(s)`, 400));
  }

  await Equipment.findOneAndDelete({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  res.status(200).json({
    success: true,
    data: {},
    message: 'Equipment deleted successfully'
  });
});

// @desc    Toggle equipment status
// @route   PATCH /api/equipment/:id/toggle
// @access  Private/Admin
const toggleEquipment = asyncHandler(async (req, res, next) => {
  const equipment = await Equipment.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!equipment) {
    return next(new AppError(`Equipment not found with id of ${req.params.id}`, 404));
  }

  const newStatus = !equipment.isActive;
  
  const updatedEquipment = await Equipment.findOneAndUpdate(
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
    data: updatedEquipment,
    message: `Equipment ${newStatus ? 'activated' : 'deactivated'} successfully`
  });
});

// @desc    Get equipment by category
// @route   GET /api/equipment/category/:category
// @access  Private
const getEquipmentByCategory = asyncHandler(async (req, res, next) => {
  const { category } = req.params;
  
  const equipment = await Equipment.find({
    tenantId: req.user.tenantId,
    category,
    isActive: true
  }).sort('name');

  res.status(200).json({
    success: true,
    count: equipment.length,
    data: equipment
  });
});

// @desc    Get standard equipment for category
// @route   GET /api/equipment/standard/:category
// @access  Private
const getStandardEquipment = asyncHandler(async (req, res, next) => {
  const { category } = req.params;
  
  const equipment = await Equipment.getStandardForCategory(req.user.tenantId, category);

  res.status(200).json({
    success: true,
    count: equipment.length,
    data: equipment
  });
});

// @desc    Get equipment statistics
// @route   GET /api/equipment/stats
// @access  Private
const getEquipmentStats = asyncHandler(async (req, res, next) => {
  const stats = await Equipment.aggregate([
    { $match: { tenantId: req.user.tenantId } },
    {
      $group: {
        _id: null,
        totalEquipment: { $sum: 1 },
        activeEquipment: { $sum: { $cond: ['$isActive', 1, 0] } },
        standardEquipment: { $sum: { $cond: ['$isStandardEquipment', 1, 0] } },
        totalUsage: { $sum: '$usageCount' }
      }
    }
  ]);

  const categoryStats = await Equipment.aggregate([
    { $match: { tenantId: req.user.tenantId, isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalUsage: { $sum: '$usageCount' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const result = stats[0] || {
    totalEquipment: 0,
    activeEquipment: 0,
    standardEquipment: 0,
    totalUsage: 0
  };

  res.status(200).json({
    success: true,
    data: {
      ...result,
      byCategory: categoryStats
    }
  });
});

module.exports = {
  getEquipment,
  getEquipmentItem,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  toggleEquipment,
  getEquipmentByCategory,
  getStandardEquipment,
  getEquipmentStats
}; 