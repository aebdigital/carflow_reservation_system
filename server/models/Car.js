const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
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
    unique: true,
    trim: true,
    uppercase: true
  },
  vin: {
    type: String,
    required: [true, 'VIN is required'],
    unique: true,
    trim: true,
    uppercase: true,
    length: [17, 'VIN must be exactly 17 characters']
  },
  color: {
    type: String,
    required: [true, 'Color is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['economy', 'compact', 'midsize', 'fullsize', 'luxury', 'suv', 'minivan', 'convertible', 'sports']
  },
  fuelType: {
    type: String,
    required: [true, 'Fuel type is required'],
    enum: ['gasoline', 'diesel', 'hybrid', 'electric']
  },
  transmission: {
    type: String,
    required: [true, 'Transmission is required'],
    enum: ['manual', 'automatic', 'cvt']
  },
  seats: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: [2, 'Must have at least 2 seats'],
    max: [9, 'Cannot have more than 9 seats']
  },
  doors: {
    type: Number,
    required: [true, 'Number of doors is required'],
    min: [2, 'Must have at least 2 doors'],
    max: [5, 'Cannot have more than 5 doors']
  },
  mileage: {
    type: Number,
    required: [true, 'Mileage is required'],
    min: [0, 'Mileage cannot be negative'],
    default: 0
  },
  description: {
    type: String,
    maxLength: [1000, 'Description cannot exceed 1000 characters'],
    trim: true
  },
  deposit: {
    type: Number,
    required: [true, 'Deposit is required'],
    min: [0, 'Deposit cannot be negative'],
    default: 0
  },
  dailyRate: {
    type: Number,
    required: [true, 'Daily rate is required'],
    min: [0, 'Daily rate cannot be negative']
  },
  weeklyRate: {
    type: Number,
    min: [0, 'Weekly rate cannot be negative']
  },
  monthlyRate: {
    type: Number,
    min: [0, 'Monthly rate cannot be negative']
  },
  status: {
    type: String,
    enum: ['available', 'maintenance', 'out-of-service'],
    default: 'available'
  },
  location: {
    name: {
      type: String,
      required: [true, 'Location name is required']
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
  }
}, {
  timestamps: true
});

// Indexes for better performance
carSchema.index({ registrationNumber: 1 });
carSchema.index({ vin: 1 });
carSchema.index({ status: 1 });
carSchema.index({ category: 1 });
carSchema.index({ 'location.name': 1 });

// Virtual for car display name
carSchema.virtual('displayName').get(function() {
  return `${this.year} ${this.brand} ${this.model}`;
});

// Method to check if car is available for booking
carSchema.methods.isAvailableForBooking = function() {
  return this.status === 'available' && this.isActive;
};

// Method to calculate total rate based on period
carSchema.methods.calculateRate = function(days) {
  if (days >= 30 && this.monthlyRate) {
    return Math.floor(days / 30) * this.monthlyRate + (days % 30) * this.dailyRate;
  } else if (days >= 7 && this.weeklyRate) {
    return Math.floor(days / 7) * this.weeklyRate + (days % 7) * this.dailyRate;
  }
  return days * this.dailyRate;
};

module.exports = mongoose.model('Car', carSchema); 