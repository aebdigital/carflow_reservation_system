const express = require('express');
const {
  getExtendedInsuranceItems,
  getExtendedInsuranceItem,
  calculateExtendedInsurancePrice
} = require('../controllers/extendedInsuranceController');

const router = express.Router();

// Public routes - no authentication required
// These routes are accessible via /api/extended-insurance

// @route   GET /api/extended-insurance
// @desc    Get all extended insurance items for a tenant
// @access  Public (requires tenantId in query or header)
router.get('/', getExtendedInsuranceItems);

// @route   GET /api/extended-insurance/:id
// @desc    Get single extended insurance item
// @access  Public (requires tenantId in query or header)
router.get('/:id', getExtendedInsuranceItem);

// @route   POST /api/extended-insurance/:id/calculate
// @desc    Calculate extended insurance price based on parameters
// @access  Public (requires tenantId in query or header)
router.post('/:id/calculate', calculateExtendedInsurancePrice);

module.exports = router;