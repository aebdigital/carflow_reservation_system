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
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function() {
      // Password is only required for admin and staff roles
      return this.role === 'admin' || this.role === 'staff';
    },
    minLength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
    // Removed strict phone format validation - accept any phone number
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'staff'],
    default: 'customer'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted'],
    default: 'active'
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
    required: false, // Made optional to support public API customers without license
    // Removed global unique constraint - allow same license across tenants and repeat customers
    sparse: true
  },
  licenseExpiry: {
    type: Date,
    required: false // Made optional to support public API customers without license
  },
  idNumber: {
    type: String, // Číslo OP (ID card number)
    sparse: true,
    trim: true
  },
  rodneCislo: {
    type: String, // Rodné číslo (birth number) - NitraCar only
    sparse: true,
    trim: true
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
  emailOptOut: {
    type: Boolean,
    default: false
  },
  emailOptOutDate: Date,
  emailOptOutReason: String,
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
userSchema.index({ role: 1 });
// Compound index for tenant-based queries
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, isActive: 1 });
// Compound unique index: email is unique within each tenant
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
// Compound unique index: license number is unique within each tenant (allows same customer across tenants)
userSchema.index({ licenseNumber: 1, tenantId: 1 }, { unique: true, sparse: true });

// Generate unique storage folder path before saving
userSchema.pre('save', async function(next) {
  // Generate tenantId and storageFolder for new users
  if (this.isNew) {
    // Only set tenantId if it's not already provided
    if (!this.tenantId) {
      // For admin users, they become their own tenant
      if (this.role === 'admin') {
        this.tenantId = this._id;
      } else {
        // For other users, assign them to an existing tenant or create new one
        // For now, each user gets their own tenant for complete separation
        this.tenantId = this._id;
      }
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