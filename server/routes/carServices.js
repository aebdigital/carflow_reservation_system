const express = require('express');
const {
  // Extended Insurance
  getExtendedInsuranceOptions,
  addExtendedInsurance,
  updateExtendedInsurance,
  deleteExtendedInsurance,
  
  // Equipment
  getAllEquipment,
  getCarEquipment,
  addCarEquipment,
  updateCarEquipment,
  deleteCarEquipment,
  
  // Badges
  getAllBadges,
  getCarBadges,
  addCarBadge,
  updateCarBadge,
  deleteCarBadge
} = require('../controllers/carServicesController');

const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ========================================
// EXTENDED INSURANCE ROUTES (Rozšírené poistenie)
// ========================================

// Get all extended insurance options across all cars
router.get('/extended-insurance', restrictTo('admin', 'staff'), getExtendedInsuranceOptions);

// Car-specific extended insurance routes
router.route('/:carId/extended-insurance')
  .post(restrictTo('admin', 'staff'), addExtendedInsurance);

router.route('/:carId/extended-insurance/:insuranceId')
  .put(restrictTo('admin', 'staff'), updateExtendedInsurance)
  .delete(restrictTo('admin', 'staff'), deleteExtendedInsurance);

// ========================================
// EQUIPMENT ROUTES (Výbavy)
// ========================================

// Get all equipment across all cars
router.get('/equipment', restrictTo('admin', 'staff'), getAllEquipment);

// Car-specific equipment routes
router.route('/:carId/equipment')
  .get(restrictTo('admin', 'staff'), getCarEquipment)
  .post(restrictTo('admin', 'staff'), addCarEquipment);

router.route('/:carId/equipment/:equipmentId')
  .put(restrictTo('admin', 'staff'), updateCarEquipment)
  .delete(restrictTo('admin', 'staff'), deleteCarEquipment);

// ========================================
// BADGES ROUTES (Značky)
// ========================================

// Get all badges across all cars
router.get('/badges', restrictTo('admin', 'staff'), getAllBadges);

// Car-specific badge routes
router.route('/:carId/badges')
  .get(restrictTo('admin', 'staff'), getCarBadges)
  .post(restrictTo('admin', 'staff'), addCarBadge);

router.route('/:carId/badges/:badgeId')
  .put(restrictTo('admin', 'staff'), updateCarBadge)
  .delete(restrictTo('admin', 'staff'), deleteCarBadge);

module.exports = router;