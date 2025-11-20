const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');
const Settings = require('../models/Settings');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper function to get tenant-specific Stripe instance
const getTenantStripe = async (tenantId) => {
  const stripeConfig = await Settings.getStripeConfig(tenantId);
  const stripe = require('stripe')(stripeConfig.secretKey);
  return { stripe, config: stripeConfig };
};

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

// @desc    Create Stripe checkout session
// @route   POST /api/payments/create-checkout-session
// @access  Public (based on email lookup)
const createCheckoutSession = asyncHandler(async (req, res, next) => {
  console.log('🔥 [STRIPE] Creating checkout session:', {
    email: req.body.email,
    amount: req.body.amount,
    hasSuccessUrl: !!req.body.successUrl,
    hasCancelUrl: !!req.body.cancelUrl
  });

  const { email, amount, currency, description, reservationId, successUrl, cancelUrl, customerInfo } = req.body;

  // Validate required fields
  if (!email || !amount || !successUrl || !cancelUrl) {
    console.error('❌ [STRIPE] Missing required fields:', { email: !!email, amount: !!amount, successUrl: !!successUrl, cancelUrl: !!cancelUrl });
    return next(new AppError('Email, amount, successUrl, and cancelUrl are required', 400));
  }

  // Find admin user by email to get tenant context
  const User = require('../models/User');
  const admin = await User.findOne({ email: email.toLowerCase(), role: 'admin' });

  if (!admin) {
    console.error('❌ [STRIPE] No admin found for email:', email);
    return next(new AppError('No admin found with this email', 404));
  }

  console.log('✅ [STRIPE] Found admin:', { adminId: admin._id, tenantId: admin.tenantId, email: admin.email });

  if (!admin.tenantId) {
    console.error('❌ [STRIPE] Admin has no tenantId:', {
      adminId: admin._id,
      email: admin.email,
      tenantId: admin.tenantId
    });
    return next(new AppError('Admin configuration error: missing tenantId', 500));
  }

  let payment = null; // Declare payment variable outside try block

  try {
    // Get tenant-specific Stripe configuration
    console.log('🔍 [STRIPE] Getting tenant Stripe config for:', admin.tenantId);
    const { stripe, config } = await getTenantStripe(admin.tenantId);
    console.log('✅ [STRIPE] Got Stripe config:', {
      hasSecretKey: !!config.secretKey,
      testMode: config.testMode,
      currency: config.currency
    });

    const paymentCurrency = currency || config.currency || 'EUR';

    let reservation = null;
    let customer = null;

    if (reservationId) {
      // Validate reservation exists for this tenant
      reservation = await Reservation.findOne({
        _id: reservationId,
        tenantId: admin.tenantId
      }).populate('customer').populate('car');

      if (!reservation) {
        return next(new AppError('Reservation not found', 404));
      }
      customer = reservation.customer;
    } else if (customerInfo && customerInfo.email) {
      // For frontend payments, try to find or create customer
      const User = require('../models/User');
      customer = await User.findOne({
        email: customerInfo.email.toLowerCase(),
        tenantId: admin.tenantId,
        role: 'customer'
      });

      // If customer doesn't exist and we have enough info, we could create one
      // For now, we'll just proceed without a customer record
      console.log('📋 [STRIPE] Customer lookup result:', customer ? 'Found existing' : 'Not found');
    }

    // Create payment record first
    payment = await Payment.create({
      reservation: reservationId || null,
      customer: customer?._id || null,
      amount: amount,
      currency: paymentCurrency.toUpperCase(),
      status: 'pending',
      paymentMethod: {
        type: 'card'
      },
      breakdown: {
        subtotal: amount, // Use full amount as subtotal for frontend payments
        taxes: [],
        fees: [],
        discounts: []
      },
      description: description || `Payment for ${admin.firstName || admin.email}'s car rental service`,
      tenantId: admin.tenantId,
      createdBy: admin._id
    });

    // Debug metadata before sending to Stripe
    const metadataToSend = {
      payment_id: payment._id.toString(),
      tenant_id: admin.tenantId.toString(), // Convert ObjectId to string
      reservation_id: reservationId || '',
    };
    console.log('🔍 [STRIPE] Metadata being sent to Stripe:', metadataToSend);

    // Create Stripe checkout session with tenant-specific Stripe instance
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: paymentCurrency.toLowerCase(),
            product_data: {
              name: description || 'Car Rental Service',
              description: reservation ? `Reservation #${reservation.reservationNumber}` : 'Car rental payment',
            },
            unit_amount: Math.round(amount * 100), // Stripe expects amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&payment_id=${payment._id}`,
      cancel_url: `${cancelUrl}?payment_id=${payment._id}`,
      customer_email: customerInfo?.email || customer?.email || null,
      metadata: metadataToSend,
    });

    // Update payment with Stripe session ID
    payment.stripeSessionId = session.id;
    await payment.save();

    res.status(200).json({
      success: true,
      data: {
        checkout_url: session.url,
        session_id: session.id,
        payment_id: payment._id,
        test_mode: config.testMode
      }
    });

  } catch (stripeError) {
    console.error('❌ [STRIPE] Error in createCheckoutSession:', {
      message: stripeError.message,
      stack: stripeError.stack,
      name: stripeError.name,
      code: stripeError.code
    });

    // If Stripe fails, clean up the payment record if it was created
    if (payment && payment._id) {
      try {
        await Payment.findByIdAndDelete(payment._id);
        console.log('🗑️ [STRIPE] Cleaned up payment record:', payment._id);
      } catch (cleanupError) {
        console.error('❌ [STRIPE] Failed to cleanup payment:', cleanupError.message);
      }
    }

    // Handle specific error types
    if (stripeError.message && stripeError.message.includes('Stripe not configured')) {
      return next(new AppError('Payment system not configured for this rental company. Please contact support.', 503));
    }

    if (stripeError.message && stripeError.message.includes('No API key provided')) {
      return next(new AppError('Stripe configuration error: Missing API key. Please contact support.', 503));
    }

    // Return more detailed error message
    const errorMessage = stripeError.message || 'Unknown Stripe error occurred';
    return next(new AppError(`Payment system error: ${errorMessage}`, 400));
  }
});

