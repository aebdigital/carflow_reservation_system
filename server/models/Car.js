const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  // Tenant separation - each car belongs to a specific tenant
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  // Owner of the car (admin/staff user who added it)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 1. IDENTIFIKÁCIA VOZIDLA
  internalId: {
    type: String,
    unique: true,
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxLength: [50, 'Brand cannot exceed 50 characters']
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true,
    maxLength: [50, 'Model cannot exceed 50 characters']
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1990, 'Year must be 1990 or later'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    trim: true,
    uppercase: true
  },
  vin: {
    type: String,
    required: [true, 'VIN is required'],
    trim: true,
    uppercase: true
  },
  color: {
    type: String,
    required: [true, 'Color is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['economy', 'compact', 'midsize', 'fullsize', 'luxury', 'suv', 'minivan', 'convertible', 'sports', 'utility', 'caravan', 'motorcycle', 'electric']
  },
  
  // 2. TECHNICKÉ ÚDAJE
  fuelType: {
    type: String,
    required: [true, 'Fuel type is required'],
    enum: ['gasoline', 'diesel', 'hybrid', 'electric', 'lpg']
  },
  engine: {
    displacement: Number, // cm³
    power: Number, // kW
    torque: Number, // Nm
    cylinders: Number,
    configuration: String // V6, I4, etc.
  },
  drivetrain: {
    type: String,
    enum: ['front', 'rear', 'awd', '4wd'],
    default: 'front'
  },
  transmission: {
    type: String,
    required: [true, 'Transmission is required'],
    enum: ['manual', 'automatic', 'cvt']
  },
  seats: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: [1, 'Must have at least 1 seat'],
    max: [9, 'Cannot have more than 9 seats']
  },
  doors: {
    type: Number,
    min: [2, 'Must have at least 2 doors'],
    max: [5, 'Cannot have more than 5 doors'],
    default: 4 // Most cars have 4 doors
  },
  trunkVolume: {
    type: Number, // liters
    min: [0, 'Trunk volume cannot be negative']
  },
  fuelConsumption: {
    city: Number, // l/100km
    highway: Number, // l/100km
    combined: Number, // l/100km
    co2Emissions: Number // g/km
  },
  
  // 3. STAV VOZIDLA
  status: {
    type: String,
    enum: ['active', 'unavailable', 'archived'],
    default: 'active'
  },
  mileage: {
    current: {
      type: Number,
      required: [true, 'Current mileage is required'],
      min: [0, 'Mileage cannot be negative'],
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Document validity tracking
  documentValidity: {
    highwayTollSticker: {
      expiryDate: Date,
      isValid: Boolean,
      autoCheck: { type: Boolean, default: true }
    },
    technicalInspection: { // STK
      expiryDate: Date,
      isValid: Boolean,
      autoCheck: { type: Boolean, default: true }
    },
    emissionInspection: { // EK
      expiryDate: Date,
      isValid: Boolean,
      autoCheck: { type: Boolean, default: true }
    }
  },
  
  // Damage tracking
  damages: [{
    description: {
      type: String,
      required: true,
      maxLength: [500, 'Damage description cannot exceed 500 characters']
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major'],
      required: true
    },
    location: String, // Front bumper, rear door, etc.
    images: [String], // URLs to damage photos
    cost: Number,
    repaired: {
      type: Boolean,
      default: false
    },
    repairedDate: Date,
    reportedDate: {
      type: Date,
      default: Date.now
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Enhanced description with category-based defaults
  description: {
    type: String,
    maxLength: [1000, 'Description cannot exceed 1000 characters'],
    trim: true
  },
  
  // 6. CENNÍK, DOPLNKOVÉ ÚDAJE, SLUŽBY, DEPOZIT
  pricing: {
    dailyRate: {
      type: Number,
      min: [0, 'Daily rate cannot be negative'],
      default: 0
    },
    rates: {
      '1day': Number,
      '2-3days': Number,
      '4-10days': Number,
      '11-17days': Number,
      '18-24days': Number,
      '30plus': String // "dohoda - volať/písať mail"
    },
    weeklyRate: Number,
    monthlyRate: Number,
    deposit: {
      type: Number,
      min: [0, 'Deposit cannot be negative'],
      default: 0
    }
  },
  
  // Mileage limits and fees
  mileageLimits: {
    dailyLimit: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    excessKmPrice: {
      type: Number,
      default: 0.25 // EUR per km
    }
  },
  
  // Enhanced features/equipment system
  equipment: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    name: {
      type: String,
      required: true
    },
    icon: String, // Icon name or URL
    description: String,
    category: {
      type: String,
      enum: ['safety', 'comfort', 'technology', 'performance', 'exterior', 'interior']
    },
    isStandard: {
      type: Boolean,
      default: false
    }
  }],
  
  // Addons/additional services
  addons: [{
    name: String,
    description: String,
    price: Number,
    unit: {
      type: String,
      enum: ['per_day', 'per_rental', 'per_km'],
      default: 'per_day'
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  
  // Badges and feature pills
  badges: [{
    text: {
      type: String,
      required: true,
      maxLength: [20, 'Badge text cannot exceed 20 characters']
    },
    type: {
      type: String,
      enum: ['corner', 'pill'],
      default: 'corner'
    },
    style: {
      backgroundColor: {
        type: String,
        default: '#ff4444'
      },
      textColor: {
        type: String,
        default: '#ffffff'
      },
      position: {
        type: String,
        enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        default: 'top-right'
      }
    },
    priority: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  location: {
    name: {
      type: String,
      default: 'Hlavná pobočka'
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Legacy features array for backward compatibility
  features: [{
    type: String,
    enum: ['air-conditioning', 'gps', 'bluetooth', 'heated-seats', 'sunroof', 'leather-seats', 'backup-camera', 'cruise-control', 'usb-ports', 'wifi']
  }],
  
  images: [{
    url: String,
    description: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    filename: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  
  documents: [{
    type: {
      type: String,
      enum: ['registration', 'insurance', 'inspection', 'other'],
      required: true
    },
    url: String,
    expiryDate: Date,
    description: String
  }],
  
  insurance: {
    provider: String,
    policyNumber: String,
    expiryDate: Date,
    coverageAmount: Number
  },
  
  maintenance: {
    lastServiceDate: Date,
    nextServiceDate: Date,
    nextServiceMileage: Number,
    notes: String
  },
  
  // 5. ŠTATISTIKY
  statistics: {
    totalBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalRentalDays: {
      type: Number,
      default: 0
    },
    averageDailyRate: {
      type: Number,
      default: 0
    },
    lastReservation: {
      date: Date,
      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    nextReservation: {
      date: Date,
      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },
  
  // System notifications
  notifications: [{
    type: {
      type: String,
      enum: ['document_expiry', 'maintenance_due', 'damage_reported', 'other']
    },
    message: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'error'],
      default: 'info'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    dismissedAt: Date,
    dismissedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Legacy fields for backward compatibility
  totalBookings: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Legacy pricing fields for backward compatibility
  dailyRate: Number,
  weeklyRate: Number,
  monthlyRate: Number,
  deposit: Number
}, {
  timestamps: true,
  // Transform the object when converting to JSON (API responses)
  toJSON: {
    transform: function(doc, ret) {
      // Handle legacy mileage format in JSON output
      if (ret.mileage !== undefined && typeof ret.mileage === 'number') {
        ret.mileage = {
          current: ret.mileage,
          lastUpdated: new Date(),
          updatedBy: null
        };
      }
      return ret;
    }
  }
});

// CRITICAL: Handle legacy mileage data BEFORE Mongoose applies schema defaults
carSchema.pre('init', function(next, obj) {
  // Convert legacy mileage format during document initialization
  if (obj.mileage !== undefined && typeof obj.mileage === 'number') {
    console.log('🔧 [SCHEMA] Converting legacy mileage during init:', obj.mileage);
    obj.mileage = {
      current: obj.mileage,
      lastUpdated: new Date(),
      updatedBy: null
    };
    console.log('🔧 [SCHEMA] Converted to object:', obj.mileage);
  }
  next();
});

// Generate internal ID before saving
carSchema.pre('save', async function(next) {
  if (this.isNew && !this.internalId) {
    try {
      const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
      const paddedNumber = String(count + 1).padStart(3, '0');
      this.internalId = `AUTO_${paddedNumber}`;
    } catch (error) {
      return next(error);
    }
  }
  
  // Update mileage timestamp when current mileage changes (legacy conversion handled by pre('init'))
  if (this.mileage && typeof this.mileage === 'object' && this.mileage !== null && 
      this.mileage.hasOwnProperty('current') && this.isModified('mileage.current')) {
    this.mileage.lastUpdated = new Date();
  }
  
  next();
});

// Method to check document validity and create notifications
carSchema.methods.checkDocumentValidity = function() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  
  const notifications = [];
  
  // Check highway toll sticker
  if (this.documentValidity.highwayTollSticker.expiryDate && 
      this.documentValidity.highwayTollSticker.expiryDate <= thirtyDaysFromNow) {
    notifications.push({
      type: 'document_expiry',
      message: `Diaľničná známka expiruje ${this.documentValidity.highwayTollSticker.expiryDate.toLocaleDateString('sk-SK')}`,
      severity: this.documentValidity.highwayTollSticker.expiryDate <= now ? 'error' : 'warning'
    });
  }
  
  // Check technical inspection
  if (this.documentValidity.technicalInspection.expiryDate && 
      this.documentValidity.technicalInspection.expiryDate <= thirtyDaysFromNow) {
    notifications.push({
      type: 'document_expiry',
      message: `STK expiruje ${this.documentValidity.technicalInspection.expiryDate.toLocaleDateString('sk-SK')}`,
      severity: this.documentValidity.technicalInspection.expiryDate <= now ? 'error' : 'warning'
    });
  }
  
  // Check emission inspection
  if (this.documentValidity.emissionInspection.expiryDate && 
      this.documentValidity.emissionInspection.expiryDate <= thirtyDaysFromNow) {
    notifications.push({
      type: 'document_expiry',
      message: `EK expiruje ${this.documentValidity.emissionInspection.expiryDate.toLocaleDateString('sk-SK')}`,
      severity: this.documentValidity.emissionInspection.expiryDate <= now ? 'error' : 'warning'
    });
  }
  
  return notifications;
};

// Method to get category description
carSchema.methods.getCategoryDescription = function() {
  const descriptions = {
    economy: "Úsporné a spoľahlivé mestské auto vhodné na každodenné jazdenie aj krátke výlety s dôrazom na jednoduchosť a pohodlie.",
    compact: "Komfortné vozidlo s dostatkom priestoru a výbavy pre rodinné výlety, služobné cesty aj bežné každodenné používanie.",
    midsize: "Komfortné vozidlo s dostatkom priestoru a výbavy pre rodinné výlety, služobné cesty aj bežné každodenné používanie.",
    fullsize: "Elegantné a výkonné vozidlo s nadštandardnou výbavou vhodné na dlhé trasy, diaľnice a náročnejších zákazníkov.",
    luxury: "Elegantné a výkonné vozidlo s nadštandardnou výbavou vhodné na dlhé trasy, diaľnice a náročnejších zákazníkov.",
    suv: "Elegantné a výkonné vozidlo s nadštandardnou výbavou vhodné na dlhé trasy, diaľnice a náročnejších zákazníkov.",
    minivan: "Priestranné vozidlo ideálne na prepravu väčšej skupiny ľudí, rodinné výlety, firemné transfery alebo letiskové odvozy.",
    utility: "Výkonné dodávky určené na prepravu nákladu, zariadenia alebo sťahovanie, s veľkým nakladacím priestorom a 3 miestami na sedenie.",
    caravan: "Plne vybavené obytné vozidlá vhodné na dovolenku, výlety v prírode alebo dlhšie cesty po Európe s maximálnym komfortom.",
    motorcycle: "Výkonné a spoľahlivé motorky pre dobrodružných jazdcov, vhodné na krátke aj dlhé trasy – ideálne na víkendové úniky z mesta.",
    sports: "Dynamické vozidlá pre zážitkovú jazdu, nadštandardný výkon a atraktívny vzhľad. Ideálne pre náročných motoristov.",
    electric: "Tiché, ekologické a moderné autá s okamžitým nástupom výkonu. Ideálne pre jazdu v meste aj medzimestské presuny."
  };
  
  return descriptions[this.category] || this.description;
};

// Indexes for better performance
carSchema.index({ tenantId: 1, status: 1 });
carSchema.index({ tenantId: 1, category: 1 });
carSchema.index({ tenantId: 1, isActive: 1 });
carSchema.index({ tenantId: 1, internalId: 1 }, { unique: true });
carSchema.index({ registrationNumber: 1, tenantId: 1 }, { unique: true });
carSchema.index({ vin: 1, tenantId: 1 }, { unique: true });
carSchema.index({ 'location.name': 1 });
carSchema.index({ 'documentValidity.highwayTollSticker.expiryDate': 1 });
carSchema.index({ 'documentValidity.technicalInspection.expiryDate': 1 });
carSchema.index({ 'documentValidity.emissionInspection.expiryDate': 1 });

// Virtual for car display name
carSchema.virtual('displayName').get(function() {
  return `${this.year} ${this.brand} ${this.model}`;
});

// Method to check if car is available for booking
carSchema.methods.isAvailableForBooking = function() {
  return this.status === 'active' && this.isActive;
};

// Method to calculate total rate based on period
carSchema.methods.calculateRate = function(days) {
  const rates = this.pricing?.rates || {};
  
  // Check specific day ranges first
  if (days === 1 && rates['1day']) return rates['1day'];
  if (days >= 2 && days <= 3 && rates['2-3days']) return rates['2-3days'] * days;
  if (days >= 4 && days <= 10 && rates['4-10days']) return rates['4-10days'] * days;
  if (days >= 11 && days <= 17 && rates['11-17days']) return rates['11-17days'] * days;
  if (days >= 18 && days <= 24 && rates['18-24days']) return rates['18-24days'] * days;
  
  // Fallback to pricing rates or legacy fields
  const dailyRate = this.pricing?.dailyRate || this.dailyRate || 0;
  const weeklyRate = this.pricing?.weeklyRate || this.weeklyRate;
  const monthlyRate = this.pricing?.monthlyRate || this.monthlyRate;
  
  if (days >= 30 && monthlyRate) {
    return Math.floor(days / 30) * monthlyRate + (days % 30) * dailyRate;
  } else if (days >= 7 && weeklyRate) {
    return Math.floor(days / 7) * weeklyRate + (days % 7) * dailyRate;
  }
  
  return days * dailyRate;
};

module.exports = mongoose.model('Car', carSchema); 