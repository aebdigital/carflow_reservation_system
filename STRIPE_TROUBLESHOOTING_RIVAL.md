# Stripe Troubleshooting Guide for Rival Tenant

## Issue: "Chyba pri overení - Chýbajúce informácie o platbe"

This error occurs when the frontend success page cannot verify the payment status. Here's how to debug and fix it.

## Step 1: Check Stripe Configuration

Run the debug script to verify Stripe setup:

```bash
cd server
node debug-stripe-rival.js
```

This will check:
- Rival user and tenant ID
- Stripe configuration in database
- Recent payments and reservations
- Connection to Stripe API

## Step 2: Verify Webhook Configuration

### Check Your Webhook Endpoint
1. Go to Stripe Dashboard → Developers → Webhooks
2. Verify endpoint URL is: `https://your-backend-app.onrender.com/api/payments/stripe-webhook`
3. Check that these events are selected:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`

### Test Webhook Delivery
1. In Stripe Dashboard, go to your webhook
2. Look for recent events in the "Events" tab
3. Check if events show "Success" or errors

## Step 3: Check Success URL Parameters

When Stripe redirects to your success page, the URL should look like:
```
https://rivalcars.sk/booking/success?session_id=cs_test_...&payment_id=64a7b8c9d0e1f2a3b4c5d6e7
```

The frontend should then call:
```
GET /api/payments/verify/64a7b8c9d0e1f2a3b4c5d6e7?session_id=cs_test_...
```

## Step 4: Database Configuration Fix

If Stripe isn't configured, update your database:

```javascript
// Connect to MongoDB and run this:
const rivalUser = await db.users.findOne({email: "rival@test.sk"});
const rivalTenantId = rivalUser.tenantId;

// Update or create Stripe settings
db.settings.updateOne(
  { tenantId: rivalTenantId },
  {
    $set: {
      "payment.stripeEnabled": true,
      "payment.stripeSecretKey": "sk_test_YOUR_SECRET_KEY",
      "payment.stripePublishableKey": "pk_test_YOUR_PUBLISHABLE_KEY",
      "payment.stripeWebhookSecret": "whsec_YOUR_WEBHOOK_SECRET",
      "payment.testMode": true,
      "system.currency": "EUR"
    }
  },
  { upsert: true }
);
```

## Step 5: Frontend Success Page Implementation

Create or update your success page to handle payment verification:

```javascript
// Example success page implementation
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState('loading');
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const paymentId = searchParams.get('payment_id');

    const verifyPayment = async () => {
      try {
        console.log('🔍 Verifying payment:', { sessionId, paymentId });

        if (!sessionId || !paymentId) {
          throw new Error('Chýbajúce informácie o platbe');
        }

        const response = await fetch(`/api/payments/verify/${paymentId}?session_id=${sessionId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Chyba pri overení platby');
        }

        if (result.success && result.data.is_paid) {
          setPaymentData(result.data);
          setVerificationStatus('success');
        } else {
          throw new Error('Platba nebola úspešná');
        }

      } catch (err) {
        console.error('❌ Payment verification failed:', err);
        setError(err.message);
        setVerificationStatus('error');
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (verificationStatus === 'loading') {
    return <div>Overujem platbu...</div>;
  }

  if (verificationStatus === 'error') {
    return (
      <div>
        <h2>Chyba pri overení</h2>
        <p>{error}</p>
        <button onClick={() => window.location.href = '/'}>
          Späť na domovskú stránku
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Platba úspešná!</h2>
      <p>Vaša rezervácia bola potvrdená.</p>
      {paymentData?.payment?.reservation && (
        <p>Číslo rezervácie: {paymentData.payment.reservation.reservationNumber}</p>
      )}
    </div>
  );
};

export default PaymentSuccess;
```

## Step 6: Debug Webhook Issues

### Add Webhook Logging
Add this logging to your webhook handler:

```javascript
// In paymentController.js - handleStripeWebhook function
console.log('🔥 [WEBHOOK] Received webhook:', {
  eventType: rawEvent.type,
  paymentId: rawEvent.data?.object?.metadata?.payment_id,
  tenantId: rawEvent.data?.object?.metadata?.tenant_id,
  sessionId: rawEvent.data?.object?.id
});
```

### Check Server Logs
Monitor your Render backend logs for:
- `🔥 [WEBHOOK] Received webhook`
- `✅ [WEBHOOK] Confirmation emails sent successfully`
- Any error messages

## Step 7: Test the Full Flow

### 1. Create Test Payment Session
```bash
curl -X POST https://your-backend-app.onrender.com/api/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rival@test.sk",
    "amount": 50.00,
    "currency": "EUR",
    "description": "Test payment",
    "successUrl": "https://rivalcars.sk/payment/success",
    "cancelUrl": "https://rivalcars.sk/payment/cancel"
  }'
```

### 2. Complete Test Payment
- Use test card: `4242 4242 4242 4242`
- Any future expiry date and CVC
- Complete the payment

### 3. Verify Results
Check that:
- Payment status updates to `succeeded`
- Reservation status updates to `confirmed`
- You receive confirmation emails

## Step 8: Common Issues & Solutions

### Issue: "Stripe not configured for this tenant"
**Solution**: Run the database configuration in Step 4

### Issue: "Webhook signature verification failed"
**Solution**:
- Check webhook secret in Stripe dashboard
- Update `stripeWebhookSecret` in database
- Ensure webhook endpoint URL is correct

### Issue: "Missing required metadata"
**Solution**: The payment session wasn't created properly. Check that:
- `email: "rival@test.sk"` is used in session creation
- Payment record is created before session

### Issue: Payment succeeds but reservation not confirmed
**Solution**:
- Check webhook is receiving events
- Verify webhook handler is updating reservation status
- Check server logs for errors

## Support Commands

### Check Payment Status
```javascript
// In MongoDB
db.payments.find({}).sort({createdAt: -1}).limit(5);
```

### Check Reservation Status
```javascript
// In MongoDB
db.reservations.find({status: "awaiting_payment"}).sort({createdAt: -1});
```

### Update Payment Status Manually (if needed)
```javascript
// In MongoDB - find payment ID from above
const paymentId = "YOUR_PAYMENT_ID";
const payment = await db.payments.findById(paymentId);
payment.status = "succeeded";
payment.processedAt = new Date();
await payment.save();

// Update related reservation
const reservation = await db.reservations.findById(payment.reservation);
reservation.status = "confirmed";
await reservation.save();
```

Following these steps should resolve the payment verification issue and ensure successful payment processing for Rival tenant.