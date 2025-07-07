# CarFlow Blog API Documentation

## Overview
The CarFlow Blog API provides public access to blog content for car rental companies. This API enables websites to display blog posts, manage comments, and track engagement without requiring authentication. All endpoints are tenant-specific and use the user's email to identify the company.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`

## Authentication
No authentication required for public blog endpoints.

## Response Format
All responses follow this standard format:
```json
{
  "success": true|false,
  "data": {}, // Response data
  "count": 0, // For list endpoints
  "total": 0, // Total number of items
  "pagination": {}, // For paginated endpoints
  "message": "Success/Error message"
}
```

## Blog Endpoints

### 1. Get Public Blogs
**GET** `/users/:email/blogs`

Returns published blog posts for a specific tenant with filtering and pagination.

**Parameters:**
- `email` (string, required): User's email to identify tenant

**Query Parameters:**
- `category` (string, optional): Filter by blog category
- `tags` (string[], optional): Filter by blog tags (comma-separated)
- `search` (string, optional): Search in title, excerpt, content, and tags
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Number of blogs per page (default: 10)
- `sort` (string, optional): Sort order (default: '-publishDate')

**Available Categories:**
- `company-news` - Firemné novinky
- `car-tips` - Tipy pre vodičov
- `travel-guides` - Cestovné sprievodcovia
- `maintenance` - Údržba vozidiel
- `industry-news` - Novinky z odvetvia
- `promotions` - Akcie a zľavy
- `customer-stories` - Príbehy zákazníkov
- `general` - Všeobecné

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs?category=car-tips&limit=5"
```

**Example Response:**
```json
{
  "success": true,
  "count": 3,
  "total": 15,
  "pagination": {
    "next": {
      "page": 2,
      "limit": 5
    }
  },
  "data": [
    {
      "_id": "64f5b8c2e1234567890abcde",
      "title": "Zimné pneumatiky: Kedy ich vymeníť?",
      "slug": "zimne-pneumatiky-kedy-ich-vymenit",
      "excerpt": "Kompletný sprievodca výmenou pneumatík na zimu. Zistite, kedy je ideálny čas na výmenu.",
      "featuredImage": {
        "url": "https://storage.googleapis.com/carflow-images/blogs/winter-tires.jpg",
        "alt": "Zimné pneumatiky na aute"
      },
      "category": "car-tips",
      "tags": ["pneumatiky", "zima", "bezpečnosť"],
      "publishDate": "2024-01-15T10:00:00.000Z",
      "readingTime": 5,
      "views": 1250,
      "likes": 45,
      "author": {
        "_id": "64f5b8c2e1234567890abcdf",
        "firstName": "Peter",
        "lastName": "Novák"
      },
      "seo": {
        "metaTitle": "Zimné pneumatiky: Kedy ich vymeníť? | Rival Car Rental",
        "metaDescription": "Kompletný sprievodca výmenou pneumatík na zimu. Zistite, kedy je ideálny čas na výmenu a ako si vybrať správne pneumatiky."
      },
      "socialMedia": {
        "ogTitle": "Zimné pneumatiky: Kedy ich vymeníť?",
        "ogDescription": "Kompletný sprievodca výmenou pneumatík na zimu."
      }
    }
  ]
}
```

### 2. Get Single Blog Post
**GET** `/users/:email/blogs/:slug`

Get a specific blog post by its URL slug.

**Parameters:**
- `email` (string, required): User's email to identify tenant
- `slug` (string, required): Blog post URL slug

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs/zimne-pneumatiky-kedy-ich-vymenit"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64f5b8c2e1234567890abcde",
    "title": "Zimné pneumatiky: Kedy ich vymeníť?",
    "slug": "zimne-pneumatiky-kedy-ich-vymenit",
    "excerpt": "Kompletný sprievodca výmenou pneumatík na zimu.",
    "content": "<h2>Úvod</h2><p>Zimné pneumatiky sú kľúčové pre bezpečnú jazdu...</p>",
    "featuredImage": {
      "url": "https://storage.googleapis.com/carflow-images/blogs/winter-tires.jpg",
      "alt": "Zimné pneumatiky na aute",
      "caption": "Kvalitné zimné pneumatiky pre bezpečnú jazdu"
    },
    "category": "car-tips",
    "tags": ["pneumatiky", "zima", "bezpečnosť"],
    "publishDate": "2024-01-15T10:00:00.000Z",
    "readingTime": 5,
    "views": 1251,
    "likes": 45,
    "author": {
      "_id": "64f5b8c2e1234567890abcdf",
      "firstName": "Peter",
      "lastName": "Novák"
    },
    "relatedBlogs": [
      {
        "_id": "64f5b8c2e1234567890abce0",
        "title": "Letné pneumatiky: Sprievodca výberom",
        "slug": "letne-pneumatiky-sprievodca-vyberom",
        "excerpt": "Ako si vybrať správne letné pneumatiky.",
        "featuredImage": {
          "url": "https://storage.googleapis.com/carflow-images/blogs/summer-tires.jpg",
          "alt": "Letné pneumatiky"
        },
        "publishDate": "2024-01-10T09:00:00.000Z",
        "readingTime": 4
      }
    ],
    "comments": [
      {
        "_id": "64f5b8c2e1234567890abce1",
        "author": {
          "name": "Mária Svobodová",
          "email": "maria@example.com"
        },
        "content": "Veľmi užitočný článok! Ďakujem za rady.",
        "createdAt": "2024-01-16T14:30:00.000Z"
      }
    ],
    "seo": {
      "metaTitle": "Zimné pneumatiky: Kedy ich vymeníť? | Rival Car Rental",
      "metaDescription": "Kompletný sprievodca výmenou pneumatík na zimu. Zistite, kedy je ideálny čas na výmenu a ako si vybrať správne pneumatiky.",
      "keywords": ["zimné pneumatiky", "výmena pneumatík", "bezpečnosť"],
      "canonicalUrl": "https://rival.carflow.sk/blog/zimne-pneumatiky-kedy-ich-vymenit"
    },
    "socialMedia": {
      "ogTitle": "Zimné pneumatiky: Kedy ich vymeníť?",
      "ogDescription": "Kompletný sprievodca výmenou pneumatík na zimu.",
      "ogImage": "https://storage.googleapis.com/carflow-images/blogs/winter-tires-og.jpg",
      "twitterTitle": "Zimné pneumatiky: Kedy ich vymeníť?",
      "twitterDescription": "Kompletný sprievodca výmenou pneumatík na zimu.",
      "twitterImage": "https://storage.googleapis.com/carflow-images/blogs/winter-tires-twitter.jpg"
    }
  }
}
```

