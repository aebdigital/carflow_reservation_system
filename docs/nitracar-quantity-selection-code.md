# NitraCar - Quantity Selection for Additional Services

This document provides the frontend code for implementing quantity selection on the NitraCar rental website.

## 1. Fetching Additional Services with Quantity Settings

```javascript
// API call to fetch services for NitraCar
const fetchServices = async () => {
  const response = await fetch('https://carflow-reservation-system.onrender.com/api/public/users/nitra-car@nitra-car.sk/services');
  const data = await response.json();

  if (data.success) {
    // Each service will have:
    // - behavior.allowQuantitySelection: boolean (if true, show quantity selector)
    // - behavior.maxQuantity: number (max quantity allowed, default 1-4)
    // - pricing.amount: number (price per unit)
    // - pricing.type: 'fixed' | 'per_day' | 'per_km' | 'percentage'
    return data.data;
  }
  return [];
};
```

## 2. React Component for Service Selection with Quantity

```jsx
import React, { useState, useEffect } from 'react';

const AdditionalServicesSelector = ({ selectedCar, rentalDays, onServicesChange }) => {
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState({});
  // { serviceId: { selected: boolean, quantity: number } }

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch(
        'https://carflow-reservation-system.onrender.com/api/public/users/nitra-car@nitra-car.sk/services'
      );
      const data = await response.json();
      if (data.success) {
        setServices(data.data);

        // Initialize selected services with auto-selected ones
        const initial = {};
        data.data.forEach(service => {
          if (service.behavior?.isAutoSelected) {
            initial[service._id] = {
              selected: true,
              quantity: 1
            };
          }
        });
        setSelectedServices(initial);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleServiceToggle = (service) => {
    // Don't allow unchecking required services
    if (service.behavior?.isRequired && selectedServices[service._id]?.selected) {
      return;
    }

    setSelectedServices(prev => {
      const newState = { ...prev };
      if (newState[service._id]?.selected) {
        delete newState[service._id];
      } else {
        newState[service._id] = { selected: true, quantity: 1 };
      }
      return newState;
    });
  };

  const handleQuantityChange = (serviceId, quantity) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        quantity: Math.max(1, Math.min(4, quantity))
      }
    }));
  };

  const calculateServicePrice = (service, quantity = 1) => {
    const baseAmount = service.pricing?.amount || 0;

    switch (service.pricing?.type) {
      case 'per_day':
        return baseAmount * quantity * rentalDays;
      case 'fixed':
      default:
        return baseAmount * quantity;
    }
  };

  // Notify parent of changes
  useEffect(() => {
    const servicesForPayload = Object.entries(selectedServices)
      .filter(([_, data]) => data.selected)
      .map(([serviceId, data]) => {
        const service = services.find(s => s._id === serviceId);
        return {
          _id: serviceId,
          service: serviceId,
          name: service?.name,
          category: service?.category,
          quantity: data.quantity,
          unitPrice: service?.pricing?.amount || 0,
          totalPrice: calculateServicePrice(service, data.quantity),
          pricingType: service?.pricing?.type || 'fixed'
        };
      });

    onServicesChange(servicesForPayload);
  }, [selectedServices, services, rentalDays]);

  return (
    <div className="additional-services">
      <h3>Dodatočné služby</h3>

      {services.map(service => {
        const isSelected = selectedServices[service._id]?.selected;
        const quantity = selectedServices[service._id]?.quantity || 1;
        const allowQuantity = service.behavior?.allowQuantitySelection;
        const totalPrice = calculateServicePrice(service, isSelected ? quantity : 1);

        return (
          <div
            key={service._id}
            className={`service-item ${isSelected ? 'selected' : ''}`}
          >
            <div className="service-header">
              <label className="service-checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleServiceToggle(service)}
                  disabled={service.behavior?.isRequired}
                />
                <span className="service-name">{service.name}</span>
              </label>

              <span className="service-price">
                {totalPrice.toFixed(2)} €
                {service.pricing?.type === 'per_day' && ' (celkom)'}
              </span>
            </div>

            {service.description && (
              <p className="service-description">{service.description}</p>
            )}

            {/* Quantity selector - only show if enabled and service is selected */}
            {allowQuantity && isSelected && (
              <div className="quantity-selector">
                <span>Množstvo:</span>
                <div className="quantity-buttons">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(service._id, quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="quantity-value">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(service._id, quantity + 1)}
                    disabled={quantity >= (service.behavior?.maxQuantity || 4)}
                  >
                    +
                  </button>
                </div>
                <span className="unit-price">
                  ({service.pricing?.amount?.toFixed(2)} € / ks
                  {service.pricing?.type === 'per_day' ? ' / deň' : ''})
                </span>
              </div>
            )}

            {service.behavior?.isRequired && (
              <span className="required-badge">Povinné</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdditionalServicesSelector;
```

