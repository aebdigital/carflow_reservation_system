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
    console.log('🖼️ [BANNER CREATE] Files received:', req.files ? req.files.length : 0);
    console.log('🖼️ [BANNER CREATE] Body:', req.body);
    
    // Validate that at least one image is provided
    if (!req.files || req.files.length === 0) {
      return next(new AppError('At least one banner image is required', 400));
    }
    
    // Validate maximum 6 images
    if (req.files.length > 6) {
      return next(new AppError('Maximum 6 images allowed per banner', 400));
    }
    
    // Add tenant information and creator
    const bannerData = { 
      position: req.body.position || 'hero-section',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      sortOrder: parseInt(req.body.sortOrder) || 0,
      tenantId: req.user.tenantId,
      createdBy: req.user._id,
      images: []
    };
    
    // Handle multiple image uploads
    console.log('🖼️ [BANNER CREATE] Processing multiple images...');
    const imageUploadPromises = req.files.map(async (file, index) => {
      try {
        console.log(`🖼️ [BANNER CREATE] Uploading image ${index + 1}/${req.files.length}...`);
        
        // Get custom title and description from request body if provided
        const titles = req.body.titles ? (Array.isArray(req.body.titles) ? req.body.titles : [req.body.titles]) : [];
        const descriptions = req.body.descriptions ? (Array.isArray(req.body.descriptions) ? req.body.descriptions : [req.body.descriptions]) : [];
        
        const result = await cloudStorage.uploadBannerImage(
          file.buffer,
          file.originalname,
          req.user,
          `Banner ${bannerData.position} - Image ${index + 1}`
        );

        return {
          url: result.urls.large, // Changed from medium to large for better quality
          filename: result.filename,
          alt: `Banner image ${index + 1} for ${bannerData.position}`,
          title: titles[index] || '',
          description: descriptions[index] || '',
          sortOrder: index,
          uploadDate: result.uploadDate
        };
      } catch (error) {
        console.error(`🖼️ [BANNER CREATE] Failed to upload image ${index + 1}:`, error);
        throw error;
      }
    });
    
    try {
      bannerData.images = await Promise.all(imageUploadPromises);
      console.log('🖼️ [BANNER CREATE] All images uploaded successfully');
    } catch (error) {
      console.error('🖼️ [BANNER CREATE] Image upload failed:', error);
      return next(new AppError('Failed to upload banner images', 400));
    }

    // Create banner with multiple images
    const banner = await Banner.create(bannerData);
    
    const populatedBanner = await Banner.findById(banner._id).populate('createdBy', 'firstName lastName email');

    console.log('🖼️ [BANNER CREATE] Banner created successfully with', bannerData.images.length, 'images');

    res.status(201).json({
      success: true,
      data: populatedBanner,
      message: `Banner created successfully with ${bannerData.images.length} image(s)`
    });
  } catch (error) {
    console.error('🖼️ [BANNER CREATE] Error:', error);
    return next(new AppError(error.message || 'Failed to create banner', 400));
  }
});

