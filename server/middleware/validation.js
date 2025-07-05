const { body, param, validationResult } = require('express-validator');

// Validation error handler
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ [VALIDATION] Validation failed for request:', req.method, req.path);
    console.error('❌ [VALIDATION] Request body:', JSON.stringify(req.body, null, 2));
    console.error('❌ [VALIDATION] Validation errors:', errors.array());
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  console.log('✅ [VALIDATION] Validation passed for:', req.method, req.path);
  next();
};

// Service validation rules
const serviceValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Service name must be between 1 and 100 characters'),
    
    body('description')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Service description must be between 1 and 500 characters'),
    
    body('category')
      .isIn(['driving_comfort', 'insurance_assistance', 'time_services', 'delivery_pickup', 'family_accessories', 'specialized'])
      .withMessage('Invalid service category'),
    
    body('pricing.type')
      .isIn(['fixed', 'per_day', 'per_km', 'percentage'])
      .withMessage('Invalid pricing type'),
    
    body('pricing.amount')
      .isFloat({ min: 0 })
      .withMessage('Pricing amount must be a positive number'),
    
    body('pricing.currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be 3 characters long'),
    
    body('availability.isGlobal')
      .optional()
      .isBoolean()
      .withMessage('isGlobal must be a boolean'),
    
    body('availability.vehicleCategories')
      .optional()
      .isArray()
      .withMessage('vehicleCategories must be an array'),
    
    body('availability.vehicleCategories.*')
      .optional()
      .isIn(['economy', 'compact', 'midsize', 'fullsize', 'luxury', 'suv', 'minivan', 'convertible', 'sports', 'utility', 'caravan', 'motorcycle', 'electric'])
      .withMessage('Invalid vehicle category'),
    
    body('behavior.isAutoSelected')
      .optional()
      .isBoolean()
      .withMessage('isAutoSelected must be a boolean'),
    
    body('behavior.isRequired')
      .optional()
      .isBoolean()
      .withMessage('isRequired must be a boolean'),
    
    body('behavior.maxQuantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('maxQuantity must be a positive integer'),
    
    body('dynamicPricing.isEnabled')
      .optional()
      .isBoolean()
      .withMessage('dynamicPricing.isEnabled must be a boolean'),
    
    body('dynamicPricing.pricePerKm')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('pricePerKm must be a positive number'),
    
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i)
      .withMessage('Color must be a valid hex color code'),
    
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('sortOrder must be a non-negative integer'),
    
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean')
  ],
  
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid service ID'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Service name must be between 1 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Service description must be between 1 and 500 characters'),
    
    body('category')
      .optional()
      .isIn(['driving_comfort', 'insurance_assistance', 'time_services', 'delivery_pickup', 'family_accessories', 'specialized'])
      .withMessage('Invalid service category'),
    
    body('pricing.type')
      .optional()
      .isIn(['fixed', 'per_day', 'per_km', 'percentage'])
      .withMessage('Invalid pricing type'),
    
    body('pricing.amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Pricing amount must be a positive number'),
    
    body('pricing.currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be 3 characters long'),
    
    body('availability.isGlobal')
      .optional()
      .isBoolean()
      .withMessage('isGlobal must be a boolean'),
    
    body('availability.vehicleCategories')
      .optional()
      .isArray()
      .withMessage('vehicleCategories must be an array'),
    
    body('availability.vehicleCategories.*')
      .optional()
      .isIn(['economy', 'compact', 'midsize', 'fullsize', 'luxury', 'suv', 'minivan', 'convertible', 'sports', 'utility', 'caravan', 'motorcycle', 'electric'])
      .withMessage('Invalid vehicle category'),
    
    body('behavior.isAutoSelected')
      .optional()
      .isBoolean()
      .withMessage('isAutoSelected must be a boolean'),
    
    body('behavior.isRequired')
      .optional()
      .isBoolean()
      .withMessage('isRequired must be a boolean'),
    
    body('behavior.maxQuantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('maxQuantity must be a positive integer'),
    
    body('dynamicPricing.isEnabled')
      .optional()
      .isBoolean()
      .withMessage('dynamicPricing.isEnabled must be a boolean'),
    
    body('dynamicPricing.pricePerKm')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('pricePerKm must be a positive number'),
    
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i)
      .withMessage('Color must be a valid hex color code'),
    
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('sortOrder must be a non-negative integer'),
    
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean')
  ]
};

module.exports = {
  validateRequest,
  serviceValidation
}; 