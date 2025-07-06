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
  FormHelperText,
  InputAdornment,
  Tooltip,
  Avatar,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CloudUpload as UploadIcon,
  DragIndicator as DragIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material'
import { useGetBannersQuery, useCreateBannerMutation, useUpdateBannerMutation, useDeleteBannerMutation } from '../../store/store'

const pageOptions = [
  { value: 'homepage', label: 'Domovská stránka' },
  { value: 'cars', label: 'Stránka áut' },
  { value: 'about', label: 'O nás' },
  { value: 'contact', label: 'Kontakt' },
  { value: 'all', label: 'Všetky stránky' },
]

const bannerTypeOptions = [
  { value: 'hero', label: 'Hlavný banner (Hero)' },
  { value: 'promotional', label: 'Propagačný banner' },
  { value: 'announcement', label: 'Oznámenie' },
  { value: 'carousel', label: 'Karusel' },
]

export default function BannerSettings() {
  const [banners, setBanners] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create')
  const [selectedBanner, setSelectedBanner] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [alert, setAlert] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    buttonText: '',
    buttonLink: '',
    type: 'promotional',
    page: 'homepage',
    isActive: true,
    sortOrder: 0,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    overlayOpacity: 0.5,
  })

  const { data: bannersData, isLoading: bannersLoading, error: bannersError, refetch } = useGetBannersQuery()
  const [createBanner, { isLoading: creating }] = useCreateBannerMutation()
  const [updateBanner, { isLoading: updating }] = useUpdateBannerMutation()
  const [deleteBanner, { isLoading: deleting }] = useDeleteBannerMutation()

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
        title: banner.title || '',
        description: banner.description || '',
        buttonText: banner.buttonText || '',
        buttonLink: banner.buttonLink || '',
        type: banner.type || 'promotional',
        page: banner.page || 'homepage',
        isActive: banner.isActive !== undefined ? banner.isActive : true,
        sortOrder: banner.sortOrder || 0,
        textColor: banner.textColor || '#ffffff',
        backgroundColor: banner.backgroundColor || '#000000',
        overlayOpacity: banner.overlayOpacity || 0.5,
      })
      setImagePreview(banner.imageUrl || null)
    } else {
      setFormData({
        title: '',
        description: '',
        buttonText: '',
        buttonLink: '',
        type: 'promotional',
        page: 'homepage',
        isActive: true,
        sortOrder: 0,
        textColor: '#ffffff',
        backgroundColor: '#000000',
        overlayOpacity: 0.5,
      })
      setImagePreview(null)
    }
    
    setSelectedFile(null)
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedBanner(null)
    setSelectedFile(null)
    setImagePreview(null)
    setFormData({
      title: '',
      description: '',
      buttonText: '',
      buttonLink: '',
      type: 'promotional',
      page: 'homepage',
      isActive: true,
      sortOrder: 0,
      textColor: '#ffffff',
      backgroundColor: '#000000',
      overlayOpacity: 0.5,
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
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    try {
      const formDataToSend = new FormData()
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key])
      })
      
      // Add image if selected
      if (selectedFile) {
        formDataToSend.append('image', selectedFile)
      }

      let result
      if (dialogMode === 'create') {
        result = await createBanner(formDataToSend).unwrap()
        setAlert({ type: 'success', message: 'Banner bol úspešne vytvorený!' })
      } else {
        result = await updateBanner({ id: selectedBanner.id, data: formDataToSend }).unwrap()
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
            Vytvárajte a spravujte bannery pre vašu webstránku
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
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Náhľad</TableCell>
                  <TableCell>Názov</TableCell>
                  <TableCell>Typ</TableCell>
                  <TableCell>Stránka</TableCell>
                  <TableCell>Stav</TableCell>
                  <TableCell>Akcie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {banners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Žiadne bannery neboli vytvorené
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  banners.map((banner) => (
                    <TableRow key={banner.id}>
                      <TableCell>
                        <Avatar
                          variant="rounded"
                          src={banner.imageUrl}
                          sx={{ width: 60, height: 40 }}
                        >
                          <ImageIcon />
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {banner.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {banner.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={bannerTypeOptions.find(opt => opt.value === banner.type)?.label || banner.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={pageOptions.find(opt => opt.value === banner.page)?.label || banner.page}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
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
                  ))
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Nový Banner' : 'Upraviť Banner'}
        </DialogTitle>
        
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={3}>
              {/* Image Upload */}
              <Grid item xs={12}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Obrázok Banneru
                  </Typography>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="banner-image-upload"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="banner-image-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<UploadIcon />}
                      sx={{ mb: 2 }}
                    >
                      Vybrať Obrázok
                    </Button>
                  </label>
                  
                  {imagePreview && (
                    <Box>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                          width: '100%',
                          maxHeight: '200px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #ddd'
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid>

              {/* Basic Information */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Názov"
                  value={formData.title}
                  onChange={handleChange('title')}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Typ</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={handleChange('type')}
                    label="Typ"
                  >
                    {bannerTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Popis"
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={handleChange('description')}
                />
              </Grid>

              {/* Button Configuration */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Text tlačidla"
                  value={formData.buttonText}
                  onChange={handleChange('buttonText')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Link tlačidla"
                  value={formData.buttonLink}
                  onChange={handleChange('buttonLink')}
                  placeholder="https://example.com"
                />
              </Grid>

              {/* Display Settings */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Stránka</InputLabel>
                  <Select
                    value={formData.page}
                    onChange={handleChange('page')}
                    label="Stránka"
                  >
                    {pageOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Poradie"
                  type="number"
                  value={formData.sortOrder}
                  onChange={handleChange('sortOrder')}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>

              {/* Style Settings */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="color"
                  label="Farba textu"
                  value={formData.textColor}
                  onChange={handleChange('textColor')}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="color"
                  label="Farba pozadia"
                  value={formData.backgroundColor}
                  onChange={handleChange('backgroundColor')}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Priehľadnosť prekrytia"
                  value={formData.overlayOpacity}
                  onChange={handleChange('overlayOpacity')}
                  InputProps={{ 
                    inputProps: { min: 0, max: 1, step: 0.1 },
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                />
              </Grid>

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
                  label="Aktívny"
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
              Zrušiť
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              startIcon={<SaveIcon />}
              disabled={creating || updating}
            >
              {creating || updating ? 'Ukladá sa...' : 'Uložiť'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
} 