const Banner = require('../models/Banner');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const cloudStorage = require('../services/cloudStorage');

// @desc    Get all banners (tenant-scoped)
// @route   GET /api/banners
// @access  Private/Admin
const getBanners = asyncHandler(async (req, res, next) => {
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
  let query = Banner.find(JSON.parse(queryStr));
  
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
    query = query.sort('position sortOrder -createdAt');
  }
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Banner.countDocuments(JSON.parse(queryStr));
  
  query = query.skip(startIndex).limit(limit);
  
  // Execute query
  const banners = await query.populate('createdBy', 'name email');
  
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
    count: banners.length,
    pagination,
    data: banners
  });
});

// @desc    Get single banner (tenant-scoped)
// @route   GET /api/banners/:id
// @access  Private
const getBanner = asyncHandler(async (req, res, next) => {
  const banner = await Banner.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  }).populate('createdBy', 'name email');

  if (!banner) {
    return next(new AppError(`Banner not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: banner
  });
});

// @desc    Create new banner (tenant-scoped)
// @route   POST /api/banners
// @access  Private/Admin
const createBanner = asyncHandler(async (req, res, next) => {
  try {
    console.log('🖼️ [BANNER CREATE] Starting banner creation process...');
    
    // Add tenant information and creator
    const bannerData = { 
      position: req.body.position || 'homepage-hero',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      sortOrder: parseInt(req.body.sortOrder) || 0,
      tenantId: req.user.tenantId,
      createdBy: req.user._id
    };
    
    // Handle image upload if present
    if (req.file) {
      try {
        console.log('🖼️ [BANNER CREATE] Uploading banner image...');
        const result = await cloudStorage.uploadBannerImage(
          req.file.buffer,
          req.file.originalname,
          req.user, // Pass user for tenant-specific folder
          `Banner ${bannerData.position}`
        );

        bannerData.image = {
          url: result.urls.medium,
          filename: result.filename,
          alt: `Banner image for ${bannerData.position}`,
          uploadDate: result.uploadDate
        };
        console.log('🖼️ [BANNER CREATE] Image uploaded successfully');
      } catch (error) {
        console.error('🖼️ [BANNER CREATE] Image upload failed:', error);
        return next(new AppError('Failed to upload banner image', 400));
      }
    } else {
      return next(new AppError('Banner image is required', 400));
    }
    
    console.log('🖼️ [BANNER CREATE] Creating banner...');
    const banner = await Banner.create(bannerData);
    
    console.log('🖼️ [BANNER CREATE] Banner created successfully! ID:', banner._id);
    
    // Populate created banner for response
    const populatedBanner = await Banner.findById(banner._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedBanner
    });
  } catch (error) {
    console.error('🖼️ [BANNER CREATE] Error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return next(new AppError(`${field} '${value}' already exists. Please use a different value.`, 400));
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation failed: ${errors.join(', ')}`, 400));
    }
    
    return next(new AppError('Failed to create banner. Please check your input and try again.', 400));
  }
});

// @desc    Update banner (tenant-scoped)
// @route   PUT /api/banners/:id
// @access  Private/Admin
const updateBanner = asyncHandler(async (req, res, next) => {
  try {
    console.log('🖼️ [BANNER UPDATE] Starting banner update process...');
    
    let banner = await Banner.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    });

    if (!banner) {
      return next(new AppError(`Banner not found with id of ${req.params.id}`, 404));
    }

    // Prepare update data
    const updateData = {
      position: req.body.position || banner.position,
      isActive: req.body.isActive !== undefined ? req.body.isActive : banner.isActive,
      sortOrder: req.body.sortOrder !== undefined ? parseInt(req.body.sortOrder) : banner.sortOrder,
    };
    
    // Handle image update if present
    if (req.file) {
      try {
        console.log('🖼️ [BANNER UPDATE] Uploading new banner image...');
        
        // Delete old image if exists
        if (banner.image && banner.image.filename) {
          await cloudStorage.deleteFile(banner.image.filename);
        }
        
        const result = await cloudStorage.uploadBannerImage(
          req.file.buffer,
          req.file.originalname,
          req.user,
          `Banner ${updateData.position}`
        );

        updateData.image = {
          url: result.urls.medium,
          filename: result.filename,
          alt: `Banner image for ${updateData.position}`,
          uploadDate: result.uploadDate
        };
        console.log('🖼️ [BANNER UPDATE] Image uploaded successfully');
      } catch (error) {
        console.error('🖼️ [BANNER UPDATE] Image upload failed:', error);
        return next(new AppError('Failed to upload banner image', 400));
    }
    }

    // Update banner
    banner = await Banner.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    console.log('🖼️ [BANNER UPDATE] Banner updated successfully! ID:', banner._id);

    res.status(200).json({
      success: true,
      data: banner
    });
  } catch (error) {
    console.error('🖼️ [BANNER UPDATE] Error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation failed: ${errors.join(', ')}`, 400));
    }
    
    return next(new AppError('Failed to update banner. Please check your input and try again.', 400));
  }
});

