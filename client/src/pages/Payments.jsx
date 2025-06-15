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
  Autocomplete
} from '@mui/material'
import {
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  Description as InvoiceIcon
} from '@mui/icons-material'
import {
  useGetPaymentsQuery,
  useGetReservationsQuery,
  useCreatePaymentIntentMutation,
  useConfirmPaymentMutation,
  useProcessRefundMutation
} from '../store/store'
import { useLocation, useNavigate } from 'react-router-dom'

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

  // Handle dialog operations
  const handleOpenDialog = (mode, payment = null, reservation = null) => {
    setDialogMode(mode)
    setSelectedPayment(payment)
    setSelectedReservation(reservation)
    
    if (mode === 'create' && reservation) {
      setFormData({
        reservation: reservation._id,
        amount: reservation.totalAmount || 0,
        description: `Payment for reservation ${reservation.reservationNumber}`,
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
        currency: 'USD'
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

  // Handle PDF download
  const handleDownloadPDF = async (paymentId, invoiceNumber) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3001/api/payments/${paymentId}/invoice`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/pdf'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Error downloading invoice PDF')
    }
  }

  // Handle PDF preview
  const handlePreviewPDF = async (paymentId, invoiceNumber) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3001/api/payments/${paymentId}/invoice?preview=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/pdf'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Open in new tab for preview
      window.open(url, '_blank')
      
      // Clean up the URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 1000)
    } catch (error) {
      console.error('Error previewing PDF:', error)
      alert('Error previewing invoice PDF')
    }
  }

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Payments & Invoices
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage payments, process refunds, and generate invoices for customers.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refetchPayments}
            disabled={paymentsLoading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
            disabled={reservationsLoading || paymentsLoading}
          >
            Create Invoice
          </Button>
        </Box>
      </Box>

      {/* Loading State */}
      {(paymentsLoading || reservationsLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Loading payment and reservation data...
          </Typography>
        </Box>
      )}

      {/* Error State */}
      {(paymentsError || !paymentsLoading) && (
        <>
          {paymentsError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Error loading payments: {paymentsError.message || 'Unknown error'}
            </Alert>
          )}
        </>
      )}

      {/* Main Content - Only show when data is loaded */}
      {!paymentsLoading && !reservationsLoading && (
        <>
          {/* Statistics Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <MoneyIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h6">
                        ${payments
                          .filter(p => p.status === 'succeeded')
                          .reduce((sum, p) => sum + (p.amount || 0), 0)
                          .toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Revenue
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
                        Successful Payments
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
                        Pending Payments
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
                    <InvoiceIcon color="info" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h6">
                        {payments.filter(p => p.invoice?.invoiceNumber).length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Invoices Generated
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label={`All Payments (${payments.length})`} />
                <Tab label={`Successful (${getFilteredPayments('succeeded').length})`} />
                <Tab label={`Pending (${getFilteredPayments('pending').length})`} />
                <Tab label={`Failed (${getFilteredPayments('failed').length})`} />
                <Tab label={`Refunded (${getFilteredPayments('refunded').length + getFilteredPayments('partially_refunded').length})`} />
              </Tabs>
            </Box>

            {/* All Payments Tab */}
            <TabPanel value={tabValue} index={0}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Payment ID</TableCell>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Reservation</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
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
                            ${payment.amount.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status}
                            color={getStatusColor(payment.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog('view', payment)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {payment.invoice?.invoiceNumber && (
                              <>
                                <Tooltip title="Preview Invoice">
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePreviewPDF(payment._id, payment.invoice.invoiceNumber)}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download Invoice">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadPDF(payment._id, payment.invoice.invoiceNumber)}
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {payment.status === 'pending' && (
                              <Tooltip title="Confirm Payment">
                                <IconButton
                                  size="small"
                                  onClick={() => handleConfirmPayment(payment.stripePaymentIntentId)}
                                  color="success"
                                >
                                  <PaymentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {payment.status === 'succeeded' && payment.canBeRefunded && (
                              <Tooltip title="Process Refund">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog('refund', payment)}
                                  color="warning"
                                >
                                  <RefreshIcon fontSize="small" />
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
                        <TableCell>Payment ID</TableCell>
                        <TableCell>Invoice #</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Actions</TableCell>
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
                          <TableCell>${payment.amount.toFixed(2)}</TableCell>
                          <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
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
                                  <Tooltip title="Preview Invoice">
                                    <IconButton
                                      size="small"
                                      onClick={() => handlePreviewPDF(payment._id, payment.invoice.invoiceNumber)}
                                    >
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Download Invoice">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDownloadPDF(payment._id, payment.invoice.invoiceNumber)}
                                    >
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
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
          </Card>

          {/* Create/View/Refund Dialog */}
          <Dialog 
            open={openDialog} 
            onClose={handleCloseDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {dialogMode === 'create' ? 'Create Invoice/Payment' : 
               dialogMode === 'view' ? 'Payment Details' : 'Process Refund'}
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
                        onChange={(e, value) => {
                          setFormData({
                            ...formData,
                            reservation: value?._id || '',
                            amount: value?.pricing?.totalAmount || 0,
                            description: value ? `Payment for reservation ${value.reservationNumber}` : ''
                          })
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Reservation"
                            required
                            helperText={
                              reservationsLoading 
                                ? "Loading reservations..." 
                                : getUnpaidReservations().length === 0 
                                  ? "No confirmed or pending reservations without payments available" 
                                  : "Choose a confirmed or pending reservation without payment"
                            }
                          />
                        )}
                        disabled={dialogMode === 'view' || reservationsLoading}
                        isOptionEqualToValue={(option, value) => option._id === value?._id}
                        noOptionsText={
                          reservationsLoading 
                            ? "Loading reservations..." 
                            : reservations.length === 0 
                              ? "No reservations found" 
                              : reservations.filter(r => ['confirmed', 'pending'].includes(r.status)).length === 0
                                ? "No confirmed or pending reservations available"
                                : "All eligible reservations already have payments"
                        }
                        loading={reservationsLoading}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Amount ($)"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        disabled={dialogMode === 'view'}
                        required
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                          disabled={dialogMode === 'view'}
                          label="Payment Method"
                        >
                          <MenuItem value="card">Credit Card</MenuItem>
                          <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                          <MenuItem value="cash">Cash</MenuItem>
                          <MenuItem value="paypal">PayPal</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
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
                        label="Due Date"
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
                        label="Payment ID"
                        value={selectedPayment.paymentId}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Invoice Number"
                        value={selectedPayment.invoice?.invoiceNumber || 'N/A'}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Amount"
                        value={`$${selectedPayment.amount.toFixed(2)}`}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Status"
                        value={selectedPayment.status}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Customer"
                        value={`${selectedPayment.customer?.firstName} ${selectedPayment.customer?.lastName} (${selectedPayment.customer?.email})`}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        multiline
                        rows={3}
                        value={selectedPayment.description || 'No description'}
                        disabled
                      />
                    </Grid>
                    {selectedPayment?.invoice?.invoiceNumber && (
                      <>
                        <Grid item xs={12} md={6}>
                          <Button
                            onClick={() => handlePreviewPDF(selectedPayment._id, selectedPayment.invoice.invoiceNumber)}
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            sx={{ mr: 1 }}
                          >
                            Preview Invoice
                          </Button>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Button
                            onClick={() => handleDownloadPDF(selectedPayment._id, selectedPayment.invoice.invoiceNumber)}
                            variant="contained"
                            startIcon={<DownloadIcon />}
                          >
                            Download Invoice
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
                        Processing refund for payment {selectedPayment.paymentId}. 
                        Maximum refundable amount: ${selectedPayment.getRefundableAmount?.() || selectedPayment.amount}
                      </Alert>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Refund Amount ($)"
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
                        label="Refund Reason"
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
                Cancel
              </Button>
              {dialogMode === 'create' && (
                <Button
                  onClick={handleCreatePayment}
                  variant="contained"
                  disabled={creating || !formData.reservation}
                >
                  {creating ? <CircularProgress size={20} /> : 'Create Invoice'}
                </Button>
              )}
              {dialogMode === 'view' && selectedPayment?.invoice?.invoiceNumber && (
                <>
                  <Button
                    onClick={() => handlePreviewPDF(selectedPayment._id, selectedPayment.invoice.invoiceNumber)}
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    sx={{ mr: 1 }}
                  >
                    Preview Invoice
                  </Button>
                  <Button
                    onClick={() => handleDownloadPDF(selectedPayment._id, selectedPayment.invoice.invoiceNumber)}
                    variant="contained"
                    startIcon={<DownloadIcon />}
                  >
                    Download Invoice
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
                  {refunding ? <CircularProgress size={20} /> : 'Process Refund'}
                </Button>
              )}
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  )
}

export default Payments 