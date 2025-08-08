const express = require('express');
const {
  getCarAvailability,
  getCarsByLocation
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
  subscribeToNewsletterSimple,
  verifyDiscountCodeByUser,
  getPublicCars,
  getPublicCar,
  getPublicCarPricing,
  getPublicCarCategories,
  getCarCalendarByUser,
  getReservedDatesByUser,
  getPublicCarCalendar,
  getReservationQR,
  getReservationQRByUser,
  getReservationSlovakAgreement,
  getReservationSlovakAgreementByUser,
  getPickupLocationsByUser,
  getCarEquipmentByUser,
  getCarBadgesByUser,
  getCarExtendedInsuranceByUser,
  getCarSpecificationsByUser,
  getCarPricingByUser,
  getCarBrandsByUser,
  getCarsByBrandByUser,
  getCarModelsByBrandByUser,
  getCarsByEquipmentByUser,
  searchCarsByUser
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
router.get('/cars/categories', getPublicCarCategories); // Get car categories (public)
router.get('/cars/:id', getPublicCar); // Get single car (public)
router.get('/cars/:id/pricing', getPublicCarPricing); // Get car pricing (public)
router.get('/cars/:id/calendar', getPublicCarCalendar); // Get car calendar (public)

// Public reservation endpoints (no authentication required)
router.post('/reservations', createPublicReservation); // Create general public reservation
router.get('/reservations/:id/qr', getReservationQR); // Get QR payment codes for reservation
router.get('/reservations/:id/slovak-agreement', getReservationSlovakAgreement); // Get Slovak rental agreement PDF

// Public Additional Services endpoints (no authentication required)
router.get('/services', getPublicServices); // Get all public additional services
router.get('/services/vehicle/:vehicleId', getServicesForVehiclePublic); // Get services for specific vehicle
router.post('/services/calculate-price', calculateServicePricePublic); // Calculate service price

// Public Banner endpoints (no authentication required)
router.get('/banners', getPublicBanners); // Get public banners
router.get('/banners/page/:page', getPublicBanners); // Get banners by page

// Tenant-specific endpoints (identified by user email)
// Note: Order matters! More specific routes must come before parameterized routes
router.get('/users/:email/cars/brands', getCarBrandsByUser); // Get all available car brands
router.get('/users/:email/cars/search', searchCarsByUser); // Advanced car search with filters
router.get('/users/:email/cars/reserved-dates', getReservedDatesByUser); // Get reserved dates for multiple cars
router.get('/users/:email/cars/by-brand/:brand', getCarsByBrandByUser); // Get cars by specific brand
router.get('/users/:email/cars/models/:brand', getCarModelsByBrandByUser); // Get models for specific brand
router.get('/users/:email/cars/by-equipment/:equipmentName', getCarsByEquipmentByUser); // Find cars with specific equipment
router.get('/users/:email/cars/category/:category', getCarsByCategoryAndUser); // Get cars by category
router.get('/users/:email/cars/:carId/availability', getCarAvailabilityByUser); // Check car availability
router.get('/users/:email/cars/:carId/calendar', getCarCalendarByUser); // Get car booking calendar
router.get('/users/:email/cars/:carId/equipment', getCarEquipmentByUser); // Get car equipment only
router.get('/users/:email/cars/:carId/badges', getCarBadgesByUser); // Get car badges only
router.get('/users/:email/cars/:carId/extended-insurance', getCarExtendedInsuranceByUser); // Get car extended insurance options only
router.get('/users/:email/cars/:carId/specifications', getCarSpecificationsByUser); // Get car specifications only
router.get('/users/:email/cars/:carId/pricing', getCarPricingByUser); // Get car pricing only
router.get('/users/:email/cars/:carId', getCarByUser); // Get single car for tenant
router.get('/users/:email/cars', getCarsByUser); // Get cars for tenant
router.get('/users/:email/features', getAvailableFeaturesByUser); // Get available features

// Reservation endpoints
router.post('/users/:email/reservations', createReservationByUser); // Create reservation for tenant
router.get('/users/:email/reservations/:id/qr', getReservationQRByUser); // Get QR payment codes for tenant reservation
router.get('/users/:email/reservations/:id/slovak-agreement', getReservationSlovakAgreementByUser); // Get Slovak rental agreement PDF for tenant

// Website settings endpoints
router.get('/users/:email/website-settings', getWebsiteSettingsByUser); // Get website settings
router.get('/users/:email/pickup-locations', getPickupLocationsByUser); // Get pickup locations
router.get('/users/:email/info-bar', getInfoBarByUser); // Get active info bar
router.get('/users/:email/modal', getModalByUser); // Get active modal

// Newsletter and discount endpoints
router.post('/users/:email/newsletter', subscribeToNewsletter); // Subscribe to newsletter (with tenant email)
router.post('/newsletter/subscribe', subscribeToNewsletterSimple); // Simple newsletter subscription
router.post('/users/:email/verify-discount', verifyDiscountCodeByUser); // Verify discount code

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

module.exports = router; 