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

function CustomerPortal() {
  const { user } = useSelector((state) => state.auth)

  const customerFeatures = [
    {
      title: 'My Reservations',
      description: 'View and manage your car reservations',
      icon: <CarIcon fontSize="large" />,
      color: 'primary.main',
      status: 'Coming Soon',
    },
    {
      title: 'Rental History',
      description: 'View your past car rentals',
      icon: <HistoryIcon fontSize="large" />,
      color: 'secondary.main',
      status: 'Coming Soon',
    },
    {
      title: 'Profile Settings',
      description: 'Update your personal information',
      icon: <AccountIcon fontSize="large" />,
      color: 'success.main',
      status: 'Coming Soon',
    },
    {
      title: 'Payment Methods',
      description: 'Manage your payment methods',
      icon: <PaymentIcon fontSize="large" />,
      color: 'warning.main',
      status: 'Coming Soon',
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
            Welcome, {user?.firstName}!
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Customer Portal
          </Typography>
          <Chip 
            label={`Role: ${user?.role?.toUpperCase()}`} 
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
                    Access Feature
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Info Section */}
        <Card sx={{ mt: 4, p: 3, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            🚧 Customer Portal Under Development
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            This is a demo application showcasing role-based access control. 
            The customer portal features are currently under development.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Your Account Details:</strong><br />
            Email: {user?.email}<br />
            Phone: {user?.phone}<br />
            Account Status: {user?.isActive ? 'Active' : 'Inactive'}
          </Typography>
        </Card>
      </Container>
    </Box>
  )
}

export default CustomerPortal 