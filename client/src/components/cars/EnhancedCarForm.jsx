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
  Badge,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Camera as CameraIcon,
  Star as StarIcon,
  LocalOffer as TagIcon,
  DragIndicator as DragIcon,
  Refresh as RefreshIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import DamageModal from './DamageModal';
import { useGetCarQuery, useGetGlobalEquipmentQuery } from '../../store/store';

// Enhanced car form with comprehensive features
const EnhancedCarForm = ({
  formData,
  setFormData,
  formErrors,
  dialogMode = 'create',
  carId,
  onImageChange,
  onImageRemove,
  selectedImages = [],
  imagePreviewUrls = [],
  setImagePreviewUrls,
  onDeleteExistingImage,
  onReorderImages,
  onShowNotification,
  user
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

  // Brand management state (LeRent only)
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [brandIcon, setBrandIcon] = useState(null);
  const [brandIconPreview, setBrandIconPreview] = useState(null);
  const [customBrands, setCustomBrands] = useState(() => {
    // Load custom brands from localStorage
    const saved = localStorage.getItem('lerent_custom_brands');
    return saved ? JSON.parse(saved) : [];
  });

  // Add ref for file input
  const fileInputRef = useRef(null);
  const equipmentIconInputRef = useRef(null);
  const brandIconInputRef = useRef(null);

  // Get real-time car data from RTK Query for edit mode
  const { data: carData, isLoading, isError, error } = useGetCarQuery(carId, {
    skip: !carId || dialogMode === 'create'
  });

  // Get global equipment for this tenant
  const { data: globalEquipment = [], isLoading: isLoadingEquipment, refetch: refetchGlobalEquipment } = useGetGlobalEquipmentQuery();

  console.log('🔍 [QUERY] useGetCarQuery status:');
  console.log('🔍 [QUERY] carId:', carId);
  console.log('🔍 [QUERY] dialogMode:', dialogMode);
  console.log('🔍 [QUERY] skip condition:', !carId || dialogMode === 'create');
  console.log('🔍 [QUERY] isLoading:', isLoading);
  console.log('🔍 [QUERY] isError:', isError);
  console.log('🔍 [QUERY] error:', error);
  console.log('🔍 [QUERY] carData exists:', !!carData);
  console.log('🔍 [QUERY] carData.images exists:', !!carData?.images);
  console.log('🔍 [QUERY] carData.data.images exists:', !!carData?.data?.images);
  console.log('🔍 [QUERY] carData.images length:', carData?.images?.length);
  console.log('🔍 [QUERY] carData.data.images length:', carData?.data?.images?.length);
  console.log('🔍 [QUERY] carData full object:', carData);
  console.log('🔍 [QUERY] carData keys:', carData ? Object.keys(carData) : 'no carData');

  // Combine existing and new images with proper ordering and primary handling
  const getCombinedImages = useCallback(() => {
    console.log('📷 [COMBINED] getCombinedImages called');
    console.log('📷 [COMBINED] Dialog mode:', dialogMode);
    console.log('📷 [COMBINED] carData?.data?.images (RTK Query):', carData?.data?.images?.map(img => ({ id: img._id, order: img.order })));
    console.log('📷 [COMBINED] imagePreviewUrls length:', imagePreviewUrls.length);

    // In edit mode, ALWAYS use RTK Query cache as source of truth for existing images
    // This ensures reordered images from backend are immediately reflected
    // Only use formData.images in create mode
    const existingImages = (dialogMode === 'edit' && carData?.data?.images)
      ? carData.data.images
      : (dialogMode === 'create' && formData.images && formData.images.length > 0)
        ? formData.images
        : [];
    console.log('📷 [COMBINED] Using existing images:', existingImages.map(img => ({ id: img._id, order: img.order })));

    const newImages = imagePreviewUrls.map((previewData, index) => ({
      _id: `new-${index}`,
      url: previewData.url || previewData,
      description: `Nový obrázok ${index + 1}`,
      isPrimary: false,
      order: existingImages.length + index,
      isNew: true
    }));

    // Combine all images and ensure first image is primary
    const allImages = [...existingImages, ...newImages];
    const result = allImages.map((image, index) => ({
      ...image,
      order: index,
      isPrimary: index === 0
    }));

    console.log('📷 [COMBINED] Final combined images:', result.map(img => ({ id: img._id, order: img.order, isNew: img.isNew })));
    return result;
  }, [dialogMode, carData?.data?.images, formData.images, imagePreviewUrls]);

  // Handle drag and drop for image reordering
  const handleImageDragEnd = useCallback(async (result) => {
    console.log('🎯 [DRAG] =================== DRAG END HANDLER CALLED ===================');
    console.log('🎯 [DRAG] Full result object:', result);

    const { destination, source } = result;

    console.log('🎯 [DRAG] Drag end triggered');
    console.log('🎯 [DRAG] Source:', source);
    console.log('🎯 [DRAG] Destination:', destination);
    console.log('🎯 [DRAG] Source index:', source?.index, 'Destination index:', destination?.index);
    console.log('🎯 [DRAG] Dialog mode:', dialogMode);
    console.log('🎯 [DRAG] Car ID:', carId);

    // Check if dropped outside the list or in the same position
    if (!destination || destination.index === source.index) {
      console.log('🎯 [DRAG] EARLY RETURN - No destination or same position');
      console.log('🎯 [DRAG] destination is null/undefined:', !destination);
      console.log('🎯 [DRAG] Same index:', destination?.index === source?.index);
      return;
    }

    // Get combined images and reorder them
    const combinedImages = getCombinedImages();
    console.log('🎯 [DRAG] Combined images before reorder:', combinedImages.map(img => ({ id: img._id, order: img.order, isNew: img.isNew })));

    const newImages = [...combinedImages];
    const [removed] = newImages.splice(source.index, 1);
    newImages.splice(destination.index, 0, removed);

    console.log('🎯 [DRAG] Moved image:', removed._id, 'from', source.index, 'to', destination.index);

    // Update order property and set primary image (first image is always primary)
    const reorderedImages = newImages.map((image, index) => ({
      ...image,
      order: index,
      isPrimary: index === 0 // First image is always primary
    }));

    console.log('🎯 [DRAG] Reordered images:', reorderedImages.map(img => ({ id: img._id, order: img.order, isNew: img.isNew })));

    // Split back into existing and new images
    const existingImages = reorderedImages.filter(img => !img.isNew);
    const newlyAddedImages = reorderedImages.filter(img => img.isNew);
    console.log('🎯 [DRAG] Existing images to reorder:', existingImages.map(img => ({ id: img._id, order: img.order })));
    console.log('🎯 [DRAG] New images to reorder:', newlyAddedImages.map(img => ({ id: img._id, order: img.order })));

    // Update imagePreviewUrls to reflect new order for new images
    // We need to find the corresponding preview objects for the new images
    const reorderedPreviewUrls = newlyAddedImages.map(newImg => {
      // Find the original preview object in imagePreviewUrls
      // The _id for new images is `new-${index}` where index is the original position
      const originalIndex = parseInt(newImg._id.replace('new-', ''));
      return imagePreviewUrls[originalIndex];
    }).filter(Boolean); // Remove any undefined entries

    console.log('🎯 [DRAG] Reordered preview URLs:', reorderedPreviewUrls);
    console.log('🎯 [DRAG] Setting imagePreviewUrls to:', reorderedPreviewUrls.length, 'items');
    setImagePreviewUrls(reorderedPreviewUrls);

    // In create mode, also update formData.images
    if (dialogMode === 'create') {
      console.log('🎯 [DRAG] CREATE mode - updating formData.images');
      setFormData(prev => ({
        ...prev,
        images: existingImages
      }));
    }

    // If we're editing and have existing images, save to backend
    if (dialogMode === 'edit' && existingImages.length > 0 && onReorderImages) {
      try {
        // Extract IDs from reorderedImages, preserving the order and filtering out new images
        // Important: We use reorderedImages (not existingImages) to maintain the correct order
        // where new images might be inserted between existing images
        const imageIds = reorderedImages
          .filter(img => !img.isNew && img._id) // Only existing images with IDs
          .map(img => img._id);

        console.log('🎯 [DRAG] Image IDs to send to backend:', imageIds);
        console.log('🎯 [DRAG] Reordered images structure:', reorderedImages.map((img, idx) => ({
          index: idx,
          id: img._id,
          order: img.order,
          isNew: img.isNew
        })));

        if (imageIds.length > 0) {
          console.log('🎯 [DRAG] Calling onReorderImages...');
          // Call backend but don't await - let it happen in background
          onReorderImages(imageIds).catch(error => {
            console.error('❌ [DRAG] Error reordering images:', error);
            if (onShowNotification) {
              onShowNotification('Chyba pri ukladaní poradia obrázkov.', 'error');
            }
          });

          if (onShowNotification) {
            onShowNotification('Poradie obrázkov bolo zmenené, prvý obrázok je teraz primárny', 'success');
          }
        }
      } catch (error) {
        console.error('❌ [DRAG] Error reordering images:', error);
        if (onShowNotification) {
          onShowNotification('Chyba pri ukladaní poradia obrázkov. Skúste to znova.', 'error');
        }
      }
    } else {
      // For create mode, just show local success
      console.log('🎯 [DRAG] Create mode - updated local state');
      if (onShowNotification) {
        onShowNotification('Poradie obrázkov bolo zmenené lokálne', 'success');
      }
    }
  }, [getCombinedImages, setFormData, setImagePreviewUrls, onShowNotification, onReorderImages, dialogMode, carId]);

  // Enhanced options with new categories (tenant-specific)
  const isLeRent = user?.email?.toLowerCase() === 'lerent@lerent.sk';

  const categoryOptions = isLeRent ? [
    // LeRent-specific categories
    { value: 'sedan', label: 'Sedan' },
    { value: 'kombi', label: 'Kombi' },
    { value: 'sport', label: 'Sport' },
    { value: 'suv', label: 'SUV' },
    { value: 'premium', label: 'Premium' },
    { value: 'viacmiestne', label: 'Viacmiestne' },
    { value: 'elektro', label: 'Elektro' },
    { value: 'uzitkove', label: 'Úžitkové' }
  ] : [
    // Default categories (for other tenants)
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
    { value: 'awd', label: 'Pohon všetkých kolies' }
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

  // Car brands for LeRent autocomplete dropdown (custom brands only)
  // Normalize custom brands to extract names (handle both string and object formats)
  const customBrandNames = customBrands.map(brand =>
    typeof brand === 'object' && brand.name ? brand.name : brand
  );

  const carBrands = [
    ...customBrandNames,
    '+ Nová značka'  // Special option to add new brand
  ];

  // Helper to get brand icon if available
  const getBrandIcon = useCallback((brandName) => {
    const customBrand = customBrands.find(brand =>
      typeof brand === 'object' ? brand.name === brandName : brand === brandName
    );
    return typeof customBrand === 'object' ? customBrand.icon : null;
  }, [customBrands]);

  // Handle form field changes - memoized to prevent re-renders
  const handleChange = useCallback((field, value, nestedField = null) => {
    if (field === 'badges') {
      console.log('🏷️ [HANDLE CHANGE] Updating badges field');
      console.log('🏷️ [HANDLE CHANGE] New badges value:', JSON.stringify(value, null, 2));
      console.log('🏷️ [HANDLE CHANGE] Value type:', typeof value);
      console.log('🏷️ [HANDLE CHANGE] Value length:', value?.length);
    }
    
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
    
    if (field === 'badges') {
      // Log after state update (in next tick)
      setTimeout(() => {
        console.log('🏷️ [HANDLE CHANGE] Form state updated, checking formData.badges...');
      }, 0);
    }
  }, []);

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
  }, []);

  // Handle adding a new brand (LeRent only)
  // Handle brand icon upload (LeRent only)
  const handleBrandIconChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type - only PNG
      if (!file.type.includes('png')) {
        if (onShowNotification) {
          onShowNotification('Iba PNG súbory sú podporované', 'error');
        }
        return;
      }

      // Check file size (max 500KB for compressed listing card images)
      if (file.size > 512 * 1024) {
        if (onShowNotification) {
          onShowNotification('Súbor je príliš veľký. Maximálna veľkosť je 500KB', 'error');
        }
        return;
      }

      setBrandIcon(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setBrandIconPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, [onShowNotification]);

  const handleAddNewBrand = useCallback(() => {
    if (!newBrandName.trim()) {
      return;
    }

    const brandToAdd = newBrandName.trim();

    // Check if brand already exists
    if (carBrands.includes(brandToAdd)) {
      if (onShowNotification) {
        onShowNotification('Táto značka už existuje', 'warning');
      }
      return;
    }

    // Add to custom brands with icon data
    const brandData = {
      name: brandToAdd,
      icon: brandIconPreview || null // Store base64 icon data or null
    };

    const updatedBrands = [...customBrands, brandData];
    setCustomBrands(updatedBrands);

    // Save to localStorage
    localStorage.setItem('lerent_custom_brands', JSON.stringify(updatedBrands));

    // Set as selected brand
    handleChange('brand', brandToAdd);

    // Close dialog and reset
    setBrandDialogOpen(false);
    setNewBrandName('');
    setBrandIcon(null);
    setBrandIconPreview(null);

    if (onShowNotification) {
      onShowNotification(`Značka "${brandToAdd}" bola pridaná`, 'success');
    }
  }, [newBrandName, brandIconPreview, customBrands, carBrands, handleChange, onShowNotification]);

  // Handle deleting a brand (LeRent only)
  const handleDeleteBrand = useCallback((brandNameToDelete, event) => {
    // Prevent the option from being selected when clicking delete
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Check if brand exists in custom brands (handle both string and object formats)
    const brandExists = customBrands.some(brand =>
      typeof brand === 'object' ? brand.name === brandNameToDelete : brand === brandNameToDelete
    );

    // Only allow deleting custom brands, not preset ones
    if (!brandExists) {
      if (onShowNotification) {
        onShowNotification('Nemôžete vymazať prednastaveú značku', 'warning');
      }
      return;
    }

    // Remove from custom brands (handle both formats)
    const updatedBrands = customBrands.filter(brand =>
      typeof brand === 'object' ? brand.name !== brandNameToDelete : brand !== brandNameToDelete
    );
    setCustomBrands(updatedBrands);

    // Save to localStorage
    localStorage.setItem('lerent_custom_brands', JSON.stringify(updatedBrands));

    // If the deleted brand was selected, clear the selection
    if (formData.brand === brandNameToDelete) {
      handleChange('brand', '');
    }

    if (onShowNotification) {
      onShowNotification(`Značka "${brandNameToDelete}" bola odstránená`, 'success');
    }
  }, [customBrands, formData.brand, handleChange, onShowNotification]);

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
    handleChange('customEquipmentDescription', equipment.description || '');
    
    // Set the current icon as preview for editing
    setEquipmentIconFile(null);
    setEquipmentIconPreview(equipment.icon || null);
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

    const currentEquipment = formData.equipment || [];

    const equipmentItem = {
      name: name,
      description: formData.customEquipmentDescription || '',
      icon: equipmentIconPreview || '', // Icon is optional - use empty string if not provided
      category: 'custom',
      iconType: equipmentIconPreview ? 'file' : 'none', // Set iconType based on whether icon exists
      position: editingEquipmentIndex !== null ? currentEquipment[editingEquipmentIndex]?.position : currentEquipment.length
    };
    
    if (editingEquipmentIndex !== null) {
      // Update existing equipment (keep existing position)
      const newEquipment = [...currentEquipment];
      newEquipment[editingEquipmentIndex] = {
        ...equipmentItem,
        position: newEquipment[editingEquipmentIndex]?.position || editingEquipmentIndex
      };
      handleChange('equipment', newEquipment);
      setEditingEquipmentIndex(null);
    } else {
      // Add new equipment with next position
      const newEquipment = [...currentEquipment, equipmentItem];
      handleChange('equipment', newEquipment);
    }
    
    // Reset form
    handleChange('customEquipmentName', '');
    handleChange('customEquipmentDescription', '');
    setEquipmentIconFile(null);
    setEquipmentIconPreview(null);
    
    // Reset file input
    if (equipmentIconInputRef.current) {
      equipmentIconInputRef.current.value = '';
    }
  }, [formData.customEquipmentName, equipmentIconPreview, formData.equipment, editingEquipmentIndex, handleChange, onShowNotification]);

  const handleCancelEquipmentEdit = useCallback(() => {
    setEditingEquipmentIndex(null);
    handleChange('customEquipmentName', '');
    handleChange('customEquipmentDescription', '');
    setEquipmentIconFile(null);
    setEquipmentIconPreview(null);
    
    if (equipmentIconInputRef.current) {
      equipmentIconInputRef.current.value = '';
    }
  }, [handleChange]);

  // Equipment reorder handler
  const handleEquipmentReorder = useCallback((result) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    if (source.index === destination.index) return;
    
    const currentEquipment = [...(formData.equipment || [])];
    const [removed] = currentEquipment.splice(source.index, 1);
    currentEquipment.splice(destination.index, 0, removed);
    
    // Update positions for all equipment items to maintain order in database
    const reorderedEquipment = currentEquipment.map((item, index) => ({
      ...item,
      position: index
    }));
    
    handleChange('equipment', reorderedEquipment);
  }, [formData.equipment, handleChange]);

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
  }, []);

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
            {isLeRent ? (
              // LeRent: Autocomplete dropdown with ability to add custom brand
              <Autocomplete
                freeSolo
                options={carBrands}
                value={formData.brand || ''}
                onChange={(event, newValue) => {
                  // Check if user selected "Nova značka"
                  if (newValue === '+ Nová značka') {
                    setBrandDialogOpen(true);
                  } else {
                    handleChange('brand', newValue || '');
                    // Also save the brand logo if available
                    const brandLogo = getBrandIcon(newValue);
                    handleChange('brandLogo', brandLogo || '');
                  }
                }}
                onInputChange={(event, newInputValue) => {
                  // Allow typing custom brand (but not the special option)
                  if (event?.type === 'change' && newInputValue !== '+ Nová značka') {
                    handleChange('brand', newInputValue);
                    // Also save the brand logo if available
                    const brandLogo = getBrandIcon(newInputValue);
                    handleChange('brandLogo', brandLogo || '');
                  }
                }}
                disabled={dialogMode === 'view'}
                renderOption={(props, option) => {
                  const brandIcon = getBrandIcon(option);
                  const isCustomBrand = customBrandNames.includes(option);

                  return (
                    <Box
                      component="li"
                      {...props}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        '&:hover .delete-icon': {
                          opacity: 1
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {brandIcon && (
                          <Box
                            component="img"
                            src={brandIcon}
                            alt={option}
                            sx={{
                              width: 24,
                              height: 24,
                              objectFit: 'contain'
                            }}
                          />
                        )}
                        <span>{option}</span>
                      </Box>
                      {/* Show delete icon only for custom brands */}
                      {isCustomBrand && (
                        <IconButton
                          className="delete-icon"
                          size="small"
                          onClick={(e) => handleDeleteBrand(option, e)}
                          sx={{
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            ml: 1,
                            '&:hover': {
                              color: 'error.main'
                            }
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Značka"
                    error={!!formErrors.brand}
                    helperText={formErrors.brand || 'Vyberte zo zoznamu, napíšte vlastnú značku alebo pridajte novú'}
                  />
                )}
              />
            ) : (
              // Other tenants: Regular text field
              <TextField
                fullWidth
                label="Značka"
                value={formData.brand || ''}
                onChange={(e) => handleChange('brand', e.target.value)}
                disabled={dialogMode === 'view'}
                error={!!formErrors.brand}
                helperText={formErrors.brand}
              />
            )}
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

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Popis vozidla (slovensky)"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={dialogMode === 'view'}
              error={!!formErrors.description}
              helperText={formErrors.description || "Max. 1000 znakov - zobrazí sa na verejnej stránke"}
              inputProps={{ maxLength: 1000 }}
              placeholder="Napríklad: Luxusné športové sedan s výnimočným výkonom a komfortom. Ideálne pre náročných vodičov."
            />
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
            <Divider sx={{ my: 3 }} />
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
            <Divider sx={{ my: 3 }} />
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
            <Divider sx={{ my: 3 }} />
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
            <Divider sx={{ my: 3 }} />
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
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom>Poškodenia</Typography>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
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

          {/* Show all images (existing and new) with drag and drop support */}
          {(getCombinedImages().length > 0 || (dialogMode !== 'create' && formData.images && formData.images.length > 0)) && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Obrázky vozidla ({getCombinedImages().length})
                {dialogMode === 'edit' && (
                  <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                    (Presuňte obrázky pre zmenu poradia)
                  </Typography>
                )}
              </Typography>
              <DragDropContext onDragEnd={handleImageDragEnd}>
                <Droppable droppableId="images">
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        backgroundColor: snapshot.isDraggingOver ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                        borderRadius: 1,
                        transition: 'background-color 0.2s ease',
                        border: snapshot.isDraggingOver ? '2px dashed rgba(25, 118, 210, 0.5)' : '2px dashed transparent',
                        p: 1
                      }}
                    >
                      {getCombinedImages().map((image, index) => (
                        <Draggable
                          key={image._id || `image-${index}`}
                          draggableId={image._id || `image-${index}`}
                          index={index}
                          isDragDisabled={dialogMode === 'view' || image.isNew}
                        >
                          {(provided, snapshot) => (
                            <Box
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              sx={{ mb: 2 }}
                            >
                              <Card
                                sx={{
                                  transform: snapshot.isDragging ? 'scale(1.02)' : 'scale(1)',
                                  boxShadow: snapshot.isDragging ? 8 : 2,
                                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                  opacity: snapshot.isDragging ? 0.9 : 1,
                                  backgroundColor: snapshot.isDragging ? 'action.hover' : 'background.paper',
                                  cursor: dialogMode === 'edit' ? 'grab' : 'default',
                                  '&:active': {
                                    cursor: dialogMode === 'edit' ? 'grabbing' : 'default'
                                  },
                                  '&:hover': {
                                    boxShadow: dialogMode === 'edit' ? 3 : 2
                                  }
                                }}
                              >
                                  <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      {/* Drag handle - visible and easy to grab */}
                                      {dialogMode === 'edit' && (
                                        <Box
                                          {...provided.dragHandleProps}
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: 'primary.main',
                                            borderRadius: 1,
                                            p: 1,
                                            cursor: 'grab',
                                            '&:active': { cursor: 'grabbing' },
                                            '&:hover': { backgroundColor: 'primary.dark' },
                                            transition: 'background-color 0.2s',
                                            flexShrink: 0
                                          }}
                                        >
                                          <DragIcon sx={{ color: 'white', fontSize: 24 }} />
                                        </Box>
                                      )}

                                      {/* Order number */}
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          backgroundColor: 'grey.800',
                                          color: 'white',
                                          borderRadius: 1,
                                          minWidth: 40,
                                          height: 40,
                                          fontWeight: 'bold',
                                          fontSize: '1.1rem',
                                          flexShrink: 0
                                        }}
                                      >
                                        {index + 1}
                                      </Box>

                                      {/* Image preview */}
                                      <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                        <img
                                          src={image.urls?.thumbnail || image.url || (typeof image === 'string' ? image : '')}
                                          alt={image.description || `Obrázok ${index + 1}`}
                                          style={{
                                            width: '120px',
                                            height: '80px',
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
                                            width: '120px',
                                            height: '80px',
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
                                          <CameraIcon sx={{ fontSize: 24, color: 'grey.500' }} />
                                        </Box>
                                      </Box>

                                      {/* Info and badges */}
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, flexWrap: 'wrap' }}>
                                        {image.isPrimary && (
                                          <Chip
                                            label="Primárny obrázok"
                                            color="primary"
                                            size="small"
                                          />
                                        )}

                                        {image.isNew && (
                                          <Chip
                                            label="NOVÝ"
                                            color="success"
                                            size="small"
                                            sx={{
                                              backgroundColor: '#4caf50',
                                              color: 'white'
                                            }}
                                          />
                                        )}

                                        {image.description && (
                                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                            {image.description}
                                          </Typography>
                                        )}
                                      </Box>

                                      {/* Delete button */}
                                      {dialogMode === 'edit' && (
                                        <IconButton
                                          color="error"
                                          sx={{
                                            flexShrink: 0,
                                            '&:hover': {
                                              backgroundColor: 'error.light',
                                              color: 'white'
                                            }
                                          }}
                                          onClick={() => {
                                            if (image.isNew) {
                                              // Handle new image deletion
                                              const newImageIndex = getCombinedImages()
                                                .slice(0, index)
                                                .filter(img => img.isNew)
                                                .length;
                                              onImageRemove(newImageIndex);
                                            } else {
                                              // Handle existing image deletion
                                              const existingImageIndex = getCombinedImages()
                                                .slice(0, index)
                                                .filter(img => !img.isNew)
                                                .length;
                                              onDeleteExistingImage(existingImageIndex);
                                            }
                                          }}
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      )}
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Box>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </DragDropContext>
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

          
          {/* Show message when no images at all */}
          {getCombinedImages().length === 0 && (
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
                onChange={(e) => handleNestedChange('pricing.dailyRate', parseInt(e.target.value, 10) || 0)}
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
                onChange={(e) => handleNestedChange('pricing.deposit', parseInt(e.target.value, 10) || 0)}
                disabled={dialogMode === 'view'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>Časové sadzby</Typography>
            </Grid>

            {/* Conditional pricing structure based on tenant */}
            {user?.email?.toLowerCase() === 'nitra-car@nitra-car.sk' ? (
              <>
                {/* Nitra-car: 1 deň */}
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

                {/* Nitra-car: 2-3 dni */}
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

                {/* Nitra-car: 4-9 dni */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="4-9 dní"
                    type="number"
                    value={formData.pricing?.rates?.['4-9days'] || ''}
                    onChange={(e) => handleNestedChange('pricing.rates.4-9days', parseFloat(e.target.value))}
                    disabled={dialogMode === 'view'}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">€/deň</InputAdornment>,
                    }}
                  />
                </Grid>

                {/* Nitra-car: 10-25 dni */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="10-25 dní"
                    type="number"
                    value={formData.pricing?.rates?.['10-25days'] || ''}
                    onChange={(e) => handleNestedChange('pricing.rates.10-25days', parseFloat(e.target.value))}
                    disabled={dialogMode === 'view'}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">€/deň</InputAdornment>,
                    }}
                  />
                </Grid>

                {/* Nitra-car: 26+ dni */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="26+ dní"
                    type="number"
                    value={formData.pricing?.rates?.['26plus'] || ''}
                    onChange={(e) => handleNestedChange('pricing.rates.26plus', parseFloat(e.target.value))}
                    disabled={dialogMode === 'view'}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">€/deň</InputAdornment>,
                    }}
                  />
                </Grid>
              </>
            ) : (
              <>
                {/* Default tenants: 6 pricing tiers */}
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
                    label="25-29 dní"
                    type="number"
                    value={formData.pricing?.rates?.['25-29days'] || ''}
                    onChange={(e) => handleNestedChange('pricing.rates.25-29days', parseFloat(e.target.value))}
                    disabled={dialogMode === 'view'}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">€/deň</InputAdornment>,
                    }}
                  />
                </Grid>
              </>
            )}

            {/* Conditional rendering based on user email */}
            {user?.email?.toLowerCase() === 'lerent@lerent.sk' ? (
              <>
                {/* LeRent: 30-60 days (number input) */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="30-60 dní"
                    type="number"
                    value={formData.pricing?.rates?.['30-60days'] || ''}
                    onChange={(e) => handleNestedChange('pricing.rates.30-60days', parseFloat(e.target.value))}
                    disabled={dialogMode === 'view'}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">€/deň</InputAdornment>,
                    }}
                  />
                </Grid>

                {/* LeRent: 60+ days (contact message) */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="60+ dní"
                    value="dohoda - volať/písať mail"
                    disabled
                    helperText="Pre veľmi dlhodobé prenájmy"
                  />
                </Grid>
              </>
            ) : (
              /* Other tenants: 30+ days (contact message) */
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="30+ dní"
                  value="dohoda - volať/písať mail"
                  disabled
                  helperText="Pre dlhodobé prenájmy"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 3 }} />
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
                Vyberte výbavu pre toto vozidlo z globálneho zoznamu. Nová výbava pridaná do ľubovoľného vozidla sa automaticky sprístupní pre všetky ostatné vozidlá.
              </Typography>
              
              {/* Show selected equipment as chips */}
              {formData.equipment && formData.equipment.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ mb: 0 }}>
                      Vybraná výbava ({formData.equipment.length})
                    </Typography>
                    {dialogMode !== 'view' && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        - ťahajte pre zmenu poradia, dvojklik pre úpravu vlastnej výbavy
                      </Typography>
                    )}
                  </Box>
                  <DragDropContext onDragEnd={handleEquipmentReorder}>
                    <Droppable droppableId="selected-equipment" direction="horizontal">
                      {(provided, snapshot) => (
                        <Box
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          sx={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: 1, 
                            mb: 2,
                            p: 1,
                            borderRadius: 1,
                            backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                            transition: 'background-color 0.2s ease',
                            minHeight: 60
                          }}
                        >
                          {formData.equipment.map((item, index) => {
                            // Create stable unique key based on item properties
                            const stableKey = `equipment-${item.name}-${item.category}-${item.description?.slice(0, 10) || 'nodesc'}-${index}`;
                            return (
                            <Draggable 
                              key={stableKey} 
                              draggableId={stableKey}
                              index={index}
                              isDragDisabled={dialogMode === 'view'}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging 
                                      ? provided.draggableProps.style?.transform 
                                      : 'none'
                                  }}
                                >
                                  <Tooltip 
                                    title={item.description ? `${item.name}: ${item.description}` : item.name}
                                    arrow
                                    placement="top"
                                  >
                                    <Box
                                      sx={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        opacity: snapshot.isDragging ? 0.8 : 1,
                                        transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                                        '&:hover .equipment-delete-button': {
                                          opacity: dialogMode !== 'view' ? 1 : 0,
                                          visibility: dialogMode !== 'view' ? 'visible' : 'hidden'
                                        }
                                      }}
                                    >
                          <Chip
                            {...provided.dragHandleProps}
                            label={
                              <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'flex-start', 
                                gap: 0.5,
                                py: 0.5
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {/* Drag Handle Icon */}
                                  {dialogMode !== 'view' && (
                                    <DragIcon 
                                      sx={{ 
                                        fontSize: 16, 
                                        color: 'text.secondary',
                                        cursor: 'grab',
                                        '&:hover': { color: 'primary.main' },
                                        '&:active': { cursor: 'grabbing' }
                                      }} 
                                    />
                                  )}
                                  <img 
                                    src={item.icon} 
                                    alt="" 
                                    style={{ width: 24, height: 24, objectFit: 'contain' }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'inline';
                                    }}
                                  />
                                  <span style={{ display: 'none', fontSize: '20px' }}>🔧</span>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {item.name}
                                  </Typography>
                                  {item.category === 'custom' && dialogMode !== 'view' && (
                                    <EditIcon 
                                      sx={{ 
                                        fontSize: 16, 
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
                                {item.description && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'text.secondary',
                                      fontSize: '0.75rem',
                                      lineHeight: 1.2,
                                      maxWidth: '200px'
                                    }}
                                  >
                                    {item.description}
                                  </Typography>
                                )}
                              </Box>
                            }
                            color="primary"
                            variant="outlined"
                            size="medium"
                            sx={{
                            height: 'auto',
                            minHeight: item.description ? '64px' : '48px',
                            cursor: dialogMode !== 'view' ? 'grab' : 'default',
                            '& .MuiChip-label': {
                              padding: '8px 12px',
                              whiteSpace: 'normal'
                            },
                            '&:hover': dialogMode !== 'view' ? {
                              backgroundColor: 'primary.50',
                              transform: 'translateY(-1px)',
                              boxShadow: 2
                            } : {},
                            '&:active': dialogMode !== 'view' ? {
                              cursor: 'grabbing'
                            } : {}
                          }}
                          onDoubleClick={item.category === 'custom' && dialogMode !== 'view' ? () => {
                            handleEditEquipment(item, index);
                          } : undefined}
                        />
                        {/* Hover Delete Button */}
                        {dialogMode !== 'view' && (
                          <IconButton
                            className="equipment-delete-button"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newEquipment = formData.equipment.filter((_, i) => i !== index);
                              handleChange('equipment', newEquipment);
                            }}
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              width: 24,
                              height: 24,
                              backgroundColor: 'error.main',
                              color: 'white',
                              opacity: 0,
                              visibility: 'hidden',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                backgroundColor: 'error.dark',
                                transform: 'scale(1.1)'
                              },
                              boxShadow: 1,
                              border: '2px solid white'
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                        </Box>
                      </Tooltip>
                                </div>
                              )}
                            </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </Box>
                      )}
                    </Droppable>
                  </DragDropContext>
                </Box>
              )}

              {/* Global Equipment Selection */}
              {dialogMode !== 'view' && globalEquipment.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2">
                      🌐 Globálna výbava dostupná pre všetky vozidlá ({globalEquipment.length})
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => refetchGlobalEquipment()}
                      disabled={isLoadingEquipment}
                      title="Obnoviť globálnu výbavu"
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Kliknite na výbavu pre pridanie/odobratie z tohto vozidla. Výbava je zdieľaná medzi všetkými vozidlami.
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {globalEquipment.map((equipment, index) => {
                      const isSelected = formData.equipment?.some(item => item.name === equipment.name);
                      return (
                        <Tooltip 
                          key={index}
                          title={equipment.description ? `${equipment.name}: ${equipment.description}` : equipment.name}
                          arrow
                          placement="top"
                        >
                          <Chip
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <img 
                                  src={equipment.icon} 
                                  alt="" 
                                  style={{ width: 20, height: 20, objectFit: 'contain' }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'inline';
                                  }}
                                />
                                <span style={{ display: 'none', fontSize: '16px' }}>🔧</span>
                                <Typography variant="body2">
                                  {equipment.name}
                                </Typography>
                              </Box>
                            }
                            onClick={() => {
                              if (isSelected) {
                                // Remove from selected equipment
                                const newEquipment = formData.equipment.filter(item => item.name !== equipment.name);
                                // Reassign positions to maintain order
                                const reorderedEquipment = newEquipment.map((item, index) => ({
                                  ...item,
                                  position: index
                                }));
                                handleChange('equipment', reorderedEquipment);
                              } else {
                                // Add to selected equipment with next position
                                const currentEquipment = formData.equipment || [];
                                const nextPosition = currentEquipment.length;
                                const equipmentToAdd = {
                                  ...equipment,
                                  position: nextPosition
                                };
                                const newEquipment = [...currentEquipment, equipmentToAdd];
                                handleChange('equipment', newEquipment);
                              }
                            }}
                            color={isSelected ? "primary" : "default"}
                            variant={isSelected ? "filled" : "outlined"}
                            size="medium"
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: isSelected ? 'primary.dark' : 'action.hover'
                              }
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {isLoadingEquipment && (
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Načítavam dostupnú výbavu...
                  </Typography>
                </Box>
              )}

              {/* Add custom equipment */}
              {dialogMode !== 'view' && (
                <Box sx={{ mb: 3, p: 2, border: '1px dashed', borderColor: 'grey.300', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {editingEquipmentIndex !== null ? 'Upraviť výbavu' : '➕ Pridať novú výbavu (bude dostupná pre všetky vozidlá)'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'start' }}>
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
                        label="Popis výbavy"
                        variant="outlined"
                        size="small"
                        multiline
                        rows={2}
                        value={formData.customEquipmentDescription || ''}
                        onChange={(e) => handleChange('customEquipmentDescription', e.target.value)}
                        placeholder="Popis výbavy"
                        sx={{ flexGrow: 1 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CameraIcon />}
                        onClick={() => equipmentIconInputRef.current?.click()}
                      >
                        Nahrať ikonu
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
                  </Box>
                  
                  {/* Icon preview */}
                  {equipmentIconPreview && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Náhľad ikony:
                      </Typography>
                      <img 
                        src={equipmentIconPreview} 
                        alt="Icon preview" 
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                      />
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
                    Podporované formáty ikon: SVG, PNG (max 1MB). Ikona je voliteľná.
                  </Typography>
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>Značky a štítky</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Pridajte pútavé značky pre marketing vozidla
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                {formData.badges && formData.badges.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                    {formData.badges.map((badge, index) => (
                      <Chip
                        key={index}
                        label={
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            py: 0.5
                          }}>
                            <TagIcon sx={{ fontSize: 18 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              {badge.text}
                            </Typography>
                          </Box>
                        }
                        style={{
                          backgroundColor: badge.style?.backgroundColor || '#ff4444',
                          color: badge.style?.textColor || '#ffffff',
                          minHeight: '40px'
                        }}
                        onDelete={dialogMode !== 'view' ? () => {
                          const newBadges = formData.badges.filter((_, i) => i !== index);
                          handleChange('badges', newBadges);
                        } : undefined}
                        deleteIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
                        size="medium"
                        sx={{
                          height: 'auto',
                          '& .MuiChip-label': {
                            padding: '6px 12px'
                          }
                        }}
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
                      console.log('🏷️ [BADGE ADD] Adding new badge:', newBadge);
                      console.log('🏷️ [BADGE ADD] Current badges before add:', formData.badges);
                      console.log('🏷️ [BADGE ADD] New badges array:', newBadges);
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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    {[
                      { text: 'NOVINKA', color: '#4caf50', icon: '🆕' },
                      { text: 'AKCIA', color: '#ff9800', icon: '🔥' },
                      { text: 'TOP PONUKA', color: '#2196f3', icon: '⭐' },
                      { text: 'LUXUS', color: '#9c27b0', icon: '💎' },
                      { text: 'ECO', color: '#8bc34a', icon: '🌱' },
                    ].map(badge => (
                      <Button
                        key={badge.text}
                        variant="outlined"
                        size="medium"
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
                            console.log('🏷️ [QUICK BADGE] Adding quick badge:', newBadge);
                            console.log('🏷️ [QUICK BADGE] Current badges before add:', existingBadges);
                            const updatedBadges = [...existingBadges, newBadge];
                            console.log('🏷️ [QUICK BADGE] Updated badges array:', updatedBadges);
                            handleChange('badges', updatedBadges);
                          } else {
                            console.log('🏷️ [QUICK BADGE] Badge already exists:', badge.text);
                          }
                        }}
                        startIcon={<span style={{ fontSize: '16px' }}>{badge.icon}</span>}
                        sx={{ 
                          borderColor: badge.color,
                          color: badge.color,
                          minHeight: '40px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          '&:hover': { 
                            backgroundColor: badge.color, 
                            color: 'white',
                            '& .MuiButton-startIcon': {
                              filter: 'brightness(1.2)'
                            }
                          }
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

      {/* Add New Brand Dialog (LeRent only) */}
      {isLeRent && (
        <Dialog
          open={brandDialogOpen}
          onClose={() => {
            setBrandDialogOpen(false);
            setNewBrandName('');
            setBrandIcon(null);
            setBrandIconPreview(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Pridať novú značku</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Názov značky"
              type="text"
              fullWidth
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  handleAddNewBrand();
                }
              }}
              helperText="Zadajte názov novej značky automobilu"
              sx={{ mb: 2 }}
            />

            {/* Brand Icon Upload */}
            <Box sx={{ mb: 2 }}>
              <input
                ref={brandIconInputRef}
                type="file"
                accept="image/png"
                style={{ display: 'none' }}
                onChange={handleBrandIconChange}
              />
              <Button
                variant="outlined"
                startIcon={<ImageIcon />}
                onClick={() => brandIconInputRef.current?.click()}
                fullWidth
              >
                Nahrať ikonu značky (voliteľné)
              </Button>
            </Box>

            {/* Brand Icon Preview */}
            {brandIconPreview && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  component="img"
                  src={brandIconPreview}
                  alt="Náhľad ikony"
                  sx={{
                    width: 60,
                    height: 60,
                    objectFit: 'contain',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    bgcolor: 'background.paper'
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => {
                    setBrandIcon(null);
                    setBrandIconPreview(null);
                    if (brandIconInputRef.current) {
                      brandIconInputRef.current.value = '';
                    }
                  }}
                >
                  Odstrániť
                </Button>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setBrandDialogOpen(false);
                setNewBrandName('');
                setBrandIcon(null);
                setBrandIconPreview(null);
              }}
            >
              Zrušiť
            </Button>
            <Button
              onClick={handleAddNewBrand}
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!newBrandName.trim()}
            >
              Pridať značku
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default memo(EnhancedCarForm); 