const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  // Tenant separation
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  // Equipment details
  name: {
    type: String,
    required: [true, 'Equipment name is required'],
    trim: true,
    maxLength: [100, 'Equipment name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    maxLength: [500, 'Equipment description cannot exceed 500 characters'],
    trim: true
  },
  
  icon: {
    type: String,
    trim: true
  },
  
  category: {
    type: String,
    enum: ['safety', 'comfort', 'technology', 'performance', 'exterior', 'interior'],
    required: [true, 'Equipment category is required']
  },
  
  // Default for new cars
  isStandardEquipment: {
    type: Boolean,
    default: false
  },
  
  // Visibility and status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  
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
equipmentSchema.index({ tenantId: 1, isActive: 1 });
equipmentSchema.index({ tenantId: 1, category: 1 });
equipmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });

// Method to increment usage count
equipmentSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Method to decrement usage count
equipmentSchema.methods.decrementUsage = function() {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
  }
  return this.save();
};

// Static method to get standard equipment for category
equipmentSchema.statics.getStandardForCategory = function(tenantId, category) {
  return this.find({
    tenantId,
    isActive: true,
    isStandardEquipment: true,
    $or: [
      { category },
      { category: { $exists: false } } // Include uncategorized standard equipment
    ]
  });
};

module.exports = mongoose.model('Equipment', equipmentSchema); 