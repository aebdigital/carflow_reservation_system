const express = require('express');
const router = express.Router();
const {
  getCarsCount,
  getRentalRevenue,
  getUniqueCustomersCount,
  getReservationsCount
} = require('../controllers/lerentStatsController');

// @route   GET /api/lerent-stats/cars-count
// @desc    Get number of active cars for LeRent
// @access  Public
router.get('/cars-count', getCarsCount);

// @route   GET /api/lerent-stats/rental-revenue
// @desc    Get total rental days * 200 for all LeRent reservations
// @access  Public
router.get('/rental-revenue', getRentalRevenue);

// @route   GET /api/lerent-stats/unique-customers
// @desc    Get number of unique customers for LeRent
// @access  Public
router.get('/unique-customers', getUniqueCustomersCount);

// @route   GET /api/lerent-stats/reservations-count
// @desc    Get total number of reservations for LeRent (single request)
// @access  Public
router.get('/reservations-count', getReservationsCount);

module.exports = router;
