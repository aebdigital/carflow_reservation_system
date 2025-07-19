const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { sendMassEmail, getCampaignStats } = require('../controllers/campaignController');

// Protect all routes - require authentication
router.use(protect);

// Admin only routes
router.use(authorize('admin'));

// @route   POST /api/campaigns/send
// @desc    Send mass email campaign
// @access  Private/Admin
router.post('/send', sendMassEmail);

// @route   GET /api/campaigns/stats
// @desc    Get campaign statistics  
// @access  Private/Admin
router.get('/stats', getCampaignStats);

module.exports = router;