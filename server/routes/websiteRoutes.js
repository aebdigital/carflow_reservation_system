const express = require('express');
const {
  getWebsiteSettings,
  updateWebsiteSettings,
  updateInfoBar,
  toggleInfoBar,
  // Modal CRUD operations
  getModals,
  createModal,
  updateModal,
  deleteModal,
  toggleModal,
  getActiveModals,
  recordModalAnalytics
} = require('../controllers/websiteController');

const router = express.Router();

const { protect, requireAdmin, requireStaff } = require('../middleware/authMiddleware');

// PUBLIC MODAL ROUTES (NO AUTHENTICATION REQUIRED) - Must be before protect middleware
router.route('/modals/active/:page?')
  .get(getActiveModals);

router.route('/modals/:id/analytics')
  .post(recordModalAnalytics);

// Apply authentication to all routes below this point
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

// Modal CRUD routes
router.route('/modals')
  .get(getModals)
  .post(requireAdmin, createModal);

router.route('/modals/:id')
  .put(requireAdmin, updateModal)
  .delete(requireAdmin, deleteModal);

router.route('/modals/:id/toggle')
  .patch(requireAdmin, toggleModal);

module.exports = router; 