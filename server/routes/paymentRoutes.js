const express = require('express');
const {
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

// Apply protection and tenant filtering to all routes
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