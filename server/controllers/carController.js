const path = require('path');
const Car = require('../models/Car');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { deleteFile } = require('../middleware/upload');
const cloudStorage = require('../services/cloudStorage');

// @desc    Get all cars (tenant-scoped)
// @route   GET /api/cars
// @access  Private/Admin
const getCars = asyncHandler(async (req, res, next) => {
  // Start with tenant filter
  const baseQuery = { tenantId: req.user.tenantId };

  // Copy req.query and merge with tenant filter
  const reqQuery = { ...req.query };

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify({ ...baseQuery, ...reqQuery });

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource with tenant filter
  let query = Car.find(JSON.parse(queryStr));

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  } else {
    // Default selection for admin - include most fields but handle legacy data safely
    const adminFields = 'brand model year color category fuelType transmission seats doors description pricing location features images equipment badges status internalId registrationNumber vin documentValidity damages statistics notifications maintenance insurance addons createdAt updatedAt isActive';
    query = query.select(adminFields);
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

// @desc    Get single car (tenant-scoped)
// @route   GET /api/cars/:id
// @access  Private
const getCar = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  }).select('brand model year color category fuelType transmission seats doors description pricing location features images equipment badges status internalId registrationNumber vin documentValidity damages statistics notifications maintenance insurance addons createdAt updatedAt isActive');

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: car
  });
});

