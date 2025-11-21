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

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ [MULTER] Upload error:', err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    console.error('❌ [UPLOAD] Error:', err.message);
    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid file upload'
    });
  }
  next();
};

// @route   POST /api/brands
// @desc    Create new brand (with optional logo upload)
router.post('/', upload.single('logo'), handleMulterError, createBrand);

// @route   PUT /api/brands/:id
// @desc    Update brand (with optional logo upload)
router.put('/:id', upload.single('logo'), handleMulterError, updateBrand);

// @route   DELETE /api/brands/:id
// @desc    Delete brand (soft delete)
router.delete('/:id', deleteBrand);

module.exports = router;
