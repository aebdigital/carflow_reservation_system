# RIVAL Stripe Configuration Guide

Complete guide for setting up Stripe payments for the Rival tenant (`rival@test.sk`)

## Prerequisites

1. **Stripe Account**: Create a Stripe account at https://stripe.com
2. **Backend Access**: Access to the car rental system backend
3. **Database Access**: Ability to update Settings collection

## Step 1: Create Stripe Account

### 1.1 Sign Up for Stripe
1. Go to https://stripe.com
2. Click "Start now"
3. Create account with business email (preferably rival@test.sk or related)
4. Complete business verification process

### 1.2 Activate Account
1. Verify email address
2. Complete business information
3. Add bank account for payouts
4. Submit required documents for account activation

## Step 2: Get Stripe API Keys

### 2.1 Access API Keys
1. Log in to Stripe Dashboard
2. Go to **Developers** → **API keys**
3. You'll see two sets of keys:
   - **Test keys** (for development)
   - **Live keys** (for production)

### 2.2 Copy Required Keys
Copy the following keys (start with TEST keys):

```
Test Publishable Key: pk_test_...
Test Secret Key: sk_test_...
```

**Important**: Keep the Secret Key confidential!

## Step 3: Configure Webhooks

### 3.1 Create Webhook Endpoint
1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **"+ Add endpoint"**
3. Set endpoint URL: **Backend URL** (examples):
   - **Render**: `https://your-backend-app-name.onrender.com/api/payments/stripe-webhook`
   - **Custom domain**: `https://api.rivalcars.sk/api/payments/stripe-webhook`
   - **Local testing**: `https://your-ngrok-url.ngrok.io/api/payments/stripe-webhook`
4. Select events to send:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`

### 3.2 Get Webhook Secret
1. After creating the webhook, click on it
2. Go to **Signing secret** section
3. Click **"Reveal"** and copy the secret
4. It starts with `whsec_...`

## Step 4: Configure Backend Settings

### 4.1 Update Settings in Database

Connect to your MongoDB and update the Settings collection for Rival tenant:

```javascript
// Find Rival's user to get tenantId
db.users.findOne({email: "rival@test.sk"})

// Update or create settings for Rival tenant
db.settings.updateOne(
  { tenantId: "RIVAL_TENANT_ID" }, // Replace with actual tenantId
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
)
```

### 4.2 Alternative: Use Settings API (if available)
If you have a settings API endpoint, you can update via HTTP:

```bash
curl -X PUT https://your-domain.com/api/settings/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "stripeEnabled": true,
    "stripeSecretKey": "sk_test_YOUR_SECRET_KEY",
    "stripePublishableKey": "pk_test_YOUR_PUBLISHABLE_KEY",
    "stripeWebhookSecret": "whsec_YOUR_WEBHOOK_SECRET",
    "testMode": true
  }'