// @desc    Update banner (tenant-scoped)
// @route   PUT /api/banners/:id
// @access  Private/Admin
const updateBanner = asyncHandler(async (req, res, next) => {
  try {
    console.log('🖼️ [BANNER UPDATE] Starting banner update process...');
    console.log('🖼️ [BANNER UPDATE] Files received:', req.files ? req.files.length : 0);
    
    let banner = await Banner.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    });

    if (!banner) {
      return next(new AppError(`Banner not found with id of ${req.params.id}`, 404));
    }

    // Prepare update data (non-image fields)
    const updateData = {
      position: req.body.position || banner.position,
      isActive: req.body.isActive !== undefined ? req.body.isActive : banner.isActive,
      sortOrder: req.body.sortOrder !== undefined ? parseInt(req.body.sortOrder) : banner.sortOrder,
    };
    
    // Handle new image uploads if present
    if (req.files && req.files.length > 0) {
      console.log('🖼️ [BANNER UPDATE] Adding new images...');
      
      // Check if adding new images would exceed the 6 image limit
      const currentImageCount = banner.images ? banner.images.length : 0;
      if (currentImageCount + req.files.length > 6) {
        return next(new AppError(`Cannot add ${req.files.length} images. Maximum 6 images per banner. Current: ${currentImageCount}`, 400));
      }
      
      // Upload new images
      const newImagePromises = req.files.map(async (file, index) => {
        try {
          console.log(`🖼️ [BANNER UPDATE] Uploading new image ${index + 1}/${req.files.length}...`);
          
          const result = await cloudStorage.uploadBannerImage(
            file.buffer,
            file.originalname,
            req.user,
            `Banner ${updateData.position} - Image ${currentImageCount + index + 1}`
          );

          return {
            url: result.urls.large, // Changed from medium to large for better quality
            filename: result.filename,
            alt: `Banner image ${currentImageCount + index + 1} for ${updateData.position}`,
            title: '',
            description: '',
            sortOrder: currentImageCount + index,
            uploadDate: result.uploadDate
          };
        } catch (error) {
          console.error(`🖼️ [BANNER UPDATE] Failed to upload new image ${index + 1}:`, error);
          throw error;
        }
      });
      
      try {
        const newImages = await Promise.all(newImagePromises);
        updateData.images = [...(banner.images || []), ...newImages];
        console.log('🖼️ [BANNER UPDATE] New images uploaded successfully');
      } catch (error) {
        console.error('🖼️ [BANNER UPDATE] New image upload failed:', error);
        return next(new AppError('Failed to upload new banner images', 400));
      }
    }

    // Update banner
    banner = await Banner.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    console.log('🖼️ [BANNER UPDATE] Banner updated successfully');

    res.status(200).json({
      success: true,
      data: banner,
      message: 'Banner updated successfully'
    });
  } catch (error) {
    console.error('🖼️ [BANNER UPDATE] Error:', error);
    return next(new AppError(error.message || 'Failed to update banner', 400));
  }
});

// @desc    Add images to existing banner
// @route   POST /api/banners/:id/images
// @access  Private/Admin
const addBannerImages = asyncHandler(async (req, res, next) => {
  try {
    console.log('🖼️ [BANNER ADD IMAGES] Starting image addition process...');
    
    const banner = await Banner.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    });

    if (!banner) {
      return next(new AppError(`Banner not found with id of ${req.params.id}`, 404));
    }

    if (!req.files || req.files.length === 0) {
      return next(new AppError('No images provided', 400));
    }

    // Check image limit
    const currentCount = banner.images.length;
    if (currentCount + req.files.length > 6) {
      return next(new AppError(`Cannot add ${req.files.length} images. Maximum 6 images per banner. Current: ${currentCount}`, 400));
    }

    // Upload new images
    const imageUploadPromises = req.files.map(async (file, index) => {
      const result = await cloudStorage.uploadBannerImage(
        file.buffer,
        file.originalname,
        req.user,
        `Banner ${banner.position} - Image ${currentCount + index + 1}`
      );

      return {
        url: result.urls.large, // Changed from medium to large for better quality
        filename: result.filename,
        alt: `Banner image ${currentCount + index + 1} for ${banner.position}`,
        title: '',
        description: '',
        sortOrder: currentCount + index,
        uploadDate: result.uploadDate
      };
    });

    const newImages = await Promise.all(imageUploadPromises);
    banner.images = [...banner.images, ...newImages];
    await banner.save();

    res.status(200).json({
      success: true,
      data: banner,
      message: `${newImages.length} image(s) added successfully`
    });
  } catch (error) {
    console.error('🖼️ [BANNER ADD IMAGES] Error:', error);
    return next(new AppError(error.message || 'Failed to add images', 400));
  }
});

