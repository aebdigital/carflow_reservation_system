import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  Card,
  CardContent,
  Divider,
  Alert,
  Chip,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Avatar,
  Badge,
  Collapse,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  DirectionsCar as CarIcon,
  DateRange as DateIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Info as InfoIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIconButton
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const categoryConfig = {
  driving_comfort: {
    label: 'JAZDA A KOMFORT',
    icon: '🚗',
    color: '#4caf50'
  },
  insurance_assistance: {
    label: 'POISTENIE A ASISTENCIA',
    icon: '🛡️',
    color: '#2196f3'
  },
  time_services: {
    label: 'ČASOVÉ SLUŽBY',
    icon: '⏰',
    color: '#ff9800'
  },
  delivery_pickup: {
    label: 'PRISTAVENIE/VYZDVIHNUTIE',
    icon: '🚚',
    color: '#9c27b0'
  },
  family_accessories: {
    label: 'RODINA A DOPLNKY',
    icon: '👨‍👩‍👧‍👦',
    color: '#e91e63'
  },
  specialized: {
    label: 'ŠPECIALIZOVANÉ',
    icon: '⚙️',
    color: '#607d8b'
  }
};

function PublicReservationForm({ 
  selectedCar,
  userEmail = 'rival@test.sk',
  apiBaseUrl = 'https://carflow-reservation-system.onrender.com/api/public',
  onReservationComplete,
  onPriceUpdate
}) {
  const [formData, setFormData] = useState({
    startDate: null,
    endDate: null,
    startTime: new Date().setHours(10, 0, 0, 0),
    endTime: new Date().setHours(10, 0, 0, 0),
    pickupLocation: '',
    dropoffLocation: '',
    selectedServices: []
  });

  const [availableServices, setAvailableServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showServicesSection, setShowServicesSection] = useState(false);

  // Fetch available services
  const fetchServices = async () => {
    if (!userEmail) return;

    setServicesLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCar?.category) {
        params.append('carCategory', selectedCar.category);
      }
      if (formData.startDate) {
        params.append('startDate', formData.startDate.toISOString());
      }
      if (formData.endDate) {
        params.append('endDate', formData.endDate.toISOString());
      }

      const response = await fetch(`${apiBaseUrl}/users/${userEmail}/services?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableServices(data.data.services || []);
      } else {
        console.error('Failed to fetch services:', data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setServicesLoading(false);
    }
  };

  // Group services by category
  const servicesByCategory = useMemo(() => {
    return availableServices.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {});
  }, [availableServices]);

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!selectedCar || !formData.startDate || !formData.endDate) {
      return { subtotal: 0, taxes: 0, servicesTotal: 0, discountAmount: 0, total: 0, days: 0 };
    }

    const days = Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24));
    const dailyRate = selectedCar.pricing?.dailyRate || selectedCar.dailyRate || 0;
    
    // Calculate base rental cost
    let subtotal = dailyRate * days;
    
    // Apply tiered pricing if available
    if (selectedCar.pricing?.rates) {
      const rates = selectedCar.pricing.rates;
      if (days === 1 && rates['1day']) {
        subtotal = rates['1day'];
      } else if (days >= 2 && days <= 3 && rates['2-3days']) {
        subtotal = rates['2-3days'] * days;
      } else if (days >= 4 && days <= 10 && rates['4-10days']) {
        subtotal = rates['4-10days'] * days;
      } else if (days >= 11 && days <= 17 && rates['11-17days']) {
        subtotal = rates['11-17days'] * days;
      } else if (days >= 18 && days <= 24 && rates['18-24days']) {
        subtotal = rates['18-24days'] * days;
      }
    }

    // Calculate services total
    const servicesTotal = formData.selectedServices.reduce((total, service) => {
      return total + (service.totalPrice || 0);
    }, 0);

    // Calculate taxes (10%)
    const taxes = (subtotal + servicesTotal) * 0.1;
    
    const total = subtotal + servicesTotal + taxes;

    return {
      subtotal,
      servicesTotal,
      taxes,
      total,
      days,
      dailyRate
    };
  }, [selectedCar, formData.startDate, formData.endDate, formData.selectedServices]);

  // Calculate service price based on type and quantity
  const calculateServicePrice = (service, quantity) => {
    const basePrice = service.pricing.amount;
    
    switch (service.pricing.type) {
      case 'fixed':
        return basePrice * quantity;
      case 'per_day':
        return basePrice * quantity * pricing.days;
      case 'per_km':
        return basePrice * quantity;
      case 'percentage':
        return (pricing.subtotal * basePrice / 100) * quantity;
      default:
        return basePrice * quantity;
    }
  };

  // Handle service selection
  const handleServiceToggle = (service, isSelected) => {
    if (isSelected) {
      const quantity = 1;
      const totalPrice = calculateServicePrice(service, quantity);
      
      setFormData(prev => ({
        ...prev,
        selectedServices: [
          ...prev.selectedServices,
          {
            serviceId: service._id,
            service: service,
            quantity,
            totalPrice
          }
        ]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.filter(s => s.serviceId !== service._id)
      }));
    }
  };

  // Handle service quantity change
  const handleServiceQuantityChange = (serviceId, newQuantity) => {
    if (newQuantity < 1) {
      setFormData(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.filter(s => s.serviceId !== serviceId)
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.map(s => {
        if (s.serviceId === serviceId) {
          const totalPrice = calculateServicePrice(s.service, newQuantity);
          return { ...s, quantity: newQuantity, totalPrice };
        }
        return s;
      })
    }));
  };

  // Check if service is selected
  const isServiceSelected = (serviceId) => {
    return formData.selectedServices.some(s => s.serviceId === serviceId);
  };

  // Get selected service quantity
  const getServiceQuantity = (serviceId) => {
    const service = formData.selectedServices.find(s => s.serviceId === serviceId);
    return service ? service.quantity : 0;
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Toggle category expansion
  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const reservationData = {
        firstName: 'Demo',
        lastName: 'Customer',
        email: 'demo@example.com',
        phone: '+421901234567',
        carId: selectedCar._id,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        selectedServices: formData.selectedServices.map(s => ({
          serviceId: s.serviceId,
          quantity: s.quantity
        }))
      };

      const response = await fetch(`${apiBaseUrl}/users/${userEmail}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reservationData)
      });

      const result = await response.json();
      
      if (result.success && onReservationComplete) {
        onReservationComplete(result.data);
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
    }
  };

  // Fetch services when dates or car changes
  useEffect(() => {
    fetchServices();
  }, [formData.startDate, formData.endDate, selectedCar?.category, userEmail]);

  // Notify parent of price updates
  useEffect(() => {
    if (onPriceUpdate) {
      onPriceUpdate(pricing);
    }
  }, [pricing, onPriceUpdate]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          Detaily prenájmu
        </Typography>
        
        <Grid container spacing={3}>
          {/* Selected Car Display */}
          {selectedCar && (
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar 
                      src={selectedCar.images?.[0]?.url} 
                      sx={{ width: 60, height: 60 }}
                    >
                      <CarIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {selectedCar.brand} {selectedCar.model}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedCar.year} • {selectedCar.category}
                      </Typography>
                      <Typography variant="body2" color="primary.main" fontWeight="medium">
                        {pricing.dailyRate}€/deň
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Date and Time Selection */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DateIcon color="primary" />
              Dátum a čas prenájmu
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <DatePicker
              label="Dátum prevzatia *"
              value={formData.startDate}
              onChange={(date) => handleFieldChange('startDate', date)}
              slotProps={{ textField: { fullWidth: true, required: true } }}
              minDate={new Date()}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <DatePicker
              label="Dátum vrátenia *"
              value={formData.endDate}
              onChange={(date) => handleFieldChange('endDate', date)}
              slotProps={{ textField: { fullWidth: true, required: true } }}
              minDate={formData.startDate || new Date()}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TimePicker
              label="Čas prevzatia"
              value={new Date(formData.startTime)}
              onChange={(time) => handleFieldChange('startTime', time?.getTime())}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TimePicker
              label="Čas vrátenia"
              value={new Date(formData.endTime)}
              onChange={(time) => handleFieldChange('endTime', time?.getTime())}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>

          {/* Location Selection */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <LocationIcon color="primary" />
              Miesta prevzatia a vrátenia
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Miesto prevzatia *"
              value={formData.pickupLocation}
              onChange={(e) => handleFieldChange('pickupLocation', e.target.value)}
              required
              placeholder="Vyberte miesto prevzatia"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Miesto vrátenia *"
              value={formData.dropoffLocation}
              onChange={(e) => handleFieldChange('dropoffLocation', e.target.value)}
              required
              placeholder="Vyberte miesto vrátenia"
            />
          </Grid>

          {/* Additional Services Toggle */}
          <Grid item xs={12}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mt: 3, 
                cursor: 'pointer',
                p: 2,
                bgcolor: 'primary.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'primary.200'
              }}
              onClick={() => setShowServicesSection(!showServicesSection)}
            >
              <InfoIcon color="primary" />
              <Typography variant="h6" sx={{ flex: 1 }}>
                Doplnkové služby
              </Typography>
              {formData.selectedServices.length > 0 && (
                <Badge badgeContent={formData.selectedServices.length} color="primary" />
              )}
              <IconButton size="small">
                {showServicesSection ? <ExpandLessIcon /> : <ExpandMoreIconButton />}
              </IconButton>
            </Box>
            
            <Collapse in={showServicesSection}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Vyberte si doplnkové služby pre vaše pohodlie a bezpečnosť
                </Typography>

                {servicesLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                )}

                {!servicesLoading && Object.keys(servicesByCategory).length === 0 && (
                  <Alert severity="info">
                    Žiadne doplnkové služby nie sú momentálne dostupné.
                  </Alert>
                )}

                {Object.entries(servicesByCategory).map(([categoryKey, services]) => {
                  const config = categoryConfig[categoryKey] || { label: categoryKey, icon: '📋', color: '#757575' };
                  const selectedCount = services.filter(s => isServiceSelected(s._id)).length;
                  const isExpanded = expandedCategories[categoryKey];

                  return (
                    <Card key={categoryKey} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent 
                        sx={{ 
                          p: 2, 
                          '&:last-child': { pb: 2 },
                          cursor: 'pointer',
                          bgcolor: isExpanded ? 'action.hover' : 'background.paper'
                        }}
                        onClick={() => toggleCategory(categoryKey)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" sx={{ fontSize: '1rem', flex: 1 }}>
                            {config.icon} {config.label}
                          </Typography>
                          {selectedCount > 0 && (
                            <Badge badgeContent={selectedCount} color="primary" />
                          )}
                          <ExpandMoreIcon 
                            sx={{ 
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s'
                            }} 
                          />
                        </Box>
                      </CardContent>
                      
                      <Collapse in={isExpanded}>
                        <Box sx={{ p: 2, pt: 0 }}>
                          <Grid container spacing={2}>
                            {services.map((service) => {
                              const selected = isServiceSelected(service._id);
                              const quantity = getServiceQuantity(service._id);
                              const servicePrice = selected ? calculateServicePrice(service, quantity) : calculateServicePrice(service, 1);
                              
                              return (
                                <Grid item xs={12} key={service._id}>
                                  <Card 
                                    variant="outlined" 
                                    sx={{ 
                                      border: selected ? '2px solid' : '1px solid',
                                      borderColor: selected ? 'primary.main' : 'divider',
                                      bgcolor: selected ? 'primary.50' : 'background.paper'
                                    }}
                                  >
                                    <CardContent sx={{ py: 2 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                          <FormControlLabel
                                            control={
                                              <Checkbox
                                                checked={selected}
                                                onChange={(e) => handleServiceToggle(service, e.target.checked)}
                                                color="primary"
                                              />
                                            }
                                            label={
                                              <Box>
                                                <Typography variant="subtitle1" fontWeight="medium">
                                                  {service.name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                  {service.description}
                                                </Typography>
                                              </Box>
                                            }
                                          />
                                        </Box>
                                        
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                          {selected && service.behavior?.maxQuantity > 1 && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <Button
                                                size="small"
                                                onClick={() => handleServiceQuantityChange(service._id, quantity - 1)}
                                                disabled={quantity <= 1}
                                                sx={{ minWidth: 32, height: 32 }}
                                              >
                                                <RemoveIcon fontSize="small" />
                                              </Button>
                                              <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                                                {quantity}
                                              </Typography>
                                              <Button
                                                size="small"
                                                onClick={() => handleServiceQuantityChange(service._id, quantity + 1)}
                                                disabled={quantity >= service.behavior.maxQuantity}
                                                sx={{ minWidth: 32, height: 32 }}
                                              >
                                                <AddIcon fontSize="small" />
                                              </Button>
                                            </Box>
                                          )}
                                          
                                          <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                                              {servicePrice.toFixed(2)}€
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {service.pricing.type === 'per_day' && `za ${pricing.days} dní`}
                                              {service.pricing.type === 'fixed' && 'jednorazovo'}
                                              {service.pricing.type === 'percentage' && 'z celkovej sumy'}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Box>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Box>
                      </Collapse>
                    </Card>
                  );
                })}
              </Box>
            </Collapse>
          </Grid>

          {/* Pricing Summary */}
          {pricing.days > 0 && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                <CardContent>
                  <Typography variant="h6" color="primary.main" gutterBottom>
                    Súhrn objednávky
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Doba prenájmu: {pricing.days} {pricing.days === 1 ? 'deň' : pricing.days < 5 ? 'dni' : 'dní'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Prenájom vozidla:</Typography>
                    <Typography variant="body2">{pricing.subtotal.toFixed(2)}€</Typography>
                  </Box>
                  
                  {pricing.servicesTotal > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        Doplnkové služby ({formData.selectedServices.length}):
                      </Typography>
                      <Typography variant="body2">{pricing.servicesTotal.toFixed(2)}€</Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">DPH (10%):</Typography>
                    <Typography variant="body2">{pricing.taxes.toFixed(2)}€</Typography>
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight="bold">Celkom:</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      {pricing.total.toFixed(2)}€
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Submit Button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmit}
              disabled={!formData.startDate || !formData.endDate || !formData.pickupLocation || !formData.dropoffLocation}
              sx={{ mt: 2 }}
            >
              Ďalší krok
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </LocalizationProvider>
  );
}

export default PublicReservationForm; 