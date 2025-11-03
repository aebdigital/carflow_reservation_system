# Tenant-Specific Configuration Guide

## Overview

This system supports multi-tenant configuration where each car rental company has their own isolated email and SMS settings. This ensures that notifications are sent from the correct sender address for each tenant.

---

## Environment Variables Configuration

### Rival Tenant (`rival@test.sk`)

**Email Configuration:**
```env
EMAIL_FROM="RIVAL Autopožičovňa <noreply@rivalcars.sk>"
SMTP2GO_API_KEY=api-your-rival-smtp2go-key
```

**SMS Configuration (BulkGate):**
```env
BULKGATE_APP_ID=your-rival-bulkgate-app-id
BULKGATE_APP_TOKEN=your-rival-bulkgate-token
```

**Features:**
- ✅ Sends emails from `noreply@rivalcars.sk`
- ✅ Sends SMS confirmations via BulkGate
- ✅ Uses Rival branding in emails
- ✅ Admin notifications go to `rivalautopozicovna@gmail.com`

---

### LeRent Tenant (`lerent@lerent.sk`)

**Email Configuration:**
```env
LERENT_EMAIL_FROM="LeRent <noreply@lerent.sk>"
LERENT_SMTP2GO_API_KEY=api-your-lerent-smtp2go-key
```

**Note:** Both `LERENT_EMAIL_FROM` and `LERENT_SMTP2GO_API_KEY` should be set on Render for the LeRent tenant.

**SMS Configuration:**
```
NONE - SMS disabled for LeRent
```

**Features:**
- ✅ Sends emails from `noreply@lerent.sk`
- ✅ Uses LeRent's own SMTP2GO API key (`LERENT_SMTP2GO_API_KEY`)
- ❌ NO SMS confirmations (BulkGate only for Rival)
- ✅ Uses LeRent branding in emails
- ✅ Admin notifications go to `peter@aebdig.com` (default)

---

### Nitra-Car Tenant (`nitra-car@nitra-car.sk`)

**Email Configuration:**
```env
NITRACAR_EMAIL_FROM="Nitra-Car <noreply@nitracar.sk>"
NITRACAR_SMTP2GO_API_KEY=api-your-nitracar-smtp2go-key
```

**SMS Configuration:**
```
NONE - SMS disabled for Nitra-Car
```

**Features:**
- ✅ Sends emails from `noreply@nitracar.sk`
- ❌ NO SMS confirmations (BulkGate only for Rival)
- ✅ Uses Nitra-Car branding in emails
- ✅ Admin notifications go to `peter@aebdig.com` (default)

---

## Complete Environment Variable Reference

### Required for All Tenants

```env
# MongoDB Database
MONGODB_URI=mongodb+srv://...

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Main SMTP2GO (used by default tenants)
SMTP2GO_API_KEY=api-your-main-smtp2go-key
```

### Rival-Specific (rival@test.sk)

```env
# Email
EMAIL_FROM="RIVAL Autopožičovňa <noreply@rivalcars.sk>"

# SMS (ONLY for Rival)
BULKGATE_APP_ID=your-rival-bulkgate-app-id
BULKGATE_APP_TOKEN=your-rival-bulkgate-token
```

### LeRent-Specific (lerent@lerent.sk)

```env
# Email (REQUIRED)
LERENT_EMAIL_FROM="LeRent <noreply@lerent.sk>"
LERENT_SMTP2GO_API_KEY=api-your-lerent-smtp2go-key
```

**Important:** Both variables should be set on Render for LeRent emails to work properly.

### Nitra-Car-Specific (nitra-car@nitra-car.sk)

```env
# Email
NITRACAR_EMAIL_FROM="Nitra-Car <noreply@nitracar.sk>"

# Optional: Separate SMTP2GO account
NITRACAR_SMTP2GO_API_KEY=api-your-nitracar-smtp2go-key
```

---

## How It Works

### Email Routing Logic

```javascript
// When sending an email, the system checks user email:

if (user.email === 'nitra-car@nitra-car.sk') {
  // Use NITRACAR_EMAIL_FROM
  from = process.env.NITRACAR_EMAIL_FROM || 'noreply@nitracar.sk'
  apiKey = process.env.NITRACAR_SMTP2GO_API_KEY || default
}
else if (user.email === 'lerent@lerent.sk') {
  // Use LERENT_EMAIL_FROM
  from = process.env.LERENT_EMAIL_FROM || 'noreply@lerent.sk'
  apiKey = process.env.LERENT_SMTP2GO_API_KEY || default
}
else if (user.email === 'rival@test.sk') {
  // Use EMAIL_FROM
  from = process.env.EMAIL_FROM || 'noreply@rivalcars.sk'
  apiKey = process.env.SMTP2GO_API_KEY
}
else {
  // Default for other tenants
  from = process.env.EMAIL_FROM || 'noreply@carflow.sk'
}
```

