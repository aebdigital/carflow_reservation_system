const express = require('express');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const {
  sendContactEmail,
  sendReservationEmail,
  testEmailService
} = require('../controllers/emailController');

const router = express.Router();

// Public routes
router.post('/', sendContactEmail); // POST /api/send-email
router.post('/contact', sendContactEmail); // Alternative endpoint

// Protected routes
router.use(protect);
router.post('/reservation', sendReservationEmail);

// Admin only routes
router.get('/test', requireAdmin, testEmailService);

module.exports = router; 