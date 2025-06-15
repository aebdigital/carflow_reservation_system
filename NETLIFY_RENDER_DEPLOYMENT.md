# CarFlow Deployment Guide: Netlify + Render

This guide walks you through deploying your CarFlow Reservation System with:
- **Frontend (React)**: Netlify → `https://carflow-reservation-admin.netlify.app`
- **Backend (Node.js)**: Render → `https://carflow-reservation-backend.onrender.com`

## 📋 Prerequisites

- GitHub repository: `https://github.com/aebdigital/carflow_reservation_system.git`
- MongoDB Atlas account (for production database)
- Google Cloud Storage account (for file uploads)
- Netlify account
- Render account

## 🗄️ Step 1: Set Up MongoDB Atlas (Production Database)

### 1.1 Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Sign up/login and create a new project
3. Create a new cluster (choose free tier M0)
4. Wait for cluster to be created (2-3 minutes)

### 1.2 Configure Database Access

1. **Database Access** → **Add New Database User**
   - Username: `carflow-admin`
   - Password: Generate secure password (save it!)
   - Database User Privileges: **Read and write to any database**

2. **Network Access** → **Add IP Address**
   - Add `0.0.0.0/0` (Allow access from anywhere)
   - This is needed for Render to connect

3. **Connect** → **Connect your application**
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Example: `mongodb+srv://carflow-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/carflow-production`

## ☁️ Step 2: Set Up Google Cloud Storage

### 2.1 Create Storage Bucket

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. **Cloud Storage** → **Create Bucket**
   - Name: `carflow-images-production`
   - Location: Choose region closest to your users
   - Storage class: Standard
   - Access control: Fine-grained

### 2.2 Create Service Account

1. **IAM & Admin** → **Service Accounts** → **Create Service Account**
   - Name: `carflow-storage-service`
   - Role: **Storage Object Admin**
2. **Create Key** → **JSON** → Download the key file
3. Convert to base64 for Render: `base64 -i service-account-key.json`

## 🚀 Step 3: Deploy Backend to Render

### 3.1 Create Web Service

1. Go to [Render](https://render.com/) → **New** → **Web Service**
2. Connect GitHub repository: `aebdigital/carflow_reservation_system`
3. Configure service:

```
Name: carflow-reservation-backend
Region: Oregon (US West) or closest to your users
Branch: main
Root Directory: server
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### 3.2 Environment Variables

Add these environment variables in Render:

```bash
# Database
MONGODB_URI=mongodb+srv://carflow-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/carflow-production

# JWT Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-characters-long
JWT_EXPIRE=30d
JWT_REFRESH_EXPIRE=90d

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET_NAME=carflow-images-production
GOOGLE_CLOUD_KEY_BASE64=your-base64-encoded-service-account-key

# App Configuration
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://carflow-reservation-admin.netlify.app

# File Upload Settings
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# Demo/Development Settings (Optional)
DEMO_MODE=true
```

### 3.3 Deploy Backend

1. Click **Create Web Service**
2. Wait for deployment (5-10 minutes)
3. Your backend will be available at: `https://carflow-reservation-backend.onrender.com`

## 🌐 Step 4: Deploy Frontend to Netlify

### 4.1 Create Site

1. Go to [Netlify](https://netlify.com/) → **Add new site** → **Import from Git**
2. Connect GitHub repository: `aebdigital/carflow_reservation_system`
3. Configure build settings:

```
Base directory: client
Build command: npm run build
Publish directory: dist
```

### 4.2 Environment Variables

In Netlify **Site settings** → **Environment variables**, add:

```bash
VITE_API_URL=https://carflow-reservation-backend.onrender.com/api
```

### 4.3 Custom Domain (Optional)

1. **Domain settings** → **Add custom domain**
2. Add: `carflow-reservation-admin.netlify.app`
3. Or use your own domain

### 4.4 Deploy Frontend

1. Click **Deploy site**
2. Wait for deployment (3-5 minutes)
3. Your frontend will be available at: `https://carflow-reservation-admin.netlify.app`

## ✅ Step 5: Verify Deployment

### 5.1 Test Backend

```bash
curl https://carflow-reservation-backend.onrender.com/api/health
```

Should return:
```json
{"status":"OK","message":"Car Rental Admin API is running"}
```

### 5.2 Test Frontend

1. Visit: `https://carflow-reservation-admin.netlify.app`
2. Try logging in with demo credentials:
   - Email: `admin@example.com`
   - Password: `password123`

### 5.3 Test Full Integration

1. **Create a reservation** in the admin panel
2. **Generate an invoice** for the reservation
3. **Download/preview the PDF** invoice
4. **Confirm the payment** (demo mode)

## 🔧 Step 6: Production Optimizations

### 6.1 Security Headers (Already configured in netlify.toml)

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 6.2 Database Indexes

Your MongoDB should have these indexes (automatically created):
- `paymentId` (unique)
- `reservation`
- `customer`
- `status`
- `stripePaymentIntentId`

### 6.3 Monitoring

1. **Render**: Built-in monitoring and logs
2. **Netlify**: Analytics and form submissions
3. **MongoDB Atlas**: Performance monitoring

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `CORS_ORIGIN` in Render matches your Netlify URL
   - Check that both URLs are using HTTPS

2. **Database Connection**
   - Verify MongoDB connection string
   - Check IP whitelist includes `0.0.0.0/0`

3. **File Upload Issues**
   - Verify Google Cloud credentials
   - Check bucket permissions

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all environment variables are set

### Debug Commands

```bash
# Check backend health
curl https://carflow-reservation-backend.onrender.com/api/health

# Check frontend build
npm run build

# Test local connection to production API
curl -H "Authorization: Bearer YOUR_TOKEN" https://carflow-reservation-backend.onrender.com/api/auth/me
```

## 📱 Final URLs

- **Admin Dashboard**: https://carflow-reservation-admin.netlify.app
- **Backend API**: https://carflow-reservation-backend.onrender.com
- **API Health Check**: https://carflow-reservation-backend.onrender.com/api/health

## 🎉 Success!

Your CarFlow Reservation System is now live in production! 

**Next Steps:**
1. Set up custom domains if desired
2. Configure email notifications
3. Set up backup strategies
4. Monitor performance and usage
5. Plan for scaling as your business grows 