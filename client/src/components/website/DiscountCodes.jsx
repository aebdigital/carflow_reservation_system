import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Search as SearchIcon,
  Assessment as StatsIcon,
} from '@mui/icons-material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { sk } from 'date-fns/locale'
import {
  useGetDiscountCodesQuery,
  useCreateDiscountCodeMutation,
  useUpdateDiscountCodeMutation,
  useDeleteDiscountCodeMutation,
  useToggleDiscountCodeMutation,
  useGetDiscountCodeStatsQuery,
} from '../../store/store'

const discountTypeOptions = [
  { value: 'percentage', label: 'Percentuálna (%)' },
  { value: 'fixed', label: 'Pevná suma (€)' },
]

const usageLimitOptions = [
  { value: 'single', label: 'Jednorazové použitie' },
  { value: 'limited', label: 'Obmedzený počet' },
  { value: 'unlimited', label: 'Neobmedzené' },
]

const categoryOptions = [
  { value: 'economy', label: 'Economy' },
  { value: 'compact', label: 'Compact' },
  { value: 'midsize', label: 'Midsize' },
  { value: 'fullsize', label: 'Fullsize' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'suv', label: 'SUV' },
  { value: 'minivan', label: 'Minivan' },
  { value: 'convertible', label: 'Convertible' },
  { value: 'sports', label: 'Sports' },
]

