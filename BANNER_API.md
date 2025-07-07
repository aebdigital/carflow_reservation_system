# CarFlow Banner API Documentation

## Overview
The CarFlow Banner API provides public access to banner content for car rental company websites. This API enables websites to display position-specific banners without requiring authentication. All endpoints are tenant-specific and use the user's email or tenant ID to identify the company.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`

## Authentication
No authentication required for public banner endpoints.

## Response Format
All responses follow this standard format:
```json
{
  "success": true|false,
  "data": [], // Response data
  "count": 0, // Number of items
  "message": "Success/Error message"
}
```

## Banner Positions
The banner system supports three strategic website positions:

- `hero-section` - Hero sekcia (Main hero section)
- `homepage-carousel-1` - HomePage Carousel 1 (First carousel section)
- `homepage-carousel-2` - HomePage Carousel 2 (Second carousel section)

## Banner Endpoints

### 1. Get Banners by Position
**GET** `/banners/position/:position`

Returns all active banners for a specific website position.

**Headers:**
- `x-tenant-id` (string, required): Tenant ID to filter banners

**Parameters:**
- `position` (string, required): Banner position identifier

**Available Positions:**
- `hero-section`
- `homepage-carousel-1` 
- `homepage-carousel-2`

**Example Request:**
```bash
curl -H "x-tenant-id: 64f5b8c2e1234567890abcde" \
  "https://carflow-reservation-system.onrender.com/api/public/banners/position/hero-section"
```

**Example Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64f5b8c2e1234567890abcde",
      "image": {
        "url": "https://storage.googleapis.com/carflow-images/banners/hero-banner-1.jpg",
        "filename": "hero-banner-1.jpg",
        "alt": "Banner image for hero-section",
        "uploadDate": "2024-01-15T10:00:00.000Z"
      },
      "position": "hero-section",
      "isActive": true,
      "sortOrder": 0,
      "tenantId": "64f5b8c2e1234567890abcde",
      "createdBy": {
        "_id": "64f5b8c2e1234567890abcdf",
        "name": "Peter Novák",
        "email": "peter@rival.sk"
      },
      "createdAt": "2024-01-15T09:30:00.000Z",
      "updatedAt": "2024-01-15T09:30:00.000Z"
    },
    {
      "_id": "64f5b8c2e1234567890abce0",
      "image": {
        "url": "https://storage.googleapis.com/carflow-images/banners/hero-banner-2.jpg",
        "filename": "hero-banner-2.jpg",
        "alt": "Banner image for hero-section",
        "uploadDate": "2024-01-14T15:30:00.000Z"
      },
      "position": "hero-section",
      "isActive": true,
      "sortOrder": 1,
      "tenantId": "64f5b8c2e1234567890abcde",
      "createdBy": {
        "_id": "64f5b8c2e1234567890abcdf",
        "name": "Peter Novák",
        "email": "peter@rival.sk"
      },
      "createdAt": "2024-01-14T15:00:00.000Z",
      "updatedAt": "2024-01-14T15:00:00.000Z"
    }
  ]
}
```

### 2. Get All Active Banners
**GET** `/banners/active`

Returns all active banners for a tenant, grouped by position.

**Headers:**
- `x-tenant-id` (string, required): Tenant ID to filter banners

**Example Request:**
```bash
curl -H "x-tenant-id: 64f5b8c2e1234567890abcde" \
  "https://carflow-reservation-system.onrender.com/api/public/banners/active"
```

**Example Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "64f5b8c2e1234567890abcde",
      "image": {
        "url": "https://storage.googleapis.com/carflow-images/banners/hero-banner-1.jpg",
        "filename": "hero-banner-1.jpg",
        "alt": "Banner image for hero-section"
      },
      "position": "hero-section",
      "isActive": true,
      "sortOrder": 0
    },
    {
      "_id": "64f5b8c2e1234567890abce1",
      "image": {
        "url": "https://storage.googleapis.com/carflow-images/banners/carousel-1-banner-1.jpg",
        "filename": "carousel-1-banner-1.jpg",
        "alt": "Banner image for homepage-carousel-1"
      },
      "position": "homepage-carousel-1",
      "isActive": true,
      "sortOrder": 0
    },
    {
      "_id": "64f5b8c2e1234567890abce2",
      "image": {
        "url": "https://storage.googleapis.com/carflow-images/banners/carousel-2-banner-1.jpg",
        "filename": "carousel-2-banner-1.jpg",
        "alt": "Banner image for homepage-carousel-2"
      },
      "position": "homepage-carousel-2",
      "isActive": true,
      "sortOrder": 0
    }
  ]
}
```

