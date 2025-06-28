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
  searchUsers
} = require('../controllers/userController');

const { protect, requireAdmin, requireStaff, addTenantFilter } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply tenant filtering to all routes
router.use(protect);
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

module.exports = router; 