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
  Autocomplete,
  FormHelperText,
  Divider,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckInIcon,
  ExitToApp as CheckOutIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Assignment as SlovakAgreementIcon,
  CheckCircleOutline as ConfirmIcon,
  QrCode as QrCodeIcon,
  Payment as PaymentIcon,
  Email as EmailIcon,
} from '@mui/icons-material'
import {
  useGetReservationsQuery,
  useCreateReservationMutation,
  useUpdateReservationMutation,
  useCancelReservationMutation,
  useDeleteReservationMutation,
  useConfirmReservationMutation,
  useConfirmReservationPaymentMutation,
  useSendPaymentNotificationMutation,
  useCheckInReservationMutation,
  useCheckOutReservationMutation,
  useGetCarsQuery,
  useGetUsersQuery,
  useGetPaymentsQuery,
  useGenerateReservationSlovakAgreementMutation,
  useCreateUserMutation,
} from '../store/store'
import { useNavigate } from 'react-router-dom'
import { t } from '../utils/translations'
import QRCodeDisplay from '../components/QRCodeDisplay'
import { useSelector } from 'react-redux'

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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

function Reservations() {
  // Debug: Check authentication state
  const auth = useSelector((state) => state.auth)
  console.log('🔐 [AUTH DEBUG] Current auth state:', {
    isAuthenticated: !!auth.token,
    user: auth.user,
    tokenExists: !!auth.token,
    tokenLength: auth.token ? auth.token.length : 0,
    userRole: auth.user?.role
  })

  const [tabValue, setTabValue] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedReservationForQR, setSelectedReservationForQR] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [reservationToDelete, setReservationToDelete] = useState(null)
  
  // Customer creation state
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerFormData, setCustomerFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: null,
    licenseNumber: '',
    licenseExpiry: null,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  })
  const [customerFormErrors, setCustomerFormErrors] = useState({})

  // Initial form state
  const initialFormState = {
    customer: null,
    car: null,
    startDate: null,
    endDate: null,
    pickupLocation: {
      name: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      }
    },
    dropoffLocation: {
      name: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      }
    },
    additionalDrivers: [],
    specialRequests: '',
    status: 'pending'
  }

  const [formData, setFormData] = useState(initialFormState)
  const [formErrors, setFormErrors] = useState({})

  // API hooks
  const { 
    data: reservationsData, 
    isLoading: reservationsLoading, 
    error: reservationsError 
  } = useGetReservationsQuery({ populate: 'customer,car,payment,selectedServices.service,selectedServices._id,selectedAdditionalInsurance.insuranceId,selectedExtendedInsurance.insuranceId' })

  const { 
    data: carsData, 
    isLoading: carsLoading 
  } = useGetCarsQuery({ status: 'active' })

  const { 
    data: usersData, 
    isLoading: usersLoading 
  } = useGetUsersQuery({ role: 'customer' })

  const { 
    data: paymentsData, 
    isLoading: paymentsLoading 
  } = useGetPaymentsQuery({ populate: 'reservation' })

  const [createReservation, { isLoading: creating }] = useCreateReservationMutation()
  const [updateReservation, { isLoading: updating }] = useUpdateReservationMutation()
  const [cancelReservation] = useCancelReservationMutation()
  const [deleteReservation] = useDeleteReservationMutation()
  const [confirmReservation] = useConfirmReservationMutation()
  const [confirmReservationPayment] = useConfirmReservationPaymentMutation()
  const [sendPaymentNotification] = useSendPaymentNotificationMutation()
  const [checkInReservation] = useCheckInReservationMutation()
  const [checkOutReservation] = useCheckOutReservationMutation()
  const [generateSlovakAgreement] = useGenerateReservationSlovakAgreementMutation()
  const [createUser, { isLoading: creatingUser }] = useCreateUserMutation()

  const reservations = reservationsData?.data || []
  const cars = carsData?.data || []
  const users = usersData?.data || []
  const payments = paymentsData?.data || []

  // Debug: Log all reservation statuses
  React.useEffect(() => {
    if (reservations.length > 0) {
      console.log('=== RESERVATION STATUSES DEBUG ===');
      reservations.forEach(r => {
        console.log(`Reservation ${r.reservationNumber}: status = "${r.status}"`);
      });
      console.log('Available statuses in enum:', ['pending', 'confirmed', 'zaplatene', 'ongoing', 'completed', 'cancelled', 'no-show']);
    }
  }, [reservations]);

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      zaplatene: 'success',
      ongoing: 'primary',
      completed: 'success',
      cancelled: 'error',
      'no-show': 'error'
    }
    return colors[status] || 'default'
  }

  // Status text mapping
  const getStatusText = (status) => {
    const statusTexts = {
      pending: t('pending'),
      confirmed: t('confirmed'),
      zaplatene: 'Zaplatené',
      ongoing: t('ongoing'),
      completed: t('completed'),
      cancelled: t('cancelled'),
      'no-show': 'Neprišiel'
    }
    return statusTexts[status] || status
  }

  // Form validation
  const validateForm = () => {
    const errors = {}
    
    if (!formData.customer) errors.customer = t('customer_required')
    if (!formData.car) errors.car = t('car_required')
    if (!formData.startDate) errors.startDate = t('start_date_required')
    if (!formData.endDate) errors.endDate = t('end_date_required')
    if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
      errors.endDate = t('end_date_must_be_after_start_date')
    }
    if (!formData.pickupLocation.name) errors.pickupLocationName = t('pickup_location_required')
    if (!formData.dropoffLocation.name) errors.dropoffLocationName = t('dropoff_location_required')

    // Additional validation
    if (formData.startDate && formData.startDate < new Date()) {
      errors.startDate = t('start_date_cannot_be_in_the_past')
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      // Prepare only the required fields for the server
      const reservationData = {
        customer: formData.customer._id,
        car: formData.car._id,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        additionalDrivers: formData.additionalDrivers || [],
        specialRequests: formData.specialRequests || ''
      }

      console.log('Sending reservation data:', reservationData)

      if (dialogMode === 'create') {
        await createReservation(reservationData).unwrap()
      } else if (dialogMode === 'edit') {
        await updateReservation({ 
          id: selectedReservation._id, 
          ...reservationData 
        }).unwrap()
      }

      handleCloseDialog()
    } catch (error) {
      console.error('Error saving reservation:', error)
      console.error('Error details:', error.data || error.message)
      
      // Show user-friendly error message
      if (error.data && error.data.message) {
        alert(`Error: ${error.data.message}`)
      } else {
        alert(t('an_error_occurred_while_saving_the_reservation_please_check_the_console_for_details'))
      }
    }
  }

  // Dialog handlers
  const handleOpenDialog = (mode, reservation = null) => {
    setDialogMode(mode)
    setSelectedReservation(reservation)
    
    // Debug: Log reservation data (can be removed in production)
    if (reservation && process.env.NODE_ENV === 'development') {
      console.log('🔍 [RESERVATION DEBUG] Full reservation data:', reservation)
      console.log('🔍 [RESERVATION DEBUG] Pricing data:', reservation.pricing)
      console.log('🔍 [RESERVATION DEBUG] Selected services:', reservation.selectedServices)
      console.log('🔍 [RESERVATION DEBUG] Selected insurance:', reservation.selectedInsurance)
    }
    
    if (mode === 'create') {
      setFormData(initialFormState)
    } else if ((mode === 'edit' || mode === 'view') && reservation) {
      setFormData({
        customer: reservation.customer,
        car: reservation.car,
        startDate: new Date(reservation.startDate),
        endDate: new Date(reservation.endDate),
        pickupLocation: reservation.pickupLocation || {
          name: '',
          address: { street: '', city: '', state: '', zipCode: '', country: '' }
        },
        dropoffLocation: reservation.dropoffLocation || {
          name: '',
          address: { street: '', city: '', state: '', zipCode: '', country: '' }
        },
        additionalDrivers: reservation.additionalDrivers || [],
        specialRequests: reservation.specialRequests || '',
        status: reservation.status,
        pricing: reservation.pricing || {},
        selectedServices: reservation.selectedServices || [],
        selectedAdditionalInsurance: reservation.selectedAdditionalInsurance || [],
        selectedExtendedInsurance: reservation.selectedExtendedInsurance || [],
        servicesTotal: reservation.servicesTotal || 0,
        discountCode: reservation.discountCode || '',
        insurancePrices: reservation.insurancePrices || {},
        extendedInsurancePrices: reservation.extendedInsurancePrices || {},
        terms: reservation.terms || {},
        checkIn: reservation.checkIn || {},
        checkOut: reservation.checkOut || {},
        notes: reservation.notes || '',
        rating: reservation.rating || {},
        notifications: reservation.notifications || {}
      })
    }
    
    setFormErrors({})
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedReservation(null)
    setFormData(initialFormState)
    setFormErrors({})
  }

  // Customer creation handlers
  const handleOpenCustomerDialog = () => {
    setCustomerDialogOpen(true)
    setCustomerFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: null,
      licenseNumber: '',
      licenseExpiry: null,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      }
    })
    setCustomerFormErrors({})
  }

  const handleCloseCustomerDialog = () => {
    setCustomerDialogOpen(false)
    setCustomerFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: null,
      licenseNumber: '',
      licenseExpiry: null,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      }
    })
    setCustomerFormErrors({})
  }

  const validateCustomerForm = () => {
    const errors = {}
    
    if (!customerFormData.firstName) errors.firstName = 'First name is required'
    if (!customerFormData.lastName) errors.lastName = 'Last name is required'
    if (!customerFormData.email) errors.email = 'Email is required'
    if (!customerFormData.phone) errors.phone = 'Phone is required'
    if (!customerFormData.licenseNumber) errors.licenseNumber = 'License number is required'
    
    setCustomerFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateCustomer = async () => {
    if (!validateCustomerForm()) return

    try {
      const customerData = {
        ...customerFormData,
        role: 'customer',
        password: 'customer123' // Default password
      }

      const newCustomer = await createUser(customerData).unwrap()
      
      // Add the new customer to the form data
      setFormData({ ...formData, customer: newCustomer.data })
      
      // Close the customer dialog
      handleCloseCustomerDialog()
      
    } catch (error) {
      console.error('Error creating customer:', error)
      alert('Error creating customer: ' + (error.data?.message || error.message))
    }
  }

  // Action handlers
  const handleCancel = async (reservation) => {
    try {
      await cancelReservation({ 
        id: reservation._id, 
        reason: 'Cancelled by admin' 
      }).unwrap()
    } catch (error) {
      console.error('Error cancelling reservation:', error)
    }
  }

  const handleDeleteClick = (reservation) => {
    setReservationToDelete(reservation)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!reservationToDelete) return
    
    console.log('🗑️ [DELETE] Starting deletion process for reservation:', reservationToDelete._id)
    console.log('🗑️ [DELETE] Auth token exists:', !!auth.token)
    console.log('🗑️ [DELETE] User role:', auth.user?.role)
    
    try {
      console.log('🗑️ [DELETE] Calling deleteReservation mutation...')
      const result = await deleteReservation(reservationToDelete._id).unwrap()
      console.log('✅ [DELETE] Reservation deleted successfully:', result)
      setDeleteConfirmOpen(false)
      setReservationToDelete(null)
      console.log('✅ Reservation deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting reservation:', error)
      console.log('❌ [DELETE] Full error object:', JSON.stringify(error, null, 2))
      
      let errorMessage = 'Nepodarilo sa vymazať rezerváciu'
      
      // Handle specific error cases
      if (error?.status === 401) {
        errorMessage = 'Nemáte oprávnenie na vymazanie rezervácie. Skúste sa prihlásiť znovu.'
        console.log('❌ [DELETE] Authentication error - user needs to login again')
      } else if (error?.status === 403) {
        errorMessage = 'Nemáte dostatočné oprávnenia na vymazanie rezervácií.'
        console.log('❌ [DELETE] Authorization error - insufficient permissions')
      } else if (error?.status === 404) {
        errorMessage = 'Rezervácia už bola vymazaná alebo neexistuje.'
        console.log('❌ [DELETE] Not found error - reservation may already be deleted')
      } else if (error?.data?.message) {
        errorMessage = error.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      alert(`Chyba pri mazaní rezervácie: ${errorMessage}`)
      
      // If it's an auth error, don't close the dialog so user can try again
      if (error?.status !== 401 && error?.status !== 403) {
        setDeleteConfirmOpen(false)
        setReservationToDelete(null)
      }
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false)
    setReservationToDelete(null)
  }

  const handleConfirm = async (reservation) => {
    try {
      await confirmReservation({
        id: reservation._id,
        date: new Date(),
        notes: 'Confirmed by admin'
      }).unwrap()
    } catch (error) {
      console.error('Error confirming reservation:', error)
    }
  }

  const handleConfirmPayment = async (reservation) => {
    try {
      const result = await confirmReservationPayment({
        id: reservation._id,
        notes: 'Payment confirmed by admin'
      }).unwrap()
      console.log('Payment confirmed successfully:', result)
      // Show success message or notification here if needed
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert('Chyba pri potvrdení platby: ' + (error?.data?.message || error.message))
    }
  }

  const handleSendPaymentNotification = async (reservation) => {
    try {
      const result = await sendPaymentNotification({
        id: reservation._id
      }).unwrap()
      console.log('Payment notification sent successfully:', result)
      alert('Upomienka platby bola úspešne odoslaná na ' + result.data?.sentTo)
    } catch (error) {
      console.error('Error sending payment notification:', error)
      alert('Chyba pri odosielaní upomienky: ' + (error?.data?.message || error.message))
    }
  }

  const handleCheckIn = async (reservation) => {
    try {
      const result = await checkInReservation({
        id: reservation._id,
        date: new Date(),
        mileage: 0,
        fuelLevel: 'full',
        condition: 'Good',
        notes: 'Check-in completed by admin'
      }).unwrap()
      console.log('Check-in successful:', result)
    } catch (error) {
      console.error('Error checking in reservation:', error)
      alert('Chyba pri check-in: ' + (error?.data?.message || error.message))
    }
  }

  const handleCheckOut = async (reservation) => {
    try {
      await checkOutReservation({
        id: reservation._id,
        date: new Date(),
        mileage: 0,
        fuelLevel: 'full',
        condition: 'Good',
        notes: 'Check-out completed by admin'
      }).unwrap()
    } catch (error) {
      console.error('Error checking out reservation:', error)
    }
  }

  const navigate = useNavigate()

  // Check if reservation has payment
  const hasPayment = (reservationId) => {
    if (!payments || payments.length === 0) return false
    
    return payments.some(payment => 
      payment.reservation?._id === reservationId && 
      ['succeeded', 'pending', 'processing'].includes(payment.status)
    )
  }

  // Handle creating invoice for reservation
  const handleCreateInvoice = (reservation) => {
    // Navigate to payments page with reservation data
    navigate('/payments', { 
      state: { 
        createInvoice: true, 
        reservation: reservation 
      } 
    })
  }


  const handleDownloadSlovakAgreement = async (reservationId) => {
    try {
      // Open the Slovak agreement PDF in a new tab
      const url = `/api/reservations/${reservationId}/slovak-agreement?preview=true`
      window.open(url, '_blank')
    } catch (error) {
      console.error('Error generating Slovak agreement:', error)
      alert('Chyba pri generovaní slovenskej zmluvy')
    }
  }

  const handleDownloadSlovakAgreementFile = async (reservationId) => {
    try {
      // Download the Slovak agreement PDF
      const url = `/api/reservations/${reservationId}/slovak-agreement`
      const a = document.createElement('a')
      a.href = url
      a.download = `zmluva-o-najme-${reservationId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading Slovak agreement:', error)
      alert('Chyba pri sťahovaní slovenskej zmluvy')
    }
  }

  // Handle QR code display
  const handleShowQRCode = (reservation) => {
    setSelectedReservationForQR(reservation)
    setQrDialogOpen(true)
  }

  const handleCloseQRDialog = () => {
    setQrDialogOpen(false)
    setSelectedReservationForQR(null)
  }

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
            Rezervácie
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Spravujte všetky rezervácie a požiadavky zákazníkov.
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
          Nová rezervácia
        </Button>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Všetky rezervácie" />
            <Tab label="Aktívne" />
            <Tab label="Čakajúce" />
            <Tab label="Dokončené" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {reservationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : reservationsError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              Error loading reservations: {reservationsError.message}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rezervácia #</TableCell>
                    <TableCell>Zákazník</TableCell>
                    <TableCell>Auto</TableCell>
                    <TableCell>Vytvorené</TableCell>
                    <TableCell>Začiatok prenájmu</TableCell>
                    <TableCell>Koniec prenájmu</TableCell>
                    <TableCell>{t('status')}</TableCell>
                    <TableCell>Celkom</TableCell>
                    <TableCell>Akcie</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {reservation.reservationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {reservation.customer ? (
                          <Box>
                            <Typography variant="body2">
                              {reservation.customer.firstName} {reservation.customer.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {reservation.customer.email}
                            </Typography>
                          </Box>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {reservation.car ? (
                          <Typography variant="body2">
                            {reservation.car.brand} {reservation.car.model} ({reservation.car.year})
                          </Typography>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(reservation.createdAt).toLocaleDateString('sk-SK')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(reservation.createdAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(reservation.status)}
                          color={getStatusColor(reservation.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {(reservation.pricing?.totalAmount?.toFixed(2) || '0.00')}€
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('view', reservation)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('edit', reservation)}
                              disabled={reservation.status === 'completed' || reservation.status === 'cancelled'}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {reservation.status === 'pending' && (
                            <Tooltip title="Potvrdiť rezerváciu">
                              <IconButton
                                size="small"
                                onClick={() => handleConfirm(reservation)}
                                color="success"
                              >
                                <ConfirmIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {reservation.status === 'confirmed' && (
                            <>
                              {console.log(`[DEBUG] Showing payment buttons for reservation ${reservation.reservationNumber} with status: ${reservation.status}`)}
                              <Tooltip title="Potvrdiť platbu">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    console.log('Payment confirmation clicked for:', reservation._id);
                                    handleConfirmPayment(reservation);
                                  }}
                                  color="success"
                                  sx={{ 
                                    backgroundColor: 'success.light', 
                                    '&:hover': { backgroundColor: 'success.main' } 
                                  }}
                                >
                                  <PaymentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Poslať upomienku platby">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    console.log('Payment notification clicked for:', reservation._id);
                                    handleSendPaymentNotification(reservation);
                                  }}
                                  color="warning"
                                  sx={{ 
                                    backgroundColor: 'warning.light', 
                                    '&:hover': { backgroundColor: 'warning.main' } 
                                  }}
                                >
                                  <EmailIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {reservation.status === 'zaplatene' && (
                            <>
                              {console.log(`[DEBUG] Showing check-in button for reservation ${reservation.reservationNumber} with status: ${reservation.status}`)}
                              <Tooltip title="Check In">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    console.log('Check-in clicked for:', reservation._id);
                                    handleCheckIn(reservation);
                                  }}
                                  color="primary"
                                  sx={{ 
                                    backgroundColor: 'primary.light', 
                                    '&:hover': { backgroundColor: 'primary.main' } 
                                  }}
                                >
                                  <CheckInIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {reservation.status === 'ongoing' && (
                            <Tooltip title="Check Out">
                              <IconButton
                                size="small"
                                onClick={() => handleCheckOut(reservation)}
                                color="success"
                              >
                                <CheckOutIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Cancel">
                            <IconButton
                              size="small"
                              onClick={() => handleCancel(reservation)}
                              color="error"
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {reservation.status === 'cancelled' && (
                            <Tooltip title="Vymazať rezerváciu">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(reservation)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {reservation.status === 'confirmed' && !hasPayment(reservation._id) && (
                            <Tooltip title="Create Invoice">
                              <IconButton
                                size="small"
                                onClick={() => handleCreateInvoice(reservation)}
                                color="info"
                              >
                                <ReceiptIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Generovanie Slovenskej zmluvy">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDownloadSlovakAgreement(reservation._id)}
                              color="primary"
                            >
                              <SlovakAgreementIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Stiahnuť Slovensku zmluvu">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDownloadSlovakAgreementFile(reservation._id)}
                              color="secondary"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Generovanie QR kódu">
                            <IconButton
                              size="small"
                              onClick={() => handleShowQRCode(reservation)}
                              color="info"
                            >
                              <QrCodeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Add filtered tabs for other statuses */}
        <TabPanel value={tabValue} index={1}>
          {reservationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : reservationsError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              Error loading reservations: {reservationsError.message}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rezervácia #</TableCell>
                    <TableCell>Zákazník</TableCell>
                    <TableCell>Auto</TableCell>
                    <TableCell>Vytvorené</TableCell>
                    <TableCell>Začiatok prenájmu</TableCell>
                    <TableCell>Koniec prenájmu</TableCell>
                    <TableCell>{t('status')}</TableCell>
                    <TableCell>Celkom</TableCell>
                    <TableCell>Akcie</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reservations.filter(r => r.status === 'ongoing').map((reservation) => (
                    <TableRow key={reservation._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {reservation.reservationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {reservation.customer ? (
                          <Box>
                            <Typography variant="body2">
                              {reservation.customer.firstName} {reservation.customer.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {reservation.customer.email}
                            </Typography>
                          </Box>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {reservation.car ? (
                          <Typography variant="body2">
                            {reservation.car.brand} {reservation.car.model} ({reservation.car.year})
                          </Typography>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(reservation.createdAt).toLocaleDateString('sk-SK')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(reservation.createdAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(reservation.status)}
                          color={getStatusColor(reservation.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {(reservation.pricing?.totalAmount?.toFixed(2) || '0.00')}€
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('view', reservation)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Check Out">
                            <IconButton
                              size="small"
                              onClick={() => handleCheckOut(reservation)}
                              color="success"
                            >
                              <CheckOutIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Generovanie Slovenskej zmluvy">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDownloadSlovakAgreement(reservation._id)}
                              color="primary"
                            >
                              <SlovakAgreementIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Stiahnuť Slovensku zmluvu">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDownloadSlovakAgreementFile(reservation._id)}
                              color="secondary"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Generovanie QR kódu">
                            <IconButton
                              size="small"
                              onClick={() => handleShowQRCode(reservation)}
                              color="info"
                            >
                              <QrCodeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          {reservationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : reservationsError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              Error loading reservations: {reservationsError.message}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rezervácia #</TableCell>
                    <TableCell>Zákazník</TableCell>
                    <TableCell>Auto</TableCell>
                    <TableCell>Vytvorené</TableCell>
                    <TableCell>Začiatok prenájmu</TableCell>
                    <TableCell>Koniec prenájmu</TableCell>
                    <TableCell>{t('status')}</TableCell>
                    <TableCell>Celkom</TableCell>
                    <TableCell>Akcie</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reservations.filter(r => r.status === 'pending').map((reservation) => (
                    <TableRow key={reservation._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {reservation.reservationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {reservation.customer ? (
                          <Box>
                            <Typography variant="body2">
                              {reservation.customer.firstName} {reservation.customer.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {reservation.customer.email}
                            </Typography>
                          </Box>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {reservation.car ? (
                          <Typography variant="body2">
                            {reservation.car.brand} {reservation.car.model} ({reservation.car.year})
                          </Typography>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(reservation.createdAt).toLocaleDateString('sk-SK')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(reservation.createdAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(reservation.status)}
                          color={getStatusColor(reservation.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {(reservation.pricing?.totalAmount?.toFixed(2) || '0.00')}€
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('view', reservation)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('edit', reservation)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Potvrdiť rezerváciu">
                            <IconButton
                              size="small"
                              onClick={() => handleConfirm(reservation)}
                              color="success"
                            >
                              <ConfirmIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Náhľad slovenskej zmluvy">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDownloadSlovakAgreement(reservation._id)}
                              color="primary"
                            >
                              <SlovakAgreementIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Stiahnuť slovenskú zmluvu">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDownloadSlovakAgreementFile(reservation._id)}
                              color="secondary"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <IconButton
                              size="small"
                              onClick={() => handleCancel(reservation)}
                              color="error"
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Generovanie QR kódu">
                            <IconButton
                              size="small"
                              onClick={() => handleShowQRCode(reservation)}
                              color="info"
                            >
                              <QrCodeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          {reservationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : reservationsError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              Error loading reservations: {reservationsError.message}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rezervácia #</TableCell>
                    <TableCell>Zákazník</TableCell>
                    <TableCell>Auto</TableCell>
                    <TableCell>Vytvorené</TableCell>
                    <TableCell>Začiatok prenájmu</TableCell>
                    <TableCell>Koniec prenájmu</TableCell>
                    <TableCell>{t('status')}</TableCell>
                    <TableCell>Celkom</TableCell>
                    <TableCell>Akcie</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reservations.filter(r => r.status === 'completed').map((reservation) => (
                    <TableRow key={reservation._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {reservation.reservationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {reservation.customer ? (
                          <Box>
                            <Typography variant="body2">
                              {reservation.customer.firstName} {reservation.customer.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {reservation.customer.email}
                            </Typography>
                          </Box>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {reservation.car ? (
                          <Typography variant="body2">
                            {reservation.car.brand} {reservation.car.model} ({reservation.car.year})
                          </Typography>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(reservation.createdAt).toLocaleDateString('sk-SK')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(reservation.createdAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(reservation.status)}
                          color={getStatusColor(reservation.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {(reservation.pricing?.totalAmount?.toFixed(2) || '0.00')}€
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('view', reservation)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Náhľad slovenskej zmluvy">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDownloadSlovakAgreement(reservation._id)}
                              color="primary"
                            >
                              <SlovakAgreementIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Stiahnuť slovenskú zmluvu">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDownloadSlovakAgreementFile(reservation._id)}
                              color="secondary"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Generovanie QR kódu">
                            <IconButton
                              size="small"
                              onClick={() => handleShowQRCode(reservation)}
                              color="info"
                            >
                              <QrCodeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Card>

      {/* Create/Edit Reservation Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth={dialogMode === 'view' ? 'lg' : 'md'}
        fullWidth
        scroll={dialogMode === 'view' ? 'body' : 'paper'}
        PaperProps={{
          sx: dialogMode === 'view' ? { minHeight: '80vh', maxHeight: '90vh' } : {}
        }}
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Vytvoriť novú rezerváciu' : 
           dialogMode === 'edit' ? 'Upraviť rezerváciu' : 'Zobraziť rezerváciu'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' && selectedReservation ? (
            // View Mode - Comprehensive Reservation Details
            <Box sx={{ mt: 2 }}>
              {/* Header with Reservation Number and Status */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    Rezervácia #{selectedReservation.reservationNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Vytvorené: {new Date(selectedReservation.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Chip
                  label={getStatusText(selectedReservation.status)}
                  color={getStatusColor(selectedReservation.status)}
                  size="large"
                  sx={{ fontSize: '1rem', px: 2, py: 1 }}
                />
              </Box>

              <Grid container spacing={3} sx={{ pr: 2 }}>
                {/* Customer Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Informácie o zákazníkovi
                      </Typography>
                      {selectedReservation.customer ? (
                        <>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedReservation.customer.firstName} {selectedReservation.customer.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Email: {selectedReservation.customer.email}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Telefón: {selectedReservation.customer.phone || 'Nie je uvedené'}
                          </Typography>
                          {selectedReservation.customer.licenseNumber && (
                            <Typography variant="body2" color="text.secondary">
                              Vodičský preukaz: {selectedReservation.customer.licenseNumber}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Informácie o zákazníkovi nie sú dostupné
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Car Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        {t('vehicleInfo')}
                      </Typography>
                      {selectedReservation.car ? (
                        <>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedReservation.car.brand} {selectedReservation.car.model} ({selectedReservation.car.year})
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Evidenčné číslo: {selectedReservation.car.registrationNumber}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Kategória: {selectedReservation.car.category}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Denná sadzba: {selectedReservation.pricing?.dailyRate?.toFixed(2) || 'Neuvedené'}€/deň
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Informácie o vozidle nie sú dostupné
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Rental Dates */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        {t('rentalPeriod')}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Začiatok prenájmu:</strong> {new Date(selectedReservation.startDate).toLocaleDateString('sk-SK', { 
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                        })}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Koniec prenájmu:</strong> {new Date(selectedReservation.endDate).toLocaleDateString('sk-SK', { 
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                        })}
                      </Typography>
                      <Typography variant="body2" color="primary" fontWeight="medium">
                        {t('duration')}: {Math.ceil((new Date(selectedReservation.endDate) - new Date(selectedReservation.startDate)) / (1000 * 60 * 60 * 24))} {t('days')}
                      </Typography>
                      
                      {/* Status Timeline */}
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                          ČASOVÁ OSA REZERVÁCIE
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label="Vytvorené" 
                            size="small" 
                            color="success" 
                            variant={selectedReservation.createdAt ? "filled" : "outlined"}
                          />
                          <Chip 
                            label="Potvrdené" 
                            size="small" 
                            color="info" 
                            variant={['confirmed', 'ongoing', 'completed'].includes(selectedReservation.status) ? "filled" : "outlined"}
                          />
                          <Chip 
                            label="Prevzatie" 
                            size="small" 
                            color="primary" 
                            variant={selectedReservation.checkIn?.date ? "filled" : "outlined"}
                          />
                          <Chip 
                            label="Vrátenie" 
                            size="small" 
                            color="primary" 
                            variant={selectedReservation.checkOut?.date ? "filled" : "outlined"}
                          />
                          <Chip 
                            label="Dokončené" 
                            size="small" 
                            color="success" 
                            variant={selectedReservation.status === 'completed' ? "filled" : "outlined"}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Pricing Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Podrobnosti o cenách
                      </Typography>
                      {selectedReservation.pricing ? (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">{t('subtotal')}:</Typography>
                            <Typography variant="body2">{selectedReservation.pricing.subtotal?.toFixed(2) || '0.00'}€</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">{t('tax')}:</Typography>
                            <Typography variant="body2">{selectedReservation.pricing.taxes?.toFixed(2) || '0.00'}€</Typography>
                          </Box>
                          {selectedReservation.pricing.fees && selectedReservation.pricing.fees.length > 0 && (
                            selectedReservation.pricing.fees.map((fee, index) => (
                              <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">{fee.name}:</Typography>
                                <Typography variant="body2">{fee.amount?.toFixed(2) || '0.00'}€</Typography>
                              </Box>
                            ))
                          )}
                          {/* Discount Information */}
                          {selectedReservation.pricing?.appliedDiscount && (
                            <>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">Pôvodná cena:</Typography>
                                <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>{selectedReservation.pricing.appliedDiscount.originalAmount?.toFixed(2)}€</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" color="success.main">Zľava ({selectedReservation.pricing.appliedDiscount.discountPercentage}%):</Typography>
                                <Typography variant="body2" color="success.main">-{selectedReservation.pricing.appliedDiscount.discountAmount?.toFixed(2)}€</Typography>
                              </Box>
                              {selectedReservation.discountCode && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">Zľavový kód:</Typography>
                                  <Typography variant="body2" fontWeight="medium">{selectedReservation.discountCode}</Typography>
                                </Box>
                              )}
                            </>
                          )}
                          
                          {/* Services Total */}
                          {selectedReservation.servicesTotal && selectedReservation.servicesTotal > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">Dodatočné služby:</Typography>
                              <Typography variant="body2">{selectedReservation.servicesTotal?.toFixed(2)}€</Typography>
                            </Box>
                          )}

                          {/* Deposit */}
                          {selectedReservation.pricing?.deposit && selectedReservation.pricing.deposit > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">Záloha:</Typography>
                              <Typography variant="body2" color="warning.main" fontWeight="medium">{selectedReservation.pricing.deposit?.toFixed(2)}€</Typography>
                            </Box>
                          )}

                          {/* Extra Options */}
                          {selectedReservation.pricing?.extraOptions && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" color="text.secondary" display="block">Extra možnosti:</Typography>
                              {Object.entries(selectedReservation.pricing.extraOptions).map(([key, value]) => (
                                value && (
                                  <Chip 
                                    key={key}
                                    label={key.toUpperCase()} 
                                    size="small" 
                                    color="info"
                                    variant="outlined"
                                    sx={{ mr: 0.5, mt: 0.5 }}
                                  />
                                )
                              ))}
                            </Box>
                          )}

                          <Divider sx={{ my: 1 }} />
                          
                          {/* Show both calculated total and total amount */}
                          {selectedReservation.pricing?.calculatedTotal && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">Vypočítaná suma:</Typography>
                              <Typography variant="body2">{selectedReservation.pricing.calculatedTotal?.toFixed(2)}€</Typography>
                            </Box>
                          )}
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body1" fontWeight="bold">{t('totalAmount')}:</Typography>
                            <Typography variant="body1" fontWeight="bold" color="primary">{selectedReservation.pricing.totalAmount?.toFixed(2) || '0.00'}€</Typography>
                          </Box>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Informácie o cenách nie sú dostupné
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Additional Services */}
                {selectedReservation.selectedServices && selectedReservation.selectedServices.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Dodatočné služby
                        </Typography>
                        {selectedReservation.selectedServices.map((service, index) => (
                          <Box key={service._id || index} sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {service.name || service.service?.name}
                              </Typography>
                              <Typography variant="body2" color="primary" fontWeight="medium">
                                {service.totalPrice?.toFixed(2)}€
                              </Typography>
                            </Box>
                            
                            {/* Service Description */}
                            {service.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                {service.description}
                              </Typography>
                            )}
                            
                            {/* Category Chip */}
                            {service.category && (
                              <Chip 
                                label={service.category} 
                                size="small" 
                                variant="outlined" 
                                sx={{ mb: 1, mr: 1 }}
                              />
                            )}
                            
                            {/* Pricing Type Chip */}
                            {service.pricing?.type && (
                              <Chip 
                                label={service.pricing.type === 'per_day' ? 'Za deň' : 
                                       service.pricing.type === 'per_km' ? 'Za km' : 
                                       service.pricing.type === 'percentage' ? 'Percento' : 'Pevná cena'} 
                                size="small" 
                                color="info"
                                variant="filled" 
                                sx={{ mb: 1 }}
                              />
                            )}
                            
                            {/* Quantity and Unit Price Details */}
                            <Box sx={{ mt: 1 }}>
                              {service.quantity && service.quantity > 1 && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Množstvo: {service.quantity}x
                                </Typography>
                              )}
                              {service.pricing?.amount && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Jednotková cena: {service.pricing.amount.toFixed(2)}€ 
                                  {service.pricing.type === 'per_day' ? ' /deň' : 
                                   service.pricing.type === 'per_km' ? ' /km' : 
                                   service.pricing.type === 'percentage' ? '%' : ''}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                
                
                {/* Additional/Basic Insurance */}
                {selectedReservation.selectedAdditionalInsurance && selectedReservation.selectedAdditionalInsurance.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Dodatočné poistenie
                        </Typography>
                        {selectedReservation.selectedAdditionalInsurance.map((insurance, index) => (
                          <Box key={insurance._id || index} sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {insurance.name || insurance.insuranceId?.name}
                              </Typography>
                              <Typography variant="body2" color="primary" fontWeight="medium">
                                {insurance.displayPrice || `${insurance.calculatedPrice?.toFixed(2)}€`}
                              </Typography>
                            </Box>
                            
                            {/* Insurance Description */}
                            {insurance.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                {insurance.description}
                              </Typography>
                            )}
                            
                            {/* Insurance Type Chip */}
                            {insurance.type && (
                              <Chip 
                                label={insurance.type} 
                                size="small" 
                                color="info" 
                                variant="outlined" 
                                sx={{ mb: 1, mr: 1 }}
                              />
                            )}
                            
                            {/* Pricing Type Chip */}
                            <Chip 
                              label={insurance.pricingType === 'per_day' ? 'Za deň' : 'Pevná cena'} 
                              size="small" 
                              color="primary"
                              variant="filled" 
                              sx={{ mb: 1 }}
                            />
                            
                            {/* Insurance Details */}
                            <Box sx={{ mt: 1 }}>
                              {insurance.selectedQuantity && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Množstvo: {insurance.selectedQuantity}x
                                </Typography>
                              )}
                              {insurance.price && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Základná cena: {insurance.price.toFixed(2)}€ 
                                  {insurance.pricingType === 'per_day' ? ' /deň' : ''}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Extended Insurance */}
                {selectedReservation.selectedExtendedInsurance && selectedReservation.selectedExtendedInsurance.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="secondary">
                          Rozšírené poistenie
                        </Typography>
                        {selectedReservation.selectedExtendedInsurance.map((insurance, index) => (
                          <Box key={insurance._id || index} sx={{ mb: 2, p: 1.5, bgcolor: 'secondary.50', borderRadius: 1, border: '1px solid', borderColor: 'secondary.200' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {insurance.name || insurance.insuranceId?.name}
                              </Typography>
                              <Typography variant="body2" color="secondary" fontWeight="medium">
                                {insurance.displayPrice || `${insurance.calculatedPrice?.toFixed(2)}€`}
                              </Typography>
                            </Box>
                            
                            {/* Insurance Description */}
                            {insurance.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                {insurance.description}
                              </Typography>
                            )}
                            
                            {/* Insurance Type Chip */}
                            {insurance.type && (
                              <Chip 
                                label={insurance.type} 
                                size="small" 
                                color="secondary" 
                                variant="outlined" 
                                sx={{ mb: 1, mr: 1 }}
                              />
                            )}
                            
                            {/* Pricing Type Chip */}
                            <Chip 
                              label={insurance.pricingType === 'per_day' ? 'Za deň' : 'Pevná cena'} 
                              size="small" 
                              color="secondary"
                              variant="filled" 
                              sx={{ mb: 1 }}
                            />
                            
                            {/* Extended Insurance Details */}
                            <Box sx={{ mt: 1 }}>
                              {insurance.selectedQuantity && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Množstvo: {insurance.selectedQuantity}x
                                </Typography>
                              )}
                              {insurance.price && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Základná cena: {insurance.price.toFixed(2)}€ 
                                  {insurance.pricingType === 'per_day' ? ' /deň' : ''}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Pickup Location */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Miesto prevzatia
                      </Typography>
                      {selectedReservation.pickupLocation ? (
                        <>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedReservation.pickupLocation.name}
                          </Typography>
                          {selectedReservation.pickupLocation.address && (
                            <>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {selectedReservation.pickupLocation.address.street}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {[
                                  selectedReservation.pickupLocation.address.city,
                                  selectedReservation.pickupLocation.address.state,
                                  selectedReservation.pickupLocation.address.zipCode,
                                  selectedReservation.pickupLocation.address.country
                                ].filter(Boolean).join(', ')}
                              </Typography>
                            </>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Miesto prevzatia nie je špecifikované
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Dropoff Location */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Miesto vrátenia
                      </Typography>
                      {selectedReservation.dropoffLocation ? (
                        <>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedReservation.dropoffLocation.name}
                          </Typography>
                          {selectedReservation.dropoffLocation.address && (
                            <>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {selectedReservation.dropoffLocation.address.street}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {[
                                  selectedReservation.dropoffLocation.address.city,
                                  selectedReservation.dropoffLocation.address.state,
                                  selectedReservation.dropoffLocation.address.zipCode,
                                  selectedReservation.dropoffLocation.address.country
                                ].filter(Boolean).join(', ')}
                              </Typography>
                            </>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Miesto vrátenia nie je špecifikované
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Terms and Conditions */}
                {selectedReservation.terms && Object.keys(selectedReservation.terms).length > 0 ? (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Obchodné podmienky
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={3}>
                            <Typography variant="body2" gutterBottom>
                              <strong>Limit najazdených km:</strong> {selectedReservation.terms.mileageLimit === -1 ? 'Neobmedzené' : `${selectedReservation.terms.mileageLimit} km`}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <Typography variant="body2" gutterBottom>
                              <strong>Politika paliva:</strong> {selectedReservation.terms.fuelPolicy}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <Typography variant="body2" gutterBottom>
                              <strong>Poplatok za oneskorené vrátenie:</strong> {selectedReservation.terms.lateReturnFee || 0}€
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <Typography variant="body2" gutterBottom>
                              <strong>Storno podmienky:</strong> {selectedReservation.terms.cancellationPolicy || 'Štandardné podmienky'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ) : null}

                {/* Check-in Information */}
                {selectedReservation.checkIn && selectedReservation.checkIn.date && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Detaily prevzatia
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Dátum:</strong> {new Date(selectedReservation.checkIn.date).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Nájazd:</strong> {selectedReservation.checkIn.mileage || 'Nezaznamenané'} km
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Hladina paliva:</strong> {selectedReservation.checkIn.fuelLevel || 'Nezaznamenané'}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Stav vozidla:</strong> {selectedReservation.checkIn.condition || 'Nezaznamenané'}
                        </Typography>
                        {selectedReservation.checkIn.notes && (
                          <Typography variant="body2" gutterBottom>
                            <strong>Poznámky:</strong> {selectedReservation.checkIn.notes}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Check-out Information */}
                {selectedReservation.checkOut && selectedReservation.checkOut.date && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Detaily vrátenia
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Dátum:</strong> {new Date(selectedReservation.checkOut.date).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Nájazd:</strong> {selectedReservation.checkOut.mileage || 'Nezaznamenané'} km
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Hladina paliva:</strong> {selectedReservation.checkOut.fuelLevel || 'Nezaznamenané'}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Stav vozidla:</strong> {selectedReservation.checkOut.condition || 'Nezaznamenané'}
                        </Typography>
                        {selectedReservation.checkOut.notes && (
                          <Typography variant="body2" gutterBottom>
                            <strong>Poznámky:</strong> {selectedReservation.checkOut.notes}
                          </Typography>
                        )}
                        {selectedReservation.checkOut.additionalCharges && selectedReservation.checkOut.additionalCharges.length > 0 && (
                          <>
                            <Typography variant="body2" fontWeight="medium" gutterBottom sx={{ mt: 1 }}>
                              Dodatočné poplatky:
                            </Typography>
                            {selectedReservation.checkOut.additionalCharges.map((charge, index) => (
                              <Typography key={index} variant="body2" gutterBottom>
                                • {charge.type}: {charge.amount?.toFixed(2) || '0.00'}€ - {charge.description}
                              </Typography>
                            ))}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Additional Drivers */}
                {selectedReservation.additionalDrivers && selectedReservation.additionalDrivers.length > 0 && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Ďalší vodiči
                        </Typography>
                        {selectedReservation.additionalDrivers.map((driver, index) => (
                          <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body1" fontWeight="medium" gutterBottom>
                              {driver.firstName} {driver.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Vodičský preukaz: {driver.licenseNumber}
                            </Typography>
                            {driver.licenseExpiry && (
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Platnosť preukazu: {new Date(driver.licenseExpiry).toLocaleDateString()}
                              </Typography>
                            )}
                            {driver.relationship && (
                              <Typography variant="body2" color="text.secondary">
                                Vzťah: {driver.relationship}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Special Requests */}
                {selectedReservation.specialRequests && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Špeciálne požiadavky
                        </Typography>
                        <Typography variant="body2">
                          {selectedReservation.specialRequests}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Notes */}
                {selectedReservation.notes && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Poznámky
                        </Typography>
                        <Typography variant="body2">
                          {selectedReservation.notes}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Rating */}
                {selectedReservation.rating && selectedReservation.rating.score && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Hodnotenie zákazníka
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            Hodnotenie: {selectedReservation.rating.score}/5
                          </Typography>
                          <Box sx={{ display: 'flex' }}>
                            {[...Array(5)].map((_, i) => (
                              <span key={i} style={{ color: i < selectedReservation.rating.score ? '#ffc107' : '#e0e0e0' }}>
                                ★
                              </span>
                            ))}
                          </Box>
                        </Box>
                        {selectedReservation.rating.comment && (
                          <Typography variant="body2" color="text.secondary">
                            "{selectedReservation.rating.comment}"
                          </Typography>
                        )}
                        {selectedReservation.rating.date && (
                          <Typography variant="caption" color="text.secondary">
                            Hodnotené dňa: {new Date(selectedReservation.rating.date).toLocaleDateString()}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Notifications Status */}
                {selectedReservation.notifications && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Odoslané notifikácie
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" gutterBottom>
                              <strong>Email notifikácie:</strong>
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                              <Chip 
                                label="Potvrdenie" 
                                size="small" 
                                color={selectedReservation.notifications.emailSent?.confirmation ? "success" : "default"}
                                variant={selectedReservation.notifications.emailSent?.confirmation ? "filled" : "outlined"}
                              />
                              <Chip 
                                label="Pripomienka" 
                                size="small" 
                                color={selectedReservation.notifications.emailSent?.reminder ? "success" : "default"}
                                variant={selectedReservation.notifications.emailSent?.reminder ? "filled" : "outlined"}
                              />
                              <Chip 
                                label="Dokončenie" 
                                size="small" 
                                color={selectedReservation.notifications.emailSent?.completion ? "success" : "default"}
                                variant={selectedReservation.notifications.emailSent?.completion ? "filled" : "outlined"}
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" gutterBottom>
                              <strong>SMS notifikácie:</strong>
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip 
                                label="Potvrdenie" 
                                size="small" 
                                color={selectedReservation.notifications.smsSent?.confirmation ? "success" : "default"}
                                variant={selectedReservation.notifications.smsSent?.confirmation ? "filled" : "outlined"}
                              />
                              <Chip 
                                label="Pripomienka" 
                                size="small" 
                                color={selectedReservation.notifications.smsSent?.reminder ? "success" : "default"}
                                variant={selectedReservation.notifications.smsSent?.reminder ? "filled" : "outlined"}
                              />
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          ) : (
            // Edit/Create Mode - Original Form
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Customer Selection */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={users}
                  getOptionLabel={(option) => 
                    `${option.firstName} ${option.lastName} (${option.email})`
                  }
                  isOptionEqualToValue={(option, value) => option._id === value?._id}
                  value={formData.customer}
                  onChange={(e, value) => setFormData({ ...formData, customer: value })}
                  loading={usersLoading}
                  disabled={dialogMode === 'view'}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', flexDirection: 'column', py: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {option.firstName} {option.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.email} • {option.phone || 'No phone'}
                        </Typography>
                        {option.licenseNumber && (
                          <Typography variant="caption" color="info.main">
                            License: {option.licenseNumber}
                          </Typography>
                        )}
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('selectCustomer')}
                      error={!!formErrors.customer}
                      helperText={formErrors.customer || (users.length === 0 ? 'Žiadni zákazníci nie sú dostupní' : `${users.length} zákazníkov dostupných`)}
                      required
                    />
                  )}
                  noOptionsText={usersLoading ? "Načítavajú sa zákazníci..." : "Žiadni zákazníci neboli nájdení"}
                />
                {dialogMode !== 'view' && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleOpenCustomerDialog}
                      sx={{ textTransform: 'none' }}
                    >
                      Vytvoriť nového zákazníka
                    </Button>
                  </Box>
                )}
              </Grid>

              {/* Car Selection */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={cars}
                  getOptionLabel={(option) => 
                    `${option.brand} ${option.model} (${option.year}) - ${option.dailyRate}€/deň`
                  }
                  isOptionEqualToValue={(option, value) => option._id === value?._id}
                  value={formData.car}
                  onChange={(e, value) => setFormData({ ...formData, car: value })}
                  loading={carsLoading}
                  disabled={dialogMode === 'view'}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', flexDirection: 'column', py: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {option.brand} {option.model} ({option.year})
                          </Typography>
                          <Typography variant="body2" color="primary.main" fontWeight="medium">
                            {option.dailyRate}€/deň
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip label={option.category} size="small" variant="outlined" />
                          <Chip label={option.registrationNumber} size="small" color="info" />
                        </Box>
                        {option.features && option.features.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            Features: {option.features.slice(0, 3).join(', ')}
                            {option.features.length > 3 && ` +${option.features.length - 3} more`}
                          </Typography>
                        )}
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('selectCar')}
                      error={!!formErrors.car}
                      helperText={formErrors.car || (cars.length === 0 ? 'Žiadne dostupné autá' : `${cars.length} áut dostupných`)}
                      required
                    />
                  )}
                  noOptionsText={carsLoading ? "Načítavajú sa autá..." : "Žiadne dostupné autá"}
                />
              </Grid>

              {/* Date Selection */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Začiatok prenájmu"
                  type="date"
                  value={formData.startDate ? formData.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value ? new Date(e.target.value) : null })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.startDate}
                  helperText={formErrors.startDate}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Koniec prenájmu"
                  type="date"
                  value={formData.endDate ? formData.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value) : null })}
                  disabled={dialogMode === 'view'}
                  inputProps={{
                    min: formData.startDate ? formData.startDate.toISOString().split('T')[0] : ''
                  }}
                  error={!!formErrors.endDate}
                  helperText={formErrors.endDate}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              {/* Pricing Estimation */}
              {formData.car && formData.startDate && formData.endDate && (
                <Grid item xs={12}>
                  <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="h6" color="primary.main" gutterBottom>
                        Cenový odhad
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {t('rentalPeriod')}: {Math.ceil((formData.endDate - formData.startDate) / (1000 * 60 * 60 * 24))} {t('days')}
                        </Typography>
                        <Typography variant="body2">
                          Denná sadzba: {formData.car.dailyRate} €
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {t('subtotal')}:
                        </Typography>
                        <Typography variant="body2">
                          {(Math.ceil((formData.endDate - formData.startDate) / (1000 * 60 * 60 * 24)) * formData.car.dailyRate).toFixed(2)} €
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          Dane (10%):
                        </Typography>
                        <Typography variant="body2">
                          {(Math.ceil((formData.endDate - formData.startDate) / (1000 * 60 * 60 * 24)) * formData.car.dailyRate * 0.1).toFixed(2)} €
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" fontWeight="medium">
                          {t('totalAmount')}:
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="primary.main">
                          {(Math.ceil((formData.endDate - formData.startDate) / (1000 * 60 * 60 * 24)) * formData.car.dailyRate * 1.1).toFixed(2)} €
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Pickup Location */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {t('pickupLocation')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('locationName')}
                  value={formData.pickupLocation.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    pickupLocation: { ...formData.pickupLocation, name: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.pickupLocationName}
                  helperText={formErrors.pickupLocationName}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('street')}
                  value={formData.pickupLocation.address.street}
                  onChange={(e) => setFormData({
                    ...formData,
                    pickupLocation: {
                      ...formData.pickupLocation,
                      address: { ...formData.pickupLocation.address, street: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('city')}
                  value={formData.pickupLocation.address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    pickupLocation: {
                      ...formData.pickupLocation,
                      address: { ...formData.pickupLocation.address, city: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('state')}
                  value={formData.pickupLocation.address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    pickupLocation: {
                      ...formData.pickupLocation,
                      address: { ...formData.pickupLocation.address, state: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('country')}
                  value={formData.pickupLocation.address.country}
                  onChange={(e) => setFormData({
                    ...formData,
                    pickupLocation: {
                      ...formData.pickupLocation,
                      address: { ...formData.pickupLocation.address, country: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>

              {/* Dropoff Location */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {t('dropoffLocation')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('locationName')}
                  value={formData.dropoffLocation.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    dropoffLocation: { ...formData.dropoffLocation, name: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.dropoffLocationName}
                  helperText={formErrors.dropoffLocationName}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('street')}
                  value={formData.dropoffLocation.address.street}
                  onChange={(e) => setFormData({
                    ...formData,
                    dropoffLocation: {
                      ...formData.dropoffLocation,
                      address: { ...formData.dropoffLocation.address, street: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('city')}
                  value={formData.dropoffLocation.address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    dropoffLocation: {
                      ...formData.dropoffLocation,
                      address: { ...formData.dropoffLocation.address, city: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('state')}
                  value={formData.dropoffLocation.address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    dropoffLocation: {
                      ...formData.dropoffLocation,
                      address: { ...formData.dropoffLocation.address, state: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('country')}
                  value={formData.dropoffLocation.address.country}
                  onChange={(e) => setFormData({
                    ...formData,
                    dropoffLocation: {
                      ...formData.dropoffLocation,
                      address: { ...formData.dropoffLocation.address, country: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>

              {/* Status (for edit mode) */}
              {dialogMode === 'edit' && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('status')}</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      label={t('status')}
                    >
                      <MenuItem value="pending">{t('pending')}</MenuItem>
                      <MenuItem value="confirmed">{t('confirmed')}</MenuItem>
                      <MenuItem value="zaplatene">Zaplatené</MenuItem>
                      <MenuItem value="ongoing">{t('ongoing')}</MenuItem>
                      <MenuItem value="completed">{t('completed')}</MenuItem>
                      <MenuItem value="cancelled">{t('cancelled')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Debug: Show what reservation data is available */}
              {dialogMode === 'edit' && selectedReservation && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'info.50' }}>
                    <Typography variant="h6" gutterBottom color="info.main">
                      🔍 Debug: Reservation Data
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Selected Services:</strong> {selectedReservation.selectedServices ? selectedReservation.selectedServices.length : 0} items
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Additional Insurance:</strong> {selectedReservation.selectedAdditionalInsurance ? selectedReservation.selectedAdditionalInsurance.length : 0} items
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Extended Insurance:</strong> {selectedReservation.selectedExtendedInsurance ? selectedReservation.selectedExtendedInsurance.length : 0} items
                    </Typography>
                    {selectedReservation.selectedServices && selectedReservation.selectedServices.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Services: {selectedReservation.selectedServices.map(s => s.name || 'Unknown').join(', ')}
                      </Typography>
                    )}
                  </Card>
                </Grid>
              )}

              {/* Additional Services Display (for edit mode) */}
              {dialogMode === 'edit' && selectedReservation && selectedReservation.selectedServices && selectedReservation.selectedServices.length > 0 && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Dodatočné služby v rezervácii
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Tieto služby sú súčasťou tejto rezervácie a nie je možné ich upravovať tu.
                    </Typography>
                    {selectedReservation.selectedServices.map((service, index) => (
                      <Box key={service._id || index} sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {service.name || service.service?.name}
                          </Typography>
                          <Typography variant="body2" color="primary" fontWeight="medium">
                            {service.totalPrice?.toFixed(2)}€
                          </Typography>
                        </Box>
                        
                        {/* Service Description */}
                        {service.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {service.description}
                          </Typography>
                        )}
                        
                        {/* Category and Pricing Chips */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {service.category && (
                            <Chip 
                              label={service.category} 
                              size="small" 
                              variant="outlined" 
                            />
                          )}
                          {service.pricing?.type && (
                            <Chip 
                              label={service.pricing.type === 'per_day' ? 'Za deň' : 
                                     service.pricing.type === 'per_km' ? 'Za km' : 
                                     service.pricing.type === 'percentage' ? 'Percento' : 'Pevná cena'} 
                              size="small" 
                              color="info"
                              variant="filled" 
                            />
                          )}
                        </Box>
                        
                        {/* Quantity and Unit Price Details */}
                        {(service.quantity > 1 || service.pricing?.amount) && (
                          <Box sx={{ mt: 1 }}>
                            {service.quantity && service.quantity > 1 && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Množstvo: {service.quantity}x
                              </Typography>
                            )}
                            {service.pricing?.amount && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Jednotková cena: {service.pricing.amount.toFixed(2)}€ 
                                {service.pricing.type === 'per_day' ? ' /deň' : 
                                 service.pricing.type === 'per_km' ? ' /km' : 
                                 service.pricing.type === 'percentage' ? '%' : ''}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Card>
                </Grid>
              )}

              {/* Insurance Display for Edit Mode */}
              {dialogMode === 'edit' && selectedReservation && (
                (selectedReservation.selectedAdditionalInsurance?.length > 0 || selectedReservation.selectedExtendedInsurance?.length > 0) && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="h6" gutterBottom color="primary">
                        Poistenie v rezervácii
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Toto poistenie je súčasťou tejto rezervácie a nie je možné ho upravovať tu.
                      </Typography>
                      
                      <Grid container spacing={2}>
                        {/* Additional/Basic Insurance */}
                        {selectedReservation.selectedAdditionalInsurance && selectedReservation.selectedAdditionalInsurance.length > 0 && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom color="primary">
                              Dodatočné poistenie
                            </Typography>
                            {selectedReservation.selectedAdditionalInsurance.map((insurance, index) => (
                              <Box key={insurance._id || index} sx={{ mb: 2, p: 1.5, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Typography variant="body2" fontWeight="medium">
                                    {insurance.name || insurance.insuranceId?.name}
                                  </Typography>
                                  <Typography variant="body2" color="primary" fontWeight="medium">
                                    {insurance.displayPrice || `${insurance.calculatedPrice?.toFixed(2)}€`}
                                  </Typography>
                                </Box>
                                
                                {insurance.description && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    {insurance.description}
                                  </Typography>
                                )}
                                
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  {insurance.type && (
                                    <Chip 
                                      label={insurance.type} 
                                      size="small" 
                                      color="primary" 
                                      variant="outlined" 
                                    />
                                  )}
                                  <Chip 
                                    label={insurance.pricingType === 'per_day' ? 'Za deň' : 'Pevná cena'} 
                                    size="small" 
                                    color="primary"
                                    variant="filled" 
                                  />
                                </Box>
                              </Box>
                            ))}
                          </Grid>
                        )}

                        {/* Extended Insurance */}
                        {selectedReservation.selectedExtendedInsurance && selectedReservation.selectedExtendedInsurance.length > 0 && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom color="secondary">
                              Rozšírené poistenie
                            </Typography>
                            {selectedReservation.selectedExtendedInsurance.map((insurance, index) => (
                              <Box key={insurance._id || index} sx={{ mb: 2, p: 1.5, bgcolor: 'secondary.50', borderRadius: 1, border: '1px solid', borderColor: 'secondary.200' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Typography variant="body2" fontWeight="medium">
                                    {insurance.name || insurance.insuranceId?.name}
                                  </Typography>
                                  <Typography variant="body2" color="secondary" fontWeight="medium">
                                    {insurance.displayPrice || `${insurance.calculatedPrice?.toFixed(2)}€`}
                                  </Typography>
                                </Box>
                                
                                {insurance.description && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    {insurance.description}
                                  </Typography>
                                )}
                                
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  {insurance.type && (
                                    <Chip 
                                      label={insurance.type} 
                                      size="small" 
                                      color="secondary" 
                                      variant="outlined" 
                                    />
                                  )}
                                  <Chip 
                                    label={insurance.pricingType === 'per_day' ? 'Za deň' : 'Pevná cena'} 
                                    size="small" 
                                    color="secondary"
                                    variant="filled" 
                                  />
                                </Box>
                              </Box>
                            ))}
                          </Grid>
                        )}
                      </Grid>
                    </Card>
                  </Grid>
                )
              )}

              {/* Special Requests */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Špeciálne požiadavky"
                  multiline
                  rows={3}
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {dialogMode === 'view' ? t('close') : t('cancel')}
          </Button>
          {dialogMode !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={creating || updating}
            >
              {creating || updating ? <CircularProgress size={20} /> : 
               dialogMode === 'create' ? 'Vytvoriť rezerváciu' : 'Aktualizovať rezerváciu'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Customer Creation Dialog */}
      <Dialog
        open={customerDialogOpen}
        onClose={handleCloseCustomerDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Vytvoriť nového zákazníka</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              {/* Personal Information */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Meno"
                  value={customerFormData.firstName}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, firstName: e.target.value })}
                  error={!!customerFormErrors.firstName}
                  helperText={customerFormErrors.firstName}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Priezvisko"
                  value={customerFormData.lastName}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, lastName: e.target.value })}
                  error={!!customerFormErrors.lastName}
                  helperText={customerFormErrors.lastName}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={customerFormData.email}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                  error={!!customerFormErrors.email}
                  helperText={customerFormErrors.email}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefón"
                  value={customerFormData.phone}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                  error={!!customerFormErrors.phone}
                  helperText={customerFormErrors.phone}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Číslo vodičského preukazu"
                  value={customerFormData.licenseNumber}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, licenseNumber: e.target.value })}
                  error={!!customerFormErrors.licenseNumber}
                  helperText={customerFormErrors.licenseNumber}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Platnosť vodičského preukazu"
                  type="date"
                  value={customerFormData.licenseExpiry ? customerFormData.licenseExpiry.toISOString().split('T')[0] : ''}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, licenseExpiry: e.target.value ? new Date(e.target.value) : null })}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              
              {/* Address */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Adresa
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ulica"
                  value={customerFormData.address.street}
                  onChange={(e) => setCustomerFormData({ 
                    ...customerFormData, 
                    address: { ...customerFormData.address, street: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mesto"
                  value={customerFormData.address.city}
                  onChange={(e) => setCustomerFormData({ 
                    ...customerFormData, 
                    address: { ...customerFormData.address, city: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="PSČ"
                  value={customerFormData.address.zipCode}
                  onChange={(e) => setCustomerFormData({ 
                    ...customerFormData, 
                    address: { ...customerFormData.address, zipCode: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Krajina"
                  value={customerFormData.address.country}
                  onChange={(e) => setCustomerFormData({ 
                    ...customerFormData, 
                    address: { ...customerFormData.address, country: e.target.value }
                  })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCustomerDialog}>
            Zrušiť
          </Button>
          <Button
            onClick={handleCreateCustomer}
            variant="contained"
            disabled={creatingUser}
          >
            {creatingUser ? <CircularProgress size={20} /> : 'Vytvoriť zákazníka'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Potvrdiť vymazanie rezervácie</DialogTitle>
        <DialogContent>
          <Typography>
            Ste si istí, že chcete vymazať rezerváciu{' '}
            <strong>
              #{reservationToDelete?.reservationNumber}
            </strong>?
          </Typography>
          {reservationToDelete?.customer && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Zákazník: {reservationToDelete.customer.firstName} {reservationToDelete.customer.lastName}
            </Typography>
          )}
          <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
            ⚠️ POZOR: Táto akcia úplne odstráni rezerváciu z databázy. Táto akcia je NEVRATNÁ!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Rezervácia sa úplne vymaže zo systému a už nebude viditeľná v zoznamoch.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Zrušiť
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Vymazať rezerváciu
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <QRCodeDisplay
        reservationId={selectedReservationForQR?._id}
        open={qrDialogOpen}
        onClose={handleCloseQRDialog}
      />
    </Box>
  )
}

export default Reservations 