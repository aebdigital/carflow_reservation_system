const Blog = require('../models/Blog');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const cloudStorage = require('../services/cloudStorage');

// ADMIN BLOG MANAGEMENT ENDPOINTS

// @desc    Get all blogs for tenant (admin)
// @route   GET /api/blogs
// @access  Private/Staff
const getBlogs = asyncHandler(async (req, res, next) => {
  // Start with tenant filter
  const baseQuery = { tenantId: req.user.tenantId };

  // Copy req.query and merge with tenant filter
  const reqQuery = { ...req.query };

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify({ ...baseQuery, ...reqQuery });

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource with tenant filter
  let query = Blog.find(JSON.parse(queryStr));

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Blog.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Populate references
  query = query.populate('author', 'firstName lastName email')
               .populate('createdBy', 'firstName lastName email')
               .populate('lastModifiedBy', 'firstName lastName email')
               .populate('relatedBlogs', 'title slug');

  // Execute query
  const blogs = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: blogs.length,
    pagination,
    data: blogs
  });
});

// @desc    Get single blog (admin)
// @route   GET /api/blogs/:id
// @access  Private/Staff
const getBlog = asyncHandler(async (req, res, next) => {
  const blog = await Blog.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  }).populate('author', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName email')
    .populate('lastModifiedBy', 'firstName lastName email')
    .populate('relatedBlogs', 'title slug featuredImage')
    .populate('comments.author');

  if (!blog) {
    return next(new AppError(`Blog not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: blog
  });
});

// @desc    Create new blog (admin)
// @route   POST /api/blogs
// @access  Private/Staff
const createBlog = asyncHandler(async (req, res, next) => {
  try {
    console.log('📝 [BLOG CREATE] Starting blog creation process...');
    console.log('📝 [BLOG CREATE] Request body:', JSON.stringify(req.body, null, 2));
    console.log('📝 [BLOG CREATE] User info:', {
      id: req.user._id,
      tenantId: req.user.tenantId,
      email: req.user.email
    });

    // Add tenant information to blog data
    const blogData = { 
      ...req.body,
      tenantId: req.user.tenantId,
      author: req.user._id,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id
    };

    // Initialize nested objects if not provided
    if (!blogData.seo) blogData.seo = {};
    if (!blogData.socialMedia) blogData.socialMedia = {};
    if (!blogData.analytics) blogData.analytics = {};

    console.log('📝 [BLOG CREATE] Final blog data to save:', JSON.stringify(blogData, null, 2));

    const blog = await Blog.create(blogData);

    console.log('📝 [BLOG CREATE] Blog created successfully! ID:', blog._id);
    console.log('📝 [BLOG CREATE] ======= SAVED BLOG DATA =======');
    console.log('📝 [BLOG CREATE] What was saved in MongoDB:');
    console.log(JSON.stringify(blog.toObject(), null, 2));
    console.log('📝 [BLOG CREATE] ================================');

    // Populate the created blog
    const populatedBlog = await Blog.findById(blog._id)
      .populate('author', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    console.log('📝 [BLOG CREATE] Populated blog for response:', populatedBlog ? 'Success' : 'Failed');

    res.status(201).json({
      success: true,
      data: populatedBlog,
      message: 'Blog created successfully'
    });
  } catch (error) {
    console.error('📝 [BLOG CREATE] Error caught:', error.name);
    console.error('📝 [BLOG CREATE] Error message:', error.message);
    console.error('📝 [BLOG CREATE] Error code:', error.code);
    console.error('📝 [BLOG CREATE] Full error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return next(new AppError(`${field} '${value}' already exists. Please use a different value.`, 400));
    }
    
    if (error.name === 'ValidationError') {
      // Validation error - extract meaningful message
      const errors = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation failed: ${errors.join(', ')}`, 400));
    }
    
    // Log the error for debugging but don't expose details to user
    console.error('Blog creation error:', error);
    return next(new AppError('Failed to create blog. Please check your input and try again.', 400));
  }
});

// @desc    Update blog (admin)
// @route   PUT /api/blogs/:id
// @access  Private/Staff
const updateBlog = asyncHandler(async (req, res, next) => {
  const existingBlog = await Blog.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!existingBlog) {
    return next(new AppError(`Blog not found with id of ${req.params.id}`, 404));
  }

  // Save previous version before updating
  if (req.body.content && req.body.content !== existingBlog.content) {
    const previousVersion = {
      content: existingBlog.content,
      title: existingBlog.title,
      excerpt: existingBlog.excerpt,
      modifiedAt: new Date(),
      modifiedBy: req.user._id,
      changeNote: req.body.changeNote || 'Content updated'
    };

    existingBlog.previousVersions.push(previousVersion);
    existingBlog.version += 1;
  }

  const updateData = {
    ...req.body,
    lastModifiedBy: req.user._id,
    version: existingBlog.version
  };

  // If featuredImage is explicitly null, unset it
  if (req.body.featuredImage === null) {
    await Blog.findByIdAndUpdate(req.params.id, { $unset: { featuredImage: 1 } });
    delete updateData.featuredImage;
  }

  const blog = await Blog.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('author', 'firstName lastName email')
   .populate('lastModifiedBy', 'firstName lastName email');

  res.status(200).json({
    success: true,
    data: blog,
    message: 'Blog updated successfully'
  });
});

