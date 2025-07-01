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

const { protect, requireAdmin, requireStaff } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(protect);

// General website settings routes
router.route('/settings')
  .get(getWebsiteSettings)
  .put(requireAdmin, updateWebsiteSettings);

// Info bar specific routes
router.route('/settings/info-bar')
  .put(requireAdmin, updateInfoBar);

router.route('/settings/info-bar/toggle')
  .patch(requireAdmin, toggleInfoBar);

// Modal specific routes
router.route('/settings/modal')
  .put(requireAdmin, updateModal);

router.route('/settings/modal/toggle')
  .patch(requireAdmin, toggleModal);

module.exports = router; 