const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const sharp = require('sharp');

class CloudStorageService {
  constructor() {
    this.isConfigured = false;
    this.storage = null;
    this.bucket = null;
    this.bucketName = null;

    try {
      // Check if Google Cloud Storage is configured
      if (!process.env.GCS_PROJECT_ID || !process.env.GCS_BUCKET_NAME) {
        console.warn('⚠️  Google Cloud Storage not configured. Image uploads will be disabled.');
        console.warn('   Add GCS_PROJECT_ID and GCS_BUCKET_NAME to your .env file');
        return;
      }

      // Initialize Google Cloud Storage
      const credentials = process.env.GCS_CREDENTIALS 
        ? JSON.parse(Buffer.from(process.env.GCS_CREDENTIALS, 'base64').toString())
        : process.env.GCS_KEY_FILENAME
          ? require(path.resolve(process.env.GCS_KEY_FILENAME))
          : undefined;

      this.storage = new Storage({
        projectId: process.env.GCS_PROJECT_ID,
        keyFilename: process.env.GCS_KEY_FILENAME,
        credentials: credentials
      });

      this.bucketName = process.env.GCS_BUCKET_NAME;
      this.bucket = this.storage.bucket(this.bucketName);
      this.isConfigured = true;

      console.log('✅ Google Cloud Storage configured successfully');
    } catch (error) {
      console.warn('⚠️  Google Cloud Storage configuration failed:', error.message);
      console.warn('   Server will continue without image upload functionality');
      console.warn('   Follow the setup guide in server/config/README.md');
    }

    // Image processing settings
    this.imageSettings = {
      maxSize: parseInt(process.env.MAX_IMAGE_SIZE) || 5242880, // 5MB
      allowedTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
      maxImagesPerCar: parseInt(process.env.MAX_IMAGES_PER_CAR) || 10,
      quality: 85,
      sizes: {
        thumbnail: { width: 300, height: 200 },
        medium: { width: 800, height: 600 },
        large: { width: 1200, height: 900 }
      }
    };
  }

  /**
   * Check if Google Cloud Storage is properly configured
   */
  checkConfiguration() {
    if (!this.isConfigured) {
      throw new Error('Google Cloud Storage is not configured. Please set up your credentials and environment variables.');
    }
  }

  /**
   * Upload and process car image
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} originalName - Original filename
   * @param {string} carId - Car ID for folder organization
   * @param {string} description - Image description
   * @returns {Promise<Object>} Upload result with URLs
   */
  async uploadCarImage(fileBuffer, originalName, carId, description = '') {
    this.checkConfiguration();

    try {
      // Validate file type
      const fileType = await this.getFileType(fileBuffer);
      if (!this.imageSettings.allowedTypes.includes(fileType)) {
        throw new Error(`Invalid file type. Allowed types: ${this.imageSettings.allowedTypes.join(', ')}`);
      }

      // Validate file size
      if (fileBuffer.length > this.imageSettings.maxSize) {
        throw new Error(`File too large. Maximum size: ${this.imageSettings.maxSize / 1024 / 1024}MB`);
      }

      // Generate unique filename
      const fileExtension = path.extname(originalName).toLowerCase();
      const baseFileName = `${uuidv4()}${fileExtension}`;
      const folderPath = `cars/${carId}`;

      // Process and upload different sizes
      const uploadPromises = await this.processAndUploadSizes(
        fileBuffer, 
        folderPath, 
        baseFileName
      );

      const results = await Promise.all(uploadPromises);
      
      // Return structured result
      return {
        filename: baseFileName,
        description: description,
        urls: {
          thumbnail: results[0].url,
          medium: results[1].url,
          large: results[2].url,
          original: results[3].url
        },
        uploadDate: new Date()
      };

    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Process image into different sizes and upload
   */
  async processAndUploadSizes(fileBuffer, folderPath, baseFileName) {
    const name = path.parse(baseFileName).name;
    const ext = path.parse(baseFileName).ext;

    const promises = [];

    // Thumbnail
    const thumbnailBuffer = await sharp(fileBuffer)
      .resize(this.imageSettings.sizes.thumbnail.width, this.imageSettings.sizes.thumbnail.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: this.imageSettings.quality })
      .toBuffer();
    
    promises.push(this.uploadToGCS(
      thumbnailBuffer, 
      `${folderPath}/${name}_thumbnail${ext}`,
      'image/jpeg'
    ));

    // Medium
    const mediumBuffer = await sharp(fileBuffer)
      .resize(this.imageSettings.sizes.medium.width, this.imageSettings.sizes.medium.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: this.imageSettings.quality })
      .toBuffer();
    
    promises.push(this.uploadToGCS(
      mediumBuffer, 
      `${folderPath}/${name}_medium${ext}`,
      'image/jpeg'
    ));

    // Large
    const largeBuffer = await sharp(fileBuffer)
      .resize(this.imageSettings.sizes.large.width, this.imageSettings.sizes.large.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: this.imageSettings.quality })
      .toBuffer();
    
