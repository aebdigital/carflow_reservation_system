const express = require('express');
const {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  getReservationStats,
  generateReservationContract
} = require('../controllers/reservationController');

const { protect, requireStaff, addTenantFilter } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply tenant filtering to all routes
router.use(protect);
router.use(addTenantFilter);

// Stats route
router.get('/stats', requireStaff, getReservationStats);

// CRUD routes
router.route('/')
  .get(requireStaff, getReservations)
  .post(createReservation);

router.route('/:id')
  .get(getReservation)
  .put(updateReservation);

// Special actions
router.put('/:id/cancel', cancelReservation);
router.put('/:id/checkin', requireStaff, checkInReservation);
router.put('/:id/checkout', requireStaff, checkOutReservation);

// PDF generation
router.get('/:id/contract', generateReservationContract);

module.exports = router; 