const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('./errorHandler');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const carsDir = path.join(uploadsDir, 'cars');
const documentsDir = path.join(uploadsDir, 'documents');
const profilesDir = path.join(uploadsDir, 'profiles');

[uploadsDir, carsDir, documentsDir, profilesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;
    
    // Determine upload path based on file field name
    if (file.fieldname === 'carImages' || file.fieldname === 'carImage') {
      uploadPath = carsDir;
    } else if (file.fieldname === 'documents' || file.fieldname === 'document') {
      uploadPath = documentsDir;
    } else if (file.fieldname === 'profileImage' || file.fieldname === 'avatar') {
      uploadPath = profilesDir;
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    
    // Sanitize filename
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, '_');
    
    cb(null, `${sanitizedBasename}_${uniqueSuffix}${extension}`);
  }
});

// File filter for different types
const createFileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Invalid file type. Only ${allowedTypes.join(', ')} are allowed.`, 400), false);
    }
  };
};

// Image file filter
const imageFilter = createFileFilter([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
]);

// Document file filter
const documentFilter = createFileFilter([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png'
]);

// General file filter (images + documents)
const generalFilter = createFileFilter([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

// Upload configurations
const uploadConfig = {
  storage: storage,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB default
    files: 10 // Maximum 10 files per request
  }
};

// Single image upload
const uploadSingleImage = multer({
  ...uploadConfig,
  fileFilter: imageFilter
}).single('image');

// Multiple images upload (for car gallery)
const uploadCarImages = multer({
  ...uploadConfig,
  fileFilter: imageFilter
}).array('carImages', 10);

// Single car image upload
const uploadCarImage = multer({
  ...uploadConfig,
  fileFilter: imageFilter
}).single('carImage');

// Document upload
const uploadDocument = multer({
  ...uploadConfig,
  fileFilter: documentFilter
}).single('document');

// Multiple documents upload
const uploadDocuments = multer({
  ...uploadConfig,
  fileFilter: documentFilter
}).array('documents', 5);

// Profile image upload
const uploadProfileImage = multer({
  ...uploadConfig,
  fileFilter: imageFilter
}).single('profileImage');

// General file upload (mixed types)
const uploadGeneral = multer({
  ...uploadConfig,
  fileFilter: generalFilter
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 }
]);

// Middleware to handle upload errors
const handleUploadErrors = (uploadFunction) => {
  return (req, res, next) => {
    uploadFunction(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('File too large. Maximum size is 5MB.', 400));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new AppError('Too many files. Maximum allowed files exceeded.', 400));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new AppError('Unexpected field name or too many files.', 400));
        }
        return next(new AppError(`Upload error: ${err.message}`, 400));
      }
      if (err) {
        return next(err);
      }
      next();
    });
  };
};

// Utility function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Middleware to clean up files on error
const cleanupOnError = (req, res, next) => {
  const originalNext = next;
  
  next = (err) => {
    if (err && req.files) {
      // Clean up uploaded files on error
      const filesToDelete = [];
      
      if (Array.isArray(req.files)) {
        filesToDelete.push(...req.files);
      } else if (typeof req.files === 'object') {
        Object.values(req.files).forEach(fileArray => {
          if (Array.isArray(fileArray)) {
            filesToDelete.push(...fileArray);
          }
        });
      }
      
      if (req.file) {
        filesToDelete.push(req.file);
      }
      
      filesToDelete.forEach(file => {
        if (file && file.path) {
          deleteFile(file.path);
        }
      });
    }
    
    originalNext(err);
  };
  
  next();
};

// Middleware to validate file requirements
const requireFiles = (fieldNames) => {
  return (req, res, next) => {
    const missingFields = [];
    
    fieldNames.forEach(fieldName => {
      if (!req.files || !req.files[fieldName] || req.files[fieldName].length === 0) {
        if (!req.file || req.file.fieldname !== fieldName) {
          missingFields.push(fieldName);
        }
      }
    });
    
    if (missingFields.length > 0) {
      return next(new AppError(`Missing required files: ${missingFields.join(', ')}`, 400));
    }
    
    next();
  };
};

module.exports = {
  uploadSingleImage: handleUploadErrors(uploadSingleImage),
  uploadCarImages: handleUploadErrors(uploadCarImages),
  uploadCarImage: handleUploadErrors(uploadCarImage),
  uploadDocument: handleUploadErrors(uploadDocument),
  uploadDocuments: handleUploadErrors(uploadDocuments),
  uploadProfileImage: handleUploadErrors(uploadProfileImage),
  uploadGeneral: handleUploadErrors(uploadGeneral),
  cleanupOnError,
  requireFiles,
  deleteFile
}; 