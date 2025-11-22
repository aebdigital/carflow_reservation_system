// Debug script for Stripe integration with Rival tenant
const mongoose = require('mongoose');
const Settings = require('./models/Settings');
const Payment = require('./models/Payment');
const Reservation = require('./models/Reservation');
const User = require('./models/User');

async function debugStripeRival() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/car-rental-admin');
    console.log('✅ Connected to MongoDB');

    // 1. Check if Rival user exists and get tenantId
    const rivalUser = await User.findOne({ email: 'rival@test.sk' });
    if (!rivalUser) {
      console.error('❌ Rival user not found with email: rival@test.sk');
      return;
    }
    console.log('✅ Found Rival user:', {
      id: rivalUser._id,
      email: rivalUser.email,
      tenantId: rivalUser.tenantId,
      role: rivalUser.role
    });

    // 2. Check Stripe configuration for Rival tenant
    console.log('\n🔍 Checking Stripe configuration...');
    const settings = await Settings.findOne({ tenantId: rivalUser.tenantId })
      .select('+payment.stripeSecretKey +payment.stripeWebhookSecret');

    if (!settings) {
      console.error('❌ No settings found for Rival tenant');
      return;
    }

    console.log('📋 Settings found:', {
      stripeEnabled: settings.payment?.stripeEnabled,
      hasSecretKey: !!settings.payment?.stripeSecretKey,
      hasWebhookSecret: !!settings.payment?.stripeWebhookSecret,
      hasPublishableKey: !!settings.payment?.stripePublishableKey,
      testMode: settings.payment?.testMode,
      currency: settings.system?.currency
    });

    if (!settings.payment?.stripeEnabled) {
      console.error('❌ Stripe is not enabled for Rival tenant');
      console.log('💡 To enable: Update settings.payment.stripeEnabled = true');
      return;
    }

    if (!settings.payment?.stripeSecretKey) {
      console.error('❌ Stripe secret key missing for Rival tenant');
      return;
    }

    // 3. Test Stripe configuration
    console.log('\n🔍 Testing Stripe connection...');
    try {
      const stripe = require('stripe')(settings.payment.stripeSecretKey);
      const account = await stripe.accounts.retrieve();
      console.log('✅ Stripe connection successful:', {
        id: account.id,
        country: account.country,
        defaultCurrency: account.default_currency,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled
      });
    } catch (stripeError) {
      console.error('❌ Stripe connection failed:', stripeError.message);
      return;
    }

    // 4. Check recent payments for Rival
    console.log('\n🔍 Checking recent payments for Rival tenant...');
    const recentPayments = await Payment.find({ tenantId: rivalUser.tenantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('reservation', 'reservationNumber status')
      .populate('customer', 'firstName lastName email');

    console.log(`📊 Found ${recentPayments.length} recent payments:`);
    recentPayments.forEach((payment, index) => {
      console.log(`  ${index + 1}. Payment ID: ${payment._id}`);
      console.log(`     Status: ${payment.status}`);
      console.log(`     Amount: €${payment.amount}`);
      console.log(`     Created: ${payment.createdAt}`);
      console.log(`     Stripe Session ID: ${payment.stripeSessionId || 'N/A'}`);
      console.log(`     Reservation: ${payment.reservation?.reservationNumber || 'N/A'} (${payment.reservation?.status || 'N/A'})`);
      console.log('');
    });

    // 5. Check awaiting_payment reservations
    console.log('\n🔍 Checking reservations awaiting payment...');
    const awaitingPayment = await Reservation.find({
      tenantId: rivalUser.tenantId,
      status: 'awaiting_payment'
    }).populate('car', 'brand model').sort({ createdAt: -1 }).limit(3);

    console.log(`🕐 Found ${awaitingPayment.length} reservations awaiting payment:`);
    awaitingPayment.forEach((reservation, index) => {
      console.log(`  ${index + 1}. Reservation: ${reservation.reservationNumber}`);
      console.log(`     Status: ${reservation.status}`);
      console.log(`     Car: ${reservation.car?.brand} ${reservation.car?.model}`);
      console.log(`     Created: ${reservation.createdAt}`);
      console.log(`     Payment: ${reservation.payment || 'N/A'}`);
      console.log('');
    });

    // 6. Check webhook configuration hints
    console.log('\n🔧 Webhook Configuration Check:');
    console.log('📝 Your webhook endpoint should be:');
    console.log('   https://your-backend-app.onrender.com/api/payments/stripe-webhook');
    console.log('📝 Required events:');
    console.log('   - checkout.session.completed');
    console.log('   - checkout.session.expired');
    console.log('   - payment_intent.payment_failed');

    if (settings.payment?.stripeWebhookSecret) {
      console.log('✅ Webhook secret is configured');
    } else {
      console.log('❌ Webhook secret missing - this will cause signature verification to fail');
    }

    console.log('\n✅ Debug completed successfully');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run debug if called directly
if (require.main === module) {
  debugStripeRival();
}

module.exports = debugStripeRival;