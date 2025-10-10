const AdditionalService = require('../models/AdditionalService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const cloudStorage = require('../services/cloudStorage');

// @desc    Get all additional services (tenant-scoped)
// @route   GET /api/additional-services
// @access  Private/Admin
const getAdditionalServices = asyncHandler(async (req, res, next) => {
  console.log('🔧 [GET SERVICES] Code updated - latest version running');
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
  let query = AdditionalService.find(JSON.parse(queryStr));
  
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
    // Sort by sortOrder first, then category and name for consistent drag-and-drop
    query = query.sort('sortOrder category name');
  }
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await AdditionalService.countDocuments(JSON.parse(queryStr));
  
  query = query.skip(startIndex).limit(limit);
  
  // Execute query
  const services = await query.populate('createdBy', 'name email')
                              .populate('lastModifiedBy', 'name email');
  
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
    count: services.length,
    pagination,
    data: services
  });
});

// @desc    Get single additional service (tenant-scoped)
// @route   GET /api/additional-services/:id
// @access  Private
const getAdditionalService = asyncHandler(async (req, res, next) => {
  const service = await AdditionalService.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  }).populate('createdBy', 'name email')
   .populate('lastModifiedBy', 'name email')
   .populate('availability.excludedVehicles', 'brand model year internalId')
   .populate('behavior.dependsOn', 'name');

  if (!service) {
    return next(new AppError(`Additional service not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: service
  });
});

// @desc    Create new additional service (tenant-scoped)
// @route   POST /api/additional-services
// @access  Private/Admin
const createAdditionalService = asyncHandler(async (req, res, next) => {
  try {
    console.log('🛠️ [SERVICE CREATE] Starting service creation process...');
    
    // Add tenant information and creator
    const serviceData = { 
      ...req.body,
      tenantId: req.user.tenantId,
      createdBy: req.user._id
    };
    
    // Handle image upload if present
    if (req.file) {
      try {
        console.log('🛠️ [SERVICE CREATE] Uploading service image...');
        const result = await cloudStorage.uploadServiceImage(
          req.file.buffer,
          req.file.originalname,
          req.user, // Pass user for tenant-specific folder
          serviceData.name
        );

        serviceData.image = {
          url: result.urls.medium,
          filename: result.filename,
          uploadDate: result.uploadDate
        };
        console.log('🛠️ [SERVICE CREATE] Image uploaded successfully');
      } catch (error) {
        console.error('🛠️ [SERVICE CREATE] Image upload failed:', error);
        // Continue without image
        serviceData.image = {
          url: '/placeholder-service-image.jpg',
          filename: 'placeholder.jpg',
          uploadDate: new Date()
        };
      }
    }
    
    // Validate and clean data
    if (serviceData.availability?.vehicleCategories && !Array.isArray(serviceData.availability.vehicleCategories)) {
      serviceData.availability.vehicleCategories = [];
    }
    
    if (serviceData.availability?.excludedVehicles && !Array.isArray(serviceData.availability.excludedVehicles)) {
      serviceData.availability.excludedVehicles = [];
    }
    
    if (serviceData.behavior?.dependsOn && !Array.isArray(serviceData.behavior.dependsOn)) {
      serviceData.behavior.dependsOn = [];
    }
    
    console.log('🛠️ [SERVICE CREATE] Creating service...');
    const service = await AdditionalService.create(serviceData);
    
    console.log('🛠️ [SERVICE CREATE] Service created successfully! ID:', service._id);
    
    // Populate created service for response
    const populatedService = await AdditionalService.findById(service._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedService
    });
  } catch (error) {
    console.error('🛠️ [SERVICE CREATE] Error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return next(new AppError(`${field} '${value}' already exists. Please use a different value.`, 400));
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation failed: ${errors.join(', ')}`, 400));
    }
    
    return next(new AppError('Failed to create additional service. Please check your input and try again.', 400));
  }
});

