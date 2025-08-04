const Car = require('../models/Car');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ========================================
// EXTENDED INSURANCE (Rozšírené poistenie)
// ========================================

// @desc    Get all extended insurance options for cars
// @route   GET /api/cars/extended-insurance
// @access  Private/Staff
const getExtendedInsuranceOptions = asyncHandler(async (req, res, next) => {
  // Get all cars with their extended insurance addons
  const cars = await Car.find({ 
    tenantId: req.user.tenantId,
    status: 'active' 
  }).select('brand model year addons');

  // Extract extended insurance options
  const extendedInsurance = [];
  cars.forEach(car => {
    if (car.addons && car.addons.length > 0) {
      car.addons.forEach(addon => {
        if (addon.name && addon.name.toLowerCase().includes('poistenie')) {
          extendedInsurance.push({
            carId: car._id,
            carName: `${car.brand} ${car.model} ${car.year}`,
            insuranceId: addon._id,
            name: addon.name,
            description: addon.description,
            price: addon.price,
            unit: addon.unit,
            isAvailable: addon.isAvailable
          });
        }
      });
    }
  });

  res.status(200).json({
    success: true,
    count: extendedInsurance.length,
    data: extendedInsurance
  });
});

// @desc    Add extended insurance option to a car
// @route   POST /api/cars/:carId/extended-insurance
// @access  Private/Staff
const addExtendedInsurance = asyncHandler(async (req, res, next) => {
  const { name, description, price, unit = 'per_day' } = req.body;

  if (!name || !description || price === undefined) {
    return next(new AppError('Názov, popis a cena sú povinné', 400));
  }

  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  });

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  // Add new extended insurance addon
  const newInsurance = {
    name,
    description,
    price: Number(price),
    unit,
    isAvailable: true
  };

  car.addons.push(newInsurance);
  await car.save();

  // Get the added insurance (last item)
  const addedInsurance = car.addons[car.addons.length - 1];

  res.status(201).json({
    success: true,
    message: 'Rozšírené poistenie bolo pridané',
    data: {
      carId: car._id,
      carName: `${car.brand} ${car.model} ${car.year}`,
      insurance: addedInsurance
    }
  });
});

// @desc    Update extended insurance option
// @route   PUT /api/cars/:carId/extended-insurance/:insuranceId
// @access  Private/Staff
const updateExtendedInsurance = asyncHandler(async (req, res, next) => {
  const { name, description, price, unit, isAvailable } = req.body;

  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  });

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  const insurance = car.addons.id(req.params.insuranceId);
  if (!insurance) {
    return next(new AppError('Rozšírené poistenie nebolo nájdené', 404));
  }

  // Update insurance fields
  if (name !== undefined) insurance.name = name;
  if (description !== undefined) insurance.description = description;
  if (price !== undefined) insurance.price = Number(price);
  if (unit !== undefined) insurance.unit = unit;
  if (isAvailable !== undefined) insurance.isAvailable = isAvailable;

  await car.save();

  res.status(200).json({
    success: true,
    message: 'Rozšírené poistenie bolo aktualizované',
    data: {
      carId: car._id,
      carName: `${car.brand} ${car.model} ${car.year}`,
      insurance
    }
  });
});

// @desc    Delete extended insurance option
// @route   DELETE /api/cars/:carId/extended-insurance/:insuranceId
// @access  Private/Staff
const deleteExtendedInsurance = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  });

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  const insurance = car.addons.id(req.params.insuranceId);
  if (!insurance) {
    return next(new AppError('Rozšírené poistenie nebolo nájdené', 404));
  }

  insurance.deleteOne();
  await car.save();

  res.status(200).json({
    success: true,
    message: 'Rozšírené poistenie bolo odstránené',
    data: {}
  });
});

// ========================================
// EQUIPMENT (Výbavy)
// ========================================

