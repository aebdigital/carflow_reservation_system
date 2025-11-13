const mongoose = require('mongoose');

/**
 * QR Counter for tracking sequential variable symbols per tenant per year
 * Used primarily by LeRent to generate variable symbols like 20250001, 20250002, etc.
 */
const qrCounterSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  counter: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
qrCounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

/**
 * Get next variable symbol for a tenant in the current year
 * Format: YYYY + 4-digit counter (e.g., 20250001, 20250002)
 */
qrCounterSchema.statics.getNextVariableSymbol = async function(tenantId) {
  const currentYear = new Date().getFullYear();

  // Find and increment counter atomically
  const result = await this.findOneAndUpdate(
    { tenantId, year: currentYear },
    { $inc: { counter: 1 } },
    {
      new: true,
      upsert: true, // Create if doesn't exist
      setDefaultsOnInsert: true
    }
  );

  // Format as YYYY + 4-digit counter
  const paddedCounter = result.counter.toString().padStart(4, '0');
  const variableSymbol = `${currentYear}${paddedCounter}`;

  console.log('🔢 [QR COUNTER] Generated variable symbol:', {
    tenantId,
    year: currentYear,
    counter: result.counter,
    variableSymbol
  });

  return variableSymbol;
};

module.exports = mongoose.model('QRCounter', qrCounterSchema);
