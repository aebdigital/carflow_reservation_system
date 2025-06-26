const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxLength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxLength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[\+]?[0-9]{8,15}$/, 'Please provide a valid phone number']
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'staff'],
    default: 'customer'
  },
  // Tenant separation - each user belongs to a tenant organization
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  // Storage folder path for user-specific files
  storageFolder: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  licenseNumber: {
    type: String,
    required: function() { return this.role === 'customer'; },
    unique: true,
    sparse: true
  },
  licenseExpiry: {
    type: Date,
    required: function() { return this.role === 'customer'; }
  },
  dateOfBirth: {
    type: Date,
    required: false
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  blacklistReason: String,
  totalBookings: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastLogin: Date,
  refreshToken: String
}, {
  timestamps: true
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ licenseNumber: 1 });
userSchema.index({ role: 1 });
// Compound index for tenant-based queries
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, isActive: 1 });

// Generate unique storage folder path before saving
userSchema.pre('save', async function(next) {
  // Generate tenantId and storageFolder for new users
  if (this.isNew) {
    // For admin users, they become their own tenant
    if (this.role === 'admin') {
      this.tenantId = this._id;
    } else {
      // For other users, assign them to an existing tenant or create new one
      // For now, each user gets their own tenant for complete separation
      this.tenantId = this._id;
    }
    
    // Generate unique storage folder path
    this.storageFolder = `tenant-${this.tenantId}/user-${this._id}`;
  }
  
  // Hash password if modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Get tenant-scoped query filter
userSchema.methods.getTenantFilter = function() {
  return { tenantId: this.tenantId };
};

// Transform output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  return userObject;
};

module.exports = mongoose.model('User', userSchema); 