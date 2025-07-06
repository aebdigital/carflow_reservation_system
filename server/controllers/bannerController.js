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
    query = query.sort('placement.priority -sortOrder -createdAt');
  }
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Banner.countDocuments(JSON.parse(queryStr));
  
  query = query.skip(startIndex).limit(limit);
  
  // Execute query
  const banners = await query.populate('createdBy', 'name email')
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
  }).populate('createdBy', 'name email')
   .populate('lastModifiedBy', 'name email');

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
      ...req.body,
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
          bannerData.title
        );

        bannerData.image = {
          url: result.urls.medium,
          filename: result.filename,
          alt: bannerData.title,
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
    
    // Parse nested objects if they come as JSON strings
    if (typeof bannerData.link === 'string') {
      bannerData.link = JSON.parse(bannerData.link);
    }
    if (typeof bannerData.carousel === 'string') {
      bannerData.carousel = JSON.parse(bannerData.carousel);
    }
    if (typeof bannerData.placement === 'string') {
      bannerData.placement = JSON.parse(bannerData.placement);
    }
    if (typeof bannerData.styling === 'string') {
      bannerData.styling = JSON.parse(bannerData.styling);
    }
    if (typeof bannerData.schedule === 'string') {
      bannerData.schedule = JSON.parse(bannerData.schedule);
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

    // Add last modified info
    req.body.lastModifiedBy = req.user._id;
    
    // Handle image upload if present
    if (req.file) {
      try {
        console.log('🖼️ [BANNER UPDATE] Uploading new banner image...');
        
        // Delete old image if exists
        if (banner.image?.filename && banner.image.filename !== 'placeholder.jpg') {
          try {
            await cloudStorage.deleteBannerImage(banner.image.filename, req.user);
          } catch (error) {
            console.error('🖼️ [BANNER UPDATE] Failed to delete old image:', error);
          }
        }
        
        const result = await cloudStorage.uploadBannerImage(
          req.file.buffer,
          req.file.originalname,
          req.user,
          req.body.title || banner.title
        );

        req.body.image = {
          url: result.urls.medium,
          filename: result.filename,
          alt: req.body.title || banner.title,
          uploadDate: result.uploadDate
        };
        console.log('🖼️ [BANNER UPDATE] New image uploaded successfully');
      } catch (error) {
        console.error('🖼️ [BANNER UPDATE] Image upload failed:', error);
        // Continue without updating image
      }
    }
    
    // Parse nested objects if they come as JSON strings
    if (typeof req.body.link === 'string') {
      req.body.link = JSON.parse(req.body.link);
    }
    if (typeof req.body.carousel === 'string') {
      req.body.carousel = JSON.parse(req.body.carousel);
    }
    if (typeof req.body.placement === 'string') {
      req.body.placement = JSON.parse(req.body.placement);
    }
    if (typeof req.body.styling === 'string') {
      req.body.styling = JSON.parse(req.body.styling);
    }
    if (typeof req.body.schedule === 'string') {
      req.body.schedule = JSON.parse(req.body.schedule);
    }
    
    console.log('🖼️ [BANNER UPDATE] Updating banner...');
    banner = await Banner.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('createdBy', 'name email')
     .populate('lastModifiedBy', 'name email');

    console.log('🖼️ [BANNER UPDATE] Banner updated successfully! ID:', banner._id);

    res.status(200).json({
      success: true,
      data: banner
    });
  } catch (error) {
    console.error('🖼️ [BANNER UPDATE] Error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return next(new AppError(`${field} '${value}' already exists. Please use a different value.`, 400));
    }
    
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
  const banner = await Banner.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!banner) {
    return next(new AppError(`Banner not found with id of ${req.params.id}`, 404));
  }

  // Delete associated image from storage
  if (banner.image?.filename && banner.image.filename !== 'placeholder.jpg') {
    try {
      await cloudStorage.deleteBannerImage(banner.image.filename, req.user);
    } catch (error) {
      console.error('Failed to delete banner image from cloud storage:', error);
    }
  }

  await Banner.findOneAndDelete({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get banners by page (tenant-scoped)
// @route   GET /api/banners/page/:page
// @access  Private
const getBannersByPage = asyncHandler(async (req, res, next) => {
  const { page } = req.params;
  const { position } = req.query;
  
  const banners = await Banner.getActiveBanners(req.user.tenantId, page, position);

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners
  });
});

// @desc    Get carousel banners (tenant-scoped)
// @route   GET /api/banners/carousel/:page
// @access  Private
const getCarouselBanners = asyncHandler(async (req, res, next) => {
  const { page } = req.params;
  
  const banners = await Banner.getCarouselBanners(req.user.tenantId, page);

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners
  });
});

// @desc    Get public banners for website embedding
// @route   GET /api/public/banners
// @access  Public
const getPublicBanners = asyncHandler(async (req, res, next) => {
  const { tenantId, page = 'homepage', position } = req.query;
  
  if (!tenantId) {
    return next(new AppError('Tenant ID is required for public banners', 400));
  }
  
  const banners = await Banner.getActiveBanners(tenantId, page, position);

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners.map(banner => ({
      _id: banner._id,
      title: banner.title,
      description: banner.description,
      image: banner.image,
      link: banner.link,
      carousel: banner.carousel,
      placement: banner.placement,
      styling: banner.styling,
      isCurrentlyActive: banner.isCurrentlyActive,
      imageUrls: banner.imageUrls
    }))
  });
});

// @desc    Get public banners by user/tenant
// @route   GET /api/public/users/:email/banners
// @access  Public
const getPublicBannersByUser = asyncHandler(async (req, res, next) => {
  const { email } = req.params;
  const { page = 'homepage', position } = req.query;
  
  // Get tenant ID from user email
  const User = require('../models/User');
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return next(new AppError(`User not found with email: ${email}`, 404));
  }
  
  const banners = await Banner.getActiveBanners(user.tenantId, page, position);

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners.map(banner => ({
      _id: banner._id,
      title: banner.title,
      description: banner.description,
      image: banner.image,
      link: banner.link,
      carousel: banner.carousel,
      placement: banner.placement,
      styling: banner.styling,
      isCurrentlyActive: banner.isCurrentlyActive,
      imageUrls: banner.imageUrls
    }))
  });
});

// @desc    Bulk update banner sort order
// @route   PUT /api/banners/sort-order
// @access  Private/Admin
const updateSortOrder = asyncHandler(async (req, res, next) => {
  const { banners } = req.body; // Array of { id, sortOrder }
  
  if (!Array.isArray(banners)) {
    return next(new AppError('Banners array is required', 400));
  }

  const updatePromises = banners.map(({ id, sortOrder }) =>
    Banner.findOneAndUpdate(
      { _id: id, tenantId: req.user.tenantId },
      { sortOrder, lastModifiedBy: req.user._id },
      { new: true }
    )
  );

  const updatedBanners = await Promise.all(updatePromises);

  res.status(200).json({
    success: true,
    data: updatedBanners.filter(banner => banner !== null)
  });
});

module.exports = {
  getBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
  getBannersByPage,
  getCarouselBanners,
  getPublicBanners,
  getPublicBannersByUser,
  updateSortOrder
}; 