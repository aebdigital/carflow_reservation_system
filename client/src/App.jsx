import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Box, CircularProgress } from '@mui/material'
import { selectIsAuthenticated, loginSuccess, logout } from './store/authSlice'
import { useGetMeQuery } from './store/store'

// Components
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Reservations from './pages/Reservations'
import Cars from './pages/Cars'
import Customers from './pages/Customers'
import Calendar from './pages/Calendar'
import Payments from './pages/Payments'
import Campaigns from './pages/Campaigns'
import Contracts from './pages/Contracts'
import Settings from './pages/Settings'
import CustomerPortal from './pages/CustomerPortal'
import Layout from './components/Layout'

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const { user } = useSelector((state) => state.auth)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // If roles are specified, check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect based on user role
    if (user?.role === 'customer') {
      return <Navigate to="/customer-portal" replace />
    }
    return <Navigate to="/" replace />
  }
  
  return children
}

// Auth Route Component (redirect if already logged in)
const AuthRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const { user } = useSelector((state) => state.auth)
  
  if (!isAuthenticated) {
    return children
  }
  
  // Redirect based on role
  if (user?.role === 'customer') {
    return <Navigate to="/customer-portal" replace />
  }
  
  return <Navigate to="/" replace />
}

function App() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  
  // Get user data if authenticated
  const { data: userData, error, isLoading } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  })

  useEffect(() => {
    if (userData?.success) {
      dispatch(loginSuccess({ 
        user: userData.data, 
        token: localStorage.getItem('token') 
      }))
    }
    
    if (error && error.status === 401) {
      dispatch(logout())
    }
  }, [userData, error, dispatch])

  // Show loading spinner while checking authentication
  if (isAuthenticated && isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        } 
      />
      
      {/* Customer Portal - Only for customers */}
      <Route 
        path="/customer-portal" 
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerPortal />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin/Staff routes - Only for admin and staff */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="cars" element={<Cars />} />
        <Route path="customers" element={<Customers />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="payments" element={<Payments />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App 