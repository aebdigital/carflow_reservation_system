const express = require('express');
const multer = require('multer');
const {
  getBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
  getBannersByPosition,
  getActiveBanners,
  updateSortOrder
} = require('../controllers/bannerController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes (no authentication required)
router.route('/position/:position')
  .get(getBannersByPosition);

router.route('/active')
  .get(getActiveBanners);

// Protected routes require authentication and admin privileges
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// CRUD Routes
router.route('/')
  .get(getBanners)
  .post(upload.single('image'), createBanner);

router.route('/:id')
  .get(getBanner)
  .put(upload.single('image'), updateBanner)
  .delete(deleteBanner);

// Admin-only routes
router.route('/sort-order')
  .put(updateSortOrder);

module.exports = router; 