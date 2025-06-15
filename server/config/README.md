# Configuration Files

## Google Cloud Service Account

**IMPORTANT:** Place your Google Cloud service account JSON file here as:
```
google-service-account.json
```

### How to get this file:
1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Click on your `car-rental-storage` service account
3. Go to "Keys" tab → "ADD KEY" → "Create new key"
4. Choose JSON format → CREATE
5. **Save the downloaded file as `google-service-account.json` in this folder**

### Security:
- This file is already in .gitignore and will NOT be committed to version control
- Never share this file publicly
- For production, use environment variables instead

### Environment Variables:
Add these to your `.env` file:
```env
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=car-rental-images-your-unique-id
GCS_KEY_FILENAME=./config/google-service-account.json
``` 