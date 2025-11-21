const Brand = require('../models/Brand');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const cloudStorage = require('../services/cloudStorage');
const sharp = require('sharp');

// @desc    Get all brands for tenant
// @route   GET /api/brands
// @access  Private
const getBrands = asyncHandler(async (req, res, next) => {
  const brands = await Brand.find({
    tenantId: req.user.tenantId,
    isActive: true
  }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: brands.length,
    data: brands
  });
});

// @desc    Create new brand
// @route   POST /api/brands
// @access  Private
const createBrand = asyncHandler(async (req, res, next) => {
  console.log('🔍 [BRAND] Create brand request:', {
    name: req.body.name,
    hasFile: !!req.file,
    userId: req.user?._id,
    tenantId: req.user?.tenantId
  });

  const { name } = req.body;
  const logoFile = req.file;

  if (!name) {
    console.error('❌ [BRAND] Name is missing from request body');
    return next(new AppError('Brand name is required', 400));
  }

  if (!req.user || !req.user.tenantId) {
    console.error('❌ [BRAND] User or tenantId is missing');
    return next(new AppError('Authentication required', 401));
  }

  // Check if brand already exists for this tenant
  const existingBrand = await Brand.findOne({
    tenantId: req.user.tenantId,
    name: name.trim(),
    isActive: true
  });

  if (existingBrand) {
    console.error('❌ [BRAND] Brand already exists:', name.trim());
    return next(new AppError('Brand with this name already exists', 400));
  }

  let logoUrl = null;

  // Upload logo to Google Cloud Storage if provided
  if (logoFile) {
    console.log('📁 [BRAND] Processing logo file:', {
      originalname: logoFile.originalname,
      mimetype: logoFile.mimetype,
      size: logoFile.size,
      hasBuffer: !!logoFile.buffer
    });

    try {
      // Optimize image with sharp (resize to 200x200, maintain aspect ratio)
      console.log('🖼️ [BRAND] Starting Sharp optimization...');
      const optimizedBuffer = await sharp(logoFile.buffer)
        .resize(200, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png({ quality: 90 })
        .toBuffer();

      console.log('✅ [BRAND] Image optimized, size:', optimizedBuffer.length, 'bytes');

      // Upload to GCS
      const fileName = `brands/${req.user.tenantId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
      console.log('☁️ [BRAND] Uploading to GCS:', fileName);

      const uploadResult = await cloudStorage.uploadToGCS(optimizedBuffer, fileName, 'image/png');
      logoUrl = uploadResult.url; // Extract just the URL string

      console.log('✅ [BRAND] Logo uploaded to GCS:', logoUrl);
    } catch (error) {
      console.error('❌ [BRAND] Error uploading logo:', error);
      console.error('❌ [BRAND] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return next(new AppError(`Failed to upload brand logo: ${error.message}`, 500));
    }
  }

  // Create brand
  const brand = await Brand.create({
    tenantId: req.user.tenantId,
    name: name.trim(),
    logo: logoUrl
  });

  console.log('✅ [BRAND] Brand created successfully:', {
    id: brand._id,
    name: brand.name,
    hasLogo: !!brand.logo,
    tenantId: brand.tenantId
  });

  res.status(201).json({
    success: true,
    data: brand
  });
});

// @desc    Update brand
// @route   PUT /api/brands/:id
// @access  Private
const updateBrand = asyncHandler(async (req, res, next) => {
  const { name } = req.body;
  const logoFile = req.file;

  let brand = await Brand.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });

  if (!brand) {
    return next(new AppError('Brand not found', 404));
  }

  // Update name if provided
  if (name && name.trim() !== brand.name) {
    // Check if new name already exists
    const existingBrand = await Brand.findOne({
      tenantId: req.user.tenantId,
      name: name.trim(),
      _id: { $ne: brand._id }
    });

    if (existingBrand) {
      return next(new AppError('Brand with this name already exists', 400));
    }

    brand.name = name.trim();
  }

  // Update logo if provided
  if (logoFile) {
    try {
      // Delete old logo from GCS if exists
      if (brand.logo) {
        try {
          await cloudStorage.deleteFromGCS(brand.logo);
          console.log('✅ [BRAND] Old logo deleted from GCS');
        } catch (deleteError) {
          console.warn('⚠️ [BRAND] Could not delete old logo:', deleteError.message);
        }
      }

      // Optimize and upload new logo
      const optimizedBuffer = await sharp(logoFile.buffer)
        .resize(200, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png({ quality: 90 })
        .toBuffer();

      const fileName = `brands/${req.user.tenantId}/${Date.now()}-${brand.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
      const uploadResult = await cloudStorage.uploadToGCS(optimizedBuffer, fileName, 'image/png');
      brand.logo = uploadResult.url; // Extract just the URL string

      console.log('✅ [BRAND] New logo uploaded to GCS:', brand.logo);
    } catch (error) {
      console.error('❌ [BRAND] Error uploading logo:', error);
      return next(new AppError('Failed to upload brand logo', 500));
    }
  }

  await brand.save();

  res.status(200).json({
    success: true,
    data: brand
  });
});

// @desc    Delete brand
// @route   DELETE /api/brands/:id
// @access  Private
const deleteBrand = asyncHandler(async (req, res, next) => {
  const brand = await Brand.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });

  if (!brand) {
    return next(new AppError('Brand not found', 404));
  }

  // Soft delete - just mark as inactive
  brand.isActive = false;
  await brand.save();

  // Delete logo from GCS if exists
  if (brand.logo) {
    try {
      await cloudStorage.deleteFromGCS(brand.logo);
      console.log('✅ [BRAND] Logo deleted from GCS');
    } catch (deleteError) {
      console.warn('⚠️ [BRAND] Could not delete logo:', deleteError.message);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Brand deleted successfully'
  });
});

module.exports = {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand
};