// @desc    Delete banner (tenant-scoped)
// @route   DELETE /api/banners/:id
// @access  Private/Admin
const deleteBanner = asyncHandler(async (req, res, next) => {
  console.log('🖼️ [BANNER DELETE] Starting banner deletion process...');
  
  const banner = await Banner.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!banner) {
    return next(new AppError(`Banner not found with id of ${req.params.id}`, 404));
  }

  // Delete associated image from cloud storage
  if (banner.image && banner.image.filename) {
    try {
      await cloudStorage.deleteFile(banner.image.filename);
      console.log('🖼️ [BANNER DELETE] Image deleted from cloud storage');
    } catch (error) {
      console.error('🖼️ [BANNER DELETE] Failed to delete image from cloud storage:', error);
      // Continue with banner deletion even if image deletion fails
    }
  }

  // Delete banner
  await Banner.findByIdAndDelete(req.params.id);
  console.log('🖼️ [BANNER DELETE] Banner deleted successfully! ID:', req.params.id);

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get banners by position (public)
// @route   GET /api/banners/position/:position
// @access  Public
const getBannersByPosition = asyncHandler(async (req, res, next) => {
  const { position } = req.params;
  
  // Get tenant from headers or use default
  const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
  
  if (!tenantId) {
    return next(new AppError('Tenant ID is required', 400));
  }
  
  const banners = await Banner.getActiveByPosition(tenantId, position);

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners
  });
});

// @desc    Get all active banners for tenant (public)
// @route   GET /api/banners/active
// @access  Public
const getActiveBanners = asyncHandler(async (req, res, next) => {
  // Get tenant from headers or use default
  const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
  
  if (!tenantId) {
    return next(new AppError('Tenant ID is required', 400));
  }
  
  const banners = await Banner.getActiveForTenant(tenantId);

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners
  });
});

// @desc    Update banner sort order
// @route   PUT /api/banners/sort-order
// @access  Private/Admin
const updateSortOrder = asyncHandler(async (req, res, next) => {
  const { bannerIds } = req.body;
  
  if (!Array.isArray(bannerIds)) {
    return next(new AppError('bannerIds must be an array', 400));
  }

  const updates = bannerIds.map(async (bannerId, index) => {
    return Banner.findOneAndUpdate(
      { _id: bannerId, tenantId: req.user.tenantId },
      { sortOrder: index },
      { new: true }
    );
  });

  await Promise.all(updates);

  res.status(200).json({
    success: true,
    message: 'Sort order updated successfully'
  });
});

// @desc    Get public banners (public)
// @route   GET /api/public/banners
// @access  Public
const getPublicBanners = asyncHandler(async (req, res, next) => {
  const { page, position } = req.query;
  const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
  
  if (!tenantId) {
    return next(new AppError('Tenant ID is required', 400));
  }

  let query = {
    tenantId,
    isActive: true
  };

  // Add position filter if provided
  if (position) {
    query.position = position;
  }
  
  const banners = await Banner.find(query)
    .sort({ position: 1, sortOrder: 1 })
    .populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners
  });
});

// @desc    Get public banners by user/tenant (public)
// @route   GET /api/public/users/:email/banners
// @access  Public
const getPublicBannersByUser = asyncHandler(async (req, res, next) => {
  const { email } = req.params;
  const { page, position } = req.query;
  
  // Find user to get tenant ID
  const User = require('../models/User');
  const user = await User.findOne({ email }).select('tenantId');
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  let query = {
    tenantId: user.tenantId,
    isActive: true
  };

  // Add position filter if provided
  if (position) {
    query.position = position;
  }
  
  const banners = await Banner.find(query)
    .sort({ position: 1, sortOrder: 1 })
    .populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners
  });
});

module.exports = {
  getBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
  getBannersByPosition,
  getActiveBanners,
  updateSortOrder,
  getPublicBanners,
  getPublicBannersByUser
}; 