### 3. Get Blog Categories
**GET** `/users/:email/blog-categories`

Get available blog categories with post counts for a specific tenant.

**Parameters:**
- `email` (string, required): User's email to identify tenant

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blog-categories"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "value": "car-tips",
      "label": "Tipy pre vodičov",
      "count": 12,
      "latestPost": "2024-01-15T10:00:00.000Z"
    },
    {
      "value": "company-news",
      "label": "Firemné novinky",
      "count": 8,
      "latestPost": "2024-01-12T15:30:00.000Z"
    },
    {
      "value": "promotions",
      "label": "Akcie a zľavy",
      "count": 6,
      "latestPost": "2024-01-10T11:00:00.000Z"
    },
    {
      "value": "travel-guides",
      "label": "Cestovné sprievodcovia",
      "count": 5,
      "latestPost": "2024-01-08T09:15:00.000Z"
    }
  ]
}
```

### 4. Get Blog Tags
**GET** `/users/:email/blog-tags`

Get popular blog tags with usage counts for a specific tenant.

**Parameters:**
- `email` (string, required): User's email to identify tenant

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blog-tags"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "pneumatiky",
      "count": 8
    },
    {
      "name": "bezpečnosť",
      "count": 6
    },
    {
      "name": "údržba",
      "count": 5
    },
    {
      "name": "zima",
      "count": 4
    },
    {
      "name": "cestovanie",
      "count": 3
    }
  ]
}
```

### 5. Like Blog Post
**POST** `/users/:email/blogs/:slug/like`

Increment the like count for a specific blog post.

**Parameters:**
- `email` (string, required): User's email to identify tenant
- `slug` (string, required): Blog post URL slug

