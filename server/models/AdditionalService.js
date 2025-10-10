const mongoose = require('mongoose');

const additionalServiceSchema = new mongoose.Schema({
  // Tenant separation
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  // Basic Information
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxLength: [100, 'Service name cannot exceed 100 characters']
  },
  nameEn: {
    type: String,
    trim: true,
    maxLength: [100, 'English service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxLength: [500, 'Service description cannot exceed 500 characters']
  },
  descriptionEn: {
    type: String,
    trim: true,
    maxLength: [500, 'English service description cannot exceed 500 characters']
  },
  
  // Category
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: [
      'driving_comfort',      // JAZDA A KOMFORT
      'insurance_assistance', // POISTENIE A ASISTENCIA
      'poistenie',           // POISTENIE (separate category for public API)
      'poistenie_asistencia_rozsierene', // POISTENIE A ASISTENCIA ROZŠÍRENÉ
      'time_services',       // ČASOVÉ SLUŽBY A PREVZATIE
      'delivery_pickup',     // PRISTAVENIE / VYZDVIHNUTIE MIMO STREDISKA
      'family_accessories',  // RODINA A DOPLNKY
      'specialized'          // ŠPECIALIZOVANÉ DOPLNKY
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
    default: '#2196f3' // Default blue color
  },
  icon: {
    type: String,
    default: 'extension' // Material UI icon name
  },
  
  // Pricing
  pricing: {
    type: {
      type: String,
      enum: ['fixed', 'per_day', 'per_km', 'percentage'],
      default: 'fixed'
    },
    amount: {
      type: Number,
      required: [true, 'Price amount is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'EUR'
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
    isAutoSelected: {
      type: Boolean,
      default: false // Automatically checked in reservation
    },
    isRequired: {
      type: Boolean,
      default: false // Cannot be unchecked
    },
    requiresApproval: {
      type: Boolean,
      default: false // Admin approval needed
    },
    maxQuantity: {
      type: Number,
      default: 1 // Maximum quantity per reservation
    },
    dependsOn: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdditionalService' // Services that must be selected first
    }]
  },
  
  // Dynamic Pricing (for distance-based services)
  dynamicPricing: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    basePrice: Number,
    pricePerKm: Number,
    minimumPrice: Number,
    maximumPrice: Number,
    useGoogleMapsAPI: {
      type: Boolean,
      default: false
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true // Show in "Naše služby" section
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
additionalServiceSchema.index({ tenantId: 1, category: 1 });
additionalServiceSchema.index({ tenantId: 1, isActive: 1 });
additionalServiceSchema.index({ tenantId: 1, isPublic: 1 });
additionalServiceSchema.index({ 'availability.vehicleCategories': 1 });
additionalServiceSchema.index({ sortOrder: 1 });

// Virtual for display name with category
additionalServiceSchema.virtual('displayName').get(function() {
  const categoryNames = {
    driving_comfort: 'Jazda a komfort',
    insurance_assistance: 'Poistenie a asistencia',
    poistenie: 'Poistenie',
    poistenie_asistencia_rozsierene: 'Poistenie a asistencia rozšírené',
    time_services: 'Časové služby',
    delivery_pickup: 'Pristavenie/Vyzdvihnutie',
    family_accessories: 'Rodina a doplnky',
    specialized: 'Špecializované'
  };
  
  return `${this.name} (${categoryNames[this.category] || this.category})`;
});

// Method to check if service is available for specific vehicle
additionalServiceSchema.methods.isAvailableForVehicle = function(vehicle) {
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
additionalServiceSchema.methods.calculatePrice = function(params = {}) {
  const { quantity = 1, days = 1, distance = 0, basePrice = 0 } = params;
  
  if (this.dynamicPricing.isEnabled && distance > 0) {
    let price = this.dynamicPricing.basePrice || 0;
    price += distance * (this.dynamicPricing.pricePerKm || 0);
    
    if (this.dynamicPricing.minimumPrice && price < this.dynamicPricing.minimumPrice) {
      price = this.dynamicPricing.minimumPrice;
    }
    
    if (this.dynamicPricing.maximumPrice && price > this.dynamicPricing.maximumPrice) {
      price = this.dynamicPricing.maximumPrice;
    }
    
    return price * quantity;
  }
  
  switch (this.pricing.type) {
    case 'fixed':
      return this.pricing.amount * quantity;
    case 'per_day':
      return this.pricing.amount * quantity * days;
    case 'per_km':
      return this.pricing.amount * quantity * distance;
    case 'percentage':
      return (basePrice * this.pricing.amount / 100) * quantity;
    default:
      return this.pricing.amount * quantity;
  }
};

// Static method to get services by category
additionalServiceSchema.statics.getByCategory = function(tenantId, category) {
  return this.find({ 
    tenantId, 
    category, 
    isActive: true 
  }).sort({ sortOrder: 1, name: 1 });
};

// Static method to get public services for "Naše služby" section
additionalServiceSchema.statics.getPublicServices = function(tenantId) {
  return this.find({ 
    tenantId, 
    isActive: true, 
    isPublic: true 
  }).sort({ sortOrder: 1, category: 1, name: 1 });
};

module.exports = mongoose.model('AdditionalService', additionalServiceSchema); 