import React, { useState } from 'react'
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
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  Description as ContractIcon,
} from '@mui/icons-material'
import { t } from '../utils/translations'

function Contracts() {
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [formData, setFormData] = useState({
    contractNumber: '',
    reservationId: '',
    customerName: '',
    contractDate: '',
    status: 'draft',
  })

  // Mock data for contracts
  const contracts = [
    {
      id: 1,
      contractNumber: 'ZML-2024-001',
      reservationId: 'RES001234',
      customerName: 'John Doe',
      contractDate: '2024-06-15',
      carInfo: '2023 Toyota Camry',
      status: 'signed',
      amount: '380€',
    },
    {
      id: 2,
      contractNumber: 'ZML-2024-002',
      reservationId: 'RES001235',
      customerName: 'Jane Smith',
      contractDate: '2024-06-16',
      carInfo: '2023 Honda Accord',
      status: 'draft',
      amount: '240€',
    },
    {
      id: 3,
      contractNumber: 'ZML-2024-003',
      reservationId: 'RES001236',
      customerName: 'Mike Johnson',
      contractDate: '2024-06-17',
      carInfo: '2023 BMW X5',
      status: 'pending',
      amount: '950€',
    },
  ]

  // Mock reservations for selection
  const availableReservations = [
    { id: 'RES001234', customer: 'John Doe', car: '2023 Toyota Camry', amount: '380€' },
    { id: 'RES001235', customer: 'Jane Smith', car: '2023 Honda Accord', amount: '240€' },
    { id: 'RES001236', customer: 'Mike Johnson', car: '2023 BMW X5', amount: '950€' },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'signed': return 'success'
      case 'pending': return 'warning'
      case 'draft': return 'default'
      default: return 'default'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'signed': return 'Podpísaná'
      case 'pending': return 'Čakajúca'
      case 'draft': return t('draft')
      default: return status
    }
  }

  const generateContractNumber = () => {
    const year = new Date().getFullYear()
    const count = contracts.length + 1
    return `ZML-${year}-${count.toString().padStart(3, '0')}`
  }

  const handleOpenDialog = (mode, contract = null) => {
    setDialogMode(mode)
    if (contract) {
      setFormData({
        contractNumber: contract.contractNumber || '',
        reservationId: contract.reservationId || '',
        customerName: contract.customerName || '',
        contractDate: contract.contractDate || '',
        status: contract.status || 'draft',
      })
    } else {
      setFormData({
        contractNumber: generateContractNumber(),
        reservationId: '',
        customerName: '',
        contractDate: new Date().toISOString().split('T')[0],
        status: 'draft',
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setFormData({
      contractNumber: '',
      reservationId: '',
      customerName: '',
      contractDate: '',
      status: 'draft',
    })
  }

  const handleSubmit = () => {
    // Here you would implement the contract creation/update logic
    console.log('Contract data:', formData)
    handleCloseDialog()
  }

  const handleReservationChange = (reservationId) => {
    const reservation = availableReservations.find(r => r.id === reservationId)
    if (reservation) {
      setFormData({
        ...formData,
        reservationId,
        customerName: reservation.customer,
      })
    }
  }

  const handleDownloadContract = (contractId) => {
    // Here you would implement the contract PDF generation and download
    console.log('Downloading contract:', contractId)
    alert('Funkcia sťahovania zmluvy bude implementovaná neskôr s PDF šablónou.')
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
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
          sx={{ borderRadius: 2 }}
        >
          {t('createContract')}
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {contracts.length}
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
                {contracts.filter(c => c.status === 'signed').length}
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
                {contracts.filter(c => c.status === 'pending').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Čakajúce zmluvy
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'default.main' }}>
                {contracts.filter(c => c.status === 'draft').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Koncepty
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Template Notice */}
      <Alert severity="info" sx={{ mb: 3 }}>
        📋 PDF šablóna zmluvy bude pridaná neskôr do assets/contract.pdf pre automatické vyplňovanie.
      </Alert>

      {/* Contracts Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            {t('contracts')}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t('contractNumber')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ID rezervácie</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Zákazník</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Vozidlo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('contractDate')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Suma</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Stav</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {contract.contractNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>{contract.reservationId}</TableCell>
                    <TableCell>{contract.customerName}</TableCell>
                    <TableCell>{contract.carInfo}</TableCell>
                    <TableCell>{contract.contractDate}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {contract.amount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(contract.status)}
                        size="small"
                        color={getStatusColor(contract.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleOpenDialog('view', contract)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpenDialog('edit', contract)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleDownloadContract(contract.id)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Contract Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' && t('createContract')}
          {dialogMode === 'edit' && 'Upraviť zmluvu'}
          {dialogMode === 'view' && 'Zobraziť zmluvu'}
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('contractNumber')}
                value={formData.contractNumber}
                onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                disabled={true}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('contractDate')}
                type="date"
                value={formData.contractDate}
                onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                disabled={dialogMode === 'view'}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Rezervácia</InputLabel>
                <Select
                  value={formData.reservationId}
                  onChange={(e) => handleReservationChange(e.target.value)}
                  disabled={dialogMode === 'view'}
                  label="Rezervácia"
                >
                  {availableReservations.map(reservation => (
                    <MenuItem key={reservation.id} value={reservation.id}>
                      {reservation.id} - {reservation.customer} - {reservation.car}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Zákazník"
                value={formData.customerName}
                disabled={true}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Stav zmluvy</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  disabled={dialogMode === 'view'}
                  label="Stav zmluvy"
                >
                  <MenuItem value="draft">Koncept</MenuItem>
                  <MenuItem value="pending">Čakajúca</MenuItem>
                  <MenuItem value="signed">Podpísaná</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog}>
            {t('cancel')}
          </Button>
          {dialogMode !== 'view' && (
            <>
              <Button 
                variant="outlined" 
                onClick={() => handleDownloadContract(formData.contractNumber)}
                startIcon={<DownloadIcon />}
              >
                {t('downloadContract')}
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSubmit}
                startIcon={<ContractIcon />}
              >
                {dialogMode === 'create' ? t('generateContract') : t('save')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Contracts 