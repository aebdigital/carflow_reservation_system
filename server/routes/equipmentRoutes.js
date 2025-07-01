const express = require('express');
const {
  getEquipment,
  getEquipmentItem,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  toggleEquipment,
  getEquipmentByCategory,
  getStandardEquipment,
  getEquipmentStats
} = require('../controllers/equipmentController');

const router = express.Router();

const { protect, requireAdmin, requireStaff } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(protect);

// Stats route (accessible to all authenticated users)
router.route('/stats')
  .get(getEquipmentStats);

// Category-specific routes
router.route('/category/:category')
  .get(getEquipmentByCategory);

router.route('/standard/:category')
  .get(getStandardEquipment);

// Main CRUD routes
router.route('/')
  .get(getEquipment)
  .post(requireAdmin, createEquipment);

router.route('/:id')
  .get(getEquipmentItem)
  .put(requireAdmin, updateEquipment)
  .delete(requireAdmin, deleteEquipment);

// Toggle status route
router.route('/:id/toggle')
  .patch(requireAdmin, toggleEquipment);

module.exports = router; 