### SMS Routing Logic

```javascript
// SMS is ONLY sent for Rival tenant

if (user.email === 'rival@test.sk' && customer.phone) {
  // Send SMS via BulkGate
  await bulkGateService.sendReservationConfirmation(phone, data)
}
else {
  // Skip SMS for all other tenants
  console.log('SMS only enabled for Rival tenant')
}
```

### Admin Email Routing Logic

```javascript
// Admin notifications route to different emails per tenant

if (user.email === 'rival@test.sk') {
  adminEmail = 'rivalautopozicovna@gmail.com'
}
else {
  adminEmail = 'peter@aebdig.com'  // Default
}
```

---

## Example: New Reservation Flow

### Scenario: Customer books car with LeRent

```
1. Customer fills booking form on lerent.carflow.sk
         ↓
2. POST /api/public/users/lerent@lerent.sk/reservations
         ↓
3. Backend creates reservation (status: pending)
         ↓
4. Backend determines user is lerent@lerent.sk
         ↓
5. Email sent to customer:
   FROM: "LeRent <noreply@lerent.sk>"
   TO: customer@email.com
   ✅ Uses LERENT_EMAIL_FROM
         ↓
6. Email sent to admin:
   FROM: "LeRent <noreply@lerent.sk>"
   TO: peter@aebdig.com
   ✅ Uses default admin email
         ↓
7. SMS: SKIPPED (not rival@test.sk)
   ❌ No SMS sent
         ↓
8. Done!
```

### Scenario: Customer books car with Rival

```
1. Customer fills booking form on rival.carflow.sk
         ↓
2. POST /api/public/users/rival@test.sk/reservations
         ↓
3. Backend creates reservation (status: pending)
         ↓
4. Backend determines user is rival@test.sk
         ↓
5. Email sent to customer:
   FROM: "RIVAL Autopožičovňa <noreply@rivalcars.sk>"
   TO: customer@email.com
   ✅ Uses EMAIL_FROM
         ↓
6. Email sent to admin:
   FROM: "RIVAL Autopožičovňa <noreply@rivalcars.sk>"
   TO: rivalautopozicovna@gmail.com
   ✅ Uses Rival admin email
         ↓
7. SMS sent to customer:
   TO: +421900123456
   ✅ Uses BulkGate
         ↓
8. Done!
```

---

## Adding a New Tenant

To add a new tenant with custom email configuration:

### Step 1: Add Environment Variables

```env
# Example: Adding "newcompany@example.com"
NEWCOMPANY_EMAIL_FROM="New Company <noreply@newcompany.com>"
NEWCOMPANY_SMTP2GO_API_KEY=api-your-newcompany-smtp2go-key  # Optional
```

### Step 2: Update smtp2goService.js

Add tenant check in `getTenantEmailConfig()`:

```javascript
// New Company tenant
if (userEmail === 'newcompany@example.com') {
  console.log('🔧 [EMAIL] Using NEWCOMPANY email configuration');
  return {
    apiKey: process.env.NEWCOMPANY_SMTP2GO_API_KEY || this.apiKey,
    emailFrom: process.env.NEWCOMPANY_EMAIL_FROM || 'noreply@newcompany.com'
  };
}
```

### Step 3: (Optional) Add Custom Admin Email

Update `emailHelpers.js` in `getAdminEmailForTenant()`:

```javascript
if (userEmail === 'newcompany@example.com') {
  return 'admin@newcompany.com';
}
```

### Step 4: Deploy

Push to Render and add environment variables in Render dashboard.

---

## Troubleshooting

### Issue: Emails sent from wrong address

**Check:**
1. Environment variables are set in Render
2. Variable names match exactly (case-sensitive)
3. User email in database matches tenant check (e.g., `lerent@lerent.sk`)

**Debug:**
Check Render logs for:
```
🔍 [EMAIL DEBUG] getTenantEmailConfig called for user: lerent@lerent.sk
🔧 [EMAIL] Using LERENT email configuration
```

### Issue: SMS sent to LeRent customers

**This should NOT happen!** SMS is hardcoded to only send for `rival@test.sk`.

