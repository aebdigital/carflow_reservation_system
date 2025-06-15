const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reservationNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
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
    enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'no-show'],
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
      description: String
    }],
    totalAmount: {
      type: Number,
      required: true
    }
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  additionalDrivers: [{
    firstName: String,
    lastName: String,
    licenseNumber: String,
    licenseExpiry: Date,
    relationship: String
  }],
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
  }
}, {
  timestamps: true
});

// Indexes for better performance
reservationSchema.index({ reservationNumber: 1 });
reservationSchema.index({ customer: 1 });
reservationSchema.index({ car: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ startDate: 1, endDate: 1 });

// Pre-save middleware to generate reservation number
reservationSchema.pre('validate', async function(next) {
  if (!this.reservationNumber) {
    try {
      // Use timestamp + random number for uniqueness
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.reservationNumber = `RES${timestamp}${random}`;
      
      // Check if this number already exists and regenerate if needed
      const existing = await this.constructor.findOne({ reservationNumber: this.reservationNumber });
      if (existing) {
        // Very unlikely, but regenerate if collision occurs
        const newRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.reservationNumber = `RES${timestamp}${newRandom}`;
      }
    } catch (error) {
      console.error('Error generating reservation number:', error);
      // Fallback to simple counter
      const count = await this.constructor.countDocuments();
      this.reservationNumber = `RES${String(count + 1).padStart(6, '0')}`;
    }
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
    status: { $in: ['confirmed', 'ongoing'] },
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