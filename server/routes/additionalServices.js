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

const { protect, authorize } = require('../middleware/auth');
const { validateRequest, serviceValidation } = require('../middleware/validation');

const router = express.Router();

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
    serviceValidation.create,
    validateRequest,
    createAdditionalService
  );

router.route('/:id')
  .get(getAdditionalService)
  .put(
    authorize('admin', 'staff'),
    upload.single('image'),
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
router.put('/sort-order', authorize('admin', 'staff'), updateSortOrder);

module.exports = router; 