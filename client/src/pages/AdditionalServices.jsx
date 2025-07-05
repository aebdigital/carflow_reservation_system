import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
  InputAdornment,
  Tooltip,
  Avatar,
  Stack,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Extension as ExtensionIcon,
  DriveEta as DriveEtaIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  LocalShipping as DeliveryIcon,
  FamilyRestroom as FamilyIcon,
  Settings as SpecializedIcon,
  DragIndicator as DragIcon,
  PhotoCamera as PhotoIcon,
  Euro as EuroIcon,
  Check as CheckIcon,
  Close as UncheckedIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { t } from '../utils/translations';
import AdditionalServiceForm from '../components/additionalServices/AdditionalServiceForm';

// API endpoints (will be replaced with RTK Query)
const additionalServicesAPI = {
  getAll: async () => {
    const baseUrl = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/additional-services`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  },
  create: async (formData) => {
    const baseUrl = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/additional-services`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    return response.json();
  },
  update: async (id, formData) => {
    const baseUrl = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/additional-services/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    return response.json();
  },
  delete: async (id) => {
    const baseUrl = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/additional-services/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  },
  updateSortOrder: async (services) => {
    const baseUrl = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/additional-services/sort-order`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ services })
    });
    return response.json();
  }
};

function AdditionalServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [dialogMode, setDialogMode] = useState('create');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'driving_comfort',
    pricing: {
      type: 'fixed',
      amount: 0,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: {
        isActive: false,
        startMonth: 1,
        endMonth: 12
      }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: false,
      maxQuantity: 1,
      dependsOn: []
    },
    dynamicPricing: {
      isEnabled: false,
      basePrice: 0,
      pricePerKm: 0,
      minimumPrice: 0,
      maximumPrice: 0,
      useGoogleMapsAPI: false
    },
    color: '#2196f3',
    icon: 'extension',
    isActive: true,
    isPublic: true,
    sortOrder: 0
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Category mapping
  const categoryConfig = {
    driving_comfort: {
      label: 'Jazda a komfort',
      icon: <DriveEtaIcon />,
      color: '#4caf50'
    },
    insurance_assistance: {
      label: 'Poistenie a asistencia',
      icon: <SecurityIcon />,
      color: '#ff9800'
    },
    time_services: {
      label: 'Časové služby',
      icon: <ScheduleIcon />,
      color: '#2196f3'
    },
    delivery_pickup: {
      label: 'Pristavenie/Vyzdvihnutie',
      icon: <DeliveryIcon />,
      color: '#9c27b0'
    },
    family_accessories: {
      label: 'Rodina a doplnky',
      icon: <FamilyIcon />,
      color: '#e91e63'
    },
    specialized: {
      label: 'Špecializované',
      icon: <SpecializedIcon />,
      color: '#607d8b'
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const result = await additionalServicesAPI.getAll();
      if (result.success) {
        setServices(result.data);
      } else {
        setError(result.message || 'Chyba pri načítavaní služieb');
      }
    } catch (err) {
      setError('Chyba pri načítavaní služieb');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, service = null) => {
    setDialogMode(mode);
    setSelectedService(service);
    
    if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        category: 'driving_comfort',
        pricing: {
          type: 'fixed',
          amount: 0,
          currency: 'EUR'
        },
        availability: {
          isGlobal: true,
          vehicleCategories: [],
          excludedVehicles: [],
          seasonal: {
            isActive: false,
            startMonth: 1,
            endMonth: 12
          }
        },
        behavior: {
          isAutoSelected: false,
          isRequired: false,
          requiresApproval: false,
          maxQuantity: 1,
          dependsOn: []
        },
        dynamicPricing: {
          isEnabled: false,
          basePrice: 0,
          pricePerKm: 0,
          minimumPrice: 0,
          maximumPrice: 0,
          useGoogleMapsAPI: false
        },
        color: '#2196f3',
        icon: 'extension',
        isActive: true,
        isPublic: true,
        sortOrder: services.length
      });
    } else if (service) {
      setFormData({
        name: service.name || '',
        description: service.description || '',
        category: service.category || 'driving_comfort',
        pricing: service.pricing || {
          type: 'fixed',
          amount: 0,
          currency: 'EUR'
        },
        availability: service.availability || {
          isGlobal: true,
          vehicleCategories: [],
          excludedVehicles: [],
          seasonal: {
            isActive: false,
            startMonth: 1,
            endMonth: 12
          }
        },
        behavior: service.behavior || {
          isAutoSelected: false,
          isRequired: false,
          requiresApproval: false,
          maxQuantity: 1,
          dependsOn: []
        },
        dynamicPricing: service.dynamicPricing || {
          isEnabled: false,
          basePrice: 0,
          pricePerKm: 0,
          minimumPrice: 0,
          maximumPrice: 0,
          useGoogleMapsAPI: false
        },
        color: service.color || '#2196f3',
        icon: service.icon || 'extension',
        isActive: service.isActive !== undefined ? service.isActive : true,
        isPublic: service.isPublic !== undefined ? service.isPublic : true,
        sortOrder: service.sortOrder || 0
      });
    }
    
    setSelectedImage(null);
    setImagePreview(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedService(null);
    setSelectedImage(null);
    setImagePreview(null);
    setFormData({
      name: '',
      description: '',
      category: 'driving_comfort',
      pricing: {
        type: 'fixed',
        amount: 0,
        currency: 'EUR'
      },
      availability: {
        isGlobal: true,
        vehicleCategories: [],
        excludedVehicles: [],
        seasonal: {
          isActive: false,
          startMonth: 1,
          endMonth: 12
        }
      },
      behavior: {
        isAutoSelected: false,
        isRequired: false,
        requiresApproval: false,
        maxQuantity: 1,
        dependsOn: []
      },
      dynamicPricing: {
        isEnabled: false,
        basePrice: 0,
        pricePerKm: 0,
        minimumPrice: 0,
        maximumPrice: 0,
        useGoogleMapsAPI: false
      },
      color: '#2196f3',
      icon: 'extension',
      isActive: true,
      isPublic: true,
      sortOrder: 0
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      
      // Log form data for debugging
      console.log('🔧 [FRONTEND] Form data being sent:', formData);
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'pricing' || key === 'availability' || key === 'behavior' || key === 'dynamicPricing') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Append image if selected
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }
      
      // Log FormData contents for debugging
      console.log('🔧 [FRONTEND] FormData entries:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`  ${key}:`, value);
      }
      
      let result;
      if (dialogMode === 'create') {
        result = await additionalServicesAPI.create(formDataToSend);
      } else {
        result = await additionalServicesAPI.update(selectedService._id, formDataToSend);
      }
      
      console.log('🔧 [FRONTEND] API result:', result);
      
      if (result.success) {
        await fetchServices();
        handleCloseDialog();
      } else {
        // Show detailed validation errors if available
        if (result.errors && Array.isArray(result.errors)) {
          const errorMessages = result.errors.map(err => `${err.path}: ${err.msg}`).join('\n');
          throw new Error(`Validation failed:\n${errorMessages}`);
        } else {
          throw new Error(result.message || 'Chyba pri ukladaní služby');
        }
      }
    } catch (err) {
      console.error('❌ [FRONTEND] Submit error:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (serviceId) => {
    if (window.confirm('Naozaj chcete vymazať túto službu?')) {
      try {
        const result = await additionalServicesAPI.delete(serviceId);
        if (result.success) {
          await fetchServices();
        } else {
          throw new Error(result.message || 'Chyba pri mazaní služby');
        }
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(filteredServices);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sort order
    const updatedServices = items.map((item, index) => ({
      id: item._id,
      sortOrder: index
    }));

    try {
      await additionalServicesAPI.updateSortOrder(updatedServices);
      await fetchServices();
    } catch (err) {
      setError('Chyba pri aktualizácii poradia');
    }
  };

  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(service => service.category === selectedCategory);

  const renderServiceCard = (service, index) => (
    <Draggable key={service._id} draggableId={service._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1
          }}
        >
          <Card 
            sx={{ 
              mb: 2, 
              display: 'flex',
              backgroundColor: snapshot.isDragging ? '#f5f5f5' : 'white',
              boxShadow: snapshot.isDragging ? 3 : 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
              <div {...provided.dragHandleProps}>
                <DragIcon color="action" />
              </div>
            </Box>
            
            {service.image?.url && (
              <CardMedia
                component="img"
                sx={{ width: 100, height: 100, objectFit: 'cover' }}
                image={service.image.url}
                alt={service.name}
              />
            )}
            
            <CardContent sx={{ flex: '1 0 auto', py: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" component="div">
                    {service.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {service.description}
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip
                      label={categoryConfig[service.category]?.label || service.category}
                      icon={categoryConfig[service.category]?.icon}
                      size="small"
                      sx={{ backgroundColor: categoryConfig[service.category]?.color + '20' }}
                    />
                    <Chip
                      label={`${service.pricing.amount}€`}
                      icon={<EuroIcon />}
                      size="small"
                      color="primary"
                    />
                    {service.behavior.isAutoSelected && (
                      <Chip
                        label="Auto-vybrané"
                        icon={<CheckIcon />}
                        size="small"
                        color="success"
                      />
                    )}
                    {!service.isActive && (
                      <Chip
                        label="Neaktívne"
                        icon={<UncheckedIcon />}
                        size="small"
                        color="error"
                      />
                    )}
                  </Stack>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Zobraziť">
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog('view', service)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Upraviť">
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog('edit', service)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Vymazať">
                    <IconButton 
                      size="small" 
                      onClick={() => handleDelete(service._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Doplnkové služby
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Spravujte doplnkové služby, ktoré sa zobrazia v sekcii "Naše služby" a v procese rezervácie.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
          sx={{ borderRadius: 2 }}
        >
          Pridať službu
        </Button>
      </Box>

      {/* Category Filter */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={selectedCategory}
          onChange={(e, value) => setSelectedCategory(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Všetky" value="all" />
          {Object.entries(categoryConfig).map(([key, config]) => (
            <Tab
              key={key}
              label={config.label}
              value={key}
              icon={config.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* Loading and Error States */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Services List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="services">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {filteredServices.map((service, index) => renderServiceCard(service, index))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Service Dialog */}
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
          {dialogMode === 'create' && 'Pridať službu'}
          {dialogMode === 'edit' && 'Upraviť službu'}
          {dialogMode === 'view' && 'Zobraziť službu'}
        </DialogTitle>
        
        <DialogContent sx={{ minWidth: '600px', minHeight: '500px' }}>
          <AdditionalServiceForm
            formData={formData}
            setFormData={setFormData}
            dialogMode={dialogMode}
            selectedImage={selectedImage}
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            categoryConfig={categoryConfig}
          />
        </DialogContent>
        
        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleCloseDialog}>
            Zrušiť
          </Button>
          {dialogMode !== 'view' && (
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Uložiť'
              )}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdditionalServices; 