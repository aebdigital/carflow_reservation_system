const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
} = require('../controllers/authController');

const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.post('/logout', protect, logout);

module.exports = router; 