const express = require('express');
const {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  getReservationStats
} = require('../controllers/reservationController');

const { protect, requireStaff } = require('../middleware/authMiddleware');

const router = express.Router();

// Stats route
router.get('/stats', protect, requireStaff, getReservationStats);

// CRUD routes
router.route('/')
  .get(protect, requireStaff, getReservations)
  .post(protect, createReservation);

router.route('/:id')
  .get(protect, getReservation)
  .put(protect, updateReservation);

// Special actions
router.put('/:id/cancel', protect, cancelReservation);
router.put('/:id/checkin', protect, requireStaff, checkInReservation);
router.put('/:id/checkout', protect, requireStaff, checkOutReservation);

module.exports = router; 