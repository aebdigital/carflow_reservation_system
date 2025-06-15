import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material'
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  DirectionsCar as CarIcon,
} from '@mui/icons-material'
import { useLoginMutation } from '../store/store'
import { loginSuccess } from '../store/authSlice'

const demoAccounts = [
  {
    role: 'Admin',
    email: 'admin@example.com',
    password: 'admin123',
    description: 'Full access to all features',
  },
  {
    role: 'Customer - John',
    email: 'john@example.com',
    password: 'customer123',
    description: 'Customer account access',
  },
  {
    role: 'Customer - Jane',
    email: 'jane@example.com',
    password: 'customer123',
    description: 'Customer account access',
  },
]

function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [login, { isLoading }] = useLoginMutation()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    try {
      setError('')
      const result = await login(data).unwrap()
      
      if (result.success) {
        dispatch(loginSuccess(result))
        
        // Role-based redirection
        const userRole = result.user?.role
        
        switch (userRole) {
          case 'admin':
          case 'staff':
            navigate('/')  // Admin dashboard
            break
          case 'customer':
            navigate('/customer-portal')  // Customer portal (we'll create this)
            break
          default:
            navigate('/')
        }
      }
    } catch (err) {
      setError(err?.data?.message || 'Login failed. Please try again.')
    }
  }

  const handleDemoLogin = (email, password) => {
    setValue('email', email)
    setValue('password', password)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* Demo Accounts Card */}
          <Card sx={{ flex: 1, display: { xs: 'none', md: 'block' } }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Demo Accounts
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Click on any account below to auto-fill the login form:
              </Typography>
              
              {demoAccounts.map((account, index) => (
                <Box key={index}>
                  <Box
                    onClick={() => handleDemoLogin(account.email, account.password)}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: '1px solid #e0e0e0',
                      mb: 2,
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {account.role}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {account.email}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {account.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
              
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                💡 This is a demo application. All data is simulated.
              </Typography>
            </CardContent>
          </Card>

          {/* Login Form */}
          <Paper
            elevation={10}
            sx={{
              flex: 1,
              maxWidth: 500,
              p: 4,
              borderRadius: 3,
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  color: 'white',
                  mb: 2,
                }}
              >
                <CarIcon fontSize="large" />
              </Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
                Welcome Back
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in to your admin account
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={togglePasswordVisibility} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                error={!!errors.password}
                helperText={errors.password?.message}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Sign In'
                )}
              </Button>
            </Box>

            {/* Mobile Demo Accounts */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Demo Accounts:
              </Typography>
              {demoAccounts.map((account, index) => (
                <Button
                  key={index}
                  fullWidth
                  variant="outlined"
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  sx={{ mb: 1, justifyContent: 'flex-start' }}
                >
                  {account.role} - {account.email}
                </Button>
              ))}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}

export default Login 