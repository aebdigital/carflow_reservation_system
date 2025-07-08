# CarFlow Public API Integration Guide

## Overview
This documentation provides complete integration guide for connecting external frontend applications to the CarFlow reservation system. All examples use `admin@example.com` as the reference tenant for demonstration purposes.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`

## Authentication
Most public endpoints require no authentication, but use tenant identification through:
- **User Email**: For user-specific endpoints (`/users/:email/...`)
- **Tenant ID**: Via `x-tenant-id` header for direct tenant access

## Standard Response Format
```json
{
  "success": true|false,
  "data": [], // Response data
  "count": 0, // Number of items (for lists)
  "message": "Success/Error message"
}
```

## Core Public APIs

### 1. Website Settings & Configuration

#### Get Website Settings
**GET** `/users/:email/website-settings`

Retrieve complete website configuration including info bar, modal settings, and styling.

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/website-settings"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "infoBar": {
      "isEnabled": true,
      "text": "🚗 Special offer: 20% off weekend rentals! Book now!",
      "backgroundColor": "#1976d2",
      "textColor": "#ffffff",
      "fontSize": "14px",
      "isCloseable": true,
      "link": {
        "url": "https://example.com/weekend-special",
        "text": "Learn More"
      }
    },
    "modal": {
      "isEnabled": true,
      "title": "Welcome to Premium Car Rental!",
      "content": "Discover our exclusive fleet and premium services.",
      "showOnLoad": true,
      "showDelay": 3000,
      "backgroundColor": "#ffffff",
      "textColor": "#333333",
      "buttonColor": "#1976d2",
      "buttonText": "Explore Fleet"
    },
    "styling": {
      "primaryColor": "#1976d2",
      "secondaryColor": "#dc004e",
      "accentColor": "#ff9800",
      "successColor": "#4caf50",
      "warningColor": "#ff9800",
      "errorColor": "#f44336",
      "fontFamily": "Roboto, Arial, sans-serif"
    }
  }
}
```

#### Get Info Bar Settings
**GET** `/users/:email/info-bar`

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/info-bar"
```

#### Get Modal Settings
**GET** `/users/:email/modal`

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/modal"
```

### 2. Banner Management

#### Get All Active Banners
**GET** `/users/:email/banners`

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/banners"
```

**Example Response:**
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "_id": "64f5b8c2e1234567890abcde",
      "image": {
        "url": "https://storage.googleapis.com/carflow-images/banners/hero-main.jpg",
        "filename": "hero-main.jpg",
        "alt": "Main hero banner"
      },
      "position": "hero-section",
      "isActive": true,
      "sortOrder": 0
    },
    {
      "_id": "64f5b8c2e1234567890abce1",
      "image": {
        "url": "https://storage.googleapis.com/carflow-images/banners/carousel-1.jpg",
        "filename": "carousel-1.jpg",
        "alt": "Carousel promotion banner"
      },
      "position": "homepage-carousel-1",
      "isActive": true,
      "sortOrder": 0
    }
  ]
}
```

#### Get Banners by Position
**GET** `/users/:email/banners?position=:position`

Available positions:
- `hero-section`
- `homepage-carousel-1`
- `homepage-carousel-2`

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/banners?position=hero-section"
```

### 3. Blog System

#### Get All Published Blogs
**GET** `/users/:email/blogs`

**Query Parameters:**
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page (default: 10)
- `category` (optional): Filter by category
- `featured` (optional): Show only featured posts

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/blogs?page=1&limit=5"
```

**Example Response:**
```json
{
  "success": true,
  "count": 5,
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 23,
    "pages": 5,
    "next": 2
  },
  "data": [
    {
      "_id": "64f5b8c2e1234567890abcde",
      "title": "Top 10 Tips for Safe Car Rental",
      "slug": "top-10-tips-safe-car-rental",
      "excerpt": "Essential safety tips every car rental customer should know...",
      "content": "Full blog content here...",
      "author": "Admin User",
      "category": "safety-tips",
      "tags": ["safety", "tips", "rental"],
      "featured": true,
      "featuredImage": {
        "url": "https://storage.googleapis.com/carflow-images/blogs/safety-tips.jpg",
        "alt": "Car safety tips"
      },
      "seo": {
        "title": "Top 10 Car Rental Safety Tips | Premium Rentals",
        "description": "Discover essential safety tips for car rentals...",
        "keywords": ["car rental", "safety", "tips"]
      },
      "publishedAt": "2024-01-15T10:00:00.000Z",
      "viewCount": 156,
      "likesCount": 23,
      "commentsEnabled": true
    }
  ]
}
```