## 3. CSS Styles

```css
.additional-services {
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  margin: 20px 0;
}

.additional-services h3 {
  margin-bottom: 20px;
  color: #333;
}

.service-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.service-item.selected {
  border-color: #1976d2;
  background: #f5f9ff;
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.service-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.service-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.service-name {
  font-weight: 500;
  font-size: 16px;
}

.service-price {
  font-weight: 600;
  color: #1976d2;
  font-size: 16px;
}

.service-description {
  color: #666;
  font-size: 14px;
  margin: 10px 0 0 28px;
}

.quantity-selector {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 15px;
  padding: 10px;
  background: #f0f7ff;
  border-radius: 6px;
  margin-left: 28px;
}

.quantity-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity-buttons button {
  width: 32px;
  height: 32px;
  border: 1px solid #1976d2;
  background: white;
  color: #1976d2;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.quantity-buttons button:hover:not(:disabled) {
  background: #1976d2;
  color: white;
}

.quantity-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quantity-value {
  font-weight: 600;
  font-size: 18px;
  min-width: 30px;
  text-align: center;
}

.unit-price {
  color: #666;
  font-size: 13px;
}

.required-badge {
  display: inline-block;
  background: #ff9800;
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 28px;
  margin-top: 8px;
}
```

## 4. Creating Reservation with Selected Services

```javascript
const createReservation = async (reservationData, selectedServices) => {
  // selectedServices is already in the correct format from the component
  // [{ _id, service, name, category, quantity, unitPrice, totalPrice, pricingType }]

  const payload = {
    ...reservationData,
    selectedServices: selectedServices,
    servicesTotal: selectedServices.reduce((sum, s) => sum + s.totalPrice, 0)
  };

  const response = await fetch(
    'https://carflow-reservation-system.onrender.com/api/public/users/nitra-car@nitra-car.sk/reservations',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  return response.json();
};
```

## 5. Example Payload Structure

When sending the reservation, the `selectedServices` array should look like this:

```json
{
  "selectedServices": [
    {
      "_id": "6579abc123def456",
      "service": "6579abc123def456",
      "name": "Detská sedačka",
      "category": "family_accessories",
      "quantity": 2,
      "unitPrice": 5.00,
      "totalPrice": 50.00,
      "pricingType": "per_day"
    },
    {
      "_id": "6579abc789ghi012",
      "service": "6579abc789ghi012",
      "name": "GPS navigácia",
      "category": "driving_comfort",
      "quantity": 1,
      "unitPrice": 8.00,
      "totalPrice": 40.00,
      "pricingType": "per_day"
    }
  ],
  "servicesTotal": 90.00
}
```

## 6. Vue.js Alternative

