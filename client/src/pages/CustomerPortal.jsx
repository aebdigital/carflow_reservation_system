import React from 'react'
import { useSelector } from 'react-redux'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Avatar,
  Chip,
} from '@mui/material'
import {
  DirectionsCar as CarIcon,
  AccountCircle as AccountIcon,
  History as HistoryIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material'
import { t } from '../utils/translations'

function CustomerPortal() {
  const { user } = useSelector((state) => state.auth)

  const customerFeatures = [
    {
      title: t('myReservations'),
      description: t('viewManageReservations'),
      icon: <CarIcon fontSize="large" />,
      color: 'primary.main',
      status: t('comingSoon'),
    },
    {
      title: t('rentalHistory'),
      description: t('viewPastRentals'),
      icon: <HistoryIcon fontSize="large" />,
      color: 'secondary.main',
      status: t('comingSoon'),
    },
    {
      title: t('profileSettings'),
      description: t('updatePersonalInfo'),
      icon: <AccountIcon fontSize="large" />,
      color: 'success.main',
      status: t('comingSoon'),
    },
    {
      title: t('paymentMethods'),
      description: t('managePaymentMethods'),
      icon: <PaymentIcon fontSize="large" />,
      color: 'warning.main',
      status: t('comingSoon'),
    },
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'primary.main',
              margin: '0 auto 16px',
              fontSize: '2rem',
            }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </Avatar>
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
            {t('welcomeUser', 'sk', { name: user?.firstName })}
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            {t('customerPortal')}
          </Typography>
          <Chip 
            label={`${t('roleLabel')}: ${t(user?.role?.toLowerCase() || 'customer').toUpperCase()}`} 
            color="primary" 
            variant="outlined"
            sx={{ mb: 2 }}
          />
        </Box>

        {/* Customer Features Grid */}
        <Grid container spacing={3}>
          {customerFeatures.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flex: 1, textAlign: 'center', p: 3 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: feature.color,
                      color: 'white',
                      mb: 2,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {feature.description}
                  </Typography>
                  <Chip
                    label={feature.status}
                    size="small"
                    color="default"
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled
                    sx={{ mt: 'auto' }}
                  >
                    {t('accessFeature')}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Info Section */}
        <Card sx={{ mt: 4, p: 3, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            🚧 {t('customerPortalDev')}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {t('demoApplication')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>{t('yourAccountDetails')}:</strong><br />
            {t('email')}: {user?.email}<br />
            {t('phone')}: {user?.phone}<br />
            {t('accountStatus')}: {user?.isActive ? t('accountActive') : t('accountInactive')}
          </Typography>
        </Card>
      </Container>
    </Box>
  )
}

export default CustomerPortal 