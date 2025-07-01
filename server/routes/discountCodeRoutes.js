const express = require('express');
const {
  getDiscountCodes,
  getDiscountCode,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  toggleDiscountCode,
  validateDiscountCode,
  getDiscountCodeStats
} = require('../controllers/discountCodeController');

const router = express.Router();

const { protect, requireAdmin, requireStaff } = require('../middleware/authMiddleware');

// Public route for discount code validation (used during reservation)
router.route('/validate')
  .post(validateDiscountCode);

// Apply authentication to all other routes
router.use(protect);

// Stats route (accessible to all authenticated users)
router.route('/stats')
  .get(getDiscountCodeStats);

// Main CRUD routes (admin/manager only)
router.route('/')
  .get(getDiscountCodes)
  .post(requireAdmin, createDiscountCode);

router.route('/:id')
  .get(getDiscountCode)
  .put(requireAdmin, updateDiscountCode)
  .delete(requireAdmin, deleteDiscountCode);

// Toggle status route
router.route('/:id/toggle')
  .patch(requireAdmin, toggleDiscountCode);

module.exports = router; 