# CarFlow Deployment Guide: Netlify + Render

This guide walks you through deploying your CarFlow Reservation System with:
- **Frontend (React)**: Netlify
- **Backend (Node.js)**: Render

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
   - Database User Privileges: `Atlas admin`

2. **Network Access** → **Add IP Address**
   - Add `0.0.0.0/0` (allow access from anywhere)
   - Or add specific IPs for better security

### 1.3 Get Connection String

1. Click **Connect** on your cluster
2. Choose **Connect your application**
3. Copy the connection string:
   ```
   mongodb+srv://carflow-admin:<password>@cluster0.xxxxx.mongodb.net/carflow?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password

## ☁️ Step 2: Configure Google Cloud Storage

### 2.1 Create Service Account (for Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Create new service account: `carflow-production`
4. Assign role: **Storage Object Admin**
5. Create and download JSON key

### 2.2 Convert Key to Base64 (for Environment Variables)

```bash
# Convert your service account JSON to base64
base64 -i path/to/your/service-account-key.json

# Copy the output - you'll need this for Render
```

### 2.3 Set Bucket Permissions

```bash
# Make bucket publicly readable for images
gsutil iam ch allUsers:objectViewer gs://your-bucket-name
```

## 🚀 Step 3: Deploy Backend to Render

### 3.1 Create Render Account

1. Go to [Render](https://render.com/)
2. Sign up with GitHub account
3. Connect your GitHub repository

### 3.2 Create Web Service

1. **Dashboard** → **New** → **Web Service**
2. Connect your repository: `aebdigital/carflow_reservation_system`
3. Configure service:

   **Basic Settings:**
   - **Name**: `carflow-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3.3 Add Environment Variables

In Render dashboard, go to **Environment** and add these variables:

```bash
# Database
MONGODB_URI=mongodb+srv://carflow-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/carflow?retryWrites=true&w=majority

# JWT Secrets (generate strong ones!)
JWT_SECRET=your-super-secure-jwt-secret-64-characters-minimum-for-production
JWT_REFRESH_SECRET=your-super-secure-refresh-jwt-secret-64-characters-minimum

# Google Cloud Storage
GCS_PROJECT_ID=your-gcs-project-id
GCS_BUCKET_NAME=your-bucket-name
GCS_CREDENTIALS=your-base64-encoded-service-account-json

# Server Configuration
NODE_ENV=production
PORT=3001
CLIENT_URL=https://your-netlify-app.netlify.app

# File Upload Settings
MAX_IMAGE_SIZE=5242880
MAX_IMAGES_PER_CAR=10
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# JWT Configuration
JWT_EXPIRE=30d

# Logging
LOG_LEVEL=info
```

### 3.4 Generate Secure JWT Secrets

```bash
# Generate secure secrets (run locally)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

### 3.5 Deploy Backend

1. Click **Create Web Service**
2. Wait for deployment (5-10 minutes)
3. Your backend will be available at: `https://carflow-backend.onrender.com`

### 3.6 Test Backend Deployment

```bash
# Test health endpoint
curl https://carflow-backend.onrender.com/api/health

# Should return:
# {"status":"OK","message":"Car Rental Admin API is running","timestamp":"..."}
```

## 🌐 Step 4: Deploy Frontend to Netlify

### 4.1 Prepare Frontend for Production

First, update the API URL in your client code:

**Create `client/.env.production`:**
```bash
VITE_API_URL=https://carflow-backend.onrender.com/api
```

**Update `client/vite.config.js` if needed:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
```

### 4.2 Create Netlify Account

1. Go to [Netlify](https://www.netlify.com/)
2. Sign up with GitHub account
3. Connect your GitHub repository

### 4.3 Deploy to Netlify

**Option A: Automatic Deployment (Recommended)**

1. **Sites** → **Add new site** → **Import an existing project**
2. Choose **GitHub** and select your repository
3. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
   - **Production branch**: `main`

**Option B: Manual Deployment**

```bash
# Build locally
cd client
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

### 4.4 Configure Environment Variables (Netlify)

1. Go to **Site settings** → **Environment variables**
2. Add production environment variables:

```bash
VITE_API_URL=https://carflow-backend.onrender.com/api
VITE_APP_NAME=CarFlow Admin
VITE_APP_VERSION=1.0.0
```

### 4.5 Configure Redirects for SPA

Create `client/public/_redirects`:
```
/*    /index.html   200
```

This ensures React Router works properly on Netlify.

### 4.6 Custom Domain (Optional)

1. **Domain settings** → **Add custom domain**
2. Follow Netlify's instructions to configure DNS
3. Enable HTTPS (automatic with Netlify)

## 🔧 Step 5: Update CORS Configuration

Update your backend's CORS configuration to allow your Netlify domain:

**In `server/server.js`:**
```javascript
// Update CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-netlify-app.netlify.app',
    'https://your-custom-domain.com' // if using custom domain
  ],
  credentials: true
}));
```

