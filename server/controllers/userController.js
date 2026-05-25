const User = require('../models/User');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get all users (tenant-scoped)
// @route   GET /api/users
// @access  Private/Staff
const getUsers = asyncHandler(async (req, res, next) => {
  console.log('🔍 [USER CONTROLLER] Starting getUsers request');
  console.log('🔍 [USER CONTROLLER] Request query:', req.query);
  console.log('🔍 [USER CONTROLLER] Request user:', {
    id: req.user._id,
    email: req.user.email,
    tenantId: req.user.tenantId,
    role: req.user.role
  });

  // Start with tenant filter and exclude deleted/inactive users by default
  const baseQuery = { 
    tenantId: req.user.tenantId,
    // Only include active users
    isActive: true,
    // Only exclude users with deleted status
    $or: [
      { status: { $ne: 'deleted' } }, // Exclude deleted users
      { status: { $exists: false } }  // Include users without status field (legacy users)
    ]
  };

  console.log('🔍 [USER CONTROLLER] Base query:', JSON.stringify(baseQuery, null, 2));

  // Copy req.query and merge with tenant filter
  const reqQuery = { ...req.query };

  // Allow explicitly requesting inactive users with includeInactive=true
  if (reqQuery.includeInactive === 'true') {
    // Remove status and isActive filtering when including inactive users
    delete baseQuery.$or;
    delete baseQuery.isActive;
  }

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit', 'includeInactive'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify({ ...baseQuery, ...reqQuery });

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource with tenant filter
  let query = User.find(JSON.parse(queryStr));

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
  
  // Debug logging
  console.log('🔍 [USER QUERY DEBUG] Final query filters:', JSON.stringify(JSON.parse(queryStr), null, 2));
  console.log('🔍 [USER QUERY DEBUG] Found users:', users.length);
  console.log('🔍 [USER QUERY DEBUG] User tenant ID:', req.user.tenantId);
  
  // Check total users in different scenarios
  const totalUsers = await User.countDocuments({ role: 'customer' });
  const totalUsersWithTenant = await User.countDocuments({ role: 'customer', tenantId: req.user.tenantId });
  const totalUsersWithoutStatus = await User.countDocuments({ role: 'customer', status: { $exists: false } });
  const totalUsersWithStatus = await User.countDocuments({ role: 'customer', status: { $exists: true } });
  
  console.log('🔍 [USER QUERY DEBUG] Total customers in DB:', totalUsers);
  console.log('🔍 [USER QUERY DEBUG] Total customers with current tenant:', totalUsersWithTenant);
  console.log('🔍 [USER QUERY DEBUG] Total customers without status field:', totalUsersWithoutStatus);
  console.log('🔍 [USER QUERY DEBUG] Total customers with status field:', totalUsersWithStatus);
  
  // Log the first few users to see their structure
  const sampleUsers = await User.find({ role: 'customer' }).limit(3);
  console.log('🔍 [USER QUERY DEBUG] Sample users:', sampleUsers.map(u => ({
    id: u._id,
    email: u.email,
    tenantId: u.tenantId,
    status: u.status,
    isActive: u.isActive,
    role: u.role
  })));
  
  // Log found users details
  if (users.length > 0) {
    console.log('🔍 [USER QUERY DEBUG] Found users details:', users.map(u => ({
      id: u._id,
      email: u.email,
      tenantId: u.tenantId,
      status: u.status,
      isActive: u.isActive,
      role: u.role
    })));
  }

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

// @desc    Get single user (tenant-scoped)
// @route   GET /api/users/:id
// @access  Private/Staff
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user (tenant-scoped)
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
    address,
    idNumber,
    rodneCislo,
    passportNumber,
    residencePermitNumber
  } = req.body;

  // Check if user already exists in this tenant (only when email is provided —
  // customers may be created without an email)
  if (email) {
    const existingUser = await User.findOne({
      email,
      tenantId: req.user.tenantId
    });
    if (existingUser) {
      return next(new AppError('User with this email already exists in this tenant', 400));
    }
  }

  // Create user data with tenant information
  const userData = {
    firstName,
    lastName,
    phone,
    role: role || 'customer',
    tenantId: req.user.tenantId  // Assign to the same tenant as the creator
  };

  // Only include email if provided (customers may have no email)
  if (email) {
    userData.email = email;
  }

  // Only add password if provided (required for admin/staff, optional for customers)
  if (password) {
    userData.password = password;
  }

  // Add customer-specific fields if role is customer (all optional)
  if (userData.role === 'customer') {
    if (licenseNumber) userData.licenseNumber = licenseNumber;
    if (licenseExpiry) userData.licenseExpiry = licenseExpiry;
    if (dateOfBirth) userData.dateOfBirth = dateOfBirth;
    if (idNumber) userData.idNumber = idNumber;
    if (rodneCislo) userData.rodneCislo = rodneCislo;
    if (passportNumber) userData.passportNumber = passportNumber;
    if (residencePermitNumber) userData.residencePermitNumber = residencePermitNumber;
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

// @desc    Update user (tenant-scoped)
// @route   PUT /api/users/:id
// @access  Private/Staff
const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  // Check authorization - users can only update their own profile, staff can update any in their tenant
  if (req.user.role === 'customer' && req.user._id.toString() !== req.params.id) {
    return next(new AppError('Not authorized to update this user', 403));
  }

  // SAFETY: admin/staff records must not be mutable through the customer-update
  // endpoint. The reservation edit flow (customer fields) routes through here and
  // can otherwise rename the tenant admin if they were inadvertently linked as
  // a customer on a reservation. The only exception is the user updating their
  // own record (and even then, identity fields are still filtered below).
  if (
    user.role && user.role !== 'customer' &&
    req.user._id.toString() !== user._id.toString()
  ) {
    return next(new AppError(
      `Používateľ s rolou "${user.role}" sa nedá upravovať cez tento endpoint. Nastavenia účtu zmeňte priamo pre prihláseného používateľa.`,
      403
    ));
  }

  // Remove sensitive fields that shouldn't be updated via this route
  const allowedFields = [
    'firstName',
    'lastName',
    'phone',
    'licenseNumber',
    'licenseExpiry',
    'dateOfBirth',
    'address',
    'idNumber',
    'rodneCislo',
    'passportNumber',
    'residencePermitNumber'
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

  const updatedUser = await User.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    updateData,
    {
    new: true,
    runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: updatedUser
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ 
    _id: req.params.id,
    tenantId: req.user.tenantId  // Ensure tenant scoping
  });

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  // Check if user has active reservations
  const activeReservations = await Reservation.find({
    customer: req.params.id,
    tenantId: req.user.tenantId,  // Include tenant scoping
    status: { $in: ['pending', 'confirmed', 'ongoing'] }
  });

  if (activeReservations.length > 0) {
    return next(new AppError('Cannot delete user with active reservations', 400));
  }

  // Instead of deleting, deactivate the user to preserve data integrity
  await User.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { 
      isActive: false,
      email: `deleted_${Date.now()}_${user.email}`, // Prevent email conflicts
      status: 'deleted'  // Add status field for easier filtering
    }
  );

  res.status(200).json({
    success: true,
    data: {},
    message: 'User successfully deactivated'
  });
});

