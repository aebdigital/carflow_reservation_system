const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  // Tenant separation
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  // Basic blog information
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxLength: [200, 'Title cannot exceed 200 characters']
  },
  titleEn: {
    type: String,
    trim: true,
    maxLength: [200, 'English title cannot exceed 200 characters']
  },
  titleHu: {
    type: String,
    trim: true,
    maxLength: [200, 'Hungarian title cannot exceed 200 characters']
  },

  slug: {
    type: String,
    required: [true, 'Blog slug is required'],
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  slugEn: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'English slug can only contain lowercase letters, numbers, and hyphens']
  },
  slugHu: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Hungarian slug can only contain lowercase letters, numbers, and hyphens']
  },

  excerpt: {
    type: String,
    required: [true, 'Blog excerpt is required'],
    trim: true,
    maxLength: [500, 'Excerpt cannot exceed 500 characters']
  },
  excerptEn: {
    type: String,
    trim: true,
    maxLength: [500, 'English excerpt cannot exceed 500 characters']
  },
  excerptHu: {
    type: String,
    trim: true,
    maxLength: [500, 'Hungarian excerpt cannot exceed 500 characters']
  },

  content: {
    type: String,
    required: [true, 'Blog content is required']
  },
  contentEn: {
    type: String
  },
  contentHu: {
    type: String
  },
  
  // Featured image
  featuredImage: {
    url: String,
    filename: String,
    alt: String,
    caption: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Additional images in content
  images: [{
    url: String,
    filename: String,
    alt: String,
    caption: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Blog metadata
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  category: {
    type: String,
    required: [true, 'Blog category is required'],
    enum: [
      'company-news',      // Firemné novinky
      'car-tips',          // Tipy pre vodičov
      'travel-guides',     // Cestovné sprievodcovia
      'maintenance',       // Údržba vozidiel
      'industry-news',     // Novinky z odvetvia
      'promotions',        // Akcie a zľavy
      'customer-stories',  // Príbehy zákazníkov
      'general'            // Všeobecné
    ]
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Publishing settings
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  
  publishDate: {
    type: Date,
    default: Date.now
  },
  
  scheduledPublishDate: {
    type: Date
  },
  
  // SEO settings
  seo: {
    metaTitle: {
      type: String,
      maxLength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
      type: String,
      maxLength: [160, 'Meta description cannot exceed 160 characters']
    },
    keywords: [{
      type: String,
      trim: true
    }],
    canonicalUrl: String,
    noIndex: {
      type: Boolean,
      default: false
    }
  },
  
  // Social media settings
  socialMedia: {
    ogTitle: String,
    ogDescription: String,
    ogImage: {
      url: String,
      alt: String
    },
    twitterTitle: String,
    twitterDescription: String,
    twitterImage: {
      url: String,
      alt: String
    }
  },
  
  // Reading and engagement metrics
  readingTime: {
    type: Number, // in minutes
    default: 0
  },
  
  views: {
    type: Number,
    default: 0
  },
  
  likes: {
    type: Number,
    default: 0
  },
  
  // Comments (if enabled)
  commentsEnabled: {
    type: Boolean,
    default: true
  },
  
  comments: [{
    author: {
      name: String,
      email: String,
      website: String
    },
    content: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog.comments'
    }
  }],
  
  // Related blogs
  relatedBlogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog'
  }],
  
  // Analytics and tracking
  analytics: {
    clickTrackingEnabled: {
      type: Boolean,
      default: true
    },
    conversionGoals: [{
      name: String,
      url: String,
      description: String
    }]
  },
  
  // Creator and editor tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Content versioning
  version: {
    type: Number,
    default: 1
  },
  
  previousVersions: [{
    content: String,
    title: String,
    excerpt: String,
    modifiedAt: Date,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeNote: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better performance
blogSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
blogSchema.index({ tenantId: 1, status: 1, publishDate: -1 });
blogSchema.index({ tenantId: 1, category: 1, status: 1 });
blogSchema.index({ tenantId: 1, tags: 1, status: 1 });
blogSchema.index({ tenantId: 1, createdAt: -1 });

// Virtual for full URL
blogSchema.virtual('url').get(function() {
  return `/blog/${this.slug}`;
});

// Virtual for reading time calculation
blogSchema.virtual('estimatedReadingTime').get(function() {
  if (!this.content) return 0;
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Virtual for comment count
blogSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.filter(comment => comment.status === 'approved').length : 0;
});

// Pre-save middleware
blogSchema.pre('save', function(next) {
  // Auto-calculate reading time
  if (this.content) {
    this.readingTime = this.estimatedReadingTime;
  }
  
  // Auto-generate slug from title if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  // Set SEO defaults if not provided
  if (!this.seo.metaTitle) {
    this.seo.metaTitle = this.title.substring(0, 60);
  }
  
  if (!this.seo.metaDescription) {
    this.seo.metaDescription = this.excerpt.substring(0, 160);
  }
  
  // Set social media defaults
  if (!this.socialMedia.ogTitle) {
    this.socialMedia.ogTitle = this.title;
  }
  
  if (!this.socialMedia.ogDescription) {
    this.socialMedia.ogDescription = this.excerpt;
  }
  
  if (!this.socialMedia.ogImage && this.featuredImage) {
    this.socialMedia.ogImage = {
      url: this.featuredImage.url,
      alt: this.featuredImage.alt
    };
  }
  
  next();
});

// Methods
blogSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

blogSchema.methods.incrementLikes = function() {
  this.likes += 1;
  return this.save();
};

blogSchema.methods.addComment = function(commentData) {
  this.comments.push(commentData);
  return this.save();
};

blogSchema.methods.isPublished = function() {
  return this.status === 'published' && 
         this.publishDate <= new Date();
};

blogSchema.methods.canBeViewedBy = function(user) {
  if (this.isPublished()) return true;
  if (!user) return false;
  
  // Author can always view their own blogs
  if (this.author.toString() === user._id.toString()) return true;
  
  // Staff can view all blogs in their tenant
  if (user.role === 'admin' || user.role === 'staff') {
    return this.tenantId.toString() === user.tenantId.toString();
  }
  
  return false;
};

// Static methods
blogSchema.statics.getPublishedBlogs = function(tenantId, options = {}) {
  const query = {
    tenantId,
    status: 'published',
    publishDate: { $lte: new Date() }
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }
  
  return this.find(query)
    .populate('author', 'firstName lastName')
    .sort({ publishDate: -1 })
    .limit(options.limit || 10)
    .skip(options.skip || 0);
};

blogSchema.statics.searchBlogs = function(tenantId, searchTerm, options = {}) {
  const query = {
    tenantId,
    status: 'published',
    publishDate: { $lte: new Date() },
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { excerpt: { $regex: searchTerm, $options: 'i' } },
      { content: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  return this.find(query)
    .populate('author', 'firstName lastName')
    .sort({ publishDate: -1 })
    .limit(options.limit || 10)
    .skip(options.skip || 0);
};

module.exports = mongoose.model('Blog', blogSchema); 