Redeploy your backend after this change.

## 🧪 Step 6: Test Full Deployment

### 6.1 Test Backend Endpoints

```bash
# Health check
curl https://carflow-backend.onrender.com/api/health

# Public cars endpoint
curl https://carflow-backend.onrender.com/api/public/cars
```

### 6.2 Test Frontend

1. Visit your Netlify URL: `https://your-netlify-app.netlify.app`
2. Test login with demo credentials:
   - Email: `admin@example.com`
   - Password: `password123`
3. Test all major features:
   - Dashboard loading
   - Car management
   - Reservations
   - Payments
   - PDF generation

## 🔒 Step 7: Security & Performance

### 7.1 Backend Security (Render)

1. **Environment Variables**: Never commit secrets to Git
2. **HTTPS**: Render provides automatic HTTPS
3. **Rate Limiting**: Already configured in your app
4. **Database**: Use MongoDB Atlas with authentication

### 7.2 Frontend Security (Netlify)

1. **HTTPS**: Netlify provides automatic HTTPS
2. **Headers**: Configure security headers in `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 7.3 Performance Optimization

**Frontend (Netlify):**
- Automatic CDN
- Gzip compression
- Image optimization

**Backend (Render):**
- Keep-alive connections
- Database connection pooling
- Proper caching headers

## 📊 Step 8: Monitoring & Maintenance

### 8.1 Render Monitoring

1. **Metrics**: View CPU, memory, and response times
2. **Logs**: Access real-time logs in Render dashboard
3. **Alerts**: Set up email notifications for downtime

### 8.2 Netlify Monitoring

1. **Analytics**: Built-in traffic analytics
2. **Deploy notifications**: Email/Slack notifications
3. **Form handling**: If you add contact forms

### 8.3 Database Monitoring

1. **MongoDB Atlas**: Built-in monitoring and alerts
2. **Performance Advisor**: Optimization recommendations
3. **Backup**: Automatic backups included

## 🚀 Step 9: Continuous Deployment

### 9.1 Automatic Deployments

Both Netlify and Render will automatically deploy when you push to your `main` branch:

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# This triggers:
# 1. Netlify rebuilds and deploys frontend
# 2. Render rebuilds and deploys backend
```

### 9.2 Environment-Specific Deployments

**Staging Environment:**
- Create `staging` branch
- Deploy to separate Render/Netlify instances
- Use separate MongoDB database

**Production Environment:**
- Use `main` branch
- Production MongoDB Atlas cluster
- Production Google Cloud Storage

## 🔧 Troubleshooting

### Common Issues

**1. CORS Errors**
```javascript
// Ensure backend CORS includes your Netlify URL
origin: ['https://your-netlify-app.netlify.app']
```

**2. Environment Variables Not Loading**
- Check variable names (case-sensitive)
- Restart services after adding variables
- Verify no trailing spaces

**3. Database Connection Issues**
- Check MongoDB Atlas IP whitelist
- Verify connection string format
- Test connection string locally first

**4. File Upload Issues**
- Verify Google Cloud Storage permissions
- Check base64 encoding of service account
- Test GCS bucket accessibility

**5. Build Failures**
```bash
# Common fixes:
npm install  # Install dependencies
npm run build  # Test build locally
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] MongoDB Atlas cluster created and configured
- [ ] Google Cloud Storage bucket set up
- [ ] Service account key converted to base64
- [ ] JWT secrets generated
- [ ] Repository pushed to GitHub

### Backend (Render)
- [ ] Web service created
- [ ] Environment variables configured
- [ ] Build and start commands set
- [ ] Deployment successful
- [ ] Health endpoint responding
- [ ] Database connection working

### Frontend (Netlify)
- [ ] Site connected to GitHub
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Redirects file created
- [ ] Deployment successful
- [ ] App loads and functions properly

### Post-Deployment
- [ ] CORS configuration updated
- [ ] Full application testing completed
- [ ] Custom domain configured (if applicable)
- [ ] Security headers configured
- [ ] Monitoring set up

## 🌐 Final URLs

After successful deployment, you'll have:

- **Frontend**: `https://your-netlify-app.netlify.app`
- **Backend**: `https://carflow-backend.onrender.com`
- **API Health**: `https://carflow-backend.onrender.com/api/health`

## 💡 Tips for Success

1. **Test Locally First**: Always test your build locally before deploying
2. **Environment Variables**: Double-check all environment variables
3. **Database**: Use MongoDB Atlas for production reliability
4. **Monitoring**: Set up alerts for both services
5. **Backups**: MongoDB Atlas provides automatic backups
6. **Updates**: Keep dependencies updated regularly
7. **Security**: Regularly rotate JWT secrets and API keys

---

**Deployment Complete!** 🎉

Your CarFlow Reservation System is now live and ready for production use! 