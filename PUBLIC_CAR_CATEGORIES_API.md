# Public Car Categories API

## Endpoint: GET /api/public/cars/categories

### Description
Get all available car categories with Slovak translations, descriptions, and visual information for frontend filters. This endpoint is public and requires no authentication.

### URL
```
GET /api/public/cars/categories
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `activeOnly` | boolean | No | If `true`, only returns categories that have active cars available |

### Request Examples

#### Get all categories:
```bash
GET /api/public/cars/categories
```

#### Get only categories with active cars:
```bash
GET /api/public/cars/categories?activeOnly=true
```

### Response Format

#### Success Response (200 OK) - All Categories
```json
{
  "success": true,
  "count": 13,
  "data": [
    {
      "value": "economy",
      "label": "Ekonomická",
      "labelEn": "Economy",
      "description": "Úsporné a spoľahlivé mestské auto vhodné na každodenné jazdenie aj krátke výlety s dôrazom na jednoduchosť a pohodlie.",
      "icon": "directions_car",
      "color": "#4caf50"
    },
    {
      "value": "compact", 
      "label": "Kompaktná",
      "labelEn": "Compact",
      "description": "Komfortné vozidlo s dostatkom priestoru a výbavy pre rodinné výlety, služobné cesty aj bežné každodenné používanie.",
      "icon": "directions_car",
      "color": "#2196f3"
    },
    {
      "value": "electric",
      "label": "Elektrické",
      "labelEn": "Electric", 
      "description": "Tiché, ekologické a moderné autá s okamžitým nástupom výkonu. Ideálne pre jazdu v meste aj medzimestské presuny.",
      "icon": "electric_car",
      "color": "#4caf50"
    }
  ]
}
```

#### Success Response (200 OK) - Active Categories Only
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "value": "economy",
      "label": "Ekonomická",
      "labelEn": "Economy",
      "description": "Úsporné a spoľahlivé mestské auto vhodné na každodenné jazdenie aj krátke výlety s dôrazom na jednoduchosť a pohodlie.",
      "icon": "directions_car", 
      "color": "#4caf50",
      "carCount": 8
    },
    {
      "value": "midsize",
      "label": "Stredná",
      "labelEn": "Midsize",
      "description": "Komfortné vozidlo s dostatkom priestoru a výbavy pre rodinné výlety, služobné cesty aj bežné každodenné používanie.",
      "icon": "directions_car",
      "color": "#ff9800",
      "carCount": 5
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `value` | string | Category identifier (matches Car model enum) |
| `label` | string | Slovak category name for display |
| `labelEn` | string | English category name |
| `description` | string | Detailed Slovak description |
| `icon` | string | Material UI icon name |
| `color` | string | Hex color code for UI styling |
| `carCount` | number | Number of active cars in category (only when `activeOnly=true`) |

## Available Categories

| Value | Slovak Label | English Label | Icon | Color |
|-------|--------------|---------------|------|-------|
| `economy` | Ekonomická | Economy | `directions_car` | `#4caf50` |
| `compact` | Kompaktná | Compact | `directions_car` | `#2196f3` |
| `midsize` | Stredná | Midsize | `directions_car` | `#ff9800` |
| `fullsize` | Veľká | Full-size | `directions_car` | `#9c27b0` |
| `luxury` | Luxusná | Luxury | `star` | `#795548` |
| `suv` | SUV | SUV | `terrain` | `#607d8b` |
| `minivan` | Minivan | Minivan | `airport_shuttle` | `#3f51b5` |
| `convertible` | Kabriolet | Convertible | `wb_sunny` | `#ffeb3b` |
| `sports` | Športové | Sports | `speed` | `#f44336` |
| `utility` | Úžitkové | Utility | `local_shipping` | `#9e9e9e` |
| `caravan` | Obytné | Caravan | `rv_hookup` | `#8bc34a` |
| `motorcycle` | Motorka | Motorcycle | `two_wheeler` | `#ff5722` |
| `electric` | Elektrické | Electric | `electric_car` | `#4caf50` |

### Error Responses

#### Server Error (500)
```json
{
  "success": false,
  "error": "Error retrieving car categories"
}
```

### Usage Examples

#### Frontend React Component
```javascript
import React, { useState, useEffect } from 'react';
import { Chip, Box } from '@mui/material';
import Icon from '@mui/material/Icon';

function CarCategoryFilter() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/public/cars/categories?activeOnly=true');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Chip 
        label="Všetky kategórie"
        variant={selectedCategory === '' ? 'filled' : 'outlined'}
        onClick={() => setSelectedCategory('')}
      />
      {categories.map((category) => (
        <Chip
          key={category.value}
          label={`${category.label} (${category.carCount})`}
          variant={selectedCategory === category.value ? 'filled' : 'outlined'}
          style={{ 
            backgroundColor: selectedCategory === category.value ? category.color : 'transparent',
            borderColor: category.color 
          }}
          icon={<Icon>{category.icon}</Icon>}
          onClick={() => setSelectedCategory(category.value)}
        />
      ))}
    </Box>
  );
}
```

#### JavaScript/Vanilla Implementation
```javascript
// Fetch categories for filter dropdown
async function loadCategoryFilter() {
  try {
    const response = await fetch('/api/public/cars/categories?activeOnly=true');
    const data = await response.json();
    
    if (data.success) {
      const select = document.getElementById('category-filter');
      
      // Add default option
      select.innerHTML = '<option value="">Všetky kategórie</option>';
      
      // Add category options
      data.data.forEach(category => {
        const option = document.createElement('option');
        option.value = category.value;
        option.textContent = `${category.label} (${category.carCount})`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Filter cars by category
function filterCarsByCategory(categoryValue) {
  const carsApiUrl = categoryValue 
    ? `/api/public/cars?category=${categoryValue}`
    : '/api/public/cars';
    
  // Fetch and display cars...
}
```

#### cURL
```bash
# Get all categories
curl -X GET "https://your-domain.com/api/public/cars/categories"

# Get only active categories with car counts
curl -X GET "https://your-domain.com/api/public/cars/categories?activeOnly=true"
```

### Features

- **🌍 Multilingual**: Both Slovak and English labels
- **🎨 UI Ready**: Includes Material UI icons and color codes
- **📊 Smart Filtering**: `activeOnly` parameter shows only categories with cars
- **📈 Car Counts**: Shows number of available cars per category
- **🔀 Auto-Sorting**: When `activeOnly=true`, sorts by popularity (car count)
- **🚀 Performance**: Fast response with pre-defined category data

### Integration with Car Listing

Use this endpoint to populate filter dropdowns or category buttons in your car rental website. The returned `value` field can be used directly with the cars listing API:

```javascript
// After user selects a category
const selectedCategory = 'economy';
const carsResponse = await fetch(`/api/public/cars?category=${selectedCategory}`);
```

### Related Endpoints

- `GET /api/public/cars` - List cars (supports `category` filter)
- `GET /api/public/cars/:id` - Get car details
- `GET /api/public/cars/:id/pricing` - Get car pricing