// @desc    Remove specific image from banner
// @route   DELETE /api/banners/:id/images/:imageId
// @access  Private/Admin
const removeBannerImage = asyncHandler(async (req, res, next) => {
  try {
    console.log('🖼️ [BANNER REMOVE IMAGE] Starting image removal...');
    
    const banner = await Banner.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    });

    if (!banner) {
      return next(new AppError(`Banner not found with id of ${req.params.id}`, 404));
    }

    const imageToRemove = banner.images.find(img => img._id.toString() === req.params.imageId);
    if (!imageToRemove) {
      return next(new AppError(`Image not found with id of ${req.params.imageId}`, 404));
    }

    // Check if this is the last image
    if (banner.images.length <= 1) {
      return next(new AppError('Cannot remove the last image. Banner must have at least one image.', 400));
    }

    // Delete image from cloud storage
    if (imageToRemove.filename) {
      try {
        await cloudStorage.deleteFile(imageToRemove.filename);
      } catch (error) {
        console.warn('🖼️ [BANNER REMOVE IMAGE] Failed to delete image from cloud storage:', error);
      }
    }

    // Remove image from banner
    await banner.removeImage(req.params.imageId);

    res.status(200).json({
      success: true,
      data: banner,
      message: 'Image removed successfully'
    });
  } catch (error) {
    console.error('🖼️ [BANNER REMOVE IMAGE] Error:', error);
    return next(new AppError(error.message || 'Failed to remove image', 400));
  }
});

// @desc    Reorder banner images
// @route   PUT /api/banners/:id/images/reorder
// @access  Private/Admin
const reorderBannerImages = asyncHandler(async (req, res, next) => {
  try {
    console.log('🖼️ [BANNER REORDER] Starting image reordering...');
    
    const banner = await Banner.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    });

    if (!banner) {
      return next(new AppError(`Banner not found with id of ${req.params.id}`, 404));
    }

    const { imageIds } = req.body;
    if (!imageIds || !Array.isArray(imageIds)) {
      return next(new AppError('Image IDs array is required', 400));
    }

    if (imageIds.length !== banner.images.length) {
      return next(new AppError('Image IDs count must match current images count', 400));
    }

    // Reorder images
    await banner.reorderImages(imageIds);

    res.status(200).json({
      success: true,
      data: banner,
      message: 'Images reordered successfully'
    });
  } catch (error) {
    console.error('🖼️ [BANNER REORDER] Error:', error);
    return next(new AppError(error.message || 'Failed to reorder images', 400));
  }
});