### 3. Get Banners by User Email
**GET** `/users/:email/banners`

Returns all active banners for a specific tenant identified by user email.

**Parameters:**
- `email` (string, required): User's email to identify tenant

**Query Parameters:**
- `position` (string, optional): Filter by specific position

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/banners"
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
        "alt": "Main hero banner for Rival Car Rental"
      },
      "position": "hero-section",
      "isActive": true,
      "sortOrder": 0
    }
  ]
}
```

### 4. Get Banners by User and Position
**GET** `/users/:email/banners?position=:position`

Returns banners for a specific position and tenant.

**Parameters:**
- `email` (string, required): User's email to identify tenant
- `position` (string, required): Banner position

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/banners?position=homepage-carousel-1"
```

**Example Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64f5b8c2e1234567890abce1",
      "image": {
        "url": "https://storage.googleapis.com/carflow-images/banners/carousel-promotion.jpg",
        "filename": "carousel-promotion.jpg",
        "alt": "Summer promotion banner"
      },
      "position": "homepage-carousel-1",
      "isActive": true,
      "sortOrder": 0
    },
    {
      "_id": "64f5b8c2e1234567890abce2",
      "image": {
        "url": "https://storage.googleapis.com/carflow-images/banners/carousel-features.jpg",
        "filename": "carousel-features.jpg",
        "alt": "Car features showcase banner"
      },
      "position": "homepage-carousel-1",
      "isActive": true,
      "sortOrder": 1
    }
  ]
}
```

## Integration Examples

### JavaScript Integration

#### Basic Banner Fetching
```javascript
// Fetch banners for hero section
async function getHeroBanners(tenantId) {
  try {
    const response = await fetch(
      'https://carflow-reservation-system.onrender.com/api/public/banners/position/hero-section',
      {
        headers: {
          'x-tenant-id': tenantId
        }
      }
    );
    const data = await response.json();
    
    if (data.success) {
      displayHeroBanners(data.data);
    }
  } catch (error) {
    console.error('Error fetching hero banners:', error);
  }
}

// Display hero banners
function displayHeroBanners(banners) {
  const heroSection = document.getElementById('hero-section');
  
  banners.forEach((banner, index) => {
    const bannerElement = document.createElement('div');
    bannerElement.className = `hero-banner ${index === 0 ? 'active' : ''}`;
    bannerElement.innerHTML = `
      <img 
        src="${banner.image.url}" 
        alt="${banner.image.alt}" 
        loading="${index === 0 ? 'eager' : 'lazy'}"
      />
    `;
    
    heroSection.appendChild(bannerElement);
  });
}

// Fetch all banners for homepage
async function getAllBanners(userEmail) {
  try {
    const response = await fetch(
      `https://carflow-reservation-system.onrender.com/api/public/users/${userEmail}/banners`
    );
    const data = await response.json();
    
    if (data.success) {
      organizeBannersByPosition(data.data);
    }
  } catch (error) {
    console.error('Error fetching banners:', error);
  }
}

// Organize banners by position
function organizeBannersByPosition(banners) {
  const bannerGroups = {
    'hero-section': [],
    'homepage-carousel-1': [],
    'homepage-carousel-2': []
  };
  
  banners.forEach(banner => {
    if (bannerGroups[banner.position]) {
      bannerGroups[banner.position].push(banner);
    }
  });
  
  // Display each group
  displayHeroBanners(bannerGroups['hero-section']);
  displayCarouselBanners(bannerGroups['homepage-carousel-1'], 'carousel-1');
  displayCarouselBanners(bannerGroups['homepage-carousel-2'], 'carousel-2');
}

// Display carousel banners
function displayCarouselBanners(banners, carouselId) {
  const carouselContainer = document.getElementById(carouselId);
  
  if (!carouselContainer || banners.length === 0) return;
  
  carouselContainer.innerHTML = '';
  
  banners.forEach((banner, index) => {
    const slide = document.createElement('div');
    slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
    slide.innerHTML = `
      <img 
        src="${banner.image.url}" 
        alt="${banner.image.alt}"
        loading="lazy"
      />
    `;
    
    carouselContainer.appendChild(slide);
  });
  
  // Initialize carousel functionality
  initializeCarousel(carouselId);
}

