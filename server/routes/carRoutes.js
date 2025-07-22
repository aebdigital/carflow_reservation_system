const express = require('express');
const {
  getCars,
  getCar,
  createCar,
  updateCar,
  deleteCar,
  getCarAvailability,
  uploadCarImages,
  deleteCarImage,
  reorderCarImages,
  getCarsByLocation,
  getCarStats,
  setPrimaryImage,
  getCarStatus,
  testFileUpload
} = require('../controllers/carController');

const { protect, requireAdmin, requireStaff, addTenantFilter, restrictRivalDomain } = require('../middleware/authMiddleware');
const { uploadMultipleCarImages, handleMulterError } = require('../middleware/imageUpload');

const router = express.Router();

// Apply tenant filtering to all routes
router.use(protect);
router.use(restrictRivalDomain);
router.use(addTenantFilter);

// Public/General routes
router.get('/stats', requireStaff, getCarStats);

// CRUD routes
router.route('/')
  .get(requireStaff, getCars)
  .post(requireAdmin, uploadMultipleCarImages, handleMulterError, createCar);

router.route('/:id')
  .get(getCar)
  .put(requireAdmin, uploadMultipleCarImages, handleMulterError, updateCar)
  .delete(requireAdmin, deleteCar);

// Special routes
router.get('/location/:locationName', getCarsByLocation);
router.get('/:id/availability', getCarAvailability);
router.get('/:id/status', requireStaff, getCarStatus);

// Image management routes
router.post('/:id/images', requireStaff, uploadMultipleCarImages, handleMulterError, uploadCarImages);
router.delete('/:id/images/:imageId', requireStaff, deleteCarImage);
router.put('/:id/images/:imageId/primary', requireStaff, setPrimaryImage);
router.put('/:id/images/reorder', requireStaff, reorderCarImages);

// Test endpoint for debugging uploads
router.post('/test-upload', requireAdmin, uploadMultipleCarImages, handleMulterError, testFileUpload);

module.exports = router; 