const express = require('express');
const {
  getRivalInsuranceItems,
  getRivalInsuranceItem,
  calculateRivalInsurancePrice
} = require('../controllers/rivalInsuranceController');

const router = express.Router();

// Public routes - no authentication required
// These routes are specifically for rival@test.sk tenant

// @route   GET /api/rival-insurance
// @desc    Get all insurance items for rival@test.sk
// @access  Public
router.get('/', getRivalInsuranceItems);

// @route   GET /api/rival-insurance/:id
// @desc    Get single insurance item for rival@test.sk
// @access  Public
router.get('/:id', getRivalInsuranceItem);

// @route   POST /api/rival-insurance/:id/calculate
// @desc    Calculate insurance price based on parameters for rival@test.sk
// @access  Public
router.post('/:id/calculate', calculateRivalInsurancePrice);

module.exports = router;