const express = require('express');
const {
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
  createReservationByUser,
  getWebsiteSettingsByUser,
  getInfoBarByUser,
  getModalByUser,
  subscribeToNewsletter,
  verifyDiscountCodeByUser,
  getPublicCars,
  getPublicCar
} = require('../controllers/publicController');

// Import blog controller functions
const {
  getPublicBlogsByUser,
  getPublicBlogBySlug,
  getBlogCategories,
  getBlogTags,
  likeBlog,
  addBlogComment
} = require('../controllers/blogController');

// Import additional services controller
const {
  getPublicServices,
  getServicesForVehicle,
  getServicesForVehiclePublic,
  calculateServicePrice,
  calculateServicePricePublic
} = require('../controllers/additionalServiceController');

// Import banner controller
const {
  getPublicBanners,
  getPublicBannersByUser
} = require('../controllers/bannerController');

const router = express.Router();

// Public car browsing endpoints (no authentication required)
router.get('/cars', getPublicCars); // Get all cars (public)
router.get('/cars/:id', getPublicCar); // Get single car (public)

// Public Additional Services endpoints (no authentication required)
router.get('/services', getPublicServices); // Get all public additional services
router.get('/services/vehicle/:vehicleId', getServicesForVehiclePublic); // Get services for specific vehicle
router.post('/services/calculate-price', calculateServicePricePublic); // Calculate service price

// Public Banner endpoints (no authentication required)
router.get('/banners', getPublicBanners); // Get public banners
router.get('/banners/page/:page', getPublicBanners); // Get banners by page

// User/tenant-specific endpoints (public access but filtered by tenant)
router.get('/users/:email/cars', getCarsByUser);
router.get('/users/:email/cars/:carId', getCarByUser);
router.get('/users/:email/cars/:carId/availability', getCarAvailabilityByUser);
router.get('/users/:email/cars/category/:category', getCarsByCategoryAndUser);
router.get('/users/:email/features', getAvailableFeaturesByUser);
router.post('/users/:email/reservations', createReservationByUser);
router.get('/users/:email/website-settings', getWebsiteSettingsByUser);
router.get('/users/:email/info-bar', getInfoBarByUser);
router.get('/users/:email/modal', getModalByUser);
router.post('/users/:email/newsletter', subscribeToNewsletter);
router.post('/users/:email/verify-discount', verifyDiscountCodeByUser);

// Blog endpoints (public)
router.get('/users/:email/blogs', getPublicBlogsByUser);
router.get('/users/:email/blogs/:slug', getPublicBlogBySlug);
router.get('/users/:email/blog-categories', getBlogCategories);
router.get('/users/:email/blog-tags', getBlogTags);
router.post('/users/:email/blogs/:slug/like', likeBlog);
router.post('/users/:email/blogs/:slug/comments', addBlogComment);

// User/tenant-specific services endpoints
router.get('/users/:email/services', getPublicServices);
router.get('/users/:email/services/vehicle/:vehicleId', getServicesForVehiclePublic);
router.post('/users/:email/services/calculate-price', calculateServicePricePublic);

// User/tenant-specific banner endpoints
router.get('/users/:email/banners', getPublicBannersByUser);
router.get('/users/:email/banners/page/:page', getPublicBannersByUser);

// Availability check endpoint (utility)
router.get('/availability', getCarAvailability);
router.get('/cars/location/:location', getCarsByLocation);
router.get('/cars/:id/calendar', getCarCalendar);

module.exports = router; 