    promises.push(this.uploadToGCS(
      largeBuffer, 
      `${folderPath}/${name}_large${ext}`,
      'image/jpeg'
    ));

    // Original (compressed)
    const originalBuffer = await sharp(fileBuffer)
      .jpeg({ quality: this.imageSettings.quality })
      .toBuffer();
    
    promises.push(this.uploadToGCS(
      originalBuffer, 
      `${folderPath}/${baseFileName}`,
      'image/jpeg'
    ));

    return promises;
  }

  /**
   * Upload buffer to Google Cloud Storage
   */
  async uploadToGCS(buffer, fileName, contentType) {
    const file = this.bucket.file(fileName);
    
    await file.save(buffer, {
      metadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000' // Cache for 1 year
      },
      public: true // Make file publicly accessible
    });

    // Return public URL
    return {
      url: `https://storage.googleapis.com/${this.bucketName}/${fileName}`,
      fileName: fileName
    };
  }

  /**
   * Delete car images from storage
   * @param {string} carId - Car ID
   * @param {string} filename - Specific filename to delete (optional)
   */
  async deleteCarImages(carId, filename = null) {
    this.checkConfiguration();

    try {
      const folderPath = `cars/${carId}/`;
      
      if (filename) {
        // Delete specific file and its variants
        const name = path.parse(filename).name;
        const ext = path.parse(filename).ext;
        
        const filesToDelete = [
          `${folderPath}${name}_thumbnail${ext}`,
          `${folderPath}${name}_medium${ext}`,
          `${folderPath}${name}_large${ext}`,
          `${folderPath}${filename}`
        ];

        await Promise.all(
          filesToDelete.map(file => 
            this.bucket.file(file).delete().catch(() => {
              // Ignore errors for non-existent files
            })
          )
        );
      } else {
        // Delete entire car folder
        const [files] = await this.bucket.getFiles({ prefix: folderPath });
        await Promise.all(files.map(file => file.delete()));
      }

      return { success: true, message: 'Images deleted successfully' };
    } catch (error) {
      console.error('Error deleting images:', error);
      throw new Error(`Failed to delete images: ${error.message}`);
    }
  }

  /**
   * Get file type from buffer
   */
  async getFileType(buffer) {
    // Simple file type detection based on magic numbers
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'image/png';
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      // Could be WebP, need to check further
      if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return 'image/webp';
      }
    }
    
    throw new Error('Unsupported file type');
  }

  /**
   * Test connection to Google Cloud Storage
   */
  async testConnection() {
    if (!this.isConfigured) {
      return { success: false, message: 'Google Cloud Storage is not configured' };
    }

    try {
      await this.bucket.exists();
      return { success: true, message: 'Connected to Google Cloud Storage successfully' };
    } catch (error) {
      return { success: false, message: `Failed to connect to GCS: ${error.message}` };
    }
  }
}

module.exports = new CloudStorageService(); 