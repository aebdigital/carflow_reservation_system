# Render Deployment Setup for Car Rental System

## Required Environment Variables

In your Render service dashboard, add these environment variables:

### Database Configuration
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/car_rental_db?retryWrites=true&w=majority
```

### Authentication
```
JWT_SECRET=your-super-long-random-jwt-secret-key-here
```

### Google Cloud Storage
```
GCS_PROJECT_ID=your-google-cloud-project-id
GCS_BUCKET_NAME=your-storage-bucket-name
GCS_CREDENTIALS=/etc/secrets/google-credentials.json
```

### Image Upload Settings
```
MAX_IMAGE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
MAX_IMAGES_PER_CAR=10
```

## Google Cloud Storage Setup

1. **Create a Google Cloud Project** (if you don't have one)
2. **Enable Cloud Storage API**
3. **Create a Storage Bucket**
4. **Create a Service Account** with Storage Admin permissions
5. **Download the service account JSON key file**
6. **Upload the JSON file as a secret** in Render:
   - Go to your Render service dashboard
   - Click on "Environment" 
   - Scroll down to "Secret Files"
   - Add a new secret file:
     - **File Path**: `/etc/secrets/google-credentials.json`
     - **Contents**: Paste your service account JSON content

## Important Notes

- The `GCS_CREDENTIALS` variable should be set to exactly `/etc/secrets/google-credentials.json`
- Make sure your Google Cloud Storage bucket has the correct permissions
- The bucket should allow public read access for the uploaded images
- Test the configuration by uploading a car image after deployment

## Troubleshooting

If you see "Upload pending - configure Google Cloud Storage" messages:

1. Check that all GCS environment variables are set correctly
2. Verify the secret file was uploaded correctly to `/etc/secrets/google-credentials.json`
3. Check the server logs for detailed error messages
4. Ensure your GCS bucket exists and has proper permissions

## Testing the Setup

After deployment, check the server logs. You should see:
```
🔧 Checking Google Cloud Storage configuration...
📋 Environment variables:
   GCS_PROJECT_ID: ✅ Set
   GCS_BUCKET_NAME: ✅ Set
   GCS_CREDENTIALS: ✅ Set
📁 Loading GCS credentials from Render secrets file mount
✅ Google Cloud Storage initialized successfully
📁 GCS Bucket name: your-bucket-name
```

When you upload your first car image, you should see:
```
🧪 Testing Google Cloud Storage connection...
✅ Google Cloud Storage connection verified successfully
``` 