```

## Step 5: Test Configuration

### 5.1 Test Checkout Session Creation
```bash
curl -X POST https://your-domain.com/api/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rival@test.sk",
    "amount": 50.00,
    "currency": "EUR",
    "description": "Test car rental payment",
    "successUrl": "https://rivalcars.sk/payment/success",
    "cancelUrl": "https://rivalcars.sk/payment/cancel",
    "customerInfo": {
      "email": "customer@example.com"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "session_id": "cs_test_...",
    "payment_id": "...",
    "test_mode": true
  }
}
```

### 5.2 Test Payment Flow
1. Use the returned `checkout_url` in a browser
2. Use Stripe test card: `4242 4242 4242 4242`
3. Use any future expiry date and any CVC
4. Complete the payment
5. Verify webhook is received and payment status updates

## Step 6: Test Card Numbers

For testing, use these Stripe test cards:

| Card Number | Description |
|-------------|-------------|
| 4242424242424242 | Visa - Success |
| 4000000000000002 | Visa - Card declined |
| 4000000000009995 | Visa - Insufficient funds |
| 5555555555554444 | Mastercard - Success |

## Step 7: Frontend Integration

### 7.1 Public Reservation with Stripe
When creating a public reservation for Rival, include:

```javascript
{
  "tenantEmail": "rival@test.sk",
  "paymentType": "stripe",
  // ... other reservation data
}
```

This will:
- Set reservation status to `awaiting_payment`
- Require payment completion to confirm reservation

### 7.2 Create Payment Session
```javascript
const createStripeSession = async (reservationData) => {
  const response = await fetch('/api/payments/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rival@test.sk',
      amount: reservationData.totalAmount,
      currency: 'EUR',
      description: `Car rental: ${reservationData.carName}`,
      reservationId: reservationData.id,
      successUrl: 'https://rivalcars.sk/booking/success',
      cancelUrl: 'https://rivalcars.sk/booking/cancel',
      customerInfo: {
        email: reservationData.customerEmail
      }
    })
  });

  const result = await response.json();
  if (result.success) {
    // Redirect to Stripe checkout
    window.location.href = result.data.checkout_url;
  }
};
```

## Step 8: Production Setup

### 8.1 Switch to Live Mode
1. Complete Stripe account activation
2. Get live API keys from Stripe Dashboard
3. Update webhook endpoint to production URL
4. Update database settings with live keys:

```javascript
db.settings.updateOne(
  { tenantId: "RIVAL_TENANT_ID" },
  {
    $set: {
      "payment.stripeSecretKey": "sk_live_YOUR_LIVE_SECRET_KEY",
      "payment.stripePublishableKey": "pk_live_YOUR_LIVE_PUBLISHABLE_KEY",
      "payment.stripeWebhookSecret": "whsec_YOUR_LIVE_WEBHOOK_SECRET",
      "payment.testMode": false
    }
  }
)
```

### 8.2 Production Webhook
1. Create new webhook endpoint for production
2. Use production **backend** domain:
   - **Render**: `https://your-backend-app-name.onrender.com/api/payments/stripe-webhook`
   - **Custom API domain**: `https://api.rivalcars.sk/api/payments/stripe-webhook`
3. Same events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`

## Security Best Practices

### 1. Environment Variables
Store sensitive keys as environment variables:
```bash
# .env
RIVAL_STRIPE_SECRET_KEY=sk_live_...
RIVAL_STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Webhook Security
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement rate limiting

### 3. Key Management
- Never commit API keys to version control
- Rotate keys periodically
- Use different keys for test/production

## Troubleshooting

### Common Issues

1. **Webhook not received**
   - **Wrong URL**: Ensure webhook points to **backend**, not frontend
     - ✅ Correct: `https://your-backend-app.onrender.com/api/payments/stripe-webhook`
     - ❌ Wrong: `https://your-frontend-app.netlify.app/api/payments/stripe-webhook`
   - Check webhook URL is publicly accessible
   - Verify HTTPS is properly configured
   - Check Stripe webhook logs in dashboard

2. **Payment not confirming**
   - Verify webhook signature verification
   - Check database connection
   - Review server logs for errors
   - Ensure webhook endpoint returns 200 status

3. **Session creation fails**
   - Verify API keys are correct
   - Check tenant configuration in database
   - Ensure amount is valid (> 0)
   - Confirm Stripe is enabled for tenant

### Debug Logs
Monitor these log messages:
- `🔥 [STRIPE] Creating checkout session`
- `✅ [STRIPE] Got Stripe config`
- `🔍 [WEBHOOK DEBUG] Event type`
- `💳 [STRIPE] Setting status to awaiting_payment`

## Support

For additional help:
1. Check Stripe Dashboard logs
2. Review server application logs
3. Test with Stripe CLI for webhook testing
4. Contact Stripe support for payment-specific issues

## Conclusion

After completing this setup:
- Rival tenant can accept Stripe payments
- Reservations with `paymentType: "stripe"` will require payment
- Webhook will automatically confirm reservations upon payment
- Payment records will be created and tracked

The system now supports both LeRent and Rival tenants for Stripe payments with proper tenant isolation.