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
    const adminFields = 'brand model year color category fuelType drivetrain transmission seats doors trunkVolume engine fuelConsumption mileage mileageLimits description pricing location features images equipment badges status internalId registrationNumber vin documentValidity damages statistics notifications maintenance insurance addons createdAt updatedAt isActive';
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
  }).select('brand model year color category fuelType drivetrain transmission seats doors trunkVolume engine fuelConsumption mileage mileageLimits description pricing location features images equipment badges status internalId registrationNumber vin documentValidity damages statistics notifications maintenance insurance addons createdAt updatedAt isActive');

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
    console.log('🚗 [CAR CREATE] ======= ENHANCED DEBUGGING =======');
    console.log('🚗 [CAR CREATE] Starting car creation process...');
    console.log('🚗 [CAR CREATE] Request method:', req.method);
    console.log('🚗 [CAR CREATE] Content-Type:', req.headers['content-type']);
    console.log('🚗 [CAR CREATE] User ID:', req.user?._id);
    console.log('🚗 [CAR CREATE] Tenant ID:', req.user?.tenantId);
    console.log('🚗 [CAR CREATE] Files received:', req.files?.length || 0);
    console.log('🚗 [CAR CREATE] Body keys:', Object.keys(req.body || {}));
    
    // Enhanced file debugging
    if (req.files && req.files.length > 0) {
      console.log('🚗 [CAR CREATE] Files details:');
      req.files.forEach((file, index) => {
        console.log(`🚗 [CAR CREATE] File ${index + 1}:`, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });
      });
    } else {
      console.log('🚗 [CAR CREATE] ❌ No files received!');
    }
    
    // Enhanced body debugging
    console.log('🚗 [CAR CREATE] Body size:', Object.keys(req.body || {}).length);
    if (req.body) {
      // Look for any image-related fields
      const imageFields = Object.keys(req.body).filter(key => key.includes('image') || key.includes('file'));
      console.log('🚗 [CAR CREATE] Image-related fields:', imageFields);
      
      // Check if any fields contain file data
      Object.entries(req.body).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          console.log(`🚗 [CAR CREATE] Object field ${key}:`, typeof value, Array.isArray(value) ? `Array[${value.length}]` : 'Object');
        }
      });
    }
    
    console.log('🚗 [CAR CREATE] =======================================');
  
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

      // Handle equipment array - process nested equipment objects
      const equipmentKeys = Object.keys(req.body).filter(key => key.startsWith('equipment['));
      if (equipmentKeys.length > 0) {
        const equipmentMap = {};
        
        equipmentKeys.forEach(key => {
          try {
            const match = key.match(/equipment\[(\d+)\]\[(.+)\]/);
            if (match) {
              const [, index, field] = match;
              const numIndex = parseInt(index, 10);
              
              if (!equipmentMap[numIndex]) {
                equipmentMap[numIndex] = {};
              }
              equipmentMap[numIndex][field] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing equipment field ${key}:`, error);
          }
        });
        
        // Convert map to array, filtering out empty objects
        req.body.equipment = Object.keys(equipmentMap)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(index => equipmentMap[index])
          .filter(item => item && Object.keys(item).length > 0 && item.name);
        
        console.log('🚗 [CAR CREATE] Processed equipment array:', JSON.stringify(req.body.equipment, null, 2));
      }
      
      // Handle legacy equipment array format (fallback)
      if (req.body['equipment[]']) {
        req.body.equipment = Array.isArray(req.body['equipment[]']) 
          ? req.body['equipment[]'] 
          : [req.body['equipment[]']];
        delete req.body['equipment[]'];
      }

      // Handle badges array - support both old and new format
      if (req.body['badges[]']) {
        // Old format: simple array
        req.body.badges = Array.isArray(req.body['badges[]']) 
          ? req.body['badges[]'] 
          : [req.body['badges[]']];
        delete req.body['badges[]'];
      } else {
        // New format: structured badge objects
        const badges = [];
        let badgeIndex = 0;
        
        while (req.body[`badges[${badgeIndex}][text]`]) {
          const badge = {
            text: req.body[`badges[${badgeIndex}][text]`],
            type: req.body[`badges[${badgeIndex}][type]`] || 'corner',
            style: {
              backgroundColor: req.body[`badges[${badgeIndex}][style][backgroundColor]`] || '#ff4444',
              textColor: req.body[`badges[${badgeIndex}][style][textColor]`] || '#ffffff',
              position: req.body[`badges[${badgeIndex}][style][position]`] || 'top-right'
            },
            priority: parseInt(req.body[`badges[${badgeIndex}][priority]`]) || 0,
            isActive: req.body[`badges[${badgeIndex}][isActive]`] !== 'false'
          };
          
          badges.push(badge);
          
          // Clean up the individual fields
          delete req.body[`badges[${badgeIndex}][text]`];
          delete req.body[`badges[${badgeIndex}][type]`];
          delete req.body[`badges[${badgeIndex}][style][backgroundColor]`];
          delete req.body[`badges[${badgeIndex}][style][textColor]`];
          delete req.body[`badges[${badgeIndex}][style][position]`];
          delete req.body[`badges[${badgeIndex}][priority]`];
          delete req.body[`badges[${badgeIndex}][isActive]`];
          
          badgeIndex++;
        }
        
        if (badges.length > 0) {
          req.body.badges = badges;
        }
      }
      
      // Check for problematic badge data and clean it up
      if (req.body.badges && Array.isArray(req.body.badges)) {
        const cleanBadges = req.body.badges.filter(badge => {
          if (typeof badge === 'string' && badge === '[object Object]') {
            console.log('🚗 [CAR CREATE] Filtering out [object Object] badge');
            return false;
          }
          return true;
        });
        req.body.badges = cleanBadges;
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

    // Handle damages array
    const damagesKeys = Object.keys(req.body).filter(key => key.startsWith('damages['));
    if (damagesKeys.length > 0) {
        console.log('🚗 [CAR CREATE] Processing damages array...');
        req.body.damages = [];
        const damagesMap = {};
        
        damagesKeys.forEach(key => {
            try {
                const match = key.match(/damages\[(\d+)\]\[(.+)\]/);
                if (match) {
                    const [, index, field] = match;
                    if (!damagesMap[index]) {
                        damagesMap[index] = {};
                    }
                    let value = req.body[key];
                    // Try to parse JSON strings (for Date objects, etc.)
                    try {
                        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                            value = JSON.parse(value);
                        }
                    } catch (e) {
                        // Keep original value if JSON parsing fails
                    }
                    damagesMap[index][field] = value;
                    delete req.body[key];
                }
            } catch (error) {
                console.error(`Error processing damages field ${key}:`, error);
            }
        });
        
        // Convert damages map to array
        req.body.damages = Object.keys(damagesMap)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(index => damagesMap[index]);
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

      // Define which fields should be integers vs floats
      const integerFields = new Set([
        'year', 'seats', 'doors', 'trunkVolume',
        'engine.displacement', 'engine.power', 'engine.torque', 'engine.cylinders',
        'fuelConsumption.co2Emissions', 'mileageLimits.dailyLimit', 'mileage.current'
      ]);

      numericFields.forEach(field => {
        try {
          const keys = field.split('.');
          let obj = req.body;
          for (let i = 0; i < keys.length - 1; i++) {
            if (obj && obj[keys[i]] !== undefined && obj[keys[i]] !== null) {
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
              // Convert to number with proper type handling
              let numValue;
              const originalValue = obj[finalKey];
              if (integerFields.has(field)) {
                numValue = parseInt(obj[finalKey], 10);
              } else {
                numValue = parseFloat(obj[finalKey]);
                // Round to 2 decimal places to avoid precision issues
                numValue = Math.round(numValue * 100) / 100;
              }
              
              if (!isNaN(numValue)) {
                obj[finalKey] = numValue;
                console.log(`🚗 [CAR CREATE] Converted ${field}: "${originalValue}" → ${numValue} (${integerFields.has(field) ? 'int' : 'float'})`);
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
      } else {
        // Safety fallback: if mileage object exists but has no current value, set it to 0
        carData.mileage = {
          current: 0,
          lastUpdated: new Date(),
          updatedBy: req.user._id
        };
      }
    } else {
      // Safety fallback: if no mileage provided at all, set default structure
      carData.mileage = {
        current: 0,
        lastUpdated: new Date(),
        updatedBy: req.user._id
      };
    }
    
    console.log('🚗 [CAR CREATE] Set category description and mileage info');
    
    // Comprehensive data cleaning before save
    console.log('🚗 [CAR CREATE] Starting data cleaning...');
    
    // Clean string fields - convert empty strings to undefined for proper defaults
    const stringFields = ['brand', 'model', 'registrationNumber', 'vin', 'color', 'category', 'fuelType', 'drivetrain', 'transmission', 'description'];
    stringFields.forEach(field => {
      if (carData[field] === '' || carData[field] === null) {
        carData[field] = undefined;
      }
    });
    
    // Clean nested string fields
    if (carData.location) {
      if (carData.location.name === '' || carData.location.name === null) {
        carData.location.name = undefined;
      }
      if (carData.location.address) {
        ['street', 'city', 'state', 'zipCode', 'country'].forEach(field => {
          if (carData.location.address[field] === '' || carData.location.address[field] === null) {
            carData.location.address[field] = undefined;
          }
        });
      }
    }
    
    // Clean engine fields
    if (carData.engine) {
      ['displacement', 'power', 'torque', 'cylinders'].forEach(field => {
        if (carData.engine[field] === '' || carData.engine[field] === null) {
          carData.engine[field] = undefined;
        }
      });
    }
    
    // Clean fuel consumption fields
    if (carData.fuelConsumption) {
      ['city', 'highway', 'combined', 'co2Emissions'].forEach(field => {
        if (carData.fuelConsumption[field] === '' || carData.fuelConsumption[field] === null) {
          carData.fuelConsumption[field] = undefined;
        }
      });
    }
    
    // Clean maintenance fields
    if (carData.maintenance) {
      ['lastServiceDate', 'nextServiceDate', 'notes'].forEach(field => {
        if (carData.maintenance[field] === '' || carData.maintenance[field] === null) {
          carData.maintenance[field] = undefined;
        }
      });
      if (carData.maintenance.nextServiceMileage === '' || carData.maintenance.nextServiceMileage === null) {
        carData.maintenance.nextServiceMileage = undefined;
      }
    }
    
    // Clean insurance fields
    if (carData.insurance) {
      ['provider', 'policyNumber', 'expiryDate'].forEach(field => {
        if (carData.insurance[field] === '' || carData.insurance[field] === null) {
          carData.insurance[field] = undefined;
        }
      });
      if (carData.insurance.coverageAmount === '' || carData.insurance.coverageAmount === null) {
        carData.insurance.coverageAmount = undefined;
      }
    }
    
    // Clean document validity fields
    if (carData.documentValidity) {
      ['highwayTollSticker', 'technicalInspection', 'emissionInspection'].forEach(docType => {
        if (carData.documentValidity[docType] && carData.documentValidity[docType].expiryDate === '') {
          carData.documentValidity[docType].expiryDate = undefined;
        }
      });
    }
    
    // Ensure equipment and badges are arrays
    if (!Array.isArray(carData.equipment)) {
      carData.equipment = [];
    }
    if (!Array.isArray(carData.badges)) {
      carData.badges = [];
    }
    if (!Array.isArray(carData.features)) {
      carData.features = [];
    }
    
    console.log('🚗 [CAR CREATE] Data cleaning complete');
    console.log('🚗 [CAR CREATE] Final car data keys:', Object.keys(carData));
    console.log('🚗 [CAR CREATE] ======= COMPLETE DATA DEBUG =======');
    console.log('🚗 [CAR CREATE] Full carData structure:');
    console.log(JSON.stringify(carData, null, 2));
    console.log('🚗 [CAR CREATE] ======= FIELD BY FIELD CHECK =======');
    console.log('🚗 [CAR CREATE] brand:', carData.brand);
    console.log('🚗 [CAR CREATE] model:', carData.model);
    console.log('🚗 [CAR CREATE] year:', carData.year, 'type:', typeof carData.year);
    console.log('🚗 [CAR CREATE] registrationNumber:', carData.registrationNumber);
    console.log('🚗 [CAR CREATE] vin:', carData.vin);
    console.log('🚗 [CAR CREATE] color:', carData.color);
    console.log('🚗 [CAR CREATE] category:', carData.category);
    console.log('🚗 [CAR CREATE] fuelType:', carData.fuelType);
    console.log('🚗 [CAR CREATE] transmission:', carData.transmission);
    console.log('🚗 [CAR CREATE] engine:', JSON.stringify(carData.engine, null, 2));
    console.log('🚗 [CAR CREATE] fuelConsumption:', JSON.stringify(carData.fuelConsumption, null, 2));
    console.log('🚗 [CAR CREATE] mileage:', JSON.stringify(carData.mileage, null, 2));
    console.log('🚗 [CAR CREATE] pricing:', JSON.stringify(carData.pricing, null, 2));
    console.log('🚗 [CAR CREATE] location:', JSON.stringify(carData.location, null, 2));
    console.log('🚗 [CAR CREATE] equipment:', JSON.stringify(carData.equipment, null, 2));
    console.log('🚗 [CAR CREATE] badges:', JSON.stringify(carData.badges, null, 2));
    console.log('🚗 [CAR CREATE] documentValidity:', JSON.stringify(carData.documentValidity, null, 2));
    console.log('🚗 [CAR CREATE] mileageLimits:', JSON.stringify(carData.mileageLimits, null, 2));
    console.log('🚗 [CAR CREATE] maintenance:', JSON.stringify(carData.maintenance, null, 2));
    console.log('🚗 [CAR CREATE] insurance:', JSON.stringify(carData.insurance, null, 2));
    console.log('🚗 [CAR CREATE] =======================================');
    console.log('🚗 [CAR CREATE] ======= MILEAGE DEBUG INFO =======');
    console.log('🚗 [CAR CREATE] carData.mileage type:', typeof carData.mileage);
    console.log('🚗 [CAR CREATE] carData.mileage value:', carData.mileage);
    console.log('🚗 [CAR CREATE] carData.mileage.current:', carData.mileage?.current);
    console.log('🚗 [CAR CREATE] carData.mileage JSON:', JSON.stringify(carData.mileage, null, 2));
    console.log('🚗 [CAR CREATE] ===================================');
    console.log('🚗 [CAR CREATE] Attempting to create car...');
  
  // Create car first to get the ID
    let car;
    try {
      console.log('🚗 [CAR CREATE] Inside try block, calling Car.create...');
      car = await Car.create(carData);
      console.log('🚗 [CAR CREATE] Car created successfully! ID:', car._id);
      console.log('🚗 [CAR CREATE] ======= SAVED CAR DATA =======');
      console.log('🚗 [CAR CREATE] What was saved in MongoDB:');
      console.log(JSON.stringify(car.toObject(), null, 2));
      console.log('🚗 [CAR CREATE] ================================');
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

  // Handle equipment icon uploads if any
  console.log('🚗 [CAR CREATE] Processing equipment icons...');
  if (car.equipment && Array.isArray(car.equipment)) {
    const equipmentIconPromises = car.equipment.map(async (equipmentItem, index) => {
      // Look for equipment icon files in req.files
      const equipmentIconFile = req.files?.find(file => 
        file.fieldname === `equipmentIcon_${index}` || 
        file.fieldname === `equipment[${index}][iconFile]`
      );
      
      if (equipmentIconFile && equipmentItem.name) {
        try {
          console.log(`🚗 [CAR CREATE] Uploading icon for equipment: ${equipmentItem.name}`);
          const iconUrl = await cloudStorage.uploadEquipmentIcon(
            equipmentIconFile.buffer,
            equipmentIconFile.originalname,
            car._id.toString(),
            req.user
          );
          
          // Update the equipment item with the uploaded icon URL
          equipmentItem.icon = iconUrl;
          console.log(`🚗 [CAR CREATE] Icon uploaded successfully: ${iconUrl}`);
          
          return true;
        } catch (error) {
          console.error(`🚗 [CAR CREATE] Failed to upload equipment icon for ${equipmentItem.name}:`, error);
          // Keep the equipment item even if icon upload fails
          return false;
        }
      }
      return false;
    });
    
    // Wait for all icon uploads to complete
    const uploadResults = await Promise.all(equipmentIconPromises);
    const successfulUploads = uploadResults.filter(result => result === true).length;
    
    if (successfulUploads > 0) {
      console.log(`🚗 [CAR CREATE] Successfully uploaded ${successfulUploads} equipment icons`);
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
    
    // DEBUG: Log raw FormData received
    console.log('🚗 [CAR UPDATE] === RAW FORMDATA DEBUG ===');
    console.log('🚗 [CAR UPDATE] Raw body keys:', Object.keys(req.body));
    console.log('🚗 [CAR UPDATE] Raw fuelType:', req.body.fuelType);
    console.log('🚗 [CAR UPDATE] Raw transmission:', req.body.transmission);
    console.log('🚗 [CAR UPDATE] Raw drivetrain:', req.body.drivetrain);
    console.log('🚗 [CAR UPDATE] Raw seats:', req.body.seats);
    console.log('🚗 [CAR UPDATE] Raw doors:', req.body.doors);
    console.log('🚗 [CAR UPDATE] Raw trunkVolume:', req.body.trunkVolume);
    
    // Check for nested objects
    const engineKeys = Object.keys(req.body).filter(k => k.startsWith('engine['));
    const fuelKeys = Object.keys(req.body).filter(k => k.startsWith('fuelConsumption['));
    const mileageLimitKeys = Object.keys(req.body).filter(k => k.startsWith('mileageLimits['));
    console.log('🚗 [CAR UPDATE] Engine keys:', engineKeys);
    console.log('🚗 [CAR UPDATE] Fuel consumption keys:', fuelKeys);
    console.log('🚗 [CAR UPDATE] MileageLimits keys:', mileageLimitKeys);
    console.log('🚗 [CAR UPDATE] ============================');
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
    
    // SAFETY CHECK: Ensure car object is valid before accessing properties
    if (!car || typeof car !== 'object') {
      console.error('🚗 [CAR UPDATE] CRITICAL ERROR: Car object is invalid!');
      console.error('🚗 [CAR UPDATE] Car type:', typeof car);
      console.error('🚗 [CAR UPDATE] Car value:', car);
      return next(new AppError('Invalid car object found', 500));
    }
    
    console.log('🚗 [CAR UPDATE] Step 2a: Existing car mileage type:', typeof (car ? car.mileage : 'undefined car'));
    console.log('🚗 [CAR UPDATE] Step 2b: Existing car mileage value:', car ? car.mileage : 'undefined car');
    console.log('🚗 [CAR UPDATE] Step 2c: Is mileage object?', car && typeof car.mileage === 'object');
    console.log('🚗 [CAR UPDATE] Step 2d: Has current property?', car && car.mileage && car.mileage.hasOwnProperty && car.mileage.hasOwnProperty('current'));

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
      
      // CRITICAL: Verify car object is still valid after refetch
      if (!car) {
        console.error('🚗 [CAR UPDATE] CRITICAL ERROR: Car became undefined after refetch!');
        console.error('🚗 [CAR UPDATE] Car ID:', req.params.id);
        console.error('🚗 [CAR UPDATE] Tenant ID:', req.user.tenantId);
        return next(new AppError('Car not found after mileage conversion', 404));
      }
      
      console.log('🚗 [CAR UPDATE] Step 2i: Car object verified, ID:', car._id);
      console.log('🚗 [CAR UPDATE] Step 2j: Car mileage after refetch:', car.mileage);
    }

    console.log('🚗 [CAR UPDATE] Step 3: Checking if FormData processing needed...');
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

      // Handle equipment array - process nested equipment objects
      const equipmentKeys = Object.keys(req.body).filter(key => key.startsWith('equipment['));
      if (equipmentKeys.length > 0) {
        console.log('🚗 [CAR UPDATE] Step 4h: Processing nested equipment array...');
        const equipmentMap = {};
        
        equipmentKeys.forEach(key => {
          try {
            const match = key.match(/equipment\[(\d+)\]\[(.+)\]/);
            if (match) {
              const [, index, field] = match;
              const numIndex = parseInt(index, 10);
              
              if (!equipmentMap[numIndex]) {
                equipmentMap[numIndex] = {};
              }
              equipmentMap[numIndex][field] = req.body[key];
              delete req.body[key];
            }
          } catch (error) {
            console.error(`Error processing equipment field ${key}:`, error);
          }
        });
        
        // Convert map to array, filtering out empty objects
        req.body.equipment = Object.keys(equipmentMap)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(index => equipmentMap[index])
          .filter(item => item && Object.keys(item).length > 0 && item.name);
        
        console.log('🚗 [CAR UPDATE] Processed equipment array:', JSON.stringify(req.body.equipment, null, 2));
      }
      
      // Handle legacy equipment array format (fallback)
      if (req.body['equipment[]']) {
        console.log('🚗 [CAR UPDATE] Step 4h: Processing legacy equipment array...');
        req.body.equipment = Array.isArray(req.body['equipment[]']) 
          ? req.body['equipment[]'] 
          : [req.body['equipment[]']];
        delete req.body['equipment[]'];
      }

      // Handle badges array - support both old and new format
      if (req.body['badges[]']) {
        console.log('🚗 [CAR UPDATE] Step 4i: Processing badges array (old format)...');
        req.body.badges = Array.isArray(req.body['badges[]']) 
          ? req.body['badges[]'] 
          : [req.body['badges[]']];
        delete req.body['badges[]'];
      } else {
        // New format: structured badge objects
        console.log('🚗 [CAR UPDATE] Step 4i: Processing badges array (new format)...');
        const badges = [];
        let badgeIndex = 0;
        
        while (req.body[`badges[${badgeIndex}][text]`]) {
          const badge = {
            text: req.body[`badges[${badgeIndex}][text]`],
            type: req.body[`badges[${badgeIndex}][type]`] || 'corner',
            style: {
              backgroundColor: req.body[`badges[${badgeIndex}][style][backgroundColor]`] || '#ff4444',
              textColor: req.body[`badges[${badgeIndex}][style][textColor]`] || '#ffffff',
              position: req.body[`badges[${badgeIndex}][style][position]`] || 'top-right'
            },
            priority: parseInt(req.body[`badges[${badgeIndex}][priority]`]) || 0,
            isActive: req.body[`badges[${badgeIndex}][isActive]`] !== 'false'
          };
          
          badges.push(badge);
          
          // Clean up the individual fields
          delete req.body[`badges[${badgeIndex}][text]`];
          delete req.body[`badges[${badgeIndex}][type]`];
          delete req.body[`badges[${badgeIndex}][style][backgroundColor]`];
          delete req.body[`badges[${badgeIndex}][style][textColor]`];
          delete req.body[`badges[${badgeIndex}][style][position]`];
          delete req.body[`badges[${badgeIndex}][priority]`];
          delete req.body[`badges[${badgeIndex}][isActive]`];
          
          badgeIndex++;
        }
        
        if (badges.length > 0) {
          console.log(`🚗 [CAR UPDATE] Processed ${badges.length} badges:`, badges);
          req.body.badges = badges;
        }
      }
      
      // Check for problematic badge data and clean it up
      if (req.body.badges && Array.isArray(req.body.badges)) {
        const cleanBadges = req.body.badges.filter(badge => {
          if (typeof badge === 'string' && badge === '[object Object]') {
            console.log('🚗 [CAR UPDATE] Filtering out [object Object] badge');
            return false;
          }
          return true;
        });
        req.body.badges = cleanBadges;
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

    // Handle damages array
    const damagesKeys = Object.keys(req.body).filter(key => key.startsWith('damages['));
    if (damagesKeys.length > 0) {
        console.log('🚗 [CAR UPDATE] Step 4k2: Processing damages array...');
        req.body.damages = [];
        const damagesMap = {};
        
        damagesKeys.forEach(key => {
            try {
                const match = key.match(/damages\[(\d+)\]\[(.+)\]/);
                if (match) {
                    const [, index, field] = match;
                    if (!damagesMap[index]) {
                        damagesMap[index] = {};
                    }
                    let value = req.body[key];
                    // Try to parse JSON strings (for Date objects, etc.)
                    try {
                        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                            value = JSON.parse(value);
                        }
                    } catch (e) {
                        // Keep original value if JSON parsing fails
                    }
                    damagesMap[index][field] = value;
                    delete req.body[key];
                }
            } catch (error) {
                console.error(`Error processing damages field ${key}:`, error);
            }
        });
        
        // Convert damages map to array
        req.body.damages = Object.keys(damagesMap)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(index => damagesMap[index]);
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

      // Define which fields should be integers vs floats
      const integerFields = new Set([
        'year', 'seats', 'doors', 'trunkVolume',
        'engine.displacement', 'engine.power', 'engine.torque', 'engine.cylinders',
        'fuelConsumption.co2Emissions', 'mileageLimits.dailyLimit', 'mileage.current'
      ]);

      console.log('🚗 [CAR UPDATE] Step 4n: Processing numeric fields...');
      numericFields.forEach(field => {
        try {
          const keys = field.split('.');
          let obj = req.body;
          for (let i = 0; i < keys.length - 1; i++) {
            if (obj && obj[keys[i]] !== undefined && obj[keys[i]] !== null) {
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
              // Convert to number with proper type handling
              let numValue;
              const originalValue = obj[finalKey];
              if (integerFields.has(field)) {
                numValue = parseInt(obj[finalKey], 10);
              } else {
                numValue = parseFloat(obj[finalKey]);
                // Round to 2 decimal places to avoid precision issues
                numValue = Math.round(numValue * 100) / 100;
              }
              
              if (!isNaN(numValue)) {
                obj[finalKey] = numValue;
                console.log(`🚗 [CAR UPDATE] Converted ${field}: "${originalValue}" → ${numValue} (${integerFields.has(field) ? 'int' : 'float'})`);
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
      } else {
        // Safety fallback: if mileage object exists but has no current value, set it to 0
        req.body.mileage = {
          current: 0,
          lastUpdated: new Date(),
          updatedBy: req.user._id
        };
      }
    }

    // Comprehensive data cleaning before update
    console.log('🚗 [CAR UPDATE] Starting data cleaning...');
    
    // Clean string fields - convert empty strings to undefined for proper defaults
    const stringFields = ['brand', 'model', 'registrationNumber', 'vin', 'color', 'category', 'fuelType', 'drivetrain', 'transmission', 'description'];
    stringFields.forEach(field => {
      if (req.body[field] === '' || req.body[field] === null) {
        req.body[field] = undefined;
      }
    });
    
    // Clean nested string fields
    if (req.body.location) {
      if (req.body.location.name === '' || req.body.location.name === null) {
        req.body.location.name = undefined;
      }
      if (req.body.location.address) {
        ['street', 'city', 'state', 'zipCode', 'country'].forEach(field => {
          if (req.body.location.address[field] === '' || req.body.location.address[field] === null) {
            req.body.location.address[field] = undefined;
          }
        });
      }
    }
    
    // Clean engine fields
    if (req.body.engine) {
      ['displacement', 'power', 'torque', 'cylinders'].forEach(field => {
        if (req.body.engine[field] === '' || req.body.engine[field] === null) {
          req.body.engine[field] = undefined;
        }
      });
    }
    
    // Clean fuel consumption fields
    if (req.body.fuelConsumption) {
      ['city', 'highway', 'combined', 'co2Emissions'].forEach(field => {
        if (req.body.fuelConsumption[field] === '' || req.body.fuelConsumption[field] === null) {
          req.body.fuelConsumption[field] = undefined;
        }
      });
    }
    
    // Clean maintenance fields
    if (req.body.maintenance) {
      ['lastServiceDate', 'nextServiceDate', 'notes'].forEach(field => {
        if (req.body.maintenance[field] === '' || req.body.maintenance[field] === null) {
          req.body.maintenance[field] = undefined;
        }
      });
      if (req.body.maintenance.nextServiceMileage === '' || req.body.maintenance.nextServiceMileage === null) {
        req.body.maintenance.nextServiceMileage = undefined;
      }
    }
    
    // Clean insurance fields
    if (req.body.insurance) {
      ['provider', 'policyNumber', 'expiryDate'].forEach(field => {
        if (req.body.insurance[field] === '' || req.body.insurance[field] === null) {
          req.body.insurance[field] = undefined;
        }
      });
      if (req.body.insurance.coverageAmount === '' || req.body.insurance.coverageAmount === null) {
        req.body.insurance.coverageAmount = undefined;
      }
    }
    
    // Clean document validity fields
    if (req.body.documentValidity) {
      ['highwayTollSticker', 'technicalInspection', 'emissionInspection'].forEach(docType => {
        if (req.body.documentValidity[docType] && req.body.documentValidity[docType].expiryDate === '') {
          req.body.documentValidity[docType].expiryDate = undefined;
        }
      });
    }
    
    // Ensure equipment and badges are arrays
    if (req.body.equipment !== undefined && !Array.isArray(req.body.equipment)) {
      req.body.equipment = [];
    }
    if (req.body.badges !== undefined && !Array.isArray(req.body.badges)) {
      req.body.badges = [];
    }
    if (req.body.features !== undefined && !Array.isArray(req.body.features)) {
      req.body.features = [];
    }
    
    console.log('🚗 [CAR UPDATE] Data cleaning complete');
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
    
    // DEBUG: Log all technical data fields
    console.log('🚗 [CAR UPDATE] === TECHNICAL DATA DEBUG ===');
    console.log('🚗 [CAR UPDATE] fuelType:', req.body.fuelType);
    console.log('🚗 [CAR UPDATE] transmission:', req.body.transmission);
    console.log('🚗 [CAR UPDATE] drivetrain:', req.body.drivetrain);
    console.log('🚗 [CAR UPDATE] seats:', req.body.seats);
    console.log('🚗 [CAR UPDATE] doors:', req.body.doors);
    console.log('🚗 [CAR UPDATE] trunkVolume:', req.body.trunkVolume);
    console.log('🚗 [CAR UPDATE] engine:', JSON.stringify(req.body.engine));
    console.log('🚗 [CAR UPDATE] fuelConsumption:', JSON.stringify(req.body.fuelConsumption));
    console.log('🚗 [CAR UPDATE] mileageLimits:', JSON.stringify(req.body.mileageLimits));
    console.log('🚗 [CAR UPDATE] =============================');
    console.log('🚗 [CAR UPDATE] ======= MILEAGE DEBUG INFO =======');
    console.log('🚗 [CAR UPDATE] req.body.mileage type:', typeof req.body.mileage);
    console.log('🚗 [CAR UPDATE] req.body.mileage value:', req.body.mileage);
    console.log('🚗 [CAR UPDATE] req.body.mileage.current:', req.body.mileage?.current);
    console.log('🚗 [CAR UPDATE] req.body.mileage JSON:', JSON.stringify(req.body.mileage, null, 2));
    console.log('🚗 [CAR UPDATE] ===================================');
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
      
      if (!car) {
        console.log('🚗 [CAR UPDATE] Car not found after update attempt');
        return next(new AppError('Car not found or you do not have permission to update it', 404));
      }
      
      console.log('🚗 [CAR UPDATE] Step 8b: Car updated successfully! ID:', car._id);
      
      // Handle equipment icon uploads if any
      console.log('🚗 [CAR UPDATE] Step 8c: Processing equipment icons...');
      if (car.equipment && Array.isArray(car.equipment)) {
        const equipmentIconPromises = car.equipment.map(async (equipmentItem, index) => {
          // Look for equipment icon files in req.files
          const equipmentIconFile = req.files?.find(file => 
            file.fieldname === `equipmentIcon_${index}` || 
            file.fieldname === `equipment[${index}][iconFile]`
          );
          
          if (equipmentIconFile && equipmentItem.name) {
            try {
              console.log(`🚗 [CAR UPDATE] Uploading icon for equipment: ${equipmentItem.name}`);
              const iconUrl = await cloudStorage.uploadEquipmentIcon(
                equipmentIconFile.buffer,
                equipmentIconFile.originalname,
                car._id.toString(),
                req.user
              );
              
              // Update the equipment item with the uploaded icon URL
              equipmentItem.icon = iconUrl;
              console.log(`🚗 [CAR UPDATE] Icon uploaded successfully: ${iconUrl}`);
              
              return true;
            } catch (error) {
              console.error(`🚗 [CAR UPDATE] Failed to upload equipment icon for ${equipmentItem.name}:`, error);
              // Keep the equipment item even if icon upload fails
              return false;
            }
          }
          return false;
        });
        
        // Wait for all icon uploads to complete
        const uploadResults = await Promise.all(equipmentIconPromises);
        const successfulUploads = uploadResults.filter(result => result === true).length;
        
        if (successfulUploads > 0) {
          console.log(`🚗 [CAR UPDATE] Successfully uploaded ${successfulUploads} equipment icons`);
          await car.save();
        }
      }
      
      // DEBUG: Log the updated car's technical data
      console.log('🚗 [CAR UPDATE] === UPDATED CAR TECHNICAL DATA ===');
      console.log('🚗 [CAR UPDATE] Updated fuelType:', car.fuelType);
      console.log('🚗 [CAR UPDATE] Updated transmission:', car.transmission);
      console.log('🚗 [CAR UPDATE] Updated drivetrain:', car.drivetrain);
      console.log('🚗 [CAR UPDATE] Updated seats:', car.seats);
      console.log('🚗 [CAR UPDATE] Updated doors:', car.doors);
      console.log('🚗 [CAR UPDATE] Updated trunkVolume:', car.trunkVolume);
      console.log('🚗 [CAR UPDATE] Updated engine:', JSON.stringify(car.engine));
      console.log('🚗 [CAR UPDATE] Updated fuelConsumption:', JSON.stringify(car.fuelConsumption));
      console.log('🚗 [CAR UPDATE] Updated mileage:', JSON.stringify(car.mileage));
      console.log('🚗 [CAR UPDATE] Updated mileageLimits:', JSON.stringify(car.mileageLimits));
      console.log('🚗 [CAR UPDATE] ===============================');
    } catch (error) {
      console.log('🚗 [CAR UPDATE] Error caught in inner try-catch block:', error.name);
      console.log('🚗 [CAR UPDATE] Error message:', error.message);
      console.log('🚗 [CAR UPDATE] Error code:', error.code);
      console.log('🚗 [CAR UPDATE] Full error:', error);
      
      // Check for validation errors
      if (error.name === 'ValidationError') {
        console.log('🚗 [CAR UPDATE] VALIDATION ERRORS:');
        for (const field in error.errors) {
          console.log(`🚗 [CAR UPDATE] - ${field}: ${error.errors[field].message}`);
        }
      }
      
      // Handle specific MongoDB errors with detailed messages
      if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        const value = (error.keyValue && error.keyValue[field]) || 'value';
        console.log('🚗 [CAR UPDATE] Duplicate key error:', field, value);
        return next(new AppError(`${field} '${value}' already exists. Please use a different value.`, 400));
      }
      
      if (error.name === 'ValidationError') {
        // Validation error - extract meaningful message
        console.log('🚗 [CAR UPDATE] Validation error details:', error.errors);
        const errors = Object.values(error.errors).map(err => {
          // Provide more user-friendly error messages
          if (err.path === 'year' && err.kind === 'min') {
            return 'Year must be 1990 or later';
          }
          if (err.path === 'year' && err.kind === 'max') {
            return 'Year cannot be in the future';
          }
          if (err.path === 'seats' && err.kind === 'min') {
            return 'Car must have at least 1 seat';
          }
          if (err.path === 'seats' && err.kind === 'max') {
            return 'Car cannot have more than 9 seats';
          }
          if (err.path === 'doors' && err.kind === 'min') {
            return 'Car must have at least 2 doors';
          }
          if (err.path === 'doors' && err.kind === 'max') {
            return 'Car cannot have more than 5 doors';
          }
          if (err.path && err.message) {
            return `${err.path}: ${err.message}`;
          }
          return err.message || 'Validation error';
        });
        
        const validationMessage = errors.length > 0 ? errors.join(', ') : 'Validation failed';
        console.log('🚗 [CAR UPDATE] Processed validation message:', validationMessage);
        return next(new AppError(`Validation failed: ${validationMessage}`, 400));
      }
      
      if (error.name === 'CastError') {
        // Handle invalid ObjectId or type casting errors
        console.log('🚗 [CAR UPDATE] Cast error:', error.path, error.value);
        return next(new AppError(`Invalid value for ${error.path}: ${error.value}`, 400));
      }
      
      if (error.message && error.message.includes('Cast to Number failed')) {
        // Handle number conversion errors
        const fieldMatch = error.message.match(/path "([^"]+)"/);
        const field = fieldMatch ? fieldMatch[1] : 'field';
        console.log('🚗 [CAR UPDATE] Number cast error for field:', field);
        return next(new AppError(`Invalid number value for ${field}. Please enter a valid number.`, 400));
      }
      
      // Log the error for debugging but provide user-friendly message
      console.error('🚗 [CAR UPDATE] Unexpected car update error:', error);
      return next(new AppError(`Failed to update car: ${error.message || 'Please check your input and try again.'}`, 400));
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

  // Check if car has truly active reservations (only pending, confirmed, ongoing)
  const activeReservations = await Reservation.find({
    car: req.params.id,
    tenantId: req.user.tenantId,
    status: { $in: ['pending', 'confirmed', 'ongoing'] }
  });

  // Allow deletion if only completed/cancelled reservations exist
  if (activeReservations.length > 0) {
    // Get count of different reservation types for better error message
    const pendingCount = await Reservation.countDocuments({
      car: req.params.id,
      tenantId: req.user.tenantId,
      status: 'pending'
    });
    
    const confirmedCount = await Reservation.countDocuments({
      car: req.params.id,
      tenantId: req.user.tenantId,
      status: 'confirmed'
    });
    
    const ongoingCount = await Reservation.countDocuments({
      car: req.params.id,
      tenantId: req.user.tenantId,
      status: 'ongoing'
    });

    let errorMessage = 'Cannot delete car with active reservations: ';
    const details = [];
    
    if (pendingCount > 0) details.push(`${pendingCount} pending`);
    if (confirmedCount > 0) details.push(`${confirmedCount} confirmed`);
    if (ongoingCount > 0) details.push(`${ongoingCount} ongoing`);
    
    errorMessage += details.join(', ');
    errorMessage += '. Please complete or cancel these reservations first.';

    return next(new AppError(errorMessage, 400));
  }

  // Delete associated images from tenant-specific storage
  if (car.images && car.images.length > 0) {
    try {
      console.log(`🗑️ [DELETE CAR] Deleting ${car.images.length} images for car ${car._id}`);
      await cloudStorage.deleteCarImages(car._id.toString(), req.user);
      console.log(`✅ [DELETE CAR] Successfully deleted images for car ${car._id}`);
    } catch (error) {
      console.error('Failed to delete car images from cloud storage:', error);
      // Continue with car deletion even if image deletion fails
      console.log(`⚠️ [DELETE CAR] Continuing with car deletion despite image deletion failure`);
    }
  }

  // Delete the car
  await Car.findOneAndDelete({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  console.log(`✅ [DELETE CAR] Successfully deleted car ${req.params.id} for tenant ${req.user.tenantId}`);

  res.status(200).json({
    success: true,
    message: 'Car deleted successfully',
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
  const car = await Car.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  const imageIndex = parseInt(req.params.imageId);
  
  if (!car.images || imageIndex < 0 || imageIndex >= car.images.length) {
    return next(new AppError('Image not found', 404));
  }

  const imageToDelete = car.images[imageIndex];

  try {
    // Delete from Google Cloud Storage
    if (imageToDelete.filename) {
      await cloudStorage.deleteCarImages(car._id.toString(), req.user, imageToDelete.filename);
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
  const car = await Car.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  const imageIndex = parseInt(req.params.imageId);
  
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

// @desc    Reorder car images
// @route   PUT /api/cars/:id/images/reorder
// @access  Private/Admin
const reorderCarImages = asyncHandler(async (req, res, next) => {
  const { imageIds } = req.body;

  if (!imageIds || !Array.isArray(imageIds)) {
    return next(new AppError('imageIds array is required', 400));
  }

  const car = await Car.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  if (!car.images || car.images.length === 0) {
    return next(new AppError('Car has no images to reorder', 400));
  }

  // Validate that all imageIds exist in car.images
  const existingImageIds = car.images.map(img => img._id.toString());
  const invalidIds = imageIds.filter(id => !existingImageIds.includes(id));
  
  if (invalidIds.length > 0) {
    return next(new AppError(`Invalid image IDs: ${invalidIds.join(', ')}`, 400));
  }

  if (imageIds.length !== existingImageIds.length) {
    return next(new AppError('All image IDs must be provided for reordering', 400));
  }

  try {
    // Create new ordered images array
    const reorderedImages = [];
    
    imageIds.forEach((imageId, index) => {
      const imageToMove = car.images.find(img => img._id.toString() === imageId);
      if (imageToMove) {
        reorderedImages.push({
          ...imageToMove.toObject(),
          order: index,
          isPrimary: index === 0 // First image is always primary
        });
      }
    });

    // Update car with reordered images
    car.images = reorderedImages;
    await car.save();

    console.log(`✅ [CAR] Images reordered for car ${car._id}: first image is now primary`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Images reordered successfully',
        car: car
      }
    });

  } catch (error) {
    console.error('❌ [CAR] Error reordering images:', error);
    return next(new AppError('Failed to reorder images', 500));
  }
});

// @desc    Get cars by location
// @route   GET /api/cars/location/:locationName
// @access  Private
const getCarsByLocation = asyncHandler(async (req, res, next) => {
  const cars = await Car.find({
    'location.name': new RegExp(req.params.locationName, 'i'),
    isActive: true
  }).select('brand model year color category fuelType drivetrain transmission seats doors trunkVolume engine fuelConsumption mileage mileageLimits description pricing location features images equipment badges status');

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
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
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
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
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

// @desc    Get car status and reservation details for debugging
// @route   GET /api/cars/:id/status
// @access  Private/Admin
const getCarStatus = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!car) {
    return next(new AppError(`Car not found with id of ${req.params.id}`, 404));
  }

  // Get all reservations for this car
  const allReservations = await Reservation.find({
    car: req.params.id,
    tenantId: req.user.tenantId
  }).select('status startDate endDate reservationNumber customer')
    .populate('customer', 'firstName lastName email')
    .sort({ startDate: -1 });

  // Count reservations by status
  const reservationCounts = {
    pending: 0,
    confirmed: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
    total: allReservations.length
  };

  allReservations.forEach(reservation => {
    if (reservationCounts[reservation.status] !== undefined) {
      reservationCounts[reservation.status]++;
    }
  });

  // Check if car can be deleted
  const activeReservations = allReservations.filter(r => 
    ['pending', 'confirmed', 'ongoing'].includes(r.status)
  );

  const canDelete = activeReservations.length === 0;

  res.status(200).json({
    success: true,
    data: {
      car: {
        id: car._id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        registrationNumber: car.registrationNumber,
        status: car.status,
        isActive: car.isActive
      },
      reservationCounts,
      canDelete,
      deleteBlockedBy: canDelete ? null : `${activeReservations.length} active reservations`,
      activeReservations: activeReservations.map(r => ({
        id: r._id,
        reservationNumber: r.reservationNumber,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        customer: r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : 'Unknown'
      })),
      allReservations: allReservations.map(r => ({
        id: r._id,
        reservationNumber: r.reservationNumber,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        customer: r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : 'Unknown'
      }))
    }
  });
});

// @desc    Test file upload endpoint for debugging
// @route   POST /api/cars/test-upload
// @access  Private/Admin
const testFileUpload = asyncHandler(async (req, res, next) => {
  console.log('🧪 [TEST UPLOAD] ======= DEBUGGING FILE UPLOAD =======');
  console.log('🧪 [TEST UPLOAD] Content-Type:', req.headers['content-type']);
  console.log('🧪 [TEST UPLOAD] Files received:', req.files?.length || 0);
  console.log('🧪 [TEST UPLOAD] Body keys:', Object.keys(req.body || {}));
  
  if (req.files && req.files.length > 0) {
    console.log('🧪 [TEST UPLOAD] File details:');
    req.files.forEach((file, index) => {
      console.log(`🧪 [TEST UPLOAD] File ${index + 1}:`, {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });
    });
  } else {
    console.log('🧪 [TEST UPLOAD] ❌ No files received!');
  }
  
  if (req.body) {
    console.log('🧪 [TEST UPLOAD] Body content sample:', Object.keys(req.body).slice(0, 10));
  }
  
  res.status(200).json({
    success: true,
    message: 'Test upload endpoint reached',
    data: {
      filesReceived: req.files?.length || 0,
      bodyFields: Object.keys(req.body || {}).length,
      files: req.files?.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        size: f.size,
        mimetype: f.mimetype
      })) || []
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
  reorderCarImages,
  getCarsByLocation,
  getCarStats,
  setPrimaryImage,
  getCarCalendar,
  getCarStatus,
  testFileUpload
}; 