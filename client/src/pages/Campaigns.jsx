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
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon2
} from '@mui/icons-material'
import { Snackbar } from '@mui/material'
import { t } from '../utils/translations'
import { 
  useSendMassEmailMutation, 
  useGetCampaignStatsQuery,
  useGetEmailSubscriptionsQuery,
  useGetEmailSubscriptionStatsQuery,
  useGetUsersQuery
} from '../store/store'

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`campaigns-tabpanel-${index}`}
      aria-labelledby={`campaigns-tab-${index}`}
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

function Campaigns() {
  const [tabValue, setTabValue] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [openEmailDialog, setOpenEmailDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [emailDialogMode, setEmailDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    targetCustomers: 'all',
    scheduledDate: '',
  })
  const [emailFormData, setEmailFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    source: 'manual',
    tags: [],
    isActive: true,
    notes: ''
  })
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // API hooks
  const [sendMassEmail, { isLoading: isSending }] = useSendMassEmailMutation()
  const { data: campaignStats, isLoading: statsLoading } = useGetCampaignStatsQuery()
  const { data: emailSubscriptions, isLoading: emailsLoading } = useGetEmailSubscriptionsQuery({ page: 1, limit: 100 })
  const { data: emailStats } = useGetEmailSubscriptionStatsQuery()
  const { data: users, isLoading: usersLoading } = useGetUsersQuery()

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

  // Combine customer data from Users and EmailSubscriptions
  const combinedEmailData = React.useMemo(() => {
    const emailMap = new Map();
    
    // Add email subscriptions first
    const emailSubs = emailSubscriptions?.data || [];
    emailSubs.forEach(sub => {
      emailMap.set(sub.email, {
        id: sub._id || sub.id,
        email: sub.email,
        firstName: sub.firstName || '',
        lastName: sub.lastName || '',
        phone: sub.phone || '',
        source: 'subscription',
        tags: sub.tags || ['newsletter'],
        isActive: sub.isActive !== undefined ? sub.isActive : true,
        subscribedDate: sub.subscribedDate || sub.createdAt,
        lastEmailDate: sub.lastEmailDate || '',
        notes: sub.notes || '',
        originalSource: 'EmailSubscription'
      });
    });
    
    // Add customers from Users database (they take priority if email exists in both)
    const customers = users?.data || users || [];
    customers.forEach(user => {
      if (user.email && user.email.trim()) {
        const existing = emailMap.get(user.email);
        emailMap.set(user.email, {
          id: user._id || user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || '',
          source: user.role === 'customer' ? 'customer' : 'website',
          tags: existing?.tags || ['customer'],
          isActive: !user.isBlacklisted && user.role === 'customer',
          subscribedDate: existing?.subscribedDate || user.createdAt,
          lastEmailDate: existing?.lastEmailDate || '',
          notes: existing?.notes || (user.isBlacklisted ? 'Blacklisted user' : ''),
          originalSource: 'User',
          role: user.role,
          isBlacklisted: user.isBlacklisted || false
        });
      }
    });
    
    return Array.from(emailMap.values()).sort((a, b) => {
      // Sort by creation date, newest first
      const dateA = new Date(a.subscribedDate || 0);
      const dateB = new Date(b.subscribedDate || 0);
      return dateB - dateA;
    });
  }, [emailSubscriptions, users]);

  // Mock data fallback for when API data is not available
  const mockEmailSubscriptions = [
    {
      id: 1,
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+421123456789',
      source: 'website',
      tags: ['customer', 'premium'],
      isActive: true,
      subscribedDate: '2024-01-15',
      lastEmailDate: '2024-06-15',
      notes: 'VIP zákazník'
    },
    {
      id: 2,
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+421987654321',
      source: 'newsletter',
      tags: ['newsletter'],
      isActive: true,
      subscribedDate: '2024-02-10',
      lastEmailDate: '2024-06-10',
      notes: ''
    },
    {
      id: 3,
      email: 'inactive@example.com',
      firstName: 'Inactive',
      lastName: 'User',
      phone: '',
      source: 'manual',
      tags: ['old-customer'],
      isActive: false,
      subscribedDate: '2024-01-01',
      lastEmailDate: '2024-03-01',
      notes: 'Už nie je zákazník'
    }
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

  const getSourceColor = (source) => {
    switch (source) {
      case 'customer': return 'success'
      case 'website': return 'primary'
      case 'subscription': return 'secondary'
      case 'newsletter': return 'secondary'
      case 'manual': return 'default'
      case 'import': return 'info'
      default: return 'default'
    }
  }

  const getSourceText = (source) => {
    switch (source) {
      case 'customer': return 'Zákazník'
      case 'website': return 'Webstránka'
      case 'subscription': return 'Odber'
      case 'newsletter': return 'Newsletter'
      case 'manual': return 'Manuálne'
      case 'import': return 'Import'
      default: return source
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

  const handleOpenEmailDialog = (mode, email = null) => {
    setEmailDialogMode(mode)
    setSelectedEmail(email)
    if (email) {
      setEmailFormData({
        email: email.email || '',
        firstName: email.firstName || '',
        lastName: email.lastName || '',
        phone: email.phone || '',
        source: email.source || 'manual',
        tags: email.tags || [],
        isActive: email.isActive !== undefined ? email.isActive : true,
        notes: email.notes || ''
      })
    } else {
      setEmailFormData({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        source: 'manual',
        tags: [],
        isActive: true,
        notes: ''
      })
    }
    setOpenEmailDialog(true)
  }

  const handleCloseEmailDialog = () => {
    setOpenEmailDialog(false)
    setSelectedEmail(null)
    setEmailFormData({
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      source: 'manual',
      tags: [],
      isActive: true,
      notes: ''
    })
  }

  const handleSubmit = async () => {
    if (dialogMode === 'view') return;
    
    try {
      if (dialogMode === 'create') {
        // Send mass email campaign
        const campaignData = {
          subject: formData.subject,
          content: formData.content,
          targetCustomers: formData.targetCustomers
        };
        
        console.log('Sending mass email campaign:', campaignData);
        
        const result = await sendMassEmail(campaignData).unwrap();
        
        setSnackbar({
          open: true,
          message: `Kampaň bola úspešne odoslaná! Odoslané: ${result.results.sent}, Neúspešné: ${result.results.failed}`,
          severity: result.results.failed > 0 ? 'warning' : 'success'
        });
        
        console.log('Campaign sent successfully:', result);
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error sending campaign:', error);
      setSnackbar({
        open: true,
        message: `Chyba pri odosielaní kampane: ${error.data?.message || error.message}`,
        severity: 'error'
      });
    }
  }

  const handleEmailSubmit = () => {
    // Here you would implement the email subscription creation/update logic
    console.log('Email subscription data:', emailFormData)
    handleCloseEmailDialog()
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  // Use combined data or fallback to mock data
  const currentEmailData = combinedEmailData.length > 0 ? combinedEmailData : mockEmailSubscriptions
  const getActiveEmails = () => currentEmailData.filter(email => email.isActive)
  const getInactiveEmails = () => currentEmailData.filter(email => !email.isActive)
  const getEmailsBySource = (source) => currentEmailData.filter(email => email.source === source)
  const getCustomerEmails = () => currentEmailData.filter(email => email.source === 'customer' || email.originalSource === 'User')
  const getSubscriptionEmails = () => currentEmailData.filter(email => email.source === 'subscription' || email.originalSource === 'EmailSubscription')

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
            Vytvárajte e-mailové kampane a spravujte databázu emailov pre marketing.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {tabValue === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('create')}
              sx={{ borderRadius: 2 }}
            >
              {t('createCampaign')}
            </Button>
          )}
          {tabValue === 1 && (
            <Button
              variant="contained"
              startIcon={<EmailIcon />}
              onClick={() => handleOpenEmailDialog('create')}
              sx={{ borderRadius: 2 }}
            >
              Pridať email
            </Button>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="campaigns tabs">
          <Tab label={`E-mailové kampane (${campaigns.length})`} />
          <Tab label={`Databáza emailov (${emailSubscriptions.length})`} />
        </Tabs>
      </Box>

      {/* Tab 1: Email Campaigns */}
      <TabPanel value={tabValue} index={0}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
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
        <Alert severity="success" sx={{ mb: 3 }}>
          ✅ Hromadné e-maily sú funkčné! Použite tlačidlo "Vytvoriť kampaň" pre odoslanie e-mailu všetkým zákazníkom.
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
      </TabPanel>

      {/* Tab 2: Email Database */}
      <TabPanel value={tabValue} index={1}>
        {/* Email Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {emailSubscriptions.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Celkový počet emailov
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {getActiveEmails().length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aktívne odberateľky
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {getCustomerEmails().length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Registrovaní zákazníci
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                  {getSubscriptionEmails().length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Newsletter odbery
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => {
              // Handle CSV import
              console.log('Import CSV')
            }}
          >
            Importovať CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {
              // Handle export
              console.log('Export emails')
            }}
          >
            Exportovať
          </Button>
        </Box>

        {/* Email Database Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Databáza emailov
              {(emailsLoading || usersLoading) && (
                <Typography component="span" sx={{ ml: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                  (Načítavam...)
                </Typography>
              )}
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Meno</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Telefón</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Zdroj</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Značky</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Stav</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Dátum registrácie</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentEmailData.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {email.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {email.firstName} {email.lastName}
                      </TableCell>
                      <TableCell>{email.phone || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getSourceText(email.source)}
                          size="small"
                          color={getSourceColor(email.source)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {email.tags.map((tag, index) => (
                            <Chip key={index} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={email.isBlacklisted ? 'Blacklisted' : (email.isActive ? 'Aktívny' : 'Neaktívny')}
                          size="small"
                          color={email.isBlacklisted ? 'error' : (email.isActive ? 'success' : 'warning')}
                          icon={email.isBlacklisted ? <BlockIcon /> : (email.isActive ? <CheckCircleIcon /> : <BlockIcon />)}
                        />
                      </TableCell>
                      <TableCell>
                        {email.subscribedDate ? new Date(email.subscribedDate).toLocaleDateString('sk-SK') : '—'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Zobraziť">
                          <IconButton size="small" onClick={() => handleOpenEmailDialog('view', email)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Upraviť">
                          <IconButton size="small" onClick={() => handleOpenEmailDialog('edit', email)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deaktivovať">
                          <IconButton size="small" color="error">
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

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
                disabled={isSending}
              >
                {isSending ? 'Odosielam...' : (dialogMode === 'create' ? t('sendCampaign') : t('save'))}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Email Dialog */}
      <Dialog 
        open={openEmailDialog} 
        onClose={handleCloseEmailDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {emailDialogMode === 'create' && 'Pridať email'}
          {emailDialogMode === 'edit' && 'Upraviť email'}
          {emailDialogMode === 'view' && 'Zobraziť email'}
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email adresa *"
                type="email"
                value={emailFormData.email}
                onChange={(e) => setEmailFormData({ ...emailFormData, email: e.target.value })}
                disabled={emailDialogMode === 'view'}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Meno"
                value={emailFormData.firstName}
                onChange={(e) => setEmailFormData({ ...emailFormData, firstName: e.target.value })}
                disabled={emailDialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Priezvisko"
                value={emailFormData.lastName}
                onChange={(e) => setEmailFormData({ ...emailFormData, lastName: e.target.value })}
                disabled={emailDialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefón"
                value={emailFormData.phone}
                onChange={(e) => setEmailFormData({ ...emailFormData, phone: e.target.value })}
                disabled={emailDialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Zdroj</InputLabel>
                <Select
                  value={emailFormData.source}
                  onChange={(e) => setEmailFormData({ ...emailFormData, source: e.target.value })}
                  disabled={emailDialogMode === 'view'}
                  label="Zdroj"
                >
                  <MenuItem value="website">Webstránka</MenuItem>
                  <MenuItem value="newsletter">Newsletter</MenuItem>
                  <MenuItem value="manual">Manuálne</MenuItem>
                  <MenuItem value="import">Import</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Značky (oddelené čiarkou)"
                value={emailFormData.tags.join(', ')}
                onChange={(e) => setEmailFormData({ 
                  ...emailFormData, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                })}
                disabled={emailDialogMode === 'view'}
                placeholder="customer, premium, newsletter"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailFormData.isActive}
                    onChange={(e) => setEmailFormData({ ...emailFormData, isActive: e.target.checked })}
                    disabled={emailDialogMode === 'view'}
                  />
                }
                label="Aktívny odberateľ"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Poznámky"
                multiline
                rows={3}
                value={emailFormData.notes}
                onChange={(e) => setEmailFormData({ ...emailFormData, notes: e.target.value })}
                disabled={emailDialogMode === 'view'}
                placeholder="Dodatočné informácie o odberateľovi..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseEmailDialog}>
            Zrušiť
          </Button>
          {emailDialogMode !== 'view' && (
            <Button 
              variant="contained" 
              onClick={handleEmailSubmit}
              startIcon={<EmailIcon />}
            >
              {emailDialogMode === 'create' ? 'Pridať email' : 'Uložiť zmeny'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </Box>
  )
}

export default Campaigns 