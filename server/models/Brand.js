const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true
  },
  logo: {
    type: String, // URL to Google Cloud Storage image
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for tenant + brand name uniqueness
brandSchema.index({ tenantId: 1, name: 1 }, { unique: true });

// Index for querying active brands
brandSchema.index({ tenantId: 1, isActive: 1 });

module.exports = mongoose.model('Brand', brandSchema);
