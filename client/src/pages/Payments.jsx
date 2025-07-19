import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Autocomplete,
  Snackbar
} from '@mui/material'
import {
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  Description as InvoiceIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material'
import {
  useGetPaymentsQuery,
  useGetReservationsQuery,
  useCreatePaymentIntentMutation,
  useConfirmPaymentMutation,
  useUpdatePaymentStatusMutation,
  useProcessRefundMutation
} from '../store/store'
import { useLocation, useNavigate } from 'react-router-dom'
import { t } from '../utils/translations'
import QRCodeDisplay from '../components/QRCodeDisplay'

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

function Payments() {
  const [tabValue, setTabValue] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'view', 'refund'
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedReservationForQR, setSelectedReservationForQR] = useState(null)

  // Form state for creating invoices/payments
  const [formData, setFormData] = useState({
    reservation: '',
    amount: 0,
    description: '',
    paymentMethod: 'card',
    dueDate: ''
  })

  // API hooks
  const { 
    data: paymentsData, 
    isLoading: paymentsLoading, 
    error: paymentsError,
    refetch: refetchPayments
  } = useGetPaymentsQuery({ populate: 'reservation,customer' })

  const { 
    data: reservationsData, 
    isLoading: reservationsLoading 
  } = useGetReservationsQuery({ populate: 'customer,car' })

  const { 
    data: paymentsForReservationCheck, 
    isLoading: paymentsForReservationLoading 
  } = useGetPaymentsQuery({ populate: 'reservation' })

  const [createPaymentIntent, { isLoading: creating }] = useCreatePaymentIntentMutation()
  const [confirmPayment, { isLoading: confirming }] = useConfirmPaymentMutation()
  const [updatePaymentStatus, { isLoading: updatingStatus }] = useUpdatePaymentStatusMutation()
  const [processRefund, { isLoading: refunding }] = useProcessRefundMutation()

  const payments = paymentsData?.data || []
  const reservations = reservationsData?.data || []
  const paymentsForCheck = paymentsForReservationCheck?.data || []

  const location = useLocation()
  const navigate = useNavigate()

  // Handle navigation from reservations page
  useEffect(() => {
    if (location.state?.createInvoice && location.state?.reservation) {
      const reservation = location.state.reservation
      handleOpenDialog('create', null, reservation)
      // Clear the state to prevent re-opening on refresh
      navigate('/payments', { replace: true })
    }
  }, [location.state])

  // Filter payments by status
  const getFilteredPayments = (status) => {
    if (status === 'all') return payments
    return payments.filter(payment => payment.status === status)
  }

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      processing: 'info',
      succeeded: 'success',
      failed: 'error',
      cancelled: 'default',
      refunded: 'secondary',
      partially_refunded: 'warning'
    }
    return colors[status] || 'default'
  }

  // Status text mapping to Slovak
  const getStatusText = (status) => {
    const statusTexts = {
      pending: 'Nezaplatené',
      processing: 'Spracováva sa',
      succeeded: 'Zaplatené',
      failed: 'Neúspešné',
      cancelled: 'Zrušené',
      refunded: 'Vrátené',
      partially_refunded: 'Čiastočne vrátené'
    }
    return statusTexts[status] || status
  }

  // Handle dialog operations
  const handleOpenDialog = (mode, payment = null, reservation = null) => {
    setDialogMode(mode)
    setSelectedPayment(payment)
    setSelectedReservation(reservation)
    
    if (mode === 'create' && reservation) {
      setFormData({
        reservation: reservation._id,
        amount: reservation.pricing?.totalAmount || (reservation.pricing?.dailyRate * reservation.pricing?.totalDays) || 0,
        description: `Platba za rezerváciu ${reservation.reservationNumber}`,
        paymentMethod: 'card',
        dueDate: new Date().toISOString().split('T')[0]
      })
    } else if (mode === 'view' && payment) {
      setFormData({
        reservation: payment.reservation?._id || '',
        amount: payment.amount || 0,
        description: payment.description || '',
        paymentMethod: payment.paymentMethod?.type || 'card',
        dueDate: payment.invoice?.dueAt ? payment.invoice.dueAt.split('T')[0] : ''
      })
    }
    
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedPayment(null)
    setSelectedReservation(null)
    setFormData({
      reservation: '',
      amount: 0,
      description: '',
      paymentMethod: 'card',
      dueDate: ''
    })
  }

  // Handle creating payment/invoice
  const handleCreatePayment = async () => {
    try {
      const paymentData = {
        reservationId: formData.reservation,
        amount: formData.amount,
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        dueDate: formData.dueDate,
        currency: 'EUR'
      }

      const result = await createPaymentIntent(paymentData).unwrap()
      console.log('Payment created successfully:', result)
      handleCloseDialog()
      refetchPayments()
    } catch (error) {
      console.error('Error creating payment:', error)
      const errorMessage = error?.data?.message || error?.message || 'Unknown error occurred'
      alert(`Error creating payment: ${errorMessage}`)
    }
  }

  // Handle confirming payment (for demo purposes)
  const handleConfirmPayment = async (stripePaymentIntentId) => {
    try {
      await confirmPayment({
        paymentIntentId: stripePaymentIntentId,
        paymentMethodType: 'card'
      }).unwrap()
      refetchPayments()
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert('Error confirming payment. Please try again.')
    }
  }

  // Handle payment status toggle
  const handleTogglePaymentStatus = async (payment) => {
    try {
      const newStatus = payment.status === 'succeeded' ? 'pending' : 'succeeded'
      const result = await updatePaymentStatus({
        id: payment._id,
        status: newStatus
      }).unwrap()
      
      setSnackbar({ 
        open: true, 
        message: result.message || `Stav platby bol zmenený na ${newStatus === 'succeeded' ? 'Zaplatené' : 'Nezaplatené'}`, 
        severity: 'success' 
      })
      refetchPayments()
    } catch (error) {
      console.error('Error updating payment status:', error)
      setSnackbar({ 
        open: true, 
        message: 'Chyba pri zmene stavu platby', 
        severity: 'error' 
      })
    }
  }

  // Handle refund
  const handleRefund = async () => {
    if (!selectedPayment) return
    
    try {
      await processRefund({
        id: selectedPayment._id,
        amount: formData.amount,
        reason: formData.description
      }).unwrap()
      handleCloseDialog()
      refetchPayments()
    } catch (error) {
      console.error('Error processing refund:', error)
      alert('Error processing refund. Please try again.')
    }
  }

  // Handle downloading PDF invoice - Fixed URL concatenation
  const handleDownloadPDF = async (paymentId) => {
    try {
      const baseApiUrl = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${baseApiUrl}/payments/${paymentId}/invoice`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download invoice');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSnackbar({ open: true, message: 'Invoice downloaded successfully', severity: 'success' });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      setSnackbar({ open: true, message: 'Failed to download invoice', severity: 'error' });
    }
  };

  // Handle previewing PDF invoice - Fixed URL concatenation
  const handlePreviewPDF = async (paymentId) => {
    try {
      const baseApiUrl = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${baseApiUrl}/payments/${paymentId}/invoice?preview=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to generate invoice');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error previewing invoice:', error);
      setSnackbar({ open: true, message: 'Failed to preview invoice', severity: 'error' });
    }
  };

  // Get reservations without payments for invoice creation
  const getUnpaidReservations = () => {
    if (!reservations || reservations.length === 0) {
      return []
    }

    const paidReservationIds = paymentsForCheck
      .filter(p => ['succeeded', 'pending', 'processing'].includes(p.status))
      .map(p => p.reservation?._id)
      .filter(Boolean) // Remove any undefined values
    
    // Check for both 'confirmed' and 'pending' status reservations
    const eligibleReservations = reservations.filter(r => 
      ['confirmed', 'pending'].includes(r.status)
    )
    
    const unpaidReservations = eligibleReservations.filter(r => 
      !paidReservationIds.includes(r._id)
    )
    
    return unpaidReservations
  }

  // Handle QR code display
  const handleShowQRCode = (payment) => {
    setSelectedPayment(payment)
    setSelectedReservationForQR(payment.reservation)
    setQrDialogOpen(true)
  }

  const handleCloseQRDialog = () => {
    setQrDialogOpen(false)
    setSelectedReservationForQR(null)
    setSelectedPayment(null)
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
            {t('paymentsManagement')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('managePaymentsInvoices')}
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' },
          alignSelf: { xs: 'flex-start', sm: 'auto' },
          mt: { xs: 1, sm: 0 },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refetchPayments}
            disabled={paymentsLoading}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {t('refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
            disabled={reservationsLoading || paymentsLoading}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {t('createPayment')}
          </Button>
        </Box>
      </Box>

      {/* Loading State */}
      {(paymentsLoading || reservationsLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            {t('loading')}
          </Typography>
        </Box>
      )}

      {/* Error State */}
      {(paymentsError || !paymentsLoading) && (
        <>
          {paymentsError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {t('error')}: {paymentsError.message || t('error')}
            </Alert>
          )}
        </>
      )}

      {/* Main Content - Only show when data is loaded */}
      {!paymentsLoading && !reservationsLoading && (
        <>
          {/* Alert for confirmed reservations without payments */}
          {getUnpaidReservations().length > 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Potvrdené rezervácie čakajúce na vytvorenie faktúry
              </Typography>
              <Typography variant="body2">
                Máte {getUnpaidReservations().length} potvrdenú/é rezerváciu/e bez platby. 
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={() => handleOpenDialog('create')}
                  sx={{ ml: 1 }}
                >
                  Vytvoriť faktúru
                </Button>
              </Typography>
              <Box sx={{ mt: 1 }}>
                {getUnpaidReservations().slice(0, 3).map((reservation) => (
                  <Chip
                    key={reservation._id}
                    label={`${reservation.reservationNumber} - ${reservation.customer?.firstName} ${reservation.customer?.lastName}`}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                    onClick={() => handleOpenDialog('create', null, reservation)}
                    clickable
                  />
                ))}
                {getUnpaidReservations().length > 3 && (
                  <Chip
                    label={`+${getUnpaidReservations().length - 3} ďalších`}
                    size="small"
                    variant="outlined"
                    onClick={() => handleOpenDialog('create')}
                    clickable
                  />
                )}
              </Box>
            </Alert>
          )}

          {/* Statistics Cards */}
          <Grid container spacing={3} sx={{ mb: 4, ml: 0 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <MoneyIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h6">
                        {payments
                          .filter(p => p.status === 'succeeded')
                          .reduce((sum, p) => sum + (p.amount || 0), 0)
                          .toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('revenue')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PaymentIcon color="success" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h6">
                        {getFilteredPayments('succeeded').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Zaplatené platby
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ReceiptIcon color="warning" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h6">
                        {getFilteredPayments('pending').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Nezaplatené platby
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <InvoiceIcon color="warning" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h6">
                        {getUnpaidReservations().length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Čakajúce faktúry
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mt: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label={`Všetky platby (${payments.length})`} />
                <Tab label={`Zaplatené (${getFilteredPayments('succeeded').length})`} />
                <Tab label={`Nezaplatené (${getFilteredPayments('pending').length})`} />
                <Tab label={`Neúspešné (${getFilteredPayments('failed').length})`} />
                <Tab label={`Vrátené (${getFilteredPayments('refunded').length + getFilteredPayments('partially_refunded').length})`} />
                <Tab label={`Čakajúce faktúry (${getUnpaidReservations().length})`} />
              </Tabs>
            </Box>

            {/* All Payments Tab */}
            <TabPanel value={tabValue} index={0}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID platby</TableCell>
                      <TableCell>Faktúra č.</TableCell>
                      <TableCell>Zákazník</TableCell>
                      <TableCell>Rezervácia</TableCell>
                      <TableCell>Suma</TableCell>
                      <TableCell>Stav</TableCell>
                      <TableCell>Dátum</TableCell>
                      <TableCell>Akcie</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {payment.paymentId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {payment.invoice?.invoiceNumber || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {payment.customer?.firstName} {payment.customer?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payment.customer?.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {payment.reservation?.reservationNumber || 'N/A'}
                          </Typography>
                          {payment.reservation?.car && (
                            <Typography variant="caption" color="text.secondary">
                              {payment.reservation.car.brand} {payment.reservation.car.model}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {payment.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(payment.status)}
                            color={getStatusColor(payment.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(payment.createdAt).toLocaleDateString('sk-SK')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title={t('viewDetails')}>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog('view', payment)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {payment.invoice?.invoiceNumber && (
                              <>
                                <Tooltip title={t('previewInvoice')}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePreviewPDF(payment._id)}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('downloadInvoice')}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadPDF(payment._id)}
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {payment.status === 'pending' && (
                              <Tooltip title={t('confirmPayment')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleConfirmPayment(payment.stripePaymentIntentId)}
                                  color="success"
                                >
                                  <PaymentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {(['pending', 'succeeded'].includes(payment.status)) && (
                              <Tooltip title={payment.status === 'succeeded' ? 'Označiť ako nezaplatené' : 'Označiť ako zaplatené'}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleTogglePaymentStatus(payment)}
                                  color={payment.status === 'succeeded' ? 'warning' : 'success'}
                                  disabled={updatingStatus}
                                >
                                  <MoneyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {payment.status === 'succeeded' && payment.canBeRefunded && (
                              <Tooltip title={t('processRefund')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog('refund', payment)}
                                  color="warning"
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {payment.status === 'succeeded' && payment.stripePaymentIntentId && (
                              <Tooltip title={t('displayQR')}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setSelectedReservationForQR(payment.reservation);
                                    setQrDialogOpen(true);
                                  }}
                                >
                                  <QrCodeIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {payment.reservation && (
                              <Tooltip title="Zobraziť QR kódy">
                                <IconButton
                                  size="small"
                                  onClick={() => handleShowQRCode(payment)}
                                  color="info"
                                >
                                  <QrCodeIcon fontSize="small" />
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
            </TabPanel>

            {/* Filtered tabs */}
            {['succeeded', 'pending', 'failed', ['refunded', 'partially_refunded']].map((status, index) => (
              <TabPanel key={Array.isArray(status) ? status.join('-') : status} value={tabValue} index={index + 1}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID platby</TableCell>
                        <TableCell>Faktúra č.</TableCell>
                        <TableCell>Zákazník</TableCell>
                        <TableCell>Suma</TableCell>
                        <TableCell>Dátum</TableCell>
                        <TableCell>Akcie</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(Array.isArray(status) 
                        ? payments.filter(p => status.includes(p.status))
                        : getFilteredPayments(status)
                      ).map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell>{payment.paymentId}</TableCell>
                          <TableCell>{payment.invoice?.invoiceNumber || 'N/A'}</TableCell>
                          <TableCell>
                            {payment.customer?.firstName} {payment.customer?.lastName}
                          </TableCell>
                          <TableCell>{payment.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</TableCell>
                          <TableCell>{new Date(payment.createdAt).toLocaleDateString('sk-SK')}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog('view', payment)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                              {payment.invoice?.invoiceNumber && (
                                <>
                                  <Tooltip title={t('previewInvoice')}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handlePreviewPDF(payment._id)}
                                    >
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title={t('downloadInvoice')}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDownloadPDF(payment._id)}
                                    >
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                              {payment.reservation && (
                                <Tooltip title="Zobraziť QR kódy">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleShowQRCode(payment)}
                                    color="info"
                                  >
                                    <QrCodeIcon fontSize="small" />
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
              </TabPanel>
            ))}

            {/* Waiting Invoices Tab - New tab for confirmed reservations without payments */}
            <TabPanel value={tabValue} index={5}>
              {getUnpaidReservations().length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Žiadne potvrdené rezervácie bez platieb
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Všetky potvrdené rezervácie už majú vytvorené platby.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Rezervácia č.</TableCell>
                        <TableCell>Zákazník</TableCell>
                        <TableCell>Vozidlo</TableCell>
                        <TableCell>Dátum prenájmu</TableCell>
                        <TableCell>Suma</TableCell>
                        <TableCell>Stav</TableCell>
                        <TableCell>Akcie</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getUnpaidReservations().map((reservation) => (
                        <TableRow key={reservation._id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {reservation.reservationNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {reservation.customer?.firstName} {reservation.customer?.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {reservation.customer?.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {reservation.car?.brand} {reservation.car?.model}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {reservation.car?.registrationNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(reservation.startDate).toLocaleDateString('sk-SK')} - {new Date(reservation.endDate).toLocaleDateString('sk-SK')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {(reservation.pricing?.totalAmount || 0).toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={reservation.status === 'confirmed' ? 'Potvrdená' : 'Čakajúca'}
                              color={reservation.status === 'confirmed' ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenDialog('create', null, reservation)}
                            >
                              Vytvoriť faktúru
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </Card>

          {/* Create/View/Refund Dialog */}
          <Dialog 
            open={openDialog} 
            onClose={handleCloseDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {dialogMode === 'create' ? t('createInvoicePayment') : 
               dialogMode === 'view' ? t('paymentDetails') : t('processRefund')}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                {dialogMode === 'create' && (
                  <>
                    <Grid item xs={12}>
                      <Autocomplete
                        options={getUnpaidReservations()}
                        getOptionLabel={(option) => 
                          `${option.reservationNumber} - ${option.customer?.firstName} ${option.customer?.lastName} (${option.car?.brand} ${option.car?.model})`
                        }
                        value={getUnpaidReservations().find(r => r._id === formData.reservation) || null}
                        onChange={(_, value) => {
                          setFormData({
                            ...formData,
                            reservation: value?._id || '',
                            amount: value?.pricing?.totalAmount || (value?.pricing?.dailyRate * value?.pricing?.totalDays) || 0,
                            description: value ? `Platba za rezerváciu ${value.reservationNumber}` : ''
                          })
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Vybrať rezerváciu"
                            required
                            helperText={
                              reservationsLoading 
                                ? "Načítavajú sa rezervácie..." 
                                : getUnpaidReservations().length === 0 
                                  ? "Žiadne potvrdené alebo čakajúce rezervácie bez platieb nie sú dostupné" 
                                  : "Vyberte potvrdenú alebo čakajúcu rezerváciu bez platby"
                            }
                          />
                        )}
                        disabled={dialogMode === 'view' || reservationsLoading}
                        isOptionEqualToValue={(option, value) => option._id === value?._id}
                        noOptionsText={
                          reservationsLoading 
                            ? "Načítavajú sa rezervácie..." 
                            : reservations.length === 0 
                              ? "Žiadne rezervácie neboli nájdené" 
                              : reservations.filter(r => ['confirmed', 'pending'].includes(r.status)).length === 0
                                ? "Žiadne potvrdené alebo čakajúce rezervácie nie sú dostupné"
                                : "Všetky oprávnené rezervácie už majú platby"
                        }
                        loading={reservationsLoading}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Suma (€)"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        disabled={dialogMode === 'view'}
                        required
                        error={formData.amount <= 0}
                        helperText={formData.amount <= 0 ? "Suma musí byť väčšia ako 0 €" : "Suma sa automaticky načíta z rezervácie"}
                        inputProps={{ min: 0.01, step: 0.01 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Spôsob platby</InputLabel>
                        <Select
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                          disabled={dialogMode === 'view'}
                          label="Spôsob platby"
                        >
                          <MenuItem value="card">Kreditná karta</MenuItem>
                          <MenuItem value="bank_transfer">Bankový prevod</MenuItem>
                          <MenuItem value="cash">Hotovosť</MenuItem>
                          <MenuItem value="paypal">PayPal</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Popis"
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Dátum splatnosti"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        disabled={dialogMode === 'view'}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}

                {dialogMode === 'view' && selectedPayment && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="ID platby"
                        value={selectedPayment.paymentId}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Číslo faktúry"
                        value={selectedPayment.invoice?.invoiceNumber || 'N/A'}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Suma"
                        value={`${selectedPayment.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}`}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Stav"
                        value={getStatusText(selectedPayment.status)}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Zákazník"
                        value={`${selectedPayment.customer?.firstName} ${selectedPayment.customer?.lastName} (${selectedPayment.customer?.email})`}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Popis"
                        multiline
                        rows={3}
                        value={selectedPayment.description || 'Žiadny popis'}
                        disabled
                      />
                    </Grid>
                    {selectedPayment?.invoice?.invoiceNumber && (
                      <>
                        <Grid item xs={12} md={6}>
                          <Button
                            onClick={() => handlePreviewPDF(selectedPayment._id)}
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            sx={{ mr: 1 }}
                          >
                            Náhľad faktúry
                          </Button>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Button
                            onClick={() => handleDownloadPDF(selectedPayment._id)}
                            variant="contained"
                            startIcon={<DownloadIcon />}
                          >
                            Stiahnuť faktúru
                          </Button>
                        </Grid>
                      </>
                    )}
                  </>
                )}

                {dialogMode === 'refund' && selectedPayment && (
                  <>
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Spracovanie vrátenia platby {selectedPayment.paymentId}. 
                        Maximálna suma na vrátenie: {(selectedPayment.getRefundableAmount?.() || selectedPayment.amount).toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                      </Alert>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Suma na vrátenie (€)"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        required
                        inputProps={{ 
                          min: 0, 
                          max: selectedPayment.getRefundableAmount?.() || selectedPayment.amount,
                          step: 0.01 
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Dôvod vrátenia"
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>
                Zrušiť
              </Button>
              {dialogMode === 'create' && (
                <Button
                  onClick={handleCreatePayment}
                  variant="contained"
                  disabled={creating || !formData.reservation || !formData.amount || formData.amount <= 0}
                >
                  {creating ? <CircularProgress size={20} /> : 'Vytvoriť faktúru'}
                </Button>
              )}
              {dialogMode === 'view' && selectedPayment?.invoice?.invoiceNumber && (
                <>
                  <Button
                    onClick={() => handlePreviewPDF(selectedPayment._id)}
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    sx={{ mr: 1 }}
                  >
                    Náhľad faktúry
                  </Button>
                  <Button
                    onClick={() => handleDownloadPDF(selectedPayment._id)}
                    variant="contained"
                    startIcon={<DownloadIcon />}
                  >
                    Stiahnuť faktúru
                  </Button>
                </>
              )}
              {dialogMode === 'refund' && (
                <Button
                  onClick={handleRefund}
                  variant="contained"
                  color="warning"
                  disabled={refunding || !formData.amount || !formData.description}
                >
                  {refunding ? <CircularProgress size={20} /> : 'Spracovať vrátenie'}
                </Button>
              )}
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* QR Code Dialog */}
      <QRCodeDisplay
        reservationId={selectedReservationForQR?._id}
        open={qrDialogOpen}
        onClose={handleCloseQRDialog}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  )
}

export default Payments 