# Email Service Configuration Guide

## Overview

The CarFlow system supports two email service providers:
1. **Nodemailer** (Default) - Works with any SMTP server
2. **SMTP2GO** - Professional email service with API integration

## Environment Variables

Add these variables to your `.env` file:

### General Email Settings
```env
# Email service provider ('nodemailer' or 'smtp2go')
EMAIL_PROVIDER=nodemailer

# From email address
EMAIL_FROM=CarFlow <noreply@carflow.sk>

# Contact email (where contact form emails are sent)
CONTACT_EMAIL=info@carflow.sk
```

## Option 1: Nodemailer (Default)

### For Production SMTP
```env
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=CarFlow <your-email@gmail.com>
```

### For Gmail Setup
1. Enable 2-factor authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password as `EMAIL_PASS`

### For Other SMTP Providers
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your hosting provider's SMTP settings

### Test Mode (Development)
If no SMTP settings are provided, Nodemailer will automatically create a test account using [Ethereal Email](https://ethereal.email/). Emails will be visible at the preview URL shown in the console.

## Option 2: SMTP2GO (Recommended for Production)

[SMTP2GO](https://developers.smtp2go.com/docs/endpoints) is a professional email service with excellent deliverability and detailed analytics.

### Setup Steps
1. Sign up at https://www.smtp2go.com/
2. Get your API key from the dashboard
3. Add to your environment variables:

```env
EMAIL_PROVIDER=smtp2go
SMTP2GO_API_KEY=your-api-key
EMAIL_FROM=CarFlow <noreply@yourdomain.com>
```

### Optional SMTP2GO Settings
```env
# Regional endpoints for better performance
SMTP2GO_BASE_URL=https://us-api.smtp2go.com/v3  # US region
SMTP2GO_BASE_URL=https://eu-api.smtp2go.com/v3  # EU region  
SMTP2GO_BASE_URL=https://au-api.smtp2go.com/v3  # AU region
```

## API Endpoints

### Send Contact Form Email
```http
POST /api/send-email
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "Question about rental",
  "message": "I would like to know more about your services."
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
Add environment variables in your service settings:

```env
EMAIL_PROVIDER=smtp2go
SMTP2GO_API_KEY=your-api-key
EMAIL_FROM=CarFlow <noreply@yourdomain.com>
CONTACT_EMAIL=info@yourdomain.com
```

### Other Platforms
Similar process - add the environment variables to your deployment platform's configuration.

## Troubleshooting

### Common Issues

1. **"Email service not properly configured"**
   - Check that all required environment variables are set
   - Verify your SMTP credentials or API key
   - Check the console logs for specific error messages

2. **Gmail "Less secure app" error**
   - Enable 2-factor authentication
   - Use an App Password instead of your regular password
   - Make sure `EMAIL_SECURE=false` for port 587

3. **SMTP2GO errors**
   - Verify your API key is correct
   - Check your account limits and usage
   - Ensure your sender email is verified in SMTP2GO

### Testing

Use the test endpoint to verify your configuration:
```bash
curl -X GET "https://your-api.com/api/send-email/test?email=test@example.com" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Email Templates

The system includes pre-built templates for:
- **Contact Form**: Professional contact form handling
- **Reservation Confirmation**: Automatic booking confirmations
- **Custom Emails**: Flexible email sending with HTML/text content

All templates are responsive and include proper styling.

## Production Recommendations

1. **Use SMTP2GO** for better deliverability and analytics
2. **Set up proper SPF/DKIM** records for your domain
3. **Monitor email metrics** through your provider's dashboard
4. **Configure proper sender addresses** to avoid spam filters
5. **Test thoroughly** before going live

## Security Notes

- Never commit email credentials to version control
- Use environment variables for all sensitive data
- Consider using separate email accounts for different environments
- Regularly rotate API keys and passwords
- Monitor email sending for suspicious activity 