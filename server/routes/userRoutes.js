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

const { protect, requireAdmin, requireStaff } = require('../middleware/authMiddleware');

const router = express.Router();

// Stats and search routes
router.get('/stats', protect, requireStaff, getUserStats);
router.get('/search', protect, requireStaff, searchUsers);

// CRUD routes
router.route('/')
  .get(protect, requireStaff, getUsers)
  .post(protect, requireAdmin, createUser);

router.route('/:id')
  .get(protect, requireStaff, getUser)
  .put(protect, updateUser)
  .delete(protect, requireAdmin, deleteUser);

// Special routes
router.get('/:id/reservations', protect, getUserReservations);
router.put('/:id/blacklist', protect, requireAdmin, blacklistUser);
router.put('/:id/unblacklist', protect, requireAdmin, unblacklistUser);

module.exports = router; 