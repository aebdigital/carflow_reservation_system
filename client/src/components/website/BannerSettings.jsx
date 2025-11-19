import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Avatar,
  CircularProgress,
  Chip,
  TextField,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Paper,
  Stack,
  Fade,
  Zoom
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CloudUpload as UploadIcon,
  DragIndicator as DragIcon,
  DeleteOutline as RemoveIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Language as LanguageIcon
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import {
  useGetBannersQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useAddBannerImagesMutation,
  useRemoveBannerImageMutation,
  useReorderBannerImagesMutation,
  useGetCarsQuery
} from '../../store/store'
import BannerImageEnglishTranslation from '../admin/BannerImageEnglishTranslation'

const positionOptions = [
  { value: 'hero-section', label: 'Hero sekcia' },
  { value: 'homepage-carousel-1', label: 'HomePage Carousel 1' },
  { value: 'homepage-carousel-2', label: 'HomePage Carousel 2' },
]

// Drag and Drop Image Component
const DraggableImage = ({ image, index, onRemove, onTranslate, onEdit, onDragStart, onDragOver, onDrop, isEditing, isLeRent }) => {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', index.toString())
    if (onDragStart) onDragStart(index)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
    if (onDragOver) onDragOver(index)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (onDrop) onDrop(draggedIndex, index)
  }

  return (
    <Paper
      elevation={isDragOver ? 8 : 2}
      sx={{ 
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        transform: isDragOver ? 'scale(1.05)' : 'scale(1)',
        border: isDragOver ? '2px dashed #1976d2' : '2px solid transparent'
      }}
      draggable={isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isEditing && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 10,
            cursor: 'grab',
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: 1,
            p: 0.5
          }}
        >
          <DragIcon sx={{ color: 'white', fontSize: 16 }} />
        </Box>
      )}
      
      <Box sx={{ position: 'relative' }}>
        <img
          src={image.url}
          alt={image.alt}
          style={{
            width: '100%',
            height: '120px',
            objectFit: 'cover'
          }}
        />
        
        {isEditing && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10,
              display: 'flex',
              gap: 0.5
            }}
          >
            {isLeRent && (
              <Tooltip title="Upraviť nadpis, podnadpis a odkaz">
                <IconButton
                  size="small"
                  onClick={() => onEdit && onEdit(image, index)}
                  sx={{
                    backgroundColor: 'rgba(76, 175, 80, 0.8)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(76, 175, 80, 1)'
                    }
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {!isLeRent && (
              <Tooltip title="English Translation">
                <IconButton
                  size="small"
                  onClick={() => onTranslate && onTranslate(image)}
                  sx={{
                    backgroundColor: 'rgba(25, 118, 210, 0.8)',
                    color: 'white',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 1)'
                    }
                  }}
                >
                  <LanguageIcon fontSize="small" />
                  {(image.altEn || image.titleEn || image.descriptionEn) && (
                    <Box
                      component="span"
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 6,
                        height: 6,
                        bgcolor: '#4caf50',
                        borderRadius: '50%',
                      }}
                    />
                  )}
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              size="small"
              onClick={() => onRemove(image._id)}
              sx={{
                backgroundColor: 'rgba(244, 67, 54, 0.8)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 1)'
                }
              }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
      
      <Box sx={{ p: 1 }}>
        <Typography variant="caption" display="block" sx={{ fontSize: 10 }}>
          Pozícia: {index + 1}
        </Typography>
        {image.title && (
          <Typography variant="caption" display="block" sx={{ fontSize: 10, fontWeight: 500 }}>
            {image.title}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}

export default function BannerSettings() {
  // Get current user to check if LeRent
  const { user } = useSelector((state) => state.auth)
  const isLeRentUser = user?.email === 'lerent@lerent.sk'

  const [banners, setBanners] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create')
  const [selectedBanner, setSelectedBanner] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [alert, setAlert] = useState(null)
  const [translationDialog, setTranslationDialog] = useState({ open: false, image: null, bannerId: null })
  const [imageMetadataDialog, setImageMetadataDialog] = useState({ open: false, image: null, index: null })
  const [formData, setFormData] = useState({
    position: 'hero-section',
    isActive: true,
    sortOrder: 0,
    title: '', // For LeRent user
    subtitle: '', // For LeRent user
  })

  const { data: bannersData, isLoading: bannersLoading, error: bannersError, refetch } = useGetBannersQuery()
  const { data: carsData } = useGetCarsQuery()
  const [createBanner, { isLoading: creating }] = useCreateBannerMutation()
  const [updateBanner, { isLoading: updating }] = useUpdateBannerMutation()
  const [deleteBanner, { isLoading: deleting }] = useDeleteBannerMutation()
  const [addBannerImages] = useAddBannerImagesMutation()
  const [removeBannerImage] = useRemoveBannerImageMutation()
  const [reorderBannerImages] = useReorderBannerImagesMutation()

  useEffect(() => {
    if (bannersData?.data) {
      setBanners(bannersData.data)
    }
  }, [bannersData])

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  const handleOpenDialog = (mode, banner = null) => {
    setDialogMode(mode)
    setSelectedBanner(banner)
    
    if (banner) {
      setFormData({
        position: banner.position || 'hero-section',
        isActive: banner.isActive !== undefined ? banner.isActive : true,
        sortOrder: banner.sortOrder || 0,
        title: banner.title || '',
        subtitle: banner.subtitle || '',
      })
      // Handle both old single image format and new multiple images format
      if (banner.images && banner.images.length > 0) {
        setImagePreviews(banner.images)
      } else if (banner.image || banner.imageUrl) {
        // Backward compatibility for old single image format
        setImagePreviews([{
          url: banner.imageUrl || banner.image?.url,
          alt: banner.image?.alt || 'Banner image',
          _id: 'existing'
        }])
      } else {
        setImagePreviews([])
      }
    } else {
      setFormData({
        position: 'hero-section',
        isActive: true,
        sortOrder: 0,
        title: '',
        subtitle: '',
      })
      setImagePreviews([])
    }
    
    setSelectedFiles([])
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedBanner(null)
    setSelectedFiles([])
    setImagePreviews([])
    setFormData({
      position: 'hero-section',
      isActive: true,
      sortOrder: 0,
    })
  }

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files)
    
    // Check total image limit (existing + new)
    const currentImageCount = imagePreviews.length
    const maxImages = 6
    
    if (currentImageCount + files.length > maxImages) {
      setAlert({ 
        type: 'error', 
        message: `Môžete pridať maximálne ${maxImages - currentImageCount} obrázkov. Celkový limit je ${maxImages} obrázkov na banner.` 
      })
      return
    }
    
    setSelectedFiles(prev => [...prev, ...files])
    
    // Create previews for new files
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newPreview = {
          url: e.target.result,
          alt: `Banner image ${imagePreviews.length + 1}`,
          file: file,
          isNew: true,
          _id: Date.now() + Math.random() // Temporary ID for new images
        }
        setImagePreviews(prev => [...prev, newPreview])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = async (imageId) => {
    const imageToRemove = imagePreviews.find(img => img._id === imageId)

    if (imageToRemove?.isNew) {
      // Remove from local state for new images
      setImagePreviews(prev => prev.filter(img => img._id !== imageId))
      setSelectedFiles(prev => prev.filter(file => file !== imageToRemove.file))
    } else if (selectedBanner && imageToRemove?._id !== 'existing') {
      // Remove from server for existing images
      if (imagePreviews.length <= 1) {
        setAlert({ type: 'error', message: 'Banner musí mať aspoň jeden obrázok.' })
        return
      }

      try {
        await removeBannerImage({ bannerId: selectedBanner.id, imageId }).unwrap()
        setImagePreviews(prev => prev.filter(img => img._id !== imageId))
        setAlert({ type: 'success', message: 'Obrázok bol úspešne odstránený!' })
        refetch()
      } catch (error) {
        setAlert({
          type: 'error',
          message: `Chyba pri odstraňovaní obrázka: ${error.data?.message || error.message}`
        })
      }
    } else {
      // Remove from local state for preview
      setImagePreviews(prev => prev.filter(img => img._id !== imageId))
    }
  }

  const handleTranslateImage = (image) => {
    if (!selectedBanner) {
      setAlert({ type: 'error', message: 'Uložte banner pred pridaním prekladov.' })
      return
    }
    setTranslationDialog({ open: true, image, bannerId: selectedBanner.id })
  }

  const handleEditImageMetadata = (image, index) => {
    setImageMetadataDialog({ open: true, image, index })
  }

  const handleSaveImageMetadata = (updatedImage) => {
    const { index } = imageMetadataDialog
    setImagePreviews(prev => {
      const newImages = [...prev]
      newImages[index] = { ...newImages[index], ...updatedImage }
      return newImages
    })
    setImageMetadataDialog({ open: false, image: null, index: null })
  }

  const handleDragAndDrop = useCallback((draggedIndex, targetIndex) => {
    if (draggedIndex === targetIndex) return
    
    setImagePreviews(prev => {
      const newImages = [...prev]
      const [draggedImage] = newImages.splice(draggedIndex, 1)
      newImages.splice(targetIndex, 0, draggedImage)
      
      // Update sort order
      newImages.forEach((img, index) => {
        img.sortOrder = index
      })
      
      return newImages
    })
  }, [])

  const handleSaveImageOrder = async () => {
    if (!selectedBanner) return
    
    const existingImages = imagePreviews.filter(img => !img.isNew && img._id !== 'existing')
    if (existingImages.length === 0) return
    
    try {
      const imageIds = existingImages.map(img => img._id)
      await reorderBannerImages({ bannerId: selectedBanner.id, imageIds }).unwrap()
      setAlert({ type: 'success', message: 'Poradie obrázkov bolo úspešne zmenené!' })
      refetch()
    } catch (error) {
      setAlert({ 
        type: 'error', 
        message: `Chyba pri zmene poradia: ${error.data?.message || error.message}` 
      })
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    if (dialogMode === 'create' && (selectedFiles.length === 0 && imagePreviews.length === 0)) {
      setAlert({ type: 'error', message: 'Prosím vyberte aspoň jeden obrázok pre banner.' })
      return
    }

    try {
      const formDataToSend = new FormData()

      // Add form fields
      formDataToSend.append('position', formData.position)
      formDataToSend.append('isActive', formData.isActive)
      formDataToSend.append('sortOrder', formData.sortOrder)

      // Add title and subtitle (for LeRent) - always send even if empty
      if (formData.title !== undefined) {
        formDataToSend.append('title', formData.title || '')
      }
      if (formData.subtitle !== undefined) {
        formDataToSend.append('subtitle', formData.subtitle || '')
      }
      
      // Add images
      selectedFiles.forEach((file, index) => {
        formDataToSend.append('images', file)
      })

      let result
      if (dialogMode === 'create') {
        result = await createBanner(formDataToSend).unwrap()
        setAlert({ type: 'success', message: `Banner bol úspešne vytvorený s ${selectedFiles.length} obrázkom/mi!` })
      } else {
        // For update, only send new images if any
        if (selectedFiles.length > 0) {
          await addBannerImages({ bannerId: selectedBanner.id, formData: formDataToSend }).unwrap()
          setAlert({ type: 'success', message: `${selectedFiles.length} nový/ch obrázok/ov bolo pridaných!` })
        }
        
        // Update banner properties if changed
        const updateData = new FormData()
        updateData.append('position', formData.position)
        updateData.append('isActive', formData.isActive)
        updateData.append('sortOrder', formData.sortOrder)

        // Add title and subtitle (for LeRent)
        if (formData.title !== undefined) {
          updateData.append('title', formData.title)
        }
        if (formData.subtitle !== undefined) {
          updateData.append('subtitle', formData.subtitle)
        }
        
        result = await updateBanner({ id: selectedBanner.id, data: updateData }).unwrap()
        setAlert({ type: 'success', message: 'Banner bol úspešne aktualizovaný!' })
      }

      handleCloseDialog()
      refetch()
    } catch (error) {
      console.error('Error saving banner:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri ukladaní banneru: ${error.data?.message || error.message}` 
      })
    }
  }

  const handleDelete = async (bannerId) => {
    if (window.confirm('Ste si istí, že chcete vymazať tento banner?')) {
      try {
        await deleteBanner(bannerId).unwrap()
        setAlert({ type: 'success', message: 'Banner bol úspešne vymazaný!' })
        refetch()
      } catch (error) {
        console.error('Error deleting banner:', error)
        setAlert({ 
          type: 'error', 
          message: `Chyba pri mazaní banneru: ${error.data?.message || error.message}` 
        })
      }
    }
  }

  const handleToggleActive = async (bannerId, isActive) => {
    try {
      await updateBanner({ 
        id: bannerId, 
        data: { isActive: !isActive } 
      }).unwrap()
      setAlert({ 
        type: 'success', 
        message: `Banner bol ${!isActive ? 'aktivovaný' : 'deaktivovaný'}!` 
      })
      refetch()
    } catch (error) {
      console.error('Error toggling banner status:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri zmene stavu banneru: ${error.data?.message || error.message}` 
      })
    }
  }

  if (bannersLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (bannersError) {
    return (
      <Alert severity="error">
        Chyba pri načítavaní bannerov: {bannersError.message}
      </Alert>
    )
  }

  return (
    <Box>
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Správa Bannerov
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Spravujte obrázky bannerov pre rôzne pozície na webstránke
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
          sx={{ borderRadius: 2 }}
        >
          Nový Banner
        </Button>
      </Box>

      {/* Banners Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Obrázky</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Pozícia</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Poradie</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Stav</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Akcie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {banners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Box sx={{ py: 4 }}>
                        <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          Žiadne bannery
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Vytvorte svoj prvý banner kliknutím na tlačidlo "Nový Banner"
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  banners.map((banner) => {
                    // Handle both old single image format and new multiple images format
                    const bannerImages = banner.images && banner.images.length > 0 
                      ? banner.images 
                      : banner.image || banner.imageUrl 
                      ? [{ url: banner.imageUrl || banner.image?.url, alt: banner.image?.alt || 'Banner image' }]
                      : [];
                    
                    return (
                      <TableRow key={banner.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {bannerImages.length > 0 ? (
                              <>
                                {/* Primary image */}
                                <Avatar
                                  variant="rounded"
                                  src={bannerImages[0].url}
                                  sx={{ width: 80, height: 50 }}
                                >
                                  <ImageIcon />
                                </Avatar>
                                
                                {/* Image count and additional previews */}
                                <Box>
                                  <Chip 
                                    label={`${bannerImages.length} obrázok${bannerImages.length > 1 ? 'ov' : ''}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                  {bannerImages.length > 1 && (
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                      {bannerImages.slice(1, 4).map((img, index) => (
                                        <Avatar
                                          key={index}
                                          variant="rounded"
                                          src={img.url}
                                          sx={{ width: 20, height: 15, fontSize: 8 }}
                                        />
                                      ))}
                                      {bannerImages.length > 4 && (
                                        <Avatar
                                          variant="rounded"
                                          sx={{ 
                                            width: 20, 
                                            height: 15, 
                                            fontSize: 8, 
                                            bgcolor: 'text.secondary',
                                            color: 'white' 
                                          }}
                                        >
                                          +{bannerImages.length - 4}
                                        </Avatar>
                                      )}
                                    </Box>
                                  )}
                                </Box>
                              </>
                            ) : (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar
                                  variant="rounded"
                                  sx={{ width: 80, height: 50, bgcolor: 'grey.200' }}
                                >
                                  <ImageIcon sx={{ color: 'grey.400' }} />
                                </Avatar>
                                <Chip label="Bez obrázka" size="small" color="error" />
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={positionOptions.find(opt => opt.value === banner.position)?.label || banner.position}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>{banner.sortOrder}</TableCell>
                        <TableCell>
                          <Chip
                            label={banner.isActive ? 'Aktívny' : 'Neaktívny'}
                            color={banner.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Upraviť">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenDialog('edit', banner)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={banner.isActive ? 'Deaktivovať' : 'Aktivovať'}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleToggleActive(banner.id, banner.isActive)}
                            >
                              {banner.isActive ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Vymazať">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(banner.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Banner Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Nový Banner' : 'Upraviť Banner'}
        </DialogTitle>
        
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={3}>
                  {/* Image Upload Section */}
                  <Grid item xs={12}>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Obrázky Banneru (max 6)
                      </Typography>
                      
                      {/* Upload Button */}
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="banner-image-upload"
                        type="file"
                        onChange={handleFileChange}
                        multiple
                      />
                      <label htmlFor="banner-image-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<PhotoLibraryIcon />}
                          sx={{ mb: 2 }}
                          fullWidth
                          disabled={imagePreviews.length >= 6}
                        >
                          {imagePreviews.length >= 6 
                            ? 'Dosiahli ste limit 6 obrázkov' 
                            : `Vybrať obrázky (${imagePreviews.length}/6)`
                          }
                        </Button>
                      </label>
                      
                      {/* Image Previews with Drag & Drop */}
                      {imagePreviews.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">
                              Náhľad obrázkov ({imagePreviews.length}/6):
                            </Typography>
                            {selectedBanner && imagePreviews.some(img => !img.isNew) && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={handleSaveImageOrder}
                                startIcon={<SaveIcon />}
                              >
                                Uložiť poradie
                              </Button>
                            )}
                          </Stack>
                          
                          <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="caption">
                              💡 Potiahnite obrázky pre zmenu poradia. Prvý obrázok bude hlavný obrázok banneru.
                            </Typography>
                          </Alert>
                          
                          <Grid container spacing={2}>
                            {imagePreviews.map((image, index) => (
                              <Grid item xs={6} sm={4} key={image._id}>
                                <DraggableImage
                                  image={image}
                                  index={index}
                                  onRemove={handleRemoveImage}
                                  onTranslate={handleTranslateImage}
                                  onEdit={handleEditImageMetadata}
                                  onDragStart={() => {}}
                                  onDragOver={() => {}}
                                  onDrop={handleDragAndDrop}
                                  isEditing={true}
                                  isLeRent={isLeRentUser}
                                />
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}
                      
                      {imagePreviews.length === 0 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          Banner musí mať aspoň jeden obrázok
                        </Alert>
                      )}
                    </Box>
                  </Grid>

                  {/* Position Selection */}
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Pozícia na webstránke</InputLabel>
                      <Select
                        value={formData.position}
                        onChange={handleChange('position')}
                        label="Pozícia na webstránke"
                      >
                        {(isLeRentUser ? positionOptions.filter(opt => opt.value === 'hero-section') : positionOptions).map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Title and Subtitle - Only for LeRent user */}
                  {isLeRentUser && (
                    <>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Nadpis"
                          value={formData.title}
                          onChange={handleChange('title')}
                          helperText="Hlavný nadpis pre banner"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Podnadpis"
                          value={formData.subtitle}
                          onChange={handleChange('subtitle')}
                          helperText="Podnadpis alebo popis banneru"
                        />
                      </Grid>
                    </>
                  )}

                  {/* Sort Order - Hidden for LeRent user */}
                  {!isLeRentUser && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Poradie zobrazenia"
                        type="number"
                        value={formData.sortOrder}
                        onChange={handleChange('sortOrder')}
                        InputProps={{ inputProps: { min: 0 } }}
                        helperText="Čím menšie číslo, tým vyššie sa banner zobrazí"
                      />
                    </Grid>
                  )}

                  {/* Status */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isActive}
                          onChange={handleChange('isActive')}
                          color="primary"
                        />
                      }
                      label="Aktívny banner"
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              
              <DialogActions>
                <Button onClick={handleCloseDialog}>
                  Zrušiť
                </Button>
                <Button 
                  type="submit" 
                  variant="contained"
                  disabled={creating || updating}
                  startIcon={creating || updating ? <CircularProgress size={16} /> : <SaveIcon />}
                >
                  {creating || updating 
                    ? 'Ukladám...' 
                    : (dialogMode === 'create' ? 'Vytvoriť Banner' : 'Aktualizovať Banner')
                  }
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          <BannerImageEnglishTranslation
            image={translationDialog.image}
            bannerId={translationDialog.bannerId}
            open={translationDialog.open}
            onClose={() => setTranslationDialog({ open: false, image: null, bannerId: null })}
            onSuccess={() => {
              refetch()
              setAlert({ type: 'success', message: 'Preklad bol úspešne uložený!' })
            }}
          />

          {/* Image Metadata Dialog for LeRent */}
          <Dialog
            open={imageMetadataDialog.open}
            onClose={() => setImageMetadataDialog({ open: false, image: null, index: null })}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Upraviť obrázok</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  label="Nadpis"
                  value={imageMetadataDialog.image?.title || ''}
                  onChange={(e) => setImageMetadataDialog(prev => ({
                    ...prev,
                    image: { ...prev.image, title: e.target.value }
                  }))}
                  helperText="Hlavný nadpis pre tento obrázok"
                />
                <TextField
                  fullWidth
                  label="Podnadpis"
                  multiline
                  rows={2}
                  value={imageMetadataDialog.image?.description || ''}
                  onChange={(e) => setImageMetadataDialog(prev => ({
                    ...prev,
                    image: { ...prev.image, description: e.target.value }
                  }))}
                  helperText="Popis alebo podnadpis pre tento obrázok"
                />
                <FormControl fullWidth>
                  <InputLabel>Odkaz na auto</InputLabel>
                  <Select
                    value={imageMetadataDialog.image?.carId || ''}
                    onChange={(e) => setImageMetadataDialog(prev => ({
                      ...prev,
                      image: { ...prev.image, carId: e.target.value }
                    }))}
                    label="Odkaz na auto"
                  >
                    <MenuItem value="">
                      <em>Žiadny odkaz</em>
                    </MenuItem>
                    {carsData?.data?.map((car) => (
                      <MenuItem key={car._id} value={car._id}>
                        {car.brand} {car.model} {car.year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setImageMetadataDialog({ open: false, image: null, index: null })}>
                Zrušiť
              </Button>
              <Button
                variant="contained"
                onClick={() => handleSaveImageMetadata(imageMetadataDialog.image)}
              >
                Uložiť
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )
    } 