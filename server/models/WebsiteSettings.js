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

// Enhanced Modal Schema for multiple modals
const modalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Modal name is required'],
    maxLength: [50, 'Modal name cannot exceed 50 characters'],
    trim: true
  },
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
    enum: ['newsletter', 'info', 'discount', 'announcement', 'promotion'],
    required: [true, 'Modal type is required']
  },
  displayLocation: {
    type: String,
    enum: ['all-pages', 'homepage', 'pricing', 'contact', 'about', 'cars'],
    default: 'all-pages'
  },
  targetPages: [{
    type: String,
    enum: ['homepage', 'pricing', 'contact', 'about', 'cars', 'reservation']
  }],
  triggerRule: {
    type: {
      type: String,
      enum: ['time', 'scroll', 'exit', 'page-load', 'manual'],
      default: 'time'
    },
    value: {
      type: Number,
      default: 5 // 5 seconds for time, 50% for scroll
    }
  },
  frequency: {
    type: String,
    enum: ['every-visit', 'once-per-session', 'once-per-day', 'once-per-week', 'once-ever'],
    default: 'every-visit'
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  // Newsletter specific fields
  emailPlaceholder: {
    type: String,
    default: 'Zadajte váš email'
  },
  buttonText: {
    type: String,
    default: 'Získať zľavu'
  },
  secondaryButtonText: {
    type: String,
    default: 'Možno neskôr'
  },
  // Discount specific fields
  discountCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed-amount'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    min: 0
  },
  // Styling options
  styling: {
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
    },
    buttonTextColor: {
      type: String,
      default: '#ffffff'
    },
    borderColor: {
      type: String,
      default: '#e0e0e0'
    },
    borderRadius: {
      type: Number,
      default: 8
    },
    fontSize: {
      type: String,
      default: '16px'
    },
    width: {
      type: String,
      default: '400px'
    },
    position: {
      type: String,
      enum: ['center', 'top-right', 'top-left', 'bottom-right', 'bottom-left'],
      default: 'center'
    }
  },
  // Advanced settings
  settings: {
    showCloseButton: {
      type: Boolean,
      default: true
    },
    closeable: {
      type: Boolean,
      default: true
    },
    overlay: {
      type: Boolean,
      default: true
    },
    overlayOpacity: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1
    },
    animation: {
      type: String,
      enum: ['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom'],
      default: 'fade'
    },
    exitIntent: {
      type: Boolean,
      default: false
    },
    mobileResponsive: {
      type: Boolean,
      default: true
    }
  },
  // Analytics and tracking
  analytics: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    dismissals: {
      type: Number,
      default: 0
    },
    lastShown: {
      type: Date
    }
  },
  // Creation tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual for conversion rate
modalSchema.virtual('conversionRate').get(function() {
  if (this.analytics.impressions === 0) return 0;
  return ((this.analytics.conversions / this.analytics.impressions) * 100).toFixed(2);
});

// Virtual for click-through rate
modalSchema.virtual('clickThroughRate').get(function() {
  if (this.analytics.impressions === 0) return 0;
  return ((this.analytics.clicks / this.analytics.impressions) * 100).toFixed(2);
});

// Method to check if modal should be displayed
modalSchema.methods.shouldDisplay = function(page = 'homepage', userTimezone = 'Europe/Bratislava') {
  const now = new Date();
  
  // Check if active
  if (!this.isActive) return false;
  
  // Check date range
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  
  // Check display location
  if (this.displayLocation !== 'all-pages') {
    if (this.displayLocation !== page) return false;
  }
  
  // Check target pages
  if (this.targetPages && this.targetPages.length > 0) {
    if (!this.targetPages.includes(page)) return false;
  }
  
  return true;
};

// Method to increment analytics
modalSchema.methods.recordImpression = function() {
  this.analytics.impressions += 1;
  this.analytics.lastShown = new Date();
  return this;
};

modalSchema.methods.recordClick = function() {
  this.analytics.clicks += 1;
  return this;
};

modalSchema.methods.recordConversion = function() {
  this.analytics.conversions += 1;
  return this;
};

modalSchema.methods.recordDismissal = function() {
  this.analytics.dismissals += 1;
  return this;
};

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
  
  // Multiple Modals Settings (changed from single modal to array)
  modals: [modalSchema],
  
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Static method to get active modals for a tenant and page
websiteSettingsSchema.methods.getActiveModals = function(page = 'homepage') {
  return this.modals.filter(modal => {
    const now = new Date();
    
    // Check if active
    if (!modal.isActive) return false;
    
    // Check date range
    if (modal.startDate && now < modal.startDate) return false;
    if (modal.endDate && now > modal.endDate) return false;
    
    // Check display location
    if (modal.displayLocation !== 'all-pages') {
      if (modal.displayLocation !== page) return false;
    }
    
    // Check target pages
    if (modal.targetPages && modal.targetPages.length > 0) {
      if (!modal.targetPages.includes(page)) return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by priority (descending) then by creation date (newest first)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

const WebsiteSettings = mongoose.model('WebsiteSettings', websiteSettingsSchema);
const DiscountCode = mongoose.model('DiscountCode', discountCodeModel);

module.exports = { WebsiteSettings, DiscountCode }; 