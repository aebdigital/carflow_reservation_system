const mongoose = require('mongoose');
const crypto = require('crypto');

const calendarTokenSchema = new mongoose.Schema({
  // The user who owns this calendar subscription
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Tenant ID for multi-tenant isolation
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  // The secure token for accessing the calendar feed
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Human-readable name for the subscription
  name: {
    type: String,
    default: 'Calendar Subscription'
  },
  // Whether this token is active
  isActive: {
    type: Boolean,
    default: true
  },
  // When the token was last used
  lastAccessedAt: {
    type: Date,
    default: null
  },
  // IP address of last access (for security monitoring)
  lastAccessedFrom: {
    type: String,
    default: null
  },
  // Optional: Token expiration date (null = never expires)
  expiresAt: {
    type: Date,
    default: null
  },
  // Revocation date (if token was revoked)
  revokedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
calendarTokenSchema.index({ tenantId: 1, userId: 1 });
calendarTokenSchema.index({ token: 1, isActive: 1 });

// Static method to generate a secure token
calendarTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Static method to create a new calendar subscription
calendarTokenSchema.statics.createSubscription = async function(userId, tenantId, name = 'Calendar Subscription') {
  const token = this.generateToken();

  const subscription = new this({
    userId,
    tenantId,
    token,
    name,
    isActive: true
  });

  await subscription.save();
  return subscription;
};

// Static method to find and validate a token
calendarTokenSchema.statics.findByToken = async function(token) {
  const subscription = await this.findOne({
    token,
    isActive: true,
    revokedAt: null
  });

  if (!subscription) {
    return null;
  }

  // Check if token has expired
  if (subscription.expiresAt && subscription.expiresAt < new Date()) {
    return null;
  }

  return subscription;
};

// Method to update last access info
calendarTokenSchema.methods.recordAccess = async function(ipAddress) {
  this.lastAccessedAt = new Date();
  this.lastAccessedFrom = ipAddress;
  await this.save();
};

// Method to revoke the token
calendarTokenSchema.methods.revoke = async function() {
  this.isActive = false;
  this.revokedAt = new Date();
  await this.save();
};

const CalendarToken = mongoose.model('CalendarToken', calendarTokenSchema);

module.exports = CalendarToken;
