const mongoose = require('mongoose');

const insuranceSchema = new mongoose.Schema({
  // Tenant separation
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  // Basic Information
  name: {
    type: String,
    required: [true, 'Insurance name is required'],
    trim: true,
    maxLength: [100, 'Insurance name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Insurance description is required'],
    trim: true,
    maxLength: [500, 'Insurance description cannot exceed 500 characters']
  },
  
  // Insurance Details
  coverage: {
    type: String,
    required: [true, 'Coverage details are required'],
    trim: true,
    maxLength: [1000, 'Coverage details cannot exceed 1000 characters']
  },
  
  // Insurance Type
  type: {
    type: String,
    required: [true, 'Insurance type is required'],
    enum: [
      'collision_damage',     // Poistenie škôd na vozidle
      'theft_protection',     // Poistenie proti krádeži
      'liability',           // Povinné zmluvné poistenie
      'comprehensive',       // Havarijné poistenie
      'personal_accident',   // Úrazové poistenie
      'roadside_assistance', // Asistenčné služby
      'glass_protection',    // Poistenie skiel
      'travel_insurance'     // Cestovné poistenie
    ]
  },
  
  // Visual
  image: {
    url: String,
    filename: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  color: {
    type: String,
    default: '#f44336' // Default red color for insurance
  },
  icon: {
    type: String,
    default: 'security' // Material UI icon name
  },
  
  // Pricing
  pricing: {
    type: {
      type: String,
      enum: ['fixed', 'per_day', 'percentage_of_rental'],
      default: 'per_day'
    },
    amount: {
      type: Number,
      required: [true, 'Price amount is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'EUR'
    },
    // For percentage-based pricing
    percentageBase: {
      type: String,
      enum: ['rental_total', 'vehicle_value'],
      default: 'rental_total'
    }
  },
  
  // Coverage Limits
  coverage_limits: {
    deductible: {
      type: Number,
      default: 0,
      min: [0, 'Deductible cannot be negative']
    },
    maxCoverage: {
      type: Number,
      default: 0,
      min: [0, 'Max coverage cannot be negative']
    },
    currency: {
      type: String,
      default: 'EUR'
    }
  },
  
  // Terms and Conditions
  terms: {
    minimumAge: {
      type: Number,
      default: 18,
      min: [18, 'Minimum age cannot be less than 18']
    },
    maximumAge: {
      type: Number,
      default: 75
    },
    drivingExperienceRequired: {
      type: Number,
      default: 1, // years
      min: [0, 'Driving experience cannot be negative']
    },
    excludedCountries: [{
      type: String,
      trim: true
    }],
    validityPeriod: {
      type: Number,
      default: 365, // days
      min: [1, 'Validity period must be at least 1 day']
    }
  },
  
  // Availability Rules
  availability: {
    isGlobal: {
      type: Boolean,
      default: true // Available for all vehicles by default
    },
    vehicleCategories: [{
      type: String,
      enum: ['economy', 'compact', 'midsize', 'fullsize', 'luxury', 'suv', 'minivan', 'convertible', 'sports', 'utility', 'caravan', 'motorcycle', 'electric']
    }],
    excludedVehicles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car'
    }],
    seasonal: {
      isActive: {
        type: Boolean,
        default: false
      },
      startMonth: Number, // 1-12
      endMonth: Number    // 1-12
    }
  },
  
  // Behavior
  behavior: {
    isOptional: {
      type: Boolean,
      default: true // Can be declined by customer
    },
    isRecommended: {
      type: Boolean,
      default: false // Highlighted as recommended
    },
    requiresApproval: {
      type: Boolean,
      default: false // Admin approval needed
    },
    canBeCombined: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Insurance' // Compatible insurance types
    }],
    conflictsWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Insurance' // Mutually exclusive insurance types
    }]
  },
  
  // Claims and Support
  claims: {
    phoneNumber: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    website: {
      type: String,
      trim: true
    },
    supportHours: {
      type: String,
      default: '24/7'
    }
  },
  
  // Legal Information
  legal: {
    insuranceProvider: {
      name: {
        type: String,
        required: [true, 'Insurance provider name is required']
      },
      licenseNumber: String,
      address: String,
      phone: String,
      email: String
    },
    policyDocument: {
      url: String,
      filename: String,
      uploadDate: Date
    },
    regulatoryInfo: String
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true // Show in public insurance options
  },
  
  // Statistics
  statistics: {
    timesSelected: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    claimsCount: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  
  // Metadata
  sortOrder: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
insuranceSchema.index({ tenantId: 1, type: 1 });
insuranceSchema.index({ tenantId: 1, isActive: 1 });
insuranceSchema.index({ tenantId: 1, isPublic: 1 });
insuranceSchema.index({ 'availability.vehicleCategories': 1 });
insuranceSchema.index({ sortOrder: 1 });

// Virtual for display name with type
insuranceSchema.virtual('displayName').get(function() {
  const typeNames = {
    collision_damage: 'Poistenie škôd na vozidle',
    theft_protection: 'Poistenie proti krádeži',
    liability: 'Povinné zmluvné poistenie',
    comprehensive: 'Havarijné poistenie',
    personal_accident: 'Úrazové poistenie',
    roadside_assistance: 'Asistenčné služby',
    glass_protection: 'Poistenie skiel',
    travel_insurance: 'Cestovné poistenie'
  };
  
  return `${this.name} (${typeNames[this.type] || this.type})`;
});

// Method to check if insurance is available for specific vehicle
insuranceSchema.methods.isAvailableForVehicle = function(vehicle) {
  if (!this.isActive) return false;
  
  // Check if vehicle is explicitly excluded
  if (this.availability.excludedVehicles.includes(vehicle._id)) {
    return false;
  }
  
  // Check seasonal availability
  if (this.availability.seasonal.isActive) {
    const currentMonth = new Date().getMonth() + 1;
    const startMonth = this.availability.seasonal.startMonth;
    const endMonth = this.availability.seasonal.endMonth;
    
    if (startMonth <= endMonth) {
      if (currentMonth < startMonth || currentMonth > endMonth) {
        return false;
      }
    } else {
      // Season spans year boundary (e.g., November to March)
      if (currentMonth < startMonth && currentMonth > endMonth) {
        return false;
      }
    }
  }
  
  // Check global availability or vehicle category
  if (this.availability.isGlobal) {
    return true;
  }
  
  return this.availability.vehicleCategories.includes(vehicle.category);
};

// Method to calculate price for specific parameters
insuranceSchema.methods.calculatePrice = function(params = {}) {
  const { days = 1, rentalTotal = 0, vehicleValue = 0 } = params;
  
  switch (this.pricing.type) {
    case 'fixed':
      return this.pricing.amount;
    case 'per_day':
      return this.pricing.amount * days;
    case 'percentage_of_rental':
      const baseAmount = this.pricing.percentageBase === 'vehicle_value' ? vehicleValue : rentalTotal;
      return (baseAmount * this.pricing.amount / 100);
    default:
      return this.pricing.amount;
  }
};

// Static method to get insurance by type
insuranceSchema.statics.getByType = function(tenantId, type) {
  return this.find({ 
    tenantId, 
    type, 
    isActive: true 
  }).sort({ sortOrder: 1, name: 1 });
};

// Static method to get public insurance options
insuranceSchema.statics.getPublicInsurance = function(tenantId) {
  return this.find({ 
    tenantId, 
    isActive: true, 
    isPublic: true 
  }).sort({ type: 1, sortOrder: 1, name: 1 });
};

module.exports = mongoose.model('Insurance', insuranceSchema);