# 🚀 Quick Deployment Guide: Netlify + Render

## TL;DR - Fast Track Deployment

### 1. Prerequisites Setup (5 minutes)
```bash
# Run the deployment helper
./deploy.sh

# This will generate JWT secrets - copy them!
```

### 2. MongoDB Atlas (5 minutes)
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create free cluster
3. Create user: `carflow-admin` with password
4. Whitelist IP: `0.0.0.0/0`
5. Get connection string

### 3. Google Cloud Storage (5 minutes)
1. Create bucket in [Google Cloud Console](https://console.cloud.google.com/)
2. Create service account with "Storage Object Admin" role
3. Download JSON key
4. Convert to base64: `base64 -i service-account-key.json`

### 4. Deploy Backend to Render (10 minutes)
1. Go to [Render](https://render.com/) → New Web Service
2. Connect GitHub: `aebdigital/carflow_reservation_system`
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Environment Variables** (copy from deploy.sh output):
```bash
MONGODB_URI=mongodb+srv://carflow-admin:PASSWORD@cluster0.xxxxx.mongodb.net/carflow
JWT_SECRET=your-generated-secret-from-deploy-script
JWT_REFRESH_SECRET=your-generated-refresh-secret-from-deploy-script
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket-name
GCS_CREDENTIALS=your-base64-service-account-json
NODE_ENV=production
CLIENT_URL=https://your-netlify-app.netlify.app
```

### 5. Deploy Frontend to Netlify (5 minutes)
1. Go to [Netlify](https://netlify.com/) → New site from Git
2. Connect GitHub: `aebdigital/carflow_reservation_system`
3. Settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`

4. **Environment Variables**:
```bash
VITE_API_URL=https://carflow-backend.onrender.com/api
```

### 6. Update CORS (2 minutes)
Update `server/server.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-netlify-app.netlify.app'
  ],
  credentials: true
}));
```

Push changes to trigger redeploy.

## 🎯 Final URLs
- **Frontend**: `https://your-netlify-app.netlify.app`
- **Backend**: `https://carflow-backend.onrender.com`
- **API Health**: `https://carflow-backend.onrender.com/api/health`

## 🔐 Default Login
- **Email**: `admin@example.com`
- **Password**: `password123`

## 📖 Need More Details?
See `NETLIFY_RENDER_DEPLOYMENT.md` for comprehensive step-by-step instructions.

---
**Total Time**: ~30 minutes ⏱️ 