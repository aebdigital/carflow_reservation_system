import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Avatar,
  FormHelperText,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  InputAdornment
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as LicenseIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material'
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useBlacklistUserMutation,
  useGetReservationsQuery
} from '../store/store'
import { t } from '../utils/translations'

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

function Customers() {
  const [tabValue, setTabValue] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [searchQuery, setSearchQuery] = useState('')

  // Initial form state
  const initialFormState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: null,
    licenseNumber: '',
    licenseExpiry: null,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    preferences: {
      carType: '',
      transmission: '',
      notifications: {
        email: true,
        sms: false,
        promotions: false
      }
    },
    role: 'customer',
    status: 'active'
  }

  const [formData, setFormData] = useState(initialFormState)
  const [formErrors, setFormErrors] = useState({})

  // API hooks
  const { 
    data: usersData, 
    isLoading: usersLoading, 
    error: usersError 
  } = useGetUsersQuery({ role: 'customer' })

  const { 
    data: reservationsData 
  } = useGetReservationsQuery({})

  const [createUser, { isLoading: creating }] = useCreateUserMutation()
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation()
  const [blacklistUser] = useBlacklistUserMutation()

  const users = usersData?.data || []
  const reservations = reservationsData?.data || []

  // Phone number formatter - removes all non-digit characters except + at the start
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters except + at the beginning
    let cleaned = value.replace(/[^\d+]/g, '')
    
    // Ensure + only appears at the beginning
    if (cleaned.includes('+')) {
      const plusCount = (cleaned.match(/\+/g) || []).length
      if (plusCount > 1 || cleaned.indexOf('+') !== 0) {
        cleaned = cleaned.replace(/\+/g, '')
      }
    }
    
    // Limit to 16 characters total
    return cleaned.slice(0, 16)
  }

  // Filter customers based on search query
  const filteredCustomers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query) ||
      user.licenseNumber?.toLowerCase().includes(query)
    )
  })

  // Filter customers by status for tabs
  const getCustomersByStatus = (status) => {
    if (status === 'all') return filteredCustomers
    return filteredCustomers.filter(customer => customer.status === status)
  }

  // Get customer reservation count
  const getCustomerReservationCount = (customerId) => {
    return reservations.filter(reservation => 
      reservation.customer?._id === customerId &&
      reservation.status !== 'cancelled'
    ).length
  }

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      inactive: 'warning',
      blacklisted: 'error',
      pending: 'info'
    }
    return colors[status] || 'default'
  }

  // Status text mapping
  const getStatusText = (status) => {
    const statusTexts = {
      active: t('active'),
      inactive: t('inactive'),
      blacklisted: t('blacklisted'),
      pending: t('pending')
    }
    return statusTexts[status] || status
  }

  // Form validation
  const validateForm = () => {
    const errors = {}
    
    if (!formData.firstName.trim()) errors.firstName = 'Meno je povinné'
    if (!formData.lastName.trim()) errors.lastName = 'Priezvisko je povinné'
    if (!formData.email.trim()) errors.email = 'Email je povinný'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Neplatný email formát'
    
    // Phone number validation to match server regex: /^[\+]?[1-9][\d]{0,15}$/
    if (!formData.phone.trim()) {
      errors.phone = 'Telefónne číslo je povinné'
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.trim())) {
      errors.phone = 'Neplatný formát telefónneho čísla'
    }
    
    // Password is required for new users
    if (dialogMode === 'create' && !formData.password.trim()) {
      errors.password = 'Heslo je povinné'
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Heslo musí mať aspoň 6 znakov'
    }
    
    // Customer-specific validations
    if (formData.role === 'customer') {
      if (!formData.licenseNumber.trim()) errors.licenseNumber = 'Číslo vodičského preukazu je povinné pre zákazníkov'
      if (!formData.licenseExpiry) errors.licenseExpiry = 'Platnosť vodičského preukazu je povinná pre zákazníkov'
      if (!formData.dateOfBirth) errors.dateOfBirth = 'Dátum narodenia je povinný pre zákazníkov'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      const customerData = {
        ...formData,
        // Only include these fields if they have values
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
        licenseExpiry: formData.licenseExpiry ? new Date(formData.licenseExpiry).toISOString() : undefined
      }

      // For edit mode, don't include password if it's empty
      if (dialogMode === 'edit' && !formData.password.trim()) {
        delete customerData.password
      }

      // Remove undefined fields
      Object.keys(customerData).forEach(key => {
        if (customerData[key] === undefined) {
          delete customerData[key]
        }
      })

      // For customers, ensure required fields are present
      if (customerData.role === 'customer') {
        if (!customerData.dateOfBirth) {
          throw new Error('Dátum narodenia je povinný pre zákazníkov')
        }
        if (!customerData.licenseExpiry) {
          throw new Error('Platnosť vodičského preukazu je povinná pre zákazníkov')
        }
        if (!customerData.licenseNumber) {
          throw new Error('Číslo vodičského preukazu je povinné pre zákazníkov')
        }
      }

      console.log('Sending customer data:', customerData)

      if (dialogMode === 'create') {
        await createUser(customerData).unwrap()
      } else if (dialogMode === 'edit') {
        await updateUser({ 
          id: selectedCustomer._id, 
          ...customerData 
        }).unwrap()
      }

      handleCloseDialog()
    } catch (error) {
      console.error('Error saving customer:', error)
      const errorMessage = error?.data?.message || error?.message || t('failedToSaveCustomer')
      alert(`${t('errorSavingCustomer')}: ${errorMessage}`)
    }
  }

  // Dialog handlers
  const handleOpenDialog = (mode, customer = null) => {
    setDialogMode(mode)
    setSelectedCustomer(customer)
    
    if (mode === 'create') {
      setFormData(initialFormState)
    } else if (mode === 'edit' && customer) {
      setFormData({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        password: '', // Don't pre-fill password for editing
        dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split('T')[0] : null,
        licenseNumber: customer.licenseNumber || '',
        licenseExpiry: customer.licenseExpiry ? new Date(customer.licenseExpiry).toISOString().split('T')[0] : null,
        address: customer.address || initialFormState.address,
        emergencyContact: customer.emergencyContact || initialFormState.emergencyContact,
        preferences: customer.preferences || initialFormState.preferences,
        role: customer.role || 'customer',
        status: customer.status || 'active'
      })
    } else if (mode === 'view' && customer) {
      setSelectedCustomer(customer)
    }
    
    setFormErrors({})
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedCustomer(null)
    setFormData(initialFormState)
    setFormErrors({})
  }

  // Action handlers
  const handleBlacklist = async (customer) => {
    const reason = prompt('Zadajte dôvod zaradenia tohto zákazníka na čiernu listinu:')
    if (reason) {
      try {
        await blacklistUser({ 
          id: customer._id, 
          reason 
        }).unwrap()
      } catch (error) {
        console.error('Error blacklisting customer:', error)
        alert('Nepodarilo sa zaradiť zákazníka na čiernu listinu')
      }
    }
  }

  const renderCustomerTable = (customers) => (
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
            <TableCell>{t('customer')}</TableCell>
            <TableCell>{t('contact')}</TableCell>
            <TableCell>{t('license')}</TableCell>
            <TableCell>{t('reservations')}</TableCell>
            <TableCell>{t('status')}</TableCell>
            <TableCell>{t('joined')}</TableCell>
            <TableCell>{t('actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer._id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {customer.firstName?.[0]}{customer.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {customer.firstName} {customer.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {customer._id.slice(-8).toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="body2">{customer.email}</Typography>
                  </Box>
                  {customer.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2">{customer.phone}</Typography>
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                {customer.licenseNumber ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LicenseIcon fontSize="small" color="action" />
                    <Typography variant="body2">{customer.licenseNumber}</Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t('notProvided')}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip
                  label={`${getCustomerReservationCount(customer._id)} ${t('bookings')}`}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={getStatusText(customer.status)}
                  color={getStatusColor(customer.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title={t('viewDetails')}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog('view', customer)}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('edit')}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog('edit', customer)}
                      disabled={customer.status === 'blacklisted'}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {customer.status !== 'blacklisted' && (
                    <Tooltip title={t('blacklist')}>
                      <IconButton
                        size="small"
                        onClick={() => handleBlacklist(customer)}
                        color="error"
                      >
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: { xs: 'flex-start', sm: 'space-between' }, 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 3,
        gap: { xs: 2, sm: 0 }
      }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            {t('customerManagement')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('manageCustomerAccounts')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
          size="large"
          sx={{ 
            alignSelf: { xs: 'flex-start', sm: 'auto' },
            mt: { xs: 1, sm: 0 }
          }}
        >
          {t('addCustomer')}
        </Button>
      </Box>

      {/* Search Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder={t('searchCustomersPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label={`${t('allCustomers')} (${getCustomersByStatus('all').length})`} />
            <Tab label={`${t('activeCustomers')} (${getCustomersByStatus('active').length})`} />
            <Tab label={`${t('inactiveCustomers')} (${getCustomersByStatus('inactive').length})`} />
            <Tab label={`${t('blacklistedCustomers')} (${getCustomersByStatus('blacklisted').length})`} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {usersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : usersError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {t('errorLoadingCustomers')}: {usersError.message}
            </Alert>
          ) : (
            renderCustomerTable(getCustomersByStatus('all'))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {usersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderCustomerTable(getCustomersByStatus('active'))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {usersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderCustomerTable(getCustomersByStatus('inactive'))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {usersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderCustomerTable(getCustomersByStatus('blacklisted'))
          )}
        </TabPanel>
      </Card>

      {/* Create/Edit Customer Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Pridať nového zákazníka' :
           dialogMode === 'edit' ? 'Upraviť zákazníka' : 'Detaily zákazníka'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' && selectedCustomer ? (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Osobné informácie</Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Email: {selectedCustomer.email}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Telefón: {selectedCustomer.phone || 'Neuvedené'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Člen od: {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Informácie o vodičskom preukaze</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Číslo preukazu: {selectedCustomer.licenseNumber || 'Neuvedené'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Platnosť preukazu: {selectedCustomer.licenseExpiry ? new Date(selectedCustomer.licenseExpiry).toLocaleDateString() : 'Neuvedené'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Štatistiky rezervácií</Typography>
                <Typography variant="body2" color="text.secondary">
                  Celkom rezervácií: {getCustomerReservationCount(selectedCustomer._id)}
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Personal Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Osobné informácie
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Meno"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.firstName}
                  helperText={formErrors.firstName}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Priezvisko"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.lastName}
                  helperText={formErrors.lastName}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefónne číslo"
                  placeholder="napr., +421123456789 alebo 0901123456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.phone}
                  helperText={formErrors.phone || 'Formát: +421123456789 alebo 0901123456 (bez medzier/pomlčiek)'}
                  required
                />
              </Grid>
              {dialogMode === 'create' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Heslo"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={dialogMode === 'view'}
                    error={!!formErrors.password}
                    helperText={formErrors.password}
                    required
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dátum narodenia"
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.dateOfBirth}
                  helperText={formErrors.dateOfBirth}
                  required={formData.role === 'customer'}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Stav</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={dialogMode === 'view'}
                    label="Stav"
                  >
                    <MenuItem value="active">Aktívny</MenuItem>
                    <MenuItem value="inactive">Neaktívny</MenuItem>
                    <MenuItem value="pending">Čakajúci</MenuItem>
                    <MenuItem value="blacklisted">Na čiernej listine</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* License Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Informácie o vodičskom preukaze
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Číslo vodičského preukazu"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.licenseNumber}
                  helperText={formErrors.licenseNumber}
                  required={formData.role === 'customer'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Platnosť preukazu"
                  type="date"
                  value={formData.licenseExpiry || ''}
                  onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.licenseExpiry}
                  helperText={formErrors.licenseExpiry}
                  required={formData.role === 'customer'}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              {/* Address Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Adresa
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Ulica a číslo"
                  value={formData.address.street}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, street: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Mesto"
                  value={formData.address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Región/Kraj"
                  value={formData.address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, state: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Krajina"
                  value={formData.address.country}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, country: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>

              {/* Emergency Contact */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Núdzový kontakt
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Meno núdzového kontaktu"
                  value={formData.emergencyContact.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Vzťah"
                  value={formData.emergencyContact.relationship}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Telefón núdzového kontaktu"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {dialogMode === 'view' ? 'Zavrieť' : 'Zrušiť'}
          </Button>
          {dialogMode !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={creating || updating}
            >
              {creating || updating ? <CircularProgress size={20} /> : 
               dialogMode === 'create' ? 'Pridať zákazníka' : 'Aktualizovať zákazníka'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Customers 