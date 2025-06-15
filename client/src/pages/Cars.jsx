import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Autocomplete,
  FormHelperText,
  Divider,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Avatar,
  Badge,
  Input
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsCar as CarIcon,
  Build as MaintenanceIcon,
  Visibility as ViewIcon,
  PhotoCamera as PhotoIcon,
  LocalGasStation as FuelIcon,
  Speed as SpeedIcon,
  EventSeat as SeatIcon,
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  AttachMoney as MoneyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material'
import {
  useGetCarsQuery,
  useCreateCarMutation,
  useUpdateCarMutation,
  useDeleteCarMutation,
  useDeleteCarImageMutation,
  useSetPrimaryCarImageMutation
} from '../store/store'

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
    'economy', 'compact', 'midsize', 'fullsize', 'luxury', 'suv', 'minivan', 'convertible', 'sports'
  ]

  // Fuel type options
  const fuelTypeOptions = ['gasoline', 'diesel', 'hybrid', 'electric']

  // Transmission options
  const transmissionOptions = ['manual', 'automatic', 'cvt']

  // Feature options
  const featureOptions = [
    'air-conditioning', 'gps', 'bluetooth', 'heated-seats', 'sunroof', 
    'leather-seats', 'backup-camera', 'cruise-control', 'usb-ports', 'wifi'
  ]

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      available: 'success',
      booked: 'primary',
      maintenance: 'warning',
      'out-of-service': 'error'
    }
    return colors[status] || 'default'
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
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
      const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB
      return isValidType && isValidSize
    })

    if (validFiles.length !== files.length) {
      alert('Some files were rejected. Please ensure all files are JPEG, PNG, or WebP and under 5MB.')
    }

    setSelectedImages(prev => [...prev, ...validFiles])

    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
  }

  const removeImage = (index) => {
    // Clean up preview URL
    URL.revokeObjectURL(imagePreviewUrls[index])
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // Form validation
  const validateForm = () => {
    const errors = {}
    
    if (!formData.brand) errors.brand = 'Brand is required'
    if (!formData.model) errors.model = 'Model is required'
    if (!formData.year) errors.year = 'Year is required'
    if (!formData.registrationNumber) errors.registrationNumber = 'Registration number is required'
    if (!formData.vin) errors.vin = 'VIN is required'
    if (formData.vin && formData.vin.length !== 17) errors.vin = 'VIN must be exactly 17 characters'
    if (!formData.color) errors.color = 'Color is required'
    if (!formData.category) errors.category = 'Category is required'
    if (!formData.fuelType) errors.fuelType = 'Fuel type is required'
    if (!formData.transmission) errors.transmission = 'Transmission is required'
    if (!formData.dailyRate || formData.dailyRate <= 0) errors.dailyRate = 'Daily rate must be greater than 0'
    if (!formData.location.name) errors.locationName = 'Location name is required'
    if (formData.deposit < 0) errors.deposit = 'Deposit cannot be negative'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      // Check if we have images to upload
      const hasImages = selectedImages.length > 0

      if (hasImages) {
        // Use FormData for image uploads
        const formDataToSend = new FormData()
        
        // Add all car data except nested objects
        Object.keys(formData).forEach(key => {
          if (key === 'location') {
            // Handle location specially
            formDataToSend.append('location[name]', formData.location.name || '')
            formDataToSend.append('location[address][street]', formData.location.address?.street || '')
            formDataToSend.append('location[address][city]', formData.location.address?.city || '')
            formDataToSend.append('location[address][state]', formData.location.address?.state || '')
            formDataToSend.append('location[address][zipCode]', formData.location.address?.zipCode || '')
            formDataToSend.append('location[address][country]', formData.location.address?.country || '')
          } else if (key === 'features') {
            // Handle features as individual values
            formData.features.forEach(feature => {
              formDataToSend.append('features[]', feature)
            })
          } else if (key === 'maintenance') {
            // Handle maintenance
            Object.keys(formData.maintenance).forEach(mKey => {
              if (formData.maintenance[mKey] !== null && formData.maintenance[mKey] !== '') {
                // Convert date strings to Date objects for lastServiceDate and nextServiceDate
                if ((mKey === 'lastServiceDate' || mKey === 'nextServiceDate') && formData.maintenance[mKey]) {
                  formDataToSend.append(`maintenance[${mKey}]`, new Date(formData.maintenance[mKey]).toISOString())
                } else {
                  formDataToSend.append(`maintenance[${mKey}]`, formData.maintenance[mKey])
                }
              }
            })
          } else if (key === 'insurance') {
            // Handle insurance
            Object.keys(formData.insurance).forEach(iKey => {
              if (formData.insurance[iKey] !== null && formData.insurance[iKey] !== '') {
                // Convert date string to Date object for expiryDate
                if (iKey === 'expiryDate' && formData.insurance[iKey]) {
                  formDataToSend.append(`insurance[${iKey}]`, new Date(formData.insurance[iKey]).toISOString())
                } else {
                  formDataToSend.append(`insurance[${iKey}]`, formData.insurance[iKey])
                }
              }
            })
          } else {
            formDataToSend.append(key, formData[key])
          }
        })

        // Add images
        selectedImages.forEach((file) => {
          formDataToSend.append('images', file)
        })

        // Normalize data
        formDataToSend.set('registrationNumber', formData.registrationNumber.toUpperCase())
        formDataToSend.set('vin', formData.vin.toUpperCase())

        if (dialogMode === 'create') {
          await createCar(formDataToSend).unwrap()
        } else if (dialogMode === 'edit') {
          formDataToSend.append('id', selectedCar._id)
          await updateCar(formDataToSend).unwrap()
        }
      } else {
        // Use regular JSON for cars without images
        const carData = {
          ...formData,
          registrationNumber: formData.registrationNumber.toUpperCase(),
          vin: formData.vin.toUpperCase(),
          // Convert date strings back to Date objects if they're not empty
          maintenance: {
            ...formData.maintenance,
            lastServiceDate: formData.maintenance.lastServiceDate ? new Date(formData.maintenance.lastServiceDate) : null,
            nextServiceDate: formData.maintenance.nextServiceDate ? new Date(formData.maintenance.nextServiceDate) : null
          },
          insurance: {
            ...formData.insurance,
            expiryDate: formData.insurance.expiryDate ? new Date(formData.insurance.expiryDate) : null
          }
        }

        if (dialogMode === 'create') {
          await createCar(carData).unwrap()
        } else if (dialogMode === 'edit') {
          await updateCar({ 
            id: selectedCar._id, 
            ...carData 
          }).unwrap()
        }
      }

      handleCloseDialog()
    } catch (error) {
      console.error('Error saving car:', error)
      
      // Show user-friendly error message
      if (error.data?.error?.errors) {
        const errorMessages = Object.values(error.data.error.errors)
          .map(err => err.message)
          .join(', ')
        alert(`Validation Error: ${errorMessages}`)
      } else {
        alert(`Error: ${error.data?.message || error.message || 'Unknown error occurred'}`)
      }
    }
  }

  // Dialog handlers
  const handleOpenDialog = (mode, car = null) => {
    try {
      setDialogMode(mode)
      setSelectedCar(car)
      
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
            lastServiceDate: car.maintenance?.lastServiceDate 
              ? (typeof car.maintenance.lastServiceDate === 'string' 
                  ? car.maintenance.lastServiceDate.split('T')[0]
                  : car.maintenance.lastServiceDate.toISOString().split('T')[0])
              : '',
            nextServiceDate: car.maintenance?.nextServiceDate 
              ? (typeof car.maintenance.nextServiceDate === 'string'
                  ? car.maintenance.nextServiceDate.split('T')[0]
                  : car.maintenance.nextServiceDate.toISOString().split('T')[0])
              : '',
            nextServiceMileage: car.maintenance?.nextServiceMileage || 0,
            notes: car.maintenance?.notes || ''
          },
          insurance: {
            provider: car.insurance?.provider || '',
            policyNumber: car.insurance?.policyNumber || '',
            expiryDate: car.insurance?.expiryDate 
              ? (typeof car.insurance.expiryDate === 'string'
                  ? car.insurance.expiryDate.split('T')[0]
                  : car.insurance.expiryDate.toISOString().split('T')[0])
              : '',
            coverageAmount: car.insurance?.coverageAmount || 0
          }
        })
        setSelectedImages([])
        setImagePreviewUrls([])
      } else if (mode === 'view' && car) {
        setFormData(car)
        setSelectedImages([])
        setImagePreviewUrls([])
      }
      
      setFormErrors({})
      setOpenDialog(true)
    } catch (error) {
      console.error('Error opening dialog:', error)
      alert('Error opening dialog. Please try again.')
    }
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedCar(null)
    setFormData(initialFormState)
    setFormErrors({})
    setSelectedImages([])
    // Clean up preview URLs
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    setImagePreviewUrls([])
  }

  // Action handlers
  const handleDelete = async (car) => {
    if (window.confirm(`Are you sure you want to delete ${car.brand} ${car.model}?`)) {
      try {
        await deleteCar(car._id).unwrap()
      } catch (error) {
        console.error('Error deleting car:', error)
      }
    }
  }

  // Filter cars by status
  const getFilteredCars = (status) => {
    if (status === 'all') return cars
    return cars.filter(car => car.status === status)
  }

  // Handle deleting existing car images
  const handleDeleteExistingImage = async (imageIndex) => {
    if (!selectedCar) return
    
    try {
      await deleteCarImage({ 
        carId: selectedCar._id, 
        imageIndex 
      }).unwrap()
      
      // Update the selectedCar state to reflect the change
      const updatedImages = [...selectedCar.images]
      updatedImages.splice(imageIndex, 1)
      setSelectedCar({ ...selectedCar, images: updatedImages })
    } catch (error) {
      console.error('Failed to delete image:', error)
    }
  }

  // Handle setting primary image
  const handleSetPrimaryImage = async (imageIndex) => {
    if (!selectedCar) return
    
    try {
      await setPrimaryCarImage({ 
        carId: selectedCar._id, 
        imageIndex 
      }).unwrap()
      
      // Update the selectedCar state to reflect the change
      const updatedImages = selectedCar.images.map((img, idx) => ({
        ...img,
        isPrimary: idx === imageIndex
      }))
      setSelectedCar({ ...selectedCar, images: updatedImages })
    } catch (error) {
      console.error('Failed to set primary image:', error)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Fleet Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your car rental fleet, add new vehicles, and track maintenance.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
          size="large"
        >
          Add Vehicle
        </Button>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label={`All (${cars.length})`} />
            <Tab label={`Available (${getFilteredCars('available').length})`} />
            <Tab label={`Maintenance (${getFilteredCars('maintenance').length})`} />
            <Tab label={`Out of Service (${getFilteredCars('out-of-service').length})`} />
          </Tabs>
        </Box>

        {/* All Cars Tab */}
        <TabPanel value={tabValue} index={0}>
          {carsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : carsError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              Error loading cars: {carsError.message}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Registration</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Daily Rate</TableCell>
                    <TableCell>Mileage</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cars.map((car) => (
                    <TableRow key={car._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: 'primary.main',
                              width: 56,
                              height: 56,
                              borderRadius: 2,
                              border: '2px solid',
                              borderColor: 'divider',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                                transform: 'scale(1.05)'
                              },
                              '& img': {
                                objectFit: 'cover'
                              }
                            }}
                            src={getCarImage(car)}
                            variant="rounded"
                            onClick={() => handleOpenDialog('view', car)}
                          >
                            {!getCarImage(car) && getCategoryIcon(car.category)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {car.year} {car.brand} {car.model}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {car.color} • {car.fuelType} • {car.transmission}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {car.registrationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={car.category} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={car.status}
                          color={getStatusColor(car.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          ${car.dailyRate}/day
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SpeedIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {car.mileage?.toLocaleString() || 0} km
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {car.location?.name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('view', car)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('edit', car)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(car)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Filtered tabs */}
        {['available', 'maintenance', 'out-of-service'].map((status, index) => (
          <TabPanel key={status} value={tabValue} index={index + 1}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Registration</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Daily Rate</TableCell>
                    <TableCell>Mileage</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredCars(status).map((car) => (
                    <TableRow key={car._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: 'primary.main',
                              width: 56,
                              height: 56,
                              borderRadius: 2,
                              border: '2px solid',
                              borderColor: 'divider',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                                transform: 'scale(1.05)'
                              },
                              '& img': {
                                objectFit: 'cover'
                              }
                            }}
                            src={getCarImage(car)}
                            variant="rounded"
                            onClick={() => handleOpenDialog('view', car)}
                          >
                            {!getCarImage(car) && getCategoryIcon(car.category)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {car.year} {car.brand} {car.model}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {car.color} • {car.fuelType} • {car.transmission}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{car.registrationNumber}</TableCell>
                      <TableCell>
                        <Chip 
                          label={car.category} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>${car.dailyRate}/day</TableCell>
                      <TableCell>{car.mileage?.toLocaleString() || 0} km</TableCell>
                      <TableCell>{car.location?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('view', car)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('edit', car)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      {/* Create/Edit Car Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Add New Vehicle' : 
           dialogMode === 'edit' ? 'Edit Vehicle' : 'Vehicle Details'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                disabled={dialogMode === 'view'}
                error={!!formErrors.brand}
                helperText={formErrors.brand}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                disabled={dialogMode === 'view'}
                error={!!formErrors.model}
                helperText={formErrors.model}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                disabled={dialogMode === 'view'}
                error={!!formErrors.year}
                helperText={formErrors.year}
                required
                inputProps={{ min: 1990, max: new Date().getFullYear() + 1 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Registration Number"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                disabled={dialogMode === 'view'}
                error={!!formErrors.registrationNumber}
                helperText={formErrors.registrationNumber}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="VIN (17 characters)"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                disabled={dialogMode === 'view'}
                error={!!formErrors.vin}
                helperText={formErrors.vin}
                required
                inputProps={{ maxLength: 17 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                disabled={dialogMode === 'view'}
                error={!!formErrors.color}
                helperText={formErrors.color}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth error={!!formErrors.category}>
                <InputLabel>Category *</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={dialogMode === 'view'}
                  label="Category *"
                >
                  {categoryOptions.map(category => (
                    <MenuItem key={category} value={category}>
                      {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.category && <FormHelperText>{formErrors.category}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  disabled={dialogMode === 'view'}
                  label="Status"
                >
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="out-of-service">Out of Service</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Technical Specifications */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Technical Specifications
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth error={!!formErrors.fuelType}>
                <InputLabel>Fuel Type *</InputLabel>
                <Select
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                  disabled={dialogMode === 'view'}
                  label="Fuel Type *"
                >
                  {fuelTypeOptions.map(fuel => (
                    <MenuItem key={fuel} value={fuel}>
                      {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.fuelType && <FormHelperText>{formErrors.fuelType}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth error={!!formErrors.transmission}>
                <InputLabel>Transmission *</InputLabel>
                <Select
                  value={formData.transmission}
                  onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                  disabled={dialogMode === 'view'}
                  label="Transmission *"
                >
                  {transmissionOptions.map(trans => (
                    <MenuItem key={trans} value={trans}>
                      {trans.charAt(0).toUpperCase() + trans.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.transmission && <FormHelperText>{formErrors.transmission}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Mileage (km)"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) || 0 })}
                disabled={dialogMode === 'view'}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Seats"
                type="number"
                value={formData.seats}
                onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 5 })}
                disabled={dialogMode === 'view'}
                inputProps={{ min: 2, max: 9 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Doors"
                type="number"
                value={formData.doors}
                onChange={(e) => setFormData({ ...formData, doors: parseInt(e.target.value) || 4 })}
                disabled={dialogMode === 'view'}
                inputProps={{ min: 2, max: 5 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Daily Rate ($)"
                type="number"
                value={formData.dailyRate}
                onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) || 0 })}
                disabled={dialogMode === 'view'}
                error={!!formErrors.dailyRate}
                helperText={formErrors.dailyRate}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Weekly Rate ($)"
                type="number"
                value={formData.weeklyRate}
                onChange={(e) => setFormData({ ...formData, weeklyRate: parseFloat(e.target.value) || 0 })}
                disabled={dialogMode === 'view'}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Monthly Rate ($)"
                type="number"
                value={formData.monthlyRate}
                onChange={(e) => setFormData({ ...formData, monthlyRate: parseFloat(e.target.value) || 0 })}
                disabled={dialogMode === 'view'}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Deposit ($)"
                type="number"
                value={formData.deposit}
                onChange={(e) => setFormData({ ...formData, deposit: parseFloat(e.target.value) || 0 })}
                disabled={dialogMode === 'view'}
                error={!!formErrors.deposit}
                helperText={formErrors.deposit || 'Security deposit required from customers'}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Description & Images
              </Typography>
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
                error={!!formErrors.description}
                helperText={formErrors.description || 'Detailed description of the vehicle (up to 1000 characters)'}
                inputProps={{ maxLength: 1000 }}
              />
            </Grid>

            {/* Image Upload */}
            {dialogMode !== 'view' && (
              <Grid item xs={12}>
                <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center' }}>
                  <input
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: 'none' }}
                    id="image-upload-button"
                    multiple
                    type="file"
                    onChange={handleImageChange}
                  />
                  <label htmlFor="image-upload-button">
                    <IconButton color="primary" aria-label="upload picture" component="span" size="large">
                      <PhotoIcon sx={{ fontSize: 40 }} />
                    </IconButton>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      Click to upload car images
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supported formats: JPEG, PNG, WebP (max 5MB each)
                    </Typography>
                  </label>
                </Box>
              </Grid>
            )}

            {/* Image Previews */}
            {imagePreviewUrls.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Images ({imagePreviewUrls.length})
                </Typography>
                <Grid container spacing={2}>
                  {imagePreviewUrls.map((url, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
                      <Card>
                        <Box sx={{ position: 'relative' }}>
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            style={{ 
                              width: '100%', 
                              height: '120px', 
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeImage(index)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" color="error" />
                          </IconButton>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}

            {/* Existing Images (when editing) */}
            {dialogMode === 'edit' && selectedCar?.images && selectedCar.images.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Current Images ({selectedCar.images.length})
                </Typography>
                <Grid container spacing={2}>
                  {selectedCar.images.map((image, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
                      <Card>
                        <Box sx={{ position: 'relative' }}>
                          <img
                            src={image.urls?.medium || image.url}
                            alt={image.description || `Car image ${index + 1}`}
                            style={{ 
                              width: '100%', 
                              height: '120px', 
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                          
                          {/* Primary image indicator */}
                          {image.isPrimary && (
                            <Chip
                              label="Primary"
                              color="primary"
                              size="small"
                              sx={{ 
                                position: 'absolute', 
                                top: 4, 
                                left: 4,
                                fontSize: '0.7rem',
                                height: '20px'
                              }}
                            />
                          )}
                          
                          {/* Action buttons */}
                          <Box sx={{ 
                            position: 'absolute', 
                            top: 4, 
                            right: 4,
                            display: 'flex',
                            gap: 0.5
                          }}>
                            {/* Set as primary button */}
                            <IconButton
                              size="small"
                              onClick={() => handleSetPrimaryImage(index)}
                              disabled={image.isPrimary}
                              sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                '&:hover': {
                                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                },
                                '&:disabled': {
                                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                }
                              }}
                            >
                              {image.isPrimary ? (
                                <StarIcon fontSize="small" color="primary" />
                              ) : (
                                <StarBorderIcon fontSize="small" color="action" />
                              )}
                            </IconButton>
                            
                            {/* Delete button */}
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteExistingImage(index)}
                              sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                '&:hover': {
                                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        {/* Image description */}
                        <CardContent sx={{ p: 1, pb: '8px !important' }}>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {image.description || `Image ${index + 1}`}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}

            {/* Existing Images (when viewing) */}
            {dialogMode === 'view' && selectedCar?.images && selectedCar.images.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Car Images ({selectedCar.images.length})
                </Typography>
                <Grid container spacing={2}>
                  {selectedCar.images.map((image, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
                      <Card>
                        <Box sx={{ position: 'relative' }}>
                          <img
                            src={image.urls?.medium || image.url}
                            alt={image.description || `Car image ${index + 1}`}
                            style={{ 
                              width: '100%', 
                              height: '120px', 
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                          
                          {/* Primary image indicator */}
                          {image.isPrimary && (
                            <Chip
                              label="Primary"
                              color="primary"
                              size="small"
                              sx={{ 
                                position: 'absolute', 
                                top: 4, 
                                left: 4,
                                fontSize: '0.7rem',
                                height: '20px'
                              }}
                            />
                          )}
                        </Box>
                        
                        {/* Image description */}
                        <CardContent sx={{ p: 1, pb: '8px !important' }}>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {image.description || `Image ${index + 1}`}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}

            {/* Location */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Location
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location Name"
                value={formData.location.name}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, name: e.target.value }
                })}
                disabled={dialogMode === 'view'}
                error={!!formErrors.locationName}
                helperText={formErrors.locationName}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City"
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

            {/* Features */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Features
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={featureOptions}
                value={formData.features || []}
                onChange={(e, value) => setFormData({ ...formData, features: value })}
                disabled={dialogMode === 'view'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Features"
                    placeholder="Choose car features"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index })
                    return (
                      <Chip
                        key={key}
                        label={option.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {...tagProps}
                      />
                    )
                  })
                }
              />
            </Grid>

            {/* Maintenance */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Maintenance
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Service Date"
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
                label="Next Service Date"
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

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Next Service Mileage (km)"
                type="number"
                value={formData.maintenance.nextServiceMileage}
                onChange={(e) => setFormData({
                  ...formData,
                  maintenance: { ...formData.maintenance, nextServiceMileage: parseInt(e.target.value) || 0 }
                })}
                disabled={dialogMode === 'view'}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Maintenance Notes"
                value={formData.maintenance.notes}
                onChange={(e) => setFormData({
                  ...formData,
                  maintenance: { ...formData.maintenance, notes: e.target.value }
                })}
                disabled={dialogMode === 'view'}
              />
            </Grid>

            {/* Insurance */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Insurance
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Insurance Provider"
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
                label="Insurance Policy Number"
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
                label="Insurance Expiry Date"
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
                label="Insurance Coverage Amount"
                type="number"
                value={formData.insurance.coverageAmount}
                onChange={(e) => setFormData({
                  ...formData,
                  insurance: { ...formData.insurance, coverageAmount: parseInt(e.target.value) || 0 }
                })}
                disabled={dialogMode === 'view'}
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={creating || updating}
            >
              {creating || updating ? <CircularProgress size={20} /> : 
               dialogMode === 'create' ? 'Add Vehicle' : 'Update Vehicle'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Cars 