const Brand = require('../models/Brand');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { uploadToGCS, deleteFromGCS } = require('../services/cloudStorage');
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
  const { name } = req.body;
  const logoFile = req.file;

  if (!name) {
    return next(new AppError('Brand name is required', 400));
  }

  // Check if brand already exists for this tenant
  const existingBrand = await Brand.findOne({
    tenantId: req.user.tenantId,
    name: name.trim()
  });

  if (existingBrand) {
    return next(new AppError('Brand with this name already exists', 400));
  }

  let logoUrl = null;

  // Upload logo to Google Cloud Storage if provided
  if (logoFile) {
    try {
      // Optimize image with sharp (resize to 200x200, maintain aspect ratio)
      const optimizedBuffer = await sharp(logoFile.buffer)
        .resize(200, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png({ quality: 90 })
        .toBuffer();

      // Upload to GCS
      const fileName = `brands/${req.user.tenantId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
      logoUrl = await uploadToGCS(optimizedBuffer, fileName, 'image/png');

      console.log('✅ [BRAND] Logo uploaded to GCS:', logoUrl);
    } catch (error) {
      console.error('❌ [BRAND] Error uploading logo:', error);
      return next(new AppError('Failed to upload brand logo', 500));
    }
  }

  // Create brand
  const brand = await Brand.create({
    tenantId: req.user.tenantId,
    name: name.trim(),
    logo: logoUrl
  });

  console.log('✅ [BRAND] Brand created:', brand.name);

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
          await deleteFromGCS(brand.logo);
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
      brand.logo = await uploadToGCS(optimizedBuffer, fileName, 'image/png');

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
      await deleteFromGCS(brand.logo);
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
