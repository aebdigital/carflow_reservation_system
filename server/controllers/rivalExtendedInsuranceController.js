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

// @desc    Get all extended insurance items for rival@test.sk (public endpoint)
// @route   GET /api/rival-extended-insurance
// @access  Public
const getRivalExtendedInsuranceItems = asyncHandler(async (req, res, next) => {
  try {
    console.log('📄 Fetching extended insurance items for rival@test.sk');
    
    // Get rival's tenant ID
    const tenantId = await getRivalTenantId();
    
    // Get all extended insurance items from additional services with category 'poistenie_asistencia_rozsierene'
    const insuranceItems = await AdditionalService.find({
      tenantId: tenantId,
      category: 'poistenie_asistencia_rozsierene',
      isActive: true,
      isPublic: true
    })
    .select('name description pricing image color icon availability behavior dynamicPricing sortOrder')
    .sort({ sortOrder: 1, name: 1 });

    console.log(`📄 Found ${insuranceItems.length} extended insurance items for rival@test.sk`);

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
      tenant: RIVAL_EMAIL,
      category: 'extended_insurance',
      count: formattedInsurance.length,
      data: formattedInsurance
    });

  } catch (error) {
    console.error('❌ Error fetching rival extended insurance items:', error.message);
    return next(new AppError('Chyba pri načítavaní rozšíreného poistenia pre rival@test.sk', 500));
  }
});

// @desc    Get both regular and extended insurance for rival@test.sk (public endpoint)
// @route   GET /api/rival-all-insurance
// @access  Public
const getRivalAllInsuranceItems = asyncHandler(async (req, res, next) => {
  try {
    console.log('📄 Fetching all insurance items for rival@test.sk');
    
    // Get rival's tenant ID
    const tenantId = await getRivalTenantId();
    
    // Get both regular insurance and extended insurance items
    const insuranceItems = await AdditionalService.find({
      tenantId: tenantId,
      category: { $in: ['poistenie', 'poistenie_asistencia_rozsierene'] },
      isActive: true,
      isPublic: true
    })
    .select('name description pricing image color icon availability behavior dynamicPricing sortOrder category')
    .sort({ category: 1, sortOrder: 1, name: 1 });

    console.log(`📄 Found ${insuranceItems.length} total insurance items for rival@test.sk`);

    // Format the response and separate by category
    const regularInsurance = [];
    const extendedInsurance = [];

    insuranceItems.forEach(item => {
      const formattedItem = {
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
        color: item.color || (item.category === 'poistenie' ? '#f44336' : '#d32f2f'),
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
        features: [],
        coverage: item.description,
        sortOrder: item.sortOrder || 0
      };

      if (item.category === 'poistenie') {
        regularInsurance.push({ ...formattedItem, type: 'regular_insurance' });
      } else if (item.category === 'poistenie_asistencia_rozsierene') {
        extendedInsurance.push({ ...formattedItem, type: 'extended_insurance' });
      }
    });

    res.status(200).json({
      success: true,
      tenant: RIVAL_EMAIL,
      totalCount: insuranceItems.length,
      data: {
        regular_insurance: {
          category: 'regular_insurance',
          count: regularInsurance.length,
          items: regularInsurance
        },
        extended_insurance: {
          category: 'extended_insurance', 
          count: extendedInsurance.length,
          items: extendedInsurance
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching rival all insurance items:', error.message);
    return next(new AppError('Chyba pri načítavaní všetkého poistenia pre rival@test.sk', 500));
  }
});

module.exports = {
  getRivalExtendedInsuranceItems,
  getRivalAllInsuranceItems
};