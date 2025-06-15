# Environment Variables Setup

## Required Google Cloud Storage Variables

Add these to your `.env` file in the server directory:

```env
# Google Cloud Storage Configuration
GCS_PROJECT_ID=your-google-cloud-project-id
GCS_BUCKET_NAME=car-rental-images-your-unique-id
GCS_KEY_FILENAME=./config/google-service-account.json

# Image Upload Settings
MAX_IMAGE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
MAX_IMAGES_PER_CAR=10
```

## How to get the values:

### GCS_PROJECT_ID
- Go to Google Cloud Console
- Your project ID is shown in the top navigation bar

### GCS_BUCKET_NAME
- This is the bucket name you created (must be globally unique)
- Example: `car-rental-images-abc123`

### GCS_KEY_FILENAME
- Path to your service account JSON file
- Place the file as `./config/google-service-account.json`

### Image Settings
- **MAX_IMAGE_SIZE**: Maximum file size in bytes (5MB = 5242880)
- **ALLOWED_IMAGE_TYPES**: Comma-separated list of allowed MIME types
- **MAX_IMAGES_PER_CAR**: Maximum number of images per car

## Production Alternative

For production deployments, you can use base64 encoded credentials instead:

```env
GCS_CREDENTIALS=base64-encoded-service-account-json
```

To encode your JSON file:
```bash
base64 -i config/google-service-account.json
```

## Complete .env file example:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/car_rental_db?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
PORT=3001
NODE_ENV=development

# Google Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=car-rental-images-your-unique-id
GCS_KEY_FILENAME=./config/google-service-account.json

# Image Settings
MAX_IMAGE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
MAX_IMAGES_PER_CAR=10
``` 