// @desc    Get all equipment for cars
// @route   GET /api/cars/equipment
// @access  Private/Staff
const getAllEquipment = asyncHandler(async (req, res, next) => {
  const cars = await Car.find({ 
    tenantId: req.user.tenantId,
    status: 'active' 
  }).select('brand model year equipment');

  // Extract all equipment
  const allEquipment = [];
  cars.forEach(car => {
    if (car.equipment && car.equipment.length > 0) {
      car.equipment.forEach(equipment => {
        allEquipment.push({
          carId: car._id,
          carName: `${car.brand} ${car.model} ${car.year}`,
          equipmentId: equipment._id,
          name: equipment.name,
          icon: equipment.icon,
          description: equipment.description,
          category: equipment.category,
          isStandard: equipment.isStandard
        });
      });
    }
  });

  res.status(200).json({
    success: true,
    count: allEquipment.length,
    data: allEquipment
  });
});

// @desc    Get equipment for specific car
// @route   GET /api/cars/:carId/equipment
// @access  Private/Staff
const getCarEquipment = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  }).select('brand model year equipment');

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  res.status(200).json({
    success: true,
    count: car.equipment.length,
    data: {
      carId: car._id,
      carName: `${car.brand} ${car.model} ${car.year}`,
      equipment: car.equipment
    }
  });
});

// @desc    Add equipment to a car
// @route   POST /api/cars/:carId/equipment
// @access  Private/Staff
const addCarEquipment = asyncHandler(async (req, res, next) => {
  const { name, icon, description, category = 'custom', isStandard = false } = req.body;

  if (!name) {
    return next(new AppError('Názov výbavy je povinný', 400));
  }

  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  });

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  // Add new equipment
  const newEquipment = {
    name,
    icon,
    description,
    category,
    isStandard
  };

  car.equipment.push(newEquipment);
  await car.save();

  // Get the added equipment (last item)
  const addedEquipment = car.equipment[car.equipment.length - 1];

  res.status(201).json({
    success: true,
    message: 'Výbava bola pridaná',
    data: {
      carId: car._id,
      carName: `${car.brand} ${car.model} ${car.year}`,
      equipment: addedEquipment
    }
  });
});

// @desc    Update car equipment
// @route   PUT /api/cars/:carId/equipment/:equipmentId
// @access  Private/Staff
const updateCarEquipment = asyncHandler(async (req, res, next) => {
  const { name, icon, description, category, isStandard } = req.body;

  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  });

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  const equipment = car.equipment.id(req.params.equipmentId);
  if (!equipment) {
    return next(new AppError('Výbava nebola nájdená', 404));
  }

  // Update equipment fields
  if (name !== undefined) equipment.name = name;
  if (icon !== undefined) equipment.icon = icon;
  if (description !== undefined) equipment.description = description;
  if (category !== undefined) equipment.category = category;
  if (isStandard !== undefined) equipment.isStandard = isStandard;

  await car.save();

  res.status(200).json({
    success: true,
    message: 'Výbava bola aktualizovaná',
    data: {
      carId: car._id,
      carName: `${car.brand} ${car.model} ${car.year}`,
      equipment
    }
  });
});

// @desc    Delete car equipment
// @route   DELETE /api/cars/:carId/equipment/:equipmentId
// @access  Private/Staff
const deleteCarEquipment = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  });

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  const equipment = car.equipment.id(req.params.equipmentId);
  if (!equipment) {
    return next(new AppError('Výbava nebola nájdená', 404));
  }

  equipment.deleteOne();
  await car.save();

  res.status(200).json({
    success: true,
    message: 'Výbava bola odstránená',
    data: {}
  });
});

// ========================================
// BADGES (Značky)
// ========================================

// @desc    Get all badges for cars
// @route   GET /api/cars/badges
// @access  Private/Staff
const getAllBadges = asyncHandler(async (req, res, next) => {
  const cars = await Car.find({ 
    tenantId: req.user.tenantId,
    status: 'active' 
  }).select('brand model year badges');

  // Extract all badges
  const allBadges = [];
  cars.forEach(car => {
    if (car.badges && car.badges.length > 0) {
      car.badges.forEach(badge => {
        allBadges.push({
          carId: car._id,
          carName: `${car.brand} ${car.model} ${car.year}`,
          badgeId: badge._id,
          text: badge.text,
          type: badge.type,
          style: badge.style,
          priority: badge.priority,
          isActive: badge.isActive
        });
      });
    }
  });

  res.status(200).json({
    success: true,
    count: allBadges.length,
    data: allBadges
  });
});

