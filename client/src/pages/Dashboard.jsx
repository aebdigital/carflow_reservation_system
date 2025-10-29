import React, { useMemo } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  DirectionsCar as CarIcon,
  BookOnline as ReservationIcon,
  People as CustomerIcon,
  AttachMoney as RevenueIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { t } from '../utils/translations'
import { 
  useGetReservationsQuery, 
  useGetCarsQuery, 
  useGetUsersQuery,
  useGetCarStatsQuery,
  useGetReservationStatsQuery,
  useGetPaymentStatsQuery
} from '../store/store'


const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed':
      return 'success'
    case 'ongoing':
      return 'primary'
    case 'pending':
      return 'warning'
    case 'cancelled':
      return 'error'
    default:
      return 'default'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'confirmed':
      return t('confirmed')
    case 'ongoing':
      return t('active')
    case 'pending':
      return t('pending')
    case 'cancelled':
      return t('cancelled')
    default:
      return status
  }
}

function Dashboard() {
  // API hooks to get real data and statistics
  const { 
    data: reservationsData, 
    isLoading: reservationsLoading, 
    error: reservationsError 
  } = useGetReservationsQuery({ populate: 'customer,car' })
  
  const { 
    data: carsData, 
    isLoading: carsLoading, 
    error: carsError 
  } = useGetCarsQuery({})
  
  const { 
    data: usersData, 
    isLoading: usersLoading, 
    error: usersError 
  } = useGetUsersQuery({ role: 'customer' })

  // Stats API hooks for accurate dashboard metrics
  const { 
    data: carStats, 
    isLoading: carStatsLoading 
  } = useGetCarStatsQuery()
  
  const { 
    data: reservationStats, 
    isLoading: reservationStatsLoading 
  } = useGetReservationStatsQuery()
  
  const { 
    data: paymentStats, 
    isLoading: paymentStatsLoading 
  } = useGetPaymentStatsQuery()

  // Process real data
  const dashboardData = useMemo(() => {
    const reservations = reservationsData?.data || []
    const cars = carsData?.data || []
    const customers = usersData?.data || []

    // Use stats from dedicated endpoints for accurate metrics
    const carStatsData = carStats?.data?.overview || {}
    const reservationStatsData = reservationStats?.data || {}
    const paymentStatsData = paymentStats?.data?.overview || {}

    // Filter reservations for display purposes
    const confirmedReservations = reservations.filter(res => res.status === 'confirmed')
    const activeReservations = reservations.filter(res => ['confirmed', 'ongoing'].includes(res.status))
    
    // Calculate monthly revenue from payment stats (more accurate)
    const monthlyRevenue = paymentStatsData.totalAmount || 0

    // Calculate monthly chart data (all 12 months with 0 fallback)
    const currentYear = new Date().getFullYear()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
    
    // Use payment stats monthly data if available, otherwise calculate from reservations
    let monthlyRevenueData
    const paymentMonthlyData = paymentStats?.data?.monthlyData
    if (paymentMonthlyData && Array.isArray(paymentMonthlyData)) {
      // Use the payment stats monthly data (more accurate)
      monthlyRevenueData = monthNames.map((month, index) => {
        const monthData = paymentMonthlyData.find(d => d._id === index + 1)
        return {
          month,
          revenue: monthData?.totalAmount || 0
        }
      })
    } else {
      // Fallback to manual calculation from reservations (use startDate instead of createdAt for accuracy)
      monthlyRevenueData = Array.from({ length: 12 }, (_, index) => {
        const monthRevenue = confirmedReservations
          .filter(res => {
            const resDate = new Date(res.startDate) // Use startDate instead of createdAt
            return resDate.getFullYear() === currentYear && resDate.getMonth() === index
          })
          .reduce((sum, res) => sum + (res.pricing?.totalAmount || 0), 0)
        
        return {
          month: monthNames[index],
          revenue: monthRevenue
        }
      })
    }

    // Use accurate fleet stats from car stats endpoint
    const availableCars = carStatsData.availableCars || cars.filter(car => car.status === 'active').length
    const carsInMaintenance = carStatsData.maintenanceCars || cars.filter(car => car.status === 'maintenance').length
    const carsOutOfService = carStatsData.outOfServiceCars || cars.filter(car => car.status === 'out-of-service').length
    const bookedCars = reservationStatsData.ongoingReservations || activeReservations.length

    // Recent reservations (confirmed only, last 5)
    const recentReservations = confirmedReservations
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)

    return {
      stats: {
        monthlyRevenue,
        activeReservations: reservationStatsData.confirmedReservations || confirmedReservations.length,
        availableCars,
        totalCustomers: customers.length
      },
      fleetData: [
        { name: t('available'), value: availableCars, color: '#4caf50' },
        { name: t('booked'), value: bookedCars, color: '#2196f3' },
        { name: t('maintenance'), value: carsInMaintenance, color: '#ff9800' },
        { name: t('outOfService'), value: carsOutOfService, color: '#f44336' },
      ],
      monthlyRevenueData,
      recentReservations
    }
  }, [reservationsData, carsData, usersData, carStats, reservationStats, paymentStats])

  // Stats cards configuration
  const statsData = [
    {
      title: t('monthlyRevenue'),
      value: `${dashboardData.stats.monthlyRevenue.toFixed(0)}€`,
      icon: <RevenueIcon sx={{ fontSize: 40 }} />,
      color: '#4caf50',
      bgColor: '#e8f5e8',
    },
    {
      title: 'Potvrdené rezervácie',
      value: dashboardData.stats.activeReservations.toString(),
      icon: <ReservationIcon sx={{ fontSize: 40 }} />,
      color: '#2196f3',
      bgColor: '#e3f2fd',
    },
    {
      title: t('available'),
      value: dashboardData.stats.availableCars.toString(),
      icon: <CarIcon sx={{ fontSize: 40 }} />,
      color: '#ff9800',
      bgColor: '#fff3e0',
    },
    {
      title: t('totalCustomers'),
      value: dashboardData.stats.totalCustomers.toString(),
      icon: <CustomerIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      bgColor: '#f3e5f5',
    },
  ]

  // Loading state
  if (reservationsLoading || carsLoading || usersLoading || carStatsLoading || reservationStatsLoading || paymentStatsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  // Error state
  if (reservationsError || carsError || usersError) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Chyba pri načítavaní údajov: {reservationsError?.message || carsError?.message || usersError?.message}
      </Alert>
    )
  }

  return (
    <Box sx={{ 
      width: '100%',
      maxWidth: '1400px',
      margin: '0 auto',
      px: 3
    }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        {t('dashboard')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Vitajte späť!
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4, justifyContent: 'space-evenly', width: '100%' }}>
        {statsData.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 60,
                      height: 60,
                      borderRadius: 2,
                      backgroundColor: stat.bgColor,
                      color: stat.color,
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Monthly Revenue and Fleet Overview */}
      <Grid container spacing={3} sx={{ mb: 4, mt: 3, justifyContent: 'space-evenly', width: '100%' }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Mesačné tržby {new Date().getFullYear()}
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      fontSize={12}
                      tick={{ fill: '#666' }}
                    />
                    <YAxis
                      fontSize={12}
                      tick={{ fill: '#666' }}
                      tickFormatter={(value) => `${value}€`}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}€`, 'Tržby']}
                      labelStyle={{ color: '#333' }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#2196f3"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {t('fleetOverview')}
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.fleetData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {dashboardData.fleetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                {dashboardData.fleetData.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Confirmed Reservations */}
      <Card sx={{ mt: 3, width: '100%', maxWidth: '1200px' }}>
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: { xs: 'flex-start', sm: 'space-between' }, 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            mb: 2,
            gap: { xs: 1, sm: 0 }
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Nedávne potvrdené rezervácie
            </Typography>
            <Typography 
              variant="body2" 
              color="primary" 
              sx={{ cursor: 'pointer', fontWeight: 500 }}
            >
              {t('viewAll')}
            </Typography>
          </Box>
          {dashboardData.recentReservations.length === 0 ? (
            <Alert severity="info">
              Žiadne potvrdené rezervácie neboli nájdené.
            </Alert>
          ) : (
            <TableContainer sx={{ 
              overflowX: 'auto',
              maxWidth: { xs: 'calc(100vw - 64px)', sm: '100%' },
              width: '100%',
              '&::-webkit-scrollbar': {
                height: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#c1c1c1',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: '#a8a8a8',
              },
            }}>
              <Table sx={{ 
                minWidth: { xs: 800, sm: 'auto' },
                width: { xs: 800, sm: '100%' }
              }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{t('reservationId')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('customerName')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('carDetails')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('dateRange')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('status')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('amount')}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData.recentReservations.map((reservation) => (
                    <TableRow key={reservation._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {reservation.reservationNumber || reservation._id.slice(-8).toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {reservation.customer ? 
                          `${reservation.customer.firstName} ${reservation.customer.lastName}` :
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        {reservation.car ? 
                          `${reservation.car.brand} ${reservation.car.model}` :
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(reservation.startDate).toLocaleDateString()} - {new Date(reservation.endDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(reservation.status)}
                          size="small"
                          color={getStatusColor(reservation.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {reservation.pricing?.totalAmount?.toFixed(0) || '0'}€
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default Dashboard 