**Check:**
Look for this log:
```
📱 [SMS] Skipping SMS - not rival@test.sk tenant
```

### Issue: Admin notifications going to wrong email

**Check:**
1. `emailHelpers.js` - `getAdminEmailForTenant()` function
2. Verify tenant email matches exactly

**Debug:**
Check logs for:
```
📧 [EMAIL] Admin email for tenant: rivalautopozicovna@gmail.com (User: rival@test.sk)
```

---

## Current Production Setup (Render)

### Environment Variables Set:

**Rival:**
```env
EMAIL_FROM="RIVAL Autopožičovňa <noreply@rivalcars.sk>"
SMTP2GO_API_KEY=... (Rival's SMTP2GO)
BULKGATE_APP_ID=... (Rival's BulkGate)
BULKGATE_APP_TOKEN=... (Rival's BulkGate)
```

**LeRent:**
```env
LERENT_EMAIL_FROM="LeRent <noreply@lerent.sk>"
# Uses main SMTP2GO_API_KEY by default
```

**Nitra-Car:**
```env
NITRACAR_EMAIL_FROM="Nitra-Car <noreply@nitracar.sk>"
NITRACAR_SMTP2GO_API_KEY=... (Nitra-Car's SMTP2GO)
```

---

## Testing

### Test Email Isolation

1. **Create reservation as Rival:**
   - Check customer email FROM address = `noreply@rivalcars.sk`
   - Check admin email sent to `rivalautopozicovna@gmail.com`
   - Check SMS sent ✅

2. **Create reservation as LeRent:**
   - Check customer email FROM address = `noreply@lerent.sk`
   - Check admin email sent to `peter@aebdig.com`
   - Check NO SMS sent ❌

3. **Create reservation as Nitra-Car:**
   - Check customer email FROM address = `noreply@nitracar.sk`
   - Check admin email sent to `peter@aebdig.com`
   - Check NO SMS sent ❌

### Expected Logs

**LeRent reservation:**
```
🔍 [EMAIL DEBUG] getTenantEmailConfig called for user: lerent@lerent.sk
🔧 [EMAIL] Using LERENT email configuration
📧 [EMAIL] Sending admin notification to: peter@aebdig.com
📱 [SMS] Skipping SMS - not rival@test.sk tenant (user: lerent@lerent.sk)
```

**Rival reservation:**
```
🔍 [EMAIL DEBUG] getTenantEmailConfig called for user: rival@test.sk
🔧 [EMAIL] Using RIVAL email configuration
📧 [EMAIL] Sending admin notification to: rivalautopozicovna@gmail.com
📱 [SMS] Sending customer confirmation SMS to: +421900123456 (Rival tenant)
```

---

## Summary

| Tenant | Email FROM | SMS | Admin Email |
|--------|-----------|-----|-------------|
| **Rival** (`rival@test.sk`) | `EMAIL_FROM` (rivalcars.sk) | ✅ BulkGate | rivalautopozicovna@gmail.com |
| **LeRent** (`lerent@lerent.sk`) | `LERENT_EMAIL_FROM` (lerent.sk) | ❌ None | peter@aebdig.com |
| **Nitra-Car** (`nitra-car@nitra-car.sk`) | `NITRACAR_EMAIL_FROM` (nitracar.sk) | ❌ None | peter@aebdig.com |
| **Others** | `EMAIL_FROM` (default) | ❌ None | peter@aebdig.com |

---

## Important Notes

1. **SMS is ONLY for Rival** - Hardcoded in `emailHelpers.js`
2. **Each tenant can have separate SMTP2GO account** - Optional via `{TENANT}_SMTP2GO_API_KEY`
3. **Email FROM addresses are tenant-specific** - Configured via `{TENANT}_EMAIL_FROM`
4. **Admin emails are tenant-specific** - Configured in `emailHelpers.js`
5. **BulkGate credentials are only for Rival** - Do not use for other tenants

---

## Files Modified

- `server/services/smtp2goService.js` - Tenant email configuration
- `server/utils/emailHelpers.js` - SMS restriction and admin email routing
- `TENANT_SPECIFIC_CONFIGURATION.md` - This documentation

---

## Deployment

After updating environment variables on Render:

1. Go to Render Dashboard → Your service
2. Click "Environment"
3. Add/Update variables:
   - `LERENT_EMAIL_FROM`
   - `LERENT_SMTP2GO_API_KEY` (optional)
4. Click "Save Changes"
5. Service will auto-redeploy
6. Test with a new reservation
