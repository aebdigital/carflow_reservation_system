const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Generate refresh token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-jwt-key-change-in-production', {
    expiresIn: '7d'
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token to user
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  user.save({ validateBeforeSave: false });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, options)
    .json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      }
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public (but can be restricted to admin only)
const register = asyncHandler(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    role,
    licenseNumber,
    licenseExpiry,
    dateOfBirth,
    address
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('User with this email already exists', 400));
  }

  // Create user data
  const userData = {
    firstName,
    lastName,
    email,
    password,
    phone,
    role: role || 'customer'
  };

  // Add customer-specific fields if role is customer
  if (userData.role === 'customer') {
    if (!licenseNumber || !licenseExpiry || !dateOfBirth) {
      return next(new AppError('License number, license expiry, and date of birth are required for customers', 400));
    }
    userData.licenseNumber = licenseNumber;
    userData.licenseExpiry = licenseExpiry;
    userData.dateOfBirth = dateOfBirth;
  }

  if (address) {
    userData.address = address;
  }

  // Create user
  const user = await User.create(userData);

  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  console.log('DEBUG: Login attempt for email:', email);
  console.log('DEBUG: Password provided:', !!password);

  // Validate email & password
  if (!email || !password) {
    console.log('DEBUG: Missing email or password');
    return next(new AppError('Please provide an email and password', 400));
  }

  // Check for user and include password field
  const user = await User.findOne({ email }).select('+password');
  console.log('DEBUG: User found:', !!user);

  if (!user) {
    console.log('DEBUG: No user found with email:', email);
    return next(new AppError('Invalid credentials', 401));
  }

  // Check if user is active
  if (!user.isActive) {
    console.log('DEBUG: User is not active');
    return next(new AppError('Account has been deactivated', 401));
  }

  // Check if user is blacklisted
  if (user.isBlacklisted) {
    console.log('DEBUG: User is blacklisted');
    return next(new AppError(`Account has been blacklisted${user.blacklistReason ? ': ' + user.blacklistReason : ''}`, 401));
  }

  // Check if password matches
  console.log('DEBUG: About to compare password');
  const isMatch = await user.comparePassword(password);
  console.log('DEBUG: Password match result:', isMatch);

  if (!isMatch) {
    console.log('DEBUG: Password did not match');
    return next(new AppError('Invalid credentials', 401));
  }

  console.log('DEBUG: Login successful, sending token response');
  sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/auth/me
// @access  Private
const updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new AppError('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email', 404));
  }

  // For demo purposes, we'll just send a success response
  // In production, you would generate a reset token and send an email
  res.status(200).json({
    success: true,
    message: 'Password reset instructions have been sent to your email',
    // In demo mode, include reset info
    demo: {
      message: 'This is a demo. In production, an email would be sent.',
      resetToken: 'demo-reset-token-' + Date.now(),
      userId: user._id
    }
  });
});

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  // For demo purposes, just find user by ID embedded in token
  const { resettoken } = req.params;
  
  if (!resettoken.startsWith('demo-reset-token-')) {
    return next(new AppError('Invalid reset token', 400));
  }

  const user = await User.findById(req.body.userId);

  if (!user) {
    return next(new AppError('Invalid reset token', 400));
  }

  // Set new password
  user.password = req.body.password;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return next(new AppError('Refresh token is required', 400));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-jwt-key-change-in-production');
    
    const user = await User.findById(decoded.id);
    
    if (!user || user.refreshToken !== token) {
      return next(new AppError('Invalid refresh token', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Account has been deactivated', 401));
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    return next(new AppError('Invalid refresh token', 401));
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res, next) => {
  // Clear refresh token from user
  await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

  res
    .status(200)
    .cookie('refreshToken', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    })
    .json({
      success: true,
      message: 'User logged out successfully'
    });
});

module.exports = {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
}; 