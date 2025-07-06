import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Autocomplete,
  Avatar,
  Badge,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  DirectionsCar as CarIcon,
  DateRange as DateIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

const steps = [
  'Detaily prenájmu',
  'Osobné údaje', 
  'Platba a potvrdenie'
];

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

function CustomerReservationForm({ 
  selectedCar,
  initialStartDate,
  initialEndDate,
  onReservationComplete,
  availableServices = [],
  isLoading = false 
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [reservationData, setReservationData] = useState({
    // Step 1: Rental Details & Services
    car: selectedCar || null,
    startDate: initialStartDate || null,
    endDate: initialEndDate || null,
    startTime: new Date().setHours(10, 0, 0, 0), // Default 10:00 AM
    endTime: new Date().setHours(10, 0, 0, 0),   // Default 10:00 AM
    pickupLocation: '',
    dropoffLocation: '',
    selectedServices: [], // Array of { serviceId, quantity, totalPrice }
    discountCode: '',
    
    // Step 2: Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: null,
    licenseNumber: '',
    licenseExpiry: null,
    address: {
      street: '',
      city: '',
      zipCode: '',
      country: 'Slovensko'
    },
    additionalDrivers: [],
    specialRequests: '',
    
    // Step 3: Payment
    paymentMethod: 'card',
    termsAccepted: false,
    newsletterOptIn: false
  });

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
    if (!reservationData.car || !reservationData.startDate || !reservationData.endDate) {
      return { subtotal: 0, taxes: 0, servicesTotal: 0, discountAmount: 0, total: 0, days: 0 };
    }

    const days = Math.ceil((new Date(reservationData.endDate) - new Date(reservationData.startDate)) / (1000 * 60 * 60 * 24));
    const dailyRate = reservationData.car.pricing?.dailyRate || reservationData.car.dailyRate || 0;
    
    // Calculate base rental cost
    let subtotal = dailyRate * days;
    
    // Apply tiered pricing if available
    if (reservationData.car.pricing?.rates) {
      const rates = reservationData.car.pricing.rates;
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
    const servicesTotal = reservationData.selectedServices.reduce((total, service) => {
      return total + (service.totalPrice || 0);
    }, 0);

    // Calculate taxes (10%)
    const taxes = (subtotal + servicesTotal) * 0.1;
    
    // TODO: Apply discount if discount code is valid
    const discountAmount = 0;
    
    const total = subtotal + servicesTotal + taxes - discountAmount;

    return {
      subtotal,
      servicesTotal,
      taxes,
      discountAmount,
      total,
      days,
      dailyRate
    };
  }, [reservationData.car, reservationData.startDate, reservationData.endDate, reservationData.selectedServices]);

  // Handle service selection
  const handleServiceToggle = (service, isSelected) => {
    if (isSelected) {
      // Add service
      const quantity = 1;
      const totalPrice = calculateServicePrice(service, quantity);
      
      setReservationData(prev => ({
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
      // Remove service
      setReservationData(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.filter(s => s.serviceId !== service._id)
      }));
    }
  };

  // Handle service quantity change
  const handleServiceQuantityChange = (serviceId, newQuantity) => {
    if (newQuantity < 1) {
      // Remove service if quantity is 0
      setReservationData(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.filter(s => s.serviceId !== serviceId)
      }));
      return;
    }

    setReservationData(prev => ({
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

  // Calculate service price based on type and quantity
  const calculateServicePrice = (service, quantity) => {
    const basePrice = service.pricing.amount;
    
    switch (service.pricing.type) {
      case 'fixed':
        return basePrice * quantity;
      case 'per_day':
        return basePrice * quantity * pricing.days;
      case 'per_km':
        // TODO: Calculate based on distance
        return basePrice * quantity;
      case 'percentage':
        return (pricing.subtotal * basePrice / 100) * quantity;
      default:
        return basePrice * quantity;
    }
  };

  // Check if service is selected
  const isServiceSelected = (serviceId) => {
    return reservationData.selectedServices.some(s => s.serviceId === serviceId);
  };

  // Get selected service quantity
  const getServiceQuantity = (serviceId) => {
    const service = reservationData.selectedServices.find(s => s.serviceId === serviceId);
    return service ? service.quantity : 0;
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    if (field.includes('.')) {
      const keys = field.split('.');
      setReservationData(prev => {
        const newData = { ...prev };
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
      });
    } else {
      setReservationData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Navigation handlers
  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    // Process reservation
    if (onReservationComplete) {
      onReservationComplete(reservationData);
    }
  };

  // Render Step 1: Rental Details & Additional Services
  const renderRentalDetailsStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Detaily prenájmu
      </Typography>
      
      <Grid container spacing={3}>
        {/* Selected Car Display */}
        {reservationData.car && (
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    src={reservationData.car.images?.[0]?.url} 
                    sx={{ width: 60, height: 60 }}
                  >
                    <CarIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {reservationData.car.brand} {reservationData.car.model}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {reservationData.car.year} • {reservationData.car.category}
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
            label="Dátum začiatku"
            value={reservationData.startDate}
            onChange={(date) => handleFieldChange('startDate', date)}
            slotProps={{ textField: { fullWidth: true, required: true } }}
            minDate={new Date()}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TimePicker
            label="Čas začiatku"
            value={new Date(reservationData.startTime)}
            onChange={(time) => handleFieldChange('startTime', time?.getTime())}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <DatePicker
            label="Dátum ukončenia"
            value={reservationData.endDate}
            onChange={(date) => handleFieldChange('endDate', date)}
            slotProps={{ textField: { fullWidth: true, required: true } }}
            minDate={reservationData.startDate || new Date()}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TimePicker
            label="Čas ukončenia"
            value={new Date(reservationData.endTime)}
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
            label="Miesto prevzatia"
            value={reservationData.pickupLocation}
            onChange={(e) => handleFieldChange('pickupLocation', e.target.value)}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Miesto vrátenia"
            value={reservationData.dropoffLocation}
            onChange={(e) => handleFieldChange('dropoffLocation', e.target.value)}
            required
          />
        </Grid>

        {/* Additional Services */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
            <InfoIcon color="primary" />
            Doplnkové služby
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Vyberte si doplnkové služby pre vaše pohodlie a bezpečnosť
          </Typography>

          {Object.entries(servicesByCategory).map(([categoryKey, services]) => (
            <Accordion key={categoryKey} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                    {categoryConfig[categoryKey]?.icon} {categoryConfig[categoryKey]?.label}
                  </Typography>
                  <Badge 
                    badgeContent={services.filter(s => isServiceSelected(s._id)).length} 
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
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
              </AccordionDetails>
            </Accordion>
          ))}
        </Grid>

        {/* Discount Code */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Zľavový kód (voliteľné)"
            value={reservationData.discountCode}
            onChange={(e) => handleFieldChange('discountCode', e.target.value.toUpperCase())}
            placeholder="Napríklad: LETO2024"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => {/* TODO: Verify discount code */}}
                  >
                    Overiť
                  </Button>
                </InputAdornment>
              )
            }}
          />
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
                      Doplnkové služby ({reservationData.selectedServices.length}):
                    </Typography>
                    <Typography variant="body2">{pricing.servicesTotal.toFixed(2)}€</Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">DPH (10%):</Typography>
                  <Typography variant="body2">{pricing.taxes.toFixed(2)}€</Typography>
                </Box>
                
                {pricing.discountAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="success.main">Zľava:</Typography>
                    <Typography variant="body2" color="success.main">-{pricing.discountAmount.toFixed(2)}€</Typography>
                  </Box>
                )}
                
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
      </Grid>
    </Box>
  );

  // Render Step 2: Personal Information (placeholder)
  const renderPersonalInfoStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Osobné údaje
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Tento krok bude implementovaný neskôr...
      </Typography>
    </Box>
  );

  // Render Step 3: Payment (placeholder)
  const renderPaymentStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Platba a potvrdenie
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Tento krok bude implementovaný neskôr...
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <Box sx={{ mt: 3, mb: 3 }}>
          {activeStep === 0 && renderRentalDetailsStep()}
          {activeStep === 1 && renderPersonalInfoStep()}
          {activeStep === 2 && renderPaymentStep()}
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
          <Button
            color="inherit"
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Späť
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          {activeStep === steps.length - 1 ? (
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Spracováva sa...' : 'Potvrdiť rezerváciu'}
            </Button>
          ) : (
            <Button 
              onClick={handleNext}
              variant="contained"
              disabled={!pricing.days || !reservationData.pickupLocation || !reservationData.dropoffLocation}
            >
              Pokračovať
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default CustomerReservationForm; 