const initialFormData = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  isTimeRestricted: false,
  startDate: null,
  endDate: null,
  hasMinimumValue: false,
  minimumValueType: 'amount',
  minimumValue: 0,
  categoryRestrictions: [],
  usageLimit: 'unlimited',
  maxUsageCount: 1,
  adminNotes: '',
  isActive: true,
}

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`discount-tabpanel-${index}`}
      aria-labelledby={`discount-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

function DiscountCodeStats() {
  const { data: stats, isLoading } = useGetDiscountCodeStatsQuery()

  if (isLoading) return <Typography>Načítava sa...</Typography>

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Celkový počet kódov
            </Typography>
            <Typography variant="h4">
              {stats?.data?.totalCodes || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Aktívne kódy
            </Typography>
            <Typography variant="h4" color="success.main">
              {stats?.data?.activeCodes || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Celkové použitia
            </Typography>
            <Typography variant="h4" color="primary">
              {stats?.data?.totalUsage || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Celková zľava
            </Typography>
            <Typography variant="h4" color="warning.main">
              €{stats?.data?.totalDiscountGiven?.toFixed(2) || '0.00'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      {stats?.data?.mostUsedCodes && stats.data.mostUsedCodes.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Najpoužívanejšie kódy
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Kód</TableCell>
                      <TableCell>Popis</TableCell>
                      <TableCell>Typ</TableCell>
                      <TableCell>Hodnota</TableCell>
                      <TableCell>Použité</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.data.mostUsedCodes.map((code) => (
                      <TableRow key={code._id}>
                        <TableCell>
                          <Chip label={code.code} size="small" />
                        </TableCell>
                        <TableCell>{code.description}</TableCell>
                        <TableCell>
                          {code.discountType === 'percentage' ? '%' : '€'}
                        </TableCell>
                        <TableCell>{code.discountValue}</TableCell>
                        <TableCell>{code.currentUsageCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default function DiscountCodes() {
  const [tabValue, setTabValue] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [editingCode, setEditingCode] = useState(null)
  const [formData, setFormData] = useState(initialFormData)
  const [alert, setAlert] = useState(null)

  const { data: discountCodes, isLoading } = useGetDiscountCodesQuery()
  const [createDiscountCode, { isLoading: isCreating }] = useCreateDiscountCodeMutation()
  const [updateDiscountCode, { isLoading: isUpdating }] = useUpdateDiscountCodeMutation()
  const [deleteDiscountCode, { isLoading: isDeleting }] = useDeleteDiscountCodeMutation()
  const [toggleDiscountCode] = useToggleDiscountCodeMutation()

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const handleOpenDialog = (code = null) => {
    if (code) {
      setEditingCode(code)
      setFormData({
        code: code.code,
        description: code.description || '',
        discountType: code.discountType,
        discountValue: code.discountValue,
        isTimeRestricted: !!code.startDate || !!code.endDate,
        startDate: code.startDate ? new Date(code.startDate) : null,
        endDate: code.endDate ? new Date(code.endDate) : null,
        hasMinimumValue: code.hasMinimumValue || false,
        minimumValueType: code.minimumValueType || 'amount',
        minimumValue: code.minimumValue || 0,
        categoryRestrictions: code.categoryRestrictions || [],
        usageLimit: code.usageLimit,
        maxUsageCount: code.maxUsageCount || 1,
        adminNotes: code.adminNotes || '',
        isActive: code.isActive,
      })
    } else {
      setEditingCode(null)
      setFormData(initialFormData)
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingCode(null)
    setFormData(initialFormData)
    setAlert(null)
  }

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleMultiSelectChange = (field) => (event) => {
    const value = typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDateChange = (field) => (date) => {
    setFormData(prev => ({ ...prev, [field]: date }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.code.trim()) {
      setAlert({ type: 'error', message: 'Kód je povinný' })
      return
    }

    if (formData.isTimeRestricted && formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      setAlert({ type: 'error', message: 'Dátum ukončenia musí byť po dátume začiatku' })
      return
    }

    if (formData.usageLimit === 'limited' && formData.maxUsageCount < 1) {
      setAlert({ type: 'error', message: 'Maximálny počet použití musí byť aspoň 1' })
      return
    }

    try {
      const submitData = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        startDate: formData.isTimeRestricted ? formData.startDate : null,
        endDate: formData.isTimeRestricted ? formData.endDate : null,
        minimumValue: formData.hasMinimumValue ? formData.minimumValue : null,
      }

      if (editingCode) {
        await updateDiscountCode({ id: editingCode._id, ...submitData }).unwrap()
        setAlert({ type: 'success', message: 'Zľavový kód bol úspešne aktualizovaný' })
      } else {
        await createDiscountCode(submitData).unwrap()
        setAlert({ type: 'success', message: 'Zľavový kód bol úspešne vytvorený' })
      }
      
      setTimeout(() => {
        handleCloseDialog()
      }, 1500)
    } catch (error) {
      setAlert({ type: 'error', message: error.data?.message || 'Chyba pri ukladaní zľavového kódu' })
    }
  }

  const handleToggle = async (code) => {
    try {
      await toggleDiscountCode(code._id).unwrap()
    } catch (error) {
      console.error('Error toggling discount code:', error)
    }
  }

  const handleDelete = async (code) => {
    if (window.confirm(`Naozaj chcete vymazať zľavový kód "${code.code}"?`)) {
      try {
        await deleteDiscountCode(code._id).unwrap()
      } catch (error) {
        console.error('Error deleting discount code:', error)
      }
    }
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    // You could add a toast notification here
  }

  const filteredCodes = discountCodes?.data?.filter(code =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const renderDiscountCodeForm = () => (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={sk}>
      <DialogContent>
        {alert && (
          <Alert severity={alert.type} sx={{ mb: 3 }}>
            {alert.message}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Kód"
              value={formData.code}
              onChange={handleChange('code')}
              required
              placeholder="napr. LETO10"
              inputProps={{ maxLength: 20 }}
              helperText="Maximálne 20 znakov, automaticky sa prevádza na veľké písmená"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleChange('isActive')}
                />
              }
              label="Aktívny"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Popis"
              value={formData.description}
              onChange={handleChange('description')}
              multiline
              rows={2}
              placeholder="Popis zľavového kódu"
              inputProps={{ maxLength: 200 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Typ zľavy</InputLabel>
              <Select
                value={formData.discountType}
                onChange={handleChange('discountType')}
                label="Typ zľavy"
              >
                {discountTypeOptions.map((option) => (
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
              type="number"
              label={`Hodnota zľavy ${formData.discountType === 'percentage' ? '(%)' : '(€)'}`}
              value={formData.discountValue}
              onChange={handleChange('discountValue')}
              required
              inputProps={{ 
                min: 1, 
                max: formData.discountType === 'percentage' ? 100 : 9999 
              }}
            />
          </Grid>

          {/* Time Restrictions */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isTimeRestricted}
                  onChange={handleChange('isTimeRestricted')}
                />
              }
              label="Časové obmedzenie"
            />
          </Grid>

          {formData.isTimeRestricted && (
            <>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Dátum začiatku"
                  value={formData.startDate}
                  onChange={handleDateChange('startDate')}
                  slotProps={{
                    textField: { fullWidth: true }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Dátum ukončenia"
                  value={formData.endDate}
                  onChange={handleDateChange('endDate')}
                  slotProps={{
                    textField: { fullWidth: true }
                  }}
                />
              </Grid>
            </>
          )}

          {/* Minimum Value */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.hasMinimumValue}
                  onChange={handleChange('hasMinimumValue')}
                />
              }
              label="Minimálna hodnota rezervácie"
            />
          </Grid>

          {formData.hasMinimumValue && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Typ minimum</InputLabel>
                  <Select
                    value={formData.minimumValueType}
                    onChange={handleChange('minimumValueType')}
                    label="Typ minimum"
                  >
                    <MenuItem value="amount">Suma (€)</MenuItem>
                    <MenuItem value="days">Počet dní</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={`Minimálna hodnota ${formData.minimumValueType === 'amount' ? '(€)' : '(dní)'}`}
                  value={formData.minimumValue}
                  onChange={handleChange('minimumValue')}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </>
          )}

          {/* Category Restrictions */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Obmedzenie kategórií (voliteľné)</InputLabel>
              <Select
                multiple
                value={formData.categoryRestrictions}
                onChange={handleMultiSelectChange('categoryRestrictions')}
                label="Obmedzenie kategórií (voliteľné)"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={categoryOptions.find(opt => opt.value === value)?.label} size="small" />
                    ))}
                  </Box>
                )}
              >
                {categoryOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Usage Limit */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Obmedzenie použitia</InputLabel>
              <Select
                value={formData.usageLimit}
                onChange={handleChange('usageLimit')}
                label="Obmedzenie použitia"
              >
                {usageLimitOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {formData.usageLimit === 'limited' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Maximálny počet použití"
                value={formData.maxUsageCount}
                onChange={handleChange('maxUsageCount')}
                inputProps={{ min: 1 }}
              />
            </Grid>
          )}

          {/* Admin Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Poznámky pre admina"
              value={formData.adminNotes}
              onChange={handleChange('adminNotes')}
              multiline
              rows={2}
              placeholder="napr. kód pre influencera XY"
              inputProps={{ maxLength: 500 }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCloseDialog}>
          Zrušiť
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={isCreating || isUpdating}
        >
          {isCreating || isUpdating ? 'Ukladá sa...' : (editingCode ? 'Aktualizovať' : 'Vytvoriť')}
        </Button>
      </DialogActions>
    </LocalizationProvider>
  )

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Zľavové Kódy" />
          <Tab label="Štatistiky" icon={<StatsIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Vyhľadať kódy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nový Kód
          </Button>
        </Box>

        {isLoading ? (
          <Typography>Načítava sa...</Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Kód</TableCell>
                  <TableCell>Popis</TableCell>
                  <TableCell>Typ</TableCell>
                  <TableCell>Hodnota</TableCell>
                  <TableCell>Použité</TableCell>
                  <TableCell>Stav</TableCell>
                  <TableCell>Akcie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCodes.map((code) => (
                  <TableRow key={code._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={code.code} 
                          size="small"
                          color={code.isActive ? 'primary' : 'default'}
                        />
                        <Tooltip title="Kopírovať kód">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopyCode(code.code)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>{code.description || '-'}</TableCell>
                    <TableCell>
                      {code.discountType === 'percentage' ? '%' : '€'}
                    </TableCell>
                    <TableCell>
                      {code.discountValue}
                      {code.discountType === 'percentage' ? '%' : '€'}
                    </TableCell>
                    <TableCell>
                      {code.currentUsageCount}
                      {code.usageLimit === 'limited' && ` / ${code.maxUsageCount}`}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={code.isActive ? 'Aktívny' : 'Neaktívny'}
                        color={code.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={code.isActive ? 'Deaktivovať' : 'Aktivovať'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggle(code)}
                            color={code.isActive ? 'error' : 'success'}
                          >
                            {code.isActive ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Upraviť">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(code)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Vymazať">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(code)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCodes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {searchTerm ? 'Žiadne kódy sa nezhodujú s vyhľadávaním' : 'Žiadne zľavové kódy'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <DiscountCodeStats />
      </TabPanel>

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCode ? 'Upraviť zľavový kód' : 'Vytvoriť nový zľavový kód'}
        </DialogTitle>
        
        {renderDiscountCodeForm()}
      </Dialog>
    </Box>
  )
} 