const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  // Tenant separation - each reservation belongs to a specific tenant
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reservationNumber: {
    type: String,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  // Company information for business customers
  firma: {
    isCompany: {
      type: Boolean,
      default: false
    },
    companyName: {
      type: String,
      default: null
    },
    ico: {
      type: String, // IČO - Identification number of organization
      default: null
    },
    dic: {
      type: String, // DIČ - Tax identification number
      default: null
    },
    icDph: {
      type: String, // IČ DPH - VAT registration number
      default: null
    }
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: [true, 'Car is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  pickupLocation: {
    name: {
      type: String,
      required: [true, 'Pickup location is required']
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
  dropoffLocation: {
    name: {
      type: String,
      required: [true, 'Dropoff location is required']
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
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'zaplatene', 'ongoing', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  pricing: {
    dailyRate: {
      type: Number,
      required: true
    },
    totalDays: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    },
    taxes: {
      type: Number,
      default: 0
    },
    fees: [{
      name: String,
      amount: Number,
      description: String
    }],
    discounts: [{
      name: String,
      amount: Number,
      percentage: Number,
      description: String,
      discountCode: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DiscountCode'
      },
      code: String
    }],
    deposit: {
      type: Number,
      default: 0
    },
    // From booking payload
    calculatedTotal: Number, // Total amount from booking calculation
    servicesTotal: Number, // Total for all additional services
    appliedDiscount: {
      discountAmount: Number,
      discountPercentage: Number,
      originalAmount: Number,
      message: String,
      code: String
    },
    extraOptions: {
      gps: { type: Boolean, default: false },
      childSeat: { type: Boolean, default: false },
      fullInsurance: { type: Boolean, default: false }
    },
    totalAmount: {
      type: Number,
      required: true
    }
  },

  // Discount code applied during booking
  discountCode: String,
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },

  // Payment type - optional field for frontend to specify payment method
  paymentType: {
    type: String,
    enum: ['stripe', 'prevod'],
    required: false
  },

  // BySquare QR payment codes
  qrCodes: {
    payBySquare: {
      type: String,
      default: null
    },
    payBySquareRental: {
      type: String,
      default: null
    },
    payBySquareDeposit: {
      type: String,
      default: null
    },
    qrPlatbaCz: {
      type: String,
      default: null
    },
    invoiceBySquare: {
      type: String,
      default: null
    },
    generatedAt: {
      type: Date,
      default: null
    },
    lastUpdated: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    bankAccount: {
      type: String,
      default: null
    },
    variableSymbol: {
      type: String,
      default: null
    },
    constantSymbol: {
      type: String,
      default: null
    },
    specificSymbol: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      default: null
    },
    beneficiaryName: {
      type: String,
      default: null
    },
    paymentNote: {
      type: String,
      default: null
    }
  },
  
  additionalDrivers: [{
    firstName: String,
    lastName: String,
    licenseNumber: String,
    licenseExpiry: Date,
    relationship: String
  }],
  
  // Selected additional services (from booking payload)
  selectedServices: [{
    _id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'AdditionalService'
    },
    service: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'AdditionalService'
    },
    name: String, // Service name at booking time
    category: String, // Service category
    quantity: { 
      type: Number, 
      default: 1 
    },
    unitPrice: Number, // Price per unit
    totalPrice: { 
      type: Number, 
      required: true 
    }, // Final calculated price for this service
    pricingType: {
      type: String,
      enum: ['fixed', 'per_day', 'per_km', 'percentage'],
      default: 'fixed'
    }
  }],
  
  // Services total from booking
  servicesTotal: {
    type: Number,
    default: 0
  },

  // Basic/Additional Insurance (selectedAdditionalInsurance from payload)
  selectedAdditionalInsurance: [{
    insuranceId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Insurance'
    },
    name: String,
    type: String,
    calculatedPrice: Number,
    displayPrice: String,
    baseAmount: Number,
    pricingType: {
      type: String,
      default: 'per_day'
    }
  }],

  // Extended Insurance (selectedExtendedInsurance from payload)  
  selectedExtendedInsurance: [{
    insuranceId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Insurance'
    },
    name: String,
    type: String,
    calculatedPrice: Number,
    displayPrice: String,
    baseAmount: Number,
    pricingType: {
      type: String,
      default: 'per_day'
    }
  }],

  // Insurance price details from booking
  insurancePrices: mongoose.Schema.Types.Mixed,
  extendedInsurancePrices: mongoose.Schema.Types.Mixed,
  
  specialRequests: String,
  terms: {
    mileageLimit: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    fuelPolicy: {
      type: String,
      enum: ['full-to-full', 'full-to-empty', 'same-to-same'],
      default: 'full-to-full'
    },
    cancellationPolicy: String,
    lateReturnFee: Number
  },
  // Cancellation information
  cancellation: {
    date: Date,
    reason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Confirmation information
  confirmation: {
    date: Date,
    notes: String,
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // SuperFaktura invoice information (LeRent only)
  superfakturaInvoiceId: {
    type: String,
    default: null
  },
  superfakturaInvoiceNumber: {
    type: String,
    default: null
  },
  superfakturaToken: {
    type: String,
    default: null
  },

  // 24-hour reminder tracking (before pickup)
  reminder24h: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  },

  // 24-hour return reminder tracking (before return date)
  returnReminder24h: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  },

  // Review request tracking (24h after trip ends)
  reviewRequest: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  },

  // Check-in information
  checkIn: {
    date: Date,
    mileage: Number,
    fuelLevel: {
      type: String,
      enum: ['empty', 'quarter', 'half', 'three-quarters', 'full']
    },
    condition: String,
    photos: [String],
    staffMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  },
  checkOut: {
    date: Date,
    mileage: Number,
    fuelLevel: {
      type: String,
      enum: ['empty', 'quarter', 'half', 'three-quarters', 'full']
    },
    condition: String,
    photos: [String],
    staffMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    additionalCharges: [{
      type: String,
      amount: Number,
      description: String
    }]
  },
  notifications: {
    emailSent: {
      confirmation: { type: Boolean, default: false },
      reminder: { type: Boolean, default: false },
      completion: { type: Boolean, default: false }
    },
    smsSent: {
      confirmation: { type: Boolean, default: false },
      reminder: { type: Boolean, default: false }
    }
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    date: Date
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Payment tracking
  paymentStatus: {
    confirmedAt: Date,
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paymentNotificationSent: {
      type: Boolean,
      default: false
    },
    paymentNotificationSentAt: Date,
    paymentNotificationSentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Kros API invoice tracking (payment confirmation - with deposit)
  krosInvoiceId: {
    type: String,
    index: true
  },
  krosRequestId: {
    type: String,
    index: true
  },
  krosInvoiceCreatedAt: Date,
  krosInvoiceStatus: {
    type: String,
    enum: ['pending', 'processing', 'created', 'sent', 'paid', 'failed'],
    default: 'pending'
  },
  // Kros API final invoice tracking (checkout completion - rental only)
  krosFinalInvoiceId: {
    type: String,
    index: true
  },
  krosFinalRequestId: {
    type: String,
    index: true
  },
  krosFinalInvoiceCreatedAt: Date,
  krosFinalInvoiceStatus: {
    type: String,
    enum: ['pending', 'processing', 'created', 'sent', 'paid', 'failed'],
    default: 'pending'
  },
  invoicePdfScheduledAt: Date,
  invoicePdfSentAt: Date,
  appliedDiscountCodes: [{
    discountCode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscountCode',
      required: true
    },
    code: {
      type: String,
      required: true
    },
    discountAmount: {
      type: Number,
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
reservationSchema.index({ tenantId: 1, reservationNumber: 1 }, { unique: true });
reservationSchema.index({ tenantId: 1, customer: 1 });
reservationSchema.index({ tenantId: 1, car: 1 });
reservationSchema.index({ tenantId: 1, status: 1 });
reservationSchema.index({ tenantId: 1, startDate: 1, endDate: 1 });
reservationSchema.index({ tenantId: 1, createdAt: 1 });

// Generate unique reservation number scoped to tenant
reservationSchema.pre('save', async function(next) {
  if (this.isNew && !this.reservationNumber) {
    const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
    this.reservationNumber = `${this.tenantId.toString().slice(-6).toUpperCase()}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Virtual for duration in days
reservationSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Method to check if reservation is active
reservationSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'ongoing' || 
         (this.status === 'confirmed' && this.startDate <= now && this.endDate >= now);
};

// Method to check if reservation can be cancelled
reservationSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status) && 
         new Date() < this.startDate;
};

// Static method to find overlapping reservations
reservationSchema.statics.findOverlapping = function(carId, startDate, endDate, excludeId = null) {
  const query = {
    car: carId,
    status: { $in: ['pending', 'confirmed', 'ongoing'] },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    ]
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return this.find(query);
};

module.exports = mongoose.model('Reservation', reservationSchema); 