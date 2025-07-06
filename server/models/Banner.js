const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
    maxlength: [100, 'Banner title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Banner description cannot exceed 500 characters']
  },
  image: {
    url: {
      type: String,
      required: [true, 'Banner image URL is required']
    },
    filename: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [200, 'Image alt text cannot exceed 200 characters']
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  link: {
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty links
          return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
        },
        message: 'Please enter a valid URL'
      }
    },
    text: {
      type: String,
      trim: true,
      maxlength: [50, 'Link text cannot exceed 50 characters'],
      default: 'Viac informácií'
    },
    target: {
      type: String,
      enum: ['_self', '_blank'],
      default: '_self'
    },
    isEnabled: {
      type: Boolean,
      default: false
    }
  },
  carousel: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    displayDuration: {
      type: Number,
      default: 5000, // 5 seconds in milliseconds
      min: [1000, 'Display duration must be at least 1 second'],
      max: [30000, 'Display duration cannot exceed 30 seconds']
    },
    transition: {
      type: String,
      enum: ['fade', 'slide', 'zoom'],
      default: 'fade'
    },
    autoPlay: {
      type: Boolean,
      default: true
    },
    showDots: {
      type: Boolean,
      default: true
    },
    showArrows: {
      type: Boolean,
      default: true
    }
  },
  placement: {
    page: {
      type: String,
      enum: ['homepage', 'car-listing', 'reservation', 'all-pages'],
      default: 'homepage'
    },
    position: {
      type: String,
      enum: ['top', 'middle', 'bottom', 'sidebar'],
      default: 'top'
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  styling: {
    backgroundColor: {
      type: String,
      default: '#ffffff',
      validate: {
        validator: function(v) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Background color must be a valid hex color'
      }
    },
    textColor: {
      type: String,
      default: '#000000',
      validate: {
        validator: function(v) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Text color must be a valid hex color'
      }
    },
    borderRadius: {
      type: Number,
      default: 8,
      min: 0,
      max: 50
    },
    shadow: {
      type: Boolean,
      default: true
    },
    overlay: {
      isEnabled: {
        type: Boolean,
        default: false
      },
      color: {
        type: String,
        default: '#000000'
      },
      opacity: {
        type: Number,
        default: 0.3,
        min: 0,
        max: 1
      }
    }
  },
  schedule: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: Date,
      validate: {
        validator: function(v) {
          if (!this.schedule.isScheduled) return true;
          return v && v > new Date();
        },
        message: 'Start date must be in the future'
      }
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(v) {
          if (!this.schedule.isScheduled) return true;
          return v && this.schedule.startDate && v > this.schedule.startDate;
        },
        message: 'End date must be after start date'
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Tenant ID is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator ID is required']
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
bannerSchema.index({ tenantId: 1, isActive: 1, isPublic: 1 });
bannerSchema.index({ tenantId: 1, 'placement.page': 1, 'placement.position': 1 });
bannerSchema.index({ tenantId: 1, sortOrder: 1 });
bannerSchema.index({ tenantId: 1, 'schedule.startDate': 1, 'schedule.endDate': 1 });

// Virtual for checking if banner is currently active based on schedule
bannerSchema.virtual('isCurrentlyActive').get(function() {
  if (!this.isActive) return false;
  
  if (this.schedule.isScheduled) {
    const now = new Date();
    const start = this.schedule.startDate;
    const end = this.schedule.endDate;
    
    if (start && now < start) return false;
    if (end && now > end) return false;
  }
  
  return true;
});

// Virtual for image URLs with different sizes
bannerSchema.virtual('imageUrls').get(function() {
  if (!this.image || !this.image.url) return null;
  
  const baseUrl = this.image.url.replace('_medium.', '_');
  return {
    thumbnail: baseUrl.replace('_', '_thumb_'),
    medium: this.image.url,
    large: baseUrl.replace('_', '_large_'),
    original: baseUrl.replace('_medium', '')
  };
});

// Static method to get active banners for a page
bannerSchema.statics.getActiveBanners = function(tenantId, page = 'homepage', position = null) {
  const query = {
    tenantId,
    isActive: true,
    isPublic: true,
    'placement.page': { $in: [page, 'all-pages'] }
  };
  
  if (position) {
    query['placement.position'] = position;
  }
  
  // Add date filtering for scheduled banners
  const now = new Date();
  query.$or = [
    { 'schedule.isScheduled': false },
    {
      'schedule.isScheduled': true,
      'schedule.startDate': { $lte: now },
      'schedule.endDate': { $gte: now }
    }
  ];
  
  return this.find(query)
    .sort({ 'placement.priority': -1, sortOrder: 1, createdAt: -1 })
    .populate('createdBy', 'name email')
    .populate('lastModifiedBy', 'name email');
};

// Static method to get carousel banners
bannerSchema.statics.getCarouselBanners = function(tenantId, page = 'homepage') {
  return this.getActiveBanners(tenantId, page).then(banners => {
    return banners.filter(banner => banner.carousel.isEnabled);
  });
};

// Instance method to check if banner should be displayed
bannerSchema.methods.shouldDisplay = function() {
  if (!this.isActive || !this.isPublic) return false;
  
  if (this.schedule.isScheduled) {
    const now = new Date();
    const start = this.schedule.startDate;
    const end = this.schedule.endDate;
    
    if (start && now < start) return false;
    if (end && now > end) return false;
  }
  
  return true;
};

// Pre-save middleware to ensure proper data consistency
bannerSchema.pre('save', function(next) {
  // Set default alt text if not provided
  if (!this.image.alt && this.title) {
    this.image.alt = this.title;
  }
  
  // Ensure link text is set if link is enabled
  if (this.link.isEnabled && !this.link.text) {
    this.link.text = 'Viac informácií';
  }
  
  // Validate schedule dates if scheduling is enabled
  if (this.schedule.isScheduled) {
    if (!this.schedule.startDate || !this.schedule.endDate) {
      return next(new Error('Start date and end date are required when scheduling is enabled'));
    }
    
    if (this.schedule.endDate <= this.schedule.startDate) {
      return next(new Error('End date must be after start date'));
    }
  }
  
  next();
});

module.exports = mongoose.model('Banner', bannerSchema); 