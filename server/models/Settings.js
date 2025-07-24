const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  // Business Settings
  business: {
    companyName: {
      type: String,
      default: 'RIVAL Autopožičovňa'
    },
    contactPhone: {
      type: String,
      default: '+421 907 633 517'
    },
    contactEmail: {
      type: String,
      default: 'info@rivalcars.sk'
    },
    
    // Pickup/Return Locations
    pickupLocations: [{
      name: {
        type: String,
        required: true
      },
      address: {
        type: String,
        required: true
      },
      isDefault: {
        type: Boolean,
        default: false
      },
      isActive: {
        type: Boolean,
        default: true
      },
      coordinates: {
        lat: Number,
        lng: Number
      },
      openingHours: {
        type: String,
        default: '08:00 - 18:00'
      },
      notes: String
    }],
    
    defaultPickupLocation: {
      type: String,
      default: 'Banska Bystrica'
    }
  },
  
  // Communication Settings  
  communication: {
    emailEnabled: {
      type: Boolean,
      default: true
    },
    smsEnabled: {
      type: Boolean,
      default: true
    },
    reminderEnabled: {
      type: Boolean,
      default: true
    },
    reviewRequestEnabled: {
      type: Boolean,
      default: true
    }
  },
  
  // System Settings
  system: {
    timezone: {
      type: String,
      default: 'Europe/Bratislava'
    },
    language: {
      type: String,
      default: 'sk'
    },
    currency: {
      type: String,
      default: 'EUR'
    }
  }
}, {
  timestamps: true
});

// Ensure only one settings document per tenant
settingsSchema.index({ tenantId: 1 }, { unique: true });

// Static method to get settings for a tenant (create default if doesn't exist)
settingsSchema.statics.getForTenant = async function(tenantId) {
  let settings = await this.findOne({ tenantId });
  
  if (!settings) {
    // Create default settings
    settings = await this.create({
      tenantId,
      business: {
        pickupLocations: [{
          name: 'Banska Bystrica - Hlavné',
          address: 'Banska Bystrica, Slovensko',
          isDefault: true,
          isActive: true
        }]
      }
    });
  }
  
  return settings;
};

// Method to get default pickup location
settingsSchema.methods.getDefaultPickupLocation = function() {
  const defaultLocation = this.business.pickupLocations.find(loc => loc.isDefault && loc.isActive);
  return defaultLocation ? defaultLocation.name : this.business.defaultPickupLocation;
};

// Method to get all active pickup locations
settingsSchema.methods.getActivePickupLocations = function() {
  return this.business.pickupLocations.filter(loc => loc.isActive);
};

module.exports = mongoose.model('Settings', settingsSchema);