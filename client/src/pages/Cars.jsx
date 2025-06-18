import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
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
  Checkbox,
  FormGroup,
  FormControlLabel,
  FormHelperText,
  Tabs,
  Tab,
  Divider,
  Alert,
  CircularProgress,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Tooltip,
  InputAdornment,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  DirectionsCar as CarIcon,
  LocalGasStation as FuelIcon,
  Settings as TransmissionIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import {
  useGetCarsQuery,
  useCreateCarMutation,
  useUpdateCarMutation,
  useDeleteCarMutation,
  useUploadCarImagesMutation,
  useDeleteCarImageMutation,
  useSetPrimaryCarImageMutation,
} from '../store/store'
import { t } from '../utils/translations'

function Cars() {
  const [tabValue, setTabValue] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedCar, setSelectedCar] = useState(null)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [selectedImages, setSelectedImages] = useState([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState([])

  // Initial form state
  const initialFormState = {
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    registrationNumber: '',
    vin: '',
    color: '',
    category: '',
    fuelType: '',
    transmission: '',
    seats: 5,
    doors: 4,
    mileage: 0,
    description: '',
    deposit: 0,
    dailyRate: 0,
    weeklyRate: 0,
    monthlyRate: 0,
    status: 'available',
    location: {
      name: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      }
    },
    features: [],
    maintenance: {
      lastServiceDate: '',
      nextServiceDate: '',
      nextServiceMileage: 0,
      notes: ''
    },
    insurance: {
      provider: '',
      policyNumber: '',
      expiryDate: '',
      coverageAmount: 0
    }
  }

  const [formData, setFormData] = useState(initialFormState)
  const [formErrors, setFormErrors] = useState({})

  // API hooks
  const { 
    data: carsData, 
    isLoading: carsLoading, 
    error: carsError 
  } = useGetCarsQuery()

  const [createCar, { isLoading: creating }] = useCreateCarMutation()
  const [updateCar, { isLoading: updating }] = useUpdateCarMutation()
  const [deleteCar] = useDeleteCarMutation()
  const [deleteCarImage] = useDeleteCarImageMutation()
  const [setPrimaryCarImage] = useSetPrimaryCarImageMutation()

  const cars = carsData?.data || []

  // Category options
  const categoryOptions = [
    { value: 'economy', label: t('economy') },
    { value: 'compact', label: t('compact') },
    { value: 'midsize', label: t('midsize') },
    { value: 'fullsize', label: t('fullsize') },
    { value: 'luxury', label: t('luxury') },
    { value: 'suv', label: t('suv') },
    { value: 'minivan', label: t('minivan') },
    { value: 'convertible', label: t('convertible') },
    { value: 'sports', label: t('sports') }
  ]

  // Fuel type options
  const fuelTypeOptions = [
    { value: 'gasoline', label: t('gasoline') },
    { value: 'diesel', label: t('diesel') },
    { value: 'hybrid', label: t('hybrid') },
    { value: 'electric', label: t('electric') }
  ]

  // Transmission options
  const transmissionOptions = [
    { value: 'manual', label: t('manual') },
    { value: 'automatic', label: t('automatic') },
    { value: 'cvt', label: t('cvt') }
  ]

  // Feature options
  const featureOptions = [
    { value: 'air-conditioning', label: t('airConditioning') },
    { value: 'gps', label: t('gps') },
    { value: 'bluetooth', label: t('bluetooth') },
    { value: 'heated-seats', label: t('heatedSeats') },
    { value: 'sunroof', label: t('sunroof') },
    { value: 'leather-seats', label: t('leatherSeats') },
    { value: 'backup-camera', label: t('backupCamera') },
    { value: 'cruise-control', label: t('cruiseControl') },
    { value: 'usb-ports', label: t('usbPorts') },
    { value: 'wifi', label: t('wifi') }
  ]

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      available: 'success',
      maintenance: 'warning',
      'out-of-service': 'error'
    }
    return colors[status] || 'default'
  }

  // Status text mapping
  const getStatusText = (status) => {
    const statusTexts = {
      available: t('available'),
      maintenance: t('maintenance'),
      'out-of-service': t('outOfService')
    }
    return statusTexts[status] || status
  }

  // Category icon mapping
  const getCategoryIcon = (category) => {
    const icons = {
      economy: '🚗',
      compact: '🚙',
      midsize: '🚘',
      fullsize: '🚖',
      luxury: '🏎️',
      suv: '🚐',
      minivan: '🚌',
      convertible: '🏃',
      sports: '🏁'
    }
    return icons[category] || '🚗'
  }

  // Get primary car image
  const getCarImage = (car) => {
    if (!car.images || car.images.length === 0) {
      return null
    }
    
    // Find primary image first
    const primaryImage = car.images.find(img => img.isPrimary)
    if (primaryImage) {
      return primaryImage.urls?.thumbnail || primaryImage.url
    }
    
    // Fallback to first image
    const firstImage = car.images[0]
    return firstImage.urls?.thumbnail || firstImage.url
  }

  // Image handling
  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || [])
    setSelectedImages(prev => [...prev, ...files])
    
    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviewUrls(prev => [...prev, e.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // Form validation
  const validateForm = () => {
    const errors = {}

    if (!formData.brand.trim()) {
      errors.brand = t('required')
    }
    if (!formData.model.trim()) {
      errors.model = t('required')
    }
    if (!formData.year || formData.year < 1990 || formData.year > new Date().getFullYear() + 1) {
      errors.year = 'Rok musí byť medzi 1990 a ' + (new Date().getFullYear() + 1)
    }
    if (!formData.registrationNumber.trim()) {
      errors.registrationNumber = t('required')
    }
    if (!formData.vin.trim()) {
      errors.vin = t('required')
    }
    if (!formData.color.trim()) {
      errors.color = t('required')
    }
    if (!formData.category) {
      errors.category = t('required')
    }
    if (!formData.fuelType) {
      errors.fuelType = t('required')
    }
    if (!formData.transmission) {
      errors.transmission = t('required')
    }
    if (!formData.dailyRate || formData.dailyRate <= 0) {
      errors.dailyRate = 'Denná sadzba musí byť väčšia ako 0'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Dialog handlers
  const handleOpenDialog = (mode, car = null) => {
    try {
      setDialogMode(mode)
      setSelectedCar(car)
      setTabValue(0) // Reset to first tab when opening dialog
      
      if (mode === 'create') {
        setFormData(initialFormState)
        setSelectedImages([])
        setImagePreviewUrls([])
      } else if (mode === 'edit' && car) {
        setFormData({
          brand: car.brand || '',
          model: car.model || '',
          year: car.year || new Date().getFullYear(),
          registrationNumber: car.registrationNumber || '',
          vin: car.vin || '',
          color: car.color || '',
          category: car.category || '',
          fuelType: car.fuelType || '',
          transmission: car.transmission || '',
          seats: car.seats || 5,
          doors: car.doors || 4,
          mileage: car.mileage || 0,
          description: car.description || '',
          deposit: car.deposit || 0,
          dailyRate: car.dailyRate || 0,
          weeklyRate: car.weeklyRate || 0,
          monthlyRate: car.monthlyRate || 0,
          status: car.status || 'available',
          location: {
            name: car.location?.name || '',
            address: {
              street: car.location?.address?.street || '',
              city: car.location?.address?.city || '',
              state: car.location?.address?.state || '',
              zipCode: car.location?.address?.zipCode || '',
              country: car.location?.address?.country || ''
            }
          },
          features: car.features || [],
          maintenance: {
            lastServiceDate: car.maintenance?.lastServiceDate || '',
            nextServiceDate: car.maintenance?.nextServiceDate || '',
            nextServiceMileage: car.maintenance?.nextServiceMileage || 0,
            notes: car.maintenance?.notes || ''
          },
          insurance: {
            provider: car.insurance?.provider || '',
            policyNumber: car.insurance?.policyNumber || '',
            expiryDate: car.insurance?.expiryDate || '',
            coverageAmount: car.insurance?.coverageAmount || 0
          }
        })
        setSelectedImages([])
        setImagePreviewUrls([])
      } else if (mode === 'view' && car) {
        setFormData({
          brand: car.brand || '',
          model: car.model || '',
          year: car.year || new Date().getFullYear(),
          registrationNumber: car.registrationNumber || '',
          vin: car.vin || '',
          color: car.color || '',
          category: car.category || '',
          fuelType: car.fuelType || '',
          transmission: car.transmission || '',
          seats: car.seats || 5,
          doors: car.doors || 4,
          mileage: car.mileage || 0,
          description: car.description || '',
          deposit: car.deposit || 0,
          dailyRate: car.dailyRate || 0,
          weeklyRate: car.weeklyRate || 0,
          monthlyRate: car.monthlyRate || 0,
          status: car.status || 'available',
          location: {
            name: car.location?.name || '',
            address: {
              street: car.location?.address?.street || '',
              city: car.location?.address?.city || '',
              state: car.location?.address?.state || '',
              zipCode: car.location?.address?.zipCode || '',
              country: car.location?.address?.country || ''
            }
          },
          features: car.features || [],
          maintenance: {
            lastServiceDate: car.maintenance?.lastServiceDate || '',
            nextServiceDate: car.maintenance?.nextServiceDate || '',
            nextServiceMileage: car.maintenance?.nextServiceMileage || 0,
            notes: car.maintenance?.notes || ''
          },
          insurance: {
            provider: car.insurance?.provider || '',
            policyNumber: car.insurance?.policyNumber || '',
            expiryDate: car.insurance?.expiryDate || '',
            coverageAmount: car.insurance?.coverageAmount || 0
          }
        })
      }
      
      setOpenDialog(true)
      setFormErrors({})
      console.log(`🚗 Car dialog opened in ${mode} mode. Tab value: ${tabValue}`)
    } catch (error) {
      console.error('Error opening dialog:', error)
    }
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedCar(null)
    setFormData(initialFormState)
    setSelectedImages([])
    setImagePreviewUrls([])
    setFormErrors({})
  }

  const handleSubmit = async () => {
    console.log('🚗 Submit button clicked, starting validation...');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed:', formErrors);
      return;
    }

    console.log('✅ Form validation passed, proceeding with submission...');
    console.log('📋 Form data:', formData);
    console.log('🖼️ Selected images:', selectedImages);

    try {
      if (dialogMode === 'create') {
        console.log('🆕 Creating new car...');
        
        // Create FormData for file upload
        const formDataToSend = new FormData();
        
        // Append all form fields
        Object.keys(formData).forEach(key => {
          if (key === 'location' || key === 'maintenance' || key === 'insurance') {
            // Handle nested objects
            Object.keys(formData[key]).forEach(nestedKey => {
              if (key === 'location' && nestedKey === 'address') {
                // Handle nested address object
                Object.keys(formData[key][nestedKey]).forEach(addressKey => {
                  formDataToSend.append(`${key}[${nestedKey}][${addressKey}]`, formData[key][nestedKey][addressKey]);
                });
              } else {
                formDataToSend.append(`${key}[${nestedKey}]`, formData[key][nestedKey]);
              }
            });
          } else if (key === 'features') {
            // Handle array
            formData[key].forEach(feature => {
              formDataToSend.append('features[]', feature);
            });
          } else {
            formDataToSend.append(key, formData[key]);
          }
        });
        
        // Append image files
        selectedImages.forEach(image => {
          formDataToSend.append('images', image);
        });
        
        console.log('📤 Sending FormData to API...');
        
        // Log FormData contents for debugging
        for (let [key, value] of formDataToSend.entries()) {
          console.log(`FormData[${key}]:`, value);
        }
        
        const result = await createCar(formDataToSend).unwrap();
        console.log('✅ Car created successfully:', result);
        alert('Auto bolo úspešne vytvorené!');
        
      } else {
        console.log('✏️ Updating existing car...');
        
        if (selectedImages.length > 0) {
          // Update with images
          const formDataToSend = new FormData();
          formDataToSend.append('id', selectedCar._id);
          
          Object.keys(formData).forEach(key => {
            if (key === 'location' || key === 'maintenance' || key === 'insurance') {
              // Handle nested objects
              Object.keys(formData[key]).forEach(nestedKey => {
                if (key === 'location' && nestedKey === 'address') {
                  // Handle nested address object
                  Object.keys(formData[key][nestedKey]).forEach(addressKey => {
                    formDataToSend.append(`${key}[${nestedKey}][${addressKey}]`, formData[key][nestedKey][addressKey]);
                  });
                } else {
                  formDataToSend.append(`${key}[${nestedKey}]`, formData[key][nestedKey]);
                }
              });
            } else if (key === 'features') {
              // Handle array
              formData[key].forEach(feature => {
                formDataToSend.append('features[]', feature);
              });
            } else {
              formDataToSend.append(key, formData[key]);
            }
          });
          
          selectedImages.forEach(image => {
            formDataToSend.append('images', image);
          });
          
          const result = await updateCar(formDataToSend).unwrap();
          console.log('✅ Car updated successfully:', result);
          alert('Auto bolo úspešne aktualizované!');
          
        } else {
          // Regular update without images
          const result = await updateCar({ 
            id: selectedCar._id, 
            updates: formData 
          }).unwrap();
          console.log('✅ Car updated successfully:', result);
          alert('Auto bolo úspešne aktualizované!');
        }
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('❌ Error saving car:', error);
      
      // More detailed error logging
      if (error.data) {
        console.error('📋 Error details:', error.data);
      }
      if (error.status) {
        console.error('🔢 HTTP Status:', error.status);
      }
      
      // User-friendly error message
      const errorMessage = error.data?.message || error.message || 'Neznáma chyba pri ukladaní auta';
      alert(`Chyba pri ukladaní auta: ${errorMessage}`);
    }
  };

  const handleDelete = async (carId) => {
    if (window.confirm(t('confirmDelete'))) {
      try {
        await deleteCar(carId).unwrap()
        console.log('Car deleted successfully')
      } catch (error) {
        console.error('Error deleting car:', error)
      }
    }
  }

  const handleFeatureChange = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }))
  }

  const renderCarCard = (car) => (
    <Grid item xs={12} sm={6} md={4} key={car._id}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardMedia
          component="img"
          height="200"
          image={getCarImage(car) || '/api/placeholder/400/200'}
          alt={`${car.brand} ${car.model}`}
          sx={{ objectFit: 'cover' }}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              {car.brand} {car.model}
            </Typography>
            <Chip
              label={getStatusText(car.status)}
              size="small"
              color={getStatusColor(car.status)}
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {car.year} • {categoryOptions.find(c => c.value === car.category)?.label || car.category}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, my: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FuelIcon fontSize="small" color="action" />
              <Typography variant="caption">
                {fuelTypeOptions.find(f => f.value === car.fuelType)?.label || car.fuelType}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TransmissionIcon fontSize="small" color="action" />
              <Typography variant="caption">
                {transmissionOptions.find(t => t.value === car.transmission)?.label || car.transmission}
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600, mt: 1 }}>
            {car.dailyRate}€/{t('den')}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Box>
              <IconButton 
                size="small" 
                onClick={() => handleOpenDialog('view', car)}
                color="primary"
              >
                <ViewIcon />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => handleOpenDialog('edit', car)}
                color="primary"
              >
                <EditIcon />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => handleDelete(car._id)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  )

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            {t('fleetManagement')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Spravujte svoj vozový park, pridávajte nové autá a sledujte ich dostupnosť.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
          sx={{ borderRadius: 2 }}
        >
          {t('addCar')}
        </Button>
      </Box>

      {/* Loading and Error States */}
      {carsLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {carsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Chyba pri načítavaní áut: {carsError.message}
        </Alert>
      )}

      {/* Cars Grid */}
      <Grid container spacing={3}>
        {cars.map(renderCarCard)}
      </Grid>

      {/* Car Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {dialogMode === 'create' && t('addCar')}
          {dialogMode === 'edit' && t('editCar')}
          {dialogMode === 'view' && t('viewCar')}
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
            <Tab label={t('carInformation')} />
            <Tab label={t('location')} />
            <Tab label={t('features')} />
            <Tab label={t('maintenance')} />
            <Tab label={t('insurance')} />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ImageIcon />
                  {t('images')}
                </Box>
              } 
            />
          </Tabs>
          
          {console.log(`🔧 Current tab value: ${tabValue}, Dialog mode: ${dialogMode}`)}

          {/* Basic Information Tab */}
          {tabValue === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={`${t('brand')} *`}
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.brand}
                  helperText={formErrors.brand}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={`${t('model')} *`}
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.model}
                  helperText={formErrors.model}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={`${t('year')} *`}
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.year}
                  helperText={formErrors.year}
                  inputProps={{ min: 1990, max: new Date().getFullYear() + 1 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={`${t('registrationNumber')} *`}
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.registrationNumber}
                  helperText={formErrors.registrationNumber}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={`${t('color')} *`}
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.color}
                  helperText={formErrors.color}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={`${t('vin')} *`}
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.vin}
                  helperText={formErrors.vin}
                  inputProps={{ maxLength: 17 }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth error={!!formErrors.category}>
                  <InputLabel>{t('category')} *</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    disabled={dialogMode === 'view'}
                    label={`${t('category')} *`}
                  >
                    {categoryOptions.map(category => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.category && <FormHelperText>{formErrors.category}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth error={!!formErrors.fuelType}>
                  <InputLabel>{t('fuelType')} *</InputLabel>
                  <Select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    disabled={dialogMode === 'view'}
                    label={`${t('fuelType')} *`}
                  >
                    {fuelTypeOptions.map(fuel => (
                      <MenuItem key={fuel.value} value={fuel.value}>
                        {fuel.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.fuelType && <FormHelperText>{formErrors.fuelType}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth error={!!formErrors.transmission}>
                  <InputLabel>{t('transmission')} *</InputLabel>
                  <Select
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    disabled={dialogMode === 'view'}
                    label={`${t('transmission')} *`}
                  >
                    {transmissionOptions.map(trans => (
                      <MenuItem key={trans.value} value={trans.value}>
                        {trans.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.transmission && <FormHelperText>{formErrors.transmission}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label={t('seats')}
                  type="number"
                  value={formData.seats}
                  onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) })}
                  disabled={dialogMode === 'view'}
                  inputProps={{ min: 2, max: 9 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label={t('doors')}
                  type="number"
                  value={formData.doors}
                  onChange={(e) => setFormData({ ...formData, doors: parseInt(e.target.value) })}
                  disabled={dialogMode === 'view'}
                  inputProps={{ min: 2, max: 5 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label={t('mileage')}
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                  disabled={dialogMode === 'view'}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">km</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label={t('deposit')}
                  type="number"
                  value={formData.deposit}
                  onChange={(e) => setFormData({ ...formData, deposit: parseFloat(e.target.value) })}
                  disabled={dialogMode === 'view'}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">€</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={`${t('dailyRate')} *`}
                  type="number"
                  value={formData.dailyRate}
                  onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) })}
                  disabled={dialogMode === 'view'}
                  error={!!formErrors.dailyRate}
                  helperText={formErrors.dailyRate}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">€</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('weeklyRate')}
                  type="number"
                  value={formData.weeklyRate}
                  onChange={(e) => setFormData({ ...formData, weeklyRate: parseFloat(e.target.value) })}
                  disabled={dialogMode === 'view'}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">€</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('monthlyRate')}
                  type="number"
                  value={formData.monthlyRate}
                  onChange={(e) => setFormData({ ...formData, monthlyRate: parseFloat(e.target.value) })}
                  disabled={dialogMode === 'view'}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">€</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('description')}
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
            </Grid>
          )}

          {/* Location Tab */}
          {tabValue === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('locationName')}
                  value={formData.location.name}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, name: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('street')}
                  value={formData.location.address.street}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { 
                      ...formData.location, 
                      address: { ...formData.location.address, street: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('city')}
                  value={formData.location.address.city}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { 
                      ...formData.location, 
                      address: { ...formData.location.address, city: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('state')}
                  value={formData.location.address.state}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { 
                      ...formData.location, 
                      address: { ...formData.location.address, state: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('zipCode')}
                  value={formData.location.address.zipCode}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { 
                      ...formData.location, 
                      address: { ...formData.location.address, zipCode: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('country')}
                  value={formData.location.address.country}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { 
                      ...formData.location, 
                      address: { ...formData.location.address, country: e.target.value }
                    }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
            </Grid>
          )}

          {/* Features Tab */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('features')}
              </Typography>
              <FormGroup>
                <Grid container spacing={1}>
                  {featureOptions.map(feature => (
                    <Grid item xs={12} sm={6} key={feature.value}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.features.includes(feature.value)}
                            onChange={() => handleFeatureChange(feature.value)}
                            disabled={dialogMode === 'view'}
                          />
                        }
                        label={feature.label}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>
            </Box>
          )}

          {/* Maintenance Tab */}
          {tabValue === 3 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('lastServiceDate')}
                  type="date"
                  value={formData.maintenance.lastServiceDate}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maintenance: { ...formData.maintenance, lastServiceDate: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('nextServiceDate')}
                  type="date"
                  value={formData.maintenance.nextServiceDate}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maintenance: { ...formData.maintenance, nextServiceDate: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('nextServiceMileage')}
                  type="number"
                  value={formData.maintenance.nextServiceMileage}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maintenance: { ...formData.maintenance, nextServiceMileage: parseInt(e.target.value) }
                  })}
                  disabled={dialogMode === 'view'}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">km</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('maintenanceNotes')}
                  multiline
                  rows={3}
                  value={formData.maintenance.notes}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maintenance: { ...formData.maintenance, notes: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
            </Grid>
          )}

          {/* Insurance Tab */}
          {tabValue === 4 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('insuranceProvider')}
                  value={formData.insurance.provider}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    insurance: { ...formData.insurance, provider: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('policyNumber')}
                  value={formData.insurance.policyNumber}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    insurance: { ...formData.insurance, policyNumber: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('expiryDate')}
                  type="date"
                  value={formData.insurance.expiryDate}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    insurance: { ...formData.insurance, expiryDate: e.target.value }
                  })}
                  disabled={dialogMode === 'view'}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('coverageAmount')}
                  type="number"
                  value={formData.insurance.coverageAmount}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    insurance: { ...formData.insurance, coverageAmount: parseFloat(e.target.value) }
                  })}
                  disabled={dialogMode === 'view'}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">€</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          )}

          {/* Images Tab */}
          {tabValue === 5 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('images')} 🖼️
              </Typography>
              
              {console.log(`🖼️ Images tab rendered. DialogMode: ${dialogMode}, TabValue: ${tabValue}`)}
              
              {dialogMode === 'create' ? (
                <Box>
                  {/* Image Upload Section for New Cars */}
                  <Box sx={{ mb: 3, p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<UploadIcon />}
                      fullWidth
                      sx={{ mb: 2, py: 2 }}
                      color="primary"
                    >
                      {t('uploadImages')} 📷
                      <input
                        type="file"
                        hidden
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </Button>
                    <Typography variant="body2" color="text.secondary" align="center">
                      {t('maxImagesNote')} (10 obrázkov)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
                      Podporované formáty: JPG, PNG, WEBP, GIF
                    </Typography>
                  </Box>

                  {/* Image Previews */}
                  {imagePreviewUrls.length > 0 && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        Náhľad obrázkov ({imagePreviewUrls.length})
                      </Typography>
                      <ImageList sx={{ width: '100%' }} cols={3} rowHeight={164}>
                        {imagePreviewUrls.map((url, index) => (
                          <ImageListItem key={index}>
                            <img
                              src={url}
                              alt={`Náhľad ${index + 1}`}
                              loading="lazy"
                              style={{ objectFit: 'cover' }}
                            />
                            <ImageListItemBar
                              title={`Obrázok ${index + 1}`}
                              subtitle={index === 0 ? '(Primárny)' : ''}
                              actionIcon={
                                <Tooltip title="Odstrániť obrázok">
                                  <IconButton
                                    sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                                    onClick={() => removeImage(index)}
                                  >
                                    <CloseIcon />
                                  </IconButton>
                                </Tooltip>
                              }
                            />
                          </ImageListItem>
                        ))}
                      </ImageList>
                    </Box>
                  )}
                  
                  {imagePreviewUrls.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <ImageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        Zatiaľ neboli pridané žiadne obrázky
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box>
                  {/* Image Upload Section for Existing Cars in Edit Mode */}
                  {dialogMode === 'edit' && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {t('addMoreImages')} 
                      </Typography>
                      <Box sx={{ mb: 3, p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<UploadIcon />}
                          fullWidth
                          sx={{ mb: 2, py: 2 }}
                          color="primary"
                        >
                          {t('uploadImages')} 📷
                          <input
                            type="file"
                            hidden
                            multiple
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </Button>
                        <Typography variant="body2" color="text.secondary" align="center">
                          {t('maxImagesNote')} (10 obrázkov celkovo)
                        </Typography>
                        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
                          Podporované formáty: JPG, PNG, WEBP, GIF
                        </Typography>
                      </Box>

                      {/* New Image Previews */}
                      {imagePreviewUrls.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Nové obrázky na pridanie ({imagePreviewUrls.length})
                          </Typography>
                          <ImageList sx={{ width: '100%' }} cols={3} rowHeight={164}>
                            {imagePreviewUrls.map((url, index) => (
                              <ImageListItem key={`new-${index}`}>
                                <img
                                  src={url}
                                  alt={`Nový obrázok ${index + 1}`}
                                  loading="lazy"
                                  style={{ objectFit: 'cover' }}
                                />
                                <ImageListItemBar
                                  title={`Nový obrázok ${index + 1}`}
                                  subtitle="(Pridať)"
                                  actionIcon={
                                    <Tooltip title="Odstrániť obrázok">
                                      <IconButton
                                        sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                                        onClick={() => removeImage(index)}
                                      >
                                        <CloseIcon />
                                      </IconButton>
                                    </Tooltip>
                                  }
                                />
                              </ImageListItem>
                            ))}
                          </ImageList>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Existing Images for Edit/View Mode */}
                  <Typography variant="subtitle1" gutterBottom>
                    {dialogMode === 'edit' ? 'Existujúce obrázky' : t('images')}
                  </Typography>
                  {selectedCar?.images && selectedCar.images.length > 0 ? (
                    <ImageList sx={{ width: '100%' }} cols={3} rowHeight={164}>
                      {selectedCar.images.map((image, index) => (
                        <ImageListItem key={`existing-${index}`}>
                          <img
                            src={image.urls?.medium || image.url}
                            alt={image.description || `${t('images')} ${index + 1}`}
                            loading="lazy"
                            style={{ objectFit: 'cover' }}
                          />
                          <ImageListItemBar
                            title={image.isPrimary ? `${t('images')} (Primárny)` : `${t('images')} ${index + 1}`}
                            subtitle={image.description}
                            actionIcon={
                              <IconButton
                                sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                                aria-label="info"
                              >
                                {image.isPrimary ? <StarIcon /> : <StarBorderIcon />}
                              </IconButton>
                            }
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <ImageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        {dialogMode === 'edit' ? 'Žiadne existujúce obrázky. Pridajte nové vyššie.' : 'Žiadne obrázky nie sú dostupné.'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleCloseDialog}>
            {t('cancel')}
          </Button>
          {dialogMode !== 'view' && (
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={creating || updating}
            >
              {creating || updating ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                t('save')
              )}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Cars 