#### Get Single Blog Post
**GET** `/users/:email/blogs/:slug`

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/blogs/top-10-tips-safe-car-rental"
```

#### Get Blog Categories
**GET** `/users/:email/blogs/categories`

**Example Response:**
```json
{
  "success": true,
  "data": [
    { "value": "travel-tips", "label": "Cestovné tipy", "count": 12 },
    { "value": "car-maintenance", "label": "Údržba vozidiel", "count": 8 },
    { "value": "safety-tips", "label": "Bezpečnostné tipy", "count": 6 },
    { "value": "destinations", "label": "Destinácie", "count": 15 },
    { "value": "company-news", "label": "Firemné novinky", "count": 4 }
  ]
}
```

#### Like Blog Post
**POST** `/users/:email/blogs/:slug/like`

**Example Request:**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/blogs/top-10-tips-safe-car-rental/like"
```

#### Get Blog Comments
**GET** `/users/:email/blogs/:slug/comments`

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/blogs/top-10-tips-safe-car-rental/comments"
```

### 4. Discount Code Verification

#### Verify Discount Code
**GET** `/users/:email/verify-discount?code=:code&amount=:amount`

**Parameters:**
- `code`: Discount code to verify
- `amount`: Original amount for calculation

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/verify-discount?code=LETO10&amount=150"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "discount": {
      "_id": "64f5b8c2e1234567890abcde",
      "code": "LETO10",
      "type": "percentage",
      "value": 10,
      "description": "10% zľava na letné rezervácie"
    },
    "calculation": {
      "originalAmount": 150,
      "discountAmount": 15,
      "finalAmount": 135,
      "savings": 15,
      "currency": "EUR"
    },
    "message": "Zľavový kód je platný! Ušetríte 15.00€"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "data": {
    "isValid": false,
    "calculation": {
      "originalAmount": 150,
      "discountAmount": 0,
      "finalAmount": 150,
      "savings": 0,
      "currency": "EUR"
    },
    "message": "Zľavový kód neexistuje alebo nie je aktívny"
  }
}
```

### 5. Newsletter Subscription

#### Subscribe to Newsletter
**POST** `/users/:email/newsletter/subscribe`

**Request Body:**
```json
{
  "email": "customer@example.com",
  "name": "John Doe"
}
```

