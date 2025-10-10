# Frontend Translation Integration Guide

## Overview

This guide explains how to connect the English translation backend endpoints to the frontend car rental website. All backend endpoints are ready and configured with JWT authentication. The RTK Query mutations are already set up in the Redux store.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Available Translation Data](#available-translation-data)
3. [RTK Query Hooks (Already Available)](#rtk-query-hooks-already-available)
4. [Integration Steps by Component](#integration-steps-by-component)
5. [Code Examples](#code-examples)
6. [Language Context Usage](#language-context-usage)
7. [Testing Checklist](#testing-checklist)

---

## Architecture Overview

### Backend → Frontend Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Ready)                          │
├─────────────────────────────────────────────────────────────┤
│ • MongoDB models with English fields (nameEn, titleEn, etc.) │
│ • API endpoints returning both SK and EN data                │
│ • JWT authentication protecting all endpoints                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 RTK QUERY STORE (Ready)                      │
├─────────────────────────────────────────────────────────────┤
│ • Mutations for updating translations (Admin only)           │
│ • Queries fetching all data (SK + EN)                        │
│ • Automatic cache invalidation after updates                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            LANGUAGE CONTEXT (Already Exists)                 │
├─────────────────────────────────────────────────────────────┤
│ • useLanguage() hook provides: { language, t, changeLanguage }│
│ • language: 'sk' | 'en'                                       │
│ • Persisted in localStorage                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND COMPONENTS (Your Work)                 │
├─────────────────────────────────────────────────────────────┤
│ • Read language from useLanguage()                           │
│ • Display nameEn if language === 'en', else name             │
│ • Fallback to Slovak if English translation missing          │
└─────────────────────────────────────────────────────────────┘
```

---

## Available Translation Data

### 1. **Cars** (`/api/cars`)

Each car object includes:

```javascript
{
  _id: "...",
  brand: "Škoda",
  model: "Octavia",
  description: "Priestranné rodinné auto...",
  descriptionEn: "Spacious family car...",  // ← English field
  // ... other fields
}
```

**What to translate:** Car description

---

### 2. **Additional Services** (`/api/additional-services`)

Each service object includes:

```javascript
{
  _id: "...",
  name: "Detské sedadlo",
  nameEn: "Child seat",                    // ← English field
  description: "Bezpečné sedadlo pre deti",
  descriptionEn: "Safe seat for children", // ← English field
  price: 5,
  // ... other fields
}
```

**What to translate:** Service name and description

---

### 3. **Blog Posts** (`/api/blogs`)

Each blog post includes:

```javascript
{
  _id: "...",
  title: "Ako si vybrať auto na dovolenku",
  titleEn: "How to choose a car for vacation",     // ← English field
  slug: "ako-si-vybrat-auto",
  slugEn: "how-to-choose-car",                     // ← English field
  excerpt: "Krátky popis...",
  excerptEn: "Short description...",               // ← English field
  content: "Celý obsah blogu...",
  contentEn: "Full blog content...",               // ← English field
  // ... other fields
}
```

**What to translate:** Title, slug, excerpt, and content

---

### 4. **Info Bar** (`/api/website/settings`)

The website settings object includes:

```javascript
{
  infoBar: {
    text: "Letná akcia -20% na SUV!",
    textEn: "Summer sale -20% on SUVs!",  // ← English field
    color: "red",
    isActive: true,
    // ... other fields
  },
  // ... other settings
}
```

**What to translate:** Info bar text

---

### 5. **Modals** (`/api/website/modals`)

Each modal includes:

```javascript
{
  _id: "...",
  title: "Získajte zľavu 10%",
  titleEn: "Get 10% discount",                     // ← English field
  content: "Zadajte svoj email...",
  contentEn: "Enter your email...",                // ← English field
  emailPlaceholder: "Váš email",
  emailPlaceholderEn: "Your email",                // ← English field
  buttonText: "Získať zľavu",
  buttonTextEn: "Get discount",                    // ← English field
  secondaryButtonText: "Možno neskôr",
  secondaryButtonTextEn: "Maybe later",            // ← English field
  // ... other fields
}
```

**What to translate:** Title, content, placeholders, button texts

---

### 6. **Banners** (`/api/banners`)

Each banner has an array of images, and each image includes:

```javascript
{
  _id: "...",
  images: [
    {
      _id: "...",
      url: "https://storage.googleapis.com/...",
      alt: "Moderné auto",
      altEn: "Modern car",                    // ← English field
      title: "Prenájom áut",
      titleEn: "Car rental",                  // ← English field
      description: "Najlepšie ceny",
      descriptionEn: "Best prices",           // ← English field
    }
  ],
  // ... other fields
}
```

**What to translate:** Alt text, title, and description for each image

---

## RTK Query Hooks (Already Available)

All these hooks are already exported from `/client/src/store/store.js`:

### Query Hooks (Fetching Data)

```javascript
// Import from store
import {
  useGetCarsQuery,
  useGetServicesQuery,
  useGetBlogsQuery,
  useGetBannersQuery,
  useGetModalsQuery,
  useGetWebsiteSettingsQuery,
} from '../store/store';

// Usage in components
const { data: carsData, isLoading } = useGetCarsQuery();
const { data: servicesData } = useGetServicesQuery();
const { data: blogsData } = useGetBlogsQuery();
const { data: bannersData } = useGetBannersQuery();
const { data: modalsData } = useGetModalsQuery();
const { data: settingsData } = useGetWebsiteSettingsQuery();
```

**Note:** You only need the query hooks for the public website. The mutation hooks are already used in the admin panel.

---

## Integration Steps by Component

### Step 1: Import the Language Hook

```javascript
import { useLanguage } from '../context/LanguageContext';

function MyComponent() {
  const { language, t } = useLanguage();
  // language is either 'sk' or 'en'
  // t() is for static translations (like buttons, labels)
}
```

---

### Step 2: Fetch Data with RTK Query

```javascript
import { useGetCarsQuery } from '../store/store';

function CarList() {
  const { data: carsData, isLoading } = useGetCarsQuery();
  const { language } = useLanguage();

  if (isLoading) return <div>Loading...</div>;

  const cars = carsData?.data || [];

  return (
    <div>
      {cars.map(car => (
        <CarCard key={car._id} car={car} language={language} />
      ))}
    </div>
  );
}
```

---

### Step 3: Display Translated Content

Create a helper function for safe translation with fallback:

```javascript
// utils/translation.js
export const getTranslatedField = (item, fieldName, language) => {
  if (!item) return '';

  if (language === 'en') {
    const englishField = `${fieldName}En`;
    // Return English if available, fallback to Slovak
    return item[englishField] || item[fieldName] || '';
  }

  // Default to Slovak
  return item[fieldName] || '';
};
```

**Usage:**

```javascript
import { getTranslatedField } from '../utils/translation';

function CarCard({ car, language }) {
  const description = getTranslatedField(car, 'description', language);

  return (
    <div>
      <h3>{car.brand} {car.model}</h3>
      <p>{description}</p>
    </div>
  );
}
```

---

## Code Examples

### Example 1: Car Listing Page

```javascript
// pages/Cars.jsx (Public website, not admin)
import React from 'react';
import { useGetCarsQuery } from '../store/store';
import { useLanguage } from '../context/LanguageContext';
import { getTranslatedField } from '../utils/translation';

function CarsPage() {
  const { data: carsData, isLoading } = useGetCarsQuery();
  const { language, t } = useLanguage();

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

  const cars = carsData?.data || [];

  return (
    <div className="cars-page">
      <h1>{t('cars.title')}</h1>

      <div className="cars-grid">
        {cars.map(car => (
          <div key={car._id} className="car-card">
            <img src={car.images[0]} alt={car.brand} />
            <h3>{car.brand} {car.model}</h3>

            {/* This is the translated field */}
            <p className="description">
              {getTranslatedField(car, 'description', language)}
            </p>

            <div className="price">
              {car.pricePerDay}€ / {t('cars.perDay')}
            </div>

            <button>{t('cars.reserve')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CarsPage;
```

---

### Example 2: Additional Services Component

```javascript
// components/AdditionalServices.jsx (Public website)
import React from 'react';
import { useGetServicesQuery } from '../store/store';
import { useLanguage } from '../context/LanguageContext';
import { getTranslatedField } from '../utils/translation';

function AdditionalServices() {
  const { data: servicesData } = useGetServicesQuery();
  const { language, t } = useLanguage();

  const services = servicesData?.data || [];

  return (
    <div className="services-section">
      <h2>{t('services.title')}</h2>

      <div className="services-list">
        {services.map(service => (
          <div key={service._id} className="service-item">
            <img src={service.icon} alt={service.name} />

            {/* Translated name */}
            <h4>{getTranslatedField(service, 'name', language)}</h4>

            {/* Translated description */}
            <p>{getTranslatedField(service, 'description', language)}</p>

            <span className="price">+{service.price}€</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdditionalServices;
```

---

### Example 3: Blog Post Page

```javascript
// pages/BlogPost.jsx (Public website)
import React from 'react';
import { useParams } from 'react-router-dom';
import { useGetBlogsQuery } from '../store/store';
import { useLanguage } from '../context/LanguageContext';
import { getTranslatedField } from '../utils/translation';

function BlogPost() {
  const { slug } = useParams();
  const { data: blogsData } = useGetBlogsQuery();
  const { language } = useLanguage();

  const blogs = blogsData?.data || [];

  // Find blog by slug (check both SK and EN slugs)
  const blog = blogs.find(b =>
    b.slug === slug || b.slugEn === slug
  );

  if (!blog) {
    return <div>Blog not found</div>;
  }

  return (
    <article className="blog-post">
      {/* Translated title */}
      <h1>{getTranslatedField(blog, 'title', language)}</h1>

      <div className="blog-meta">
        <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
        <span>{blog.author}</span>
      </div>

      {/* Translated excerpt */}
      <p className="excerpt">
        {getTranslatedField(blog, 'excerpt', language)}
      </p>

      {/* Translated content */}
      <div
        className="blog-content"
        dangerouslySetInnerHTML={{
          __html: getTranslatedField(blog, 'content', language)
        }}
      />
    </article>
  );
}

export default BlogPost;
```

---

### Example 4: Info Bar Component

```javascript
// components/InfoBar.jsx (Public website)
import React from 'react';
import { useGetWebsiteSettingsQuery } from '../store/store';
import { useLanguage } from '../context/LanguageContext';
import { getTranslatedField } from '../utils/translation';

function InfoBar() {
  const { data: settingsData } = useGetWebsiteSettingsQuery();
  const { language } = useLanguage();

  const infoBar = settingsData?.data?.infoBar;

  // Don't show if not active
  if (!infoBar || !infoBar.isActive) {
    return null;
  }

  // Check if it's within date range (if scheduled)
  const now = new Date();
  if (infoBar.startDate && new Date(infoBar.startDate) > now) {
    return null;
  }
  if (infoBar.endDate && new Date(infoBar.endDate) < now) {
    return null;
  }

  return (
    <div
      className="info-bar"
      style={{
        backgroundColor: infoBar.backgroundColor,
        color: infoBar.textColor,
      }}
    >
      {/* Translated text */}
      {getTranslatedField(infoBar, 'text', language)}
    </div>
  );
}

export default InfoBar;
```

---

### Example 5: Modal Component

```javascript
// components/Modal.jsx (Public website)
import React, { useState, useEffect } from 'react';
import { useGetModalsQuery } from '../store/store';
import { useLanguage } from '../context/LanguageContext';
import { getTranslatedField } from '../utils/translation';

function ModalPopup() {
  const { data: modalsData } = useGetModalsQuery();
  const { language, t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [currentModal, setCurrentModal] = useState(null);

  const modals = modalsData?.data || [];

  useEffect(() => {
    // Find active modal for current page
    const modal = modals.find(m =>
      m.isActive &&
      m.displayLocation === 'homepage' // or check current route
    );

    if (modal) {
      // Trigger based on modal settings
      if (modal.triggerRule.type === 'time') {
        setTimeout(() => {
          setCurrentModal(modal);
          setShowModal(true);
        }, modal.triggerRule.value * 1000);
      }
      // Add more trigger types as needed
    }
  }, [modals]);

  if (!showModal || !currentModal) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Translated title */}
        <h2>{getTranslatedField(currentModal, 'title', language)}</h2>

        {/* Translated content */}
        <p>{getTranslatedField(currentModal, 'content', language)}</p>

        {currentModal.type === 'newsletter' && (
          <input
            type="email"
            placeholder={getTranslatedField(currentModal, 'emailPlaceholder', language)}
          />
        )}

        {/* Translated button */}
        <button>
          {getTranslatedField(currentModal, 'buttonText', language)}
        </button>

        {/* Translated secondary button */}
        <button onClick={() => setShowModal(false)}>
          {getTranslatedField(currentModal, 'secondaryButtonText', language)}
        </button>
      </div>
    </div>
  );
}

export default ModalPopup;
```

---

### Example 6: Banner/Hero Section

```javascript
// components/HeroSection.jsx (Public website)
import React from 'react';
import { useGetBannersQuery } from '../store/store';
import { useLanguage } from '../context/LanguageContext';
import { getTranslatedField } from '../utils/translation';

function HeroSection() {
  const { data: bannersData } = useGetBannersQuery();
  const { language } = useLanguage();

  const banners = bannersData?.data || [];

  // Find hero section banner
  const heroBanner = banners.find(b =>
    b.position === 'hero-section' && b.isActive
  );

  if (!heroBanner || heroBanner.images.length === 0) {
    return null;
  }

  const mainImage = heroBanner.images[0];

  return (
    <div className="hero-section">
      <img
        src={mainImage.url}
        alt={getTranslatedField(mainImage, 'alt', language)}
      />

      <div className="hero-content">
        {/* Translated title */}
        <h1>{getTranslatedField(mainImage, 'title', language)}</h1>

        {/* Translated description */}
        <p>{getTranslatedField(mainImage, 'description', language)}</p>
      </div>
    </div>
  );
}

export default HeroSection;
```

---

### Example 7: Image Carousel with Banners

```javascript
// components/Carousel.jsx (Public website)
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { useGetBannersQuery } from '../store/store';
import { useLanguage } from '../context/LanguageContext';
import { getTranslatedField } from '../utils/translation';

function Carousel({ position = 'homepage-carousel-1' }) {
  const { data: bannersData } = useGetBannersQuery();
  const { language } = useLanguage();

  const banners = bannersData?.data || [];

  // Find banner for this position
  const banner = banners.find(b =>
    b.position === position && b.isActive
  );

  if (!banner || banner.images.length === 0) {
    return null;
  }

  return (
    <Swiper className="banner-carousel">
      {banner.images.map(image => (
        <SwiperSlide key={image._id}>
          <img
            src={image.url}
            alt={getTranslatedField(image, 'alt', language)}
          />
          <div className="carousel-caption">
            <h3>{getTranslatedField(image, 'title', language)}</h3>
            <p>{getTranslatedField(image, 'description', language)}</p>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

export default Carousel;
```

---

## Language Context Usage

The `useLanguage()` hook provides:

```javascript
const { language, t, changeLanguage } = useLanguage();

// language: 'sk' | 'en' - Current language
// t: (key: string) => string - Translation function for static text
// changeLanguage: (lang: 'sk' | 'en') => void - Change language
```

### Static Translations (from translations.js)

```javascript
// For UI elements, buttons, labels (not database content)
<button>{t('common.submit')}</button>
<h1>{t('cars.title')}</h1>
<p>{t('footer.copyright')}</p>
```

### Dynamic Translations (from database)

```javascript
// For content from backend (cars, services, blogs, etc.)
const description = getTranslatedField(car, 'description', language);
const serviceName = getTranslatedField(service, 'name', language);
```

---

## Testing Checklist

### Before Going Live

- [ ] **Language Switcher Works**
  - Toggle between SK/EN
  - Language persists after page reload
  - URL changes (if using language in URL)

- [ ] **All Content Translates**
  - Car descriptions show English when EN selected
  - Service names and descriptions translate
  - Blog posts show English content
  - Info bar translates
  - Modals show English text
  - Banner images have English alt/title/description

- [ ] **Fallback Works**
  - If English translation is missing, Slovak is shown
  - No empty/blank content appears
  - Console has no errors

- [ ] **SEO Considerations**
  - Blog slugs work in both languages
  - Meta tags translate (title, description)
  - `<html lang="sk">` or `<html lang="en">` changes

- [ ] **Mobile Responsive**
  - Language switcher visible on mobile
  - Translated content doesn't break layout
  - Long English words wrap correctly

- [ ] **Performance**
  - RTK Query caching works
  - No unnecessary re-fetching
  - Language change is instant (no loading spinner)

---

## Common Pitfalls to Avoid

### ❌ DON'T DO THIS:

```javascript
// Bad: Hardcoding language
const text = car.descriptionEn;

// Bad: No fallback
const text = language === 'en' ? car.descriptionEn : car.description;
// If descriptionEn is empty, this shows nothing!

// Bad: Inline logic everywhere
<p>{language === 'en' ? service.nameEn || service.name : service.name}</p>
```

### ✅ DO THIS:

```javascript
// Good: Use helper function with fallback
const text = getTranslatedField(car, 'description', language);

// Good: Reusable component
<TranslatedText item={service} field="name" language={language} />

// Good: Centralized logic
const useTranslatedContent = (item, field) => {
  const { language } = useLanguage();
  return getTranslatedField(item, field, language);
};
```

---

## Quick Reference Table

| Component Type | RTK Query Hook | Fields to Translate | Example |
|---------------|----------------|---------------------|---------|
| Cars | `useGetCarsQuery()` | `description` → `descriptionEn` | Car listing page |
| Services | `useGetServicesQuery()` | `name` → `nameEn`<br>`description` → `descriptionEn` | Additional services section |
| Blogs | `useGetBlogsQuery()` | `title` → `titleEn`<br>`slug` → `slugEn`<br>`excerpt` → `excerptEn`<br>`content` → `contentEn` | Blog posts |
| Info Bar | `useGetWebsiteSettingsQuery()` | `text` → `textEn` | Top announcement bar |
| Modals | `useGetModalsQuery()` | `title` → `titleEn`<br>`content` → `contentEn`<br>`emailPlaceholder` → `emailPlaceholderEn`<br>`buttonText` → `buttonTextEn`<br>`secondaryButtonText` → `secondaryButtonTextEn` | Popup modals |
| Banners | `useGetBannersQuery()` | `alt` → `altEn`<br>`title` → `titleEn`<br>`description` → `descriptionEn` | Hero section, carousels |

---

## Need Help?

### Debug Checklist

1. **Check if data is fetched:**
   ```javascript
   const { data, isLoading, error } = useGetCarsQuery();
   console.log('Cars data:', data);
   ```

2. **Check language context:**
   ```javascript
   const { language } = useLanguage();
   console.log('Current language:', language);
   ```

3. **Check if English fields exist:**
   ```javascript
   console.log('Car:', car);
   console.log('Has English description:', !!car.descriptionEn);
   ```

4. **Check translation helper:**
   ```javascript
   const translated = getTranslatedField(car, 'description', language);
   console.log('Translated text:', translated);
   ```

### Backend Endpoints Reference

All endpoints are at: `https://carflow-reservation-system.onrender.com/api`

- `GET /cars` - Returns all cars with `descriptionEn`
- `GET /additional-services` - Returns all services with `nameEn`, `descriptionEn`
- `GET /blogs` - Returns all blogs with `titleEn`, `slugEn`, `excerptEn`, `contentEn`
- `GET /website/settings` - Returns settings with `infoBar.textEn`
- `GET /website/modals` - Returns modals with English fields
- `GET /banners` - Returns banners with image English fields

---

## Summary

**What You Need to Do:**

1. ✅ Import `useLanguage()` hook in your components
2. ✅ Import RTK Query hooks for data fetching
3. ✅ Create `getTranslatedField()` helper function
4. ✅ Replace hardcoded Slovak text with `getTranslatedField(item, 'field', language)`
5. ✅ Test language switching
6. ✅ Ensure fallbacks work when English is missing

**What's Already Done:**

- ✅ Backend endpoints with English fields
- ✅ RTK Query setup and mutations
- ✅ Admin panel for managing translations
- ✅ Language context and translations.js
- ✅ JWT authentication

**Time Estimate:** 4-6 hours for full integration across all pages

Good luck! 🚀
