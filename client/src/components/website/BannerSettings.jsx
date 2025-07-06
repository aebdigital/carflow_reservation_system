import React, { useState, useEffect } from 'react'
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
} from '@mui/icons-material'
import { useGetBannersQuery, useCreateBannerMutation, useUpdateBannerMutation, useDeleteBannerMutation } from '../../store/store'

const positionOptions = [
  { value: 'homepage-hero', label: 'Domovská stránka - Hlavný banner' },
  { value: 'homepage-section', label: 'Domovská stránka - Sekcia' },
  { value: 'cars-hero', label: 'Stránka áut - Hlavný banner' },
  { value: 'cars-section', label: 'Stránka áut - Sekcia' },
  { value: 'contact-hero', label: 'Kontakt - Hlavný banner' },
  { value: 'contact-section', label: 'Kontakt - Sekcia' },
  { value: 'about-hero', label: 'O nás - Hlavný banner' },
  { value: 'about-section', label: 'O nás - Sekcia' },
  { value: 'footer', label: 'Päta stránky' },
  { value: 'header', label: 'Hlavička stránky' },
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
    position: 'homepage-hero',
    isActive: true,
    sortOrder: 0,
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
        position: banner.position || 'homepage-hero',
        isActive: banner.isActive !== undefined ? banner.isActive : true,
        sortOrder: banner.sortOrder || 0,
      })
      setImagePreview(banner.imageUrl || banner.image?.url || null)
    } else {
      setFormData({
        position: 'homepage-hero',
        isActive: true,
        sortOrder: 0,
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
      position: 'homepage-hero',
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
    
    if (!selectedFile && dialogMode === 'create') {
      setAlert({ type: 'error', message: 'Prosím vyberte obrázok pre banner.' })
      return
    }

    try {
      const formDataToSend = new FormData()
      
      // Add form fields
      formDataToSend.append('position', formData.position)
      formDataToSend.append('isActive', formData.isActive)
      formDataToSend.append('sortOrder', formData.sortOrder)
      
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
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Náhľad</TableCell>
                  <TableCell>Pozícia</TableCell>
                  <TableCell>Poradie</TableCell>
                  <TableCell>Stav</TableCell>
                  <TableCell>Akcie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {banners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
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
                          src={banner.imageUrl || banner.image?.url}
                          sx={{ width: 80, height: 50 }}
                        >
                          <ImageIcon />
                        </Avatar>
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
        maxWidth="sm"
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
                      fullWidth
                    >
                      {selectedFile ? 'Zmeniť obrázok' : 'Vybrať obrázok'}
                    </Button>
                  </label>
                  
                  {imagePreview && (
                    <Box sx={{ mt: 2 }}>
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

              {/* Position Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Pozícia na webstránke</InputLabel>
                  <Select
                    value={formData.position}
                    onChange={handleChange('position')}
                    label="Pozícia na webstránke"
                  >
                    {positionOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Sort Order */}
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