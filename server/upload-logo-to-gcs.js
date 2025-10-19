/**
 * Upload Nitra-Car logo to Google Cloud Storage
 * Run: node upload-logo-to-gcs.js
 */

require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

async function uploadLogo() {
  try {
    console.log('🔧 Checking GCS configuration...');

    if (!process.env.GCS_PROJECT_ID || !process.env.GCS_BUCKET_NAME) {
      console.error('❌ GCS not configured. Set GCS_PROJECT_ID and GCS_BUCKET_NAME in .env');
      process.exit(1);
    }

    // Initialize Storage
    let storageConfig = {
      projectId: process.env.GCS_PROJECT_ID
    };

    if (process.env.GCS_KEY_FILENAME) {
      storageConfig.keyFilename = process.env.GCS_KEY_FILENAME;
    } else if (process.env.GCS_CREDENTIALS) {
      const credentials = JSON.parse(
        Buffer.from(process.env.GCS_CREDENTIALS, 'base64').toString()
      );
      storageConfig.credentials = credentials;
    }

    const storage = new Storage(storageConfig);
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

    // Upload optimized logo
    const logoPath = path.join(__dirname, 'templates_nitracar/email/nitracarlogo_optimized.png');

    if (!fs.existsSync(logoPath)) {
      console.error('❌ Logo file not found:', logoPath);
      process.exit(1);
    }

    console.log('📤 Uploading logo to GCS...');

    const destination = 'email-assets/nitracarlogo.png';
    await bucket.upload(logoPath, {
      destination: destination,
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
      public: true, // Make publicly accessible
    });

    // Make the file publicly accessible
    const file = bucket.file(destination);
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${destination}`;

    console.log('✅ Logo uploaded successfully!');
    console.log('📍 Public URL:', publicUrl);
    console.log('');
    console.log('🔧 Add this to your Render environment variables:');
    console.log(`NITRACAR_LOGO_URL=${publicUrl}`);

  } catch (error) {
    console.error('❌ Error uploading logo:', error.message);
    console.error(error);
    process.exit(1);
  }
}

uploadLogo();
