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
  updateSortOrder,
  addBannerImages,
  removeBannerImage,
  reorderBannerImages,
  updateBannerImage,
  updateBannerImageEnglish,
  updateBannerImageHungarian,
  debugBanners,
  migrateBannersToHighRes
} = require('../controllers/bannerController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 6 // Maximum 6 files per request
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

// DEBUG route (temporary - no authentication)
router.route('/debug')
  .get(debugBanners);

// Public routes (no authentication required)
router.route('/position/:position')
  .get(getBannersByPosition);

router.route('/active')
  .get(getActiveBanners);

// Protected routes require authentication and admin privileges
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// Migration route for upgrading to high resolution
router.route('/migrate-to-high-res')
  .post(migrateBannersToHighRes);

// CRUD Routes
router.route('/')
  .get(getBanners)
  .post(upload.array('images', 6), createBanner); // Support multiple files (max 6)

router.route('/:id')
  .get(getBanner)
  .put(upload.array('images', 6), updateBanner) // Support adding multiple new images
  .delete(deleteBanner);

// Image management routes
router.route('/:id/images')
  .post(upload.array('images', 6), addBannerImages); // Add new images to existing banner

router.route('/:id/images/reorder')
  .put(reorderBannerImages); // Reorder images

router.route('/:id/images/:imageId')
  .put(updateBannerImage) // Update image details (title, description, alt)
  .delete(removeBannerImage); // Remove specific image

router.route('/:id/images/:imageId/english')
  .put(updateBannerImageEnglish);

router.route('/:id/images/:imageId/hungarian')
  .put(updateBannerImageHungarian);

// Admin-only routes
router.route('/sort-order')
  .put(updateSortOrder);

module.exports = router; 