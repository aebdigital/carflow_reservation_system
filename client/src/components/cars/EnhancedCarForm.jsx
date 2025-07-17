import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
  Button,
  IconButton,
  FormControlLabel,
  Checkbox,
  Switch,
  InputAdornment,
  FormHelperText,
  Alert,
  Divider,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Camera as CameraIcon,
  Star as StarIcon,
  LocalOffer as TagIcon
} from '@mui/icons-material';
import DamageModal from './DamageModal';

// Enhanced car form with comprehensive features
const EnhancedCarForm = ({ 
  formData, 
  setFormData, 
  formErrors, 
  dialogMode = 'create',
  onImageChange,
  onImageRemove,
  selectedImages = [],
  imagePreviewUrls = [],
  onDeleteExistingImage,
  onShowNotification
}) => {
  // Reduce logging frequency to prevent performance issues
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  if (renderCount.current % 10 === 1) { // Log only every 10th render
    console.log('🚗 [FORM] EnhancedCarForm rendered', renderCount.current);
    console.log('🚗 [FORM] dialogMode:', dialogMode);
    console.log('🚗 [FORM] selectedImages prop:', selectedImages.length);
    console.log('🚗 [FORM] imagePreviewUrls prop:', imagePreviewUrls.length);
    console.log('🚗 [FORM] imagePreviewUrls data:', imagePreviewUrls);
  }

  const [tabValue, setTabValue] = useState(0);
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [selectedDamage, setSelectedDamage] = useState(null);
  const [damageModalMode, setDamageModalMode] = useState('add');
  const [editingEquipmentIndex, setEditingEquipmentIndex] = useState(null);
  const [equipmentIconFile, setEquipmentIconFile] = useState(null);
  const [equipmentIconPreview, setEquipmentIconPreview] = useState(null);

  // Add ref for file input
  const fileInputRef = useRef(null);
  const equipmentIconInputRef = useRef(null);

  // Enhanced options with new categories
  const categoryOptions = [
    { value: 'economy', label: 'Ekonomická trieda' },
    { value: 'compact', label: 'Kompaktné vozidlá' },
    { value: 'midsize', label: 'Stredná trieda' },
    { value: 'fullsize', label: 'Vyššia trieda' },
    { value: 'luxury', label: 'Luxusné vozidlá' },
    { value: 'suv', label: 'SUV' },
    { value: 'minivan', label: 'Viacmiestne vozidlá' },
    { value: 'utility', label: 'Úžitkové vozidlá' },
    { value: 'caravan', label: 'Karavany' },
    { value: 'motorcycle', label: 'Motorky' },
    { value: 'sports', label: 'Športové autá' },
    { value: 'electric', label: 'Elektromobily' }
  ];

  const fuelTypeOptions = [
    { value: 'gasoline', label: 'Benzín' },
    { value: 'diesel', label: 'Diesel' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'electric', label: 'Elektro' },
    { value: 'lpg', label: 'Plyn (LPG)' }
  ];

  const drivetrainOptions = [
    { value: 'front', label: 'Predný pohon' },
    { value: 'rear', label: 'Zadný pohon' },
    { value: 'awd', label: 'Pohon všetkých kolies' },
    { value: '4wd', label: '4x4' }
  ];

  const transmissionOptions = [
    { value: 'manual', label: 'Manuálna' },
    { value: 'automatic', label: 'Automatická' },
    { value: 'cvt', label: 'CVT' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Aktívne', color: 'success' },
    { value: 'unavailable', label: 'Nedostupné', color: 'warning' },
    { value: 'archived', label: 'Archivované', color: 'error' }
  ];

  // Handle form field changes - memoized to prevent re-renders
  const handleChange = useCallback((field, value, nestedField = null) => {
    if (nestedField) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  }, []); // Remove setFormData dependency - use functional updates instead

  // Handle deeply nested changes - memoized to prevent re-renders
  const handleNestedChange = useCallback((path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const updated = { ...prev };
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) current[key] = {};
        current[key] = { ...current[key] };
        current = current[key];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  }, []); // Remove setFormData dependency

  // Tab panel component - memoized to prevent re-renders
  const TabPanel = useCallback(({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`car-form-tabpanel-${index}`}
      aria-labelledby={`car-form-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  ), []);

  // Memoize the tab change handler
  const memoizedHandleTabChange = useCallback((e, newValue) => {
    console.log('🚗 [FORM] Tab changed to:', newValue);
    setTabValue(newValue);
  }, []);

  // Memoize the image change wrapper
  const memoizedImageChangeHandler = useCallback((e) => {
    console.log('🖼️ [FORM] Memoized image change handler called');
    console.log('🖼️ [FORM] Input onChange triggered');
    console.log('🖼️ [FORM] Event:', e);
    console.log('🖼️ [FORM] Event target:', e.target);
    console.log('🖼️ [FORM] Files from event:', e.target.files?.length || 0);
    console.log('🖼️ [FORM] Files array:', Array.from(e.target.files || []));
    
    if (e.target.files && e.target.files.length > 0) {
      console.log('🖼️ [FORM] Files detected, calling onImageChange');
      if (onImageChange) {
        console.log('🖼️ [FORM] Calling onImageChange function');
        onImageChange(e);
        // Auto-switch to photo tab when images are uploaded
        console.log('🖼️ [FORM] Auto-switching to photo tab');
        setTimeout(() => {
          setTabValue(3); // Index 3 is "Fotodokumentácia"
        }, 100); // Small delay to ensure state is updated
      } else {
        console.error('🖼️ [FORM] onImageChange function not provided!');
      }
    } else {
      console.log('🖼️ [FORM] No files selected or files is empty');
    }
    
    // Reset input value to allow selecting same files again
    e.target.value = '';
  }, [onImageChange]);

  // Memoize the image remove wrapper  
  const memoizedImageRemoveHandler = useCallback((index) => {
    console.log('🖼️ [FORM] Memoized image remove handler called for index:', index);
    if (onImageRemove) {
      onImageRemove(index);
    }
  }, [onImageRemove]);

  // Equipment management handlers
  const handleEditEquipment = useCallback((equipment, index) => {
    setEditingEquipmentIndex(index);
    handleChange('customEquipmentName', equipment.name);
    
    // If it's a file-based icon, we can't edit it directly
    // If it's emoji or text, put it in the icon field
    if (equipment.icon && !equipment.icon.startsWith('data:') && !equipment.icon.startsWith('http')) {
      handleChange('customEquipmentIcon', equipment.icon);
    } else {
      handleChange('customEquipmentIcon', '');
      setEquipmentIconFile(null);
      setEquipmentIconPreview(equipment.icon || null);
    }
  }, [handleChange]);

  const handleEquipmentIconChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('svg') && !file.type.includes('png')) {
        if (onShowNotification) {
          onShowNotification('Iba SVG a PNG súbory sú podporované', 'error');
        }
        return;
      }
      
      // Check file size (max 1MB)
      if (file.size > 1024 * 1024) {
        if (onShowNotification) {
          onShowNotification('Súbor je príliš veľký. Maximálna veľkosť je 1MB', 'error');
        }
        return;
      }

      setEquipmentIconFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setEquipmentIconPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAddOrUpdateEquipment = useCallback(() => {
    const name = formData.customEquipmentName?.trim();
    
    if (!name) {
      if (onShowNotification) {
        onShowNotification('Názov výbavy je povinný', 'error');
      }
      return;
    }

    const icon = equipmentIconFile ? equipmentIconPreview : (formData.customEquipmentIcon?.trim() || '🔧');
    
    const equipmentItem = {
      name: name,
      icon: icon,
      category: 'custom',
      iconType: equipmentIconFile ? 'file' : 'emoji'
    };

    const currentEquipment = formData.equipment || [];
    
    if (editingEquipmentIndex !== null) {
      // Update existing equipment
      const newEquipment = [...currentEquipment];
      newEquipment[editingEquipmentIndex] = equipmentItem;
      handleChange('equipment', newEquipment);
      setEditingEquipmentIndex(null);
    } else {
      // Add new equipment
      handleChange('equipment', [...currentEquipment, equipmentItem]);
    }
    
    // Reset form
    handleChange('customEquipmentName', '');
    handleChange('customEquipmentIcon', '');
    setEquipmentIconFile(null);
    setEquipmentIconPreview(null);
    
    // Reset file input
    if (equipmentIconInputRef.current) {
      equipmentIconInputRef.current.value = '';
    }
  }, [formData.customEquipmentName, formData.customEquipmentIcon, equipmentIconFile, equipmentIconPreview, formData.equipment, editingEquipmentIndex, handleChange]);

  const handleCancelEquipmentEdit = useCallback(() => {
    setEditingEquipmentIndex(null);
    handleChange('customEquipmentName', '');
    handleChange('customEquipmentIcon', '');
    setEquipmentIconFile(null);
    setEquipmentIconPreview(null);
    
    if (equipmentIconInputRef.current) {
      equipmentIconInputRef.current.value = '';
    }
  }, [handleChange]);

  // Damage management handlers
  const handleAddDamage = () => {
    setSelectedDamage(null);
    setDamageModalMode('add');
    setDamageModalOpen(true);
  };

  const handleEditDamage = (damage, index) => {
    setSelectedDamage({ ...damage, index });
    setDamageModalMode('edit');
    setDamageModalOpen(true);
  };

  const handleDeleteDamage = useCallback((index) => {
    setFormData(prev => ({ 
      ...prev, 
      damages: (prev.damages || []).filter((_, i) => i !== index)
    }));
  }, []); // Remove setFormData dependency

  const handleDamageSubmit = useCallback((damageData) => {
    setFormData(prev => {
      const currentDamages = prev.damages || [];
      
      if (damageModalMode === 'add') {
        // Add new damage
        const newDamage = {
          ...damageData,
          reportedDate: new Date().toISOString(),
          // reportedBy will be set by the backend
        };
        return { 
          ...prev, 
          damages: [...currentDamages, newDamage] 
        };
      } else if (damageModalMode === 'edit' && selectedDamage) {
        // Update existing damage
        const updatedDamages = [...currentDamages];
        updatedDamages[selectedDamage.index] = {
          ...updatedDamages[selectedDamage.index],
          ...damageData
        };
        return { 
          ...prev, 
          damages: updatedDamages 
        };
      }
      
      return prev;
    });
    
    setDamageModalOpen(false);
    setSelectedDamage(null);
  }, [damageModalMode, selectedDamage]); // Keep only necessary dependencies

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'minor': return '#4caf50';
      case 'moderate': return '#ff9800';
      case 'major': return '#f44336';
      default: return '#757575';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'minor': return 'Menšie';
      case 'moderate': return 'Stredné';
      case 'major': return 'Vážne';
      default: return severity;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs 
        value={tabValue} 
        onChange={memoizedHandleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="Identifikácia" />
        <Tab label="Technické údaje" />
        <Tab label="Stav vozidla" />
        <Tab 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>Fotodokumentácia</span>
              {imagePreviewUrls && imagePreviewUrls.length > 0 && (
                <Badge badgeContent={imagePreviewUrls.length} color="primary" sx={{ ml: 1 }} />
              )}
            </Box>
          }
        />
        <Tab label="Štatistiky" />
        <Tab label="Cenník a služby" />
        <Tab label="Výbava a značky" />
      </Tabs>

      {/* Tab 1: Vehicle Identification */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Interné ID sa automaticky vygeneruje (napr. AUTO_001, AUTO_002...)
            </Alert>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Značka"
              value={formData.brand || ''}
              onChange={(e) => handleChange('brand', e.target.value)}
              disabled={dialogMode === 'view'}
              error={!!formErrors.brand}
              helperText={formErrors.brand}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Model"
              value={formData.model || ''}
              onChange={(e) => handleChange('model', e.target.value)}
              disabled={dialogMode === 'view'}
              error={!!formErrors.model}
              helperText={formErrors.model}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Rok výroby"
              type="number"
              value={formData.year || new Date().getFullYear()}
              onChange={(e) => handleChange('year', parseInt(e.target.value))}
              disabled={dialogMode === 'view'}
              error={!!formErrors.year}
              helperText={formErrors.year}
              inputProps={{ min: 1990, max: new Date().getFullYear() + 1 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="EČV / ŠPZ"
              value={formData.registrationNumber || ''}
              onChange={(e) => handleChange('registrationNumber', e.target.value.toUpperCase())}
              disabled={dialogMode === 'view'}
              error={!!formErrors.registrationNumber}
              helperText={formErrors.registrationNumber}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Farba"
              value={formData.color || ''}
              onChange={(e) => handleChange('color', e.target.value)}
              disabled={dialogMode === 'view'}
              error={!!formErrors.color}
              helperText={formErrors.color}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="VIN číslo"
              value={formData.vin || ''}
              onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
              disabled={dialogMode === 'view'}
              error={!!formErrors.vin}
              helperText={formErrors.vin || "17 znakov - viditeľné iba v admine"}
              inputProps={{ maxLength: 17 }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth error={!!formErrors.category}>
              <InputLabel>Zaradenie vozidla</InputLabel>
              <Select
                value={formData.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                disabled={dialogMode === 'view'}
                label="Zaradenie vozidla"
              >
                {categoryOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.category && <FormHelperText>{formErrors.category}</FormHelperText>}
            </FormControl>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Technical Data */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Palivo a motor</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!formErrors.fuelType}>
              <InputLabel>Palivo</InputLabel>
              <Select
                value={formData.fuelType || ''}
                onChange={(e) => handleChange('fuelType', e.target.value)}
                disabled={dialogMode === 'view'}
                label="Palivo"
              >
                {fuelTypeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.fuelType && <FormHelperText>{formErrors.fuelType}</FormHelperText>}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Pohon</InputLabel>
              <Select
                value={formData.drivetrain || 'front'}
                onChange={(e) => handleChange('drivetrain', e.target.value)}
                disabled={dialogMode === 'view'}
                label="Pohon"
              >
                {drivetrainOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Motor</Typography>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Objem (cm³)"
              type="number"
              value={formData.engine?.displacement || ''}
              onChange={(e) => handleNestedChange('engine.displacement', parseInt(e.target.value))}
              disabled={dialogMode === 'view'}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Výkon (kW)"
              type="number"
              value={formData.engine?.power || ''}
              onChange={(e) => handleNestedChange('engine.power', parseInt(e.target.value))}
              disabled={dialogMode === 'view'}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Krútiaci moment (Nm)"
              type="number"
              value={formData.engine?.torque || ''}
              onChange={(e) => handleNestedChange('engine.torque', parseInt(e.target.value))}
              disabled={dialogMode === 'view'}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Počet valcov"
              type="number"
              value={formData.engine?.cylinders || ''}
              onChange={(e) => handleNestedChange('engine.cylinders', parseInt(e.target.value))}
              disabled={dialogMode === 'view'}
              inputProps={{ min: 1, max: 16 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Základné parametre</Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth error={!!formErrors.transmission}>
              <InputLabel>Prevodovka</InputLabel>
              <Select
                value={formData.transmission || ''}
                onChange={(e) => handleChange('transmission', e.target.value)}
                disabled={dialogMode === 'view'}
                label="Prevodovka"
              >
                {transmissionOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.transmission && <FormHelperText>{formErrors.transmission}</FormHelperText>}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Počet miest"
              type="number"
              value={formData.seats || 5}
              onChange={(e) => handleChange('seats', parseInt(e.target.value))}
              disabled={dialogMode === 'view'}
              inputProps={{ min: 1, max: 9 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Počet dverí"
              type="number"
              value={formData.doors || 4}
              onChange={(e) => handleChange('doors', parseInt(e.target.value))}
              disabled={dialogMode === 'view'}
              inputProps={{ min: 2, max: 5 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Objem kufra (l)"
              type="number"
              value={formData.trunkVolume || ''}
              onChange={(e) => handleChange('trunkVolume', parseInt(e.target.value))}
              disabled={dialogMode === 'view'}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Spotreba paliva</Typography>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Mesto (l/100km)"
              type="number"
              step="0.1"
              value={formData.fuelConsumption?.city || ''}
              onChange={(e) => handleNestedChange('fuelConsumption.city', parseFloat(e.target.value))}
              disabled={dialogMode === 'view'}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Diaľnica (l/100km)"
              type="number"
              step="0.1"
              value={formData.fuelConsumption?.highway || ''}
              onChange={(e) => handleNestedChange('fuelConsumption.highway', parseFloat(e.target.value))}
              disabled={dialogMode === 'view'}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Kombinovaná (l/100km)"
              type="number"
              step="0.1"
              value={formData.fuelConsumption?.combined || ''}
              onChange={(e) => handleNestedChange('fuelConsumption.combined', parseFloat(e.target.value))}
              disabled={dialogMode === 'view'}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="CO₂ emisie (g/km)"
              type="number"
              value={formData.fuelConsumption?.co2Emissions || ''}
              onChange={(e) => handleNestedChange('fuelConsumption.co2Emissions', parseInt(e.target.value))}
              disabled={dialogMode === 'view'}
            />
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 3: Vehicle Status */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Stav vozidla</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Stav</InputLabel>
              <Select
                value={formData.status || 'active'}
                onChange={(e) => handleChange('status', e.target.value)}
                disabled={dialogMode === 'view'}
                label="Stav"
              >
                {statusOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    <Chip
                      label={option.label}
                      color={option.color}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Aktuálne kilometre"
              type="number"
              value={formData.mileage?.current || 0}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                const mileageValue = isNaN(value) || value < 0 ? 0 : value;
                handleNestedChange('mileage.current', mileageValue);
              }}
              disabled={dialogMode === 'view'}
              InputProps={{
                endAdornment: <InputAdornment position="end">km</InputAdornment>,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Platnosť dokumentov</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Systém automaticky upozorní 30 dní pred expirovaním
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Platnosť diaľničnej známky"
              type="date"
              value={formData.documentValidity?.highwayTollSticker?.expiryDate?.split('T')[0] || ''}
              onChange={(e) => handleNestedChange('documentValidity.highwayTollSticker.expiryDate', e.target.value)}
              disabled={dialogMode === 'view'}
              InputLabelProps={{ shrink: true }}
              helperText={
                <a href="https://eznamka.sk" target="_blank" rel="noopener noreferrer">
                  Link na eznamka.sk
                </a>
              }
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Platnosť STK"
              type="date"
              value={formData.documentValidity?.technicalInspection?.expiryDate?.split('T')[0] || ''}
              onChange={(e) => handleNestedChange('documentValidity.technicalInspection.expiryDate', e.target.value)}
              disabled={dialogMode === 'view'}
              InputLabelProps={{ shrink: true }}
              helperText={
                <a href="https://www.stkonline.sk/overenie-stk" target="_blank" rel="noopener noreferrer">
                  Overiť STK online
                </a>
              }
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Platnosť EK"
              type="date"
              value={formData.documentValidity?.emissionInspection?.expiryDate?.split('T')[0] || ''}
              onChange={(e) => handleNestedChange('documentValidity.emissionInspection.expiryDate', e.target.value)}
              disabled={dialogMode === 'view'}
              InputLabelProps={{ shrink: true }}
              helperText={
                <a href="https://www.stkonline.sk/overenie-stk" target="_blank" rel="noopener noreferrer">
                  Overiť EK online
                </a>
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Poškodenia</Typography>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {formData.damages && formData.damages.length > 0 ? (
                formData.damages.map((damage, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            {damage.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  backgroundColor: getSeverityColor(damage.severity)
                                }}
                              />
                              <Typography variant="body2" color="text.secondary">
                                {getSeverityLabel(damage.severity)}
                              </Typography>
                            </Box>
                            {damage.location && (
                              <Typography variant="body2" color="text.secondary">
                                Miesto: {damage.location}
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Nahlásené: {new Date(damage.reportedDate).toLocaleDateString('sk-SK')}
                          </Typography>
                          {damage.cost && (
                            <Typography variant="body2" color="text.secondary">
                              Odhadovaná cena: {damage.cost}€
                            </Typography>
                          )}
                          {damage.repaired && damage.repairedDate && (
                            <Typography variant="body2" color="text.secondary">
                              Opravené: {new Date(damage.repairedDate).toLocaleDateString('sk-SK')}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={damage.repaired ? 'Opravené' : 'Neopravené'}
                            color={damage.repaired ? 'success' : 'error'}
                            size="small"
                          />
                          {dialogMode !== 'view' && (
                            <Box>
                              <Tooltip title="Upraviť">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditDamage(damage, index)}
                                  sx={{ ml: 1 }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Zmazať">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteDamage(index)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Typography color="text.secondary">
                  Žiadne poškodenia nezaznamenané
                </Typography>
              )}
              {dialogMode !== 'view' && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddDamage}
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                >
                  Pridať poškodenie
                </Button>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 4: Photo Documentation */}
      <TabPanel value={tabValue} index={3}>
        <Box>
          <Typography variant="h6" gutterBottom>Fotodokumentácia</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Ideálne rozmery: 1200x800px, formát JPG/PNG, maximálne 5MB na obrázok
          </Alert>
          
          {/* Show existing car images in view/edit mode */}
          {dialogMode !== 'create' && formData.images && formData.images.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Existujúce obrázky ({formData.images.length})
              </Typography>
              <Grid container spacing={2}>
                {formData.images.map((image, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <CardContent sx={{ p: 1 }}>
                        <Box sx={{ position: 'relative' }}>
                          <img
                            src={image.urls?.thumbnail || image.url}
                            alt={image.description || `Obrázok ${index + 1}`}
                            style={{ 
                              width: '100%', 
                              height: '120px', 
                              objectFit: 'cover',
                              borderRadius: 4
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          {/* Fallback when image fails to load */}
                          <Box 
                            sx={{ 
                              width: '100%', 
                              height: '120px', 
                              backgroundColor: 'grey.100',
                              borderRadius: 1,
                              display: 'none',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px dashed',
                              borderColor: 'grey.300'
                            }}
                          >
                            <CameraIcon sx={{ fontSize: 40, color: 'grey.500', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary" align="center">
                              Obrázok sa nepodarilo načítať
                            </Typography>
                          </Box>
                          
                          {image.isPrimary && (
                            <Chip
                              label="Primárny"
                              color="primary"
                              size="small"
                              sx={{ position: 'absolute', bottom: 4, left: 4 }}
                            />
                          )}
                          
                          {dialogMode === 'edit' && (
                            <IconButton
                              sx={{ 
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' }
                              }}
                              size="small"
                              onClick={() => onDeleteExistingImage(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          {dialogMode !== 'view' && (
            <Box sx={{ mb: 3, p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CameraIcon />}
                fullWidth
                sx={{ mb: 2, py: 2 }}
                color="primary"
                onClick={(e) => {
                  console.log('🖼️ [FORM] Upload button clicked');
                  console.log('🖼️ [FORM] Event target:', e.target);
                  console.log('🖼️ [FORM] File input ref:', fileInputRef.current);
                  // Prevent default to avoid double-triggering
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Manually trigger file input if needed
                  if (fileInputRef.current) {
                    console.log('🖼️ [FORM] Manually triggering file input click');
                    try {
                      fileInputRef.current.click();
                    } catch (error) {
                      console.error('🖼️ [FORM] Error triggering file input:', error);
                    }
                  } else {
                    console.error('🖼️ [FORM] File input ref not available');
                  }
                }}
              >
                {dialogMode === 'edit' ? 'Pridať ďalšie obrázky' : 'Nahrať obrázky'}
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={memoizedImageChangeHandler}
                  onClick={(e) => {
                    console.log('🖼️ [FORM] File input clicked directly');
                    console.log('🖼️ [FORM] Input element:', e.target);
                    e.stopPropagation();
                  }}
                  onFocus={() => console.log('🖼️ [FORM] File input focused')}
                  onBlur={() => console.log('🖼️ [FORM] File input blurred')}
                />
              </Button>
              <Typography variant="body2" color="text.secondary" align="center">
                Maximálne 10 obrázkov na vozidlo
              </Typography>
              <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
                Podporované formáty: JPG, PNG, WEBP, GIF
              </Typography>
            </Box>
          )}

          {/* New Image Previews (for uploads) */}
          {imagePreviewUrls && imagePreviewUrls.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Nové obrázky na nahranie ({imagePreviewUrls.length})
              </Typography>
              <Grid container spacing={2}>
                {imagePreviewUrls.map((previewData, index) => {
                  console.log(`🖼️ [FORM] Rendering preview ${index + 1}:`, previewData);
                  return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ position: 'relative' }}>
                          {/* Show actual image preview */}
                          {previewData && previewData.url ? (
                            <img
                              src={previewData.url}
                              alt={previewData.name || `Obrázok ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '120px',
                                objectFit: 'cover',
                                borderRadius: 4
                              }}
                              onError={(e) => {
                                console.log('Image preview failed to load:', previewData.name);
                                // Fallback to placeholder if image fails
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          {/* Fallback placeholder */}
                          <Box 
                            sx={{ 
                              width: '100%', 
                              height: '120px', 
                              backgroundColor: 'grey.100',
                              borderRadius: 1,
                              display: previewData && previewData.url ? 'none' : 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px dashed',
                              borderColor: 'grey.300'
                            }}
                          >
                            <CameraIcon sx={{ fontSize: 40, color: 'grey.500', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary" align="center">
                              {typeof previewData === 'object' ? previewData.name : `Obrázok ${index + 1}`}
                            </Typography>
                            {typeof previewData === 'object' && (
                              <Typography variant="caption" color="text.secondary" align="center">
                                {(previewData.size / 1024 / 1024).toFixed(2)} MB
                              </Typography>
                            )}
                          </Box>
                          {dialogMode !== 'view' && (
                            <IconButton
                              sx={{ 
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' }
                              }}
                              size="small"
                              onClick={() => memoizedImageRemoveHandler(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                          {index === 0 && (
                            <Chip
                              label="Primárny"
                              color="primary"
                              size="small"
                              sx={{ position: 'absolute', bottom: 4, left: 4 }}
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
          
          {/* Show message when no images at all */}
          {(!imagePreviewUrls || imagePreviewUrls.length === 0) && 
           (dialogMode === 'create' || !formData.images || formData.images.length === 0) && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CameraIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Zatiaľ neboli pridané žiadne obrázky
              </Typography>
              {dialogMode !== 'view' && (
                <Typography variant="body2" color="text.secondary">
                  Kliknite na tlačidlo vyššie pre pridanie obrázkov
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </TabPanel>

      {/* Tab 5: Statistics */}
      <TabPanel value={tabValue} index={4}>
        <Box>
          <Typography variant="h6" gutterBottom>Štatistiky vozidla</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Rezervácie
                  </Typography>
                  <Typography variant="h4" gutterBottom>
                    {formData.statistics?.totalBookings || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Celkový počet rezervácií
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Tržby
                  </Typography>
                  <Typography variant="h4" gutterBottom>
                    {formData.statistics?.totalRevenue || 0}€
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Celkové tržby
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Dni prenájmu
                  </Typography>
                  <Typography variant="h4" gutterBottom>
                    {formData.statistics?.totalRentalDays || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Celkový počet dní v prenájme
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Priemerná sadzba
                  </Typography>
                  <Typography variant="h4" gutterBottom>
                    {formData.statistics?.averageDailyRate || 0}€
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Priemerná denná sadzba
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {formData.statistics?.nextReservation && (
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Ďalšia rezervácia</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>
                      Dátum: {new Date(formData.statistics.nextReservation.date).toLocaleDateString('sk-SK')}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}

            {formData.statistics?.lastReservation && (
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Posledná rezervácia</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>
                      Dátum: {new Date(formData.statistics.lastReservation.date).toLocaleDateString('sk-SK')}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}
          </Grid>
        </Box>
      </TabPanel>

      {/* Tab 6: Pricing & Services */}
      <TabPanel value={tabValue} index={5}>
        <Box>
          <Typography variant="h6" gutterBottom>Cenník a služby</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Základné cenníky</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Denná sadzba"
                type="number"
                value={formData.pricing?.dailyRate || ''}
                onChange={(e) => handleNestedChange('pricing.dailyRate', parseFloat(e.target.value))}
                disabled={dialogMode === 'view'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Depozit"
                type="number"
                value={formData.pricing?.deposit || ''}
                onChange={(e) => handleNestedChange('pricing.deposit', parseFloat(e.target.value))}
                disabled={dialogMode === 'view'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Časové sadzby</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="1 deň"
                type="number"
                value={formData.pricing?.rates?.['1day'] || ''}
                onChange={(e) => handleNestedChange('pricing.rates.1day', parseFloat(e.target.value))}
                disabled={dialogMode === 'view'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="2-3 dni"
                type="number"
                value={formData.pricing?.rates?.['2-3days'] || ''}
                onChange={(e) => handleNestedChange('pricing.rates.2-3days', parseFloat(e.target.value))}
                disabled={dialogMode === 'view'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€/deň</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="4-10 dní"
                type="number"
                value={formData.pricing?.rates?.['4-10days'] || ''}
                onChange={(e) => handleNestedChange('pricing.rates.4-10days', parseFloat(e.target.value))}
                disabled={dialogMode === 'view'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€/deň</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="11-17 dní"
                type="number"
                value={formData.pricing?.rates?.['11-17days'] || ''}
                onChange={(e) => handleNestedChange('pricing.rates.11-17days', parseFloat(e.target.value))}
                disabled={dialogMode === 'view'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€/deň</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="18-24 dní"
                type="number"
                value={formData.pricing?.rates?.['18-24days'] || ''}
                onChange={(e) => handleNestedChange('pricing.rates.18-24days', parseFloat(e.target.value))}
                disabled={dialogMode === 'view'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€/deň</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="30+ dní"
                value="dohoda - volať/písať mail"
                disabled
                helperText="Pre dlhodobé prenájmy"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Kilometrové limity</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Denný kilometrový limit"
                type="number"
                value={formData.mileageLimits?.dailyLimit === -1 ? '' : formData.mileageLimits?.dailyLimit || ''}
                onChange={(e) => handleNestedChange('mileageLimits.dailyLimit', e.target.value === '' ? -1 : parseInt(e.target.value))}
                disabled={dialogMode === 'view'}
                placeholder="Neobmedzené"
                helperText="-1 alebo prázdne = neobmedzené"
                InputProps={{
                  endAdornment: <InputAdornment position="end">km/deň</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cena za nadlimitné km"
                type="number"
                step="0.01"
                value={formData.mileageLimits?.excessKmPrice || ''}
                onChange={(e) => handleNestedChange('mileageLimits.excessKmPrice', parseFloat(e.target.value))}
                disabled={dialogMode === 'view'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€/km</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </TabPanel>

      {/* Tab 7: Equipment & Badges */}
      <TabPanel value={tabValue} index={6}>
        <Box>
          <Typography variant="h6" gutterBottom>Výbava a značky</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Výbava vozidla</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Označte dostupnú výbavu pre toto vozidlo alebo pridajte vlastnú
              </Typography>
              
              {/* Show selected equipment as chips */}
              {formData.equipment && formData.equipment.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Vybraná výbava ({formData.equipment.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {formData.equipment.map((item, index) => (
                      <Chip
                        key={index}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {item.iconType === 'file' ? (
                              <img 
                                src={item.icon} 
                                alt="" 
                                style={{ width: 16, height: 16, objectFit: 'contain' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'inline';
                                }}
                              />
                            ) : (
                              <span>{item.icon}</span>
                            )}
                            <span style={{ display: 'none' }}>🔧</span>
                            <span>{item.name}</span>
                            {item.category === 'custom' && dialogMode !== 'view' && (
                              <EditIcon 
                                sx={{ 
                                  fontSize: 14, 
                                  ml: 0.5, 
                                  cursor: 'pointer',
                                  '&:hover': { color: 'primary.main' }
                                }} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditEquipment(item, index);
                                }}
                              />
                            )}
                          </Box>
                        }
                        onDelete={dialogMode !== 'view' ? () => {
                          const newEquipment = formData.equipment.filter((_, i) => i !== index);
                          handleChange('equipment', newEquipment);
                        } : undefined}
                        deleteIcon={<DeleteIcon />}
                        color="primary"
                        variant="outlined"
                        sx={{
                          cursor: item.category === 'custom' && dialogMode !== 'view' ? 'pointer' : 'default',
                          '&:hover': item.category === 'custom' && dialogMode !== 'view' ? {
                            backgroundColor: 'primary.50'
                          } : {}
                        }}
                        onClick={item.category === 'custom' && dialogMode !== 'view' ? () => {
                          handleEditEquipment(item, index);
                        } : undefined}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Add custom equipment */}
              {dialogMode !== 'view' && (
                <Box sx={{ mb: 3, p: 2, border: '1px dashed', borderColor: 'grey.300', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {editingEquipmentIndex !== null ? 'Upraviť výbavu' : 'Pridať vlastnú výbavu'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'end', mb: 2 }}>
                    <TextField
                      label="Názov výbavy"
                      variant="outlined"
                      size="small"
                      value={formData.customEquipmentName || ''}
                      onChange={(e) => handleChange('customEquipmentName', e.target.value)}
                      placeholder="napr. Detské sedačky"
                      sx={{ flexGrow: 1 }}
                    />
                    <TextField
                      label="Emoji ikona (voliteľné)"
                      variant="outlined"
                      size="small"
                      value={formData.customEquipmentIcon || ''}
                      onChange={(e) => handleChange('customEquipmentIcon', e.target.value)}
                      placeholder="🔧"
                      inputProps={{ maxLength: 2 }}
                      sx={{ width: 120 }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CameraIcon />}
                      onClick={() => equipmentIconInputRef.current?.click()}
                    >
                      SVG/PNG
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={editingEquipmentIndex !== null ? <EditIcon /> : <AddIcon />}
                      onClick={handleAddOrUpdateEquipment}
                      disabled={!formData.customEquipmentName?.trim()}
                    >
                      {editingEquipmentIndex !== null ? 'Uložiť úpravu' : 'Pridať'}
                    </Button>
                    {editingEquipmentIndex !== null && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleCancelEquipmentEdit}
                      >
                        Zrušiť
                      </Button>
                    )}
                  </Box>
                  
                  {/* Icon preview */}
                  {(equipmentIconPreview || formData.customEquipmentIcon) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Náhľad ikony:
                      </Typography>
                      {equipmentIconPreview && equipmentIconPreview.startsWith('data:') ? (
                        <img 
                          src={equipmentIconPreview} 
                          alt="Icon preview" 
                          style={{ width: 20, height: 20, objectFit: 'contain' }}
                        />
                      ) : (
                        <span>{formData.customEquipmentIcon || '🔧'}</span>
                      )}
                    </Box>
                  )}
                  
                  {/* Hidden file input */}
                  <input
                    ref={equipmentIconInputRef}
                    type="file"
                    hidden
                    accept=".svg,.png,image/svg+xml,image/png"
                    onChange={handleEquipmentIconChange}
                  />
                  
                  <Typography variant="caption" color="text.secondary" display="block">
                    Podporované formáty ikon: SVG, PNG (max 1MB) alebo emoji
                  </Typography>
                </Box>
              )}
              
              {/* Predefined equipment checkboxes */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Štandardná výbava
                </Typography>
                <Grid container spacing={1}>
                  {[
                    { key: 'airConditioning', label: 'Klimatizácia', icon: '❄️' },
                    { key: 'gps', label: 'GPS navigácia', icon: '🗺️' },
                    { key: 'bluetooth', label: 'Bluetooth', icon: '📱' },
                    { key: 'heatedSeats', label: 'Vyhrievané sedadlá', icon: '🔥' },
                    { key: 'sunroof', label: 'Strešné okno', icon: '☀️' },
                    { key: 'leatherSeats', label: 'Kožené sedadlá', icon: '🪑' },
                    { key: 'backupCamera', label: 'Cúvacia kamera', icon: '📹' },
                    { key: 'cruiseControl', label: 'Tempomat', icon: '🎯' },
                    { key: 'usbPorts', label: 'USB porty', icon: '🔌' },
                    { key: 'wifi', label: 'WiFi hotspot', icon: '📶' },
                    { key: 'parkingSensors', label: 'Parkovacie senzory', icon: '📡' },
                    { key: 'keylessEntry', label: 'Bezklúčový vstup', icon: '🔑' },
                    { key: 'electronicWindows', label: 'Elektrické okná', icon: '🪟' },
                    { key: 'radioCD', label: 'Rádio/CD prehrávač', icon: '📻' },
                    { key: 'airBags', label: 'Airbags', icon: '💺' },
                    { key: 'abs', label: 'ABS brzdový systém', icon: '🛡️' },
                  ].map(equipment => (
                    <Grid item xs={12} sm={6} md={4} key={equipment.key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.equipment?.some(eq => eq.name === equipment.label) || false}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              const newEquipment = formData.equipment || [];
                              
                              if (isChecked) {
                                handleChange('equipment', [
                                  ...newEquipment,
                                  {
                                    name: equipment.label,
                                    icon: equipment.icon,
                                    category: 'standard'
                                  }
                                ]);
                              } else {
                                handleChange('equipment', 
                                  newEquipment.filter(eq => eq.name !== equipment.label)
                                );
                              }
                            }}
                            disabled={dialogMode === 'view'}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{equipment.icon}</span>
                            <span>{equipment.label}</span>
                          </Box>
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Značky a štítky</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Pridajte pútavé značky pre marketing vozidla
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                {formData.badges && formData.badges.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {formData.badges.map((badge, index) => (
                      <Chip
                        key={index}
                        label={badge.text}
                        style={{
                          backgroundColor: badge.style?.backgroundColor || '#ff4444',
                          color: badge.style?.textColor || '#ffffff'
                        }}
                        onDelete={dialogMode !== 'view' ? () => {
                          const newBadges = formData.badges.filter((_, i) => i !== index);
                          handleChange('badges', newBadges);
                        } : undefined}
                        deleteIcon={<DeleteIcon />}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Žiadne značky nepridané
                  </Typography>
                )}
                
                {dialogMode !== 'view' && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const newBadge = {
                        text: 'NOVINKA',
                        type: 'corner',
                        style: {
                          backgroundColor: '#ff4444',
                          textColor: '#ffffff',
                          position: 'top-right'
                        },
                        isActive: true
                      };
                      const newBadges = [...(formData.badges || []), newBadge];
                      handleChange('badges', newBadges);
                    }}
                    size="small"
                  >
                    Pridať značku
                  </Button>
                )}
              </Box>

              {/* Predefined badge examples */}
              {dialogMode !== 'view' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Rýchle pridanie:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {[
                      { text: 'NOVINKA', color: '#4caf50' },
                      { text: 'AKCIA', color: '#ff9800' },
                      { text: 'TOP PONUKA', color: '#2196f3' },
                      { text: 'LUXUS', color: '#9c27b0' },
                      { text: 'ECO', color: '#8bc34a' },
                    ].map(badge => (
                      <Button
                        key={badge.text}
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          const newBadge = {
                            text: badge.text,
                            type: 'corner',
                            style: {
                              backgroundColor: badge.color,
                              textColor: '#ffffff',
                              position: 'top-right'
                            },
                            isActive: true
                          };
                          const existingBadges = formData.badges || [];
                          const badgeExists = existingBadges.some(b => b.text === badge.text);
                          
                          if (!badgeExists) {
                            handleChange('badges', [...existingBadges, newBadge]);
                          }
                        }}
                        sx={{ 
                          borderColor: badge.color,
                          color: badge.color,
                          '&:hover': { backgroundColor: badge.color, color: 'white' }
                        }}
                      >
                        {badge.text}
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      </TabPanel>

      {/* Damage Modal */}
      <DamageModal
        open={damageModalOpen}
        onClose={() => setDamageModalOpen(false)}
        onSubmit={handleDamageSubmit}
        damage={selectedDamage}
        mode={damageModalMode}
      />
    </Box>
  );
};

export default memo(EnhancedCarForm); 