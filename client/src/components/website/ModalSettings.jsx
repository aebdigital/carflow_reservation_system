import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Typography,
  Divider,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
} from '@mui/material'
import {
  Save as SaveIcon,
  Preview as PreviewIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { sk } from 'date-fns/locale'
import { useUpdateModalMutation, useToggleModalMutation } from '../../store/store'

const modalTypeOptions = [
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'info', label: 'Informačný' },
  { value: 'discount', label: 'Zľavový' },
]

const displayLocationOptions = [
  { value: 'all-pages', label: 'Na všetkých stránkach' },
  { value: 'homepage', label: 'Len na domovskej stránke' },
  { value: 'pricing', label: 'Len na stránke s cenníkom' },
]

const triggerTypeOptions = [
  { value: 'time', label: 'Čas (sekundy)' },
  { value: 'scroll', label: 'Skrolovanie (%)' },
  { value: 'exit', label: 'Exit intent' },
]

export default function ModalSettings({ settings }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    displayLocation: 'all-pages',
    triggerRule: { type: 'time', value: 5 },
    isActive: true,
    startDate: null,
    endDate: null,
    emailPlaceholder: 'Zadajte váš email',
    buttonText: 'Získať zľavu',
    discountCode: '',
    discountPercentage: 10,
    backgroundColor: '#ffffff',
    textColor: '#333333',
    buttonColor: '#1976d2',
  })

  const [updateModal, { isLoading: isUpdating }] = useUpdateModalMutation()
  const [toggleModal, { isLoading: isToggling }] = useToggleModalMutation()
  const [alert, setAlert] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (settings?.modal) {
      setFormData({
        title: settings.modal.title || '',
        content: settings.modal.content || '',
        type: settings.modal.type || 'info',
        displayLocation: settings.modal.displayLocation || 'all-pages',
        triggerRule: settings.modal.triggerRule || { type: 'time', value: 5 },
        isActive: settings.modal.isActive || false,
        startDate: settings.modal.startDate ? new Date(settings.modal.startDate) : null,
        endDate: settings.modal.endDate ? new Date(settings.modal.endDate) : null,
        emailPlaceholder: settings.modal.emailPlaceholder || 'Zadajte váš email',
        buttonText: settings.modal.buttonText || 'Získať zľavu',
        discountCode: settings.modal.discountCode || '',
        discountPercentage: settings.modal.discountPercentage || 10,
        backgroundColor: settings.modal.backgroundColor || '#ffffff',
        textColor: settings.modal.textColor || '#333333',
        buttonColor: settings.modal.buttonColor || '#1976d2',
      })
    }
  }, [settings])

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTriggerChange = (field) => (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      triggerRule: {
        ...prev.triggerRule,
        [field]: newValue || event.target.value
      }
    }))
  }

  const handleDateChange = (field) => (date) => {
    setFormData(prev => ({ ...prev, [field]: date }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.title.trim() || !formData.content.trim()) {
      setAlert({ type: 'error', message: 'Názov a obsah sú povinné' })
      return
    }

    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      setAlert({ type: 'error', message: 'Dátum ukončenia musí byť po dátume začiatku' })
      return
    }

    try {
      await updateModal(formData).unwrap()
      setAlert({ type: 'success', message: 'Modal bol úspešne aktualizovaný' })
    } catch (error) {
      setAlert({ type: 'error', message: error.data?.message || 'Chyba pri aktualizácii modalu' })
    }
  }

  const handleToggle = async () => {
    try {
      await toggleModal().unwrap()
      setFormData(prev => ({ ...prev, isActive: !prev.isActive }))
      setAlert({ 
        type: 'success', 
        message: `Modal bol ${!formData.isActive ? 'aktivovaný' : 'deaktivovaný'}` 
      })
    } catch (error) {
      setAlert({ type: 'error', message: error.data?.message || 'Chyba pri prepínaní stavu' })
    }
  }

  const getTriggerValueLabel = () => {
    switch (formData.triggerRule.type) {
      case 'time':
        return `${formData.triggerRule.value} sekúnd`
      case 'scroll':
        return `${formData.triggerRule.value}% stránky`
      case 'exit':
        return 'Pri pokuse o odchod'
      default:
        return ''
    }
  }

  const renderPreviewModal = () => (
    <Dialog 
      open={showPreview} 
      onClose={() => setShowPreview(false)}
      maxWidth="sm"
      fullWidth
    >
      <Paper 
        sx={{ 
          backgroundColor: formData.backgroundColor,
          color: formData.textColor,
        }}
      >
        <DialogTitle sx={{ color: formData.textColor }}>
          {formData.title}
        </DialogTitle>
        <DialogContent sx={{ color: formData.textColor }}>
          <Typography>{formData.content}</Typography>
          
          {formData.type === 'newsletter' && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                placeholder={formData.emailPlaceholder}
                variant="outlined"
                size="small"
                sx={{ mb: 2 }}
              />
            </Box>
          )}
          
          {formData.type === 'discount' && formData.discountCode && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
              <Typography variant="h6">
                Kód: {formData.discountCode}
              </Typography>
              <Typography variant="body2">
                Zľava: {formData.discountPercentage}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            sx={{ 
              backgroundColor: formData.buttonColor,
              color: '#ffffff',
              '&:hover': {
                backgroundColor: formData.buttonColor,
                opacity: 0.8,
              }
            }}
          >
            {formData.buttonText}
          </Button>
          <Button onClick={() => setShowPreview(false)}>
            Zatvoriť
          </Button>
        </DialogActions>
      </Paper>
    </Dialog>
  )

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={sk}>
      <Grid container spacing={3}>
        {/* Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nastavenia Vyskakujúceho Okna
              </Typography>

              {alert && (
                <Alert 
                  severity={alert.type} 
                  onClose={() => setAlert(null)}
                  sx={{ mb: 3 }}
                >
                  {alert.message}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Názov modalu"
                      value={formData.title}
                      onChange={handleChange('title')}
                      required
                      placeholder="napr. Získajte 10% zľavu!"
                      helperText="Maximálne 100 znakov"
                      inputProps={{ maxLength: 100 }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Obsah modalu"
                      value={formData.content}
                      onChange={handleChange('content')}
                      required
                      multiline
                      rows={4}
                      placeholder="napr. Zadajte svoj email a získajte 10% zľavu na prvú rezerváciu!"
                      helperText="Maximálne 1000 znakov"
                      inputProps={{ maxLength: 1000 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Typ modalu</InputLabel>
                      <Select
                        value={formData.type}
                        onChange={handleChange('type')}
                        label="Typ modalu"
                      >
                        {modalTypeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Zobrazenie</InputLabel>
                      <Select
                        value={formData.displayLocation}
                        onChange={handleChange('displayLocation')}
                        label="Zobrazenie"
                      >
                        {displayLocationOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Trigger Settings */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Spúšťacie pravidlá
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Typ spúšťača</InputLabel>
                      <Select
                        value={formData.triggerRule.type}
                        onChange={handleTriggerChange('type')}
                        label="Typ spúšťača"
                      >
                        {triggerTypeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {formData.triggerRule.type !== 'exit' && (
                    <Grid item xs={12} sm={6}>
                      <Typography gutterBottom>
                        Hodnota: {getTriggerValueLabel()}
                      </Typography>
                      <Slider
                        value={formData.triggerRule.value}
                        onChange={handleTriggerChange('value')}
                        min={formData.triggerRule.type === 'time' ? 1 : 10}
                        max={formData.triggerRule.type === 'time' ? 60 : 100}
                        step={formData.triggerRule.type === 'time' ? 1 : 5}
                        marks
                      />
                    </Grid>
                  )}

                  {/* Type-specific fields */}
                  {formData.type === 'newsletter' && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Placeholder pre email"
                          value={formData.emailPlaceholder}
                          onChange={handleChange('emailPlaceholder')}
                        />
                      </Grid>
                    </>
                  )}

                  {formData.type === 'discount' && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Zľavový kód"
                          value={formData.discountCode}
                          onChange={handleChange('discountCode')}
                          placeholder="napr. LETO10"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Percentá zľavy"
                          value={formData.discountPercentage}
                          onChange={handleChange('discountPercentage')}
                          inputProps={{ min: 1, max: 100 }}
                        />
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Text tlačidla"
                      value={formData.buttonText}
                      onChange={handleChange('buttonText')}
                    />
                  </Grid>

                  {/* Styling */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Farby a štýl
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="color"
                      label="Farba pozadia"
                      value={formData.backgroundColor}
                      onChange={handleChange('backgroundColor')}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="color"
                      label="Farba textu"
                      value={formData.textColor}
                      onChange={handleChange('textColor')}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="color"
                      label="Farba tlačidla"
                      value={formData.buttonColor}
                      onChange={handleChange('buttonColor')}
                    />
                  </Grid>

                  {/* Date range */}
                  <Grid item xs={12} sm={6}>
                    <DateTimePicker
                      label="Dátum začiatku (voliteľné)"
                      value={formData.startDate}
                      onChange={handleDateChange('startDate')}
                      slotProps={{
                        textField: { fullWidth: true }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <DateTimePicker
                      label="Dátum ukončenia (voliteľné)"
                      value={formData.endDate}
                      onChange={handleDateChange('endDate')}
                      slotProps={{
                        textField: { fullWidth: true }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Ukladá sa...' : 'Uložiť'}
                      </Button>

                      <Button
                        variant="outlined"
                        startIcon={formData.isActive ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        onClick={handleToggle}
                        disabled={isToggling}
                        color={formData.isActive ? 'error' : 'success'}
                      >
                        {isToggling ? 'Prepína sa...' : (formData.isActive ? 'Deaktivovať' : 'Aktivovať')}
                      </Button>

                      <Button
                        variant="text"
                        startIcon={<PreviewIcon />}
                        onClick={() => setShowPreview(true)}
                      >
                        Ukázať náhľad
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Stav modalu
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Chip
                  label={formData.isActive ? 'Aktívny' : 'Neaktívny'}
                  color={formData.isActive ? 'success' : 'default'}
                  sx={{ mb: 2 }}
                />

                <Typography variant="body2" color="text.secondary">
                  Typ: {modalTypeOptions.find(opt => opt.value === formData.type)?.label}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Zobrazenie: {displayLocationOptions.find(opt => opt.value === formData.displayLocation)?.label}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Spúšťač: {getTriggerValueLabel()}
                </Typography>

                {formData.startDate && (
                  <Typography variant="body2" color="text.secondary">
                    Od: {formData.startDate.toLocaleString('sk-SK')}
                  </Typography>
                )}

                {formData.endDate && (
                  <Typography variant="body2" color="text.secondary">
                    Do: {formData.endDate.toLocaleString('sk-SK')}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {renderPreviewModal()}
    </LocalizationProvider>
  )
} 