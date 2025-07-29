const express = require('express');
const {
  getInsuranceItems,
  getInsuranceItem,
  calculateInsurancePrice
} = require('../controllers/insuranceController');

const router = express.Router();

// Public routes - no authentication required
// These routes are accessible via /api/insurance

// @route   GET /api/insurance
// @desc    Get all insurance items for a tenant
// @access  Public (requires tenantId in query or header)
router.get('/', getInsuranceItems);

// @route   GET /api/insurance/:id
// @desc    Get single insurance item
// @access  Public (requires tenantId in query or header)
router.get('/:id', getInsuranceItem);

// @route   POST /api/insurance/:id/calculate
// @desc    Calculate insurance price based on parameters
// @access  Public (requires tenantId in query or header)
router.post('/:id/calculate', calculateInsurancePrice);

module.exports = router;