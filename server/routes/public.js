// Import additional services controller
const {
  getPublicServices,
  getServicesForVehicle,
  calculateServicePrice
} = require('../controllers/additionalServiceController');

// Additional Services Public Routes
router.get('/services', getPublicServices);
router.get('/services/vehicle/:vehicleId', getServicesForVehicle);
router.post('/services/calculate-price', calculateServicePrice); 