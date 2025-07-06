import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Alert,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CustomerReservationForm from '../components/reservation/CustomerReservationForm';

// Mock data for demo
const mockCar = {
  _id: 'car_demo_id',
  brand: 'Škoda',
  model: 'Octavia',
  year: 2023,
  category: 'midsize',
  dailyRate: 45,
  pricing: {
    dailyRate: 45,
    rates: {
      '1day': 50,
      '2-3days': 45,
      '4-10days': 42,
      '11-17days': 40,
      '18-24days': 38
    }
  },
  images: [
    {
      url: 'https://images.unsplash.com/photo-1549399736-64c621e7b2f4?w=400'
    }
  ],
  features: ['Klimatizácia', 'GPS navigácia', 'Bluetooth'],
  fuelType: 'benzín',
  transmission: 'automat',
  seats: 5
};

const mockServices = [
  {
    _id: 'service_1',
    name: 'Detské sedadlo',
    description: 'Bezpečnostné sedadlo pre deti do 12 rokov',
    category: 'family_accessories',
    icon: 'baby_changing_station',
    pricing: {
      type: 'per_day',
      amount: 5,
      currency: 'EUR'
    },
    behavior: {
      maxQuantity: 3,
      isRequired: false,
      isAutoSelected: false
    },
    availability: {
      vehicleCategories: ['economy', 'midsize'],
      seasonal: { isActive: false }
    }
  },
  {
    _id: 'service_2',
    name: 'GPS navigácia Premium',
    description: 'Moderný GPS navigačný systém s aktuálnymi mapami',
    category: 'driving_comfort',
    icon: 'navigation',
    pricing: {
      type: 'per_day',
      amount: 3,
      currency: 'EUR'
    },
    behavior: {
      maxQuantity: 1,
      isRequired: false,
      isAutoSelected: false
    },
    availability: {
      vehicleCategories: [],
      seasonal: { isActive: false }
    }
  },
  {
    _id: 'service_3',
    name: 'Plné poistenie',
    description: 'Komplexné poistné krytie bez spoluúčasti',
    category: 'insurance_assistance',
    icon: 'security',
    pricing: {
      type: 'percentage',
      amount: 15,
      currency: 'EUR'
    },
    behavior: {
      maxQuantity: 1,
      isRequired: false,
      isAutoSelected: false
    },
    availability: {
      vehicleCategories: [],
      seasonal: { isActive: false }
    }
  },
  {
    _id: 'service_4',
    name: 'Pristavenie na adresu',
    description: 'Doručíme vozidlo na vašu adresu v meste',
    category: 'delivery_pickup',
    icon: 'local_shipping',
    pricing: {
      type: 'fixed',
      amount: 25,
      currency: 'EUR'
    },
    behavior: {
      maxQuantity: 1,
      isRequired: false,
      isAutoSelected: false
    },
    availability: {
      vehicleCategories: [],
      seasonal: { isActive: false }
    }
  },
  {
    _id: 'service_5',
    name: 'WiFi hotspot',
    description: 'Mobilný internet počas celej cesty',
    category: 'driving_comfort',
    icon: 'wifi',
    pricing: {
      type: 'per_day',
      amount: 2,
      currency: 'EUR'
    },
    behavior: {
      maxQuantity: 1,
      isRequired: false,
      isAutoSelected: false
    },
    availability: {
      vehicleCategories: [],
      seasonal: { isActive: false }
    }
  },
  {
    _id: 'service_6',
    name: 'Zimné pneumatiky',
    description: 'Bezpečnosť jazdy v zimných podmienkach',
    category: 'specialized',
    icon: 'ac_unit',
    pricing: {
      type: 'per_day',
      amount: 4,
      currency: 'EUR'
    },
    behavior: {
      maxQuantity: 1,
      isRequired: false,
      isAutoSelected: false
    },
    availability: {
      vehicleCategories: [],
      seasonal: {
        isActive: true,
        startMonth: 11,
        endMonth: 3
      }
    }
  }
];

