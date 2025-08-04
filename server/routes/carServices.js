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

const { protect, requireStaff } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ========================================
// EXTENDED INSURANCE ROUTES (Rozšírené poistenie)
// ========================================

// Get all extended insurance options across all cars
router.get('/extended-insurance', requireStaff, getExtendedInsuranceOptions);

// Car-specific extended insurance routes
router.route('/:carId/extended-insurance')
  .post(requireStaff, addExtendedInsurance);

router.route('/:carId/extended-insurance/:insuranceId')
  .put(requireStaff, updateExtendedInsurance)
  .delete(requireStaff, deleteExtendedInsurance);

// ========================================
// EQUIPMENT ROUTES (Výbavy)
// ========================================

// Get all equipment across all cars
router.get('/equipment', requireStaff, getAllEquipment);

// Car-specific equipment routes
router.route('/:carId/equipment')
  .get(requireStaff, getCarEquipment)
  .post(requireStaff, addCarEquipment);

router.route('/:carId/equipment/:equipmentId')
  .put(requireStaff, updateCarEquipment)
  .delete(requireStaff, deleteCarEquipment);

// ========================================
// BADGES ROUTES (Značky)
// ========================================

// Get all badges across all cars
router.get('/badges', requireStaff, getAllBadges);

// Car-specific badge routes
router.route('/:carId/badges')
  .get(requireStaff, getCarBadges)
  .post(requireStaff, addCarBadge);

router.route('/:carId/badges/:badgeId')
  .put(requireStaff, updateCarBadge)
  .delete(requireStaff, deleteCarBadge);

module.exports = router;