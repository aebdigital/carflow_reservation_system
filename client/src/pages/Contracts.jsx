import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  IconButton,
  Chip,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  Description as ContractIcon,
  ExpandMore as ExpandMoreIcon,
  PersonAdd as PersonAddIcon,
  DirectionsCar as CarIcon,
  EventNote as EventIcon,
  MonetizationOn as MoneyIcon,
  MonetizationOn as MonetizationOnIcon,
  Rule as RuleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material'
import { 
  useGetContractsQuery,
  useGetContractQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useDeleteContractMutation,
  useUpdateContractStatusMutation,
  useSignContractStaffMutation,
  useGenerateContractPDFMutation,
  useGetContractStatsQuery,
  useGetReservationsQuery,
  useGenerateReservationSlovakAgreementMutation,
} from '../store/store'
import { t } from '../utils/translations'

function Contracts() {
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'view'
  const [selectedContract, setSelectedContract] = useState(null)
  const [alert, setAlert] = useState(null)
  const [formData, setFormData] = useState({
    reservationId: '',
    customer: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Slovensko'
      },
      idNumber: '' // cislo op - ID number
    },
    vehicle: {
      brand: '',
      model: '',
      year: '',
      registrationNumber: '', // ECV
      vin: '', // VIN
      category: '',
      fuelType: '',
      transmission: '',
      color: '' // farba - color
    },
    rental: {
      startDate: '', // zaciatok najmu
      endDate: '', // koniec najmu
      pickupLocation: '',
      returnLocation: '',
      totalDays: 0, // pocet dni
      dailyRate: 0, // denna sadzba
      totalAmount: 0 // cena bez depozitu
    },
    services: {
      additionalServices: [], // sluzby a priplatky
      servicesTotal: 0 // sluzby a priplatky cena
    },
    pricing: {
      subtotal: 0, // cena bez depozitu
      servicesTotal: 0, // sluzby a priplatky cena  
      totalAmount: 0 // spolu cena
    },
    additionalServices: [],
    specialServices: {
      delivery: {
        isSelected: false,
        price: 0,
        address: ''
      },
      afterHours: {
        isSelected: false,
        price: 0,
        notes: ''
      }
    },
    rentalRules: {
      dailyKmLimit: 200,
      excessKmFee: 0.25,
      insuranceDeductible: 1000,
      prohibitedActivities: [
        'Fajčenie vo vozidle',
        'Prevoz domácich zvierat bez schválenia',
        'Jazda v teréne',
        'Používanie vozidla na komerčné účely'
      ],
      cancellationPolicy: 'Zrušenie rezervácie je možné do 24 hodín pred začiatkom prenájmu bez poplatku. Pri zrušení menej ako 24 hodín pred začiatkom sa účtuje poplatok 50% z celkovej sumy.'
    },
    notes: '',
    status: 'draft'
  })

  // API hooks
  const { data: contractsData, isLoading: contractsLoading, error: contractsError, refetch } = useGetContractsQuery()
  const { data: contractStatsData } = useGetContractStatsQuery()
  const { data: reservationsData } = useGetReservationsQuery({ status: 'confirmed' })
  const [createContract, { isLoading: creating }] = useCreateContractMutation()
  const [updateContract, { isLoading: updating }] = useUpdateContractMutation()
  const [deleteContract, { isLoading: deleting }] = useDeleteContractMutation()
  const [updateContractStatus] = useUpdateContractStatusMutation()
  const [signContractStaff] = useSignContractStaffMutation()
  const [generateContractPDF] = useGenerateContractPDFMutation()
  const [generateSlovakAgreement] = useGenerateReservationSlovakAgreementMutation()

  const contracts = contractsData?.data || []
  const stats = contractStatsData?.data || {}
  const availableReservations = reservationsData?.data || []

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  // Automatically calculate total pricing when values change
  useEffect(() => {
    const subtotal = formData.rental.totalAmount || 0;
    const servicesTotal = formData.services.servicesTotal || 0;
    const totalAmount = subtotal + servicesTotal;

    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        subtotal: subtotal,
        servicesTotal: servicesTotal,
        totalAmount: totalAmount
      }
    }));
  }, [formData.rental.totalAmount, formData.services.servicesTotal]);

  // Handlers
  const handleOpenDialog = (mode, contract = null) => {
    setDialogMode(mode)
    setSelectedContract(contract)
    
    if (mode === 'create') {
      setFormData({
        reservationId: '',
        customer: {
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'Slovensko'
          },
          idNumber: ''
        },
        vehicle: {
          brand: '',
          model: '',
          year: '',
          registrationNumber: '',
          vin: '',
          category: '',
          fuelType: '',
          transmission: '',
          color: ''
        },
        rental: {
          startDate: '',
          endDate: '',
          pickupLocation: '',
          returnLocation: '',
          totalDays: 0,
          dailyRate: 0,
          totalAmount: 0
        },
        services: {
          additionalServices: [],
          servicesTotal: 0
        },
        pricing: {
          subtotal: 0,
          servicesTotal: 0,
          totalAmount: 0
        },
        additionalServices: [],
        specialServices: {
          delivery: {
            isSelected: false,
            price: 0,
            address: ''
          },
          afterHours: {
            isSelected: false,
            price: 0,
            notes: ''
          }
        },
        rentalRules: {
          dailyKmLimit: 200,
          excessKmFee: 0.25,
          insuranceDeductible: 1000,
          prohibitedActivities: [
            'Fajčenie vo vozidle',
            'Prevoz domácich zvierat bez schválenia',
            'Jazda v teréne',
            'Používanie vozidla na komerčné účely'
          ],
          cancellationPolicy: 'Zrušenie rezervácie je možné do 24 hodín pred začiatkom prenájmu bez poplatku. Pri zrušení menej ako 24 hodín pred začiatkom sa účtuje poplatok 50% z celkovej sumy.'
        },
        notes: '',
        status: 'draft'
      })
    } else if (mode === 'view' && contract) {
      setFormData(contract)
    }
    
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedContract(null)
  }

  const handleReservationChange = (reservationId) => {
    const reservation = availableReservations.find(r => r._id === reservationId)
    if (reservation) {
      const days = Math.ceil((new Date(reservation.endDate) - new Date(reservation.startDate)) / (1000 * 60 * 60 * 24));
      
      // Calculate base rental cost
      const dailyRate = reservation.pricing?.dailyRate || reservation.car?.pricing?.dailyRate || 0;
      const rentalAmount = reservation.pricing?.totalAmount || (dailyRate * days);
      
      // Calculate additional services cost
      let servicesTotal = 0;
      const additionalServices = [];
      
      if (reservation.additionalServices && reservation.additionalServices.length > 0) {
        reservation.additionalServices.forEach(service => {
          const servicePrice = service.pricing?.amount || 0;
          const serviceTotalPrice = service.pricing?.type === 'per_day' ? servicePrice * days : servicePrice;
          servicesTotal += serviceTotalPrice;
          
          additionalServices.push({
            name: service.name || 'Neznáma služba',
            price: serviceTotalPrice,
            type: service.pricing?.type || 'fixed'
          });
        });
      }
      
      // Calculate insurance costs if any
      if (reservation.insurance && reservation.insurance.length > 0) {
        reservation.insurance.forEach(insurance => {
          const insurancePrice = insurance.pricing?.amount || 0;
          const insuranceTotalPrice = insurance.pricing?.type === 'per_day' ? insurancePrice * days : insurancePrice;
          servicesTotal += insuranceTotalPrice;
          
          additionalServices.push({
            name: insurance.name || 'Poistenie',
            price: insuranceTotalPrice,
            type: insurance.pricing?.type || 'fixed'
          });
        });
      }
      
      const totalAmount = rentalAmount + servicesTotal;

      setFormData(prev => ({
        ...prev,
        reservationId,
        customer: {
          firstName: reservation.customer?.firstName || '',
          lastName: reservation.customer?.lastName || '',
          phone: reservation.customer?.phone || '',
          email: reservation.customer?.email || '',
          address: reservation.customer?.address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'Slovensko'
          },
          idNumber: reservation.customer?.idNumber || ''
        },
        vehicle: {
          brand: reservation.car?.brand || '',
          model: reservation.car?.model || '',
          year: reservation.car?.year || '',
          registrationNumber: reservation.car?.registrationNumber || '',
          vin: reservation.car?.vin || '',
          category: reservation.car?.category || '',
          fuelType: reservation.car?.fuelType || '',
          transmission: reservation.car?.transmission || '',
          color: reservation.car?.color || ''
        },
        rental: {
          startDate: reservation.startDate || '',
          endDate: reservation.endDate || '',
          pickupLocation: reservation.pickupLocation?.name || '',
          returnLocation: reservation.dropoffLocation?.name || '',
          totalDays: days,
          dailyRate: dailyRate,
          totalAmount: rentalAmount
        },
        services: {
          additionalServices: additionalServices,
          servicesTotal: servicesTotal
        },
        pricing: {
          subtotal: rentalAmount,
          servicesTotal: servicesTotal,
          totalAmount: totalAmount
        }
      }))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    try {
      if (dialogMode === 'create') {
        // For create mode, send only what the backend expects
        const contractData = {
          reservationId: formData.reservationId,
          additionalServices: formData.additionalServices || [],
          specialServices: formData.specialServices || {},
          rentalRules: formData.rentalRules || {},
          notes: formData.notes || ''
        };
        
        console.log('Creating contract with data:', contractData);
        await createContract(contractData).unwrap()
        setAlert({ type: 'success', message: 'Zmluva bola úspešne vytvorená!' })
      }
      
      handleCloseDialog()
      refetch()
    } catch (error) {
      console.error('Error saving contract:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri ukladaní zmluvy: ${error.data?.message || error.message}` 
      })
    }
  }

  const handleDelete = async (contractId) => {
    if (window.confirm('Ste si istí, že chcete vymazať túto zmluvu?')) {
      try {
        await deleteContract(contractId).unwrap()
        setAlert({ type: 'success', message: 'Zmluva bola úspešne vymazaná!' })
        refetch()
      } catch (error) {
        console.error('Error deleting contract:', error)
        setAlert({ 
          type: 'error', 
          message: `Chyba pri mazaní zmluvy: ${error.data?.message || error.message}` 
        })
      }
    }
  }

  const handleStatusChange = async (contractId, newStatus) => {
    try {
      await updateContractStatus({ id: contractId, status: newStatus }).unwrap()
      setAlert({ type: 'success', message: `Stav zmluvy bol zmenený na ${newStatus}!` })
      refetch()
    } catch (error) {
      console.error('Error updating contract status:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri zmene stavu zmluvy: ${error.data?.message || error.message}` 
      })
    }
  }

  const handleSignContract = async (contractId) => {
    try {
      await signContractStaff(contractId).unwrap()
      setAlert({ type: 'success', message: 'Zmluva bola podpísaná!' })
      refetch()
    } catch (error) {
      console.error('Error signing contract:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri podpisovaní zmluvy: ${error.data?.message || error.message}` 
      })
    }
  }

  const handleDownloadPDF = async (contractId) => {
    try {
      await generateContractPDF({ id: contractId, preview: false }).unwrap()
      setAlert({ type: 'success', message: 'PDF zmluvy sa sťahuje!' })
    } catch (error) {
      console.error('Error generating PDF:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri generovaní PDF: ${error.data?.message || error.message || 'Neočakávaná chyba'}` 
      })
    }
  }

  const handlePreviewPDF = async (contractId) => {
    try {
      await generateContractPDF({ id: contractId, preview: true }).unwrap()
      setAlert({ type: 'success', message: 'PDF zmluvy sa otvára v novom okne!' })
    } catch (error) {
      console.error('Error previewing PDF:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri náhľade PDF: ${error.data?.message || error.message || 'Neočakávaná chyba'}` 
      })
    }
  }

  const handleDownloadSlovakAgreement = async (contract) => {
    try {
      if (!contract.reservationId) {
        setAlert({ type: 'error', message: 'Zmluva nemá priradenú rezerváciu' })
        return
      }

      // Open the Slovak agreement PDF in a new tab
      const url = `/api/reservations/${contract.reservationId}/slovak-agreement?preview=true`
      window.open(url, '_blank')
      
      setAlert({ type: 'success', message: 'Slovenská zmluva o nájme sa otvára!' })
    } catch (error) {
      console.error('Error generating Slovak agreement:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri generovaní slovenskej zmluvy: ${error.data?.message || error.message}` 
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'signed': return 'success'
      case 'pending': return 'warning'
      case 'draft': return 'default'
      case 'cancelled': return 'error'
      case 'expired': return 'error'
      default: return 'default'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'signed': return 'Podpísaná'
      case 'pending': return 'Čakajúca'
      case 'draft': return 'Koncept'
      case 'cancelled': return 'Zrušená'
      case 'expired': return 'Vypršaná'
      default: return status
    }
  }

  if (contractsLoading) {
    return <Typography>Načítava sa...</Typography>
  }

  if (contractsError) {
    return <Alert severity="error">Chyba pri načítavaní zmlúv: {contractsError.message}</Alert>
  }

  return (
    <Box>
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
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
            {t('contracts')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Vytvárajte a spravujte zmluvy pre rezervácie vozidiel.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
          sx={{ 
            borderRadius: 2,
            alignSelf: { xs: 'flex-start', sm: 'auto' },
            mt: { xs: 1, sm: 0 }
          }}
        >
          Nová zmluva
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {stats.totalContracts || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Celkový počet zmlúv
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {stats.signedContracts || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Podpísané zmluvy
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {stats.contractsThisMonth || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Zmluvy tento mesiac
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                {stats.contractsByStatus?.find(s => s._id === 'pending')?.count || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Čakajúce zmluvy
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Contracts Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Zmluvy
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Číslo zmluvy</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Zákazník</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Vozidlo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Dátum vytvorenia</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Suma</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Akcie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Žiadne zmluvy neboli vytvorené
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  contracts.map((contract) => (
                    <TableRow key={contract._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {contract.contractNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {contract.customer.firstName} {contract.customer.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {contract.customer.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {contract.vehicle.brand} {contract.vehicle.model}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {contract.vehicle.registrationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(contract.createdAt).toLocaleDateString('sk-SK')}
                        </Typography>
                      </TableCell>
                    <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {contract.rental.totalAmount}€
                      </Typography>
                    </TableCell>
                    <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Stiahnuť PDF">
                      <IconButton 
                        size="small" 
                              onClick={() => handleDownloadPDF(contract._id)}
                        color="primary"
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                          </Tooltip>
                          <Tooltip title="Náhľad PDF">
                            <IconButton 
                              size="small" 
                              onClick={() => handlePreviewPDF(contract._id)}
                              color="info"
                            >
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Vymazať">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDelete(contract._id)}
                              color="error"
                              disabled={contract.status === 'signed'}
                            >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                          </Tooltip>
                        </Box>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Contract Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' && 'Nová zmluva'}
          {dialogMode === 'view' && 'Zobraziť zmluvu'}
        </DialogTitle>
        
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {dialogMode === 'create' && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Vyberte rezerváciu</InputLabel>
                    <Select
                      value={formData.reservationId}
                      onChange={(e) => handleReservationChange(e.target.value)}
                      label="Vyberte rezerváciu"
                    >
                      {availableReservations.map((reservation) => (
                        <MenuItem key={reservation._id} value={reservation._id}>
                          {reservation.reservationNumber} - {reservation.customer?.firstName} {reservation.customer?.lastName} - {reservation.car?.brand} {reservation.car?.model}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}

            {/* Customer Information */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <PersonAddIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Informácie o zákazníkovi</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Meno"
                      value={formData.customer.firstName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, firstName: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Priezvisko"
                      value={formData.customer.lastName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, lastName: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Telefón"
                      value={formData.customer.phone}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, phone: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="E-mail"
                      value={formData.customer.email}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, email: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Adresa"
                      value={formData.customer.address.street}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { 
                          ...prev.customer, 
                          address: { ...prev.customer.address, street: e.target.value }
                        }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Číslo OP (voliteľné)"
                      value={formData.customer.idNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, idNumber: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Vehicle Information */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <CarIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Informácie o vozidle</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Značka"
                      value={formData.vehicle.brand}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vehicle: { ...prev.vehicle, brand: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Model"
                      value={formData.vehicle.model}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vehicle: { ...prev.vehicle, model: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Evidenčné číslo"
                      value={formData.vehicle.registrationNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vehicle: { ...prev.vehicle, registrationNumber: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Rok výroby"
                      type="number"
                      value={formData.vehicle.year}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vehicle: { ...prev.vehicle, year: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Farba"
                      value={formData.vehicle.color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vehicle: { ...prev.vehicle, color: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Rental Details */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <EventIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Detaily prenájmu</Typography>
              </AccordionSummary>
              <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                      label="Dátum od"
                      type="date"
                      value={formData.rental.startDate ? new Date(formData.rental.startDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, startDate: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                      InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                      label="Dátum do"
                type="date"
                      value={formData.rental.endDate ? new Date(formData.rental.endDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, endDate: e.target.value }
                      }))}
                disabled={dialogMode === 'view'}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Miesto prevzatia"
                      value={formData.rental.pickupLocation}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, pickupLocation: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Miesto vrátenia"
                      value={formData.rental.returnLocation}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, returnLocation: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Počet dní"
                      type="number"
                      value={formData.rental.totalDays}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, totalDays: parseInt(e.target.value) || 0 }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Denná sadzba (€)"
                      type="number"
                      value={formData.rental.dailyRate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, dailyRate: parseFloat(e.target.value) || 0 }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Celková suma (€)"
                      type="number"
                      value={formData.rental.totalAmount}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, totalAmount: parseFloat(e.target.value) || 0 }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Services and Additional Charges */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <MoneyIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Služby a priplatky</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
            <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Dodatočné služby a priplatky:
                    </Typography>
                    <List dense>
                      {formData.services.additionalServices.map((service, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={service.name} secondary={`${service.price}€`} />
                          <ListItemSecondaryAction>
                            <IconButton
                              size="small"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                services: {
                                  ...prev.services,
                                  additionalServices: prev.services.additionalServices.filter((_, i) => i !== index)
                                }
                              }))}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Dodatočná služba/priplátky (€)"
                      type="number"
                      value={formData.services.servicesTotal}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        services: {
                          ...prev.services,
                          servicesTotal: parseFloat(e.target.value) || 0
                        }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Celková suma služieb a priplatkov (€)"
                      type="number"
                      value={formData.services.servicesTotal}
                      disabled
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Pricing */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <MonetizationOnIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Cena</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cena bez depozitu (€)"
                      type="number"
                      value={formData.pricing.subtotal}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Celková suma služieb a priplatkov (€)"
                      type="number"
                      value={formData.pricing.servicesTotal}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Celková suma (€)"
                      type="number"
                      value={formData.pricing.totalAmount}
                      disabled
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Rental Rules */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <RuleIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Pravidlá prenájmu</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Denný limit km"
                      type="number"
                      value={formData.rentalRules.dailyKmLimit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rentalRules: { ...prev.rentalRules, dailyKmLimit: parseInt(e.target.value) || 0 }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Poplatok za nadlimitné km (€/km)"
                      type="number"
                      step="0.01"
                      value={formData.rentalRules.excessKmFee}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rentalRules: { ...prev.rentalRules, excessKmFee: parseFloat(e.target.value) || 0 }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Spoluúčasť pri poistení (€)"
                      type="number"
                      value={formData.rentalRules.insuranceDeductible}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rentalRules: { ...prev.rentalRules, insuranceDeductible: parseInt(e.target.value) || 0 }
                      }))}
                  disabled={dialogMode === 'view'}
                    />
            </Grid>
            <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Storno podmienky"
                      multiline
                      rows={3}
                      value={formData.rentalRules.cancellationPolicy}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rentalRules: { ...prev.rentalRules, cancellationPolicy: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Notes */}
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Poznámky"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={dialogMode === 'view'}
              />
            </Box>
        </DialogContent>
        
          <DialogActions>
          <Button onClick={handleCloseDialog}>
              Zrušiť
          </Button>
          {dialogMode !== 'view' && (
              <Button 
                type="submit" 
                variant="contained" 
                disabled={creating}
              >
                {creating ? 'Ukladá sa...' : 'Uložiť'}
              </Button>
          )}
        </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

export default Contracts 