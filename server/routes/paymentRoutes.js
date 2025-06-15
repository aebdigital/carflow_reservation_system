const express = require('express');
const {
  createPaymentIntent,
  confirmPayment,
  getPayments,
  getPayment,
  processRefund,
  generateInvoice,
  getPaymentStats
} = require('../controllers/paymentController');

const { protect, requireStaff } = require('../middleware/authMiddleware');

const router = express.Router();

// Stats route
router.get('/stats', protect, requireStaff, getPaymentStats);

// Payment processing routes
router.post('/create-payment-intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);

// CRUD routes
router.route('/')
  .get(protect, requireStaff, getPayments);

router.route('/:id')
  .get(protect, getPayment);

// Special actions
router.post('/:id/refund', protect, requireStaff, processRefund);
router.get('/:id/invoice', protect, generateInvoice);

module.exports = router; 