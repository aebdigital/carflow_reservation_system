const asyncHandler = require('express-async-handler');
const AdditionalService = require('../models/AdditionalService');
const AppError = require('../utils/appError');

// @desc    Get all insurance items (public endpoint)
// @route   GET /api/insurance
// @access  Public
const getInsuranceItems = asyncHandler(async (req, res, next) => {
  try {
    // Extract tenant information from query parameter or header
    const tenantId = req.query.tenantId || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    // Get all insurance items from additional services with category 'poistenie'
    const insuranceItems = await AdditionalService.find({
      tenantId: tenantId,
      category: 'poistenie',
      isActive: true,
      isPublic: true
    })
    .select('name description pricing image color icon availability behavior dynamicPricing sortOrder')
    .sort({ sortOrder: 1, name: 1 });

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
      count: formattedInsurance.length,
      data: formattedInsurance
    });

  } catch (error) {
    console.error('Error fetching insurance items:', error);
    return next(new AppError('Chyba pri načítavaní poistenia', 500));
  }
});

// @desc    Get single insurance item (public endpoint)
// @route   GET /api/insurance/:id
// @access  Public
const getInsuranceItem = asyncHandler(async (req, res, next) => {
  try {
    // Extract tenant information from query parameter or header
    const tenantId = req.query.tenantId || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

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
      data: formattedInsurance
    });

  } catch (error) {
    console.error('Error fetching insurance item:', error);
    return next(new AppError('Chyba pri načítavaní poistenia', 500));
  }
});

// @desc    Calculate insurance price (public endpoint)
// @route   POST /api/insurance/:id/calculate
// @access  Public
const calculateInsurancePrice = asyncHandler(async (req, res, next) => {
  try {
    // Extract tenant information from query parameter or header
    const tenantId = req.query.tenantId || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const { days = 1, quantity = 1, rentalTotal = 0, vehicleValue = 0 } = req.body;

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
    console.error('Error calculating insurance price:', error);
    return next(new AppError('Chyba pri výpočte ceny poistenia', 500));
  }
});

module.exports = {
  getInsuranceItems,
  getInsuranceItem,
  calculateInsurancePrice
};