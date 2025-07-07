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
    this.connectionTested = false;

    try {
      // Check if Google Cloud Storage is configured
      console.log('🔧 Checking Google Cloud Storage configuration...');
      console.log('📋 Environment variables:');
      console.log('   GCS_PROJECT_ID:', process.env.GCS_PROJECT_ID ? '✅ Set' : '❌ Missing');
      console.log('   GCS_BUCKET_NAME:', process.env.GCS_BUCKET_NAME ? '✅ Set' : '❌ Missing');
      console.log('   GCS_CREDENTIALS:', process.env.GCS_CREDENTIALS ? '✅ Set' : '❌ Missing');
      console.log('   GCS_KEY_FILENAME:', process.env.GCS_KEY_FILENAME ? '✅ Set' : '❌ Missing');
      
      if (!process.env.GCS_PROJECT_ID || !process.env.GCS_BUCKET_NAME) {
        console.warn('⚠️  Google Cloud Storage not configured. Image uploads will be disabled.');
        console.warn('   Add GCS_PROJECT_ID and GCS_BUCKET_NAME to your environment variables');
        console.warn('   For Render deployment, also set GCS_CREDENTIALS=/etc/secrets/google-credentials.json');
        return;
      }

      // Initialize Google Cloud Storage
      let credentials = null;
      let storageConfig = {
        projectId: process.env.GCS_PROJECT_ID
      };

      // Handle different credential scenarios
      if (process.env.GCS_CREDENTIALS) {
        try {
          // For Render deployment with file mount at /etc/secrets/google-credentials.json
          if (process.env.GCS_CREDENTIALS === '/etc/secrets/google-credentials.json') {
            const fs = require('fs');
            if (fs.existsSync('/etc/secrets/google-credentials.json')) {
              console.log('📁 Loading GCS credentials from Render secrets file mount');
              storageConfig.keyFilename = '/etc/secrets/google-credentials.json';
            } else {
              throw new Error('GCS credentials file not found at /etc/secrets/google-credentials.json');
            }
          } else {
            // For other deployments with base64 encoded credentials
            console.log('🔐 Loading GCS credentials from base64 environment variable');
            credentials = JSON.parse(Buffer.from(process.env.GCS_CREDENTIALS, 'base64').toString());
            storageConfig.credentials = credentials;
          }
        } catch (error) {
          console.error('Failed to parse GCS_CREDENTIALS:', error.message);
          throw error;
        }
      } else if (process.env.GCS_KEY_FILENAME) {
        // For local development with key file
        console.log('📁 Loading GCS credentials from local key file');
        storageConfig.keyFilename = process.env.GCS_KEY_FILENAME;
        if (require('fs').existsSync(path.resolve(process.env.GCS_KEY_FILENAME))) {
          credentials = require(path.resolve(process.env.GCS_KEY_FILENAME));
        }
      } else {
        throw new Error('No GCS credentials configuration found. Set GCS_CREDENTIALS or GCS_KEY_FILENAME');
      }

      this.storage = new Storage(storageConfig);

      this.bucketName = process.env.GCS_BUCKET_NAME;
      this.bucket = this.storage.bucket(this.bucketName);
      this.isConfigured = true;

      console.log('✅ Google Cloud Storage initialized successfully');
      console.log('📁 GCS Bucket name:', this.bucketName);
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
  async checkConfiguration() {
    if (!this.isConfigured) {
      const errorMsg = 'Google Cloud Storage is not configured. Please set up your credentials and environment variables.';
      console.error('❌', errorMsg);
      console.error('📋 Required environment variables:');
      console.error('   - GCS_PROJECT_ID');
      console.error('   - GCS_BUCKET_NAME');
      console.error('   - GCS_CREDENTIALS (set to /etc/secrets/google-credentials.json for Render)');
      throw new Error(errorMsg);
    }

    // Test connection on first use
    if (!this.connectionTested) {
      console.log('🧪 Testing Google Cloud Storage connection...');
      try {
        const [exists] = await this.bucket.exists();
        if (!exists) {
          throw new Error(`Bucket '${this.bucketName}' does not exist`);
        }
        console.log('✅ Google Cloud Storage connection verified successfully');
        this.connectionTested = true;
      } catch (error) {
        console.error('❌ Google Cloud Storage connection test failed:', error.message);
        throw new Error(`GCS connection failed: ${error.message}`);
      }
    }
  }

  /**
   * Upload and process car image with tenant/user separation
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} originalName - Original filename
   * @param {string} carId - Car ID for folder organization
   * @param {Object} user - User object with tenantId and storageFolder
   * @param {string} description - Image description
   * @returns {Promise<Object>} Upload result with URLs
   */
  async uploadCarImage(fileBuffer, originalName, carId, user, description = '') {
    await this.checkConfiguration();

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
      
      // Use user-specific folder path for complete tenant separation
      const folderPath = `${user.storageFolder}/cars/${carId}`;

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
        uploadDate: new Date(),
        tenantId: user.tenantId,
        userId: user._id
      };

    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Upload general user file with tenant separation
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original filename
   * @param {Object} user - User object with tenantId and storageFolder
   * @param {string} subfolder - Subfolder within user's space (e.g., 'documents', 'profiles')
   * @returns {Promise<Object>} Upload result
   */
  async uploadUserFile(fileBuffer, originalName, user, subfolder = 'files') {
    await this.checkConfiguration();

    try {
      // Generate unique filename
      const fileExtension = path.extname(originalName).toLowerCase();
      const baseFileName = `${uuidv4()}${fileExtension}`;
      
      // Use user-specific folder path
      const folderPath = `${user.storageFolder}/${subfolder}`;
      const fileName = `${folderPath}/${baseFileName}`;

      // Upload to GCS
      const result = await this.uploadToGCS(fileBuffer, fileName, 'application/octet-stream');

      return {
        filename: baseFileName,
        originalName: originalName,
        url: result.url,
        uploadDate: new Date(),
        tenantId: user.tenantId,
        userId: user._id,
        folder: subfolder
      };

    } catch (error) {
      console.error('Error uploading user file:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
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
   * Delete car images from user-specific storage
   * @param {string} carId - Car ID
   * @param {Object} user - User object with storageFolder
   * @param {string} filename - Specific filename to delete (optional)
   */
  async deleteCarImages(carId, user, filename = null) {
    await this.checkConfiguration();

    try {
      const folderPath = `${user.storageFolder}/cars/${carId}/`;
      
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
        // Delete entire car folder within user's space
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
   * Delete all user files (for account deletion)
   * @param {Object} user - User object with storageFolder
   */
  async deleteUserFiles(user) {
    await this.checkConfiguration();

    try {
      const folderPath = `${user.storageFolder}/`;
      
      // Delete entire user folder
      const [files] = await this.bucket.getFiles({ prefix: folderPath });
      await Promise.all(files.map(file => file.delete()));

      return { success: true, message: 'All user files deleted successfully' };
    } catch (error) {
      console.error('Error deleting user files:', error);
      throw new Error(`Failed to delete user files: ${error.message}`);
    }
  }

  /**
   * List user files
   * @param {Object} user - User object with storageFolder
   * @param {string} subfolder - Specific subfolder to list (optional)
   */
  async listUserFiles(user, subfolder = '') {
    await this.checkConfiguration();

    try {
      const prefix = subfolder ? `${user.storageFolder}/${subfolder}/` : `${user.storageFolder}/`;
      const [files] = await this.bucket.getFiles({ prefix });
      
      return files.map(file => ({
        name: file.name,
        size: file.metadata.size,
        updated: file.metadata.updated,
        url: `https://storage.googleapis.com/${this.bucketName}/${file.name}`
      }));
    } catch (error) {
      console.error('Error listing user files:', error);
      throw new Error(`Failed to list user files: ${error.message}`);
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

  /**
   * Upload service image with tenant/user separation
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} originalName - Original filename
   * @param {Object} user - User object with tenantId and storageFolder
   * @param {string} description - Image description
   * @returns {Promise<Object>} Upload result with URLs
   */
  async uploadServiceImage(fileBuffer, originalName, user, description = '') {
    await this.checkConfiguration();

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
      
      // Use user-specific folder path for complete tenant separation
      const folderPath = `${user.storageFolder}/services`;

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
        uploadDate: new Date(),
        tenantId: user.tenantId,
        userId: user._id
      };

    } catch (error) {
      console.error('Error uploading service image:', error);
      throw new Error(`Failed to upload service image: ${error.message}`);
    }
  }

  /**
   * Delete service image from user-specific storage
   * @param {string} filename - Specific filename to delete
   * @param {Object} user - User object with storageFolder
   */
  async deleteServiceImage(filename, user) {
    await this.checkConfiguration();

    try {
      const folderPath = `${user.storageFolder}/services/`;
      
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

      return { success: true, message: 'Service image deleted successfully' };
    } catch (error) {
      console.error('Error deleting service image:', error);
      throw new Error(`Failed to delete service image: ${error.message}`);
    }
  }

  /**
   * Upload banner image with tenant/user separation
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} originalName - Original filename
   * @param {Object} user - User object with tenantId and storageFolder
   * @param {string} description - Image description/title
   * @returns {Promise<Object>} Upload result with URLs
   */
  async uploadBannerImage(fileBuffer, originalName, user, description = '') {
    await this.checkConfiguration();

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
      
      // Use user-specific folder path for complete tenant separation
      const folderPath = `${user.storageFolder}/banners`;

      // Process and upload different sizes (banners often need larger sizes)
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
        uploadDate: new Date(),
        tenantId: user.tenantId,
        userId: user._id
      };

    } catch (error) {
      console.error('Error uploading banner image:', error);
      throw new Error(`Failed to upload banner image: ${error.message}`);
    }
  }

  /**
   * Delete banner image from user-specific storage
   * @param {string} filename - Specific filename to delete
   * @param {Object} user - User object with storageFolder
   */
  async deleteBannerImage(filename, user) {
    await this.checkConfiguration();

    try {
      const folderPath = `${user.storageFolder}/banners/`;
      
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

      return { success: true, message: 'Banner image deleted successfully' };
    } catch (error) {
      console.error('Error deleting banner image:', error);
      throw new Error(`Failed to delete banner image: ${error.message}`);
    }
  }

  /**
   * Upload blog image with tenant/user separation
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} originalName - Original filename
   * @param {Object} user - User object with tenantId and storageFolder
   * @param {string} description - Image description/alt text
   * @returns {Promise<Object>} Upload result with URLs
   */
  async uploadBlogImage(fileBuffer, originalName, user, description = '') {
    await this.checkConfiguration();

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
      
      // Use user-specific folder path for complete tenant separation
      const folderPath = `${user.storageFolder}/blogs`;

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
        uploadDate: new Date(),
        tenantId: user.tenantId,
        userId: user._id
      };

    } catch (error) {
      console.error('Error uploading blog image:', error);
      throw new Error(`Failed to upload blog image: ${error.message}`);
    }
  }

  /**
   * Delete blog image from user-specific storage
   * @param {string} filename - Specific filename to delete
   * @param {Object} user - User object with storageFolder
   */
  async deleteBlogImage(filename, user) {
    await this.checkConfiguration();

    try {
      const folderPath = `${user.storageFolder}/blogs/`;
      
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

      return { success: true, message: 'Blog image deleted successfully' };
    } catch (error) {
      console.error('Error deleting blog image:', error);
      throw new Error(`Failed to delete blog image: ${error.message}`);
    }
  }
}

module.exports = new CloudStorageService(); 