**Example Request:**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs/zimne-pneumatiky-kedy-ich-vymenit/like"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "likes": 46
  },
  "message": "Blog liked successfully"
}
```

### 6. Add Blog Comment
**POST** `/users/:email/blogs/:slug/comments`

Add a comment to a blog post (requires approval).

**Parameters:**
- `email` (string, required): User's email to identify tenant
- `slug` (string, required): Blog post URL slug

**Request Body:**
```json
{
  "name": "Mária Svobodová",
  "email": "maria@example.com",
  "website": "https://maria-blog.sk",
  "content": "Veľmi užitočný článok! Ďakujem za rady.",
  "parentComment": null
}
```

**Request Body Parameters:**
- `name` (string, required): Commenter's name
- `email` (string, required): Commenter's email
- `website` (string, optional): Commenter's website
- `content` (string, required): Comment content
- `parentComment` (string, optional): Parent comment ID for replies

**Example Request:**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs/zimne-pneumatiky-kedy-ich-vymenit/comments" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mária Svobodová",
    "email": "maria@example.com",
    "content": "Veľmi užitočný článok! Ďakujem za rady."
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Comment submitted successfully. It will be reviewed before publication."
}
```

## Integration Examples

### JavaScript Integration

#### Basic Blog Fetching
```javascript
// Fetch latest blog posts
async function getLatestBlogs() {
  try {
    const response = await fetch(
      'https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs?limit=5'
    );
    const data = await response.json();
    
    if (data.success) {
      displayBlogs(data.data);
    }
  } catch (error) {
    console.error('Error fetching blogs:', error);
  }
}

// Display blogs on website
function displayBlogs(blogs) {
  const blogContainer = document.getElementById('blog-posts');
  
  blogs.forEach(blog => {
    const blogElement = document.createElement('article');
    blogElement.className = 'blog-post';
    blogElement.innerHTML = `
      <div class="blog-image">
        <img src="${blog.featuredImage?.url}" alt="${blog.featuredImage?.alt}" loading="lazy" />
      </div>
      <div class="blog-content">
        <div class="blog-meta">
          <span class="category">${getCategoryLabel(blog.category)}</span>
          <span class="date">${new Date(blog.publishDate).toLocaleDateString('sk-SK')}</span>
        </div>
        <h3><a href="/blog/${blog.slug}">${blog.title}</a></h3>
        <p class="blog-excerpt">${blog.excerpt}</p>
        <div class="blog-footer">
          <div class="author">
            <span>By ${blog.author.firstName} ${blog.author.lastName}</span>
            <span class="reading-time">${blog.readingTime} min read</span>
          </div>
          <div class="blog-stats">
            <span class="views">👁 ${blog.views}</span>
            <span class="likes">👍 ${blog.likes}</span>
          </div>
        </div>
        <div class="blog-tags">
          ${blog.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
        </div>
      </div>
    `;
    
    blogContainer.appendChild(blogElement);
  });
}

// Get single blog post
async function getBlogPost(slug) {
  try {
    const response = await fetch(
      `https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs/${slug}`
    );
    const data = await response.json();
    
    if (data.success) {
      displayBlogPost(data.data);
      updatePageSEO(data.data);
    }
  } catch (error) {
    console.error('Error fetching blog post:', error);
  }
}

// Like a blog post
async function likeBlogPost(slug) {
  try {
    const response = await fetch(
      `https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs/${slug}/like`,
      { method: 'POST' }
    );
    const data = await response.json();
    
    if (data.success) {
      document.querySelector('.like-count').textContent = data.data.likes;
      document.querySelector('.like-button').classList.add('liked');
    }
  } catch (error) {
    console.error('Error liking blog post:', error);
  }
}

// Submit comment
async function submitComment(slug, commentData) {
  try {
    const response = await fetch(
      `https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs/${slug}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commentData)
      }
    );
    const data = await response.json();
    
    if (data.success) {
      showSuccessMessage('Comment submitted successfully! It will be reviewed before publication.');
      document.getElementById('comment-form').reset();
    }
  } catch (error) {
    console.error('Error submitting comment:', error);
    showErrorMessage('Error submitting comment. Please try again.');
  }
}

// Fetch categories for filtering
async function getBlogCategories() {
  try {
    const response = await fetch(
      'https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blog-categories'
    );
    const data = await response.json();
    
    if (data.success) {
      populateCategoryFilter(data.data);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
}

// Search blogs
async function searchBlogs(query, category = '', page = 1) {
  try {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    if (category) params.append('category', category);
    params.append('page', page);
    params.append('limit', '9');

    const response = await fetch(
      `https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs?${params}`
    );
    const data = await response.json();
    
    if (data.success) {
      displaySearchResults(data.data, data.pagination);
    }
  } catch (error) {
    console.error('Error searching blogs:', error);
  }
}
```

#### Advanced Blog Features
```javascript
// Blog search with debouncing
function setupBlogSearch() {
  const searchInput = document.getElementById('blog-search');
  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchBlogs(e.target.value);
    }, 300);
  });
}