// Initialize carousel controls
function initializeCarousel(carouselId) {
  const carousel = document.getElementById(carouselId);
  const slides = carousel.querySelectorAll('.carousel-slide');
  let currentSlide = 0;
  
  if (slides.length <= 1) return;
  
  // Auto-rotate every 5 seconds
  setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }, 5000);
}
```

#### Advanced Banner Management
```javascript
// Banner loader with caching
class BannerLoader {
  constructor(userEmail, tenantId) {
    this.userEmail = userEmail;
    this.tenantId = tenantId;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  async getBanners(position = null, useCache = true) {
    const cacheKey = `banners-${position || 'all'}`;
    
    // Check cache first
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }
    
    try {
      let url;
      let headers = {};
      
      if (this.userEmail) {
        url = `https://carflow-reservation-system.onrender.com/api/public/users/${this.userEmail}/banners`;
        if (position) {
          url += `?position=${position}`;
        }
      } else if (this.tenantId) {
        url = position 
          ? `https://carflow-reservation-system.onrender.com/api/public/banners/position/${position}`
          : `https://carflow-reservation-system.onrender.com/api/public/banners/active`;
        headers['x-tenant-id'] = this.tenantId;
      }
      
      const response = await fetch(url, { headers });
      const data = await response.json();
      
      if (data.success) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: data.data,
          timestamp: Date.now()
        });
        
        return data.data;
      }
      
      throw new Error(data.message || 'Failed to fetch banners');
    } catch (error) {
      console.error('Error fetching banners:', error);
      return [];
    }
  }
  
  // Preload banner images
  async preloadBannerImages(banners) {
    const imagePromises = banners.map(banner => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = banner.image.url;
      });
    });
    
    try {
      await Promise.all(imagePromises);
      console.log('All banner images preloaded');
    } catch (error) {
      console.warn('Some banner images failed to preload:', error);
    }
  }
  
  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Usage example
const bannerLoader = new BannerLoader('rival@test.sk');

// Load and display all banners
async function initializeBanners() {
  const banners = await bannerLoader.getBanners();
  
  // Preload images for better performance
  await bannerLoader.preloadBannerImages(banners);
  
  // Organize by position
  const herobanners = banners.filter(b => b.position === 'hero-section');
  const carousel1Banners = banners.filter(b => b.position === 'homepage-carousel-1');
  const carousel2Banners = banners.filter(b => b.position === 'homepage-carousel-2');
  
  // Display banners
  displayHeroBanners(heroBanners);
  displayCarouselBanners(carousel1Banners, 'carousel-1');
  displayCarouselBanners(carousel2Banners, 'carousel-2');
}
```

### React Integration

```jsx
import React, { useState, useEffect, useCallback } from 'react';

