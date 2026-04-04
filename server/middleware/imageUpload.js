const multer = require('multer');
const { AppError } = require('./errorHandler');

// Configure multer for memory storage (we'll process and upload to GCS)
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400), false);
  }
};

// File filter that allows images + documents (for admin photos)
const adminFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Allowed: images, PDF, Word, Excel.', 400), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_IMAGE_SIZE) || 10485760, // 10MB default
    files: parseInt(process.env.MAX_IMAGES_PER_CAR) || 10
  }
});

const uploadAdmin = multer({
  storage: storage,
  fileFilter: adminFileFilter,
  limits: {
    fileSize: 20971520, // 20MB
    files: 20
  }
});

// Middleware for single car image upload
const uploadSingleCarImage = upload.single('image');

// Middleware for multiple car images upload
const uploadMultipleCarImages = upload.array('images', parseInt(process.env.MAX_IMAGES_PER_CAR) || 10);

// Middleware for admin photos (images + documents)
const uploadAdminFiles = uploadAdmin.array('images', 20);

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 10MB.', 400));
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError(`Too many files. Maximum ${process.env.MAX_IMAGES_PER_CAR || 10} images allowed.`, 400));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected field name for file upload.', 400));
    }
  }
  next(error);
};

module.exports = {
  uploadSingleCarImage,
  uploadMultipleCarImages,
  uploadAdminFiles,
  handleMulterError
}; 