const express = require('express');
const multer = require('multer');
const {
  getAdditionalServices,
  getAdditionalService,
  createAdditionalService,
  updateAdditionalService,
  deleteAdditionalService,
  getServicesByCategory,
  getPublicServices,
  getServicesForVehicle,
  calculateServicePrice,
  updateSortOrder
} = require('../controllers/additionalServiceController');

const { protect, requireAdmin, requireStaff } = require('../middleware/authMiddleware');
const { validateRequest, serviceValidation } = require('../middleware/validation');

const router = express.Router();

// Helper function to authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Middleware to parse JSON strings from FormData
const parseFormDataJSON = (req, res, next) => {
  try {
    console.log('🔧 [PARSE] Original req.body:', JSON.stringify(req.body, null, 2));
    
    // Parse JSON strings back to objects for nested fields
    const jsonFields = ['pricing', 'availability', 'behavior', 'dynamicPricing'];
    
    jsonFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
          console.log(`🔧 [PARSE] Parsed ${field}:`, req.body[field]);
        } catch (error) {
          console.error(`❌ [PARSE] Error parsing ${field}:`, error);
          // If parsing fails, leave as string and let validation catch it
        }
      }
    });
    
    // Convert string booleans to actual booleans for top-level fields
    const booleanFields = ['isActive', 'isPublic'];
    booleanFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (req.body[field] === 'true') {
          req.body[field] = true;
        } else if (req.body[field] === 'false') {
          req.body[field] = false;
        }
      }
    });
    
    // Convert string numbers to actual numbers for top-level fields
    const numberFields = ['sortOrder'];
    numberFields.forEach(field => {
      if (req.body[field] !== undefined && typeof req.body[field] === 'string') {
        const parsed = parseInt(req.body[field], 10);
        if (!isNaN(parsed)) {
          req.body[field] = parsed;
        }
      }
    });
    
    console.log('🔧 [PARSE] Final req.body:', JSON.stringify(req.body, null, 2));
    next();
  } catch (error) {
    console.error('❌ [PARSE] Error in parseFormDataJSON middleware:', error);
    next();
  }
};

// Configure multer for service image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_IMAGE_SIZE) || 5242880, // 5MB
    files: 1 // Only one image per service
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes
router.get('/public', getPublicServices);

// Protected routes - require authentication
router.use(protect);

// Basic CRUD routes
router.route('/')
  .get(getAdditionalServices)
  .post(
    authorize('admin', 'staff'),
    upload.single('image'),
    parseFormDataJSON,
    serviceValidation.create,
    validateRequest,
    createAdditionalService
  );

router.route('/:id')
  .get(getAdditionalService)
  .put(
    authorize('admin', 'staff'),
    upload.single('image'),
    parseFormDataJSON,
    serviceValidation.update,
    validateRequest,
    updateAdditionalService
  )
  .delete(
    authorize('admin'),
    deleteAdditionalService
  );

// Special routes
router.get('/category/:category', getServicesByCategory);
router.get('/vehicle/:vehicleId', getServicesForVehicle);
router.post('/:id/calculate-price', calculateServicePrice);
router.put('/sort-order', authorize('admin', 'staff'), serviceValidation.sortOrder, validateRequest, updateSortOrder);

module.exports = router; 