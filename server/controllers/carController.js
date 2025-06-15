const path = require('path');
const Car = require('../models/Car');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { deleteFile } = require('../middleware/upload');
const cloudStorage = require('../services/cloudStorage');

// @desc    Get all cars
// @route   GET /api/cars
// @access  Private/Admin
const getCars = asyncHandler(async (req, res, next) => {
  let query = Car.find();

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
  query = Car.find(JSON.parse(queryStr));

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
  const total = await Car.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Execute query
  const cars = await query;

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
    count: cars.length,
    pagination,
    data: cars
  });
});

// @desc    Get single car
// @route   GET /api/cars/:id
// @access  Private
const getCar = asyncHandler(async (req, res, next) => {
  const car = await Car.findById(req.params.id);

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: car
  });
});

// @desc    Create new car
// @route   POST /api/cars
// @access  Private/Admin
const createCar = asyncHandler(async (req, res, next) => {
  // Parse FormData if it contains nested objects
  if (req.body && typeof req.body === 'object') {
    // Handle location parsing
    if (req.body['location[name]']) {
      req.body.location = {
        name: req.body['location[name]'],
        address: {
          street: req.body['location[address][street]'] || '',
          city: req.body['location[address][city]'] || '',
          state: req.body['location[address][state]'] || '',
          zipCode: req.body['location[address][zipCode]'] || '',
          country: req.body['location[address][country]'] || ''
        }
      };
      
      // Clean up the flat keys
      delete req.body['location[name]'];
      delete req.body['location[address][street]'];
      delete req.body['location[address][city]'];
      delete req.body['location[address][state]'];
      delete req.body['location[address][zipCode]'];
      delete req.body['location[address][country]'];
    }

    // Handle features array
    if (req.body['features[]']) {
      req.body.features = Array.isArray(req.body['features[]']) 
        ? req.body['features[]'] 
        : [req.body['features[]']];
      delete req.body['features[]'];
    }

    // Handle maintenance object
    const maintenanceKeys = Object.keys(req.body).filter(key => key.startsWith('maintenance['));
    if (maintenanceKeys.length > 0) {
      req.body.maintenance = {};
      maintenanceKeys.forEach(key => {
        const fieldName = key.match(/maintenance\[(.+)\]/)?.[1];
        if (fieldName) {
          req.body.maintenance[fieldName] = req.body[key];
          delete req.body[key];
        }
      });
    }

    // Handle insurance object
    const insuranceKeys = Object.keys(req.body).filter(key => key.startsWith('insurance['));
    if (insuranceKeys.length > 0) {
      req.body.insurance = {};
      insuranceKeys.forEach(key => {
        const fieldName = key.match(/insurance\[(.+)\]/)?.[1];
        if (fieldName) {
          req.body.insurance[fieldName] = req.body[key];
          delete req.body[key];
        }
      });
    }
  }

  const carData = { ...req.body };
  
  // Create car first to get the ID
  const car = await Car.create(carData);

  // Handle uploaded images if any
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(async (file, index) => {
      try {
        const result = await cloudStorage.uploadCarImage(
          file.buffer,
          file.originalname,
          car._id.toString(),
          `Car image ${index + 1}`
        );

        return {
          url: result.urls.medium, // Use medium size as default
          description: result.description,
          isPrimary: index === 0,
          filename: result.filename,
          uploadDate: result.uploadDate,
          urls: result.urls // Store all size variants
        };
      } catch (error) {
        console.error(`Failed to upload image ${index + 1}:`, error);
        // If Google Cloud Storage is not configured, create a placeholder
        return {
          url: `/placeholder-car-image-${index + 1}.jpg`,
          description: `Car image ${index + 1} (Upload pending - configure Google Cloud Storage)`,
          isPrimary: index === 0,
          filename: file.originalname,
          uploadDate: new Date(),
          urls: {
            thumbnail: `/placeholder-car-image-${index + 1}-thumb.jpg`,
            medium: `/placeholder-car-image-${index + 1}-medium.jpg`,
            large: `/placeholder-car-image-${index + 1}-large.jpg`,
            original: `/placeholder-car-image-${index + 1}.jpg`
          }
        };
      }
    });

    const uploadedImages = (await Promise.all(uploadPromises)).filter(img => img !== null);
    
    if (uploadedImages.length > 0) {
      car.images = uploadedImages;
      await car.save();
    }
  }

  res.status(201).json({
    success: true,
    data: car
  });
});