// @desc    Delete blog (admin)
// @route   DELETE /api/blogs/:id
// @access  Private/Staff
const deleteBlog = asyncHandler(async (req, res, next) => {
  const blog = await Blog.findOneAndDelete({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!blog) {
    return next(new AppError(`Blog not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {},
    message: 'Blog deleted successfully'
  });
});

// @desc    Upload blog image (admin)
// @route   POST /api/blogs/:id/upload-image
// @access  Private/Staff
const uploadBlogImageHandler = asyncHandler(async (req, res, next) => {
  try {
    console.log('🖼️ [BLOG IMAGE] Starting image upload process...');
    console.log('🖼️ [BLOG IMAGE] Blog ID:', req.params.id);
    console.log('🖼️ [BLOG IMAGE] User:', req.user.email);
    console.log('🖼️ [BLOG IMAGE] Request body:', req.body);
    console.log('🖼️ [BLOG IMAGE] File info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    const blog = await Blog.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    });

    if (!blog) {
      console.log('🖼️ [BLOG IMAGE] Blog not found');
      return next(new AppError(`Blog not found with id of ${req.params.id}`, 404));
    }

    if (!req.file) {
      console.log('🖼️ [BLOG IMAGE] No file provided');
      return next(new AppError('Please upload an image file', 400));
    }

    console.log('🖼️ [BLOG IMAGE] Uploading to Google Cloud...');

    // Upload image to cloud storage
    const uploadResult = await cloudStorage.uploadBlogImage(
      req.file.buffer,
      req.file.originalname,
      req.user,
      req.body.alt || req.body.description || ''
    );

    console.log('🖼️ [BLOG IMAGE] Upload successful! Result:', uploadResult);

    const imageData = {
      url: uploadResult.urls.large, // Use large size for featured images, medium for content
      filename: uploadResult.filename,
      alt: req.body.alt || '',
      caption: req.body.caption || '',
      uploadDate: new Date()
    };

    console.log('🖼️ [BLOG IMAGE] Image data to save:', imageData);

    // Determine if this is featured image or additional image
    if (req.body.isFeatured === 'true') {
      console.log('🖼️ [BLOG IMAGE] Setting as featured image');
      blog.featuredImage = imageData;
    } else {
      console.log('🖼️ [BLOG IMAGE] Adding to images array');
      blog.images.push(imageData);
    }

    await blog.save();

    console.log('🖼️ [BLOG IMAGE] Blog updated with image data');

    res.status(200).json({
      success: true,
      data: {
        ...imageData,
        urls: uploadResult.urls // Return all sizes for flexibility
      },
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('🖼️ [BLOG IMAGE] Error during image upload:', error);
    console.error('🖼️ [BLOG IMAGE] Error name:', error.name);
    console.error('🖼️ [BLOG IMAGE] Error message:', error.message);
    
    if (error.message.includes('Failed to upload')) {
      return next(new AppError('Failed to upload image to cloud storage. Please try again.', 500));
    }
    
    return next(new AppError('Image upload failed. Please check your image and try again.', 400));
  }
});

// @desc    Publish/unpublish blog (admin)
// @route   PATCH /api/blogs/:id/publish
// @access  Private/Staff
const toggleBlogStatus = asyncHandler(async (req, res, next) => {
  const blog = await Blog.findOne({ 
    _id: req.params.id, 
    tenantId: req.user.tenantId 
  });

  if (!blog) {
    return next(new AppError(`Blog not found with id of ${req.params.id}`, 404));
  }

  const { status, publishDate } = req.body;

  const updateData = {
    status: status || (blog.status === 'published' ? 'draft' : 'published'),
    lastModifiedBy: req.user._id
  };

  if (status === 'published' && publishDate) {
    updateData.publishDate = new Date(publishDate);
  } else if (status === 'published' && !blog.publishDate) {
    updateData.publishDate = new Date();
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  ).populate('author', 'firstName lastName email');

  res.status(200).json({
    success: true,
    data: updatedBlog,
    message: `Blog ${updateData.status === 'published' ? 'published' : 'unpublished'} successfully`
  });
});

// PUBLIC BLOG ENDPOINTS

// @desc    Get published blogs for website (public)
// @route   GET /api/public/users/:email/blogs
// @access  Public
const getPublicBlogsByUser = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  
  // Get tenant ID from user email
  const User = require('../models/User');
  const user = await User.findOne({ email: userEmail.toLowerCase() });
  if (!user) {
    return next(new AppError(`User not found with email: ${userEmail}`, 404));
  }
  
  const tenantId = user.tenantId;

  // Parse query parameters
  const {
    category,
    tags,
    search,
    page = 1,
    limit = 10,
    sort = '-publishDate'
  } = req.query;

  let query = {
    tenantId,
    status: 'published',
    publishDate: { $lte: new Date() }
  };

  // Apply filters
  if (category) {
    query.category = category;
  }

  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : tags.split(',');
    query.tags = { $in: tagArray };
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }

  // Execute query
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const total = await Blog.countDocuments(query);

  const blogs = await Blog.find(query)
    .populate('author', 'firstName lastName')
    .select('title titleEn titleHu slug slugEn slugHu excerpt excerptEn featuredImage category tags publishDate readingTime views likes author seo socialMedia')
    .sort(sort)
    .skip(startIndex)
    .limit(parseInt(limit));

  // Pagination
  const pagination = {};
  if (startIndex + parseInt(limit) < total) {
    pagination.next = { page: parseInt(page) + 1, limit: parseInt(limit) };
  }
  if (startIndex > 0) {
    pagination.prev = { page: parseInt(page) - 1, limit: parseInt(limit) };
  }

  res.status(200).json({
    success: true,
    count: blogs.length,
    total,
    pagination,
    data: blogs
  });
});

// @desc    Get single published blog by slug (public)
// @route   GET /api/public/users/:email/blogs/:slug
// @access  Public
const getPublicBlogBySlug = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  const slug = req.params.slug;
  
  // Get tenant ID from user email
  const User = require('../models/User');
  const user = await User.findOne({ email: userEmail.toLowerCase() });
  if (!user) {
    return next(new AppError(`User not found with email: ${userEmail}`, 404));
  }
  
  const tenantId = user.tenantId;

  const blog = await Blog.findOne({
    tenantId,
    slug,
    status: 'published',
    publishDate: { $lte: new Date() }
  })
  .populate('author', 'firstName lastName')
  .populate('relatedBlogs', 'title slug excerpt featuredImage publishDate readingTime')
  .populate({
    path: 'comments',
    match: { status: 'approved' },
    select: 'author content createdAt'
  });

  if (!blog) {
    return next(new AppError('Blog post not found', 404));
  }

  // Increment view count (but don't wait for it)
  blog.incrementViews().catch(err => console.error('Error incrementing views:', err));

  res.status(200).json({
    success: true,
    data: blog
  });
});

// @desc    Get blog categories for tenant (public)
// @route   GET /api/public/users/:email/blog-categories
// @access  Public
const getBlogCategories = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  
  // Get tenant ID from user email
  const User = require('../models/User');
  const user = await User.findOne({ email: userEmail.toLowerCase() });
  if (!user) {
    return next(new AppError(`User not found with email: ${userEmail}`, 404));
  }
  
  const tenantId = user.tenantId;

  // Get categories with blog count
  const categories = await Blog.aggregate([
    {
      $match: {
        tenantId: tenantId,
        status: 'published',
        publishDate: { $lte: new Date() }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        latestPost: { $max: '$publishDate' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  // Add display names for categories
  const categoryLabels = {
    'company-news': 'Firemné novinky',
    'car-tips': 'Tipy pre vodičov',
    'travel-guides': 'Cestovné sprievodcovia',
    'maintenance': 'Údržba vozidiel',
    'industry-news': 'Novinky z odvetvia',
    'promotions': 'Akcie a zľavy',
    'customer-stories': 'Príbehy zákazníkov',
    'general': 'Všeobecné'
  };

  const formattedCategories = categories.map(cat => ({
    value: cat._id,
    label: categoryLabels[cat._id] || cat._id,
    count: cat.count,
    latestPost: cat.latestPost
  }));

  res.status(200).json({
    success: true,
    data: formattedCategories
  });
});

// @desc    Get popular blog tags (public)
// @route   GET /api/public/users/:email/blog-tags
// @access  Public
const getBlogTags = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  
  // Get tenant ID from user email
  const User = require('../models/User');
  const user = await User.findOne({ email: userEmail.toLowerCase() });
  if (!user) {
    return next(new AppError(`User not found with email: ${userEmail}`, 404));
  }
  
  const tenantId = user.tenantId;

  const tags = await Blog.aggregate([
    {
      $match: {
        tenantId: tenantId,
        status: 'published',
        publishDate: { $lte: new Date() }
      }
    },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  res.status(200).json({
    success: true,
    data: tags.map(tag => ({
      name: tag._id,
      count: tag.count
    }))
  });
});

// @desc    Like a blog post (public)
// @route   POST /api/public/users/:email/blogs/:slug/like
// @access  Public
const likeBlog = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  const slug = req.params.slug;
  
  // Get tenant ID from user email
  const User = require('../models/User');
  const user = await User.findOne({ email: userEmail.toLowerCase() });
  if (!user) {
    return next(new AppError(`User not found with email: ${userEmail}`, 404));
  }
  
  const tenantId = user.tenantId;

  const blog = await Blog.findOne({
    tenantId,
    slug,
    status: 'published',
    publishDate: { $lte: new Date() }
  });

  if (!blog) {
    return next(new AppError('Blog post not found', 404));
  }

  await blog.incrementLikes();

  res.status(200).json({
    success: true,
    data: {
      likes: blog.likes
    },
    message: 'Blog liked successfully'
  });
});

// @desc    Add comment to blog (public)
// @route   POST /api/public/users/:email/blogs/:slug/comments
// @access  Public
const addBlogComment = asyncHandler(async (req, res, next) => {
  const userEmail = req.params.email;
  const slug = req.params.slug;
  const { name, email, website, content, parentComment } = req.body;
  
  if (!name || !email || !content) {
    return next(new AppError('Name, email, and content are required', 400));
  }

  // Get tenant ID from user email
  const User = require('../models/User');
  const user = await User.findOne({ email: userEmail.toLowerCase() });
  if (!user) {
    return next(new AppError(`User not found with email: ${userEmail}`, 404));
  }
  
  const tenantId = user.tenantId;

  const blog = await Blog.findOne({
    tenantId,
    slug,
    status: 'published',
    publishDate: { $lte: new Date() },
    commentsEnabled: true
  });

  if (!blog) {
    return next(new AppError('Blog post not found or comments disabled', 404));
  }

  const commentData = {
    author: { name, email, website },
    content,
    parentComment: parentComment || null,
    status: 'pending' // Comments need approval
  };

  await blog.addComment(commentData);

  res.status(201).json({
    success: true,
    message: 'Comment submitted successfully. It will be reviewed before publication.'
  });
});

// @desc    Update blog Hungarian translations
// @route   PUT /api/blogs/:id/hungarian
// @access  Private/Staff
const updateBlogHungarian = asyncHandler(async (req, res, next) => {
  const { titleHu, slugHu, contentHu } = req.body;

  const blog = await Blog.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });

  if (!blog) {
    return next(new AppError(`Blog not found with id of ${req.params.id}`, 404));
  }

  const updateData = { lastModifiedBy: req.user._id };

  if (titleHu !== undefined) updateData.titleHu = titleHu;
  if (slugHu !== undefined) updateData.slugHu = slugHu;
  if (contentHu !== undefined) updateData.contentHu = contentHu;

  const updatedBlog = await Blog.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('author', 'firstName lastName email')
   .populate('lastModifiedBy', 'firstName lastName email');

  res.status(200).json({
    success: true,
    data: updatedBlog,
    message: 'Blog Hungarian translations updated successfully'
  });
});

// @desc    Update blog English translations
// @route   PUT /api/blogs/:id/english
// @access  Private/Staff
const updateBlogEnglish = asyncHandler(async (req, res, next) => {
  const { titleEn, slugEn, excerptEn, contentEn } = req.body;

  const blog = await Blog.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });

  if (!blog) {
    return next(new AppError(`Blog not found with id of ${req.params.id}`, 404));
  }

  // Update English fields
  const updateData = {
    lastModifiedBy: req.user._id
  };

  if (titleEn !== undefined) updateData.titleEn = titleEn;
  if (slugEn !== undefined) updateData.slugEn = slugEn;
  if (excerptEn !== undefined) updateData.excerptEn = excerptEn;
  if (contentEn !== undefined) updateData.contentEn = contentEn;

  const updatedBlog = await Blog.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('author', 'firstName lastName email')
   .populate('lastModifiedBy', 'firstName lastName email');

  res.status(200).json({
    success: true,
    data: updatedBlog,
    message: 'Blog English translations updated successfully'
  });
});

module.exports = {
  // Admin endpoints
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  uploadBlogImageHandler,
  toggleBlogStatus,
  updateBlogEnglish,
  updateBlogHungarian,

  // Public endpoints
  getPublicBlogsByUser,
  getPublicBlogBySlug,
  getBlogCategories,
  getBlogTags,
  likeBlog,
  addBlogComment
}; 