// @desc    Create new car (tenant-scoped)
// @route   POST /api/cars
// @access  Private/Admin
const createCar = asyncHandler(async (req, res, next) => {
  try {
    console.log('🚗 [CAR CREATE] Starting car creation process...');
    console.log('🚗 [CAR CREATE] Request method:', req.method);
    console.log('🚗 [CAR CREATE] Content-Type:', req.headers['content-type']);
    console.log('🚗 [CAR CREATE] User ID:', req.user?._id);
    console.log('🚗 [CAR CREATE] Tenant ID:', req.user?.tenantId);
    console.log('🚗 [CAR CREATE] Files received:', req.files?.length || 0);
    console.log('🚗 [CAR CREATE] Body keys:', Object.keys(req.body || {}));
  
    // Parse FormData if it contains nested objects
    if (req.body && typeof req.body === 'object') {
      console.log('🚗 [CAR CREATE] Processing FormData...');
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
        Object.keys(req.body).forEach(key => {
          if (key.startsWith('location[')) {
            delete req.body[key];
          }
        });
      }

      // Handle engine object
      const engineKeys = Object.keys(req.body).filter(key => key.startsWith('engine['));
      if (engineKeys.length > 0) {
        req.body.engine = {};
        engineKeys.forEach(key => {
          try {
            const fieldName = key.match(/engine\[(.+)\]/)?.[1];
            if (fieldName) {
              req.body.engine[fieldName] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing engine field ${key}:`, error);
          }
        });
      }

      // Handle mileage object
      const mileageKeys = Object.keys(req.body).filter(key => key.startsWith('mileage['));
      if (mileageKeys.length > 0) {
        req.body.mileage = {};
        mileageKeys.forEach(key => {
          try {
            const fieldName = key.match(/mileage\[(.+)\]/)?.[1];
            if (fieldName) {
              req.body.mileage[fieldName] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing mileage field ${key}:`, error);
          }
        });
      }

      // Handle fuelConsumption object
      const fuelKeys = Object.keys(req.body).filter(key => key.startsWith('fuelConsumption['));
      if (fuelKeys.length > 0) {
        req.body.fuelConsumption = {};
        fuelKeys.forEach(key => {
          try {
            const fieldName = key.match(/fuelConsumption\[(.+)\]/)?.[1];
            if (fieldName) {
              req.body.fuelConsumption[fieldName] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing fuelConsumption field ${key}:`, error);
          }
        });
      }

      // Handle documentValidity nested object
      const docKeys = Object.keys(req.body).filter(key => key.startsWith('documentValidity['));
      if (docKeys.length > 0) {
        req.body.documentValidity = {};
        docKeys.forEach(key => {
          try {
            const match = key.match(/documentValidity\[(.+?)\]\[(.+)\]/);
            if (match) {
              const [, docType, field] = match;
              if (!req.body.documentValidity[docType]) {
                req.body.documentValidity[docType] = {};
              }
              req.body.documentValidity[docType][field] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing documentValidity field ${key}:`, error);
          }
        });
      }

      // Handle pricing object
      const pricingKeys = Object.keys(req.body).filter(key => key.startsWith('pricing['));
      if (pricingKeys.length > 0) {
        req.body.pricing = {};
        pricingKeys.forEach(key => {
          try {
            const match = key.match(/pricing\[(.+?)\](?:\[(.+)\])?/);
            if (match) {
              const [, section, field] = match;
              if (field) {
                // Nested object like pricing[rates][1day]
                if (!req.body.pricing[section]) {
                  req.body.pricing[section] = {};
                }
                req.body.pricing[section][field] = req.body[key];
              } else {
                // Direct field like pricing[dailyRate]
                req.body.pricing[section] = req.body[key];
              }
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing pricing field ${key}:`, error);
          }
        });
      }

      // Handle mileageLimits object
      const mileageLimitKeys = Object.keys(req.body).filter(key => key.startsWith('mileageLimits['));
      if (mileageLimitKeys.length > 0) {
        req.body.mileageLimits = {};
        mileageLimitKeys.forEach(key => {
          try {
            const fieldName = key.match(/mileageLimits\[(.+)\]/)?.[1];
            if (fieldName) {
              req.body.mileageLimits[fieldName] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing mileageLimits field ${key}:`, error);
          }
        });
      }

      // Handle equipment array
      if (req.body['equipment[]']) {
        req.body.equipment = Array.isArray(req.body['equipment[]']) 
          ? req.body['equipment[]'] 
          : [req.body['equipment[]']];
        delete req.body['equipment[]'];
      }

      // Handle badges array
      if (req.body['badges[]']) {
        req.body.badges = Array.isArray(req.body['badges[]']) 
          ? req.body['badges[]'] 
          : [req.body['badges[]']];
        delete req.body['badges[]'];
      }

      // Handle addons array
      if (req.body['addons[]']) {
        req.body.addons = Array.isArray(req.body['addons[]']) 
          ? req.body['addons[]'] 
          : [req.body['addons[]']];
        delete req.body['addons[]'];
      }

      // Handle features array (legacy)
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

      // Convert string numbers to actual numbers for specific fields
      const numericFields = [
        'year', 'seats', 'doors', 'trunkVolume',
        'engine.displacement', 'engine.power', 'engine.torque', 'engine.cylinders',
        'fuelConsumption.city', 'fuelConsumption.highway', 'fuelConsumption.combined', 'fuelConsumption.co2Emissions',
        'pricing.dailyRate', 'pricing.deposit', 'pricing.weeklyRate', 'pricing.monthlyRate',
        'mileageLimits.dailyLimit', 'mileageLimits.excessKmPrice',
        'mileage.current'
      ];

      numericFields.forEach(field => {
        try {
          const keys = field.split('.');
          let obj = req.body;
          for (let i = 0; i < keys.length - 1; i++) {
            if (obj && obj[keys[i]]) {
              obj = obj[keys[i]];
            } else {
              return; // Skip if path doesn't exist
            }
          }
          const finalKey = keys[keys.length - 1];
          if (obj && obj[finalKey] !== undefined) {
            if (obj[finalKey] === '' || obj[finalKey] === null) {
              // Set empty strings/null to undefined so they don't interfere with defaults
              obj[finalKey] = undefined;
            } else {
              // Convert to number if it's a valid numeric value
              const numValue = Number(obj[finalKey]);
              if (!isNaN(numValue)) {
                obj[finalKey] = numValue;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing numeric field ${field}:`, error);
          // Continue processing other fields
        }
      });
    }

    console.log('🚗 [CAR CREATE] FormData processing complete');

    // Add tenant information to car data
    const carData = { 
      ...req.body,
      tenantId: req.user.tenantId,
      owner: req.user._id
    };

    console.log('🚗 [CAR CREATE] Added tenant/owner info');

    // Handle required fields with proper defaults
    if (!carData.pricing) {
      carData.pricing = {};
    }
    
    // Set default values for required pricing fields if they're empty or missing
    if (!carData.pricing.dailyRate || carData.pricing.dailyRate === '') {
      carData.pricing.dailyRate = 0;
    }
    
    if (!carData.pricing.deposit || carData.pricing.deposit === '') {
      carData.pricing.deposit = 0;
    }
    
    console.log('🚗 [CAR CREATE] Set pricing defaults');
    
    // Handle location - provide default if missing
    if (!carData.location || !carData.location.name || carData.location.name.trim() === '') {
      carData.location = {
        name: 'Hlavná pobočka',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'Slovensko'
        }
      };
    }
    
    console.log('🚗 [CAR CREATE] Set location defaults');
    
    // Handle VIN validation - ensure it's a reasonable length but not strict about 17 chars
    if (carData.vin) {
      // Remove any spaces and ensure uppercase
      carData.vin = carData.vin.replace(/\s/g, '').toUpperCase();
      
      // If VIN is less than 17 characters, pad with zeros
      if (carData.vin.length < 17) {
        carData.vin = carData.vin.padEnd(17, '0');
      } else if (carData.vin.length > 17) {
        // If too long, truncate to 17 characters
        carData.vin = carData.vin.substring(0, 17);
      }
    }
    
    // Handle registration number - make it unique by adding tenant prefix if needed
    if (carData.registrationNumber) {
      carData.registrationNumber = carData.registrationNumber.toUpperCase().trim();
    }

    console.log('🚗 [CAR CREATE] Processed VIN and registration');

    // Set default category description if not provided
    if (carData.category && !carData.description) {
      const Car = require('../models/Car');
      const tempCar = new Car({ category: carData.category });
      carData.description = tempCar.getCategoryDescription();
    }

    // Set mileage updatedBy if mileage is provided
    if (carData.mileage !== undefined) {
      // Handle legacy mileage format - ensure it's an object before setting properties
      if (typeof carData.mileage === 'number') {
        // Convert legacy number format to new object format
        carData.mileage = {
          current: carData.mileage,
          lastUpdated: new Date(),
          updatedBy: req.user._id
        };
      } else if (typeof carData.mileage === 'object' && carData.mileage !== null && carData.mileage.current !== undefined) {
        // Ensure lastUpdated and updatedBy are set for object format
        carData.mileage.lastUpdated = new Date();
        carData.mileage.updatedBy = req.user._id;
      }
    }
    
    console.log('🚗 [CAR CREATE] Set category description and mileage info');
    console.log('🚗 [CAR CREATE] Final car data keys:', Object.keys(carData));
    console.log('🚗 [CAR CREATE] Attempting to create car...');

    // Create car first to get the ID
    let car;
    try {
      console.log('🚗 [CAR CREATE] Inside try block, calling Car.create...');
      car = await Car.create(carData);
      console.log('🚗 [CAR CREATE] Car created successfully! ID:', car._id);
    } catch (error) {
      console.log('🚗 [CAR CREATE] Error caught in try-catch block:', error.name);
      console.log('🚗 [CAR CREATE] Error message:', error.message);
      console.log('🚗 [CAR CREATE] Error code:', error.code);
      console.log('🚗 [CAR CREATE] Full error:', error);
      
      // Handle specific MongoDB errors
      if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyPattern)[0];
        const value = error.keyValue[field];
        return next(new AppError(`${field} '${value}' already exists. Please use a different value.`, 400));
      }
      
      if (error.name === 'ValidationError') {
        // Validation error - extract meaningful message
        const errors = Object.values(error.errors).map(err => err.message);
        return next(new AppError(`Validation failed: ${errors.join(', ')}`, 400));
      }
      
      // Log the error for debugging but don't expose details to user
      console.error('Car creation error:', error);
      return next(new AppError('Failed to create car. Please check your input and try again.', 400));
    }

    // Handle uploaded images if any
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file, index) => {
        try {
          const result = await cloudStorage.uploadCarImage(
            file.buffer,
            file.originalname,
            car._id.toString(),
            req.user, // Pass user for tenant-specific folder
            `Car image ${index + 1}`
          );

          return {
            url: result.urls.medium, // Use medium size as default
            description: result.description,
            isPrimary: index === 0,
            filename: result.filename,
            uploadDate: result.uploadDate,
            urls: result.urls, // Store all size variants
            order: index
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
            order: index,
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

    // Check for document validity notifications
    const notifications = car.checkDocumentValidity();
    if (notifications.length > 0) {
      car.notifications = [...(car.notifications || []), ...notifications];
      await car.save();
    }

    res.status(201).json({
      success: true,
      data: car
    });
  } catch (error) {
    console.error('Error in createCar:', error);
    return next(new AppError('Failed to create car. Please check your input and try again.', 400));
  }
});

// @desc    Update car (tenant-scoped)
// @route   PUT /api/cars/:id
// @access  Private/Admin
const updateCar = asyncHandler(async (req, res, next) => {
  try {
    console.log('🚨 [CAR UPDATE] === FUNCTION CALLED WITH LATEST DEBUG CODE ===');
    console.log('🚗 [CAR UPDATE] Starting car update process...');
    console.log('🚗 [CAR UPDATE] Car ID:', req.params.id);
    console.log('🚗 [CAR UPDATE] User ID:', req.user?._id);
    console.log('🚗 [CAR UPDATE] Tenant ID:', req.user?.tenantId);
    console.log('🚗 [CAR UPDATE] Files received:', req.files?.length || 0);
    console.log('🚗 [CAR UPDATE] Body keys:', Object.keys(req.body || {}));
    console.log('🚗 [CAR UPDATE] Raw request body:', JSON.stringify(req.body, null, 2));

    console.log('🚗 [CAR UPDATE] Step 1: Finding existing car...');
    let car = await Car.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    });

    if (!car) {
      console.log('🚗 [CAR UPDATE] Car not found!');
      return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
    }

    console.log('🚗 [CAR UPDATE] Step 2: Found existing car:', car._id);
    console.log('🚗 [CAR UPDATE] Step 2a: Existing car mileage type:', typeof car.mileage);
    console.log('🚗 [CAR UPDATE] Step 2b: Existing car mileage value:', car.mileage);
    console.log('🚗 [CAR UPDATE] Step 2c: Is mileage object?', typeof car.mileage === 'object');
    console.log('🚗 [CAR UPDATE] Step 2d: Has current property?', car.mileage && car.mileage.hasOwnProperty && car.mileage.hasOwnProperty('current'));

    // Convert existing car's mileage to proper format if needed before update
    if (car.mileage !== undefined && typeof car.mileage === 'number') {
      console.log('🚗 [CAR UPDATE] Step 2e: Converting existing car mileage from number to object...');
      // We need to update the existing car in database first
      await Car.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.user.tenantId },
        { 
          mileage: {
            current: car.mileage,
            lastUpdated: new Date(),
            updatedBy: req.user._id
          }
        }
      );
      console.log('🚗 [CAR UPDATE] Step 2f: Existing car mileage converted successfully');
      
      // Refetch the updated car to ensure we have the latest data
      console.log('🚗 [CAR UPDATE] Step 2g: Refetching updated car...');
      car = await Car.findOne({ 
        _id: req.params.id, 
        tenantId: req.user.tenantId 
      });
      console.log('🚗 [CAR UPDATE] Step 2h: Car refetched successfully');
    }

    console.log('�� [CAR UPDATE] Step 3: Checking if FormData processing needed...');
    // Parse FormData if it contains nested objects
    if (req.body && typeof req.body === 'object') {
      console.log('🚗 [CAR UPDATE] Step 4: Starting FormData processing...');
      // Handle location parsing
      if (req.body['location[name]']) {
        console.log('🚗 [CAR UPDATE] Step 4a: Processing location fields...');
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
        Object.keys(req.body).forEach(key => {
          if (key.startsWith('location[')) {
            delete req.body[key];
          }
        });
      }

      // Handle engine object
      const engineKeys = Object.keys(req.body).filter(key => key.startsWith('engine['));
      if (engineKeys.length > 0) {
        console.log('🚗 [CAR UPDATE] Step 4b: Processing engine fields...');
        req.body.engine = {};
        engineKeys.forEach(key => {
          try {
            const fieldName = key.match(/engine\[(.+)\]/)?.[1];
            if (fieldName) {
              req.body.engine[fieldName] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing engine field ${key}:`, error);
          }
        });
      }

      // Handle mileage object
      const mileageKeys = Object.keys(req.body).filter(key => key.startsWith('mileage['));
      if (mileageKeys.length > 0) {
        console.log('🚗 [CAR UPDATE] Step 4c: Processing mileage fields...');
        req.body.mileage = {};
        mileageKeys.forEach(key => {
          try {
            const fieldName = key.match(/mileage\[(.+)\]/)?.[1];
            if (fieldName) {
              req.body.mileage[fieldName] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing mileage field ${key}:`, error);
          }
        });
      }

      // Handle fuelConsumption object
      const fuelKeys = Object.keys(req.body).filter(key => key.startsWith('fuelConsumption['));
      if (fuelKeys.length > 0) {
        console.log('🚗 [CAR UPDATE] Step 4d: Processing fuelConsumption fields...');
        req.body.fuelConsumption = {};
        fuelKeys.forEach(key => {
          try {
            const fieldName = key.match(/fuelConsumption\[(.+)\]/)?.[1];
            if (fieldName) {
              req.body.fuelConsumption[fieldName] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing fuelConsumption field ${key}:`, error);
          }
        });
      }

      // Handle documentValidity nested object
      const docKeys = Object.keys(req.body).filter(key => key.startsWith('documentValidity['));
      if (docKeys.length > 0) {
        console.log('🚗 [CAR UPDATE] Step 4e: Processing documentValidity fields...');
        req.body.documentValidity = {};
        docKeys.forEach(key => {
          try {
            const match = key.match(/documentValidity\[(.+?)\]\[(.+)\]/);
            if (match) {
              const [, docType, field] = match;
              if (!req.body.documentValidity[docType]) {
                req.body.documentValidity[docType] = {};
              }
              req.body.documentValidity[docType][field] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing documentValidity field ${key}:`, error);
          }
        });
      }

      // Handle pricing object
      const pricingKeys = Object.keys(req.body).filter(key => key.startsWith('pricing['));
      if (pricingKeys.length > 0) {
        console.log('🚗 [CAR UPDATE] Step 4f: Processing pricing fields...');
        req.body.pricing = {};
        pricingKeys.forEach(key => {
          try {
            const match = key.match(/pricing\[(.+?)\](?:\[(.+)\])?/);
            if (match) {
              const [, section, field] = match;
              if (field) {
                // Nested object like pricing[rates][1day]
                if (!req.body.pricing[section]) {
                  req.body.pricing[section] = {};
                }
                req.body.pricing[section][field] = req.body[key];
              } else {
                // Direct field like pricing[dailyRate]
                req.body.pricing[section] = req.body[key];
              }
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing pricing field ${key}:`, error);
          }
        });
      }

      // Handle mileageLimits object
      const mileageLimitKeys = Object.keys(req.body).filter(key => key.startsWith('mileageLimits['));
      if (mileageLimitKeys.length > 0) {
        console.log('🚗 [CAR UPDATE] Step 4g: Processing mileageLimits fields...');
        req.body.mileageLimits = {};
        mileageLimitKeys.forEach(key => {
          try {
            const fieldName = key.match(/mileageLimits\[(.+)\]/)?.[1];
            if (fieldName) {
              req.body.mileageLimits[fieldName] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing mileageLimits field ${key}:`, error);
          }
        });
      }

      // Handle equipment array
      if (req.body['equipment[]']) {
        console.log('🚗 [CAR UPDATE] Step 4h: Processing equipment array...');
        req.body.equipment = Array.isArray(req.body['equipment[]']) 
          ? req.body['equipment[]'] 
          : [req.body['equipment[]']];
        delete req.body['equipment[]'];
      }

      // Handle badges array
      if (req.body['badges[]']) {
        console.log('🚗 [CAR UPDATE] Step 4i: Processing badges array...');
        req.body.badges = Array.isArray(req.body['badges[]']) 
          ? req.body['badges[]'] 
          : [req.body['badges[]']];
        delete req.body['badges[]'];
      }

      // Handle addons array
      if (req.body['addons[]']) {
        console.log('🚗 [CAR UPDATE] Step 4j: Processing addons array...');
        req.body.addons = Array.isArray(req.body['addons[]']) 
          ? req.body['addons[]'] 
          : [req.body['addons[]']];
        delete req.body['addons[]'];
      }

      // Handle features array (legacy)
      if (req.body['features[]']) {
        console.log('🚗 [CAR UPDATE] Step 4k: Processing features array...');
        req.body.features = Array.isArray(req.body['features[]']) 
          ? req.body['features[]'] 
          : [req.body['features[]']];
        delete req.body['features[]'];
      }

      // Handle maintenance object
      const maintenanceKeys = Object.keys(req.body).filter(key => key.startsWith('maintenance['));
      if (maintenanceKeys.length > 0) {
        console.log('🚗 [CAR UPDATE] Step 4l: Processing maintenance fields...');
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
        console.log('🚗 [CAR UPDATE] Step 4m: Processing insurance fields...');
        req.body.insurance = {};
        insuranceKeys.forEach(key => {
          const fieldName = key.match(/insurance\[(.+)\]/)?.[1];
          if (fieldName) {
            req.body.insurance[fieldName] = req.body[key];
            delete req.body[key];
          }
        });
      }

      // Convert string numbers to actual numbers for specific fields
      const numericFields = [
        'year', 'seats', 'doors', 'trunkVolume',
        'engine.displacement', 'engine.power', 'engine.torque', 'engine.cylinders',
        'fuelConsumption.city', 'fuelConsumption.highway', 'fuelConsumption.combined', 'fuelConsumption.co2Emissions',
        'pricing.dailyRate', 'pricing.deposit', 'pricing.weeklyRate', 'pricing.monthlyRate',
        'mileageLimits.dailyLimit', 'mileageLimits.excessKmPrice',
        'mileage.current'
      ];

      console.log('🚗 [CAR UPDATE] Step 4n: Processing numeric fields...');
      numericFields.forEach(field => {
        try {
          const keys = field.split('.');
          let obj = req.body;
          for (let i = 0; i < keys.length - 1; i++) {
            if (obj && obj[keys[i]]) {
              obj = obj[keys[i]];
            } else {
              return; // Skip if path doesn't exist
            }
          }
          const finalKey = keys[keys.length - 1];
          if (obj && obj[finalKey] !== undefined) {
            if (obj[finalKey] === '' || obj[finalKey] === null) {
              // Set empty strings/null to undefined so they don't interfere with defaults
              obj[finalKey] = undefined;
            } else {
              // Convert to number if it's a valid numeric value
              const numValue = Number(obj[finalKey]);
              if (!isNaN(numValue)) {
                obj[finalKey] = numValue;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing numeric field ${field}:`, error);
          // Continue processing other fields
        }
      });
    }

    console.log('🚗 [CAR UPDATE] FormData processing complete');
    
    console.log('🚗 [CAR UPDATE] Step 5: Setting mileage updatedBy...');
    // Set mileage updatedBy if mileage is being updated
    if (req.body.mileage !== undefined) {
      // Handle legacy mileage format - ensure it's an object before setting properties
      if (typeof req.body.mileage === 'number') {
        // Convert legacy number format to new object format
        req.body.mileage = {
          current: req.body.mileage,
          lastUpdated: new Date(),
          updatedBy: req.user._id
        };
      } else if (typeof req.body.mileage === 'object' && req.body.mileage !== null && req.body.mileage.current !== undefined) {
        // Ensure lastUpdated and updatedBy are set for object format
        req.body.mileage.lastUpdated = new Date();
        req.body.mileage.updatedBy = req.user._id;
      }
    }

    console.log('�� [CAR UPDATE] Step 6: Checking for uploaded images...');
    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      // Safety check: Ensure car object exists before accessing its properties
      if (!car || !car._id) {
        console.error('🚗 [CAR UPDATE] ERROR: Car object is undefined or invalid during image upload');
        return next(new AppError('Invalid car object during image processing', 500));
      }
      
      console.log('🚗 [CAR UPDATE] Step 6a: Processing uploaded images...');
      const uploadPromises = req.files.map(async (file, index) => {
        try {
          const result = await cloudStorage.uploadCarImage(
            file.buffer,
            file.originalname,
            car._id.toString(),
            req.user, // Pass user for tenant-specific folder
            `Car image ${index + 1}`
          );

          return {
            url: result.urls.medium,
            description: result.description,
            isPrimary: index === 0 && (!car.images || car.images.length === 0),
            filename: result.filename,
            uploadDate: result.uploadDate,
            urls: result.urls,
            order: (car.images?.length || 0) + index
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
            order: (car.images?.length || 0) + index,
            urls: {
              thumbnail: `/placeholder-car-image-${index + 1}-thumb.jpg`,
              medium: `/placeholder-car-image-${index + 1}-medium.jpg`,
              large: `/placeholder-car-image-${index + 1}-large.jpg`,
              original: `/placeholder-car-image-${index + 1}.jpg`
            }
          };
        }
      });

      console.log('🚗 [CAR UPDATE] Step 6b: Waiting for image uploads...');
      const uploadedImages = (await Promise.all(uploadPromises)).filter(img => img !== null);
      
      if (uploadedImages.length > 0) {
        console.log('🚗 [CAR UPDATE] Step 6c: Adding images to request body...');
        // Add new images to existing ones
        req.body.images = [...(car.images || []), ...uploadedImages];
      }
    }
    
    console.log('🚗 [CAR UPDATE] Step 7: Final update data keys:', Object.keys(req.body));
    console.log('🚗 [CAR UPDATE] Step 7a: Final mileage type:', typeof req.body.mileage);
    console.log('🚗 [CAR UPDATE] Step 7b: Final mileage value:', req.body.mileage);
    console.log('🚗 [CAR UPDATE] Step 8: Attempting to update car...');

    try {
      console.log('🚗 [CAR UPDATE] Step 8a: Inside try block, calling findOneAndUpdate...');
      car = await Car.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.user.tenantId },
        req.body,
        {
        new: true,
        runValidators: true
        }
      );
      console.log('🚗 [CAR UPDATE] Step 8b: Car updated successfully! ID:', car._id);
    } catch (error) {
      console.log('🚗 [CAR UPDATE] Error caught in inner try-catch block:', error.name);
      console.log('🚗 [CAR UPDATE] Error message:', error.message);
      console.log('🚗 [CAR UPDATE] Error code:', error.code);
      console.log('🚗 [CAR UPDATE] Full error:', error);
      
      // Handle specific MongoDB errors
      if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyPattern)[0];
        const value = error.keyValue[field];
        return next(new AppError(`${field} '${value}' already exists. Please use a different value.`, 400));
      }
      
      if (error.name === 'ValidationError') {
        // Validation error - extract meaningful message
        const errors = Object.values(error.errors).map(err => err.message);
        return next(new AppError(`Validation failed: ${errors.join(', ')}`, 400));
      }
      
      // Log the error for debugging but don't expose details to user
      console.error('Car update error:', error);
      return next(new AppError('Failed to update car. Please check your input and try again.', 400));
    }

    console.log('🚗 [CAR UPDATE] Step 9: Checking document validity notifications...');
    // Check for document validity notifications after update
    const notifications = car.checkDocumentValidity();
    if (notifications.length > 0) {
      console.log('🚗 [CAR UPDATE] Step 9a: Adding new notifications...');
      // Add new notifications to existing ones
      const existingNotifications = car.notifications || [];
      const newNotifications = notifications.filter(newNotif => 
        !existingNotifications.some(existing => 
          existing.type === newNotif.type && 
          existing.message === newNotif.message &&
          existing.isActive
        )
      );
      
      if (newNotifications.length > 0) {
        car.notifications = [...existingNotifications, ...newNotifications];
        await car.save();
      }
    }

    console.log('🚗 [CAR UPDATE] Step 10: Sending response...');
    res.status(200).json({
      success: true,
      data: car
    });
  } catch (error) {
    console.error('🚗 [CAR UPDATE] OUTER CATCH ERROR - Name:', error.name);
    console.error('🚗 [CAR UPDATE] OUTER CATCH ERROR - Message:', error.message);
    console.error('🚗 [CAR UPDATE] OUTER CATCH ERROR - Stack:', error.stack);
    console.error('🚗 [CAR UPDATE] OUTER CATCH ERROR - Full error object:', error);
    return next(new AppError(`Update failed: ${error.message}`, 400));
  }
});

// @desc    Delete car (tenant-scoped)
// @route   DELETE /api/cars/:id
// @access  Private/Admin
const deleteCar = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  // Check if car has active reservations (tenant-scoped)
  const activeReservations = await Reservation.find({
    car: req.params.id,
    tenantId: req.user.tenantId,
    status: { $in: ['pending', 'confirmed', 'ongoing'] }
  });

  if (activeReservations.length > 0) {
    return next(new AppError('Cannot delete car with active reservations', 400));
  }

  // Delete associated images from tenant-specific storage
  if (car.images && car.images.length > 0) {
    try {
      await cloudStorage.deleteCarImages(car._id.toString(), req.user);
    } catch (error) {
      console.error('Failed to delete car images from cloud storage:', error);
      }
  }

  await Car.findOneAndDelete({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get car availability (tenant-scoped)
// @route   GET /api/cars/:id/availability
// @access  Private
const getCarAvailability = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

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
        req.user, // Pass user for tenant-specific folder
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
  }).select('brand model year color category fuelType transmission seats doors description pricing location features images equipment badges status');

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
  const car = await Car.findById(req.params.id).select('brand model year status isActive');

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