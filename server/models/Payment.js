const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: [true, 'Reservation is required']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD',
    uppercase: true,
    length: [3, 'Currency must be 3 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_transfer', 'cash', 'paypal', 'google_pay', 'apple_pay'],
      required: true
    },
    card: {
      brand: String,
      last4: String,
      expiryMonth: Number,
      expiryYear: Number,
      fingerprint: String
    },
    bankAccount: {
      bankName: String,
      accountType: String,
      last4: String
    }
  },
  stripePaymentIntentId: String,
  stripeChargeId: String,
  stripeFeeAmount: Number,
  transactionFee: {
    amount: Number,
    percentage: Number
  },
  breakdown: {
    subtotal: {
      type: Number,
      required: true
    },
    taxes: [{
      name: String,
      rate: Number,
      amount: Number
    }],
    fees: [{
      name: String,
      amount: Number,
      description: String
    }],
    discounts: [{
      name: String,
      amount: Number,
      percentage: Number
    }]
  },
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed']
    },
    stripeRefundId: String,
    processedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  invoice: {
    invoiceNumber: String,
    issuedAt: Date,
    dueAt: Date,
    paidAt: Date,
    url: String,
    downloadUrl: String
  },
  billingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  description: String,
  metadata: {
    type: Map,
    of: String
  },
  failureReason: String,
  processedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ reservation: 1 });
paymentSchema.index({ customer: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ 'invoice.invoiceNumber': 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });

// Pre-save middleware to generate payment ID and invoice number
paymentSchema.pre('save', async function(next) {
  if (!this.paymentId) {
    const count = await this.constructor.countDocuments();
    this.paymentId = `PAY${String(count + 1).padStart(6, '0')}`;
  }
  
  // Initialize invoice object if it doesn't exist
  if (!this.invoice) {
    this.invoice = {};
  }
  
  if (!this.invoice.invoiceNumber) {
    const count = await this.constructor.countDocuments({ 'invoice.invoiceNumber': { $exists: true } });
    this.invoice.invoiceNumber = `INV${String(count + 1).padStart(6, '0')}`;
    this.invoice.issuedAt = new Date();
  }
  
  next();
});

// Virtual for net amount (amount minus fees)
paymentSchema.virtual('netAmount').get(function() {
  const feeAmount = this.transactionFee?.amount || 0;
  const stripeFee = this.stripeFeeAmount || 0;
  return this.amount - feeAmount - stripeFee;
});

// Virtual for total refunded amount
paymentSchema.virtual('totalRefunded').get(function() {
  return this.refunds
    .filter(refund => refund.status === 'succeeded')
    .reduce((total, refund) => total + refund.amount, 0);
});

// Method to check if payment is successful
paymentSchema.methods.isSuccessful = function() {
  return this.status === 'succeeded';
};

// Method to check if payment can be refunded
paymentSchema.methods.canBeRefunded = function() {
  return this.status === 'succeeded' && this.totalRefunded < this.amount;
};

// Method to calculate refundable amount
paymentSchema.methods.getRefundableAmount = function() {
  if (!this.canBeRefunded()) return 0;
  return this.amount - this.totalRefunded;
};

// Static method to get payment statistics
paymentSchema.statics.getStatistics = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'succeeded'
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        averageAmount: { $avg: '$amount' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || { totalAmount: 0, totalTransactions: 0, averageAmount: 0 };
};

module.exports = mongoose.model('Payment', paymentSchema); 