function ReservationDemo() {
  const [reservationCompleted, setReservationCompleted] = useState(false);
  const [reservationData, setReservationData] = useState(null);

  const handleReservationComplete = (data) => {
    console.log('Reservation completed:', data);
    setReservationData(data);
    setReservationCompleted(true);
  };

  const resetDemo = () => {
    setReservationCompleted(false);
    setReservationData(null);
  };

  if (reservationCompleted) {
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎉 Demo rezervácie úspešne dokončené!
            </Typography>
            <Typography variant="body2">
              V skutočnej aplikácii by sa teraz odoslali údaje na server a zákazník by dostal potvrdzovací email.
            </Typography>
          </Alert>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Súhrn rezervácie
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Vozidlo
                  </Typography>
                  <Typography variant="body1">
                    {reservationData.car?.brand} {reservationData.car?.model}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Dátum prenájmu
                  </Typography>
                  <Typography variant="body1">
                    {reservationData.startDate?.toLocaleDateString()} - {reservationData.endDate?.toLocaleDateString()}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Miesto prevzatia
                  </Typography>
                  <Typography variant="body1">
                    {reservationData.pickupLocation}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Miesto vrátenia
                  </Typography>
                  <Typography variant="body1">
                    {reservationData.dropoffLocation}
                  </Typography>
                </Grid>

                {reservationData.selectedServices?.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Vybrané služby ({reservationData.selectedServices.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {reservationData.selectedServices.map((service, index) => (
                        <Chip
                          key={index}
                          label={`${service.service.name} (${service.quantity}x)`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                {reservationData.discountCode && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Zľavový kód
                    </Typography>
                    <Typography variant="body1" color="success.main">
                      {reservationData.discountCode}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          <Button variant="contained" onClick={resetDemo} size="large">
            Spustiť demo znovu
          </Button>
        </Container>
      </LocalizationProvider>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            Demo: Rezervácia s doplnkovými službami
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Interaktívna ukážka rezervačného formulára s integrovanými doplnkovými službami
          </Typography>
          
          <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
            <Typography variant="body2" gutterBottom>
              <strong>Funkcie dema:</strong>
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>Výber dátumu a času prenájmu</li>
              <li>Automatický prepočet ceny podľa dĺžky prenájmu</li>
              <li>Doplnkové služby rozdelené do kategórií</li>
              <li>Dynamické ceny služieb (pevná cena, za deň, percentuálne)</li>
              <li>Kontrola množstva služieb</li>
              <li>Živý súhrn objednávky s celkovou cenou</li>
              <li>Overenie zľavového kódu (funkcia zatiaľ len UI)</li>
            </ul>
          </Alert>
        </Box>

        {/* Selected Car Preview */}
        <Card sx={{ mb: 4 }}>
          <Grid container>
            <Grid item xs={12} md={4}>
              <CardMedia
                component="img"
                height="200"
                image={mockCar.images[0].url}
                alt={`${mockCar.brand} ${mockCar.model}`}
                sx={{ objectFit: 'cover' }}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {mockCar.brand} {mockCar.model} ({mockCar.year})
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {mockCar.category} • {mockCar.fuelType} • {mockCar.transmission} • {mockCar.seats} miest
                </Typography>
                <Typography variant="h6" color="primary.main" gutterBottom>
                  Od {mockCar.dailyRate}€/deň
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {mockCar.features.map((feature, index) => (
                    <Chip key={index} label={feature} size="small" variant="outlined" />
                  ))}
                </Box>
              </CardContent>
            </Grid>
          </Grid>
        </Card>

        {/* Reservation Form */}
        <CustomerReservationForm
          selectedCar={mockCar}
          initialStartDate={null}
          initialEndDate={null}
          onReservationComplete={handleReservationComplete}
          availableServices={mockServices}
          isLoading={false}
        />
      </Container>
    </LocalizationProvider>
  );
}

export default ReservationDemo; 