const express = require('express');
const multer = require('multer');
const {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  uploadBlogImageHandler,
  toggleBlogStatus
} = require('../controllers/blogController');

const { protect, requireStaff } = require('../middleware/auth');

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload only image files'), false);
    }
  }
});

const router = express.Router();

// All routes require authentication and staff privileges
router.use(protect);
router.use(requireStaff);

// Blog CRUD routes
router.route('/')
  .get(getBlogs)
  .post(createBlog);

router.route('/:id')
  .get(getBlog)
  .put(updateBlog)
  .delete(deleteBlog);

// Image upload route
router.post('/:id/upload-image', upload.single('image'), uploadBlogImageHandler);

// Publish/unpublish blog
router.patch('/:id/publish', toggleBlogStatus);

module.exports = router; 