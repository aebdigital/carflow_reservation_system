# Stripe Webhook Setup Guide

## Overview

This guide explains how to set up Stripe webhooks for any tenant (Nitra-Car, LeRent, Rival, etc.) in the multi-tenant car rental system.

---

## Prerequisites

1. **Stripe Account**: Each tenant needs their own Stripe account at https://stripe.com
2. **Admin Access**: Access to the admin panel at https://admindemo.carflow.sk
3. **Backend URL**: The webhook endpoint is `https://carflow-reservation-system.onrender.com/api/payments/stripe-webhook`

---

## Part 1: Setting Up Stripe Account

### Step 1: Create or Login to Stripe Account

1. Go to https://stripe.com
2. Create a new account or log into your existing account
3. Complete the account verification process

### Step 2: Get Your API Keys

#### For Testing (Recommended First):

1. In Stripe Dashboard, click on **"Developers"** in the left sidebar
2. Click on **"API keys"**
3. You'll see two keys in the **"Standard keys"** section:
   - **Publishable key**: `pk_test_51...` (safe to use in frontend)
   - **Secret key**: `sk_test_51...` (KEEP THIS SECRET!)
4. Click **"Reveal test key"** to see the secret key
5. **Copy both keys** - you'll need them in Step 4

#### For Production (After Testing):

1. Toggle the switch from **"Test mode"** to **"Live mode"** (top right)
2. Copy the live keys:
   - **Publishable key**: `pk_live_51...`
   - **Secret key**: `sk_live_51...`

---

## Part 2: Creating the Webhook

### Step 3: Create Webhook Endpoint

1. In Stripe Dashboard, go to **"Developers"** → **"Webhooks"**
2. Click **"Add endpoint"** button
3. Fill in the webhook details:

**Endpoint URL:**
```
https://carflow-reservation-system.onrender.com/api/payments/stripe-webhook
```

**Description:** (optional)
```
CarFlow Reservation System - Payment notifications
```

**Events to send:**
Select these specific events:
- ✅ `checkout.session.completed` - When payment succeeds
- ✅ `checkout.session.expired` - When checkout session expires
- ✅ `payment_intent.payment_failed` - When payment fails

**Version:** Latest API version (default)

4. Click **"Add endpoint"**

### Step 4: Get Webhook Secret

After creating the webhook, you'll see:
- Endpoint URL
- Status (should be "Active")
- **Signing secret**: `whsec_...`

**IMPORTANT:** Click **"Reveal"** to see the webhook signing secret and **copy it**. You'll need this in the next step.

---

## Part 3: Configure Admin Panel

### Step 5: Enter Stripe Configuration in Admin Panel

1. **Login to Admin Panel:**
   - URL: https://admindemo.carflow.sk
   - Use your admin credentials (e.g., `lerent@lerent.sk` or `nitra-car@nitra-car.sk`)

2. **Navigate to Settings:**
   - Click on **"Settings"** in the left sidebar
   - Scroll down to **"Payment Configuration"** section

3. **Enable Stripe:**
   - Toggle **"Enable Stripe Payments"** to ON

4. **Enter Your Keys:**
   - **Stripe Secret Key**: Paste `sk_test_...` (from Step 2)
   - **Stripe Publishable Key**: Paste `pk_test_...` (from Step 2)
   - **Webhook Signing Secret**: Paste `whsec_...` (from Step 4)
   - **Test Mode**: Toggle ON (for testing) or OFF (for production)

5. **Save Configuration:**
   - Click **"Save Payment Settings"** button
   - You should see a success message

---

## Part 4: Testing the Webhook

### Step 6: Test the Integration

#### Method 1: Using Stripe Test Cards

1. Create a test reservation on your frontend
2. Use Stripe test card:
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVC**: Any 3 digits (e.g., `123`)
   - **ZIP**: Any 5 digits (e.g., `12345`)

3. Complete the payment
4. Check if:
   - ✅ Payment status changes to "succeeded" in admin panel
   - ✅ Reservation status changes to "confirmed"
   - ✅ Customer receives confirmation email

#### Method 2: Using Stripe Dashboard Test

1. In Stripe Dashboard, go to **"Developers"** → **"Webhooks"**
2. Click on your webhook endpoint
3. Click **"Send test webhook"** button
4. Select event: `checkout.session.completed`
5. Click **"Send test webhook"**
6. Check the **"Response"** tab - should show `200 OK`

---

## Part 5: Webhook Event Details

### What Happens When Customer Pays?

