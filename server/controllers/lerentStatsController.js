const Car = require('../models/Car');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// LeRent specific email
const LERENT_EMAIL = 'lerent@lerent.sk';

// Helper function to get LeRent tenant ID
const getLerentTenantId = async () => {
  const user = await User.findOne({ email: LERENT_EMAIL.toLowerCase() });
  if (!user) {
    throw new AppError('LeRent tenant not found', 404);
  }
  return user.tenantId;
};

// @desc    Get number of cars for LeRent
// @route   GET /api/lerent-stats/cars-count
// @access  Public
const getCarsCount = asyncHandler(async (req, res, next) => {
  const tenantId = await getLerentTenantId();

  const count = await Car.countDocuments({
    tenantId,
    isActive: true,
    status: 'active'
  });

  res.status(200).json({
    success: true,
    data: {
      carsCount: count
    }
  });
});

// @desc    Get total rental days * 200 for all LeRent reservations
// @route   GET /api/lerent-stats/rental-revenue
// @access  Public
const getRentalRevenue = asyncHandler(async (req, res, next) => {
  const tenantId = await getLerentTenantId();

  // Get all reservations (excluding cancelled and no-show)
  const reservations = await Reservation.find({
    tenantId,
    status: { $nin: ['cancelled', 'no-show'] }
  }).select('startDate endDate pricing.totalDays');

  // Calculate total days
  let totalDays = 0;

  reservations.forEach(reservation => {
    // Use pricing.totalDays if available, otherwise calculate from dates
    if (reservation.pricing && reservation.pricing.totalDays) {
      totalDays += reservation.pricing.totalDays;
    } else if (reservation.startDate && reservation.endDate) {
      const start = new Date(reservation.startDate);
      const end = new Date(reservation.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      totalDays += days > 0 ? days : 0;
    }
  });

  // Multiply by 200
  const revenue = totalDays * 200;

  res.status(200).json({
    success: true,
    data: {
      totalDays: totalDays,
      multiplier: 200,
      revenue: revenue
    }
  });
});

// @desc    Get number of unique customers for LeRent
// @route   GET /api/lerent-stats/unique-customers
// @access  Public
const getUniqueCustomersCount = asyncHandler(async (req, res, next) => {
  const tenantId = await getLerentTenantId();

  // Get unique customer IDs from reservations
  const uniqueCustomers = await Reservation.distinct('customer', {
    tenantId,
    status: { $nin: ['cancelled', 'no-show'] }
  });

  res.status(200).json({
    success: true,
    data: {
      uniqueCustomersCount: uniqueCustomers.length
    }
  });
});

// @desc    Get total number of reservations for LeRent (one request instead
//          of the website counting per car)
// @route   GET /api/lerent-stats/reservations-count
// @access  Public
const getReservationsCount = asyncHandler(async (req, res, next) => {
  const tenantId = await getLerentTenantId();

  const count = await Reservation.countDocuments({
    tenantId,
    status: { $nin: ['cancelled', 'no-show'] }
  });

  res.status(200).json({
    success: true,
    data: {
      reservationsCount: count
    }
  });
});

module.exports = {
  getCarsCount,
  getRentalRevenue,
  getUniqueCustomersCount,
  getReservationsCount
};
