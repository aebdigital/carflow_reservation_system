# Email Service Setup Guide - EurocentrumV1

## Overview

The EurocentrumV1 backend includes a comprehensive email service that supports:
- Contact form email handling
- Reservation confirmation emails
- Two email providers: Nodemailer (SMTP) and SMTP2GO (API)
- Automatic test mode for development

## Quick Start (Test Mode)

The email service will work immediately in test mode without any configuration:

1. **No setup required** - The system automatically creates test email accounts
2. **Emails visible at** https://ethereal.email/ (check server logs for preview URLs)
3. **Perfect for development and testing**

## Production Setup

### Option 1: Gmail SMTP (Simple)

1. **Enable 2-factor authentication** on your Gmail account
2. **Generate App Password**: https://myaccount.google.com/apppasswords
3. **Update your .env file**:

```env
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=EurocentrumV1 <your-email@gmail.com>
CONTACT_EMAIL=info@yourdomain.com
```

### Option 2: SMTP2GO (Recommended)

SMTP2GO offers better deliverability, analytics, and professional features.

1. **Sign up** at https://www.smtp2go.com/
2. **Get your API key** from the dashboard
3. **Update your .env file**:

```env
EMAIL_PROVIDER=smtp2go
SMTP2GO_API_KEY=your-api-key
EMAIL_FROM=EurocentrumV1 <noreply@yourdomain.com>
CONTACT_EMAIL=info@yourdomain.com
```

### Option 3: Other SMTP Providers

```env
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=your-smtp-host.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-username
EMAIL_PASS=your-password
EMAIL_FROM=EurocentrumV1 <noreply@yourdomain.com>
CONTACT_EMAIL=info@yourdomain.com
```

**Common SMTP Settings:**
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom hosting**: Check with your hosting provider

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EMAIL_PROVIDER` | No | Email service provider | `nodemailer` or `smtp2go` |
| `EMAIL_FROM` | No | From email address | `EurocentrumV1 <noreply@domain.com>` |
| `CONTACT_EMAIL` | No | Where contact forms are sent | `info@domain.com` |
| `EMAIL_HOST` | For SMTP | SMTP server hostname | `smtp.gmail.com` |
| `EMAIL_PORT` | For SMTP | SMTP server port | `587` |
| `EMAIL_SECURE` | For SMTP | Use SSL (true for port 465) | `false` |
| `EMAIL_USER` | For SMTP | SMTP username | `your-email@gmail.com` |
| `EMAIL_PASS` | For SMTP | SMTP password | `your-app-password` |
| `SMTP2GO_API_KEY` | For SMTP2GO | SMTP2GO API key | `your-api-key` |

## API Endpoints

### Send Contact Form Email
```http
POST /api/send-email
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com", 
  "phone": "+1234567890",
  "subject": "Question about services",
  "message": "I would like more information..."
}
```

### Send Reservation Confirmation
```http
POST /api/send-email/reservation
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "reservationNumber": "R12345",
  "carInfo": "BMW X3 2023",
  "startDate": "2024-01-15",
  "endDate": "2024-01-20", 
  "totalPrice": "250"
}
```

### Test Email Service
```http
GET /api/send-email/test?email=test@example.com
Authorization: Bearer <admin-token>
```

## Deployment Configuration

### Render.com
Add these environment variables in your Render service settings:

**For SMTP2GO (Recommended):**
```
EMAIL_PROVIDER=smtp2go
SMTP2GO_API_KEY=your-api-key
EMAIL_FROM=EurocentrumV1 <noreply@yourdomain.com>
CONTACT_EMAIL=info@yourdomain.com
```

**For Gmail:**
```
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=EurocentrumV1 <your-gmail@gmail.com>
CONTACT_EMAIL=info@yourdomain.com
```

## Troubleshooting

### "Email service not properly configured"
- Check that environment variables are set correctly in your deployment
- Verify SMTP credentials or API key
- Check server logs for detailed error messages

### Gmail "Authentication failed"
- Make sure you're using an App Password, not your regular password
- Enable 2-factor authentication first
- Use `EMAIL_SECURE=false` for port 587

### SMTP2GO errors
- Verify API key is correct and active
- Check account limits and usage
- Ensure sender email is verified in SMTP2GO dashboard

### Test Mode Issues
- If test emails don't work, check internet connection
- Test mode requires external API access to ethereal.email

## Testing

### Using curl:
```bash
# Test contact form
curl -X POST "https://your-api.onrender.com/api/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test Email",
    "message": "This is a test message"
  }'
```

### Using frontend:
Check your browser network tab for API responses and server logs for email sending details.

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Use App Passwords** for Gmail, not regular passwords
4. **Consider SMTP2GO** for production (better security and deliverability)
5. **Set up SPF/DKIM records** for your domain
6. **Monitor email sending** for suspicious activity

## Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Test with the `/api/send-email/test` endpoint
3. Verify environment variables are set correctly
4. Review this documentation for common solutions 