```vue
<template>
  <div class="additional-services">
    <h3>Dodatočné služby</h3>

    <div
      v-for="service in services"
      :key="service._id"
      :class="['service-item', { selected: isSelected(service._id) }]"
    >
      <div class="service-header">
        <label class="service-checkbox">
          <input
            type="checkbox"
            :checked="isSelected(service._id)"
            @change="toggleService(service)"
            :disabled="service.behavior?.isRequired"
          />
          <span class="service-name">{{ service.name }}</span>
        </label>

        <span class="service-price">
          {{ calculatePrice(service).toFixed(2) }} €
        </span>
      </div>

      <p v-if="service.description" class="service-description">
        {{ service.description }}
      </p>

      <!-- Quantity selector -->
      <div
        v-if="service.behavior?.allowQuantitySelection && isSelected(service._id)"
        class="quantity-selector"
      >
        <span>Množstvo:</span>
        <div class="quantity-buttons">
          <button @click="decrementQuantity(service._id)" :disabled="getQuantity(service._id) <= 1">-</button>
          <span class="quantity-value">{{ getQuantity(service._id) }}</span>
          <button @click="incrementQuantity(service._id)" :disabled="getQuantity(service._id) >= 4">+</button>
        </div>
        <span class="unit-price">
          ({{ service.pricing?.amount?.toFixed(2) }} € / ks)
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdditionalServicesSelector',
  props: {
    rentalDays: { type: Number, required: true }
  },
  data() {
    return {
      services: [],
      selectedServices: {} // { serviceId: { selected: true, quantity: 1 } }
    };
  },
  async mounted() {
    await this.fetchServices();
  },
  methods: {
    async fetchServices() {
      const response = await fetch(
        'https://carflow-reservation-system.onrender.com/api/public/users/nitra-car@nitra-car.sk/services'
      );
      const data = await response.json();
      if (data.success) {
        this.services = data.data;
        // Initialize auto-selected services
        data.data.forEach(service => {
          if (service.behavior?.isAutoSelected) {
            this.$set(this.selectedServices, service._id, { selected: true, quantity: 1 });
          }
        });
      }
    },
    isSelected(serviceId) {
      return this.selectedServices[serviceId]?.selected;
    },
    getQuantity(serviceId) {
      return this.selectedServices[serviceId]?.quantity || 1;
    },
    toggleService(service) {
      if (service.behavior?.isRequired && this.isSelected(service._id)) return;

      if (this.isSelected(service._id)) {
        this.$delete(this.selectedServices, service._id);
      } else {
        this.$set(this.selectedServices, service._id, { selected: true, quantity: 1 });
      }
      this.emitChange();
    },
    incrementQuantity(serviceId) {
      const current = this.getQuantity(serviceId);
      if (current < 4) {
        this.$set(this.selectedServices, serviceId, {
          ...this.selectedServices[serviceId],
          quantity: current + 1
        });
        this.emitChange();
      }
    },
    decrementQuantity(serviceId) {
      const current = this.getQuantity(serviceId);
      if (current > 1) {
        this.$set(this.selectedServices, serviceId, {
          ...this.selectedServices[serviceId],
          quantity: current - 1
        });
        this.emitChange();
      }
    },
    calculatePrice(service) {
      const quantity = this.isSelected(service._id) ? this.getQuantity(service._id) : 1;
      const baseAmount = service.pricing?.amount || 0;

      if (service.pricing?.type === 'per_day') {
        return baseAmount * quantity * this.rentalDays;
      }
      return baseAmount * quantity;
    },
    emitChange() {
      const servicesPayload = Object.entries(this.selectedServices)
        .filter(([_, data]) => data.selected)
        .map(([serviceId, data]) => {
          const service = this.services.find(s => s._id === serviceId);
          return {
            _id: serviceId,
            service: serviceId,
            name: service?.name,
            category: service?.category,
            quantity: data.quantity,
            unitPrice: service?.pricing?.amount || 0,
            totalPrice: this.calculatePrice(service),
            pricingType: service?.pricing?.type || 'fixed'
          };
        });

      this.$emit('services-changed', servicesPayload);
    }
  }
};
</script>
```

## Important Notes

1. **API Endpoint**: Always use the NitraCar-specific endpoint:
   - Services: `GET /api/public/users/nitra-car@nitra-car.sk/services`
   - Reservations: `POST /api/public/users/nitra-car@nitra-car.sk/reservations`

2. **Quantity Limits**: The `maxQuantity` field in `behavior` controls the maximum (default 4). Always respect this limit.

3. **Price Calculation**:
   - For `fixed` pricing: `unitPrice * quantity`
   - For `per_day` pricing: `unitPrice * quantity * rentalDays`

4. **Required Services**: Services with `behavior.isRequired = true` cannot be deselected.

5. **Auto-Selected Services**: Services with `behavior.isAutoSelected = true` should be pre-checked when the form loads.

6. **Quantity Selector Visibility**: Only show the quantity selector when:
   - `behavior.allowQuantitySelection` is `true`
   - The service is currently selected
