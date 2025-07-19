const mongoose = require('mongoose');

const emailSubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  source: {
    type: String,
    enum: ['website', 'newsletter', 'manual', 'import', 'popup', 'footer'],
    default: 'website'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  emailOptOut: {
    type: Boolean,
    default: false
  },
  emailOptOutDate: Date,
  emailOptOutReason: String,
  subscribedDate: {
    type: Date,
    default: Date.now
  },
  lastEmailDate: {
    type: Date,
    default: null
  },
  unsubscribeToken: {
    type: String,
    unique: true,
    default: function() {
      return require('crypto').randomBytes(32).toString('hex');
    }
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  consentGiven: {
    type: Boolean,
    default: true
  },
  consentDate: {
    type: Date,
    default: Date.now
  },
  // Optional additional fields for segmentation
  location: {
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    region: { type: String, default: '' }
  },
  preferences: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'never'],
      default: 'weekly'
    },
    categories: [{
      type: String,
      enum: ['promotions', 'news', 'updates', 'offers', 'events']
    }]
  },
  // Tenant separation - important for multi-tenant system
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index for tenant and email uniqueness
emailSubscriptionSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Index for efficient queries
emailSubscriptionSchema.index({ isActive: 1 });
emailSubscriptionSchema.index({ source: 1 });
emailSubscriptionSchema.index({ subscribedDate: -1 });
emailSubscriptionSchema.index({ tags: 1 });

// Virtual for full name
emailSubscriptionSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Method to unsubscribe
emailSubscriptionSchema.methods.unsubscribe = function() {
  this.isActive = false;
  this.unsubscribeDate = new Date();
  return this.save();
};

// Method to resubscribe
emailSubscriptionSchema.methods.resubscribe = function() {
  this.isActive = true;
  this.unsubscribeDate = null;
  return this.save();
};

// Method to add tags
emailSubscriptionSchema.methods.addTags = function(newTags) {
  newTags.forEach(tag => {
    if (!this.tags.includes(tag.toLowerCase())) {
      this.tags.push(tag.toLowerCase());
    }
  });
  return this.save();
};

// Method to remove tags
emailSubscriptionSchema.methods.removeTags = function(tagsToRemove) {
  tagsToRemove.forEach(tag => {
    const index = this.tags.indexOf(tag.toLowerCase());
    if (index > -1) {
      this.tags.splice(index, 1);
    }
  });
  return this.save();
};

// Static method to get active subscribers
emailSubscriptionSchema.statics.getActiveSubscribers = function(tenantId, filters = {}) {
  const query = { tenantId, isActive: true, ...filters };
  return this.find(query);
};

// Static method to get by source
emailSubscriptionSchema.statics.getBySource = function(tenantId, source) {
  return this.find({ tenantId, source });
};

// Static method to get by tags
emailSubscriptionSchema.statics.getByTags = function(tenantId, tags) {
  return this.find({ tenantId, tags: { $in: tags } });
};

// Static method to get statistics
emailSubscriptionSchema.statics.getStats = function(tenantId) {
  return this.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        inactive: { $sum: { $cond: ['$isActive', 0, 1] } }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        active: 1,
        inactive: 1
      }
    }
  ]);
};

// Static method to get source statistics
emailSubscriptionSchema.statics.getSourceStats = function(tenantId) {
  return this.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } }
      }
    },
    {
      $project: {
        source: '$_id',
        count: 1,
        active: 1,
        _id: 0
      }
    }
  ]);
};

module.exports = mongoose.model('EmailSubscription', emailSubscriptionSchema); 