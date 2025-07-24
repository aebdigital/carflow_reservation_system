const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  addPickupLocation,
  updatePickupLocation,
  deletePickupLocation,
  sendSupportContact
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validation');
const { body } = require('express-validator');

// Protect all routes
router.use(protect);
router.use(authorize('admin'));

// Settings routes
router.route('/')
  .get(getSettings)
  .put(updateSettings);

// Pickup locations routes
router.route('/pickup-locations')
  .post([
    body('name').notEmpty().withMessage('Name is required'),
    body('address').notEmpty().withMessage('Address is required'),
    validateRequest
  ], addPickupLocation);

router.route('/pickup-locations/:locationId')
  .put(updatePickupLocation)
  .delete(deletePickupLocation);

// Support contact form
router.post('/contact-support', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
  validateRequest
], sendSupportContact);

module.exports = router;