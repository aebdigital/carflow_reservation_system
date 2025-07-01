const mongoose = require('mongoose');

// Info Bar Schema
const infoBarSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Info bar text is required'],
    maxLength: [200, 'Info bar text cannot exceed 200 characters']
  },
  color: {
    type: String,
    enum: ['red', 'blue', 'green', 'yellow', 'orange', 'purple'],
    default: 'blue'
  },
  backgroundColor: {
    type: String,
    default: '#1976d2' // Default blue
  },
  textColor: {
    type: String,
    default: '#ffffff' // Default white
  },
  displayLocation: {
    type: String,
    enum: ['homepage', 'all-pages'],
    default: 'all-pages'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  }
});

// Modal Schema
const modalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Modal title is required'],
    maxLength: [100, 'Modal title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Modal content is required'],
    maxLength: [1000, 'Modal content cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: ['newsletter', 'info', 'discount'],
    required: [true, 'Modal type is required']
  },
  displayLocation: {
    type: String,
    enum: ['all-pages', 'homepage', 'pricing'],
    default: 'all-pages'
  },
  triggerRule: {
    type: {
      type: String,
      enum: ['time', 'scroll', 'exit'],
      default: 'time'
    },
    value: {
      type: Number,
      default: 5 // 5 seconds for time, 50% for scroll
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  // For newsletter type
  emailPlaceholder: {
    type: String,
    default: 'Zadajte váš email'
  },
  buttonText: {
    type: String,
    default: 'Získať zľavu'
  },
  // For discount type
  discountCode: {
    type: String
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  // Styling
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  textColor: {
    type: String,
    default: '#333333'
  },
  buttonColor: {
    type: String,
    default: '#1976d2'
  }
});

// Discount Code Schema
const discountCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Discount code is required'],
    uppercase: true,
    unique: true,
    trim: true,
    maxLength: [20, 'Discount code cannot exceed 20 characters']
  },
  description: {
    type: String,
    maxLength: [200, 'Description cannot exceed 200 characters']
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required']
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  // Time restrictions
  isTimeRestricted: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  // Minimum reservation requirements
  hasMinimumValue: {
    type: Boolean,
    default: false
  },
  minimumValueType: {
    type: String,
    enum: ['amount', 'days'],
    default: 'amount'
  },
  minimumValue: {
    type: Number,
    min: 0
  },
  // Car category restrictions
  categoryRestrictions: [{
    type: String,
    enum: ['economy', 'compact', 'midsize', 'fullsize', 'luxury', 'suv', 'minivan', 'convertible', 'sports']
  }],
  // Usage limitations
  usageLimit: {
    type: String,
    enum: ['single', 'limited', 'unlimited'],
    default: 'unlimited'
  },
  maxUsageCount: {
    type: Number,
    min: 1,
    default: 1
  },
  currentUsageCount: {
    type: Number,
    default: 0
  },
  // Admin notes
  adminNotes: {
    type: String,
    maxLength: [500, 'Admin notes cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Usage tracking
  usedBy: [{
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    discountApplied: {
      type: Number
    }
  }]
});

// Main Website Settings Schema
const websiteSettingsSchema = new mongoose.Schema({
  // Tenant separation
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  // Info Bar Settings
  infoBar: infoBarSchema,
  
  // Modal Settings
  modal: modalSchema,
  
  // General Website Settings
  siteName: {
    type: String,
    default: 'CarFlow Rental'
  },
  siteDescription: {
    type: String,
    default: 'Professional car rental service'
  },
  contactEmail: {
    type: String
  },
  contactPhone: {
    type: String
  },
  
  // Social Media Links
  socialLinks: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String
  },
  
  // SEO Settings
  metaTitle: {
    type: String,
    maxLength: [60, 'Meta title cannot exceed 60 characters']
  },
  metaDescription: {
    type: String,
    maxLength: [160, 'Meta description cannot exceed 160 characters']
  },
  
  // Last updated
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Separate Discount Code Model for better organization
const discountCodeModel = new mongoose.Schema({
  // Tenant separation
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  ...discountCodeSchema.obj,
  
  // Creator tracking
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
websiteSettingsSchema.index({ tenantId: 1 });
discountCodeModel.index({ tenantId: 1, code: 1 }, { unique: true });
discountCodeModel.index({ tenantId: 1, isActive: 1 });
discountCodeModel.index({ tenantId: 1, endDate: 1 });

// Methods for discount code validation
discountCodeModel.methods.isValid = function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  
  // Check time restrictions
  if (this.isTimeRestricted) {
    if (this.startDate && now < this.startDate) return false;
    if (this.endDate && now > this.endDate) return false;
  }
  
  // Check usage limits
  if (this.usageLimit === 'single' && this.currentUsageCount >= 1) return false;
  if (this.usageLimit === 'limited' && this.currentUsageCount >= this.maxUsageCount) return false;
  
  return true;
};

discountCodeModel.methods.canBeUsedBy = function(customer, reservation) {
  if (!this.isValid()) return { valid: false, reason: 'Code is not valid' };
  
  // Check if customer already used this code (for single-use codes)
  if (this.usageLimit === 'single') {
    const alreadyUsed = this.usedBy.some(usage => 
      usage.customer.toString() === customer._id.toString()
    );
    if (alreadyUsed) {
      return { valid: false, reason: 'Code already used by this customer' };
    }
  }
  
  return { valid: true };
};

discountCodeModel.methods.calculateDiscount = function(reservationAmount, reservationDays, carCategory) {
  // Check minimum value requirements
  if (this.hasMinimumValue) {
    if (this.minimumValueType === 'amount' && reservationAmount < this.minimumValue) {
      return { discount: 0, reason: `Minimum reservation value of €${this.minimumValue} required` };
    }
    if (this.minimumValueType === 'days' && reservationDays < this.minimumValue) {
      return { discount: 0, reason: `Minimum ${this.minimumValue} days required` };
    }
  }
  
  // Check category restrictions
  if (this.categoryRestrictions.length > 0) {
    if (!this.categoryRestrictions.includes(carCategory)) {
      return { discount: 0, reason: 'Code not valid for this car category' };
    }
  }
  
  // Calculate discount
  let discount = 0;
  if (this.discountType === 'percentage') {
    discount = (reservationAmount * this.discountValue) / 100;
  } else {
    discount = this.discountValue;
  }
  
  // Ensure discount doesn't exceed reservation amount
  discount = Math.min(discount, reservationAmount);
  
  return { discount, reason: null };
};

const WebsiteSettings = mongoose.model('WebsiteSettings', websiteSettingsSchema);
const DiscountCode = mongoose.model('DiscountCode', discountCodeModel);

module.exports = { WebsiteSettings, DiscountCode }; 