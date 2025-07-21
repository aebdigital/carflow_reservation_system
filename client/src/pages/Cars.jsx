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
  Tooltip,
  Snackbar,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
  Search as SearchIcon,
  Clear as ClearIcon
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
    damages: [],
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' // 'success', 'error', 'warning', 'info'
  })
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

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

  // Filter cars based on search query and filters
  const filteredCars = cars.filter(car => {
    // Search query filter
    const matchesSearch = !searchQuery || 
      car.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.category?.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    const matchesStatus = statusFilter === 'all' || car.status === statusFilter

    // Category filter
    const matchesCategory = categoryFilter === 'all' || car.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  // Helper function to show notifications
  const showNotification = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    })
  }

  // Helper function to close notifications
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setSnackbar(prev => ({ ...prev, open: false }))
  }

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

  // Image handling - Fixed to create proper image previews
  const handleImageChange = (event) => {
    console.log('🖼️ [IMAGE CHANGE] Function called');
    const files = Array.from(event.target.files || []);
    console.log('🖼️ [IMAGE CHANGE] Files selected:', files.length);
    
    if (files.length === 0) {
      console.log('🖼️ [IMAGE CHANGE] No files selected, returning');
      return;
    }
    
    // Add to selected images immediately
    setSelectedImages(prev => {
      console.log('🖼️ [IMAGE CHANGE] Previous selected images:', prev.length);
      const newSelection = [...prev, ...files];
      console.log('🖼️ [IMAGE CHANGE] New selected images total:', newSelection.length);
      return newSelection;
    });
    
    // Create proper image previews using URL.createObjectURL
    console.log('🖼️ [IMAGE CHANGE] Creating image previews...');
    const newPreviews = files.map((file, index) => {
      console.log(`🖼️ [IMAGE CHANGE] Creating preview for file ${index + 1}: ${file.name}`);
      try {
        // Create object URL for image preview
        const objectUrl = URL.createObjectURL(file);
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          url: objectUrl
        };
      } catch (error) {
        console.log(`🖼️ [IMAGE CHANGE] Error creating preview for ${file.name}:`, error);
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          url: null
        };
      }
    });
    
    setImagePreviewUrls(prev => {
      const updatedPreviews = [...prev, ...newPreviews];
      console.log('🖼️ [IMAGE CHANGE] Updated preview URLs total:', updatedPreviews.length);
      return updatedPreviews;
    });
    
    console.log('🖼️ [IMAGE CHANGE] Function completed successfully');
  }

  const removeImage = (index) => {
    console.log('🗑️ [REMOVE IMAGE] Removing image at index:', index);
    
    // Clean up object URL to prevent memory leaks
    const previewToRemove = imagePreviewUrls[index];
    if (previewToRemove && typeof previewToRemove === 'object' && previewToRemove.url) {
      console.log('🗑️ [REMOVE IMAGE] Removing preview for:', previewToRemove.name);
      try {
        URL.revokeObjectURL(previewToRemove.url);
        console.log('🗑️ [REMOVE IMAGE] Object URL revoked successfully');
      } catch (error) {
        console.log('🗑️ [REMOVE IMAGE] Error revoking object URL:', error);
      }
    }
    
    setSelectedImages(prev => {
      const updated = prev.filter((_, i) => i !== index);
      console.log('🗑️ [REMOVE IMAGE] Updated selected images:', updated.length);
      return updated;
    });
    setImagePreviewUrls(prev => {
      const updated = prev.filter((_, i) => i !== index);
      console.log('🗑️ [REMOVE IMAGE] Updated preview URLs:', updated.length);
      return updated;
    });
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
      showNotification('Chyba pri mazaní obrázka. Skúste to znova.', 'error')
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
      showNotification('Chyba pri nastavovaní primárneho obrázka. Skúste to znova.', 'error')
    }
  }

  // Form validation
  const validateForm = () => {
    const errors = {}

    // Remove all required field validations - make all fields optional
    // Only keep basic format validations for fields that are provided
    
    if (formData.year && (formData.year < 1990 || formData.year > new Date().getFullYear() + 1)) {
      errors.year = 'Rok musí byť medzi 1990 a ' + (new Date().getFullYear() + 1)
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
      console.log(`🚗 [DIALOG] Opening dialog in ${mode} mode`);
      console.log('🚗 [DIALOG] Car data:', car ? car._id : 'none');
      
      setDialogMode(mode)
      setSelectedCar(car)
      
      if (mode === 'create') {
        console.log('🚗 [DIALOG] CREATE mode - resetting all state');
        setFormData(initialFormState)
        setSelectedImages([])
        setImagePreviewUrls([])
        console.log('🚗 [DIALOG] CREATE mode - state reset complete');
        console.log('🚗 [DIALOG] CREATE mode - selected images:', []);
        console.log('🚗 [DIALOG] CREATE mode - preview URLs:', []);
      } else if (mode === 'edit' && car) {
        console.log('🚗 [DIALOG] EDIT mode - populating form data');
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
          damages: car.damages || [],
          images: car.images || [],
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
        // Reset image state for edit mode (user will add new images separately)
        setSelectedImages([])
        setImagePreviewUrls([])
        console.log('🚗 [DIALOG] EDIT mode - form populated, images reset');
      } else if (mode === 'view' && car) {
        console.log('🚗 [DIALOG] VIEW mode - populating read-only form data');
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
          damages: car.damages || [],
          images: car.images || [],
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
        // Reset image state for view mode too
        setSelectedImages([])
        setImagePreviewUrls([])
        console.log('🚗 [DIALOG] VIEW mode - form populated, images reset');
      }
      
      setOpenDialog(true)
      setFormErrors({})
      console.log(`🚗 [DIALOG] Dialog opened successfully in ${mode} mode`);
    } catch (error) {
      console.error('🚗 [DIALOG] Error opening dialog:', error)
    }
  }

  const handleCloseDialog = () => {
    console.log('🚗 [DIALOG CLOSE] Closing dialog and resetting all state');
    console.log('🚗 [DIALOG CLOSE] Current selected images:', selectedImages.length);
    console.log('🚗 [DIALOG CLOSE] Current preview URLs:', imagePreviewUrls.length);
    
    // Clean up object URLs to prevent memory leaks
    imagePreviewUrls.forEach((preview, index) => {
      if (preview && typeof preview === 'object' && preview.url) {
        try {
          URL.revokeObjectURL(preview.url);
          console.log(`🚗 [DIALOG CLOSE] Revoked object URL for preview ${index + 1}`);
        } catch (error) {
          console.log(`🚗 [DIALOG CLOSE] Error revoking object URL for preview ${index + 1}:`, error);
        }
      }
    });
    
    setOpenDialog(false)
    setSelectedCar(null)
    setFormData(initialFormState)
    setSelectedImages([])
    setImagePreviewUrls([])
    setFormErrors({})
    
    console.log('🚗 [DIALOG CLOSE] State reset complete');
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
    console.log('🚗 [FRONTEND] ======= MILEAGE DEBUG INFO =======');
    console.log('🚗 [FRONTEND] formData.mileage type:', typeof formData.mileage);
    console.log('🚗 [FRONTEND] formData.mileage value:', formData.mileage);
    console.log('🚗 [FRONTEND] formData.mileage.current:', formData.mileage?.current);
    console.log('🚗 [FRONTEND] formData.mileage JSON:', JSON.stringify(formData.mileage, null, 2));
    console.log('🚗 [FRONTEND] =======================================');

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
          } else if (key === 'equipment') {
            // Handle equipment array
            formData[key].forEach(item => {
              formDataToSend.append('equipment[]', item);
            });
          } else if (key === 'badges') {
            // Handle badges array
            formData[key].forEach(badge => {
              formDataToSend.append('badges[]', badge);
            });
          } else if (key === 'damages') {
            // Handle damages array - filter out empty/invalid damages
            const validDamages = formData[key].filter(damage => 
              damage && 
              typeof damage === 'object' && 
              (damage.description || damage.severity || damage.location)
            );
            
            validDamages.forEach((damage, index) => {
              Object.keys(damage).forEach(damageKey => {
                const value = damage[damageKey];
                if (value !== null && value !== undefined && value !== '') {
                  // Convert objects to strings (like Date objects)
                  const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                  formDataToSend.append(`damages[${index}][${damageKey}]`, stringValue);
                }
              });
            });
          } else if (key !== 'images') {
            // Skip images key - it's handled separately below
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
        showNotification('Auto bolo úspešne vytvorené!', 'success');
        
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
            } else if (key === 'equipment') {
              // Handle equipment array
              formData[key].forEach(item => {
                formDataToSend.append('equipment[]', item);
              });
            } else if (key === 'badges') {
              // Handle badges array
              formData[key].forEach(badge => {
                formDataToSend.append('badges[]', badge);
              });
            } else if (key === 'damages') {
              // Handle damages array - filter out empty/invalid damages
              const validDamages = formData[key].filter(damage => 
                damage && 
                typeof damage === 'object' && 
                (damage.description || damage.severity || damage.location)
              );
              
              validDamages.forEach((damage, index) => {
                Object.keys(damage).forEach(damageKey => {
                  const value = damage[damageKey];
                  if (value !== null && value !== undefined && value !== '') {
                    // Convert objects to strings (like Date objects)
                    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    formDataToSend.append(`damages[${index}][${damageKey}]`, stringValue);
                  }
                });
              });
            } else if (key !== 'images') {
              // Skip images key - it's handled separately below
              formDataToSend.append(key, formData[key]);
            }
          });
          
          selectedImages.forEach(image => {
            formDataToSend.append('images', image);
          });
          
          const result = await updateCar(formDataToSend).unwrap();
          console.log('✅ Car updated successfully:', result);
          showNotification('Auto bolo úspešne aktualizované!', 'success');
          
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
            } else if (key === 'equipment') {
              // Handle equipment array
              formData[key].forEach(item => {
                formDataToSend.append('equipment[]', item);
              });
            } else if (key === 'badges') {
              // Handle badges array
              formData[key].forEach(badge => {
                formDataToSend.append('badges[]', badge);
              });
            } else if (key === 'damages') {
              // Handle damages array - filter out empty/invalid damages
              const validDamages = formData[key].filter(damage => 
                damage && 
                typeof damage === 'object' && 
                (damage.description || damage.severity || damage.location)
              );
              
              validDamages.forEach((damage, index) => {
                Object.keys(damage).forEach(damageKey => {
                  const value = damage[damageKey];
                  if (value !== null && value !== undefined && value !== '') {
                    // Convert objects to strings (like Date objects)
                    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    formDataToSend.append(`damages[${index}][${damageKey}]`, stringValue);
                  }
                });
              });
            } else if (key !== 'images') {
              // Skip images key - it's handled separately below
              formDataToSend.append(key, formData[key]);
            }
          });
          
          const result = await updateCar(formDataToSend).unwrap();
          console.log('✅ Car updated successfully:', result);
          showNotification('Auto bolo úspešne aktualizované!', 'success');
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
      showNotification(`Chyba pri ukladaní auta: ${errorMessage}`, 'error');
    }
  };

  const handleDelete = async (carId) => {
    if (window.confirm(t('confirmDelete'))) {
      try {
        await deleteCar(carId).unwrap()
        showNotification('Auto bolo úspešne zmazané!', 'success')
        console.log('Car deleted successfully')
      } catch (error) {
        console.error('Error deleting car:', error)
        const errorMessage = error.data?.message || error.message || 'Neznáma chyba pri mazaní auta'
        showNotification(`Chyba pri mazaní auta: ${errorMessage}`, 'error')
      }
    }
  }

  const renderCarCard = (car) => (
    <Grid item xs={12} sm={6} md={4} lg={4} xl={4} key={car._id}>
      <Card sx={{ 
        height: 400, // Increased height for better photo display
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: 2,
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        }
      }}>
        <CardMedia
          component="img"
          height="200" // Increased image height for much better photo display
          image={getCarImage(car) || '/api/placeholder/400/200'}
          alt={`${car.brand} ${car.model}`}
          sx={{ objectFit: 'cover' }}
        />
        <CardContent sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          p: 1.5, // Increased padding for better spacing
          '&:last-child': { pb: 1.5 } // Consistent padding
        }}>
          {/* Header section - Fixed height */}
          <Box sx={{ height: 45, mb: 0.8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 0.5 }}>
              <Typography 
                variant="body2" 
                component="div" 
                sx={{ 
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '65%',
                  fontSize: '0.95rem'
                }}
              >
                {car.brand} {car.model}
              </Typography>
              <Chip
                label={getStatusText(car.status)}
                size="small"
                color={getStatusColor(car.status)}
                sx={{ fontSize: '0.7rem', height: '20px', px: 0.8 }}
              />
            </Box>
            
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.75rem'
              }}
            >
              {car.year || 'N/A'} • {categoryOptions.find(c => c.value === car.category)?.label || car.category || 'N/A'}
            </Typography>
          </Box>
          
          {/* Features section - Fixed height */}
          <Box sx={{ height: 32, mb: 0.8 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, minWidth: 0 }}>
                <FuelIcon fontSize="small" color="action" sx={{ fontSize: '14px' }} />
                <Typography 
                  variant="caption"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.7rem'
                  }}
                >
                  {fuelTypeOptions.find(f => f.value === car.fuelType)?.label || car.fuelType || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, minWidth: 0 }}>
                <TransmissionIcon fontSize="small" color="action" sx={{ fontSize: '14px' }} />
                <Typography 
                  variant="caption"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.7rem'
                  }}
                >
                  {transmissionOptions.find(t => t.value === car.transmission)?.label || car.transmission || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          {/* Price section - Fixed height */}
          <Box sx={{ height: 30, mb: 1 }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {car.pricing?.dailyRate || car.dailyRate || 0}€/{t('den')}
            </Typography>
          </Box>
          
          {/* Spacer to push buttons to bottom */}
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Action buttons - Fixed at bottom */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: 36 }}>
            <Box>
              <IconButton 
                size="medium" 
                onClick={() => handleOpenDialog('view', car)}
                color="primary"
                sx={{ mr: 0.5, p: 0.6 }}
              >
                <ViewIcon sx={{ fontSize: '22px' }} />
              </IconButton>
              <IconButton 
                size="medium" 
                onClick={() => handleOpenDialog('edit', car)}
                color="primary"
                sx={{ mr: 0.5, p: 0.6 }}
              >
                <EditIcon sx={{ fontSize: '22px' }} />
              </IconButton>
              <IconButton 
                size="medium" 
                onClick={() => handleDelete(car._id)}
                color="error"
                sx={{ p: 0.6 }}
              >
                <DeleteIcon sx={{ fontSize: '22px' }} />
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

      {/* Search and Filter Bar */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Hľadať autá... (značka, model, EČV, kategória)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      edge="end"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Stav</InputLabel>
              <Select
                value={statusFilter}
                label="Stav"
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">Všetky stavy</MenuItem>
                <MenuItem value="active">Aktívne</MenuItem>
                <MenuItem value="unavailable">Nedostupné</MenuItem>
                <MenuItem value="archived">Archivované</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Kategória</InputLabel>
              <Select
                value={categoryFilter}
                label="Kategória"
                onChange={(e) => setCategoryFilter(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">Všetky kategórie</MenuItem>
                {categoryOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {/* Search Results Info */}
        {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' ? (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Zobrazené {filteredCars.length} z {cars.length} áut
            </Typography>
            <Button
              size="small"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setCategoryFilter('all')
              }}
              sx={{ textTransform: 'none' }}
            >
              Vymazať filtre
            </Button>
          </Box>
        ) : null}
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
        {filteredCars.map(renderCarCard)}
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
            onDeleteExistingImage={handleDeleteExistingImage}
            onShowNotification={showNotification}
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

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Cars 