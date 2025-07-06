import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Alert,
  Divider,
  Button,
  Grid,
  Avatar,
  Chip
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  CheckCircle as CheckCircleIcon,
  LocalGasStation as FuelIcon,
  People as PeopleIcon,
  DriveEta as DriveIcon
} from '@mui/icons-material';
import PublicReservationForm from '../components/PublicReservationForm';

// Mock car data for demonstration
const mockCar = {
  _id: '6745d8b9e123456789abcdef',
  brand: 'Škoda',
  model: 'Octavia',
  year: 2023,
  category: 'compact',
  dailyRate: 35,
  pricing: {
    dailyRate: 35,
    rates: {
      '1day': 45,
      '2-3days': 40,
      '4-10days': 35,
      '11-17days': 30,
      '18-24days': 25
    }
  },
  images: [
    {
      url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop'
    }
  ],
  features: ['Automatická prevodovka', 'Klimatizácia', 'GPS navigácia', 'Bluetooth'],
  fuel: 'Benzín',
  seats: 5,
  transmission: 'Automatická'
};

function PublicReservationDemo() {
  const [reservationStep, setReservationStep] = useState('form');
  const [completedReservation, setCompletedReservation] = useState(null);
  const [currentPricing, setCurrentPricing] = useState(null);

  const handleReservationComplete = (reservationData) => {
    setCompletedReservation(reservationData);
    setReservationStep('success');
  };

  const handlePriceUpdate = (pricing) => {
    setCurrentPricing(pricing);
  };

  const handleStartNew = () => {
    setReservationStep('form');
    setCompletedReservation(null);
    setCurrentPricing(null);
  };

  if (reservationStep === 'success') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h4" gutterBottom color="success.main">
            Rezervácia úspešne vytvorená!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Vaša rezervácia bola úspešne odoslaná. Čoskoro vás budeme kontaktovať pre potvrdenie.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Detaily rezervácie
              </Typography>
              <Typography variant="body2">
                Vozidlo: {mockCar.brand} {mockCar.model}
              </Typography>
              <Typography variant="body2">
                Celková cena: {currentPricing?.total?.toFixed(2)}€
              </Typography>
              {currentPricing?.servicesTotal > 0 && (
                <Typography variant="body2">
                  Doplnkové služby: {currentPricing.servicesTotal.toFixed(2)}€
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Ďalšie kroky
              </Typography>
              <Typography variant="body2">
                • Overenie dostupnosti vozidla
              </Typography>
              <Typography variant="body2">
                • Kontaktovanie zákazníka
              </Typography>
              <Typography variant="body2">
                • Potvrdenie rezervácie
              </Typography>
            </Grid>
          </Grid>
          
          <Button 
            variant="outlined" 
            onClick={handleStartNew}
            sx={{ mt: 2 }}
          >
            Vytvoriť novú rezerváciu
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ 
          fontWeight: 700,
          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center'
        }}>
          Verejný rezervačný formulár
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
          Kompletný rezervačný formulár s doplnkovými službami
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Demo ukázka:</strong> Tento formulár obsahuje všetky funkcie vrátane doplnkových služieb, 
            dynamického cenotvorenia a real-time kalkulácie cien. Služby sa načítajú z API rival@test.sk tenanta.
          </Typography>
        </Alert>
      </Box>

      <Grid container spacing={4}>
        {/* Car Selection Preview */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 'fit-content', position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vybraté vozidlo
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar 
                  src={mockCar.images[0].url} 
                  sx={{ width: 80, height: 80 }}
                >
                  <CarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {mockCar.brand} {mockCar.model}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {mockCar.year} • {mockCar.category}
                  </Typography>
                  <Typography variant="body2" color="primary.main" fontWeight="medium">
                    od {mockCar.dailyRate}€/deň
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Špecifikácie
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  icon={<PeopleIcon />}
                  label={`${mockCar.seats} miest`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  icon={<FuelIcon />}
                  label={mockCar.fuel}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  icon={<DriveIcon />}
                  label={mockCar.transmission}
                  size="small"
                  variant="outlined"
                />
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Výbava
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {mockCar.features.map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>

              {currentPricing && currentPricing.days > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Cenová kalkulácia
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      {currentPricing.days} {currentPricing.days === 1 ? 'deň' : currentPricing.days < 5 ? 'dni' : 'dní'}:
                    </Typography>
                    <Typography variant="body2">
                      {currentPricing.subtotal.toFixed(2)}€
                    </Typography>
                  </Box>
                  {currentPricing.servicesTotal > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Služby:</Typography>
                      <Typography variant="body2">
                        {currentPricing.servicesTotal.toFixed(2)}€
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">DPH:</Typography>
                    <Typography variant="body2">
                      {currentPricing.taxes.toFixed(2)}€
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Celkom:
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                      {currentPricing.total.toFixed(2)}€
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Reservation Form */}
        <Grid item xs={12} md={8}>
          <PublicReservationForm
            selectedCar={mockCar}
            userEmail="rival@test.sk"
            onReservationComplete={handleReservationComplete}
            onPriceUpdate={handlePriceUpdate}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Implementačné pokyny
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pre integráciu tohto formulára na vašu webstránku stačí importovať komponent 
          <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>
            PublicReservationForm
          </code>
          a poskytovať mu potrebné props:
        </Typography>
        <Box component="pre" sx={{ 
          mt: 2, 
          p: 2, 
          bgcolor: 'grey.900', 
          color: 'white', 
          borderRadius: 1,
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
{`import PublicReservationForm from './components/PublicReservationForm';

<PublicReservationForm
  selectedCar={selectedCar}
  userEmail="rival@test.sk"
  apiBaseUrl="https://carflow-reservation-system.onrender.com/api/public"
  onReservationComplete={(data) => console.log('Reservation completed:', data)}
  onPriceUpdate={(pricing) => console.log('Price updated:', pricing)}
/>`}
        </Box>
      </Box>
    </Container>
  );
}

export default PublicReservationDemo; 