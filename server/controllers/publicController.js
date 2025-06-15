const User = require('../models/User');
const Car = require('../models/Car');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');

// @desc    Create a public reservation (auto-create customer if needed)
// @route   POST /api/public/reservations
// @access  Public
const createPublicReservation = asyncHandler(async (req, res, next) => {
  const {
    // Customer details
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    address,
    licenseNumber,
    licenseExpiry,
    
    // Reservation details
    carId,
    startDate,
    endDate,
    pickupLocation,
    dropoffLocation,
    additionalDrivers,
    specialRequests,
    notes
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !phone || !licenseNumber || !carId || !startDate || !endDate) {
    return next(new AppError('Missing required fields: firstName, lastName, email, phone, licenseNumber, carId, startDate, endDate', 400));
  }

  // Check if car exists and is available
  const car = await Car.findById(carId);
  if (!car) {
    return next(new AppError('Car not found', 404));
  }

  if (car.status !== 'available') {
    return next(new AppError('Car is not available for booking', 400));
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (start < now) {
    return next(new AppError('Start date cannot be in the past', 400));
  }

  if (end <= start) {
    return next(new AppError('End date must be after start date', 400));
  }

  // Check for overlapping reservations
  const overlappingReservations = await Reservation.findOverlapping(carId, start, end);
  if (overlappingReservations.length > 0) {
    return next(new AppError('Car is not available for the selected dates', 400));
  }

  try {
    // Check if user already exists
    let customer = await User.findOne({ email: email.toLowerCase() });

    if (!customer) {
      // Create new customer
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('customer123', salt); // Default password

      customer = await User.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        address: {
          street: address?.street || '',
          city: address?.city || '',
          state: address?.state || '',
          zipCode: address?.zipCode || '',
          country: address?.country || ''
        },
        licenseNumber,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
        role: 'customer',
        isActive: true
      });
    } else {
      // Update existing customer with new information if provided
      if (phone) customer.phone = phone;
      if (dateOfBirth) customer.dateOfBirth = new Date(dateOfBirth);
      if (licenseNumber) customer.licenseNumber = licenseNumber;
      if (licenseExpiry) customer.licenseExpiry = new Date(licenseExpiry);
      if (address) {
        customer.address = {
          street: address.street || customer.address?.street || '',
          city: address.city || customer.address?.city || '',
          state: address.state || customer.address?.state || '',
          zipCode: address.zipCode || customer.address?.zipCode || '',
          country: address.country || customer.address?.country || ''
        };
      }
      await customer.save();
    }

    // Calculate rental duration and total cost
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    let subtotal = car.dailyRate * durationDays;

    // Apply weekly/monthly rates if applicable
    if (durationDays >= 30 && car.monthlyRate) {
      const months = Math.floor(durationDays / 30);
      const remainingDays = durationDays % 30;
      subtotal = (months * car.monthlyRate) + (remainingDays * car.dailyRate);
    } else if (durationDays >= 7 && car.weeklyRate) {
      const weeks = Math.floor(durationDays / 7);
      const remainingDays = durationDays % 7;
      subtotal = (weeks * car.weeklyRate) + (remainingDays * car.dailyRate);
    }

    // Calculate taxes (assuming 10% tax rate)
    const taxes = subtotal * 0.10;
    const totalAmount = subtotal + taxes;

    // Default pickup/dropoff locations if not provided
    const defaultPickup = pickupLocation || {
      name: car.location?.name || 'Main Office',
      address: car.location?.address || {
        street: '123 Main St',
        city: 'City',
        state: 'State',
        zipCode: '12345',
        country: 'Country'
      }
    };

    const defaultDropoff = dropoffLocation || defaultPickup;

    // Create reservation
    const reservation = await Reservation.create({
      customer: customer._id,
      car: carId,
      startDate: start,
      endDate: end,
      pickupLocation: defaultPickup,
      dropoffLocation: defaultDropoff,
      status: 'pending', // Pending approval from staff
      pricing: {
        dailyRate: car.dailyRate,
        totalDays: durationDays,
        subtotal: subtotal,
        taxes: taxes,
        fees: [],
        discounts: [],
        totalAmount: totalAmount
      },
      additionalDrivers: additionalDrivers || [],
      specialRequests: specialRequests || '',
      notes: notes || '',
      terms: {
        mileageLimit: -1, // Unlimited
        fuelPolicy: 'full-to-full',
        cancellationPolicy: 'Free cancellation up to 24 hours before pickup',
        lateReturnFee: 50
      }
    });

    // Save the reservation
    const savedReservation = await reservation.save();

    // Update car stats
    await Car.findByIdAndUpdate(car._id, {
      $inc: { 
        totalBookings: 1,
        totalRevenue: totalAmount
      }
    });

    // Create payment record
    let payment = null;

    // Populate the reservation with customer and car details
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('car', 'brand model year registrationNumber dailyRate images');

    res.status(201).json({
      success: true,
      message: 'Reservation request submitted successfully! You will receive a confirmation email shortly.',
      data: {
        reservation: populatedReservation,
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          isNewCustomer: !customer.createdAt || new Date() - customer.createdAt < 1000
        },
        loginInfo: {
          email: customer.email,
          defaultPassword: customer.createdAt && new Date() - customer.createdAt < 1000 ? 'customer123' : 'Use your existing password',
          message: 'You can log in to track your reservation status'
        }
      }
    });

  } catch (error) {
    throw error;
  }
});

module.exports = {
  createPublicReservation
}; 