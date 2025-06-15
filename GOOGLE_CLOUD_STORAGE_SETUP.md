# Google Cloud Storage Setup Guide for Car Images

This guide will help you set up Google Cloud Storage to store car images for your rental system.

## 🏗️ Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select existing one:
   - Click "Select a project" → "New Project"
   - Enter project name: `car-rental-images`
   - Click "Create"

## 🪣 Step 2: Create Storage Bucket

1. **Navigate to Cloud Storage**:
   - In the left sidebar, go to "Cloud Storage" → "Buckets"

2. **Create a new bucket**:
   - Click "CREATE BUCKET"
   - **Bucket name**: `car-rental-images-[your-unique-id]` (must be globally unique)
   - **Location type**: Region (choose closest to your users)
   - **Storage class**: Standard
   - **Access control**: Fine-grained (recommended)
   - Click "CREATE"

3. **Configure bucket permissions**:
   - Go to your bucket → "Permissions" tab
   - Click "GRANT ACCESS"
   - Add these permissions:
     - **New principals**: `allUsers`
     - **Role**: "Storage Object Viewer" (for public read access to images)
   - Click "SAVE"

## 🔑 Step 3: Create Service Account

1. **Navigate to IAM & Admin**:
   - Left sidebar → "IAM & Admin" → "Service Accounts"

2. **Create service account**:
   - Click "CREATE SERVICE ACCOUNT"
   - **Service account name**: `car-rental-storage`
   - **Description**: `Service account for car rental image uploads`
   - Click "CREATE AND CONTINUE"

3. **Grant permissions**:
   - **Role**: "Storage Admin" (for full bucket access)
   - Click "CONTINUE" → "DONE"

4. **Create and download key**:
   - Click on your new service account
   - Go to "Keys" tab → "ADD KEY" → "Create new key"
   - Choose "JSON" format
   - Click "CREATE"
   - **Save the downloaded JSON file securely** - you'll need it for your app

## 🔧 Step 4: Enable Required APIs

1. **Go to APIs & Services**:
   - Left sidebar → "APIs & Services" → "Library"

2. **Enable Cloud Storage API**:
   - Search for "Cloud Storage API"
   - Click on it → "ENABLE"

## 📁 Step 5: Install Dependencies

Add these to your server's package.json:

```bash
npm install @google-cloud/storage multer uuid sharp
```

## ⚙️ Step 6: Environment Variables

Add these to your server/.env file:

```env
# Google Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=car-rental-images-your-unique-id
GCS_KEY_FILENAME=./path/to/your/service-account-key.json
# Alternative: use GCS_CREDENTIALS for production with base64 encoded key
GCS_CREDENTIALS=base64-encoded-service-account-json

# Image settings
MAX_IMAGE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
MAX_IMAGES_PER_CAR=10
```

## 🔒 Security Notes

1. **Never commit your service account JSON file to version control**
2. **Add the JSON file to .gitignore**:
   ```gitignore
   # Google Cloud Service Account
   google-service-account.json
   *.json
   ```

3. **For production**, use one of these methods:
   - **Environment variables**: Encode the JSON as base64 and store in `GCS_CREDENTIALS`
   - **Google Cloud Run/App Engine**: Use default application credentials
   - **Kubernetes**: Mount the JSON as a secret

## 📄 Example folder structure in your bucket:

```
car-rental-images-bucket/
├── cars/
│   ├── toyota-camry-2023/
│   │   ├── exterior-1.jpg
│   │   ├── exterior-2.jpg
│   │   ├── interior-1.jpg
│   │   └── dashboard-1.jpg
│   ├── honda-accord-2022/
│   │   ├── front-view.jpg
│   │   └── side-view.jpg
│   └── bmw-x5-2024/
│       ├── luxury-interior.jpg
│       └── trunk-space.jpg
```

## 🌐 Example public URLs:

After setup, your car images will be accessible via URLs like:
```
https://storage.googleapis.com/car-rental-images-your-unique-id/cars/toyota-camry-2023/exterior-1.jpg
```

## 💰 Cost Estimation

- **Storage**: ~$0.020 per GB per month (Standard storage)
- **Operations**: ~$0.05 per 10,000 operations
- **Network egress**: Free for first 1GB per month, then regional pricing

For a small car rental with 100 cars and 5 images each (~500 images, ~1GB total):
- **Monthly cost**: ~$2-5 depending on traffic

## 🛠️ Next Steps

After completing this setup:
1. Update your Car model to include image URLs
2. Create image upload middleware
3. Update the fleet management interface
4. Test image uploads and public access

## 🆘 Troubleshooting

**Common issues:**

1. **"Access denied" errors**: Check service account permissions
2. **"Bucket not found"**: Verify bucket name in environment variables
3. **Images not publicly accessible**: Check bucket permissions for `allUsers`
4. **Large upload timeouts**: Implement image compression/resizing

**Test your setup**:
```bash
# Test if your service account can access the bucket
gsutil ls gs://your-bucket-name
``` 