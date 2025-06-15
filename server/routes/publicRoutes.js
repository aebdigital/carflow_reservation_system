const express = require('express');
const {
  getCars,
  getCar,
  getCarAvailability,
  getCarsByLocation,
  getCarCalendar
} = require('../controllers/carController');

const {
  createPublicReservation
} = require('../controllers/publicController');

const router = express.Router();

// Public car browsing endpoints (no authentication required)
router.get('/cars', getCars); // Get all cars
router.get('/cars/:id', getCar); // Get specific car details
router.get('/cars/:id/availability', getCarAvailability); // Check car availability
router.get('/cars/:id/calendar', getCarCalendar); // Get car booking calendar
router.get('/cars/location/:locationName', getCarsByLocation); // Get cars by location

// Public reservation endpoint (no authentication required)
router.post('/reservations', createPublicReservation); // Create reservation + customer

module.exports = router; 