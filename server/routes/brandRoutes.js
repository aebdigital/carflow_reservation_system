const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand
} = require('../controllers/brandController');

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
