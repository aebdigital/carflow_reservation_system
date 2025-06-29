import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  IconButton,
  Chip,
  Alert,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import { t } from '../utils/translations'

function Campaigns() {
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    targetCustomers: 'all',
    scheduledDate: '',
  })

  // Mock data for campaigns
  const campaigns = [
    {
      id: 1,
      name: 'Letná akcia 2024',
      subject: 'Špeciálne zľavy na letné prenájmy!',
      targetCustomers: 'all',
      status: 'sent',
      sentDate: '2024-06-15',
      recipientCount: 1234,
    },
    {
      id: 2,
      name: 'Nové autá v našej flote',
      subject: 'Objavte naše najnovšie vozidlá',
      targetCustomers: 'active',
      status: 'scheduled',
      scheduledDate: '2024-07-01',
      recipientCount: 856,
    },
    {
      id: 3,
      name: 'Víkendová akcia',
      subject: 'Zľava 20% na víkendové prenájmy',
      targetCustomers: 'all',
      status: 'draft',
      recipientCount: 0,
    },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'success'
      case 'scheduled': return 'primary'
      case 'draft': return 'warning'
      default: return 'default'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'sent': return t('sent')
      case 'scheduled': return t('scheduled')
      case 'draft': return t('draft')
      default: return status
    }
  }

  const handleOpenDialog = (mode, campaign = null) => {
    setDialogMode(mode)
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        subject: campaign.subject || '',
        content: campaign.content || '',
        targetCustomers: campaign.targetCustomers || 'all',
        scheduledDate: campaign.scheduledDate || '',
      })
    } else {
      setFormData({
        name: '',
        subject: '',
        content: '',
        targetCustomers: 'all',
        scheduledDate: '',
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setFormData({
      name: '',
      subject: '',
      content: '',
      targetCustomers: 'all',
      scheduledDate: '',
    })
  }

  const handleSubmit = () => {
    // Here you would implement the campaign creation/update logic
    console.log('Campaign data:', formData)
    handleCloseDialog()
  }

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
            {t('emailCampaigns')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Vytvárajte a spravujte e-mailové kampane pre vašich zákazníkov.
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
          {t('createCampaign')}
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4, ml: 0 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {campaigns.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Celkový počet kampaní
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {campaigns.filter(c => c.status === 'sent').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Odoslané kampane
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {campaigns.filter(c => c.status === 'scheduled').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Naplánované kampane
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {campaigns.filter(c => c.status === 'draft').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Koncepty
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Integration Notice */}
      <Alert severity="info" sx={{ mb: 3 }}>
        💡 Integrácia so SendGrid bude pridaná neskôr pre odosielanie hromadných e-mailov.
      </Alert>

      {/* Campaigns Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            {t('campaigns')}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t('campaignName')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('campaignSubject')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('targetCustomers')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('campaignStatus')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Príjemcovia</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Dátum</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {campaign.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{campaign.subject}</TableCell>
                    <TableCell>
                      {campaign.targetCustomers === 'all' ? t('allCustomers') : t('activeCustomersOnly')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(campaign.status)}
                        size="small"
                        color={getStatusColor(campaign.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {campaign.recipientCount > 0 ? campaign.recipientCount : '—'}
                    </TableCell>
                    <TableCell>
                      {campaign.sentDate || campaign.scheduledDate || '—'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleOpenDialog('view', campaign)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpenDialog('edit', campaign)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Campaign Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' && t('createCampaign')}
          {dialogMode === 'edit' && 'Upraviť kampaň'}
          {dialogMode === 'view' && 'Zobraziť kampaň'}
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('campaignName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('campaignSubject')}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('campaignContent')}
                multiline
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                disabled={dialogMode === 'view'}
                placeholder="Napíšte obsah vašej e-mailovej kampane..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('targetCustomers')}</InputLabel>
                <Select
                  value={formData.targetCustomers}
                  onChange={(e) => setFormData({ ...formData, targetCustomers: e.target.value })}
                  disabled={dialogMode === 'view'}
                  label={t('targetCustomers')}
                >
                  <MenuItem value="all">{t('allCustomers')}</MenuItem>
                  <MenuItem value="active">{t('activeCustomersOnly')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Naplánovať na"
                type="datetime-local"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                disabled={dialogMode === 'view'}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog}>
            {t('cancel')}
          </Button>
          {dialogMode !== 'view' && (
            <>
              <Button 
                variant="outlined" 
                onClick={handleSubmit}
                startIcon={<ScheduleIcon />}
              >
                {t('scheduleCampaign')}
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSubmit}
                startIcon={<SendIcon />}
              >
                {dialogMode === 'create' ? t('sendCampaign') : t('save')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Campaigns 