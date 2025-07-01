const express = require('express');
const {
  getWebsiteSettings,
  updateWebsiteSettings,
  updateInfoBar,
  updateModal,
  toggleInfoBar,
  toggleModal
} = require('../controllers/websiteController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

// General website settings routes
router.route('/settings')
  .get(getWebsiteSettings)
  .put(authorize('admin', 'manager'), updateWebsiteSettings);

// Info bar specific routes
router.route('/settings/info-bar')
  .put(authorize('admin', 'manager'), updateInfoBar);

router.route('/settings/info-bar/toggle')
  .patch(authorize('admin', 'manager'), toggleInfoBar);

// Modal specific routes
router.route('/settings/modal')
  .put(authorize('admin', 'manager'), updateModal);

router.route('/settings/modal/toggle')
  .patch(authorize('admin', 'manager'), toggleModal);

module.exports = router; 