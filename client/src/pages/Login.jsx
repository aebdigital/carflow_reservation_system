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
import { t } from '../utils/translations'

const demoAccounts = [
  {
    role: t('admin'),
    email: 'admin@example.com',
    password: 'admin123',
    description: t('fullAccess'),
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
      setError(err?.data?.message || t('loginFailed'))
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
        background: 'linear-gradient(to bottom, rgba(248, 250, 252, 0) 0%, rgba(248, 250, 252, 0.8) 50%, rgba(248, 250, 252, 1) 100%), linear-gradient(135deg, rgb(25, 118, 210) 0%, rgb(100, 181, 246) 100%)',
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
                {t('demoAccounts')}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t('clickAccountToFill')}
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
                        background: 'linear-gradient(135deg, rgb(25, 118, 210) 0%, rgb(100, 181, 246) 100%)',
                        color: 'white',
                        borderColor: 'transparent',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
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
                {t('demoAppNote')}
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
                  background: 'linear-gradient(135deg, rgb(25, 118, 210) 0%, rgb(100, 181, 246) 100%)',
                  color: 'white',
                  mb: 2,
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                }}
              >
                <CarIcon fontSize="large" />
              </Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                {t('welcomeBack')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t('signInToAdmin')}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label={t('email')}
                name="email"
                autoComplete="email"
                autoFocus
                {...register('email', {
                  required: t('required'),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t('invalidEmail'),
                  },
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label={t('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                {...register('password', {
                  required: t('required'),
                  minLength: {
                    value: 6,
                    message: t('passwordTooShort'),
                  },
                })}
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={togglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 3, 
                  mb: 2, 
                  py: 1.5,
                  background: 'linear-gradient(135deg, rgb(25, 118, 210) 0%, rgb(100, 181, 246) 100%)',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgb(21, 101, 192) 0%, rgb(79, 172, 254) 100%)',
                    boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                  },
                  '&:active': {
                    background: 'linear-gradient(135deg, rgb(13, 71, 161) 0%, rgb(66, 165, 245) 100%)',
                  },
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  t('signIn')
                )}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}

export default Login 