// Infinite scroll for blog listing
function setupInfiniteScroll() {
  let page = 1;
  let loading = false;

  window.addEventListener('scroll', async () => {
    if (loading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      loading = true;
      page++;
      
      try {
        const response = await fetch(
          `https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs?page=${page}&limit=6`
        );
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
          appendBlogs(data.data);
        }
      } catch (error) {
        console.error('Error loading more blogs:', error);
      } finally {
        loading = false;
      }
    }
  });
}

// Update page SEO for single blog post
function updatePageSEO(blog) {
  // Update title
  document.title = blog.seo.metaTitle;
  
  // Update meta description
  updateMetaTag('description', blog.seo.metaDescription);
  
  // Update keywords
  updateMetaTag('keywords', blog.seo.keywords.join(', '));
  
  // Update canonical URL
  updateLinkTag('canonical', blog.seo.canonicalUrl);
  
  // Update Open Graph tags
  updateMetaProperty('og:title', blog.socialMedia.ogTitle);
  updateMetaProperty('og:description', blog.socialMedia.ogDescription);
  updateMetaProperty('og:image', blog.socialMedia.ogImage);
  updateMetaProperty('og:url', window.location.href);
  
  // Update Twitter Card tags
  updateMetaName('twitter:title', blog.socialMedia.twitterTitle);
  updateMetaName('twitter:description', blog.socialMedia.twitterDescription);
  updateMetaName('twitter:image', blog.socialMedia.twitterImage);
}

function updateMetaTag(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function updateMetaProperty(property, content) {
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.content = content;
}
```

### React Integration

```jsx
import React, { useState, useEffect } from 'react';

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    page: 1
  });

  useEffect(() => {
    fetchBlogs();
    fetchCategories();
  }, [filters]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page);
      params.append('limit', '6');

      const response = await fetch(
        `https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs?${params}`
      );
      const data = await response.json();

      if (data.success) {
        setBlogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        'https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blog-categories'
      );
      const data = await response.json();

      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleLike = async (slug) => {
    try {
      const response = await fetch(
        `https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/blogs/${slug}/like`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.success) {
        setBlogs(prev => prev.map(blog => 
          blog.slug === slug 
            ? { ...blog, likes: data.data.likes }
            : blog
        ));
      }
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handleCategoryFilter = (category) => {
    setFilters(prev => ({ ...prev, category, page: 1 }));
  };

  if (loading) return (
    <div className="blog-loading">
      <div className="spinner">Loading blogs...</div>
    </div>
  );

  return (
    <div className="blog-section">
      <div className="blog-header">
        <h2>Latest Blog Posts</h2>
        <p>Discover tips, guides, and news about car rentals and travel</p>
      </div>

      <div className="blog-filters">
        <input
          type="text"
          placeholder="Search blogs..."
          value={filters.search}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={filters.category}
          onChange={(e) => handleCategoryFilter(e.target.value)}
          className="category-filter"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.value} value={category.value}>
              {category.label} ({category.count})
            </option>
          ))}
        </select>
      </div>

      <div className="blog-grid">
        {blogs.map(blog => (
          <BlogCard 
            key={blog._id} 
            blog={blog} 
            onLike={() => handleLike(blog.slug)} 
          />
        ))}
      </div>
    </div>
  );
};

const BlogCard = ({ blog, onLike }) => {
  return (
    <article className="blog-card">
      {blog.featuredImage && (
        <div className="blog-image">
          <img 
            src={blog.featuredImage.url} 
            alt={blog.featuredImage.alt}
            loading="lazy"
          />
          <div className="blog-category">
            {getCategoryLabel(blog.category)}
          </div>
        </div>
      )}
      <div className="blog-content">
        <div className="blog-meta">
          <span className="date">
            {new Date(blog.publishDate).toLocaleDateString('sk-SK')}
          </span>
          <span className="reading-time">{blog.readingTime} min read</span>
        </div>
        <h3>
          <a href={`/blog/${blog.slug}`}>{blog.title}</a>
        </h3>
        <p className="blog-excerpt">{blog.excerpt}</p>
        <div className="blog-tags">
          {blog.tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag">#{tag}</span>
          ))}
        </div>
        <div className="blog-footer">
          <div className="author">
            <span>By {blog.author.firstName} {blog.author.lastName}</span>
          </div>
          <div className="blog-actions">
            <button onClick={onLike} className="like-button">
              👍 {blog.likes}
            </button>
            <span className="views">👁 {blog.views}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

