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
  setPrimaryImage
} = require('../controllers/carController');

const { protect, requireAdmin, requireStaff } = require('../middleware/authMiddleware');
const { uploadMultipleCarImages, handleMulterError } = require('../middleware/imageUpload');

const router = express.Router();

// Public/General routes
router.get('/stats', protect, requireStaff, getCarStats);
router.get('/location/:locationName', protect, getCarsByLocation);

// CRUD routes
router.route('/')
  .get(protect, requireStaff, getCars)
  .post(protect, requireAdmin, uploadMultipleCarImages, handleMulterError, createCar);

router.route('/:id')
  .get(protect, getCar)
  .put(protect, requireAdmin, uploadMultipleCarImages, handleMulterError, updateCar)
  .delete(protect, requireAdmin, deleteCar);

// Special routes
router.get('/:id/availability', protect, getCarAvailability);

// Image management routes
router.post('/:id/images', protect, requireStaff, uploadMultipleCarImages, handleMulterError, uploadCarImages);
router.delete('/:id/images/:imageIndex', protect, requireStaff, deleteCarImage);
router.put('/:id/images/:imageIndex/primary', protect, requireStaff, setPrimaryImage);

module.exports = router; 