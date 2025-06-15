# Environment Setup Guide - CarFlow Reservation System

## Overview
This guide explains how to set up environment variables and configuration files for the CarFlow Reservation System.

## Project Structure
```
carflow_reservation_system/
├── server/                 # Backend (Node.js/Express)
│   ├── .env               # Server environment variables (create this)
│   ├── .env.example       # Server environment template
│   └── google-cloud-key.json  # Google Cloud service account key (create this)
├── client/                # Frontend (React/Vite)
│   ├── .env               # Client environment variables (optional)
│   └── .env.example       # Client environment template
└── README.md
```

## Server Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

### Required Variables

```bash
# ==============================================
# CARFLOW RESERVATION SYSTEM - SERVER CONFIG
# ==============================================

# Node Environment
NODE_ENV=development

# Server Configuration
PORT=3001

# Database Configuration (REQUIRED)
MONGODB_URI=mongodb://localhost:27017/car-rental-admin
# For MongoDB Atlas, use format:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

# JWT Configuration (REQUIRED - Change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-in-production-minimum-32-characters
JWT_EXPIRE=30d

# Google Cloud Storage Configuration (REQUIRED for image uploads)
GCS_PROJECT_ID=your-gcs-project-id
GCS_BUCKET_NAME=your-bucket-name
GCS_KEY_FILENAME=./google-cloud-key.json

# File Upload Configuration
MAX_IMAGE_SIZE=5242880
MAX_IMAGES_PER_CAR=10
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# CORS Configuration
CLIENT_URL=http://localhost:5173
```

### Optional Variables

```bash
# Alternative Google Cloud Authentication (for deployment)
# GCS_CREDENTIALS=base64-encoded-service-account-json

# Email Configuration (for future email features)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Payment Configuration (for future Stripe integration)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# Rate Limiting
# RATE_LIMIT_WINDOW_MS=900000
# RATE_LIMIT_MAX_REQUESTS=100

# Session Configuration
# SESSION_SECRET=your-session-secret-key

# Redis Configuration (for caching)
# REDIS_URL=redis://localhost:6379

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## Client Environment Variables

Create a `.env` file in the `client/` directory (optional):

```bash
# ==============================================
# CARFLOW RESERVATION SYSTEM - CLIENT CONFIG
# ==============================================

# API Base URL
VITE_API_URL=http://localhost:3001/api

# App Configuration
VITE_APP_NAME=CarFlow Admin
VITE_APP_VERSION=1.0.0

# Google Maps API (if implementing map features)
# VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Analytics (if implementing analytics)
# VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

## Google Cloud Storage Setup

### 1. Create Service Account Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to "IAM & Admin" > "Service Accounts"
4. Create a new service account or select existing one
5. Create a new key (JSON format)
6. Download the JSON file

### 2. Place the Key File

**Option A: Local Development (Recommended)**
- Rename the downloaded JSON file to `google-cloud-key.json`
- Place it in the `server/` directory
- Set `GCS_KEY_FILENAME=./google-cloud-key.json` in your `.env`

**Option B: Production Deployment**
- Convert the JSON content to base64:
  ```bash
  base64 -i google-cloud-key.json
  ```
- Set the result as `GCS_CREDENTIALS` environment variable
- Remove or comment out `GCS_KEY_FILENAME`

### 3. Required Permissions

Your service account needs these permissions:
- Storage Object Admin (for file uploads)
- Storage Bucket Reader (for listing files)

## Security Considerations

### Production Deployment

1. **Change JWT Secrets**: Generate strong, unique secrets for production
2. **Use Environment Variables**: Never commit secrets to version control
3. **Enable HTTPS**: Set `NODE_ENV=production` and configure SSL
4. **Database Security**: Use MongoDB Atlas with authentication
5. **CORS Configuration**: Set `CLIENT_URL` to your production domain

### JWT Secret Generation

Generate secure JWT secrets:
```bash
# Generate a random 64-character string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address
5. Get connection string and add to `MONGODB_URI`

### Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service
3. Use default connection: `mongodb://localhost:27017/car-rental-admin`

## Verification

### Check Server Configuration
```bash
cd server
npm run dev
```

Look for these success messages:
- ✅ Google Cloud Storage configured successfully
- ✅ MongoDB Connected: [your-connection]
- ✅ Server running on port 3001

### Check Client Configuration
```bash
cd client
npm run dev
```

The client should start on `http://localhost:5173`

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check `MONGODB_URI` format
   - Verify network connectivity
   - Check MongoDB Atlas IP whitelist

2. **Google Cloud Storage Errors**
   - Verify `google-cloud-key.json` exists and is valid
   - Check GCS bucket permissions
   - Ensure service account has correct roles

3. **JWT Errors**
   - Ensure JWT secrets are at least 32 characters
   - Check for special characters in secrets

4. **CORS Errors**
   - Verify `CLIENT_URL` matches your frontend URL
   - Check for trailing slashes in URLs

### Environment Variable Priority

The application loads environment variables in this order:
1. System environment variables
2. `.env` file
3. Default values in code

## Deployment Considerations

### Environment Variables for Different Platforms

**Heroku:**
```bash
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
# ... other variables
```

**Vercel:**
Add variables in the Vercel dashboard under Settings > Environment Variables

**Docker:**
```dockerfile
ENV MONGODB_URI=your-mongodb-uri
ENV JWT_SECRET=your-jwt-secret
```

**Railway/Render:**
Add variables in the platform's environment variables section 