// @desc    Get badges for specific car
// @route   GET /api/cars/:carId/badges
// @access  Private/Staff
const getCarBadges = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  }).select('brand model year badges');

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  res.status(200).json({
    success: true,
    count: car.badges.length,
    data: {
      carId: car._id,
      carName: `${car.brand} ${car.model} ${car.year}`,
      badges: car.badges
    }
  });
});

// @desc    Add badge to a car
// @route   POST /api/cars/:carId/badges
// @access  Private/Staff
const addCarBadge = asyncHandler(async (req, res, next) => {
  const { 
    text, 
    type = 'corner', 
    style = {}, 
    priority = 0, 
    isActive = true 
  } = req.body;

  if (!text) {
    return next(new AppError('Text značky je povinný', 400));
  }

  if (text.length > 20) {
    return next(new AppError('Text značky nemôže presiahnuť 20 znakov', 400));
  }

  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  });

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  // Add new badge with default style values
  const newBadge = {
    text,
    type,
    style: {
      backgroundColor: style.backgroundColor || '#ff4444',
      textColor: style.textColor || '#ffffff',
      position: style.position || 'top-right'
    },
    priority,
    isActive
  };

  car.badges.push(newBadge);
  await car.save();

  // Get the added badge (last item)
  const addedBadge = car.badges[car.badges.length - 1];

  res.status(201).json({
    success: true,
    message: 'Značka bola pridaná',
    data: {
      carId: car._id,
      carName: `${car.brand} ${car.model} ${car.year}`,
      badge: addedBadge
    }
  });
});

// @desc    Update car badge
// @route   PUT /api/cars/:carId/badges/:badgeId
// @access  Private/Staff
const updateCarBadge = asyncHandler(async (req, res, next) => {
  const { text, type, style, priority, isActive } = req.body;

  if (text && text.length > 20) {
    return next(new AppError('Text značky nemôže presiahnuť 20 znakov', 400));
  }

  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  });

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  const badge = car.badges.id(req.params.badgeId);
  if (!badge) {
    return next(new AppError('Značka nebola nájdená', 404));
  }

  // Update badge fields
  if (text !== undefined) badge.text = text;
  if (type !== undefined) badge.type = type;
  if (style !== undefined) {
    badge.style = {
      backgroundColor: style.backgroundColor || badge.style.backgroundColor,
      textColor: style.textColor || badge.style.textColor,
      position: style.position || badge.style.position
    };
  }
  if (priority !== undefined) badge.priority = priority;
  if (isActive !== undefined) badge.isActive = isActive;

  await car.save();

  res.status(200).json({
    success: true,
    message: 'Značka bola aktualizovaná',
    data: {
      carId: car._id,
      carName: `${car.brand} ${car.model} ${car.year}`,
      badge
    }
  });
});

// @desc    Delete car badge
// @route   DELETE /api/cars/:carId/badges/:badgeId
// @access  Private/Staff
const deleteCarBadge = asyncHandler(async (req, res, next) => {
  const car = await Car.findOne({
    _id: req.params.carId,
    tenantId: req.user.tenantId
  });

  if (!car) {
    return next(new AppError('Vozidlo nebolo nájdené', 404));
  }

  const badge = car.badges.id(req.params.badgeId);
  if (!badge) {
    return next(new AppError('Značka nebola nájdená', 404));
  }

  badge.deleteOne();
  await car.save();

  res.status(200).json({
    success: true,
    message: 'Značka bola odstránená',
    data: {}
  });
});

module.exports = {
  // Extended Insurance
  getExtendedInsuranceOptions,
  addExtendedInsurance,
  updateExtendedInsurance,
  deleteExtendedInsurance,
  
  // Equipment
  getAllEquipment,
  getCarEquipment,
  addCarEquipment,
  updateCarEquipment,
  deleteCarEquipment,
  
  // Badges
  getAllBadges,
  getCarBadges,
  addCarBadge,
  updateCarBadge,
  deleteCarBadge
};