// @desc    Update specific banner image details
// @route   PUT /api/banners/:id/images/:imageId
// @access  Private/Admin
const updateBannerImage = asyncHandler(async (req, res, next) => {
  try {
    console.log('🖼️ [BANNER UPDATE IMAGE] Starting image update...');
    
    const banner = await Banner.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    });

    if (!banner) {
      return next(new AppError(`Banner not found with id of ${req.params.id}`, 404));
    }

    const image = banner.images.find(img => img._id.toString() === req.params.imageId);
    if (!image) {
      return next(new AppError(`Image not found with id of ${req.params.imageId}`, 404));
    }

    // Update image details
    const { title, description, alt } = req.body;
    if (title !== undefined) image.title = title;
    if (description !== undefined) image.description = description;
    if (alt !== undefined) image.alt = alt;

    await banner.save();

    res.status(200).json({
      success: true,
      data: banner,
      message: 'Image details updated successfully'
    });
  } catch (error) {
    console.error('🖼️ [BANNER UPDATE IMAGE] Error:', error);
    return next(new AppError(error.message || 'Failed to update image details', 400));
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
  
  // Filter out banners with no images to prevent frontend errors
  const validBanners = banners.filter((banner) => {
    return banner.images && banner.images.length > 0 && banner.images[0] && banner.images[0].url;
  });

  res.status(200).json({
    success: true,
    count: validBanners.length,
    data: validBanners
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
  
  // Filter out banners with no images to prevent frontend errors
  const validBanners = banners.filter(banner => {
    return banner.images && banner.images.length > 0 && banner.images[0] && banner.images[0].url;
  });

  res.status(200).json({
    success: true,
    count: validBanners.length,
    data: validBanners
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
  
  // Filter out banners with no images to prevent frontend errors
  const validBanners = banners.filter(banner => {
    return banner.images && banner.images.length > 0 && banner.images[0] && banner.images[0].url;
  });

  res.status(200).json({
    success: true,
    count: validBanners.length,
    data: validBanners
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
  
  // Filter out banners with no images to prevent frontend errors
  const validBanners = banners.filter((banner) => {
    return banner.images && banner.images.length > 0 && banner.images[0] && banner.images[0].url;
  });

  res.status(200).json({
    success: true,
    count: validBanners.length,
    data: validBanners
  });
});

// @desc    DEBUG: Get all banners for debugging
// @route   GET /api/debug/banners
// @access  Public (temporary)
const debugBanners = asyncHandler(async (req, res, next) => {
  console.log('🐛 [DEBUG] Fetching ALL banners for debugging...');
  
  const allBanners = await Banner.find({})
    .populate('createdBy', 'name email');
  
  console.log(`🐛 [DEBUG] Total banners in database: ${allBanners.length}`);
  
  const bannersGrouped = {};
  allBanners.forEach((banner, index) => {
    const key = `${banner.tenantId}-${banner.position}`;
    if (!bannersGrouped[key]) {
      bannersGrouped[key] = [];
    }
    bannersGrouped[key].push({
      id: banner._id,
      position: banner.position,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
      imageCount: banner.images ? banner.images.length : 0,
      hasValidImages: banner.images && banner.images.length > 0 && banner.images[0] && banner.images[0].url,
      firstImageUrl: banner.images && banner.images.length > 0 && banner.images[0] ? banner.images[0].url : null
    });
  });
  
  res.status(200).json({
    success: true,
    message: 'Debug information for all banners',
    totalBanners: allBanners.length,
    groupedByTenantAndPosition: bannersGrouped,
    rawData: allBanners
  });
});

// @desc    Migrate existing banners to use higher resolution images
// @route   POST /api/banners/migrate-to-high-res
// @access  Private/Admin
const migrateBannersToHighRes = asyncHandler(async (req, res, next) => {
  try {
    console.log('🔄 [BANNER MIGRATE] Starting migration to high resolution images...');
    
    // Find all banners with medium resolution URLs
    const banners = await Banner.find({
      tenantId: req.user.tenantId,
      'images.url': { $regex: '_medium\\.' }
    });
    
    console.log(`🔄 [BANNER MIGRATE] Found ${banners.length} banners to migrate`);
    
    let migratedCount = 0;
    
    for (const banner of banners) {
      let hasChanges = false;
      
      // Update each image URL from medium to large
      banner.images.forEach((image, index) => {
        if (image.url && image.url.includes('_medium.')) {
          const newUrl = image.url.replace('_medium.', '_large.');
          console.log(`🔄 [BANNER MIGRATE] Updating image ${index + 1} in banner ${banner._id}`);
          console.log(`   From: ${image.url}`);
          console.log(`   To: ${newUrl}`);
          image.url = newUrl;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        await banner.save();
        migratedCount++;
        console.log(`✅ [BANNER MIGRATE] Migrated banner ${banner._id}`);
      }
    }
    
    console.log(`🔄 [BANNER MIGRATE] Migration completed! Updated ${migratedCount} banners`);
    
    res.status(200).json({
      success: true,
      message: `Successfully migrated ${migratedCount} banners to high resolution`,
      migratedCount,
      totalFound: banners.length
    });
  } catch (error) {
    console.error('🔄 [BANNER MIGRATE] Error:', error);
    return next(new AppError(error.message || 'Failed to migrate banners', 400));
  }
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
  getPublicBannersByUser,
  addBannerImages,
  removeBannerImage,
  reorderBannerImages,
  updateBannerImage,
  debugBanners,
  migrateBannersToHighRes
}; 