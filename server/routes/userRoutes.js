const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserReservations,
  blacklistUser,
  unblacklistUser,
  getUserStats,
  searchUsers,
  toggleEmailOptOut
} = require('../controllers/userController');

const { protect, requireAdmin, requireStaff, addTenantFilter, restrictRivalDomain } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protection and tenant filtering to all routes
router.use(protect);
router.use(restrictRivalDomain);
router.use(addTenantFilter);

// Stats and search routes
router.get('/stats', requireStaff, getUserStats);
router.get('/search', requireStaff, searchUsers);

// CRUD routes
router.route('/')
  .get(requireStaff, getUsers)
  .post(requireAdmin, createUser);

router.route('/:id')
  .get(requireStaff, getUser)
  .put(updateUser)
  .delete(requireAdmin, deleteUser);

// Special routes
router.get('/:id/reservations', getUserReservations);
router.put('/:id/blacklist', requireAdmin, blacklistUser);
router.put('/:id/unblacklist', requireAdmin, unblacklistUser);
router.put('/:id/email-opt-out', requireAdmin, toggleEmailOptOut);

module.exports = router; 