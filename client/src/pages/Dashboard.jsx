import React from 'react'
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

// Mock data for demo
const statsData = [
  {
    title: t('monthlyRevenue'),
    value: '127 580 €',
    change: '+12.5%',
    icon: <RevenueIcon sx={{ fontSize: 40 }} />,
    color: '#4caf50',
    bgColor: '#e8f5e8',
  },
  {
    title: t('activeReservations'),
    value: '23',
    change: '+5.2%',
    icon: <ReservationIcon sx={{ fontSize: 40 }} />,
    color: '#2196f3',
    bgColor: '#e3f2fd',
  },
  {
    title: t('available'),
    value: '45',
    change: '-2.1%',
    icon: <CarIcon sx={{ fontSize: 40 }} />,
    color: '#ff9800',
    bgColor: '#fff3e0',
  },
  {
    title: t('totalCustomers'),
    value: '1,234',
    change: '+8.7%',
    icon: <CustomerIcon sx={{ fontSize: 40 }} />,
    color: '#9c27b0',
    bgColor: '#f3e5f5',
  },
]

const revenueData = [
  { month: 'Jan', revenue: 65000 },
  { month: 'Feb', revenue: 59000 },
  { month: 'Mar', revenue: 80000 },
  { month: 'Apr', revenue: 81000 },
  { month: 'Máj', revenue: 56000 },
  { month: 'Jún', revenue: 87000 },
]

const fleetData = [
  { name: t('available'), value: 45, color: '#4caf50' },
  { name: t('booked'), value: 23, color: '#2196f3' },
  { name: t('maintenance'), value: 7, color: '#ff9800' },
  { name: t('outOfService'), value: 3, color: '#f44336' },
]

const recentReservations = [
  {
    id: 'RES001234',
    customer: 'John Doe',
    car: '2023 Toyota Camry',
    startDate: '2024-01-15',
    endDate: '2024-01-20',
    status: 'confirmed',
    amount: '380 €',
  },
  {
    id: 'RES001235',
    customer: 'Jane Smith',
    car: '2023 Honda Accord',
    startDate: '2024-01-16',
    endDate: '2024-01-18',
    status: 'ongoing',
    amount: '240 €',
  },
  {
    id: 'RES001236',
    customer: 'Mike Johnson',
    car: '2023 BMW X5',
    startDate: '2024-01-17',
    endDate: '2024-01-22',
    status: 'pending',
    amount: '950 €',
  },
  {
    id: 'RES001237',
    customer: 'Sarah Wilson',
    car: '2023 Mercedes C-Class',
    startDate: '2024-01-18',
    endDate: '2024-01-25',
    status: 'confirmed',
    amount: '1 260 €',
  },
]

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
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        {t('dashboard')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Vitajte späť! Tu je to, co sa deje s vaším prenájmom áut dnes.
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon 
                    sx={{ 
                      fontSize: 16, 
                      color: stat.change.startsWith('+') ? 'success.main' : 'error.main',
                      mr: 0.5 
                    }} 
                  />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: stat.change.startsWith('+') ? 'success.main' : 'error.main',
                      fontWeight: 600 
                    }}
                  >
                    {stat.change}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                    vs minulý mesiac
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {t('monthlyRevenue')}
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} €`, 'Tržby']} />
                    <Bar dataKey="revenue" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Fleet Overview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {t('fleetOverview')}
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fleetData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {fleetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                {fleetData.map((item, index) => (
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

      {/* Recent Reservations */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('recentReservations')}
            </Typography>
            <Typography 
              variant="body2" 
              color="primary" 
              sx={{ cursor: 'pointer', fontWeight: 500 }}
            >
              {t('viewAll')}
            </Typography>
          </Box>
          <TableContainer>
            <Table>
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
                {recentReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {reservation.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{reservation.customer}</TableCell>
                    <TableCell>{reservation.car}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {reservation.startDate} - {reservation.endDate}
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
                        {reservation.amount}
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
        </CardContent>
      </Card>
    </Box>
  )
}

export default Dashboard 