// @desc    Handle Stripe webhook
// @route   POST /api/payments/stripe-webhook
// @access  Public (Stripe webhook)
const handleStripeWebhook = asyncHandler(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  // First, we need to determine which tenant this webhook belongs to
  // We'll try to parse the event without verification first to get metadata
  let rawEvent;
  try {
    rawEvent = JSON.parse(req.body.toString());
  } catch (parseError) {
    console.error('Failed to parse webhook body:', parseError.message);
    return res.status(400).send('Invalid JSON');
  }

  const paymentId = rawEvent.data?.object?.metadata?.payment_id;
  const tenantId = rawEvent.data?.object?.metadata?.tenant_id;

  console.log('🔍 [WEBHOOK DEBUG] Event type:', rawEvent.type);
  console.log('🔍 [WEBHOOK DEBUG] Metadata received:', rawEvent.data?.object?.metadata);
  console.log('🔍 [WEBHOOK DEBUG] Payment ID:', paymentId);
  console.log('🔍 [WEBHOOK DEBUG] Tenant ID:', tenantId);

  if (!paymentId || !tenantId) {
    console.error('❌ [WEBHOOK] Missing payment_id or tenant_id in webhook metadata');
    console.error('❌ [WEBHOOK] Full event object:', JSON.stringify(rawEvent, null, 2));
    return res.status(400).send('Missing required metadata');
  }

  try {
    // Get tenant-specific Stripe configuration
    const { config } = await getTenantStripe(tenantId);
    const stripe = require('stripe')(config.secretKey);

    // Now verify the webhook with the correct secret
    event = stripe.webhooks.constructEvent(req.body, sig, config.webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const sessionPaymentId = session.metadata.payment_id;

      if (sessionPaymentId) {
        const payment = await Payment.findById(sessionPaymentId);
        if (payment) {
          payment.status = 'succeeded';
          payment.processedAt = new Date();
          payment.stripePaymentIntentId = session.payment_intent;
          payment.invoice.issuedAt = new Date();
          payment.invoice.paidAt = new Date();
          await payment.save();

          // Update reservation status if exists
          if (payment.reservation) {
            const reservation = await Reservation.findById(payment.reservation)
              .populate('customer')
              .populate('car');
            if (reservation && (reservation.status === 'pending' || reservation.status === 'awaiting_payment')) {
              reservation.status = 'confirmed';
              await reservation.save();

              // Send confirmation emails after successful payment
              console.log('📧 [WEBHOOK] Sending confirmation emails for paid reservation:', reservation.reservationNumber);
              try {
                const { sendReservationEmails } = require('../services/emailService');
                await sendReservationEmails(reservation, reservation.customer, 'webhook_confirmation');
                console.log('✅ [WEBHOOK] Confirmation emails sent successfully');
              } catch (emailError) {
                console.error('❌ [WEBHOOK] Failed to send confirmation emails:', emailError.message);
              }
            }
          }
        }
      }
      break;

    case 'checkout.session.expired':
    case 'payment_intent.payment_failed':
      const failedSession = event.data.object;
      const failedPaymentId = failedSession.metadata?.payment_id;

      if (failedPaymentId) {
        const payment = await Payment.findById(failedPaymentId);
        if (payment) {
          payment.status = 'failed';
          payment.failureReason = 'Payment failed or session expired';
          await payment.save();
        }
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type} for tenant ${tenantId}`);
  }

  res.json({ received: true });
});

// @desc    Verify payment status
// @route   GET /api/payments/verify/:paymentId
// @access  Public
const verifyPayment = asyncHandler(async (req, res, next) => {
  const { paymentId } = req.params;
  const { session_id } = req.query;

  const payment = await Payment.findById(paymentId)
    .populate('reservation')
    .populate('customer', 'firstName lastName email');

  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  // If session_id is provided, verify with Stripe
  if (session_id && payment.stripeSessionId === session_id) {
    try {
      // Get tenant-specific Stripe configuration
      const { stripe } = await getTenantStripe(payment.tenantId);
      const session = await stripe.checkout.sessions.retrieve(session_id);

      // Update payment status based on Stripe session
      if (session.payment_status === 'paid' && payment.status !== 'succeeded') {
        payment.status = 'succeeded';
        payment.processedAt = new Date();
        payment.stripePaymentIntentId = session.payment_intent;
        payment.invoice.issuedAt = new Date();
        payment.invoice.paidAt = new Date();
        await payment.save();

        // Update reservation status
        if (payment.reservation) {
          const reservation = await Reservation.findById(payment.reservation);
          if (reservation && (reservation.status === 'pending' || reservation.status === 'awaiting_payment')) {
            reservation.status = 'confirmed';
            await reservation.save();
          }
        }
      }
    } catch (stripeError) {
      console.error('Error verifying Stripe session:', stripeError);
      // Don't fail the request if Stripe verification fails, just log it
    }
  }

  res.status(200).json({
    success: true,
    data: {
      payment,
      status: payment.status,
      is_paid: payment.status === 'succeeded'
    }
  });
});

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
       .text(`Datum vystavenia: ${payment.invoice.issuedAt?.toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) || new Date().toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' })}`, 410, 95)
       .text(`Datum splatnosti: ${payment.invoice.dueAt?.toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) || 'Pri obdrzani'}`, 410, 110)
       .text(`Datum platby: ${payment.invoice.paidAt?.toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' }) || 'Caka sa'}`, 410, 125)
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
        doc.text(`Obdobie prenajmu: ${new Date(payment.reservation.startDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' })} - ${new Date(payment.reservation.endDate).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' })}`, 50, 325);
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
  createCheckoutSession,
  handleStripeWebhook,
  verifyPayment,
  createPaymentIntent,
  confirmPayment,
  getPayments,
  getPayment,
  updatePaymentStatus,
  processRefund,
  generateInvoice,
  getPaymentStats
}; 