const express = require('express');
const {
  getRivalExtendedInsuranceItems,
  getRivalAllInsuranceItems
} = require('../controllers/rivalExtendedInsuranceController');

const router = express.Router();

// Public routes - no authentication required
// These routes are specifically for rival@test.sk tenant

// @route   GET /api/rival-extended-insurance
// @desc    Get all extended insurance items for rival@test.sk
// @access  Public
router.get('/', getRivalExtendedInsuranceItems);

// @route   GET /api/rival-all-insurance
// @desc    Get both regular and extended insurance items for rival@test.sk
// @access  Public
router.get('/all', getRivalAllInsuranceItems);

module.exports = router;