// @desc    Update car
// @route   PUT /api/cars/:id
// @access  Private/Admin
const updateCar = asyncHandler(async (req, res, next) => {
  let car = await Car.findById(req.params.id);

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  // Parse FormData if it contains nested objects
  if (req.body && typeof req.body === 'object') {
    // Handle location parsing
    if (req.body['location[name]']) {
      req.body.location = {
        name: req.body['location[name]'],
        address: {
          street: req.body['location[address][street]'] || '',
          city: req.body['location[address][city]'] || '',
          state: req.body['location[address][state]'] || '',
          zipCode: req.body['location[address][zipCode]'] || '',
          country: req.body['location[address][country]'] || ''
        }
      };
      
      // Clean up the flat keys
      delete req.body['location[name]'];
      delete req.body['location[address][street]'];
      delete req.body['location[address][city]'];
      delete req.body['location[address][state]'];
      delete req.body['location[address][zipCode]'];
      delete req.body['location[address][country]'];
    }

    // Handle features array
    if (req.body['features[]']) {
      req.body.features = Array.isArray(req.body['features[]']) 
        ? req.body['features[]'] 
        : [req.body['features[]']];
      delete req.body['features[]'];
    }

    // Handle maintenance object
    const maintenanceKeys = Object.keys(req.body).filter(key => key.startsWith('maintenance['));
    if (maintenanceKeys.length > 0) {
      req.body.maintenance = {};
      maintenanceKeys.forEach(key => {
        const fieldName = key.match(/maintenance\[(.+)\]/)?.[1];
        if (fieldName) {
          req.body.maintenance[fieldName] = req.body[key];
          delete req.body[key];
        }
      });
    }

    // Handle insurance object
    const insuranceKeys = Object.keys(req.body).filter(key => key.startsWith('insurance['));
    if (insuranceKeys.length > 0) {
      req.body.insurance = {};
      insuranceKeys.forEach(key => {
        const fieldName = key.match(/insurance\[(.+)\]/)?.[1];
        if (fieldName) {
          req.body.insurance[fieldName] = req.body[key];
          delete req.body[key];
        }
      });
    }
  }

  // Handle uploaded images
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(async (file, index) => {
      try {
        const result = await cloudStorage.uploadCarImage(
          file.buffer,
          file.originalname,
          car._id.toString(),
          `Car image ${index + 1}`
        );

        return {
          url: result.urls.medium,
          description: result.description,
          isPrimary: index === 0 && (!car.images || car.images.length === 0),
          filename: result.filename,
          uploadDate: result.uploadDate,
          urls: result.urls
        };
      } catch (error) {
        console.error(`Failed to upload image ${index + 1}:`, error);
        // If Google Cloud Storage is not configured, create a placeholder
        return {
          url: `/placeholder-car-image-${index + 1}.jpg`,
          description: `Car image ${index + 1} (Upload pending - configure Google Cloud Storage)`,
          isPrimary: index === 0 && (!car.images || car.images.length === 0),
          filename: file.originalname,
          uploadDate: new Date(),
          urls: {
            thumbnail: `/placeholder-car-image-${index + 1}-thumb.jpg`,
            medium: `/placeholder-car-image-${index + 1}-medium.jpg`,
            large: `/placeholder-car-image-${index + 1}-large.jpg`,
            original: `/placeholder-car-image-${index + 1}.jpg`
          }
        };
      }
    });

    const uploadedImages = (await Promise.all(uploadPromises)).filter(img => img !== null);
    
    if (uploadedImages.length > 0) {
      // Add new images to existing ones
      req.body.images = [...(car.images || []), ...uploadedImages];
    }
  }

  car = await Car.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: car
  });
});

