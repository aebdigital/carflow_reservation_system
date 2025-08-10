const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Demo Stripe-like functions
const createDemoPaymentIntent = (amount, currency = 'USD') => {
  return {
    id: `pi_demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    amount: amount * 100, // Stripe uses cents
    currency: currency.toLowerCase(),
    status: 'requires_payment_method',
    client_secret: `pi_demo_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`
  };
};

const processDemoPayment = async (paymentIntentId, paymentMethodType = 'card') => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Random success/failure for demo (90% success rate)
  const isSuccess = Math.random() > 0.1;
  
  return {
    id: paymentIntentId,
    status: isSuccess ? 'succeeded' : 'failed',
    charges: {
      data: [{
        id: `ch_demo_${Date.now()}`,
        amount: 5000, // Example amount in cents
        currency: 'usd',
        payment_method_details: {
          type: paymentMethodType,
          card: paymentMethodType === 'card' ? {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025
          } : null
        }
      }]
    },
    application_fee_amount: isSuccess ? 150 : 0 // 3% fee
  };
};

// @desc    Create payment intent
// @route   POST /api/payments/create-payment-intent
// @access  Private
const createPaymentIntent = asyncHandler(async (req, res, next) => {
  const { reservationId, amount, currency = 'USD', description, paymentMethod = 'card', dueDate } = req.body;

  // Validate reservation (tenant-scoped)
  const reservation = await Reservation.findOne({
    _id: reservationId,
    tenantId: req.user.tenantId
  }).populate('customer').populate('car');
  if (!reservation) {
    return next(new AppError('Reservation not found', 404));
  }

  // Check if user owns the reservation or is staff
  if (req.user.role === 'customer' && reservation.customer._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to create payment for this reservation', 403));
  }

  // Use reservation total amount if not provided
  let paymentAmount = amount || reservation.pricing?.totalAmount || 0;
  
  // Fallback: if totalAmount is 0 but we have dailyRate and totalDays, calculate it
  if (paymentAmount <= 0 && reservation.pricing?.dailyRate && reservation.pricing?.totalDays) {
    const calculatedSubtotal = reservation.pricing.dailyRate * reservation.pricing.totalDays;
    const calculatedTaxes = reservation.pricing.taxes || 0;
    const calculatedFees = reservation.pricing.fees?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
    const calculatedDiscounts = reservation.pricing.discounts?.reduce((sum, discount) => sum + (discount.amount || 0), 0) || 0;
    
    paymentAmount = calculatedSubtotal + calculatedTaxes + calculatedFees - calculatedDiscounts;
    
    console.log('DEBUG: Calculated payment amount from reservation pricing:', {
      dailyRate: reservation.pricing.dailyRate,
      totalDays: reservation.pricing.totalDays,
      calculatedSubtotal,
      calculatedTaxes,
      calculatedFees,
      calculatedDiscounts,
      finalAmount: paymentAmount
    });
  }
  
  if (paymentAmount <= 0) {
    console.log('DEBUG: Payment amount validation failed:', {
      providedAmount: amount,
      reservationPricing: reservation.pricing,
      calculatedAmount: paymentAmount
    });
    return next(new AppError(`Invalid payment amount (${paymentAmount}). Please ensure the reservation has valid pricing or provide a valid amount.`, 400));
  }

  // Create demo payment intent
  const paymentIntent = createDemoPaymentIntent(paymentAmount, currency);

  // Create payment record - let pre-save middleware handle paymentId and invoice number generation
  const payment = await Payment.create({
    reservation: reservationId,
    customer: reservation.customer._id,
    amount: paymentAmount,
    currency,
    status: 'pending',
    paymentMethod: {
      type: paymentMethod
    },
    stripePaymentIntentId: paymentIntent.id,
    breakdown: {
      subtotal: reservation.pricing?.subtotal || (reservation.pricing?.dailyRate * reservation.pricing?.totalDays) || paymentAmount,
      taxes: reservation.pricing?.taxes ? [{ 
        name: 'Tax', 
        rate: 0.1, 
        amount: reservation.pricing.taxes 
      }] : [], // 🔧 REMOVED DEFAULT TAX - No taxes applied when not in reservation
      fees: reservation.pricing?.fees || [],
      discounts: reservation.pricing?.discounts || []
    },
    invoice: {
      dueAt: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    },
    description: description || `Payment for reservation ${reservation.reservationNumber}`,
    createdBy: req.user._id,
    tenantId: req.user.tenantId // Add tenant separation
  });

  // Update reservation with payment reference
  reservation.payment = payment._id;
  await reservation.save();

  // Populate the payment for response
  const populatedPayment = await Payment.findById(payment._id)
    .populate({
      path: 'reservation',
      select: 'reservationNumber startDate endDate pricing',
      populate: {
        path: 'car',
        select: 'brand model year registrationNumber category'
      }
    })
    .populate('customer', 'firstName lastName email phone');

  res.status(201).json({
    success: true,
    data: {
      payment: populatedPayment,
      clientSecret: paymentIntent.client_secret,
      demo: {
        message: 'This is a demo payment. Use test card 4242 4242 4242 4242 with any future date and CVC.',
        paymentIntentId: paymentIntent.id
      }
    }
  });
});

// @desc    Confirm payment (demo)
// @route   POST /api/payments/confirm
// @access  Private
const confirmPayment = asyncHandler(async (req, res, next) => {
  const { paymentIntentId, paymentMethodType = 'card' } = req.body;

  console.log('DEBUG: Confirming payment with intentId:', paymentIntentId);

  // Find payment by Stripe payment intent ID
  const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
  
  if (!payment) {
    console.log('DEBUG: Payment not found for intentId:', paymentIntentId);
    return next(new AppError('Payment not found', 404));
  }

  console.log('DEBUG: Found payment:', payment.paymentId, 'Status:', payment.status);

  // Process demo payment
  const result = await processDemoPayment(paymentIntentId, paymentMethodType);

  if (result.status === 'succeeded') {
    // Update payment status
    payment.status = 'succeeded';
    payment.processedAt = new Date();
    payment.stripeChargeId = result.charges.data[0].id;
    payment.stripeFeeAmount = result.application_fee_amount / 100; // Convert from cents
    
    // Update payment method details
    if (result.charges.data[0].payment_method_details.card) {
      payment.paymentMethod.card = {
        brand: result.charges.data[0].payment_method_details.card.brand,
        last4: result.charges.data[0].payment_method_details.card.last4,
        expiryMonth: result.charges.data[0].payment_method_details.card.exp_month,
        expiryYear: result.charges.data[0].payment_method_details.card.exp_year
      };
    }

    // Generate invoice
    payment.invoice.issuedAt = new Date();
    payment.invoice.paidAt = new Date();
    
    await payment.save();

    // Update reservation status
    const reservation = await Reservation.findById(payment.reservation);
    if (reservation && reservation.status === 'pending') {
      reservation.status = 'confirmed';
      await reservation.save();
    }

    console.log('DEBUG: Payment confirmed successfully:', payment.paymentId);

    res.status(200).json({
      success: true,
      data: payment,
      demo: {
        message: 'Demo payment successful! In production, this would be handled by Stripe webhooks.'
      }
    });
  } else {
    // Payment failed
    payment.status = 'failed';
    payment.failureReason = 'Demo payment failure';
    await payment.save();

    console.log('DEBUG: Payment failed:', payment.paymentId);

    res.status(400).json({
      success: false,
      message: 'Payment failed',
      demo: {
        message: 'Demo payment failed. This is randomly generated for testing purposes.'
      }
    });
  }
});

// @desc    Get all payments (tenant-scoped)
// @route   GET /api/payments
// @access  Private/Staff
const getPayments = asyncHandler(async (req, res, next) => {
  // Start with tenant filter
  const baseQuery = { tenantId: req.user.tenantId };

  // Copy req.query and merge with tenant filter
  const reqQuery = { ...req.query };

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit', 'populate'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify({ ...baseQuery, ...reqQuery });

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource with tenant filter
  let query = Payment.find(JSON.parse(queryStr));

  // Enhanced population based on query parameter or default comprehensive population
  if (req.query.populate) {
    const populateFields = req.query.populate.split(',');
    populateFields.forEach(field => {
      if (field === 'reservation') {
        query = query.populate({
          path: 'reservation',
          select: 'reservationNumber startDate endDate totalAmount pickupLocation dropoffLocation',
          populate: {
            path: 'car',
            select: 'brand model year registrationNumber category'
          }
        });
      } else if (field === 'customer') {
        query = query.populate('customer', 'firstName lastName email phone');
      }
    });
  } else {
    // Default comprehensive population
    query = query.populate({
      path: 'reservation',
      select: 'reservationNumber startDate endDate pricing pickupLocation dropoffLocation',
      populate: {
        path: 'car',
        select: 'brand model year registrationNumber category'
      }
    }).populate('customer', 'firstName lastName email phone');
  }

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Payment.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Execute query
  const payments = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: payments.length,
    pagination,
    data: payments
  });
});

// @desc    Get single payment (tenant-scoped)
// @route   GET /api/payments/:id
// @access  Private
const getPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  })
    .populate('reservation')
    .populate('customer')
    .populate('createdBy', 'firstName lastName email');

  if (!payment) {
    return next(new AppError(`Payment not found with id of ${req.params.id}`, 404));
  }

  // Check authorization
  if (req.user.role === 'customer' && payment.customer._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this payment', 403));
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Update payment status (Zaplatene/Nezaplatene)
// @route   PUT /api/payments/:id/status
// @access  Private/Staff
const updatePaymentStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  
  // Validate status
  const validStatuses = ['pending', 'succeeded', 'failed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid payment status', 400));
  }

  const payment = await Payment.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate('reservation').populate('customer');

  if (!payment) {
    return next(new AppError(`Payment not found with id of ${req.params.id}`, 404));
  }

  // Update payment status
  payment.status = status;
  
  // If marking as succeeded (Zaplatene), update payment timestamps
  if (status === 'succeeded') {
    payment.processedAt = new Date();
    if (payment.invoice) {
      payment.invoice.paidAt = new Date();
    }
  } else if (status === 'pending') {
    // If reverting to pending (Nezaplatene), clear payment timestamps
    payment.processedAt = null;
    if (payment.invoice) {
      payment.invoice.paidAt = null;
    }
  }

  await payment.save();

  // Update reservation status if needed
  if (payment.reservation) {
    const reservation = await Reservation.findById(payment.reservation._id);
    if (reservation) {
      if (status === 'succeeded' && reservation.status === 'pending') {
        reservation.status = 'confirmed';
        await reservation.save();
      }
    }
  }

  res.status(200).json({
    success: true,
    data: payment,
    message: `Payment status updated to ${status === 'succeeded' ? 'Zaplatené' : status === 'pending' ? 'Nezaplatené' : status}`
  });
});

// @desc    Process refund
// @route   POST /api/payments/:id/refund
// @access  Private/Staff
const processRefund = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });

  if (!payment) {
    return next(new AppError(`Payment not found with id of ${req.params.id}`, 404));
  }

  if (!payment.canBeRefunded()) {
    return next(new AppError('Payment cannot be refunded', 400));
  }

  const { amount, reason } = req.body;
  const refundAmount = amount || payment.getRefundableAmount();

  if (refundAmount > payment.getRefundableAmount()) {
    return next(new AppError('Refund amount exceeds refundable amount', 400));
  }

  // Create demo refund
  const refund = {
    refundId: `re_demo_${Date.now()}`,
    amount: refundAmount,
    reason: reason || 'Requested by admin',
    status: 'succeeded', // In demo, refunds always succeed
    stripeRefundId: `re_demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    processedAt: new Date()
  };

  payment.refunds.push(refund);

  // Update payment status
  if (payment.totalRefunded >= payment.amount) {
    payment.status = 'refunded';
  } else {
    payment.status = 'partially_refunded';
  }

  await payment.save();

  res.status(200).json({
    success: true,
    data: payment,
    demo: {
      message: 'Demo refund processed successfully! In production, this would be handled via Stripe API.'
    }
  });
});

