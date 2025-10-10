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
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Typography,
  Divider,
  Chip,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material'
import {
  Save as SaveIcon,
  Preview as PreviewIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Language as LanguageIcon,
} from '@mui/icons-material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { sk } from 'date-fns/locale'
import { useUpdateInfoBarMutation, useToggleInfoBarMutation } from '../../store/store'
import InfoBarEnglishTranslation from '../admin/InfoBarEnglishTranslation'

const colorOptions = [
  { value: 'red', label: 'Červená (Urgent)', color: '#f44336', bgColor: '#d32f2f' },
  { value: 'blue', label: 'Modrá (Info)', color: '#2196f3', bgColor: '#1976d2' },
  { value: 'green', label: 'Zelená (Success)', color: '#4caf50', bgColor: '#388e3c' },
  { value: 'orange', label: 'Oranžová (Warning)', color: '#ff9800', bgColor: '#f57c00' },
  { value: 'purple', label: 'Fialová (Special)', color: '#9c27b0', bgColor: '#7b1fa2' },
  { value: 'yellow', label: 'Žltá (Notice)', color: '#ffeb3b', bgColor: '#fbc02d' },
]

const displayLocationOptions = [
  { value: 'all-pages', label: 'Na všetkých stránkach' },
  { value: 'homepage', label: 'Len na domovskej stránke' },
]

export default function InfoBarSettings({ settings }) {
  const [formData, setFormData] = useState({
    text: '',
    color: 'blue',
    backgroundColor: '#1976d2',
    textColor: '#ffffff',
    displayLocation: 'all-pages',
    isActive: true,
    startDate: null,
    endDate: null,
  })

  const [updateInfoBar, { isLoading: isUpdating }] = useUpdateInfoBarMutation()
  const [toggleInfoBar, { isLoading: isToggling }] = useToggleInfoBarMutation()
  const [alert, setAlert] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [translationDialog, setTranslationDialog] = useState(false)

  useEffect(() => {
    if (settings?.infoBar) {
      setFormData({
        text: settings.infoBar.text || '',
        color: settings.infoBar.color || 'blue',
        backgroundColor: settings.infoBar.backgroundColor || '#1976d2',
        textColor: settings.infoBar.textColor || '#ffffff',
        displayLocation: settings.infoBar.displayLocation || 'all-pages',
        isActive: settings.infoBar.isActive || false,
        startDate: settings.infoBar.startDate ? new Date(settings.infoBar.startDate) : null,
        endDate: settings.infoBar.endDate ? new Date(settings.infoBar.endDate) : null,
      })
    }
  }, [settings])

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setFormData(prev => ({ ...prev, [field]: value }))

    // Auto-update background color when color preset is selected
    if (field === 'color') {
      const selectedColor = colorOptions.find(opt => opt.value === value)
      if (selectedColor) {
        setFormData(prev => ({
          ...prev,
          backgroundColor: selectedColor.bgColor,
          textColor: '#ffffff'
        }))
      }
    }
  }

  const handleDateChange = (field) => (date) => {
    setFormData(prev => ({ ...prev, [field]: date }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.text.trim()) {
      setAlert({ type: 'error', message: 'Text lišty je povinný' })
      return
    }

    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      setAlert({ type: 'error', message: 'Dátum ukončenia musí byť po dátume začiatku' })
      return
    }

    try {
      await updateInfoBar(formData).unwrap()
      setAlert({ type: 'success', message: 'Info lišta bola úspešne aktualizovaná' })
    } catch (error) {
      setAlert({ type: 'error', message: error.data?.message || 'Chyba pri aktualizácii info lišty' })
    }
  }

  const handleToggle = async () => {
    try {
      await toggleInfoBar().unwrap()
      setFormData(prev => ({ ...prev, isActive: !prev.isActive }))
      setAlert({ 
        type: 'success', 
        message: `Info lišta bola ${!formData.isActive ? 'aktivovaná' : 'deaktivovaná'}` 
      })
    } catch (error) {
      setAlert({ type: 'error', message: error.data?.message || 'Chyba pri prepínaní stavu' })
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={sk}>
      <Grid container spacing={3}>
        {/* Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nastavenia Výstražnej Lišty
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
                      label="Text lišty"
                      value={formData.text}
                      onChange={handleChange('text')}
                      required
                      multiline
                      rows={2}
                      placeholder="napr. Sezónna zľava -20 % na SUV do 30.6.2025"
                      helperText="Maximálne 200 znakov"
                      inputProps={{ maxLength: 200 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Predvolené farby</InputLabel>
                      <Select
                        value={formData.color}
                        onChange={handleChange('color')}
                        label="Predvolené farby"
                      >
                        {colorOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  backgroundColor: option.bgColor,
                                  borderRadius: 1,
                                }}
                              />
                              {option.label}
                            </Box>
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

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="color"
                      label="Farba pozadia"
                      value={formData.backgroundColor}
                      onChange={handleChange('backgroundColor')}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="color"
                      label="Farba textu"
                      value={formData.textColor}
                      onChange={handleChange('textColor')}
                    />
                  </Grid>

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
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? 'Skryť' : 'Ukázať'} náhľad
                      </Button>

                      <Tooltip title="English Translation">
                        <IconButton
                          onClick={() => setTranslationDialog(true)}
                          color="info"
                          sx={{ position: 'relative' }}
                        >
                          <LanguageIcon />
                          {settings?.infoBar?.textEn && (
                            <Box
                              component="span"
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                width: 8,
                                height: 8,
                                bgcolor: 'success.main',
                                borderRadius: '50%',
                              }}
                            />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview and Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Stav a Náhľad
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Chip
                  label={formData.isActive ? 'Aktívna' : 'Neaktívna'}
                  color={formData.isActive ? 'success' : 'default'}
                  sx={{ mb: 2 }}
                />

                <Typography variant="body2" color="text.secondary">
                  Zobrazenie: {displayLocationOptions.find(opt => opt.value === formData.displayLocation)?.label}
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

              {showPreview && formData.text && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Náhľad:
                  </Typography>
                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: formData.backgroundColor,
                      color: formData.textColor,
                      textAlign: 'center',
                      fontWeight: 500,
                    }}
                  >
                    {formData.text}
                  </Paper>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <InfoBarEnglishTranslation
        infoBar={settings?.infoBar}
        open={translationDialog}
        onClose={() => setTranslationDialog(false)}
      />
    </LocalizationProvider>
  )
} 