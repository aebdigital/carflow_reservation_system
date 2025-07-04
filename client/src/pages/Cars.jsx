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
  CircularProgress,
  Alert,
  Tooltip
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
  Close as CloseIcon,
} from '@mui/icons-material'
import {
  useGetCarsQuery,
  useCreateCarMutation,
  useUpdateCarMutation,
  useDeleteCarMutation,
  useDeleteCarImageMutation,
  useSetPrimaryCarImageMutation,
} from '../store/store'
import { t } from '../utils/translations'
import EnhancedCarForm from '../components/cars/EnhancedCarForm'

function Cars() {
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedCar, setSelectedCar] = useState(null)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [selectedImages, setSelectedImages] = useState([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState([])

  // Initial form state - Enhanced for comprehensive car management
  const initialFormState = {
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    registrationNumber: '',
    vin: '',
    color: '',
    category: '',
    fuelType: '',
    drivetrain: 'front',
    transmission: '',
    seats: 5,
    doors: 4,
    trunkVolume: '',
    engine: {
      displacement: '',
      power: '',
      torque: '',
      cylinders: ''
    },
    fuelConsumption: {
      city: '',
      highway: '',
      combined: '',
      co2Emissions: ''
    },
    status: 'active',
    mileage: {
      current: 0
    },
    documentValidity: {
      highwayTollSticker: { expiryDate: '' },
      technicalInspection: { expiryDate: '' },
      emissionInspection: { expiryDate: '' }
    },
    pricing: {
      dailyRate: '',
      deposit: '',
      rates: {
        '1day': '',
        '2-3days': '',
        '4-10days': '',
        '11-17days': '',
        '18-24days': '',
        '30plus': 'dohoda - volať/písať mail'
      }
    },
    mileageLimits: {
      dailyLimit: -1,
      excessKmPrice: 0.25
    },
    description: '',
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
    equipment: [],
    badges: [],
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
    { value: 'cvt', label: 'CVT' }
  ]

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      unavailable: 'warning',
      archived: 'error'
    }
    return colors[status] || 'default'
  }

  // Status text mapping
  const getStatusText = (status) => {
    const statusTexts = {
      active: t('available'),
      unavailable: t('maintenance'),
      archived: t('outOfService')
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

  // Handle deleting existing car images
  const handleDeleteExistingImage = async (imageIndex) => {
    if (!selectedCar || !selectedCar._id) return
    
    try {
      await deleteCarImage({ 
        carId: selectedCar._id, 
        imageIndex: imageIndex 
      }).unwrap()
      
      // Update the selected car's images in the local state
      setSelectedCar(prev => ({
        ...prev,
        images: prev.images.filter((_, index) => index !== imageIndex)
      }))
      
      // Also update the form data if we're editing
      if (dialogMode === 'edit') {
        setFormData(prev => ({
          ...prev,
          images: prev.images ? prev.images.filter((_, index) => index !== imageIndex) : []
        }))
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Chyba pri mazaní obrázka. Skúste to znova.')
    }
  }

  // Handle setting primary image
  const handleSetPrimaryImage = async (imageIndex) => {
    if (!selectedCar || !selectedCar._id) return
    
    try {
      await setPrimaryCarImage({ 
        carId: selectedCar._id, 
        imageIndex: imageIndex 
      }).unwrap()
      
      // Update the selected car's images in the local state
      setSelectedCar(prev => ({
        ...prev,
        images: prev.images.map((img, index) => ({
          ...img,
          isPrimary: index === imageIndex
        }))
      }))
      
      // Also update the form data if we're editing
      if (dialogMode === 'edit') {
        setFormData(prev => ({
          ...prev,
          images: prev.images ? prev.images.map((img, index) => ({
            ...img,
            isPrimary: index === imageIndex
          })) : []
        }))
      }
    } catch (error) {
      console.error('Error setting primary image:', error)
      alert('Chyba pri nastavovaní primárneho obrázka. Skúste to znova.')
    }
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
    
    // Only require daily rate if it's provided, but it must be positive if provided
    if (formData.pricing?.dailyRate !== undefined && formData.pricing.dailyRate !== '' && formData.pricing.dailyRate !== null) {
      if (formData.pricing.dailyRate <= 0) {
        errors.dailyRate = 'Denná sadzba musí byť väčšia ako 0'
      }
    }

    setFormErrors(errors)
    
    // Log validation results for debugging
    console.log('🔍 Form validation results:', {
      hasErrors: Object.keys(errors).length > 0,
      errors: errors,
      formData: formData
    });
    
    return Object.keys(errors).length === 0
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
          drivetrain: car.drivetrain || 'front',
          transmission: car.transmission || '',
          seats: car.seats || 5,
          doors: car.doors || 4,
          trunkVolume: car.trunkVolume || '',
          engine: {
            displacement: car.engine?.displacement || '',
            power: car.engine?.power || '',
            torque: car.engine?.torque || '',
            cylinders: car.engine?.cylinders || ''
          },
          fuelConsumption: {
            city: car.fuelConsumption?.city || '',
            highway: car.fuelConsumption?.highway || '',
            combined: car.fuelConsumption?.combined || '',
            co2Emissions: car.fuelConsumption?.co2Emissions || ''
          },
          status: car.status || 'active',
          mileage: {
            current: car.mileage?.current || car.mileage || 0
          },
          documentValidity: {
            highwayTollSticker: { expiryDate: car.documentValidity?.highwayTollSticker?.expiryDate || '' },
            technicalInspection: { expiryDate: car.documentValidity?.technicalInspection?.expiryDate || '' },
            emissionInspection: { expiryDate: car.documentValidity?.emissionInspection?.expiryDate || '' }
          },
          pricing: {
            dailyRate: car.pricing?.dailyRate || car.dailyRate || 0,
            deposit: car.pricing?.deposit || car.deposit || 0,
            rates: {
              '1day': car.pricing?.rates?.['1day'] || '',
              '2-3days': car.pricing?.rates?.['2-3days'] || '',
              '4-10days': car.pricing?.rates?.['4-10days'] || '',
              '11-17days': car.pricing?.rates?.['11-17days'] || '',
              '18-24days': car.pricing?.rates?.['18-24days'] || '',
              '30plus': 'dohoda - volať/písať mail'
            }
          },
          mileageLimits: {
            dailyLimit: car.mileageLimits?.dailyLimit ?? -1,
            excessKmPrice: car.mileageLimits?.excessKmPrice || 0.25
          },
          description: car.description || '',
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
          equipment: car.equipment || [],
          badges: car.badges || [],
          features: car.features || [],
          statistics: {
            totalBookings: car.statistics?.totalBookings || car.totalBookings || 0,
            totalRevenue: car.statistics?.totalRevenue || car.totalRevenue || 0,
            totalRentalDays: car.statistics?.totalRentalDays || 0,
            averageDailyRate: car.statistics?.averageDailyRate || 0,
            nextReservation: car.statistics?.nextReservation || null,
            lastReservation: car.statistics?.lastReservation || null
          },
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
          drivetrain: car.drivetrain || 'front',
          transmission: car.transmission || '',
          seats: car.seats || 5,
          doors: car.doors || 4,
          trunkVolume: car.trunkVolume || '',
          engine: {
            displacement: car.engine?.displacement || '',
            power: car.engine?.power || '',
            torque: car.engine?.torque || '',
            cylinders: car.engine?.cylinders || ''
          },
          fuelConsumption: {
            city: car.fuelConsumption?.city || '',
            highway: car.fuelConsumption?.highway || '',
            combined: car.fuelConsumption?.combined || '',
            co2Emissions: car.fuelConsumption?.co2Emissions || ''
          },
          status: car.status || 'active',
          mileage: {
            current: car.mileage?.current || car.mileage || 0
          },
          documentValidity: {
            highwayTollSticker: { expiryDate: car.documentValidity?.highwayTollSticker?.expiryDate || '' },
            technicalInspection: { expiryDate: car.documentValidity?.technicalInspection?.expiryDate || '' },
            emissionInspection: { expiryDate: car.documentValidity?.emissionInspection?.expiryDate || '' }
          },
          pricing: {
            dailyRate: car.pricing?.dailyRate || car.dailyRate || 0,
            deposit: car.pricing?.deposit || car.deposit || 0,
            rates: {
              '1day': car.pricing?.rates?.['1day'] || '',
              '2-3days': car.pricing?.rates?.['2-3days'] || '',
              '4-10days': car.pricing?.rates?.['4-10days'] || '',
              '11-17days': car.pricing?.rates?.['11-17days'] || '',
              '18-24days': car.pricing?.rates?.['18-24days'] || '',
              '30plus': 'dohoda - volať/písať mail'
            }
          },
          mileageLimits: {
            dailyLimit: car.mileageLimits?.dailyLimit ?? -1,
            excessKmPrice: car.mileageLimits?.excessKmPrice || 0.25
          },
          description: car.description || '',
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
          equipment: car.equipment || [],
          badges: car.badges || [],
          features: car.features || [],
          statistics: {
            totalBookings: car.statistics?.totalBookings || car.totalBookings || 0,
            totalRevenue: car.statistics?.totalRevenue || car.totalRevenue || 0,
            totalRentalDays: car.statistics?.totalRentalDays || 0,
            averageDailyRate: car.statistics?.averageDailyRate || 0,
            nextReservation: car.statistics?.nextReservation || null,
            lastReservation: car.statistics?.lastReservation || null
          },
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
      console.log(`🚗 Car dialog opened in ${mode} mode.`)
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
          if (key === 'location' || key === 'maintenance' || key === 'insurance' || key === 'mileage' || 
              key === 'engine' || key === 'fuelConsumption' || key === 'pricing' || 
              key === 'documentValidity' || key === 'mileageLimits') {
            // Handle nested objects
            Object.keys(formData[key]).forEach(nestedKey => {
              if (key === 'location' && nestedKey === 'address') {
                // Handle nested address object
                Object.keys(formData[key][nestedKey]).forEach(addressKey => {
                  formDataToSend.append(`${key}[${nestedKey}][${addressKey}]`, formData[key][nestedKey][addressKey]);
                });
              } else if (key === 'pricing' && nestedKey === 'rates') {
                // Handle pricing rates nested object
                Object.keys(formData[key][nestedKey]).forEach(rateKey => {
                  formDataToSend.append(`${key}[${nestedKey}][${rateKey}]`, formData[key][nestedKey][rateKey]);
                });
              } else if (key === 'documentValidity') {
                // Handle documentValidity nested objects
                Object.keys(formData[key][nestedKey]).forEach(docKey => {
                  formDataToSend.append(`${key}[${nestedKey}][${docKey}]`, formData[key][nestedKey][docKey]);
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
          formDataToSend.append('id', selectedCar._id); // Add ID to FormData
          
          Object.keys(formData).forEach(key => {
            if (key === 'location' || key === 'maintenance' || key === 'insurance' || key === 'mileage' || 
                key === 'engine' || key === 'fuelConsumption' || key === 'pricing' || 
                key === 'documentValidity' || key === 'mileageLimits') {
              // Handle nested objects
              Object.keys(formData[key]).forEach(nestedKey => {
                if (key === 'location' && nestedKey === 'address') {
                  // Handle nested address object
                  Object.keys(formData[key][nestedKey]).forEach(addressKey => {
                    formDataToSend.append(`${key}[${nestedKey}][${addressKey}]`, formData[key][nestedKey][addressKey]);
                  });
                } else if (key === 'pricing' && nestedKey === 'rates') {
                  // Handle pricing rates nested object
                  Object.keys(formData[key][nestedKey]).forEach(rateKey => {
                    formDataToSend.append(`${key}[${nestedKey}][${rateKey}]`, formData[key][nestedKey][rateKey]);
                  });
                } else if (key === 'documentValidity') {
                  // Handle documentValidity nested objects
                  Object.keys(formData[key][nestedKey]).forEach(docKey => {
                    formDataToSend.append(`${key}[${nestedKey}][${docKey}]`, formData[key][nestedKey][docKey]);
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
          // Regular update without images - use FormData for consistency
          const formDataToSend = new FormData();
          formDataToSend.append('id', selectedCar._id); // Add ID to FormData
          
          Object.keys(formData).forEach(key => {
            if (key === 'location' || key === 'maintenance' || key === 'insurance' || key === 'mileage' || 
                key === 'engine' || key === 'fuelConsumption' || key === 'pricing' || 
                key === 'documentValidity' || key === 'mileageLimits') {
              // Handle nested objects
              Object.keys(formData[key]).forEach(nestedKey => {
                if (key === 'location' && nestedKey === 'address') {
                  // Handle nested address object
                  Object.keys(formData[key][nestedKey]).forEach(addressKey => {
                    formDataToSend.append(`${key}[${nestedKey}][${addressKey}]`, formData[key][nestedKey][addressKey]);
                  });
                } else if (key === 'pricing' && nestedKey === 'rates') {
                  // Handle pricing rates nested object
                  Object.keys(formData[key][nestedKey]).forEach(rateKey => {
                    formDataToSend.append(`${key}[${nestedKey}][${rateKey}]`, formData[key][nestedKey][rateKey]);
                  });
                } else if (key === 'documentValidity') {
                  // Handle documentValidity nested objects
                  Object.keys(formData[key][nestedKey]).forEach(docKey => {
                    formDataToSend.append(`${key}[${nestedKey}][${docKey}]`, formData[key][nestedKey][docKey]);
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
          
          const result = await updateCar(formDataToSend).unwrap();
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
          sx={{ 
            borderRadius: 2,
            alignSelf: { xs: 'flex-start', sm: 'auto' },
            mt: { xs: 1, sm: 0 }
          }}
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
        
        <DialogContent sx={{ minWidth: '900px', minHeight: '600px' }}>
          <EnhancedCarForm
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            dialogMode={dialogMode}
            onImageChange={handleImageChange}
            onImageRemove={removeImage}
            selectedImages={selectedImages}
            imagePreviewUrls={imagePreviewUrls}
          />
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