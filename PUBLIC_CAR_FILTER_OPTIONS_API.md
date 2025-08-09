# Public Car Filter Options API

## Endpoint: GET /api/public/cars/filter-options

### Description
Get all available car filter options including fuel type, transmission, and seat count (počet miest) with Slovak translations and visual information. Perfect for creating frontend filter interfaces.

### URL
```
GET /api/public/cars/filter-options
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `activeOnly` | boolean | No | If `true`, only returns options that have active cars available |

### Request Examples

#### Get all filter options:
```bash
GET /api/public/cars/filter-options
```

#### Get only options with active cars:
```bash
GET /api/public/cars/filter-options?activeOnly=true
```

### Response Format

#### Success Response (200 OK) - All Options
```json
{
  "success": true,
  "data": {
    "fuelType": [
      {
        "value": "gasoline",
        "label": "Benzín",
        "labelEn": "Gasoline",
        "icon": "local_gas_station",
        "color": "#ff9800"
      },
      {
        "value": "diesel",
        "label": "Diesel",
        "labelEn": "Diesel",
        "icon": "local_gas_station",
        "color": "#795548"
      },
      {
        "value": "electric",
        "label": "Elektrický",
        "labelEn": "Electric",
        "icon": "electric_car",
        "color": "#2196f3"
      }
    ],
    "transmission": [
      {
        "value": "manual",
        "label": "Manuálna",
        "labelEn": "Manual",
        "icon": "settings",
        "color": "#607d8b"
      },
      {
        "value": "automatic",
        "label": "Automatická",
        "labelEn": "Automatic",
        "icon": "settings_backup_restore",
        "color": "#3f51b5"
      }
    ],
    "seats": [
      {
        "value": 2,
        "label": "2 miesta",
        "labelEn": "2 seats",
        "icon": "person",
        "color": "#ff5722"
      },
      {
        "value": 5,
        "label": "5 miest",
        "labelEn": "5 seats",
        "icon": "people",
        "color": "#4caf50"
      },
      {
        "value": 7,
        "label": "7 miest",
        "labelEn": "7 seats",
        "icon": "group",
        "color": "#ff9800"
      }
    ]
  }
}
```

#### Success Response (200 OK) - Active Options Only
```json
{
  "success": true,
  "data": {
    "fuelType": [
      {
        "value": "gasoline",
        "label": "Benzín",
        "labelEn": "Gasoline",
        "icon": "local_gas_station",
        "color": "#ff9800",
        "carCount": 12
      },
      {
        "value": "diesel",
        "label": "Diesel",
        "labelEn": "Diesel", 
        "icon": "local_gas_station",
        "color": "#795548",
        "carCount": 8
      }
    ],
    "transmission": [
      {
        "value": "automatic",
        "label": "Automatická",
        "labelEn": "Automatic",
        "icon": "settings_backup_restore",
        "color": "#3f51b5",
        "carCount": 15
      },
      {
        "value": "manual",
        "label": "Manuálna",
        "labelEn": "Manual",
        "icon": "settings",
        "color": "#607d8b",
        "carCount": 10
      }
    ],
    "seats": [
      {
        "value": 5,
        "label": "5 miest",
        "labelEn": "5 seats",
        "icon": "people",
        "color": "#4caf50",
        "carCount": 18
      },
      {
        "value": 7,
        "label": "7 miest",
        "labelEn": "7 seats",
        "icon": "group",
        "color": "#ff9800",
        "carCount": 6
      }
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `value` | string/number | Filter value (matches Car model enum/field) |
| `label` | string | Slovak display name |
| `labelEn` | string | English display name |
| `icon` | string | Material UI icon name |
| `color` | string | Hex color code for UI styling |
| `carCount` | number | Number of active cars with this option (only when `activeOnly=true`) |

## Available Filter Options

### Fuel Types (fuelType)

| Value | Slovak Label | English Label | Icon | Color |
|-------|--------------|---------------|------|-------|
| `gasoline` | Benzín | Gasoline | `local_gas_station` | `#ff9800` |
| `diesel` | Diesel | Diesel | `local_gas_station` | `#795548` |
| `hybrid` | Hybrid | Hybrid | `eco` | `#4caf50` |
| `electric` | Elektrický | Electric | `electric_car` | `#2196f3` |
| `lpg` | LPG | LPG | `local_gas_station` | `#9c27b0` |

### Transmissions (transmission)

| Value | Slovak Label | English Label | Icon | Color |
|-------|--------------|---------------|------|-------|
| `manual` | Manuálna | Manual | `settings` | `#607d8b` |
| `automatic` | Automatická | Automatic | `settings_backup_restore` | `#3f51b5` |
| `cvt` | CVT | CVT | `tune` | `#9e9e9e` |

### Seat Counts (seats)

| Value | Slovak Label | English Label | Icon | Color |
|-------|--------------|---------------|------|-------|
| `2` | 2 miesta | 2 seats | `person` | `#ff5722` |
| `4` | 4 miesta | 4 seats | `people` | `#2196f3` |
| `5` | 5 miest | 5 seats | `people` | `#4caf50` |
| `7` | 7 miest | 7 seats | `group` | `#ff9800` |
| `9` | 9 miest | 9 seats | `groups` | `#9c27b0` |

### Error Responses

#### Server Error (500)
```json
{
  "success": false,
  "error": "Error retrieving car filter options"
}
```

### Usage Examples

#### Frontend React Filter Component
```javascript
import React, { useState, useEffect } from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip, 
  Box,
  Typography 
} from '@mui/material';
import Icon from '@mui/material/Icon';

function CarFilters({ onFiltersChange }) {
  const [filterOptions, setFilterOptions] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({
    fuelType: '',
    transmission: '',
    seats: ''
  });

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/public/cars/filter-options?activeOnly=true');
      const data = await response.json();
      
      if (data.success) {
        setFilterOptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...selectedFilters, [filterType]: value };
    setSelectedFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
      {/* Fuel Type Filter */}
      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel>Palivo</InputLabel>
        <Select
          value={selectedFilters.fuelType}
          label="Palivo"
          onChange={(e) => handleFilterChange('fuelType', e.target.value)}
        >
          <MenuItem value="">Všetky typy</MenuItem>
          {filterOptions.fuelType?.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon style={{ color: option.color }}>{option.icon}</Icon>
                {option.label}
                {option.carCount && (
                  <Chip 
                    label={option.carCount} 
                    size="small" 
                    variant="outlined" 
                  />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Transmission Filter */}
      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel>Prevodovka</InputLabel>
        <Select
          value={selectedFilters.transmission}
          label="Prevodovka"
          onChange={(e) => handleFilterChange('transmission', e.target.value)}
        >
          <MenuItem value="">Všetky typy</MenuItem>
          {filterOptions.transmission?.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon style={{ color: option.color }}>{option.icon}</Icon>
                {option.label}
                {option.carCount && (
                  <Chip 
                    label={option.carCount} 
                    size="small" 
                    variant="outlined" 
                  />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Seats Filter */}
      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel>Počet miest</InputLabel>
        <Select
          value={selectedFilters.seats}
          label="Počet miest"
          onChange={(e) => handleFilterChange('seats', e.target.value)}
        >
          <MenuItem value="">Všetky</MenuItem>
          {filterOptions.seats?.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon style={{ color: option.color }}>{option.icon}</Icon>
                {option.label}
                {option.carCount && (
                  <Chip 
                    label={option.carCount} 
                    size="small" 
                    variant="outlined" 
                  />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
```

#### Vanilla JavaScript Implementation
```javascript
// Fetch and populate filter dropdowns
async function initializeFilters() {
  try {
    const response = await fetch('/api/public/cars/filter-options?activeOnly=true');
    const data = await response.json();
    
    if (data.success) {
      populateFilterDropdown('fuel-filter', data.data.fuelType, 'Všetky palivá');
      populateFilterDropdown('transmission-filter', data.data.transmission, 'Všetky prevodovky');
      populateFilterDropdown('seats-filter', data.data.seats, 'Všetky');
    }
  } catch (error) {
    console.error('Error loading filters:', error);
  }
}

function populateFilterDropdown(selectId, options, defaultText) {
  const select = document.getElementById(selectId);
  select.innerHTML = `<option value="">${defaultText}</option>`;
  
  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = `${option.label} ${option.carCount ? `(${option.carCount})` : ''}`;
    select.appendChild(optionElement);
  });
}

// Apply filters to car search
function applyFilters() {
  const fuelType = document.getElementById('fuel-filter').value;
  const transmission = document.getElementById('transmission-filter').value;
  const seats = document.getElementById('seats-filter').value;
  
  const params = new URLSearchParams();
  if (fuelType) params.append('fuelType', fuelType);
  if (transmission) params.append('transmission', transmission);
  if (seats) params.append('seats', seats);
  
  const carsApiUrl = `/api/public/cars?${params.toString()}`;
  // Fetch and display filtered cars...
}
```

#### cURL
```bash
# Get all filter options
curl -X GET "https://your-domain.com/api/public/cars/filter-options"

# Get only active filter options with car counts
curl -X GET "https://your-domain.com/api/public/cars/filter-options?activeOnly=true"
```

### Features

- **🌍 Multilingual**: Both Slovak and English labels
- **🎨 UI Ready**: Includes Material UI icons and color codes
- **📊 Smart Filtering**: `activeOnly` parameter shows only options with available cars
- **📈 Car Counts**: Shows number of available cars per option
- **🔀 Auto-Sorting**: When `activeOnly=true`, sorts by popularity (car count)
- **🚀 Performance**: Fast response with optimized database queries

### Integration with Car Listing

Use this endpoint to populate filter interfaces and then apply the filters to the cars listing API:

```javascript
// After user selects filters
const filters = {
  fuelType: 'electric',
  transmission: 'automatic', 
  seats: 5
};

const params = new URLSearchParams(filters);
const carsResponse = await fetch(`/api/public/cars?${params.toString()}`);
```

### Related Endpoints

- `GET /api/public/cars` - List cars (supports all filter parameters)
- `GET /api/public/cars/categories` - Get car categories
- `GET /api/public/cars/:id` - Get car details
- `GET /api/public/cars/:id/pricing` - Get car pricing