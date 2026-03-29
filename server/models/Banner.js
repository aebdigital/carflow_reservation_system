const mongoose = require('mongoose');

const bannerImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'Image URL is required']
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
  altEn: {
    type: String,
    trim: true,
    maxlength: [200, 'English image alt text cannot exceed 200 characters']
  },
  altHu: {
    type: String,
    trim: true,
    maxlength: [200, 'Hungarian image alt text cannot exceed 200 characters']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Image title cannot exceed 100 characters']
  },
  titleEn: {
    type: String,
    trim: true,
    maxlength: [100, 'English image title cannot exceed 100 characters']
  },
  titleHu: {
    type: String,
    trim: true,
    maxlength: [100, 'Hungarian image title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Image description cannot exceed 500 characters']
  },
  descriptionEn: {
    type: String,
    trim: true,
    maxlength: [500, 'English image description cannot exceed 500 characters']
  },
  descriptionHu: {
    type: String,
    trim: true,
    maxlength: [500, 'Hungarian image description cannot exceed 500 characters']
  },
  carId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: false
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const bannerSchema = new mongoose.Schema({
  // Changed from single image to array of images (max 6)
  images: {
    type: [bannerImageSchema],
    validate: [
      {
        validator: function(images) {
          return images.length <= 6;
        },
        message: 'Maximum 6 images allowed per banner'
      },
      {
        validator: function(images) {
          return images.length >= 1;
        },
        message: 'At least 1 image is required'
      }
    ]
  },
  position: {
    type: String,
    enum: [
      'hero-section',
      'homepage-carousel-1',
      'homepage-carousel-2'
    ],
    default: 'hero-section',
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
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [500, 'Subtitle cannot exceed 500 characters']
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

// Virtual for primary image URL access (backward compatibility)
bannerSchema.virtual('imageUrl').get(function() {
  return this.images && this.images.length > 0 ? this.images[0].url : null;
});

// Virtual for primary image (backward compatibility)
bannerSchema.virtual('image').get(function() {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

// Virtual for checking if banner has any images
bannerSchema.virtual('hasImages').get(function() {
  return this.images && this.images.length > 0;
});

// Virtual for getting primary image with fallback structure
bannerSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    return this.images[0];
  }
  // Return a null object for safety
  return null;
});

// Virtual for getting all image URLs as array
bannerSchema.virtual('imageUrls').get(function() {
  if (this.images && this.images.length > 0) {
    return this.images.map(img => img.url);
  }
  return [];
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

// Instance method to add image
bannerSchema.methods.addImage = function(imageData) {
  if (this.images.length >= 6) {
    throw new Error('Maximum 6 images allowed per banner');
  }
  
  const sortOrder = this.images.length > 0 ? 
    Math.max(...this.images.map(img => img.sortOrder)) + 1 : 0;
  
  this.images.push({
    ...imageData,
    sortOrder
  });
  
  return this.save();
};

// Instance method to remove image by ID
bannerSchema.methods.removeImage = function(imageId) {
  this.images = this.images.filter(img => img._id.toString() !== imageId.toString());
  
  // Re-sort the remaining images
  this.images.forEach((img, index) => {
    img.sortOrder = index;
  });
  
  return this.save();
};

// Instance method to reorder images
bannerSchema.methods.reorderImages = function(imageIds) {
  const reorderedImages = [];
  
  imageIds.forEach((imageId, index) => {
    const image = this.images.find(img => img._id.toString() === imageId.toString());
    if (image) {
      image.sortOrder = index;
      reorderedImages.push(image);
    }
  });
  
  this.images = reorderedImages;
  return this.save();
};

// Pre-save middleware to ensure proper alt text and sort order
bannerSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    this.images.forEach((image, index) => {
      if (!image.alt) {
        image.alt = `Banner image ${index + 1} for ${this.position}`;
      }
      if (image.sortOrder === undefined) {
        image.sortOrder = index;
      }
    });
    
    // Sort images by sortOrder
    this.images.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  next();
});

module.exports = mongoose.model('Banner', bannerSchema); 