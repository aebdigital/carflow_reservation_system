const express = require('express');
const {
  createCheckoutSession,
  handleStripeWebhook,
  verifyPayment,
  createPaymentIntent,
  confirmPayment,
  getPayments,
  getPayment,
  updatePaymentStatus,
  processRefund,
  generateInvoice,
  getPaymentStats
} = require('../controllers/paymentController');

const { protect, requireStaff, addTenantFilter, restrictRivalDomain } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes (no authentication required)
router.post('/create-checkout-session', createCheckoutSession);
router.post('/stripe-webhook', express.raw({type: 'application/json'}), handleStripeWebhook);
router.get('/verify/:paymentId', verifyPayment);

// Apply protection and tenant filtering to protected routes
router.use(protect);
router.use(restrictRivalDomain);
router.use(addTenantFilter);

// Stats route
router.get('/stats', requireStaff, getPaymentStats);

// Payment processing routes
router.post('/create-payment-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);

// CRUD routes
router.route('/')
  .get(requireStaff, getPayments);

router.route('/:id')
  .get(getPayment);

// Special actions
router.put('/:id/status', requireStaff, updatePaymentStatus);
router.post('/:id/refund', requireStaff, processRefund);
router.get('/:id/invoice', generateInvoice);

module.exports = router; 