// @desc    Delete car
// @route   DELETE /api/cars/:id
// @access  Private/Admin
const deleteCar = asyncHandler(async (req, res, next) => {
  const car = await Car.findById(req.params.id);

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  // Check if car has active reservations
  const activeReservations = await Reservation.find({
    car: req.params.id,
    status: { $in: ['pending', 'confirmed', 'ongoing'] }
  });

  if (activeReservations.length > 0) {
    return next(new AppError('Cannot delete car with active reservations', 400));
  }

  // Delete associated images
  if (car.images && car.images.length > 0) {
    car.images.forEach(image => {
      if (image.url && image.url.startsWith('/uploads/')) {
        deleteFile(path.join(__dirname, '..', image.url));
      }
    });
  }

  await Car.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get car availability
// @route   GET /api/cars/:id/availability
// @access  Private
const getCarAvailability = asyncHandler(async (req, res, next) => {
  const car = await Car.findById(req.params.id);

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError('Start date and end date are required', 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    return next(new AppError('End date must be after start date', 400));
  }

  // Check for overlapping reservations
  const overlappingReservations = await Reservation.findOverlapping(req.params.id, start, end);

  const isAvailable = overlappingReservations.length === 0 && car.isAvailableForBooking();

  res.status(200).json({
    success: true,
    data: {
      carId: car._id,
      available: isAvailable,
      startDate: start,
      endDate: end,
      conflictingReservations: overlappingReservations.map(res => ({
        id: res._id,
        reservationNumber: res.reservationNumber,
        startDate: res.startDate,
        endDate: res.endDate,
        status: res.status
      }))
    }
  });
});

// @desc    Upload car images
// @route   POST /api/cars/:id/images
// @access  Private/Admin
const uploadCarImages = asyncHandler(async (req, res, next) => {
  const car = await Car.findById(req.params.id);

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  if (!req.files || req.files.length === 0) {
    return next(new AppError('No files uploaded', 400));
  }

  // Check if adding new images would exceed the limit
  const currentImageCount = car.images ? car.images.length : 0;
  const maxImages = parseInt(process.env.MAX_IMAGES_PER_CAR) || 10;
  
  if (currentImageCount + req.files.length > maxImages) {
    return next(new AppError(`Cannot upload ${req.files.length} images. Maximum ${maxImages} images per car. Current: ${currentImageCount}`, 400));
  }

  const uploadPromises = req.files.map(async (file, index) => {
    try {
      const description = req.body.descriptions && req.body.descriptions[index] 
        ? req.body.descriptions[index] 
        : `Car image ${currentImageCount + index + 1}`;

      const result = await cloudStorage.uploadCarImage(
        file.buffer,
        file.originalname,
        car._id.toString(),
        description
      );

      return {
        url: result.urls.medium,
        description: result.description,
        isPrimary: currentImageCount === 0 && index === 0,
        filename: result.filename,
        uploadDate: result.uploadDate,
        urls: result.urls
      };
    } catch (error) {
      console.error(`Failed to upload image ${index + 1}:`, error);
      return null;
    }
  });

  const uploadedImages = (await Promise.all(uploadPromises)).filter(img => img !== null);
  
  if (uploadedImages.length === 0) {
    return next(new AppError('All image uploads failed', 500));
  }

  // Add new images to car
  car.images = [...(car.images || []), ...uploadedImages];
  await car.save();

  res.status(200).json({
    success: true,
    data: {
      message: `${uploadedImages.length} images uploaded successfully`,
      images: uploadedImages,
      car: car
    }
  });
});

// @desc    Delete car image
// @route   DELETE /api/cars/:id/images/:imageIndex
// @access  Private/Admin
const deleteCarImage = asyncHandler(async (req, res, next) => {
  const car = await Car.findById(req.params.id);

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  const imageIndex = parseInt(req.params.imageIndex);
  
  if (!car.images || imageIndex < 0 || imageIndex >= car.images.length) {
    return next(new AppError('Image not found', 404));
  }

  const imageToDelete = car.images[imageIndex];

  try {
    // Delete from Google Cloud Storage
    if (imageToDelete.filename) {
      await cloudStorage.deleteCarImages(car._id.toString(), imageToDelete.filename);
    }
  } catch (error) {
    console.error('Failed to delete image from cloud storage:', error);
    // Continue with database deletion even if cloud deletion fails
  }

  // Remove image from car's images array
  car.images.splice(imageIndex, 1);
  
  // If deleted image was primary and there are other images, make the first one primary
  if (imageToDelete.isPrimary && car.images.length > 0) {
    car.images[0].isPrimary = true;
  }

  await car.save();

  res.status(200).json({
    success: true,
    data: {
      message: 'Image deleted successfully',
      car: car
    }
  });
});

// @desc    Set primary car image
// @route   PUT /api/cars/:id/images/:imageIndex/primary
// @access  Private/Admin
const setPrimaryImage = asyncHandler(async (req, res, next) => {
  const car = await Car.findById(req.params.id);

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  const imageIndex = parseInt(req.params.imageIndex);
  
  if (!car.images || imageIndex < 0 || imageIndex >= car.images.length) {
    return next(new AppError('Image not found', 404));
  }

  // Set all images to not primary
  car.images.forEach(img => img.isPrimary = false);
  
  // Set selected image as primary
  car.images[imageIndex].isPrimary = true;

  await car.save();

  res.status(200).json({
    success: true,
    data: {
      message: 'Primary image updated successfully',
      car: car
    }
  });
});

// @desc    Get cars by location
// @route   GET /api/cars/location/:locationName
// @access  Private
const getCarsByLocation = asyncHandler(async (req, res, next) => {
  const cars = await Car.find({
    'location.name': new RegExp(req.params.locationName, 'i'),
    isActive: true
  });

  res.status(200).json({
    success: true,
    count: cars.length,
    data: cars
  });
});

// @desc    Get car statistics
// @route   GET /api/cars/stats
// @access  Private/Admin
const getCarStats = asyncHandler(async (req, res, next) => {
  const stats = await Car.aggregate([
    {
      $group: {
        _id: null,
        totalCars: { $sum: 1 },
        availableCars: {
          $sum: {
            $cond: [{ $eq: ['$status', 'available'] }, 1, 0]
          }
        },
        maintenanceCars: {
          $sum: {
            $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0]
          }
        },
        outOfServiceCars: {
          $sum: {
            $cond: [{ $eq: ['$status', 'out-of-service'] }, 1, 0]
          }
        },
        averageDailyRate: { $avg: '$dailyRate' },
        totalRevenue: { $sum: '$totalRevenue' }
      }
    }
  ]);

  const categoryStats = await Car.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        averageRate: { $avg: '$dailyRate' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  const locationStats = await Car.aggregate([
    {
      $group: {
        _id: '$location.name',
        count: { $sum: 1 },
        available: {
          $sum: {
            $cond: [{ $eq: ['$status', 'available'] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {
        totalCars: 0,
        availableCars: 0,
        maintenanceCars: 0,
        outOfServiceCars: 0,
        averageDailyRate: 0,
        totalRevenue: 0
      },
      byCategory: categoryStats,
      byLocation: locationStats
    }
  });
});

// @desc    Get car booking calendar
// @route   GET /api/cars/:id/calendar
// @access  Public
const getCarCalendar = asyncHandler(async (req, res, next) => {
  const car = await Car.findById(req.params.id);

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  const { startDate, endDate, includePending } = req.query;
  
  // Default to next 6 months if no dates provided
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000);

  // Determine which reservation statuses to include
  const statusesToInclude = ['confirmed', 'ongoing'];
  if (includePending === 'true') {
    statusesToInclude.push('pending');
  }

  // Get all reservations for this car in the date range
  const reservations = await Reservation.find({
    car: req.params.id,
    status: { $in: statusesToInclude },
    $or: [
      {
        startDate: { $lte: end },
        endDate: { $gte: start }
      }
    ]
  }).select('startDate endDate status reservationNumber');

  // Create calendar data
  const bookedDates = [];
  reservations.forEach(reservation => {
    const reservationStart = new Date(Math.max(reservation.startDate, start));
    const reservationEnd = new Date(Math.min(reservation.endDate, end));
    
    for (let d = new Date(reservationStart); d <= reservationEnd; d.setDate(d.getDate() + 1)) {
      bookedDates.push({
        date: new Date(d).toISOString().split('T')[0],
        reservationNumber: reservation.reservationNumber,
        status: reservation.status
      });
    }
  });

  res.status(200).json({
    success: true,
    data: {
      carId: car._id,
      car: {
        brand: car.brand,
        model: car.model,
        year: car.year,
        status: car.status
      },
      isOperational: car.isAvailableForBooking(),
      calendar: {
        startDate: start,
        endDate: end,
        bookedDates: bookedDates,
        totalBookedDays: bookedDates.length
      }
    }
  });
});

module.exports = {
  getCars,
  getCar,
  createCar,
  updateCar,
  deleteCar,
  getCarAvailability,
  uploadCarImages,
  deleteCarImage,
  getCarsByLocation,
  getCarStats,
  setPrimaryImage,
  getCarCalendar
}; 