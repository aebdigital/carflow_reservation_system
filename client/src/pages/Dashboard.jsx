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

// Mock data for demo
const statsData = [
  {
    title: 'Total Revenue',
    value: '$127,580',
    change: '+12.5%',
    icon: <RevenueIcon sx={{ fontSize: 40 }} />,
    color: '#4caf50',
    bgColor: '#e8f5e8',
  },
  {
    title: 'Active Reservations',
    value: '23',
    change: '+5.2%',
    icon: <ReservationIcon sx={{ fontSize: 40 }} />,
    color: '#2196f3',
    bgColor: '#e3f2fd',
  },
  {
    title: 'Available Cars',
    value: '45',
    change: '-2.1%',
    icon: <CarIcon sx={{ fontSize: 40 }} />,
    color: '#ff9800',
    bgColor: '#fff3e0',
  },
  {
    title: 'Total Customers',
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
  { month: 'May', revenue: 56000 },
  { month: 'Jun', revenue: 87000 },
]

const fleetData = [
  { name: 'Available', value: 45, color: '#4caf50' },
  { name: 'Rented', value: 23, color: '#2196f3' },
  { name: 'Maintenance', value: 7, color: '#ff9800' },
  { name: 'Out of Service', value: 3, color: '#f44336' },
]

const recentReservations = [
  {
    id: 'RES001234',
    customer: 'John Doe',
    car: '2023 Toyota Camry',
    startDate: '2024-01-15',
    endDate: '2024-01-20',
    status: 'confirmed',
    amount: '$380',
  },
  {
    id: 'RES001235',
    customer: 'Jane Smith',
    car: '2023 Honda Accord',
    startDate: '2024-01-16',
    endDate: '2024-01-18',
    status: 'ongoing',
    amount: '$240',
  },
  {
    id: 'RES001236',
    customer: 'Mike Johnson',
    car: '2023 BMW X5',
    startDate: '2024-01-17',
    endDate: '2024-01-22',
    status: 'pending',
    amount: '$950',
  },
  {
    id: 'RES001237',
    customer: 'Sarah Wilson',
    car: '2023 Mercedes C-Class',
    startDate: '2024-01-18',
    endDate: '2024-01-25',
    status: 'confirmed',
    amount: '$1,260',
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

function Dashboard() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome back! Here's what's happening with your car rental business today.
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
                    vs last month
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Monthly Revenue
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#1976d2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Fleet Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Fleet Status
              </Typography>
              <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fleetData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {fleetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
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
              Recent Reservations
            </Typography>
            <Chip label="View All" clickable color="primary" size="small" />
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reservation ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentReservations.map((reservation) => (
                  <TableRow key={reservation.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {reservation.id}
                    </TableCell>
                    <TableCell>{reservation.customer}</TableCell>
                    <TableCell>{reservation.car}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {reservation.startDate} to {reservation.endDate}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={reservation.status} 
                        color={getStatusColor(reservation.status)}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {reservation.amount}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary">
                        <ViewIcon />
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