// @desc    Update additional service (tenant-scoped)
// @route   PUT /api/additional-services/:id
// @access  Private/Admin
const updateAdditionalService = asyncHandler(async (req, res, next) => {
  try {
    console.log('🛠️ [SERVICE UPDATE] Starting service update process...');
    
    let service = await AdditionalService.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    });

    if (!service) {
      return next(new AppError(`Additional service not found with id of ${req.params.id}`, 404));
    }

    // Add last modified info
    req.body.lastModifiedBy = req.user._id;
    
    // Handle image upload if present
    if (req.file) {
      try {
        console.log('🛠️ [SERVICE UPDATE] Uploading new service image...');
        
        // Delete old image if exists
        if (service.image?.filename && service.image.filename !== 'placeholder.jpg') {
          try {
            await cloudStorage.deleteServiceImage(service.image.filename, req.user);
          } catch (error) {
            console.error('🛠️ [SERVICE UPDATE] Failed to delete old image:', error);
          }
        }
        
        const result = await cloudStorage.uploadServiceImage(
          req.file.buffer,
          req.file.originalname,
          req.user,
          req.body.name || service.name
        );

        req.body.image = {
          url: result.urls.medium,
          filename: result.filename,
          uploadDate: result.uploadDate
        };
        console.log('🛠️ [SERVICE UPDATE] New image uploaded successfully');
      } catch (error) {
        console.error('🛠️ [SERVICE UPDATE] Image upload failed:', error);
        // Continue without updating image
      }
    }
    
    // Validate and clean data
    if (req.body.availability?.vehicleCategories && !Array.isArray(req.body.availability.vehicleCategories)) {
      req.body.availability.vehicleCategories = [];
    }
    
    if (req.body.availability?.excludedVehicles && !Array.isArray(req.body.availability.excludedVehicles)) {
      req.body.availability.excludedVehicles = [];
    }
    
    if (req.body.behavior?.dependsOn && !Array.isArray(req.body.behavior.dependsOn)) {
      req.body.behavior.dependsOn = [];
    }
    
    console.log('🛠️ [SERVICE UPDATE] Updating service...');
    service = await AdditionalService.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('createdBy', 'name email')
     .populate('lastModifiedBy', 'name email');

    console.log('🛠️ [SERVICE UPDATE] Service updated successfully! ID:', service._id);

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('🛠️ [SERVICE UPDATE] Error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return next(new AppError(`${field} '${value}' already exists. Please use a different value.`, 400));
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation failed: ${errors.join(', ')}`, 400));
    }
    
    return next(new AppError('Failed to update additional service. Please check your input and try again.', 400));
  }
});

// @desc    Delete additional service (tenant-scoped)
// @route   DELETE /api/additional-services/:id
// @access  Private/Admin
const deleteAdditionalService = asyncHandler(async (req, res, next) => {
  const service = await AdditionalService.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!service) {
    return next(new AppError(`Additional service not found with id of ${req.params.id}`, 404));
  }

  // Delete associated image from storage
  if (service.image?.filename && service.image.filename !== 'placeholder.jpg') {
    try {
      await cloudStorage.deleteServiceImage(service.image.filename, req.user);
    } catch (error) {
      console.error('Failed to delete service image from cloud storage:', error);
    }
  }

  await AdditionalService.findOneAndDelete({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get services by category (tenant-scoped)
// @route   GET /api/additional-services/category/:category
// @access  Private
const getServicesByCategory = asyncHandler(async (req, res, next) => {
  const services = await AdditionalService.getByCategory(req.user.tenantId, req.params.category);

  res.status(200).json({
    success: true,
    count: services.length,
    data: services
  });
});

// @desc    Get public services for "Naše služby" section
// @route   GET /api/additional-services/public
// @access  Public
const getPublicServices = asyncHandler(async (req, res, next) => {
  // For public route, we need tenant ID from query or subdomain
  let tenantId = req.query.tenantId;
  
  if (!tenantId && req.user) {
    tenantId = req.user.tenantId;
  }
  
  // For tenant-specific endpoints, get tenantId from email parameter
  if (!tenantId && req.params.email) {
    const User = require('../models/User');
    const user = await User.findOne({ email: req.params.email });
    if (user) {
      tenantId = user.tenantId;
    }
  }
  
  if (!tenantId) {
    return next(new AppError('Tenant ID is required for public services', 400));
  }
  
  const services = await AdditionalService.getPublicServices(tenantId);

  res.status(200).json({
    success: true,
    count: services.length,
    data: services
  });
});

// @desc    Get services available for specific vehicle (public)
// @route   GET /api/public/services/vehicle/:vehicleId
// @access  Public
const getServicesForVehiclePublic = asyncHandler(async (req, res, next) => {
  const Car = require('../models/Car');
  
  // Get tenantId from email parameter for tenant-specific routes
  let tenantId = req.query.tenantId;
  
  if (!tenantId && req.params.email) {
    const User = require('../models/User');
    const user = await User.findOne({ email: req.params.email });
    if (user) {
      tenantId = user.tenantId;
    }
  }
  
  if (!tenantId) {
    return next(new AppError('Tenant ID is required for public services', 400));
  }
  
  const vehicle = await Car.findOne({ 
    _id: req.params.vehicleId, 
    tenantId: tenantId 
  });

  if (!vehicle) {
    return next(new AppError(`Vehicle not found with id of ${req.params.vehicleId}`, 404));
  }

  const allServices = await AdditionalService.find({ 
    tenantId: tenantId, 
    isActive: true 
  }).sort('sortOrder category name');

  // Filter services available for this vehicle
  const availableServices = allServices.filter(service => 
    service.isAvailableForVehicle(vehicle)
  );

  res.status(200).json({
    success: true,
    count: availableServices.length,
    vehicle: {
      id: vehicle._id,
      brand: vehicle.brand,
      model: vehicle.model,
      category: vehicle.category
    },
    data: availableServices
  });
});

// @desc    Get services available for specific vehicle
// @route   GET /api/additional-services/vehicle/:vehicleId
// @access  Private
const getServicesForVehicle = asyncHandler(async (req, res, next) => {
  const Car = require('../models/Car');
  
  // Check if this is a public route (no user) or private route (with user)
  let tenantId = req.user ? req.user.tenantId : null;
  
  // For public routes, get tenantId from email parameter
  if (!tenantId && req.params.email) {
    const User = require('../models/User');
    const user = await User.findOne({ email: req.params.email });
    if (user) {
      tenantId = user.tenantId;
    }
  }
  
  // For public routes, get tenantId from query parameter
  if (!tenantId && req.query.tenantId) {
    tenantId = req.query.tenantId;
  }
  
  if (!tenantId) {
    return next(new AppError('Authentication required or tenant ID must be provided', 401));
  }
  
  const vehicle = await Car.findOne({ 
    _id: req.params.vehicleId, 
    tenantId: tenantId 
  });

  if (!vehicle) {
    return next(new AppError(`Vehicle not found with id of ${req.params.vehicleId}`, 404));
  }

  const allServices = await AdditionalService.find({ 
    tenantId: tenantId, 
    isActive: true 
  }).sort('sortOrder category name');

  // Filter services available for this vehicle
  const availableServices = allServices.filter(service => 
    service.isAvailableForVehicle(vehicle)
  );

  res.status(200).json({
    success: true,
    count: availableServices.length,
    vehicle: {
      id: vehicle._id,
      brand: vehicle.brand,
      model: vehicle.model,
      category: vehicle.category
    },
    data: availableServices
  });
});

// @desc    Calculate service price (public)
// @route   POST /api/public/services/calculate-price
// @access  Public
const calculateServicePricePublic = asyncHandler(async (req, res, next) => {
  const { serviceId, quantity, days, distance, basePrice } = req.body;
  
  if (!serviceId) {
    return next(new AppError('Service ID is required', 400));
  }
  
  // Get tenantId from email parameter for tenant-specific routes
  let tenantId = req.query.tenantId;
  
  if (!tenantId && req.params.email) {
    const User = require('../models/User');
    const user = await User.findOne({ email: req.params.email });
    if (user) {
      tenantId = user.tenantId;
    }
  }
  
  if (!tenantId) {
    return next(new AppError('Tenant ID is required for public services', 400));
  }
  
  const service = await AdditionalService.findOne({ 
    _id: serviceId, 
    tenantId: tenantId 
  });

  if (!service) {
    return next(new AppError(`Additional service not found with id of ${serviceId}`, 404));
  }

  const calculatedPrice = service.calculatePrice({ quantity, days, distance, basePrice });

  res.status(200).json({
    success: true,
    data: {
      serviceId: service._id,
      serviceName: service.name,
      parameters: { quantity, days, distance, basePrice },
      calculatedPrice,
      currency: service.pricing.currency
    }
  });
});

// @desc    Calculate service price
// @route   POST /api/additional-services/:id/calculate-price
// @access  Private
const calculateServicePrice = asyncHandler(async (req, res, next) => {
  const { serviceId, quantity, days, distance, basePrice } = req.body;
  
  // Handle both old format (serviceId from URL) and new format (serviceId from body)
  const actualServiceId = req.params.id || serviceId;
  
  if (!actualServiceId) {
    return next(new AppError('Service ID is required', 400));
  }
  
  // Check if this is a public route (no user) or private route (with user)
  let tenantId = req.user ? req.user.tenantId : null;
  
  // For public routes, get tenantId from email parameter
  if (!tenantId && req.params.email) {
    const User = require('../models/User');
    const user = await User.findOne({ email: req.params.email });
    if (user) {
      tenantId = user.tenantId;
    }
  }
  
  // For public routes, get tenantId from query parameter
  if (!tenantId && req.query.tenantId) {
    tenantId = req.query.tenantId;
  }
  
  if (!tenantId) {
    return next(new AppError('Authentication required or tenant ID must be provided', 401));
  }
  
  const service = await AdditionalService.findOne({ 
    _id: actualServiceId, 
    tenantId: tenantId 
  });

  if (!service) {
    return next(new AppError(`Additional service not found with id of ${actualServiceId}`, 404));
  }

  const calculatedPrice = service.calculatePrice({ quantity, days, distance, basePrice });

  res.status(200).json({
    success: true,
    data: {
      serviceId: service._id,
      serviceName: service.name,
      parameters: { quantity, days, distance, basePrice },
      calculatedPrice,
      currency: service.pricing.currency
    }
  });
});

// @desc    Bulk update service sort order
// @route   PUT /api/additional-services/sort-order
// @access  Private/Admin
const updateSortOrder = asyncHandler(async (req, res, next) => {
  console.log('🔧 [SORT ORDER] Route hit! Method:', req.method, 'URL:', req.url);
  console.log('🔧 [SORT ORDER] Raw body:', req.body);
  console.log('🔧 [SORT ORDER] Content-Type:', req.headers['content-type']);
  
  const { services } = req.body; // Array of { id, sortOrder }
  
  console.log('🔧 [SORT ORDER] Received update request:', services);
  
  if (!Array.isArray(services)) {
    return next(new AppError('Services array is required', 400));
  }

  if (services.length === 0) {
    return next(new AppError('Services array cannot be empty', 400));
  }

  // Validate that all entries have required fields
  const invalidServices = services.filter(s => !s.id || s.sortOrder === undefined);
  if (invalidServices.length > 0) {
    console.error('🔧 [SORT ORDER] Invalid services:', invalidServices);
    return next(new AppError('All services must have id and sortOrder', 400));
  }

  try {
    // First, verify all services exist and belong to the tenant
    const serviceIds = services.map(s => s.id);
    const existingServices = await AdditionalService.find({
      _id: { $in: serviceIds },
      tenantId: req.user.tenantId
    });

    console.log(`🔧 [SORT ORDER] Found ${existingServices.length} existing services out of ${serviceIds.length} requested`);
    
    if (existingServices.length !== serviceIds.length) {
      const foundIds = existingServices.map(s => s._id.toString());
      const missingIds = serviceIds.filter(id => !foundIds.includes(id));
      console.error('🔧 [SORT ORDER] Missing services for tenant:', missingIds);
      return next(new AppError(`Services not found or not accessible: ${missingIds.join(', ')}`, 404));
    }

    const updatePromises = services.map(({ id, sortOrder }) => {
      console.log(`🔧 [SORT ORDER] Updating service ${id} to sortOrder ${sortOrder}`);
      return AdditionalService.findOneAndUpdate(
        { _id: id, tenantId: req.user.tenantId },
        { sortOrder: parseInt(sortOrder), lastModifiedBy: req.user._id },
        { new: true, runValidators: true }
      );
    });

    const updatedServices = await Promise.all(updatePromises);
    const validUpdatedServices = updatedServices.filter(service => service !== null);
    
    console.log(`🔧 [SORT ORDER] Successfully updated ${validUpdatedServices.length} services`);

    // Log the final sort orders
    validUpdatedServices.forEach(service => {
      console.log(`🔧 [SORT ORDER] Service "${service.name}" now has sortOrder: ${service.sortOrder}`);
    });

    res.status(200).json({
      success: true,
      data: validUpdatedServices,
      message: `Successfully updated sort order for ${validUpdatedServices.length} services`
    });
  } catch (error) {
    console.error('🔧 [SORT ORDER] Error updating sort order:', error);
    return next(new AppError('Failed to update sort order', 500));
  }
});

// @desc    Update additional service English translations
// @route   PUT /api/additional-services/:id/english
// @access  Private/Admin
const updateAdditionalServiceEnglish = asyncHandler(async (req, res, next) => {
  const { nameEn, descriptionEn } = req.body;

  const service = await AdditionalService.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });

  if (!service) {
    return next(new AppError(`Additional service not found with id of ${req.params.id}`, 404));
  }

  // Update English fields
  const updateData = {
    lastModifiedBy: req.user._id
  };

  if (nameEn !== undefined) updateData.nameEn = nameEn;
  if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;

  const updatedService = await AdditionalService.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('createdBy', 'name email')
   .populate('lastModifiedBy', 'name email');

  res.status(200).json({
    success: true,
    data: updatedService,
    message: 'Additional service English translations updated successfully'
  });
});

module.exports = {
  getAdditionalServices,
  getAdditionalService,
  createAdditionalService,
  updateAdditionalService,
  deleteAdditionalService,
  getServicesByCategory,
  getPublicServices,
  getServicesForVehicle,
  getServicesForVehiclePublic,
  calculateServicePrice,
  calculateServicePricePublic,
  updateSortOrder,
  updateAdditionalServiceEnglish
}; 