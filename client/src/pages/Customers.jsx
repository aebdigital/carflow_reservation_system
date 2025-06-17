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

  // Form validation
  const validateForm = () => {
    const errors = {}
    
    if (!formData.firstName.trim()) errors.firstName = t('firstNameRequired')
    if (!formData.lastName.trim()) errors.lastName = t('lastNameRequired')
    if (!formData.email.trim()) errors.email = t('emailRequired')
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = t('emailInvalid')
    
    // Phone number validation to match server regex: /^[\+]?[1-9][\d]{0,15}$/
    if (!formData.phone.trim()) {
      errors.phone = t('phoneRequired')
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.trim())) {
      errors.phone = t('phoneInvalid')
    }
    
    // Password is required for new users
    if (dialogMode === 'create' && !formData.password.trim()) {
      errors.password = 'Password is required'
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    // Customer-specific validations
    if (formData.role === 'customer') {
      if (!formData.licenseNumber.trim()) errors.licenseNumber = 'License number is required for customers'
      if (!formData.licenseExpiry) errors.licenseExpiry = 'License expiry date is required for customers'
      if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required for customers'
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
          throw new Error('Date of birth is required for customers')
        }
        if (!customerData.licenseExpiry) {
          throw new Error('License expiry is required for customers')
        }
        if (!customerData.licenseNumber) {
          throw new Error('License number is required for customers')
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
    const reason = prompt('Enter reason for blacklisting this customer:')
    if (reason) {
      try {
        await blacklistUser({ 
          id: customer._id, 
          reason 
        }).unwrap()
      } catch (error) {
        console.error('Error blacklisting customer:', error)
        alert('Failed to blacklist customer')
      }
    }
  }

  const renderCustomerTable = (customers) => (
    <TableContainer>
      <Table>
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
                  label={customer.status || 'active'}
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
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
          {dialogMode === 'create' ? 'Add New Customer' : 
           dialogMode === 'edit' ? 'Edit Customer' : 'Customer Details'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' && selectedCustomer ? (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, fontSize: '1.5rem' }}>
                    {selectedCustomer.firstName?.[0]}{selectedCustomer.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h5">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </Typography>
                    <Chip
                      label={selectedCustomer.status || 'active'}
                      color={getStatusColor(selectedCustomer.status)}
                      size="small"
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Contact Information</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Email: {selectedCustomer.email}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Phone: {selectedCustomer.phone || 'Not provided'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Member since: {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>License Information</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  License Number: {selectedCustomer.licenseNumber || 'Not provided'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  License Expiry: {selectedCustomer.licenseExpiry ? new Date(selectedCustomer.licenseExpiry).toLocaleDateString() : 'Not provided'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Booking Statistics</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Reservations: {getCustomerReservationCount(selectedCustomer._id)}
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Personal Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
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
                  label="Last Name"
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
                  label="Phone Number"
                  placeholder="e.g., +1234567890 or 1234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.phone}
                  helperText={formErrors.phone || 'Format: +1234567890 or 1234567890 (no spaces/dashes)'}
                  required
                />
              </Grid>
              {dialogMode === 'create' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Password"
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
                  label="Date of Birth"
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
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={dialogMode === 'view'}
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="blacklisted">Blacklisted</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* License Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  License Information
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="License Number"
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
                  label="License Expiry"
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
                  Address Information
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
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
                  label="City"
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
                  label="State"
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
                  label="Country"
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
                  Emergency Contact
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Emergency Contact Name"
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
                  label="Relationship"
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
                  label="Emergency Contact Phone"
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
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={creating || updating}
            >
              {creating || updating ? <CircularProgress size={20} /> : 
               dialogMode === 'create' ? 'Add Customer' : 'Update Customer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Customers 