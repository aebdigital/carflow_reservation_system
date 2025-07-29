const AdditionalService = require('../models/AdditionalService');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Rival tenant email - this is the admin user whose tenantId we'll use
const RIVAL_EMAIL = 'rival@test.sk';

/**
 * Get tenant ID for rival@test.sk
 */
async function getRivalTenantId() {
  try {
    const rivalUser = await User.findOne({ 
      email: RIVAL_EMAIL,
      role: 'admin'
    });
    
    if (!rivalUser) {
      throw new Error(`Rival admin user not found: ${RIVAL_EMAIL}`);
    }
    
    return rivalUser.tenantId;
  } catch (error) {
    console.error('❌ Error getting rival tenant ID:', error.message);
    throw new Error('Rival tenant not found');
  }
}

// @desc    Get all insurance items for rival@test.sk (public endpoint)
// @route   GET /api/rival-insurance
// @access  Public
const getRivalInsuranceItems = asyncHandler(async (req, res, next) => {
  try {
    console.log('📄 Fetching insurance items for rival@test.sk');
    
    // Get rival's tenant ID
    const tenantId = await getRivalTenantId();
    
    // Get all insurance items from additional services with category 'poistenie'
    const insuranceItems = await AdditionalService.find({
      tenantId: tenantId,
      category: 'poistenie',
      isActive: true,
      isPublic: true
    })
    .select('name description pricing image color icon availability behavior dynamicPricing sortOrder')
    .sort({ sortOrder: 1, name: 1 });

    console.log(`📄 Found ${insuranceItems.length} insurance items for rival@test.sk`);

    // Format the response to include calculated pricing information
    const formattedInsurance = insuranceItems.map(item => ({
      id: item._id,
      name: item.name,
      description: item.description,
      pricing: {
        type: item.pricing.type,
        amount: item.pricing.amount,
        currency: item.pricing.currency || 'EUR',
        displayPrice: `${item.pricing.amount}€${item.pricing.type === 'per_day' ? '/deň' : ''}`
      },
      image: item.image?.url || null,
      color: item.color || '#f44336',
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
      sortOrder: item.sortOrder || 0
    }));

    res.status(200).json({
      success: true,
      tenant: RIVAL_EMAIL,
      count: formattedInsurance.length,
      data: formattedInsurance
    });

  } catch (error) {
    console.error('❌ Error fetching rival insurance items:', error.message);
    return next(new AppError('Chyba pri načítavaní poistenia pre rival@test.sk', 500));
  }
});

// @desc    Get single insurance item for rival@test.sk (public endpoint)
// @route   GET /api/rival-insurance/:id
// @access  Public
const getRivalInsuranceItem = asyncHandler(async (req, res, next) => {
  try {
    console.log(`📄 Fetching insurance item ${req.params.id} for rival@test.sk`);
    
    // Get rival's tenant ID
    const tenantId = await getRivalTenantId();

    const insuranceItem = await AdditionalService.findOne({
      _id: req.params.id,
      tenantId: tenantId,
      category: 'poistenie',
      isActive: true,
      isPublic: true
    });

    if (!insuranceItem) {
      return next(new AppError('Poistenie nebolo nájdené', 404));
    }

    // Format the response with detailed information
    const formattedInsurance = {
      id: insuranceItem._id,
      name: insuranceItem.name,
      description: insuranceItem.description,
      pricing: {
        type: insuranceItem.pricing.type,
        amount: insuranceItem.pricing.amount,
        currency: insuranceItem.pricing.currency || 'EUR',
        displayPrice: `${insuranceItem.pricing.amount}€${insuranceItem.pricing.type === 'per_day' ? '/deň' : ''}`
      },
      image: insuranceItem.image?.url || null,
      color: insuranceItem.color || '#f44336',
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
      sortOrder: insuranceItem.sortOrder || 0,
      createdAt: insuranceItem.createdAt,
      updatedAt: insuranceItem.updatedAt
    };

    res.status(200).json({
      success: true,
      tenant: RIVAL_EMAIL,
      data: formattedInsurance
    });

  } catch (error) {
    console.error('❌ Error fetching rival insurance item:', error.message);
    return next(new AppError('Chyba pri načítavaní poistenia pre rival@test.sk', 500));
  }
});

// @desc    Calculate insurance price for rival@test.sk (public endpoint)
// @route   POST /api/rival-insurance/:id/calculate
// @access  Public
const calculateRivalInsurancePrice = asyncHandler(async (req, res, next) => {
  try {
    console.log(`📄 Calculating insurance price for item ${req.params.id} for rival@test.sk`);
    
    const { days = 1, quantity = 1, rentalTotal = 0, vehicleValue = 0 } = req.body;

    // Get rival's tenant ID
    const tenantId = await getRivalTenantId();

    const insuranceItem = await AdditionalService.findOne({
      _id: req.params.id,
      tenantId: tenantId,
      category: 'poistenie',
      isActive: true,
      isPublic: true
    });

    if (!insuranceItem) {
      return next(new AppError('Poistenie nebolo nájdené', 404));
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
      tenant: RIVAL_EMAIL,
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
    console.error('❌ Error calculating rival insurance price:', error.message);
    return next(new AppError('Chyba pri výpočte ceny poistenia pre rival@test.sk', 500));
  }
});

module.exports = {
  getRivalInsuranceItems,
  getRivalInsuranceItem,
  calculateRivalInsurancePrice
};