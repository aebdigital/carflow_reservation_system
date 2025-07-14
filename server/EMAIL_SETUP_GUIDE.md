# 📧 CarFlow Email Setup Guide

## 🚨 Current Status
Your emails are currently using **Ethereal Email** (test mode) because no email provider is configured. This means:
- ✅ Emails work locally for testing
- ❌ Real emails are NOT sent to users
- 🔗 You can view test emails at: https://ethereal.email/

## 🔧 Quick Setup Steps

### 1. Create .env File
```bash
cd server
cp email-config-template.env .env
```

### 2. Choose Your Email Provider

#### Option A: SMTP2GO (Recommended for Production)
1. Sign up at https://www.smtp2go.com/
2. Get your API key from dashboard
3. Edit `server/.env`:
```env
EMAIL_PROVIDER=smtp2go
SMTP2GO_API_KEY=your-actual-api-key-here
EMAIL_FROM=CarFlow <noreply@carflow.sk>
CONTACT_EMAIL=peter@aebdig.com
```

#### Option B: Gmail SMTP
1. Enable 2-factor authentication on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Edit `server/.env`:
```env
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=CarFlow <your-email@gmail.com>
CONTACT_EMAIL=peter@aebdig.com
```

#### Option C: Other SMTP Providers
```env
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-username
EMAIL_PASS=your-password
EMAIL_FROM=CarFlow <noreply@yourdomain.com>
CONTACT_EMAIL=peter@aebdig.com
```

### 3. Test Your Configuration
```bash
# Restart server
npm start

# Test email endpoint
curl -X GET "http://localhost:3001/api/send-email/test?email=test@example.com"
```

## 📋 What Emails Are Sent

### 1. Admin Notifications
- **To**: `peter@aebdig.com`
- **When**: New reservation created
- **Content**: Reservation details, customer info, car details

### 2. Contact Form Emails
- **To**: `CONTACT_EMAIL` (configured in .env)
- **When**: Someone submits contact form
- **Content**: Customer inquiry details

### 3. Customer Confirmations
- **To**: Customer email
- **When**: Reservation confirmed
- **Content**: Booking confirmation, car details, pickup info

## 🔍 Troubleshooting

### "Email service not properly configured"
- Check that all required environment variables are set in `.env`
- Verify your SMTP credentials or API key
- Check server console for specific error messages

### Gmail "Less secure app" Error
- ✅ Enable 2-factor authentication
- ✅ Use App Password instead of regular password
- ✅ Set `EMAIL_SECURE=false` for port 587

### SMTP2GO Errors
- ✅ Verify API key is correct
- ✅ Check account limits/usage
- ✅ Ensure sender email is verified

## 🚀 Production Recommendations

1. **Use SMTP2GO** - Better deliverability and analytics
2. **Set up SPF/DKIM** records for your domain
3. **Use professional sender address** (noreply@yourdomain.com)
4. **Monitor email metrics** through provider dashboard

## 📝 Environment Variables Reference

```env
# Email Provider
EMAIL_PROVIDER=smtp2go          # or 'nodemailer'

# SMTP2GO Configuration
SMTP2GO_API_KEY=your-api-key

# Nodemailer Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Email Addresses
EMAIL_FROM=CarFlow <noreply@carflow.sk>
CONTACT_EMAIL=peter@aebdig.com
```

## 💡 Next Steps

1. **Create your `.env` file** using the template
2. **Choose and configure** your email provider
3. **Test the configuration** using the test endpoint
4. **Restart your server** to apply changes

Once configured, your CarFlow system will send real emails for:
- New reservation notifications
- Contact form submissions  
- Customer confirmations
- Admin alerts

Need help? Check the server console logs for detailed error messages! 