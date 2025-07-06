const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
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
      maxlength: [200, 'Image alt text cannot exceed 200 characters'],
      default: 'Banner image'
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  position: {
    type: String,
    enum: [
      'homepage-hero',
      'homepage-section', 
      'cars-hero',
      'cars-section',
      'contact-hero',
      'contact-section',
      'about-hero',
      'about-section',
      'footer',
      'header'
    ],
    default: 'homepage-hero',
    required: [true, 'Banner position is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying
bannerSchema.index({ tenantId: 1, position: 1, isActive: 1, sortOrder: 1 });
bannerSchema.index({ tenantId: 1, isActive: 1, sortOrder: 1 });

// Virtual for image URL access
bannerSchema.virtual('imageUrl').get(function() {
  return this.image.url;
});

// Method to get active banners for specific position
bannerSchema.statics.getActiveByPosition = function(tenantId, position) {
  return this.find({
    tenantId,
    position,
    isActive: true
  }).sort({ sortOrder: 1 });
};

// Method to get all active banners for a tenant
bannerSchema.statics.getActiveForTenant = function(tenantId) {
  return this.find({
    tenantId,
    isActive: true
  }).sort({ position: 1, sortOrder: 1 });
};

// Pre-save middleware to ensure proper alt text
bannerSchema.pre('save', function(next) {
  if (!this.image.alt) {
    this.image.alt = `Banner image for ${this.position}`;
  }
  next();
});

module.exports = mongoose.model('Banner', bannerSchema); 