// Helper function to get category labels
function getCategoryLabel(categoryValue) {
  const categoryMap = {
    'company-news': 'Firemné novinky',
    'car-tips': 'Tipy pre vodičov',
    'travel-guides': 'Cestovné sprievodcovia',
    'maintenance': 'Údržba vozidiel',
    'industry-news': 'Novinky z odvetvia',
    'promotions': 'Akcie a zľavy',
    'customer-stories': 'Príbehy zákazníkov',
    'general': 'Všeobecné'
  };
  return categoryMap[categoryValue] || categoryValue;
}

export default BlogList;
```

## SEO Integration

### HTML Meta Tags
```html
<!-- Basic SEO Meta Tags -->
<title>{{ blog.seo.metaTitle }}</title>
<meta name="description" content="{{ blog.seo.metaDescription }}" />
<meta name="keywords" content="{{ blog.seo.keywords.join(', ') }}" />
<link rel="canonical" href="{{ blog.seo.canonicalUrl }}" />

<!-- Open Graph Meta Tags -->
<meta property="og:title" content="{{ blog.socialMedia.ogTitle }}" />
<meta property="og:description" content="{{ blog.socialMedia.ogDescription }}" />
<meta property="og:image" content="{{ blog.socialMedia.ogImage }}" />
<meta property="og:url" content="https://rival.carflow.sk/blog/{{ blog.slug }}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Rival Car Rental" />

<!-- Twitter Card Meta Tags -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{{ blog.socialMedia.twitterTitle }}" />
<meta name="twitter:description" content="{{ blog.socialMedia.twitterDescription }}" />
<meta name="twitter:image" content="{{ blog.socialMedia.twitterImage }}" />

<!-- Article Meta Tags -->
<meta property="article:author" content="{{ blog.author.firstName }} {{ blog.author.lastName }}" />
<meta property="article:published_time" content="{{ blog.publishDate }}" />
<meta property="article:section" content="{{ blog.category }}" />
{{#each blog.tags}}
<meta property="article:tag" content="{{ this }}" />
{{/each}}

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{{ blog.title }}",
  "description": "{{ blog.excerpt }}",
  "image": "{{ blog.featuredImage.url }}",
  "datePublished": "{{ blog.publishDate }}",
  "author": {
    "@type": "Person",
    "name": "{{ blog.author.firstName }} {{ blog.author.lastName }}"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Rival Car Rental",
    "logo": {
      "@type": "ImageObject",
      "url": "https://rival.carflow.sk/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "{{ blog.seo.canonicalUrl }}"
  }
}
</script>
```

## Error Handling

### Common HTTP Status Codes
- `200` - Success
- `404` - Blog post not found
- `400` - Invalid request parameters
- `500` - Server error

### Error Response Format
```json
{
  "success": false,
  "message": "Blog post not found",
  "error": {
    "code": "BLOG_NOT_FOUND",
    "details": "No blog post found with slug: invalid-slug"
  }
}
```

## Rate Limiting
- Public endpoints are rate-limited to prevent abuse
- Limit: 100 requests per minute per IP address
- When limit exceeded, returns HTTP 429 with retry information

## Best Practices

### Performance
- Use pagination for blog listings
- Implement caching for frequently accessed posts
- Lazy load images in blog cards
- Use debouncing for search functionality

### SEO
- Always use the provided SEO metadata
- Implement proper URL structure: `/blog/{slug}`
- Add structured data (JSON-LD)
- Use semantic HTML elements

### User Experience
- Show loading states during API calls
- Handle errors gracefully
- Implement search and filtering
- Provide related posts suggestions

## Support
For technical support or API questions, please contact our development team or refer to the main CarFlow documentation.

---

*This blog system enables rental companies to create engaging content that drives traffic, improves SEO, and builds customer relationships through valuable automotive and travel content.* 