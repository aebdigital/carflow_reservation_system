const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand
} = require('../controllers/brandController');

// Use memory storage for brand logos (we'll upload to GCS)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(protect);

// @route   GET /api/brands
// @desc    Get all brands for logged-in user's tenant
router.get('/', getBrands);

// @route   POST /api/brands
// @desc    Create new brand (with optional logo upload)
router.post('/', upload.single('logo'), createBrand);

// @route   PUT /api/brands/:id
// @desc    Update brand (with optional logo upload)
router.put('/:id', upload.single('logo'), updateBrand);

// @route   DELETE /api/brands/:id
// @desc    Delete brand (soft delete)
router.delete('/:id', deleteBrand);

module.exports = router;
