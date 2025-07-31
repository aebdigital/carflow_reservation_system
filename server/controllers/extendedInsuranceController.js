const AdditionalService = require('../models/AdditionalService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get all extended insurance items (public endpoint)
// @route   GET /api/extended-insurance
// @access  Public
const getExtendedInsuranceItems = asyncHandler(async (req, res, next) => {
  try {
    // Extract tenant information from query parameter or header
    const tenantId = req.query.tenantId || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    console.log(`📄 Fetching extended insurance items for tenant: ${tenantId}`);

    // Get all extended insurance items from additional services with category 'poistenie_asistencia_rozsierene'
    const insuranceItems = await AdditionalService.find({
      tenantId: tenantId,
      category: 'poistenie_asistencia_rozsierene',
      isActive: true,
      isPublic: true
    })
    .select('name description pricing image color icon availability behavior dynamicPricing sortOrder')
    .sort({ sortOrder: 1, name: 1 });

    console.log(`📄 Found ${insuranceItems.length} extended insurance items`);

    // Format the response to include calculated pricing information
    const formattedInsurance = insuranceItems.map(item => ({
      id: item._id,
      name: item.name,
      description: item.description,
      category: 'extended_insurance',
      pricing: {
        type: item.pricing.type,
        amount: item.pricing.amount,
        currency: item.pricing.currency || 'EUR',
        displayPrice: `${item.pricing.amount}€${item.pricing.type === 'per_day' ? '/deň' : ''}`
      },
      image: item.image?.url || null,
      color: item.color || '#d32f2f',
      icon: item.icon || 'security',
      availability: {
        isGlobal: item.availability?.isGlobal || true,
        vehicleCategories: item.availability?.vehicleCategories || []
      },
      behavior: {
        isOptional: item.behavior?.isRequired ? false : true,
        isRecommended: item.behavior?.isAutoSelected || false,
        maxQuantity: item.behavior?.maxQuantity || 1
      },
      features: [], // Can be expanded later for specific insurance features
      coverage: item.description, // Using description as coverage details
      type: 'extended_insurance',
      sortOrder: item.sortOrder || 0
    }));

    res.status(200).json({
      success: true,
      category: 'extended_insurance',
      count: formattedInsurance.length,
      data: formattedInsurance
    });

  } catch (error) {
    console.error('❌ Error fetching extended insurance items:', error.message);
    return next(new AppError('Chyba pri načítavaní rozšíreného poistenia', 500));
  }
});

// @desc    Get single extended insurance item (public endpoint)
// @route   GET /api/extended-insurance/:id
// @access  Public
const getExtendedInsuranceItem = asyncHandler(async (req, res, next) => {
  try {
    // Extract tenant information from query parameter or header
    const tenantId = req.query.tenantId || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    console.log(`📄 Fetching extended insurance item ${req.params.id} for tenant: ${tenantId}`);

    const insuranceItem = await AdditionalService.findOne({
      _id: req.params.id,
      tenantId: tenantId,
      category: 'poistenie_asistencia_rozsierene',
      isActive: true,
      isPublic: true
    });

    if (!insuranceItem) {
      return next(new AppError('Rozšírené poistenie nebolo nájdené', 404));
    }

    // Format the response with detailed information
    const formattedInsurance = {
      id: insuranceItem._id,
      name: insuranceItem.name,
      description: insuranceItem.description,
      category: 'extended_insurance',
      pricing: {
        type: insuranceItem.pricing.type,
        amount: insuranceItem.pricing.amount,
        currency: insuranceItem.pricing.currency || 'EUR',
        displayPrice: `${insuranceItem.pricing.amount}€${insuranceItem.pricing.type === 'per_day' ? '/deň' : ''}`
      },
      image: insuranceItem.image?.url || null,
      color: insuranceItem.color || '#d32f2f',
      icon: insuranceItem.icon || 'security',
      availability: {
        isGlobal: insuranceItem.availability?.isGlobal || true,
        vehicleCategories: insuranceItem.availability?.vehicleCategories || [],
        excludedVehicles: insuranceItem.availability?.excludedVehicles || [],
        seasonal: insuranceItem.availability?.seasonal || { isActive: false }
      },
      behavior: {
        isOptional: insuranceItem.behavior?.isRequired ? false : true,
        isRecommended: insuranceItem.behavior?.isAutoSelected || false,
        requiresApproval: insuranceItem.behavior?.requiresApproval || false,
        maxQuantity: insuranceItem.behavior?.maxQuantity || 1,
        dependsOn: insuranceItem.behavior?.dependsOn || []
      },
      dynamicPricing: insuranceItem.dynamicPricing || { isEnabled: false },
      features: [], // Can be expanded later for specific insurance features
      coverage: insuranceItem.description, // Using description as coverage details
      terms: {
        // Default terms - can be expanded later
        minimumAge: 18,
        maximumAge: 75,
        validityPeriod: 365
      },
      type: 'extended_insurance',
      sortOrder: insuranceItem.sortOrder || 0,
      createdAt: insuranceItem.createdAt,
      updatedAt: insuranceItem.updatedAt
    };

    res.status(200).json({
      success: true,
      category: 'extended_insurance',
      data: formattedInsurance
    });

  } catch (error) {
    console.error('❌ Error fetching extended insurance item:', error.message);
    return next(new AppError('Chyba pri načítavaní rozšíreného poistenia', 500));
  }
});

// @desc    Calculate extended insurance price (public endpoint)
// @route   POST /api/extended-insurance/:id/calculate
// @access  Public
const calculateExtendedInsurancePrice = asyncHandler(async (req, res, next) => {
  try {
    // Extract tenant information from query parameter or header
    const tenantId = req.query.tenantId || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const { days = 1, quantity = 1, rentalTotal = 0, vehicleValue = 0 } = req.body;

    console.log(`📄 Calculating extended insurance price for item ${req.params.id}`);

    const insuranceItem = await AdditionalService.findOne({
      _id: req.params.id,
      tenantId: tenantId,
      category: 'poistenie_asistencia_rozsierene',
      isActive: true,
      isPublic: true
    });

    if (!insuranceItem) {
      return next(new AppError('Rozšírené poistenie nebolo nájdené', 404));
    }

    // Calculate price using the existing method
    const calculatedPrice = insuranceItem.calculatePrice({
      quantity,
      days,
      distance: 0, // Not applicable for insurance
      basePrice: rentalTotal
    });

    res.status(200).json({
      success: true,
      category: 'extended_insurance',
      data: {
        insuranceId: insuranceItem._id,
        insuranceName: insuranceItem.name,
        parameters: {
          days,
          quantity,
          rentalTotal,
          vehicleValue
        },
        pricing: {
          type: insuranceItem.pricing.type,
          baseAmount: insuranceItem.pricing.amount,
          calculatedPrice: calculatedPrice,
          currency: insuranceItem.pricing.currency || 'EUR',
          displayPrice: `${calculatedPrice}€`
        }
      }
    });

  } catch (error) {
    console.error('❌ Error calculating extended insurance price:', error.message);
    return next(new AppError('Chyba pri výpočte ceny rozšíreného poistenia', 500));
  }
});

module.exports = {
  getExtendedInsuranceItems,
  getExtendedInsuranceItem,
  calculateExtendedInsurancePrice
};