const express = require('express');
const {
  getCars,
  getCar,
  getCarAvailability,
  getCarsByLocation,
  getCarCalendar
} = require('../controllers/carController');

const {
  createPublicReservation,
  getCarsByUser,
  getCarByUser,
  getCarAvailabilityByUser,
  getCarsByCategoryAndUser,
  getAvailableFeaturesByUser,
  createReservationByUser
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

// === NEW TENANT-AWARE ENDPOINTS ===
// These endpoints filter by user email to show only that user's tenant cars

// Get cars for a specific user/tenant
router.get('/users/:email/cars', getCarsByUser);

// Get single car details for a specific user/tenant
router.get('/users/:email/cars/:carId', getCarByUser);

// Check car availability for specific dates within a user/tenant
router.get('/users/:email/cars/:carId/availability', getCarAvailabilityByUser);

// Get cars by category for a specific user/tenant
router.get('/users/:email/cars/category/:category', getCarsByCategoryAndUser);

// Get available features/amenities for a specific user/tenant
router.get('/users/:email/features', getAvailableFeaturesByUser);

// Create reservation for a specific user/tenant
router.post('/users/:email/reservations', createReservationByUser);

module.exports = router; 