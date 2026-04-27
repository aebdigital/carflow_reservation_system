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
  Close as CloseIcon,
  Payment as PaymentIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import {
  useGetSettingsQuery,
  useAddPickupLocationMutation,
  useUpdatePickupLocationMutation,
  useDeletePickupLocationMutation,
  useSendSupportContactMutation,
  useUpdateSettingsMutation
} from '../store/store'

function Settings() {
  const auth = useSelector((state) => state.auth)
  const isNitraCarUser = auth?.user?.email?.toLowerCase() === 'nitra-car@nitra-car.sk'

  // ---- Invoice export (NitraCar only) ----
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [invoiceExportMonth, setInvoiceExportMonth] = useState(defaultMonth)
  const [invoiceExporting, setInvoiceExporting] = useState(false)

  const handleExportInvoicesXml = async () => {
    if (!invoiceExportMonth) return
    setInvoiceExporting(true)
    try {
      const apiBase = (import.meta.env?.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/+$/, '')
      const url = `${apiBase}/reservations/invoices/export?month=${encodeURIComponent(invoiceExportMonth)}`
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      if (!res.ok) {
        let msg = `Server vrátil ${res.status}`
        try { const j = await res.json(); msg = j?.message || msg } catch (_) {}
        throw new Error(msg)
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `invoices_${invoiceExportMonth}.xml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Invoice export failed:', err)
      alert('Export faktúr zlyhal: ' + err.message)
    } finally {
      setInvoiceExporting(false)
    }
  }

  const { data: settings, isLoading, error } = useGetSettingsQuery()
  const [addLocation] = useAddPickupLocationMutation()
  const [updateLocation] = useUpdatePickupLocationMutation()
  const [deleteLocation] = useDeletePickupLocationMutation()
  const [sendSupportContact] = useSendSupportContactMutation()
  const [updateSettings] = useUpdateSettingsMutation()

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

  // State for Stripe configuration
  const [stripeForm, setStripeForm] = useState({
    stripeEnabled: false,
    stripeSecretKey: '',
    stripePublishableKey: '',
    stripeWebhookSecret: '',
    testMode: true
  })
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [stripeFormChanged, setStripeFormChanged] = useState(false)

  // Initialize Stripe form when settings load
  React.useEffect(() => {
    if (settings?.data) {
      setStripeForm({
        stripeEnabled: settings.data.payment?.stripeEnabled || false,
        stripeSecretKey: settings.data.payment?.stripeSecretKey || '',
        stripePublishableKey: settings.data.payment?.stripePublishableKey || '',
        stripeWebhookSecret: settings.data.payment?.stripeWebhookSecret || '',
        testMode: settings.data.payment?.testMode ?? true
      })
      // Reset the changed flag when loading fresh data
      setStripeFormChanged(false)
    }
  }, [settings])

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

  const handleStripeFormChange = (field, value) => {
    setStripeForm(prev => ({ ...prev, [field]: value }))
    setStripeFormChanged(true)
  }

  const handleSaveStripeSettings = async () => {
    try {
      // Validate required fields if Stripe is enabled
      if (stripeForm.stripeEnabled && (!stripeForm.stripeSecretKey || !stripeForm.stripePublishableKey)) {
        showSnackbar('Stripe Secret Key a Publishable Key sú povinné keď je Stripe zapnutý', 'error')
        return
      }

      await updateSettings({
        payment: stripeForm
      }).unwrap()

      showSnackbar('Stripe nastavenia boli úspešne uložené')
      setStripeFormChanged(false)
    } catch (error) {
      showSnackbar(error?.data?.message || 'Nastala chyba pri ukladaní Stripe nastavení', 'error')
    }
  }

  const handleTestStripeConnection = async () => {
    // This would test the Stripe connection
    showSnackbar('Test Stripe pripojenia - funkcia bude pridaná neskôr', 'info')
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

        {/* Stripe Payment Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <PaymentIcon color="primary" />
                  <Typography variant="h6">Stripe platobná konfigurácia</Typography>
                </Box>
              }
              action={
                stripeFormChanged && (
                  <Button
                    variant="contained"
                    onClick={handleSaveStripeSettings}
                    disabled={stripeForm.stripeEnabled && (!stripeForm.stripeSecretKey || !stripeForm.stripePublishableKey)}
                  >
                    Uložiť nastavenia
                  </Button>
                )
              }
            />
            <CardContent>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Nakonfigurujte vaše Stripe kľúče pre príjem platieb. Každá spoločnosť musí mať svoj vlastný Stripe účet.
                </Typography>
              </Alert>

              {stripeForm.stripeEnabled && (
                <Alert
                  severity={stripeForm.stripeSecretKey && stripeForm.stripePublishableKey ? "success" : "warning"}
                  sx={{ mb: 3 }}
                >
                  <Typography variant="body2">
                    <strong>Stav konfigurácie:</strong><br/>
                    • Publishable Key: {stripeForm.stripePublishableKey ? '✅ Nakonfigurovaný' : '❌ Chýba'}<br/>
                    • Secret Key: {stripeForm.stripeSecretKey ? '✅ Nakonfigurovaný' : '❌ Chýba'}<br/>
                    • Webhook Secret: {stripeForm.stripeWebhookSecret ? '✅ Nakonfigurovaný' : '⚠️ Voliteľný'}
                  </Typography>
                </Alert>
              )}

              <Grid container spacing={3}>
                {/* Enable Stripe */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={stripeForm.stripeEnabled}
                        onChange={(e) => handleStripeFormChange('stripeEnabled', e.target.checked)}
                      />
                    }
                    label="Povoliť Stripe platby"
                  />
                </Grid>

                {stripeForm.stripeEnabled && (
                  <>
                    {/* Test Mode */}
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={stripeForm.testMode}
                            onChange={(e) => handleStripeFormChange('testMode', e.target.checked)}
                          />
                        }
                        label="Test režim (použiť test kľúče)"
                      />
                      {stripeForm.testMode && (
                        <Typography variant="caption" color="warning.main" display="block">
                          ⚠️ V test režime nie sú účtované skutočné platby
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12}>
                      <Divider />
                    </Grid>

                    {/* Publishable Key */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`Stripe Publishable Key (${stripeForm.testMode ? 'test' : 'live'})`}
                        value={stripeForm.stripePublishableKey}
                        onChange={(e) => handleStripeFormChange('stripePublishableKey', e.target.value)}
                        placeholder={stripeForm.testMode ? 'pk_test_...' : 'pk_live_...'}
                        required
                        helperText="Začína sa s pk_test_ alebo pk_live_"
                      />
                    </Grid>

                    {/* Secret Key */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`Stripe Secret Key (${stripeForm.testMode ? 'test' : 'live'})`}
                        type={showSecretKey ? 'text' : 'password'}
                        value={stripeForm.stripeSecretKey}
                        onChange={(e) => handleStripeFormChange('stripeSecretKey', e.target.value)}
                        placeholder={stripeForm.testMode ? 'sk_test_...' : 'sk_live_...'}
                        required
                        helperText="Začína sa s sk_test_ alebo sk_live_"
                        InputProps={{
                          endAdornment: (
                            <IconButton
                              onClick={() => setShowSecretKey(!showSecretKey)}
                              edge="end"
                            >
                              {showSecretKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Webhook Secret */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Stripe Webhook Secret"
                        type={showWebhookSecret ? 'text' : 'password'}
                        value={stripeForm.stripeWebhookSecret}
                        onChange={(e) => handleStripeFormChange('stripeWebhookSecret', e.target.value)}
                        placeholder="whsec_..."
                        helperText="Webhook endpoint secret z vášho Stripe dashboard"
                        InputProps={{
                          endAdornment: (
                            <IconButton
                              onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                              edge="end"
                            >
                              {showWebhookSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Instructions */}
                    <Grid item xs={12}>
                      <Alert severity="warning">
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Inštrukcie pre nastavenie Stripe:</strong>
                        </Typography>
                        <Typography variant="body2" component="div">
                          1. Vytvorte si účet na <strong>stripe.com</strong><br/>
                          2. V Stripe dashboard idite na <strong>Developers → API keys</strong><br/>
                          3. Skopírujte vaše kľúče (test alebo live podľa režimu)<br/>
                          4. V <strong>Developers → Webhooks</strong> pridajte endpoint:<br/>
                          &nbsp;&nbsp;&nbsp;<code>https://yourdomain.com/api/payments/stripe-webhook</code><br/>
                          5. Vyberte udalosti: <code>checkout.session.completed</code>, <code>checkout.session.expired</code><br/>
                          6. Skopírujte webhook secret
                        </Typography>
                      </Alert>
                    </Grid>

                    {/* Action Buttons */}
                    <Grid item xs={12}>
                      <Box display="flex" gap={2}>
                        <Button
                          variant="outlined"
                          onClick={handleTestStripeConnection}
                          disabled={!stripeForm.stripeSecretKey}
                        >
                          Test pripojenia
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleSaveStripeSettings}
                          disabled={!stripeFormChanged || (stripeForm.stripeEnabled && (!stripeForm.stripeSecretKey || !stripeForm.stripePublishableKey))}
                        >
                          Uložiť nastavenia
                        </Button>
                      </Box>
                    </Grid>
                  </>
                )}
              </Grid>
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

        {/* Invoice Export (NitraCar only) */}
        {isNitraCarUser && (
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <DescriptionIcon color="primary" />
                    <Typography variant="h6">Export faktúr (XML)</Typography>
                  </Box>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Vyexportujte všetky vystavené faktúry za vybraný kalendárny mesiac do XML súboru kompatibilného s OBERON.
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="month"
                      label="Mesiac"
                      InputLabelProps={{ shrink: true }}
                      value={invoiceExportMonth}
                      onChange={(e) => setInvoiceExportMonth(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={handleExportInvoicesXml}
                      disabled={invoiceExporting || !invoiceExportMonth}
                      fullWidth
                    >
                      {invoiceExporting ? 'Exportuje sa…' : 'Stiahnuť XML'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
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