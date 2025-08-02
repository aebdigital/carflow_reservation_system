import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Box, CircularProgress } from '@mui/material'
import { selectIsAuthenticated, loginSuccess, clearStateOnLogout } from './store/authSlice'
import { useGetMeQuery, api } from './store/store'

// Tenant separation implemented - users now have isolated data
// Components
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Reservations from './pages/Reservations'
import Cars from './pages/Cars'
import AdditionalServices from './pages/AdditionalServices'
import Customers from './pages/Customers'
import Calendar from './pages/Calendar'
import Payments from './pages/Payments'
import Campaigns from './pages/Campaigns'
import Contracts from './pages/Contracts'
import Settings from './pages/Settings'
import Website from './pages/Website'
import CustomerPortal from './pages/CustomerPortal'
import Layout from './components/Layout'

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [], restrictedForUsers = [] }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const { user } = useSelector((state) => state.auth)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // Check if current user is restricted from accessing this route
  if (restrictedForUsers.length > 0 && restrictedForUsers.includes(user?.email)) {
    console.log('🔐 [ROUTE PROTECTION] Access denied for user:', user?.email);
    return <Navigate to="/" replace />
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
  
  // Get user data if authenticated - force refetch on every authentication change
  const { data: userData, error, isLoading, refetch } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
    // Force refetch when authentication status changes to prevent stale data
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true
  })

  useEffect(() => {
    if (userData?.success) {
      dispatch(loginSuccess({ 
        user: userData.data, 
        token: localStorage.getItem('token') 
      }))
    }
    
    if (error && error.status === 401) {
      // Clear RTK Query cache and auth state on authentication error
      dispatch(api.util.resetApiState())
      dispatch(clearStateOnLogout())
    }
  }, [userData, error, dispatch])

  // Force refetch user data when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      // Small delay to ensure token is set
      setTimeout(() => {
        refetch()
      }, 100)
    }
  }, [isAuthenticated, refetch])

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
        <Route path="additional-services" element={<AdditionalServices />} />
        <Route path="customers" element={<Customers />} />
        <Route path="calendar" element={<Calendar />} />
        <Route 
          path="payments" 
          element={
            <ProtectedRoute restrictedForUsers={['rival@test.sk']}>
              <Payments />
            </ProtectedRoute>
          } 
        />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="website" element={<Website />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App 