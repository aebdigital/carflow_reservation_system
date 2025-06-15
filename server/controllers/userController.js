const User = require('../models/User');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Staff
const getUsers = asyncHandler(async (req, res, next) => {
  let query = User.find();

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  query = User.find(JSON.parse(queryStr));

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await User.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Execute query
  const users = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: users.length,
    pagination,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Staff
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res, next) => {
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

  const user = await User.create(userData);

  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Staff
const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  // Check authorization - users can only update their own profile, staff can update any
  if (req.user.role === 'customer' && req.user._id.toString() !== req.params.id) {
    return next(new AppError('Not authorized to update this user', 403));
  }

  // Remove sensitive fields that shouldn't be updated via this route
  const allowedFields = [
    'firstName',
    'lastName',
    'phone',
    'licenseNumber',
    'licenseExpiry',
    'dateOfBirth',
    'address'
  ];

  // Admin can update additional fields
  if (req.user.role === 'admin') {
    allowedFields.push('email', 'role', 'isActive', 'isBlacklisted', 'blacklistReason');
  }

  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: updatedUser
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  // Check if user has active reservations
  const activeReservations = await Reservation.find({
    customer: req.params.id,
    status: { $in: ['pending', 'confirmed', 'ongoing'] }
  });

  if (activeReservations.length > 0) {
    return next(new AppError('Cannot delete user with active reservations', 400));
  }

  // Instead of deleting, deactivate the user to preserve data integrity
  await User.findByIdAndUpdate(req.params.id, { 
    isActive: false,
    email: `deleted_${Date.now()}_${user.email}` // Prevent email conflicts
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get user's reservations
// @route   GET /api/users/:id/reservations
// @access  Private
const getUserReservations = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  // Check authorization
  if (req.user.role === 'customer' && req.user._id.toString() !== req.params.id) {
    return next(new AppError('Not authorized to view this user\'s reservations', 403));
  }

  const reservations = await Reservation.find({ customer: req.params.id })
    .populate('car', 'brand model year registrationNumber images')
    .populate('payment', 'status amount paymentMethod')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: reservations.length,
    data: reservations
  });
});

// @desc    Blacklist user
// @route   PUT /api/users/:id/blacklist
// @access  Private/Admin
const blacklistUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  const { reason } = req.body;

  user.isBlacklisted = true;
  user.blacklistReason = reason || 'No reason provided';
  user.isActive = false;

  await user.save();

  // Cancel all pending/confirmed reservations
  await Reservation.updateMany(
    {
      customer: req.params.id,
      status: { $in: ['pending', 'confirmed'] }
    },
    {
      status: 'cancelled',
      notes: `Cancelled due to blacklisted account: ${reason || 'No reason provided'}`
    }
  );

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Remove user from blacklist
// @route   PUT /api/users/:id/unblacklist
// @access  Private/Admin
const unblacklistUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  user.isBlacklisted = false;
  user.blacklistReason = undefined;
  user.isActive = true;

  await user.save();

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Staff
const getUserStats = asyncHandler(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        blacklistedUsers: {
          $sum: { $cond: [{ $eq: ['$isBlacklisted', true] }, 1, 0] }
        },
        customers: {
          $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 1, 0] }
        },
        staff: {
          $sum: { $cond: [{ $eq: ['$role', 'staff'] }, 1, 0] }
        },
        admins: {
          $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
        },
        totalBookings: { $sum: '$totalBookings' },
        totalSpent: { $sum: '$totalSpent' }
      }
    }
  ]);

  const topCustomers = await User.find({ role: 'customer' })
    .sort('-totalSpent')
    .limit(10)
    .select('firstName lastName email totalBookings totalSpent');

  const recentUsers = await User.find()
    .sort('-createdAt')
    .limit(10)
    .select('firstName lastName email role createdAt');

  const monthlyRegistrations = await User.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        blacklistedUsers: 0,
        customers: 0,
        staff: 0,
        admins: 0,
        totalBookings: 0,
        totalSpent: 0
      },
      topCustomers,
      recentUsers,
      monthlyRegistrations
    }
  });
});

// @desc    Search users
// @route   GET /api/users/search
// @access  Private/Staff
const searchUsers = asyncHandler(async (req, res, next) => {
  const { q, role, status } = req.query;

  if (!q || q.trim().length < 2) {
    return next(new AppError('Search query must be at least 2 characters long', 400));
  }

  let searchQuery = {
    $or: [
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { licenseNumber: { $regex: q, $options: 'i' } }
    ]
  };

  // Add role filter
  if (role) {
    searchQuery.role = role;
  }

  // Add status filter
  if (status === 'active') {
    searchQuery.isActive = true;
    searchQuery.isBlacklisted = false;
  } else if (status === 'inactive') {
    searchQuery.isActive = false;
  } else if (status === 'blacklisted') {
    searchQuery.isBlacklisted = true;
  }

  const users = await User.find(searchQuery)
    .limit(50)
    .select('firstName lastName email phone role isActive isBlacklisted totalBookings totalSpent createdAt')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserReservations,
  blacklistUser,
  unblacklistUser,
  getUserStats,
  searchUsers
}; 