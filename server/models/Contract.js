const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  // Contract identification
  contractNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Relations
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true
  },
  
  // Customer information (Zákazník)
  customer: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    ico: {
      type: String, // Business ID if provided
      sparse: true
    }
  },
  
  // Vehicle information (Vozidlo)
  vehicle: {
    brand: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    year: Number,
    registrationNumber: {
      type: String,
      required: true
    },
    vin: String,
    category: String,
    fuelType: String,
    transmission: String
  },
  
  // Rental details (Prenájom)
  rental: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    pickupLocation: {
      type: String,
      required: true
    },
    returnLocation: {
      type: String,
      required: true
    },
    totalDays: {
      type: Number,
      required: true
    },
    dailyRate: {
      type: Number,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    }
  },
  
  // Additional services (Doplnkové služby)
  additionalServices: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  
  // Special services
  specialServices: {
    delivery: {
      isSelected: {
        type: Boolean,
        default: false
      },
      price: {
        type: Number,
        default: 0
      },
      address: String
    },
    afterHours: {
      isSelected: {
        type: Boolean,
        default: false
      },
      price: {
        type: Number,
        default: 0
      },
      notes: String
    }
  },
  
  // Rental rules (Pravidlá prenájmu) - Static
  rentalRules: {
    dailyKmLimit: {
      type: Number,
      default: 200
    },
    excessKmFee: {
      type: Number,
      default: 0.25 // EUR per km
    },
    insuranceDeductible: {
      type: Number,
      default: 1000 // EUR
    },
    prohibitedActivities: [{
      type: String,
      default: ['Fajčenie vo vozidle', 'Prevoz domácich zvierat bez schválenia', 'Jazda v teréne', 'Používanie vozidla na komerčné účely']
    }],
    cancellationPolicy: {
      type: String,
      default: 'Zrušenie rezervácie je možné do 24 hodín pred začiatkom prenájmu bez poplatku. Pri zrušení menej ako 24 hodín pred začiatkom sa účtuje poplatok 50% z celkovej sumy.'
    }
  },
  
  // Contract status
  status: {
    type: String,
    enum: ['draft', 'pending', 'signed', 'cancelled', 'expired'],
    default: 'draft'
  },
  
  // Signatures
  signatures: {
    customer: {
      signed: {
        type: Boolean,
        default: false
      },
      signedAt: Date,
      signatureData: String, // Base64 encoded signature
      ipAddress: String
    },
    staff: {
      signed: {
        type: Boolean,
        default: false
      },
      signedAt: Date,
      signedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  
  // PDF generation
  pdfGenerated: {
    type: Boolean,
    default: false
  },
  pdfUrl: String,
  
  // Notes
  notes: String
}, {
  timestamps: true
});

// Indexes for better performance
contractSchema.index({ tenantId: 1, contractNumber: 1 }, { unique: true });
contractSchema.index({ tenantId: 1, reservation: 1 });
contractSchema.index({ tenantId: 1, status: 1 });
contractSchema.index({ tenantId: 1, createdAt: 1 });

// Generate contract number with the format: YYYYMMDD##N
contractSchema.pre('save', async function(next) {
  if (this.isNew && !this.contractNumber) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Format: YYYYMMDD
    const datePrefix = `${year}${month}${day}`;
    
    // Find contracts created today for this tenant
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayContractsCount = await this.constructor.countDocuments({
      tenantId: this.tenantId,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    // Sequential number with zero padding (01, 02, 03, etc.)
    const sequentialNumber = String(todayContractsCount + 1).padStart(2, '0');
    
    // Final format: YYYYMMDD##N (e.g., 2025062201N)
    this.contractNumber = `${datePrefix}${sequentialNumber}N`;
  }
  next();
});

// Virtual for full customer name
contractSchema.virtual('customerFullName').get(function() {
  return `${this.customer.firstName} ${this.customer.lastName}`;
});

// Virtual for vehicle full name
contractSchema.virtual('vehicleFullName').get(function() {
  return `${this.vehicle.brand} ${this.vehicle.model}`;
});

// Virtual for contract duration
contractSchema.virtual('duration').get(function() {
  return this.rental.totalDays;
});

// Method to calculate total additional services cost
contractSchema.methods.calculateAdditionalServicesCost = function() {
  let total = 0;
  
  // Regular additional services
  this.additionalServices.forEach(service => {
    total += service.price * service.quantity;
  });
  
  // Special services
  if (this.specialServices.delivery.isSelected) {
    total += this.specialServices.delivery.price;
  }
  
  if (this.specialServices.afterHours.isSelected) {
    total += this.specialServices.afterHours.price;
  }
  
  return total;
};

// Method to calculate total contract amount
contractSchema.methods.calculateTotalAmount = function() {
  const rentalTotal = this.rental.totalAmount;
  const additionalServicesTotal = this.calculateAdditionalServicesCost();
  return rentalTotal + additionalServicesTotal;
};

// Method to check if contract is fully signed
contractSchema.methods.isFullySigned = function() {
  return this.signatures.customer.signed && this.signatures.staff.signed;
};

// Method to check if contract can be modified
contractSchema.methods.canBeModified = function() {
  return ['draft', 'pending'].includes(this.status) && !this.isFullySigned();
};

// Static method to create contract from reservation
contractSchema.statics.createFromReservation = async function(reservationId, tenantId, createdBy) {
  const Reservation = require('./Reservation');
  const Car = require('./Car');
  const User = require('./User');
  
  const reservation = await Reservation.findById(reservationId)
    .populate('customer', 'firstName lastName email phone address')
    .populate('car', 'brand model year registrationNumber vin category fuelType transmission');
  
  if (!reservation) {
    throw new Error('Reservation not found');
  }
  
  const contractData = {
    tenantId,
    reservation: reservationId,
    customer: {
      firstName: reservation.customer.firstName,
      lastName: reservation.customer.lastName,
      phone: reservation.customer.phone,
      email: reservation.customer.email,
      address: reservation.customer.address || {}
    },
    vehicle: {
      brand: reservation.car.brand,
      model: reservation.car.model,
      year: reservation.car.year,
      registrationNumber: reservation.car.registrationNumber,
      vin: reservation.car.vin,
      category: reservation.car.category,
      fuelType: reservation.car.fuelType,
      transmission: reservation.car.transmission
    },
    rental: {
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      pickupLocation: reservation.pickupLocation.name,
      returnLocation: reservation.dropoffLocation.name,
      totalDays: reservation.pricing.totalDays,
      dailyRate: reservation.pricing.dailyRate,
      totalAmount: reservation.pricing.totalAmount
    },
    additionalServices: [], // Will be populated from reservation if needed
    createdBy
  };
  
  return new this(contractData);
};

module.exports = mongoose.model('Contract', contractSchema); 