// Custom hook for banner management
const useBanners = (userEmail, position = null) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `https://carflow-reservation-system.onrender.com/api/public/users/${userEmail}/banners`;
      if (position) {
        url += `?position=${position}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setBanners(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError(err.message);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [userEmail, position]);

  useEffect(() => {
    if (userEmail) {
      fetchBanners();
    }
  }, [fetchBanners, userEmail]);

  return { banners, loading, error, refetch: fetchBanners };
};

// Hero Banner Component
const HeroBanner = ({ userEmail }) => {
  const { banners, loading, error } = useBanners(userEmail, 'hero-section');
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  if (loading) {
    return (
      <div className="hero-banner-skeleton">
        <div className="skeleton-image"></div>
      </div>
    );
  }

  if (error) {
    console.warn('Failed to load hero banners:', error);
    return null;
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <section className="hero-banner">
      <div className="banner-container">
        {banners.map((banner, index) => (
          <div
            key={banner._id}
            className={`banner-slide ${index === currentBanner ? 'active' : ''}`}
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
              className={`indicator ${index === currentBanner ? 'active' : ''}`}
              onClick={() => setCurrentBanner(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

// Carousel Banner Component
const CarouselBanner = ({ userEmail, position, className = '' }) => {
  const { banners, loading, error } = useBanners(userEmail, position);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % banners.length);
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  if (loading || error || banners.length === 0) {
    return null;
  }

  return (
    <section className={`carousel-banner ${className}`}>
      <div className="carousel-container">
        <div 
          className="carousel-track"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {banners.map((banner) => (
            <div key={banner._id} className="carousel-slide">
              <img
                src={banner.image.url}
                alt={banner.image.alt}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
      
      {banners.length > 1 && (
        <>
          <button
            className="carousel-nav prev"
            onClick={() => setCurrentSlide(prev => 
              prev === 0 ? banners.length - 1 : prev - 1
            )}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            className="carousel-nav next"
            onClick={() => setCurrentSlide(prev => 
              (prev + 1) % banners.length
            )}
            aria-label="Next slide"
          >
            ›
          </button>
        </>
      )}
    </section>
  );
};

// Main Homepage Component
const Homepage = () => {
  const userEmail = 'rival@test.sk'; // Get from config or props
  
  return (
    <div className="homepage">
      {/* Hero Section */}
      <HeroBanner userEmail={userEmail} />
      
      {/* Main Content */}
      <main className="main-content">
        <section className="content-section">
          <h2>Our Services</h2>
          <p>Premium car rental services...</p>
        </section>
        
        {/* First Carousel */}
        <CarouselBanner 
          userEmail={userEmail} 
          position="homepage-carousel-1"
          className="promotion-carousel"
        />
        
        <section className="content-section">
          <h2>Featured Vehicles</h2>
          <p>Discover our latest fleet...</p>
        </section>
        
        {/* Second Carousel */}
        <CarouselBanner 
          userEmail={userEmail} 
          position="homepage-carousel-2"
          className="feature-carousel"
        />
      </main>
    </div>
  );
};

export default Homepage;
```

### CSS Styling Examples

```css
/* Hero Banner Styles */
.hero-banner {
  position: relative;
  height: 70vh;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.banner-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.banner-slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.8s ease-in-out;
}

.banner-slide.active {
  opacity: 1;
}

.banner-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-indicators {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.indicator.active {
  background-color: white;
}

/* Carousel Banner Styles */
.carousel-banner {
  position: relative;
  margin: 3rem 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.carousel-container {
  overflow: hidden;
  width: 100%;
  height: 300px;
}

.carousel-track {
  display: flex;
  transition: transform 0.5s ease-in-out;
  height: 100%;
}

.carousel-slide {
  flex: 0 0 100%;
  height: 100%;
}

.carousel-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  transition: background-color 0.3s ease;
}

.carousel-nav:hover {
  background: rgba(0, 0, 0, 0.7);
}

.carousel-nav.prev {
  left: 15px;
}

.carousel-nav.next {
  right: 15px;
}

/* Loading Skeleton */
.hero-banner-skeleton {
  height: 70vh;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.skeleton-image {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-banner {
    height: 50vh;
  }
  
  .carousel-container {
    height: 200px;
  }
  
  .carousel-nav {
    width: 35px;
    height: 35px;
    font-size: 16px;
  }
}
```

## Error Handling

### Common HTTP Status Codes
- `200` - Success
- `400` - Invalid request parameters or missing tenant ID
- `404` - Banners not found or invalid position
- `500` - Server error

### Error Response Format
```json
{
  "success": false,
  "message": "Tenant ID is required",
  "error": {
    "code": "MISSING_TENANT_ID",
    "details": "Please provide x-tenant-id header or user email"
  }
}
```

### Common Error Scenarios
1. **Missing Tenant ID**: When x-tenant-id header is not provided
2. **Invalid Position**: When requesting non-existent position
3. **User Not Found**: When email doesn't exist in system
4. **No Banners**: When tenant has no active banners (returns empty array)

## Best Practices

### Performance
- **Image Optimization**: Banners are automatically resized and optimized
- **Lazy Loading**: Load images only when needed
- **Caching**: Implement client-side caching for better performance
- **Preloading**: Preload critical banner images

### User Experience
- **Progressive Loading**: Show loading states for better UX
- **Fallback Content**: Handle cases when no banners exist
- **Responsive Design**: Ensure banners work on all device sizes
- **Accessibility**: Include proper alt text and ARIA labels

### SEO Considerations
- **Alt Text**: Always use descriptive alt text for banner images
- **Loading Strategy**: Use `loading="eager"` for above-the-fold banners
- **File Formats**: Serve optimized image formats (WebP, AVIF when possible)

## Rate Limiting
- Public endpoints are rate-limited to prevent abuse
- Limit: 100 requests per minute per IP address
- When limit exceeded, returns HTTP 429 with retry information

## Banner Management
Banners are managed through the admin panel with the following features:
- **Position-based Organization**: Banners are organized by website position
- **Sort Ordering**: Control display order within each position
- **Active/Inactive Status**: Enable/disable banners without deletion
- **Image Upload**: Drag & drop interface with automatic optimization

## Support
For technical support or API questions, please contact our development team or refer to the main CarFlow documentation.

---

*This banner system enables rental companies to create engaging visual content that enhances website appeal and drives customer engagement through strategic placement and professional imagery.* 