// @desc    Generate invoice PDF (tenant-scoped)
// @route   GET /api/payments/:id/invoice
// @access  Private
const generateInvoice = asyncHandler(async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    })
      .populate({
        path: 'reservation',
        populate: {
          path: 'car',
          select: 'brand model year registrationNumber category'
        }
      })
      .populate('customer', 'firstName lastName email phone address');

    if (!payment) {
      return next(new AppError(`Payment not found with id of ${req.params.id}`, 404));
    }

    // Check authorization
    if (req.user.role === 'customer' && payment.customer._id.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to access this invoice', 403));
    }

    // Ensure invoice object exists
    if (!payment.invoice || !payment.invoice.invoiceNumber) {
      return next(new AppError('Invoice not generated for this payment', 400));
    }

    // Create PDF with proper encoding
    const doc = new PDFDocument({ 
      margin: 50,
      info: {
        Title: 'Faktura',
        Author: 'CarFlow',
        Subject: 'Faktura za prenajom vozidla'
      }
    });
    
    // Set response headers based on preview mode
    const isPreview = req.query.preview === 'true';
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    
    if (isPreview) {
      // For preview, display inline in browser
      res.setHeader('Content-Disposition', `inline; filename="invoice-${payment.invoice.invoiceNumber}.pdf"`);
    } else {
      // For download, force download
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${payment.invoice.invoiceNumber}.pdf"`);
    }

    // Pipe PDF to response
    doc.pipe(res);

    // Company Header
    doc.fontSize(24).fillColor('#2563eb').text('CarFlow - Prenajom vozidiel', 50, 50);
    doc.fontSize(10).fillColor('#666666')
       .text('Hlavna ulica 123', 50, 80)
       .text('Bratislava 81000, Slovensko', 50, 95)
       .text('Telefon: +421 2 1234 5678', 50, 110)
       .text('Email: info@carflow.sk', 50, 125);

    // Invoice Title
    doc.fontSize(20).fillColor('#000000').text('FAKTURA', 400, 50);
    
    // Invoice details box
    doc.rect(400, 70, 150, 100).stroke();
    doc.fontSize(10).fillColor('#666666')
       .text(`Faktura c.: ${payment.invoice.invoiceNumber || 'N/A'}`, 410, 80)
       .text(`Datum vystavenia: ${payment.invoice.issuedAt?.toLocaleDateString('sk-SK') || new Date().toLocaleDateString('sk-SK')}`, 410, 95)
       .text(`Datum splatnosti: ${payment.invoice.dueAt?.toLocaleDateString('sk-SK') || 'Pri obdrzani'}`, 410, 110)
       .text(`Datum platby: ${payment.invoice.paidAt?.toLocaleDateString('sk-SK') || 'Caka sa'}`, 410, 125)
       .text(`Stav: ${(payment.status || 'pending') === 'pending' ? 'CAKA SA' : (payment.status || 'pending') === 'succeeded' ? 'ZAPLATENE' : (payment.status || 'CAKA SA').toUpperCase()}`, 410, 140);

    // Customer details
    doc.fontSize(12).fillColor('#000000').text('Odberatel:', 50, 200);
    doc.fontSize(10).fillColor('#666666')
       .text(`${payment.customer?.firstName || ''} ${payment.customer?.lastName || ''}`, 50, 220)
       .text(`${payment.customer?.email || 'N/A'}`, 50, 235);
    
    if (payment.customer?.phone) {
      doc.text(`Telefon: ${payment.customer.phone}`, 50, 250);
    }

    // Reservation details
    if (payment.reservation) {
      doc.fontSize(12).fillColor('#000000').text('Detaily rezervacie:', 50, 290);
      doc.fontSize(10).fillColor('#666666')
         .text(`Rezervacia c.: ${payment.reservation.reservationNumber || 'N/A'}`, 50, 310);
      
      if (payment.reservation.startDate && payment.reservation.endDate) {
        doc.text(`Obdobie prenajmu: ${new Date(payment.reservation.startDate).toLocaleDateString('sk-SK')} - ${new Date(payment.reservation.endDate).toLocaleDateString('sk-SK')}`, 50, 325);
      }
      
      if (payment.reservation.car) {
        const car = payment.reservation.car;
        doc.text(`Vozidlo: ${car.year || ''} ${car.brand || ''} ${car.model || ''}`, 50, 340)
           .text(`SPZ: ${car.registrationNumber || 'N/A'}`, 50, 355)
           .text(`Kategoria: ${car.category || 'N/A'}`, 50, 370);
      }

      if (payment.reservation.pickupLocation?.name) {
        doc.text(`Miesto prevzatia: ${payment.reservation.pickupLocation.name}`, 50, 385);
      }
      if (payment.reservation.dropoffLocation?.name) {
        doc.text(`Miesto odovzdania: ${payment.reservation.dropoffLocation.name}`, 50, 400);
      }
    }

    // Payment breakdown table
    const tableTop = 450;
    doc.fontSize(12).fillColor('#000000').text('Rozpis platby:', 50, tableTop);
    
    // Table headers
    doc.rect(50, tableTop + 20, 500, 25).fillAndStroke('#f3f4f6', '#e5e7eb');
    doc.fontSize(10).fillColor('#000000')
       .text('Popis', 60, tableTop + 30)
       .text('Suma', 450, tableTop + 30);

    let yPosition = tableTop + 50;

    // Subtotal
    doc.rect(50, yPosition, 500, 20).stroke('#e5e7eb');
    doc.text('Medzisucet', 60, yPosition + 5)
       .text(`${(payment.breakdown?.subtotal || payment.amount || 0).toFixed(2)} EUR`, 450, yPosition + 5);
    yPosition += 20;

    // Taxes
    if (payment.breakdown?.taxes && payment.breakdown.taxes.length > 0) {
      payment.breakdown.taxes.forEach((tax) => {
        doc.rect(50, yPosition, 500, 20).stroke('#e5e7eb');
        doc.text(`${tax.name || 'DPH'} (${((tax.rate || 0) * 100).toFixed(1)}%)`, 60, yPosition + 5)
           .text(`${(tax.amount || 0).toFixed(2)} EUR`, 450, yPosition + 5);
        yPosition += 20;
      });
    }

    // Fees
    if (payment.breakdown?.fees && payment.breakdown.fees.length > 0) {
      payment.breakdown.fees.forEach((fee) => {
        doc.rect(50, yPosition, 500, 20).stroke('#e5e7eb');
        doc.text(`${fee.name || 'Poplatok'}`, 60, yPosition + 5)
           .text(`${(fee.amount || 0).toFixed(2)} EUR`, 450, yPosition + 5);
        yPosition += 20;
      });
    }

    // Discounts
    if (payment.breakdown?.discounts && payment.breakdown.discounts.length > 0) {
      payment.breakdown.discounts.forEach((discount) => {
        doc.rect(50, yPosition, 500, 20).stroke('#e5e7eb');
        doc.fillColor('#dc2626').text(`${discount.name || 'Zlava'} (${discount.percentage ? discount.percentage + '%' : 'Fixna'})`, 60, yPosition + 5)
           .text(`-${(discount.amount || 0).toFixed(2)} EUR`, 450, yPosition + 5);
        yPosition += 20;
      });
    }

    // Total
    doc.rect(50, yPosition, 500, 25).fillAndStroke('#1f2937', '#374151');
    doc.fontSize(12).fillColor('#ffffff')
       .text('Celkova suma', 60, yPosition + 8)
       .text(`${(payment.amount || 0).toFixed(2)} EUR`, 450, yPosition + 8);

    // Payment method
    yPosition += 50;
    const paymentMethodType = payment.paymentMethod?.type || 'unknown';
    const paymentMethodSlovak = {
      'card': 'Platobna karta',
      'bank_transfer': 'Bankovy prevod', 
      'cash': 'Hotovost',
      'paypal': 'PayPal',
      'unknown': 'Neznamy'
    };
    
    doc.fontSize(10).fillColor('#666666')
       .text(`Sposob platby: ${paymentMethodSlovak[paymentMethodType] || paymentMethodSlovak['unknown']}`, 50, yPosition);

    if (payment.paymentMethod?.card) {
      const card = payment.paymentMethod.card;
      const cardBrand = (card.brand && typeof card.brand === 'string') ? card.brand.toUpperCase() : 'KARTA';
      const last4 = card.last4 || '****';
      doc.text(`Karta: **** **** **** ${last4} (${cardBrand})`, 50, yPosition + 15);
    }

    // Footer
    doc.fontSize(8).fillColor('#999999')
       .text('Dakujeme za vase podnikanie s nami!', 50, doc.page.height - 100)
       .text('Pre otazky ohladom tejto faktury nas kontaktujte na billing@carflow.sk', 50, doc.page.height - 85)
       .text('Toto je pocitacom vygenerovana faktura a nevyzaduje podpis.', 50, doc.page.height - 70);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return next(new AppError('Error generating PDF invoice', 500));
  }
});

// @desc    Get payment statistics (tenant-scoped)
// @route   GET /api/payments/stats
// @access  Private/Staff
const getPaymentStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const dateFilter = { tenantId: req.user.tenantId };
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const statusStats = await Payment.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  const methodStats = await Payment.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$paymentMethod.type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  // Calculate overall stats from aggregated data
  // Revenue includes:
  // - 'succeeded': Fully processed payments
  // - 'pending': Confirmed bookings waiting for payment (expected revenue)
  const totalRevenue = statusStats
    .filter(stat => ['succeeded', 'pending'].includes(stat._id))
    .reduce((sum, stat) => sum + stat.totalAmount, 0);
  const totalTransactions = statusStats.reduce((sum, stat) => sum + stat.count, 0);
  const averageAmount = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalAmount: totalRevenue,
        totalTransactions,
        averageAmount
      },
      byStatus: statusStats,
      byMethod: methodStats
    }
  });
});

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getPayments,
  getPayment,
  updatePaymentStatus,
  processRefund,
  generateInvoice,
  getPaymentStats
}; 