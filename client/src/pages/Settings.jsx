import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Support as SupportIcon,
  Star as StarIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import {
  useGetSettingsQuery,
  useAddPickupLocationMutation,
  useUpdatePickupLocationMutation,
  useDeletePickupLocationMutation,
  useSendSupportContactMutation
} from '../store/store'

function Settings() {
  const { data: settings, isLoading, error } = useGetSettingsQuery()
  const [addLocation] = useAddPickupLocationMutation()
  const [updateLocation] = useUpdatePickupLocationMutation()
  const [deleteLocation] = useDeletePickupLocationMutation()
  const [sendSupportContact] = useSendSupportContactMutation()

  // State for location dialog
  const [locationDialog, setLocationDialog] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    isDefault: false,
    coordinates: '',
    openingHours: '08:00 - 18:00',
    notes: ''
  })

  // State for support form
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    urgency: 'normal'
  })

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity })
  }

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  const handleOpenLocationDialog = (location = null) => {
    if (location) {
      setEditingLocation(location._id)
      setLocationForm({
        name: location.name || '',
        address: location.address || '',
        isDefault: location.isDefault || false,
        coordinates: location.coordinates || '',
        openingHours: location.openingHours || '08:00 - 18:00',
        notes: location.notes || ''
      })
    } else {
      setEditingLocation(null)
      setLocationForm({
        name: '',
        address: '',
        isDefault: false,
        coordinates: '',
        openingHours: '08:00 - 18:00',
        notes: ''
      })
    }
    setLocationDialog(true)
  }

  const handleCloseLocationDialog = () => {
    setLocationDialog(false)
    setEditingLocation(null)
    setLocationForm({
      name: '',
      address: '',
      isDefault: false,
      coordinates: '',
      openingHours: '08:00 - 18:00',
      notes: ''
    })
  }

  const handleSaveLocation = async () => {
    try {
      if (editingLocation) {
        await updateLocation({
          locationId: editingLocation,
          ...locationForm
        }).unwrap()
        showSnackbar('Lokalita bola úspešne aktualizovaná')
      } else {
        await addLocation(locationForm).unwrap()
        showSnackbar('Nová lokalita bola úspešne pridaná')
      }
      handleCloseLocationDialog()
    } catch (error) {
      showSnackbar(error?.data?.message || 'Nastala chyba pri ukladaní lokality', 'error')
    }
  }

  const handleDeleteLocation = async (locationId) => {
    if (window.confirm('Naozaj chcete odstrániť túto lokalitu?')) {
      try {
        await deleteLocation(locationId).unwrap()
        showSnackbar('Lokalita bola úspešne odstránená')
      } catch (error) {
        showSnackbar(error?.data?.message || 'Nastala chyba pri odstraňovaní lokality', 'error')
      }
    }
  }

  const handleSendSupportMessage = async () => {
    try {
      const result = await sendSupportContact(supportForm).unwrap()
      showSnackbar(result.message)
      setSupportForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        urgency: 'normal'
      })
    } catch (error) {
      showSnackbar(error?.data?.message || 'Nastala chyba pri odosielaní správy', 'error')
    }
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Načítavam nastavenia...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Nastala chyba pri načítavaní nastavení: {error?.data?.message || error.message}
        </Alert>
      </Box>
    )
  }

  const pickupLocations = settings?.data?.business?.pickupLocations || []

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Nastavenia
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Spravujte nastavenia vášho systému
      </Typography>

      <Grid container spacing={3}>
        {/* Pickup Locations Section */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <LocationIcon color="primary" />
                  <Typography variant="h6">Miesta vyzdvihnutia / vrátenia</Typography>
                </Box>
              }
              action={
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenLocationDialog()}
                >
                  Pridať lokalitu
                </Button>
              }
            />
            <CardContent>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Názov</TableCell>
                      <TableCell>Adresa</TableCell>
                      <TableCell>Otváracie hodiny</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Akcie</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pickupLocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">
                            Žiadne lokality nie sú nakonfigurované
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pickupLocations.map((location) => (
                        <TableRow key={location._id}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {location.name}
                              {location.isDefault && (
                                <Chip
                                  icon={<StarIcon />}
                                  label="Predvolená"
                                  size="small"
                                  color="primary"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{location.address}</TableCell>
                          <TableCell>{location.openingHours}</TableCell>
                          <TableCell>
                            <Chip
                              label={location.isActive ? 'Aktívna' : 'Neaktívna'}
                              color={location.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenLocationDialog(location)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteLocation(location._id)}
                              disabled={pickupLocations.length <= 1}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Support Contact Form */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <SupportIcon color="primary" />
                  <Typography variant="h6">Zákaznícka podpora</Typography>
                </Box>
              }
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Máte otázku alebo potrebujete pomoc? Kontaktujte zákaznícku podporu CarFlow
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Meno"
                    value={supportForm.name}
                    onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={supportForm.email}
                    onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Telefón (voliteľné)"
                    value={supportForm.phone}
                    onChange={(e) => setSupportForm({ ...supportForm, phone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Naliehavosť</InputLabel>
                    <Select
                      value={supportForm.urgency}
                      label="Naliehavosť"
                      onChange={(e) => setSupportForm({ ...supportForm, urgency: e.target.value })}
                    >
                      <MenuItem value="low">🟢 Nízka</MenuItem>
                      <MenuItem value="normal">🟡 Stredná</MenuItem>
                      <MenuItem value="high">🔴 Vysoká</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Predmet"
                    value={supportForm.subject}
                    onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Správa"
                    multiline
                    rows={4}
                    value={supportForm.message}
                    onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSendSupportMessage}
                    disabled={!supportForm.name || !supportForm.email || !supportForm.subject || !supportForm.message}
                  >
                    Odoslať správu
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Location Dialog */}
      <Dialog
        open={locationDialog}
        onClose={handleCloseLocationDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {editingLocation ? 'Upraviť lokalitu' : 'Pridať novú lokalitu'}
            <IconButton onClick={handleCloseLocationDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Názov lokality"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Adresa"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Otváracie hodiny"
                  value={locationForm.openingHours}
                  onChange={(e) => setLocationForm({ ...locationForm, openingHours: e.target.value })}
                  placeholder="08:00 - 18:00"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Súradnice (voliteľné)"
                  value={locationForm.coordinates}
                  onChange={(e) => setLocationForm({ ...locationForm, coordinates: e.target.value })}
                  placeholder="48.1482,17.1067"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Poznámky (voliteľné)"
                  multiline
                  rows={2}
                  value={locationForm.notes}
                  onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={locationForm.isDefault}
                      onChange={(e) => setLocationForm({ ...locationForm, isDefault: e.target.checked })}
                    />
                  }
                  label="Nastaviť ako predvolenú lokalitu"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLocationDialog}>Zrušiť</Button>
          <Button
            variant="contained"
            onClick={handleSaveLocation}
            disabled={!locationForm.name || !locationForm.address}
          >
            {editingLocation ? 'Uložiť zmeny' : 'Pridať lokalitu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Settings 