// @desc    Get user reservations (tenant-scoped)
// @route   GET /api/users/:id/reservations
// @access  Private/Staff
const getUserReservations = asyncHandler(async (req, res, next) => {
  // Ensure user belongs to the same tenant
  const user = await User.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  // Get reservations for this user within the same tenant
  const reservations = await Reservation.find({ 
    customer: req.params.id,
    tenantId: req.user.tenantId
  })
    .populate('car', 'brand model year registrationNumber images')
    .populate('payment', 'status amount paymentMethod')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: reservations.length,
    data: reservations
  });
});

// @desc    Blacklist user (tenant-scoped)
// @route   PUT /api/users/:id/blacklist
// @access  Private/Admin
const blacklistUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!user) {
    return next(new AppError(`User not found with id of ${req.params.id}`, 404));
  }

  const { reason } = req.body;

  user.isBlacklisted = true;
  user.blacklistReason = reason || 'No reason provided';
  user.isActive = false;

  await user.save();

  // Cancel all pending/confirmed reservations for this user within the same tenant
  await Reservation.updateMany(
    {
      customer: req.params.id,
      tenantId: req.user.tenantId,
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

// @desc    Remove user from blacklist (tenant-scoped)
// @route   PUT /api/users/:id/unblacklist
// @access  Private/Admin
const unblacklistUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

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

// @desc    Get user statistics (tenant-scoped)
// @route   GET /api/users/stats
// @access  Private/Staff
const getUserStats = asyncHandler(async (req, res, next) => {
  const tenantId = req.user.tenantId;

  const stats = await User.aggregate([
    {
      $match: { tenantId: tenantId }
    },
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

  const topCustomers = await User.find({ 
    role: 'customer',
    tenantId: tenantId
  })
    .sort('-totalSpent')
    .limit(10)
    .select('firstName lastName email totalBookings totalSpent');

  const recentUsers = await User.find({ tenantId: tenantId })
    .sort('-createdAt')
    .limit(10)
    .select('firstName lastName email role createdAt');

  const monthlyRegistrations = await User.aggregate([
    {
      $match: { tenantId: tenantId }
    },
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

// @desc    Search users (tenant-scoped)
// @route   GET /api/users/search
// @access  Private/Staff
const searchUsers = asyncHandler(async (req, res, next) => {
  const { q, role, status } = req.query;

  if (!q || q.trim().length < 2) {
    return next(new AppError('Search query must be at least 2 characters long', 400));
  }

  let searchQuery = {
    tenantId: req.user.tenantId, // 🔧 ADDED: Tenant scoping
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

// @desc    Toggle email opt-out status for user
// @route   PUT /api/users/:id/email-opt-out
// @access  Private/Admin
const toggleEmailOptOut = asyncHandler(async (req, res, next) => {
  const { optOut, reason } = req.body;
  
  console.log(`🔄 [USER CONTROLLER] Toggling email opt-out for user ${req.params.id}`);
  console.log(`🔄 [USER CONTROLLER] Opt-out status: ${optOut}, Reason: ${reason}`);

  // Find user within tenant scope
  const user = await User.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });

  if (!user) {
    return next(new AppError('User not found or access denied', 404));
  }

  // Update email opt-out status
  user.emailOptOut = optOut;
  if (optOut) {
    user.emailOptOutDate = new Date();
    user.emailOptOutReason = reason || 'Admin action';
  } else {
    user.emailOptOutDate = null;
    user.emailOptOutReason = null;
  }

  await user.save();

  console.log(`✅ [USER CONTROLLER] Email opt-out toggled for user ${user.email}: ${optOut}`);

  res.status(200).json({
    success: true,
    message: `Email ${optOut ? 'opt-out enabled' : 'opt-out disabled'} for user`,
    data: {
      id: user._id,
      email: user.email,
      emailOptOut: user.emailOptOut,
      emailOptOutDate: user.emailOptOutDate,
      emailOptOutReason: user.emailOptOutReason
    }
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
  searchUsers,
  toggleEmailOptOut
}; 