# Translation Quick Start Guide

## 🚀 3-Step Integration

### Step 1: Create the Helper Function

Create `/client/src/utils/translation.js`:

```javascript
/**
 * Get translated field with fallback to Slovak
 * @param {Object} item - The item containing translations
 * @param {string} fieldName - The base field name (e.g., 'description', 'name')
 * @param {string} language - Current language ('sk' | 'en')
 * @returns {string} Translated text or Slovak fallback
 */
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

---

### Step 2: Use in Components

```javascript
import { useLanguage } from '../context/LanguageContext';
import { useGetCarsQuery } from '../store/store';
import { getTranslatedField } from '../utils/translation';

function CarList() {
  const { language } = useLanguage();
  const { data } = useGetCarsQuery();
  const cars = data?.data || [];

  return (
    <div>
      {cars.map(car => (
        <div key={car._id}>
          <h3>{car.brand} {car.model}</h3>
          <p>{getTranslatedField(car, 'description', language)}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### Step 3: That's It!

The pattern is always the same:

```javascript
// Instead of:
<p>{car.description}</p>

// Use:
<p>{getTranslatedField(car, 'description', language)}</p>
```

---

## 📋 Field Reference

| Data Type | Slovak Field | English Field | RTK Query Hook |
|-----------|-------------|---------------|----------------|
| **Car** | `description` | `descriptionEn` | `useGetCarsQuery()` |
| **Service** | `name`<br>`description` | `nameEn`<br>`descriptionEn` | `useGetServicesQuery()` |
| **Blog** | `title`<br>`slug`<br>`excerpt`<br>`content` | `titleEn`<br>`slugEn`<br>`excerptEn`<br>`contentEn` | `useGetBlogsQuery()` |
| **InfoBar** | `text` | `textEn` | `useGetWebsiteSettingsQuery()` |
| **Modal** | `title`<br>`content`<br>`buttonText` | `titleEn`<br>`contentEn`<br>`buttonTextEn` | `useGetModalsQuery()` |
| **Banner Image** | `alt`<br>`title`<br>`description` | `altEn`<br>`titleEn`<br>`descriptionEn` | `useGetBannersQuery()` |

---

## 💡 Real Examples

### Car Description

```javascript
// ❌ Old way
<p>{car.description}</p>

// ✅ New way
<p>{getTranslatedField(car, 'description', language)}</p>
```

### Service Name

```javascript
// ❌ Old way
<h4>{service.name}</h4>

// ✅ New way
<h4>{getTranslatedField(service, 'name', language)}</h4>
```

### Blog Title

```javascript
// ❌ Old way
<h1>{blog.title}</h1>

// ✅ New way
<h1>{getTranslatedField(blog, 'title', language)}</h1>
```

### Multiple Fields

```javascript
function ServiceCard({ service }) {
  const { language } = useLanguage();

  return (
    <div className="service-card">
      <h4>{getTranslatedField(service, 'name', language)}</h4>
      <p>{getTranslatedField(service, 'description', language)}</p>
      <span>{service.price}€</span>
    </div>
  );
}
```

---

## 🎯 What to Translate

### ✅ Use `getTranslatedField()` for:
- Database content (cars, services, blogs, etc.)
- Dynamic content from backend

### ✅ Use `t()` for:
- UI labels and buttons
- Static text
- Navigation items

```javascript
const { language, t } = useLanguage();

// Database content → getTranslatedField()
<p>{getTranslatedField(car, 'description', language)}</p>

// UI text → t()
<button>{t('common.submit')}</button>
<h1>{t('cars.title')}</h1>
```

---

## 🔍 Testing

1. **Switch language:** Use the language switcher to change between SK/EN
2. **Check content:** All translated fields should show English text
3. **Check fallback:** If English is missing, Slovak should display
4. **No blanks:** Never show empty content

---

## ⚡ Performance Tips

1. **Destructure once:**
   ```javascript
   // ✅ Good
   const { language } = useLanguage();
   const text1 = getTranslatedField(item1, 'name', language);
   const text2 = getTranslatedField(item2, 'name', language);

   // ❌ Bad (re-calling hook multiple times)
   const text1 = getTranslatedField(item1, 'name', useLanguage().language);
   ```

2. **RTK Query caching:** Data is cached automatically, no need to store in local state

3. **Memoization (optional):**
   ```javascript
   const translatedText = useMemo(
     () => getTranslatedField(item, 'description', language),
     [item, language]
   );
   ```

---

## 🐛 Common Issues

### Issue: Content is blank when switching to English

**Cause:** English field is empty in database

**Solution:** Fallback to Slovak is automatic, but check if helper function is used correctly

### Issue: Language doesn't switch

**Cause:** Not reading from `language` state

**Solution:** Make sure you're using `const { language } = useLanguage()`

### Issue: Getting "undefined" errors

**Cause:** Item is null or undefined

**Solution:** Helper function already handles this, but add safety check:
```javascript
{item && <p>{getTranslatedField(item, 'description', language)}</p>}
```

---

## 📝 Checklist

Copy this checklist for each page you integrate:

- [ ] Import `useLanguage` hook
- [ ] Import RTK Query hook for data
- [ ] Import `getTranslatedField` helper
- [ ] Replace hardcoded fields with `getTranslatedField()`
- [ ] Test language switching (SK → EN → SK)
- [ ] Verify fallback works (shows SK if EN missing)
- [ ] Check no console errors
- [ ] Test on mobile

---

## 🎓 One More Example: Complete Page

```javascript
// pages/ServicesPage.jsx
import React from 'react';
import { useGetServicesQuery } from '../store/store';
import { useLanguage } from '../context/LanguageContext';
import { getTranslatedField } from '../utils/translation';

function ServicesPage() {
  const { data, isLoading } = useGetServicesQuery();
  const { language, t } = useLanguage();

  if (isLoading) return <div>{t('common.loading')}</div>;

  const services = data?.data || [];

  return (
    <div className="services-page">
      {/* Static text - use t() */}
      <h1>{t('services.title')}</h1>
      <p>{t('services.subtitle')}</p>

      <div className="services-grid">
        {services.map(service => (
          <div key={service._id} className="service-card">
            {/* Dynamic content - use getTranslatedField() */}
            <h3>{getTranslatedField(service, 'name', language)}</h3>
            <p>{getTranslatedField(service, 'description', language)}</p>

            {/* Numbers and prices don't need translation */}
            <span className="price">{service.price}€</span>

            {/* Static button text - use t() */}
            <button>{t('common.addToCart')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServicesPage;
```

---

## 🚀 That's It!

You now know everything you need to integrate translations. Remember:

1. Use `getTranslatedField()` for database content
2. Use `t()` for UI text
3. Always destructure `language` from `useLanguage()`
4. Test both languages and fallbacks

**Happy translating! 🌍**
