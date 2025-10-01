const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'car-rental-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle MongoDB cast errors (invalid ObjectId)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Handle MongoDB duplicate field errors
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field} = '${value}'. Please use another value.`;
  return new AppError(message, 400);
};

// Handle MongoDB validation errors
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Handle JWT errors
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

// Send error response for development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Send error response for production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);

    // Provide more specific error messages for common issues
    let message = 'Something went wrong!';

    if (err.message && err.message.includes('Stripe not configured')) {
      message = 'Payment system not configured for this rental company. Please contact support.';
    } else if (err.message && err.message.includes('No API key provided')) {
      message = 'Payment system configuration error. Please contact support.';
    } else if (err.name === 'ValidationError') {
      message = 'Invalid data provided. Please check your input.';
    }

    res.status(err.statusCode || 500).json({
      success: false,
      message: message
    });
  }
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, {
    error: err,
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    user: req.user ? { id: req.user._id, email: req.user.email } : null
  });

  // MongoDB cast error
  if (err.name === 'CastError') {
    error = handleCastErrorDB(error);
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    error = handleDuplicateFieldsDB(error);
  }

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    error = handleValidationErrorDB(error);
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    error = new AppError(`Payment processing error: ${err.message}`, 400);
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large. Maximum size is 5MB.', 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Too many files or unexpected field name.', 400);
  }

  // Send appropriate error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 Not Found handler
const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  errorHandler,
  AppError,
  asyncHandler,
  notFound,
  logger
}; 