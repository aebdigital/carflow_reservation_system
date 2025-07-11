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
  getCarsByLocation,
  getCarStats,
  setPrimaryImage,
  getCarStatus
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
router.get('/location/:locationName', getCarsByLocation);

// CRUD routes
router.route('/')
  .get(requireStaff, getCars)
  .post(requireAdmin, uploadMultipleCarImages, handleMulterError, createCar);

router.route('/:id')
  .get(getCar)
  .put(requireAdmin, uploadMultipleCarImages, handleMulterError, updateCar)
  .delete(requireAdmin, deleteCar);

// Special routes
router.get('/:id/availability', getCarAvailability);
router.get('/:id/status', requireStaff, getCarStatus);

// Image management routes
router.post('/:id/images', requireStaff, uploadMultipleCarImages, handleMulterError, uploadCarImages);
router.delete('/:id/images/:imageIndex', requireStaff, deleteCarImage);
router.put('/:id/images/:imageIndex/primary', requireStaff, setPrimaryImage);

module.exports = router; 