const express = require('express');
const {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  confirmReservation,
  checkInReservation,
  checkOutReservation,
  deleteReservation,
  getReservationStats,
  generateReservationContract,
  generateSlovakAgreement,
  getPDFTemplateFields,
  confirmPayment,
  sendPaymentNotification,
  createInvoice,
  downloadInvoicePdf,
  sendDepositEmail,
  sendConfirmationEmail
} = require('../controllers/reservationController');

const { protect, requireStaff, addTenantFilter, restrictRivalDomain } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply tenant filtering to all routes
router.use(protect);
router.use(restrictRivalDomain);
router.use(addTenantFilter);

// Stats route
router.get('/stats', requireStaff, getReservationStats);

// PDF template debugging route (admin only)
router.get('/pdf-fields', requireStaff, getPDFTemplateFields);

// CRUD routes
router.route('/')
  .get(requireStaff, getReservations)
  .post(createReservation);

router.route('/:id')
  .get(getReservation)
  .put(updateReservation)
  .delete(requireStaff, deleteReservation);

// Special actions
router.put('/:id/cancel', cancelReservation);
router.put('/:id/confirm', confirmReservation);
router.put('/:id/confirm-payment', requireStaff, confirmPayment);
router.post('/:id/send-payment-notification', requireStaff, sendPaymentNotification);
router.post('/:id/send-deposit-email', requireStaff, sendDepositEmail);
router.post('/:id/send-confirmation-email', requireStaff, sendConfirmationEmail);
router.put('/:id/checkin', requireStaff, checkInReservation);
router.put('/:id/checkout', requireStaff, checkOutReservation);

// PDF generation
router.get('/:id/contract', generateReservationContract);
router.get('/:id/slovak-agreement', generateSlovakAgreement);

// SuperFaktura invoice creation (LeRent only)
router.post('/:id/create-invoice', requireStaff, createInvoice);

// SuperFaktura invoice PDF download (LeRent only)
router.get('/:id/invoice-pdf', requireStaff, downloadInvoicePdf);

module.exports = router; 