```
Customer Completes Payment
         ↓
Stripe sends webhook to:
https://carflow-reservation-system.onrender.com/api/payments/stripe-webhook
         ↓
Backend receives event: checkout.session.completed
         ↓
Backend verifies signature using your webhook secret
         ↓
Backend updates:
  - Payment status: "pending" → "succeeded"
  - Reservation status: "pending" → "confirmed"
         ↓
Backend sends confirmation email to customer
         ↓
Done! ✅
```

### Events Handled:

| Event | Description | Action |
|-------|-------------|--------|
| `checkout.session.completed` | Payment succeeded | Update payment/reservation to "confirmed", send email |
| `checkout.session.expired` | Session expired without payment | Update payment status to "expired" |
| `payment_intent.payment_failed` | Payment failed | Update payment status to "failed", log error |

---

## Troubleshooting

### Issue 1: Webhook Returns 400 Error

**Cause:** Incorrect webhook secret in admin panel

**Solution:**
1. Go back to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Reveal and copy the signing secret again
4. Update it in admin panel Settings
5. Save and test again

### Issue 2: Webhook Not Receiving Events

**Cause:** Webhook URL is incorrect or endpoint is down

**Solution:**
1. Verify webhook URL is exactly: `https://carflow-reservation-system.onrender.com/api/payments/stripe-webhook`
2. Check if backend server is running
3. Test webhook using "Send test webhook" in Stripe Dashboard

### Issue 3: Payment Succeeds But Reservation Not Confirmed

**Cause:** Webhook event not properly processed

**Solution:**
1. Check Stripe Dashboard → Developers → Webhooks → Event logs
2. Look for error messages
3. Check Render logs for backend errors
4. Verify metadata in checkout session includes `payment_id` and `tenant_id`

### Issue 4: "Stripe not configured for this tenant"

**Cause:** Stripe keys not saved in admin panel

**Solution:**
1. Login to admin panel
2. Go to Settings → Payment Configuration
3. Ensure all fields are filled:
   - Secret Key
   - Publishable Key
   - Webhook Secret
4. Toggle "Enable Stripe Payments" to ON
5. Click "Save Payment Settings"

---

## Security Best Practices

### ✅ DO:
- Keep your Stripe Secret Key private (never commit to Git)
- Use Test Mode for development
- Verify webhook signatures (handled automatically)
- Use HTTPS only
- Monitor webhook events in Stripe Dashboard

### ❌ DON'T:
- Share your secret keys publicly
- Use production keys for testing
- Disable webhook signature verification
- Hardcode keys in frontend code
- Skip testing before going live

---

## Going Live (Production)

When ready to accept real payments:

1. **Switch to Live Mode in Stripe:**
   - Get live API keys (`pk_live_...` and `sk_live_...`)
   - Create new webhook endpoint in Live mode (same URL)
   - Get live webhook secret

2. **Update Admin Panel:**
   - Enter live keys
   - Enter live webhook secret
   - Toggle "Test Mode" to OFF
   - Save settings

3. **Verify Stripe Account:**
   - Complete business verification in Stripe
   - Add bank account for payouts
   - Enable payment methods (cards, etc.)

4. **Test with Real Card:**
   - Use a real card with small amount
   - Verify full flow works
   - Check if payout appears in Stripe

---

## Multiple Tenants (Important!)

Each car rental company (tenant) needs:
- ✅ Their own Stripe account
- ✅ Their own webhook endpoint (same URL, different secrets)
- ✅ Their own configuration in admin panel

**Example:**
- **Nitra-Car** (`nitra-car@nitra-car.sk`):
  - Stripe Account A
  - Keys: `sk_test_ABC...`, `pk_test_ABC...`
  - Webhook Secret: `whsec_ABC...`

- **LeRent** (`lerent@lerent.sk`):
  - Stripe Account B
  - Keys: `sk_test_XYZ...`, `pk_test_XYZ...`
  - Webhook Secret: `whsec_XYZ...`

Both use the same webhook URL, but backend routes to correct account based on `tenant_id` in metadata.

---

## Support

If you encounter issues:
1. Check Stripe Dashboard → Developers → Webhooks → Event logs
2. Check Render backend logs
3. Verify all keys are correctly entered in admin panel
4. Test with Stripe test cards first

---

## Quick Reference

**Backend Webhook URL:**
```
https://carflow-reservation-system.onrender.com/api/payments/stripe-webhook
```

**Admin Panel URL:**
```
https://admindemo.carflow.sk/settings
```

**Test Card:**
```
Card: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
ZIP: 12345
```

**Required Stripe Events:**
- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`