**Example Request:**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@example.com", "name": "John Doe"}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Úspešne ste sa prihlásili na odber noviniek!",
  "data": {
    "email": "customer@example.com",
    "subscribed": true,
    "subscribedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Frontend Integration Examples

### JavaScript/Vanilla JS Integration

```javascript
// CarFlow API Client
class CarFlowAPI {
  constructor(userEmail) {
    this.userEmail = userEmail;
    this.baseURL = 'https://carflow-reservation-system.onrender.com/api/public';
    this.cache = new Map();
  }

  // Generic API call method
  async apiCall(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'API call failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Website Settings
  async getWebsiteSettings() {
    return this.apiCall(`/users/${this.userEmail}/website-settings`);
  }

  async getInfoBar() {
    return this.apiCall(`/users/${this.userEmail}/info-bar`);
  }

  async getModal() {
    return this.apiCall(`/users/${this.userEmail}/modal`);
  }

  // Banners
  async getBanners(position = null) {
    const endpoint = position 
      ? `/users/${this.userEmail}/banners?position=${position}`
      : `/users/${this.userEmail}/banners`;
    return this.apiCall(endpoint);
  }

  // Blogs
  async getBlogs(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    if (options.category) params.append('category', options.category);
    if (options.featured) params.append('featured', 'true');
    
    const queryString = params.toString();
    const endpoint = `/users/${this.userEmail}/blogs${queryString ? '?' + queryString : ''}`;
    return this.apiCall(endpoint);
  }

  async getBlog(slug) {
    return this.apiCall(`/users/${this.userEmail}/blogs/${slug}`);
  }

  async getBlogCategories() {
    return this.apiCall(`/users/${this.userEmail}/blogs/categories`);
  }

  async likeBlog(slug) {
    return this.apiCall(`/users/${this.userEmail}/blogs/${slug}/like`, {
      method: 'POST'
    });
  }

  // Discount verification
  async verifyDiscount(code, amount) {
    return this.apiCall(`/users/${this.userEmail}/verify-discount?code=${code}&amount=${amount}`);
  }

  // Newsletter
  async subscribeNewsletter(email, name) {
    return this.apiCall(`/users/${this.userEmail}/newsletter/subscribe`, {
      method: 'POST',
      body: JSON.stringify({ email, name })
    });
  }
}

// Usage Example
const api = new CarFlowAPI('admin@example.com');

// Initialize website
async function initializeWebsite() {
  try {
    // Load website settings
    const settings = await api.getWebsiteSettings();
    applyWebsiteSettings(settings.data);
    
    // Load banners
    const banners = await api.getBanners();
    displayBanners(banners.data);
    
    // Load featured blogs
    const blogs = await api.getBlogs({ featured: true, limit: 3 });
    displayFeaturedBlogs(blogs.data);
    
  } catch (error) {
    console.error('Failed to initialize website:', error);
  }
}

// Apply website settings
function applyWebsiteSettings(settings) {
  // Apply styling
  if (settings.styling) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.styling.primaryColor);
    root.style.setProperty('--secondary-color', settings.styling.secondaryColor);
    root.style.setProperty('--font-family', settings.styling.fontFamily);
  }
  
  // Show info bar
  if (settings.infoBar?.isEnabled) {
    showInfoBar(settings.infoBar);
  }
  
  // Show modal
  if (settings.modal?.isEnabled && settings.modal?.showOnLoad) {
    setTimeout(() => {
      showModal(settings.modal);
    }, settings.modal.showDelay || 0);
  }
}

// Display banners
function displayBanners(banners) {
  const herobanners = banners.filter(b => b.position === 'hero-section');
  const carousel1 = banners.filter(b => b.position === 'homepage-carousel-1');
  const carousel2 = banners.filter(b => b.position === 'homepage-carousel-2');
  
  if (heroBanners.length > 0) {
    createHeroBanner(heroBanners);
  }
  
  if (carousel1.length > 0) {
    createCarousel('carousel-1', carousel1);
  }
  
  if (carousel2.length > 0) {
    createCarousel('carousel-2', carousel2);
  }
}

// Discount code verification
async function verifyDiscountCode() {
  const codeInput = document.getElementById('discount-code');
  const amountInput = document.getElementById('amount');
  const resultDiv = document.getElementById('discount-result');
  
  try {
    const result = await api.verifyDiscount(codeInput.value, amountInput.value);
    
    if (result.data.isValid) {
      resultDiv.innerHTML = `
        <div class="discount-success">
          <h4>✅ ${result.data.message}</h4>
          <p>Pôvodná cena: ${result.data.calculation.originalAmount}€</p>
          <p>Zľava: -${result.data.calculation.discountAmount}€</p>
          <p><strong>Finálna cena: ${result.data.calculation.finalAmount}€</strong></p>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="discount-error">
          <p>❌ ${result.data.message}</p>
        </div>
      `;
    }
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="discount-error">
        <p>❌ Chyba pri overovaní kódu</p>
      </div>
    `;
  }
}
```

### React Integration

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// API Context
const CarFlowAPIContext = createContext();

// API Provider
export const CarFlowAPIProvider = ({ userEmail, children }) => {
  const [api] = useState(() => new CarFlowAPI(userEmail));
  
  return (
    <CarFlowAPIContext.Provider value={api}>
      {children}
    </CarFlowAPIContext.Provider>
  );
};

// Custom hook for API access
export const useCarFlowAPI = () => {
  const context = useContext(CarFlowAPIContext);
  if (!context) {
    throw new Error('useCarFlowAPI must be used within CarFlowAPIProvider');
  }
  return context;
};

// Website Settings Hook
export const useWebsiteSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const api = useCarFlowAPI();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await api.getWebsiteSettings();
        setSettings(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [api]);

  return { settings, loading, error };
};

// Banners Hook
export const useBanners = (position = null) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const api = useCarFlowAPI();

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const result = await api.getBanners(position);
        setBanners(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBanners();
  }, [api, position]);

  return { banners, loading, error };
};

// Blogs Hook
export const useBlogs = (options = {}) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const api = useCarFlowAPI();

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        const result = await api.getBlogs(options);
        setBlogs(result.data);
        setPagination(result.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, [api, JSON.stringify(options)]);

  return { blogs, loading, error, pagination };
};

// Info Bar Component
export const InfoBar = () => {
  const { settings } = useWebsiteSettings();
  const [isVisible, setIsVisible] = useState(true);

  if (!settings?.infoBar?.isEnabled || !isVisible) {
    return null;
  }

  const { infoBar } = settings;

  return (
    <div
      style={{
        backgroundColor: infoBar.backgroundColor,
        color: infoBar.textColor,
        fontSize: infoBar.fontSize,
        padding: '8px 16px',
        textAlign: 'center',
        position: 'relative'
      }}
    >
      <span>{infoBar.text}</span>
      {infoBar.link && (
        <a
          href={infoBar.link.url}
          style={{ color: infoBar.textColor, marginLeft: '8px' }}
        >
          {infoBar.link.text}
        </a>
      )}
      {infoBar.isCloseable && (
        <button
          onClick={() => setIsVisible(false)}
          style={{
            position: 'absolute',
            right: '16px',
            background: 'none',
            border: 'none',
            color: infoBar.textColor,
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

// Hero Banner Component
export const HeroBanner = () => {
  const { banners, loading } = useBanners('hero-section');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  if (loading || banners.length === 0) {
    return null;
  }

  return (
    <div className="hero-banner">
      <div className="banner-container">
        {banners.map((banner, index) => (
          <div
            key={banner._id}
            className={`banner-slide ${index === currentIndex ? 'active' : ''}`}
          >
            <img
              src={banner.image.url}
              alt={banner.image.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
      
      {banners.length > 1 && (
        <div className="banner-indicators">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Blog List Component
export const BlogList = ({ category = null, featured = false }) => {
  const { blogs, loading, error } = useBlogs({ category, featured, limit: 6 });

  if (loading) {
    return <div className="loading">Loading blogs...</div>;
  }

  if (error) {
    return <div className="error">Failed to load blogs: {error}</div>;
  }

  return (
    <div className="blog-list">
      {blogs.map(blog => (
        <article key={blog._id} className="blog-card">
          {blog.featuredImage && (
            <img
              src={blog.featuredImage.url}
              alt={blog.featuredImage.alt}
              className="blog-image"
            />
          )}
          <div className="blog-content">
            <h3>{blog.title}</h3>
            <p>{blog.excerpt}</p>
            <div className="blog-meta">
              <span>By {blog.author}</span>
              <span>{new Date(blog.publishedAt).toLocaleDateString()}</span>
              <span>{blog.viewCount} views</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

// Discount Verification Component
export const DiscountVerifier = () => {
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const api = useCarFlowAPI();

  const handleVerify = async () => {
    if (!code || !amount) return;
    
    setLoading(true);
    try {
      const response = await api.verifyDiscount(code, amount);
      setResult(response.data);
    } catch (error) {
      setResult({
        isValid: false,
        message: 'Chyba pri overovaní kódu'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="discount-verifier">
      <div className="input-group">
        <input
          type="text"
          placeholder="Zľavový kód"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <input
          type="number"
          placeholder="Suma (€)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button onClick={handleVerify} disabled={loading}>
          {loading ? 'Overujem...' : 'Overiť'}
        </button>
      </div>
      
      {result && (
        <div className={`result ${result.isValid ? 'success' : 'error'}`}>
          <p>{result.message}</p>
          {result.isValid && result.calculation && (
            <div className="calculation">
              <p>Pôvodná cena: {result.calculation.originalAmount}€</p>
              <p>Zľava: -{result.calculation.discountAmount}€</p>
              <p><strong>Finálna cena: {result.calculation.finalAmount}€</strong></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main App Component
export const App = () => {
  return (
    <CarFlowAPIProvider userEmail="admin@example.com">
      <div className="app">
        <InfoBar />
        <HeroBanner />
        
        <main>
          <section className="featured-blogs">
            <h2>Featured Articles</h2>
            <BlogList featured={true} />
          </section>
          
          <section className="discount-section">
            <h2>Check Discount Code</h2>
            <DiscountVerifier />
          </section>
        </main>
      </div>
    </CarFlowAPIProvider>
  );
};
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Internal server error

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

## Rate Limiting
- **Limit**: 100 requests per minute per IP
- **Response**: HTTP 429 when exceeded
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Best Practices

### Performance Optimization
1. **Caching**: Implement client-side caching for settings and static content
2. **Image Optimization**: Use responsive images and lazy loading
3. **API Batching**: Combine multiple requests when possible
4. **Pagination**: Use pagination for large data sets

### Security Considerations
1. **Input Validation**: Always validate user inputs
2. **Rate Limiting**: Respect API rate limits
3. **Error Handling**: Handle errors gracefully
4. **HTTPS**: Always use HTTPS in production

### SEO Optimization
1. **Meta Tags**: Use blog SEO data for meta tags
2. **Structured Data**: Implement JSON-LD for blog posts
3. **Image Alt Text**: Use provided alt text for accessibility
4. **Loading Strategy**: Optimize image loading priorities

## Support & Resources

### Technical Support
- **Documentation**: This guide and individual API docs
- **Examples**: Complete integration examples provided
- **Error Codes**: Detailed error handling documentation

### Development Tools
- **Postman Collection**: Available upon request
- **TypeScript Definitions**: Available for better development experience
- **Testing Endpoints**: Sandbox environment available

---

*This integration guide enables complete frontend development using the CarFlow public API. All examples use `admin@example.com` as the reference tenant for easy testing and implementation.* 