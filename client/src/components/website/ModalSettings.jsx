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
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Avatar,
  CircularProgress,
} from '@mui/material'
import {
  Save as SaveIcon,
  Preview as PreviewIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { sk } from 'date-fns/locale'
import { 
  useGetModalsQuery,
  useCreateModalMutation,
  useUpdateModalMutation,
  useDeleteModalMutation,
  useToggleModalMutation 
} from '../../store/store'
import { store } from '../../store/store'

const modalTypeOptions = [
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'info', label: 'Informačný' },
  { value: 'discount', label: 'Zľavový' },
  { value: 'announcement', label: 'Oznámenie' },
  { value: 'promotion', label: 'Propagácia' },
]

const displayLocationOptions = [
  { value: 'all-pages', label: 'Na všetkých stránkach' },
  { value: 'homepage', label: 'Len na domovskej stránke' },
  { value: 'pricing', label: 'Len na stránke s cenníkom' },
  { value: 'contact', label: 'Len na kontaktnej stránke' },
  { value: 'about', label: 'Len na stránke o nás' },
  { value: 'cars', label: 'Len na stránke s autami' },
]

const triggerTypeOptions = [
  { value: 'time', label: 'Čas (sekundy)' },
  { value: 'scroll', label: 'Skrolovanie (%)' },
  { value: 'exit', label: 'Exit intent' },
  { value: 'page-load', label: 'Načítanie stránky' },
  { value: 'manual', label: 'Manuálne' },
]

const frequencyOptions = [
  { value: 'every-visit', label: 'Pri každej návšteve' },
  { value: 'once-per-session', label: 'Raz za session' },
  { value: 'once-per-day', label: 'Raz denne' },
  { value: 'once-per-week', label: 'Raz týždenne' },
  { value: 'once-ever', label: 'Iba raz' },
]

const priorityOptions = [
  { value: 1, label: '1 (Najnižšia)' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5 (Stredná)' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
  { value: 8, label: '8' },
  { value: 9, label: '9' },
  { value: 10, label: '10 (Najvyššia)' },
]

const initialFormData = {
  name: '',
    title: '',
    content: '',
    type: 'info',
    displayLocation: 'all-pages',
    triggerRule: { type: 'time', value: 5 },
  frequency: 'every-visit',
  priority: 5,
    isActive: true,
  isScheduled: false,
    startDate: null,
    endDate: null,
    emailPlaceholder: 'Zadajte váš email',
    buttonText: 'Získať zľavu',
  secondaryButtonText: 'Možno neskôr',
    discountCode: '',
    discountPercentage: 10,
  discountType: 'percentage',
  discountValue: 0,
  styling: {
    backgroundColor: '#ffffff',
    textColor: '#333333',
    buttonColor: '#1976d2',
    buttonTextColor: '#ffffff',
    borderRadius: 8,
    width: '400px',
    position: 'center',
  },
  settings: {
    showCloseButton: true,
    closeable: true,
    overlay: true,
    overlayOpacity: 0.5,
    animation: 'fade',
    mobileResponsive: true,
  }
}

export default function ModalSettings() {
  const [modals, setModals] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create')
  const [selectedModal, setSelectedModal] = useState(null)
  const [formData, setFormData] = useState(initialFormData)
  const [alert, setAlert] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const { data: modalsData, isLoading: modalsLoading, error: modalsError, refetch } = useGetModalsQuery()
  const [createModal, { isLoading: creating }] = useCreateModalMutation()
  const [updateModal, { isLoading: updating }] = useUpdateModalMutation()
  const [deleteModal, { isLoading: deleting }] = useDeleteModalMutation()
  const [toggleModal] = useToggleModalMutation()

  useEffect(() => {
    if (modalsData?.data) {
      setModals(modalsData.data)
    }
  }, [modalsData])

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  // Test API connectivity function
  const testApiConnectivity = async () => {
    try {
      console.log('=== Testing API Connectivity ===')
      
      const state = store.getState()
      const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api'
      // Remove trailing slash to prevent double slashes
      const baseUrl = rawBaseUrl.replace(/\/$/, '')
      const token = state.auth.token
      
      console.log('Raw Base URL:', rawBaseUrl)
      console.log('Normalized Base URL:', baseUrl)
      console.log('Token available:', !!token)
      console.log('Is authenticated:', state.auth.isAuthenticated)
      
      // Test basic fetch to website settings
      const response = await fetch(`${baseUrl}/website/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })
      
      console.log('Test response status:', response.status)
      console.log('Test response ok:', response.ok)
      console.log('Test response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const data = await response.json()
        console.log('Test response data:', data)
        setAlert({ type: 'success', message: 'API connectivity test successful!' })
      } else {
        const errorText = await response.text()
        console.log('Test response error text:', errorText)
        setAlert({ type: 'error', message: `API test failed: ${response.status} ${response.statusText}` })
      }
    } catch (error) {
      console.error('API connectivity test failed:', error)
      setAlert({ type: 'error', message: `API connectivity test failed: ${error.message}` })
    }
  }

  // Comprehensive modal debugging function
  const runCompleteModalDebug = async () => {
    try {
      console.log('🔧 === COMPREHENSIVE MODAL DEBUG SESSION ===')
      const state = store.getState()
      
      // ✅ EXTRACT USER ID / TENANT ID
      const userId = state.auth.user?._id
      const userEmail = state.auth.user?.email
      
      console.log('👤 USER INFO:')
      console.log('- User ID (Your Tenant ID):', userId)
      console.log('- User Email:', userEmail)
      console.log('- Full User Object:', state.auth.user)
      
      const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api'
      // Remove trailing slash to prevent double slashes
      const baseUrl = rawBaseUrl.replace(/\/$/, '')
      const token = state.auth.token
      
      console.log('🔍 System Info:')
      console.log('- Raw Base URL:', rawBaseUrl)
      console.log('- Normalized Base URL:', baseUrl)
      console.log('- Token available:', !!token)
      console.log('- Token length:', token?.length || 0)
      console.log('- User authenticated:', state.auth.isAuthenticated)
      
      // Test with BOTH endpoints
      console.log('\n📋 Test: Get Modals with New Endpoint (tenantId)')
      const newEndpointUrl = `${baseUrl}/website/modals/active/homepage?tenantId=${userId}`
      console.log('New endpoint URL:', newEndpointUrl)
      
      const newResponse = await fetch(newEndpointUrl)
      const newData = await newResponse.json()
      console.log('New endpoint response:', newData)
      
      console.log('\n📋 Test: Get Modals with Old Endpoint (email)')
      const oldEndpointUrl = `${baseUrl}/public/users/${userEmail}/modal?page=homepage`
      console.log('Old endpoint URL:', oldEndpointUrl)
      
      const oldResponse = await fetch(oldEndpointUrl)
      const oldData = await oldResponse.json()
      console.log('Old endpoint response:', oldData)
      console.log('')

      // ✅ ALWAYS SHOW MODAL DATA - EVEN WHEN IT EXISTS
      console.log('🔍 PUBLIC ENDPOINT ANALYSIS:')
      
      if (oldData.success) {
        if (oldData.data) {
          console.log('✅ PUBLIC ENDPOINT IS WORKING!')
          console.log('📄 Modal data received:')
          console.log('  - Title:', oldData.data.title)
          console.log('  - Content:', oldData.data.content)
          console.log('  - Type:', oldData.data.type)
          console.log('  - Display Location:', oldData.data.displayLocation)
          console.log('  - Trigger Rule:', oldData.data.triggerRule)
          console.log('  - Button Text:', oldData.data.buttonText)
          console.log('  - Priority:', oldData.data.priority)
          console.log('  - Frequency:', oldData.data.frequency)
          console.log('  - Styling:', oldData.data.styling)
          console.log('  - Settings:', oldData.data.settings)
          console.log('  - Full Modal Object:', oldData.data)
          console.log('')
          console.log('🚀 INTEGRATION READY:')
          console.log('The modal data is now available for your website integration!')
          console.log('Use this URL in your website:', oldEndpointUrl)
        } else {
          console.log('⚠️ Public endpoint returns success but no modal data')
          console.log('This means:')
          console.log('  - API is working ✅')
          console.log('  - Tenant found ✅') 
          console.log('  - But modal failed filtering criteria ❌')
          console.log('')
          console.log('Let me test different page parameters:')
          
          // Test all possible page values
          const testPages = ['homepage', 'all-pages', 'pricing', 'contact', 'about', 'cars', '']
          
          for (const testPage of testPages) {
            try {
              const testUrl = `${baseUrl}/public/users/${userEmail}/modal${testPage ? `?page=${testPage}` : ''}`
              console.log(`Testing: ${testUrl}`)
              
              const testResponse = await fetch(testUrl)
              const testData = await testResponse.json()
              
              console.log(`  → ${testPage || 'no-page'}: ${testData.data ? '✅ FOUND' : '❌ null'}`)
              
              if (testData.data) {
                console.log(`  → Modal found with page="${testPage}":`, testData.data.title)
                console.log(`  → Display Location:`, testData.data.displayLocation)
                console.log(`  → Priority:`, testData.data.priority)
              }
            } catch (error) {
              console.log(`  → ${testPage || 'no-page'}: ❌ ERROR`)
            }
          }
        }
      } else {
        console.log('❌ Public endpoint failed:', oldData.message)
      }
      console.log('')

      // Test 1: Health check
      console.log('\n🏥 Test 1: Health Check')
      console.log('Health URL:', `${baseUrl}/health`)
      const healthResponse = await fetch(`${baseUrl}/health`)
      const healthData = await healthResponse.json()
      console.log('Health response:', healthData)
      
      // Test 2: CORS test
      console.log('\n🌐 Test 2: CORS Test')
      console.log('CORS URL:', `${baseUrl}/cors-test`)
      const corsResponse = await fetch(`${baseUrl}/cors-test`)
      const corsData = await corsResponse.json()
      console.log('CORS response:', corsData)
      
      // Test 3: Get current modals
      console.log('\n📋 Test 3: Get Current Modals')
      console.log('Modals URL:', `${baseUrl}/website/modals`)
      const modalsResponse = await fetch(`${baseUrl}/website/modals`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })
      console.log('Modals response status:', modalsResponse.status)
      console.log('Modals response headers:', Object.fromEntries(modalsResponse.headers.entries()))
      
      if (modalsResponse.ok) {
        const modalsData = await modalsResponse.json()
        console.log('Current modals data:', modalsData)
        console.log('Number of modals:', modalsData.data?.length || 0)
        
        // ✅ DETAILED MODAL ANALYSIS
        if (modalsData.data && modalsData.data.length > 0) {
          console.log('\n🔍 DETAILED MODAL ANALYSIS:')
          modalsData.data.forEach((modal, index) => {
            console.log(`\n--- Modal ${index + 1}: ${modal.name} ---`)
            console.log('- ID:', modal._id)
            console.log('- Title:', modal.title)
            console.log('- Type:', modal.type)
            console.log('- Is Active:', modal.isActive)
            console.log('- Display Location:', modal.displayLocation)
            console.log('- Trigger Rule:', modal.triggerRule)
            console.log('- Frequency:', modal.frequency)
            console.log('- Priority:', modal.priority)
            console.log('- Is Scheduled:', modal.isScheduled)
            console.log('- Start Date:', modal.startDate)
            console.log('- End Date:', modal.endDate)
            console.log('- Created At:', modal.createdAt)
            console.log('- Updated At:', modal.updatedAt)
            console.log('- Full Modal Object:', modal)
            
            // Check why it might not be showing publicly
            console.log('\n🔍 PUBLIC ACCESS CHECK:')
            if (!modal.isActive) {
              console.log('❌ ISSUE: Modal is NOT ACTIVE')
            } else {
              console.log('✅ Modal is active')
            }
            
            if (modal.displayLocation === 'homepage') {
              console.log('✅ Modal is set for homepage')
            } else if (modal.displayLocation === 'all-pages') {
              console.log('✅ Modal is set for all pages')
            } else {
              console.log('⚠️ Modal is set for:', modal.displayLocation, '(not homepage)')
            }
            
            if (modal.isScheduled) {
              const now = new Date()
              const startDate = modal.startDate ? new Date(modal.startDate) : null
              const endDate = modal.endDate ? new Date(modal.endDate) : null
              
              console.log('📅 SCHEDULING CHECK:')
              console.log('- Current time:', now.toISOString())
              console.log('- Start date:', startDate?.toISOString() || 'None')
              console.log('- End date:', endDate?.toISOString() || 'None')
              
              if (startDate && now < startDate) {
                console.log('❌ ISSUE: Modal not yet started')
              } else if (endDate && now > endDate) {
                console.log('❌ ISSUE: Modal has expired')
              } else {
                console.log('✅ Modal is within date range')
              }
            } else {
              console.log('✅ Modal is not scheduled (always active)')
            }
          })
        }
        
        // Test 4: If modals exist, test toggle on the first one
        if (modalsData.data && modalsData.data.length > 0) {
          const firstModal = modalsData.data[0]
          console.log('\n🔀 Test 4: Toggle First Modal')
          console.log('Testing modal:', firstModal)
          console.log('Toggle URL:', `${baseUrl}/website/modals/${firstModal._id}/toggle`)
          
          const toggleResponse = await fetch(`${baseUrl}/website/modals/${firstModal._id}/toggle`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ isActive: !firstModal.isActive })
          })
          
          console.log('Toggle response status:', toggleResponse.status)
          console.log('Toggle response headers:', Object.fromEntries(toggleResponse.headers.entries()))
          
          if (toggleResponse.ok) {
            const toggleData = await toggleResponse.json()
            console.log('Toggle response data:', toggleData)
          } else {
            const toggleError = await toggleResponse.text()
            console.log('Toggle error response:', toggleError)
          }
        } else {
          console.log('❌ No modals found to test toggle')
        }
      } else {
        const modalsError = await modalsResponse.text()
        console.log('Modals error response:', modalsError)
      }
      
      // Test 5: Test modal creation
      console.log('\n➕ Test 5: Test Modal Creation')
      console.log('Create URL:', `${baseUrl}/website/modals`)
      const testModal = {
        name: `Debug Test Modal ${Date.now()}`,
        title: 'Debug Test Modal',
        content: 'This is a test modal created for debugging purposes.',
        type: 'info',
        displayLocation: 'all-pages',
        triggerRule: { type: 'time', value: 5 },
        frequency: 'every-visit',
        priority: 5,
        isActive: true
      }
      
      const createResponse = await fetch(`${baseUrl}/website/modals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(testModal)
      })
      
      console.log('Create response status:', createResponse.status)
      if (createResponse.ok) {
        const createData = await createResponse.json()
        console.log('Create response data:', createData)
        
        // Test 6: Test deleting the test modal
        console.log('\n🗑️ Test 6: Clean up test modal')
        console.log('Delete URL:', `${baseUrl}/website/modals/${createData.data._id}`)
        const deleteResponse = await fetch(`${baseUrl}/website/modals/${createData.data._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        })
        console.log('Delete response status:', deleteResponse.status)
      } else {
        const createError = await createResponse.text()
        console.log('Create error response:', createError)
      }
      
      console.log('\n✅ === DEBUG SESSION COMPLETE ===')
      setAlert({ type: 'success', message: 'Complete modal debug finished! Check console for detailed results.' })
      
    } catch (error) {
      console.error('❌ Debug session failed:', error)
      setAlert({ type: 'error', message: `Debug session failed: ${error.message}` })
    }
  }

  const handleOpenDialog = (mode, modal = null) => {
    setDialogMode(mode)
    setSelectedModal(modal)
    
    if (modal) {
      setFormData({
        name: modal.name || '',
        title: modal.title || '',
        content: modal.content || '',
        type: modal.type || 'info',
        displayLocation: modal.displayLocation || 'all-pages',
        triggerRule: modal.triggerRule || { type: 'time', value: 5 },
        frequency: modal.frequency || 'every-visit',
        priority: modal.priority || 5,
        isActive: modal.isActive !== undefined ? modal.isActive : true,
        isScheduled: modal.isScheduled || false,
        startDate: modal.startDate ? new Date(modal.startDate) : null,
        endDate: modal.endDate ? new Date(modal.endDate) : null,
        emailPlaceholder: modal.emailPlaceholder || 'Zadajte váš email',
        buttonText: modal.buttonText || 'Získať zľavu',
        secondaryButtonText: modal.secondaryButtonText || 'Možno neskôr',
        discountCode: modal.discountCode || '',
        discountPercentage: modal.discountPercentage || 10,
        discountType: modal.discountType || 'percentage',
        discountValue: modal.discountValue || 0,
        styling: {
          backgroundColor: modal.styling?.backgroundColor || '#ffffff',
          textColor: modal.styling?.textColor || '#333333',
          buttonColor: modal.styling?.buttonColor || '#1976d2',
          buttonTextColor: modal.styling?.buttonTextColor || '#ffffff',
          borderRadius: modal.styling?.borderRadius || 8,
          width: modal.styling?.width || '400px',
          position: modal.styling?.position || 'center',
        },
        settings: {
          showCloseButton: modal.settings?.showCloseButton !== undefined ? modal.settings.showCloseButton : true,
          closeable: modal.settings?.closeable !== undefined ? modal.settings.closeable : true,
          overlay: modal.settings?.overlay !== undefined ? modal.settings.overlay : true,
          overlayOpacity: modal.settings?.overlayOpacity || 0.5,
          animation: modal.settings?.animation || 'fade',
          mobileResponsive: modal.settings?.mobileResponsive !== undefined ? modal.settings.mobileResponsive : true,
        }
      })
    } else {
      setFormData(initialFormData)
    }
    
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedModal(null)
    setFormData(initialFormData)
  }

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleStylingChange = (field) => (event) => {
    const value = event.target.value
    setFormData(prev => ({
      ...prev,
      styling: { ...prev.styling, [field]: value }
    }))
  }

  const handleSettingsChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [field]: value }
    }))
  }

  const handleTriggerChange = (field) => (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      triggerRule: {
        ...prev.triggerRule,
        [field]: newValue || event.target.value
      }
    }))
  }

  const handleDateChange = (field) => (date) => {
    setFormData(prev => ({ ...prev, [field]: date }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.name.trim() || !formData.title.trim() || !formData.content.trim()) {
      setAlert({ type: 'error', message: 'Názov, titulok a obsah sú povinné' })
      return
    }

    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      setAlert({ type: 'error', message: 'Dátum ukončenia musí byť po dátume začiatku' })
      return
    }

    try {
      let result
      if (dialogMode === 'create') {
        result = await createModal(formData).unwrap()
        setAlert({ type: 'success', message: 'Modal bol úspešne vytvorený!' })
      } else {
        result = await updateModal({ id: selectedModal._id, data: formData }).unwrap()
        setAlert({ type: 'success', message: 'Modal bol úspešne aktualizovaný!' })
      }

      handleCloseDialog()
      refetch()
    } catch (error) {
      console.error('Error saving modal:', error)
      
      // Better error handling with fallbacks
      let errorMessage = 'Neznáma chyba'
      
      if (error?.data?.message) {
        errorMessage = error.data.message
      } else if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error?.status) {
        errorMessage = `Server error (${error.status}): ${error.statusText || 'Unknown error'}`
      }
      
      setAlert({ 
        type: 'error', 
        message: `Chyba pri ukladaní modalu: ${errorMessage}` 
      })
    }
  }

  const handleDelete = async (modalId) => {
    if (window.confirm('Ste si istí, že chcete vymazať tento modal?')) {
      try {
        await deleteModal(modalId).unwrap()
        setAlert({ type: 'success', message: 'Modal bol úspešne vymazaný!' })
        refetch()
      } catch (error) {
        console.error('Error deleting modal:', error)
        
        // Better error handling with fallbacks
        let errorMessage = 'Neznáma chyba'
        
        if (error?.data?.message) {
          errorMessage = error.data.message
        } else if (error?.message) {
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        } else if (error?.status) {
          errorMessage = `Server error (${error.status}): ${error.statusText || 'Unknown error'}`
        }
        
        setAlert({ 
          type: 'error', 
          message: `Chyba pri mazaní modalu: ${errorMessage}` 
        })
      }
    }
  }

  const handleToggleActive = async (modalId, isActive) => {
    try {
      console.log('=== Modal Toggle Debug Info ===')
      console.log('Modal ID:', modalId)
      console.log('Current isActive:', isActive)
      console.log('New isActive will be:', !isActive)
      console.log('Request payload:', { id: modalId, isActive: !isActive })
      
      // Check authentication state
      const state = store.getState()
      console.log('Auth state:', {
        isAuthenticated: state.auth.isAuthenticated,
        hasToken: !!state.auth.token,
        tokenLength: state.auth.token?.length || 0
      })
      
      // Log the API base URL with normalization
      const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api'
      const baseUrl = rawBaseUrl.replace(/\/$/, '')
      console.log('Raw API Base URL:', rawBaseUrl)
      console.log('Normalized API Base URL:', baseUrl)
      console.log('Full toggle URL would be:', `${baseUrl}/website/modals/${modalId}/toggle`)
      
      const result = await toggleModal({ id: modalId, isActive: !isActive }).unwrap()
      
      console.log('Toggle modal SUCCESS response:', result)
      
      setAlert({ 
        type: 'success', 
        message: `Modal bol ${!isActive ? 'aktivovaný' : 'deaktivovaný'}!` 
      })
      refetch()
    } catch (error) {
      console.error('=== Modal Toggle ERROR Details ===')
      console.error('Full error object:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      console.error('Error status:', error?.status)
      console.error('Error data:', error?.data)
      console.error('Error message:', error?.message)
      console.error('Error originalStatus:', error?.originalStatus)
      console.error('Network error info:', {
        isFetchError: error?.name === 'FetchError',
        hasResponse: !!error?.response,
        status: error?.status || error?.response?.status,
        statusText: error?.statusText || error?.response?.statusText
      })
      
      // Better error handling with fallbacks
      let errorMessage = 'Neznáma chyba pri zmene stavu modalu'
      
      if (error?.data?.message) {
        errorMessage = error.data.message
      } else if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error?.status) {
        errorMessage = `Server error (${error.status}): ${error.statusText || 'Unknown error'}`
      } else if (error?.originalStatus) {
        errorMessage = `Network error (${error.originalStatus}): Connection failed`
      } else if (error?.name === 'FetchError') {
        errorMessage = 'Network connection failed - server may be unreachable'
      }
      
      setAlert({ 
        type: 'error', 
        message: `Chyba pri zmene stavu modalu: ${errorMessage}` 
      })
    }
  }

  const getModalTypeColor = (type) => {
    const colors = {
      newsletter: 'primary',
      info: 'info',
      discount: 'success',
      announcement: 'warning',
      promotion: 'secondary'
    }
    return colors[type] || 'default'
  }

  const getTriggerValueLabel = (triggerRule) => {
    switch (triggerRule?.type) {
      case 'time':
        return `${triggerRule.value} sekúnd`
      case 'scroll':
        return `${triggerRule.value}% stránky`
      case 'exit':
        return 'Pri pokuse o odchod'
      case 'page-load':
        return 'Pri načítaní stránky'
      case 'manual':
        return 'Manuálne'
      default:
        return ''
    }
  }

  const renderPreviewModal = () => (
    <Dialog 
      open={showPreview} 
      onClose={() => setShowPreview(false)}
      maxWidth="sm"
      fullWidth
    >
      <Paper 
        sx={{ 
          backgroundColor: formData.styling.backgroundColor,
          color: formData.styling.textColor,
          borderRadius: formData.styling.borderRadius + 'px',
        }}
      >
        <DialogTitle sx={{ color: formData.styling.textColor }}>
          {formData.title}
        </DialogTitle>
        <DialogContent sx={{ color: formData.styling.textColor }}>
          <Typography>{formData.content}</Typography>
          
          {formData.type === 'newsletter' && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                placeholder={formData.emailPlaceholder}
                variant="outlined"
                size="small"
                sx={{ mb: 2 }}
              />
            </Box>
          )}
          
          {formData.type === 'discount' && formData.discountCode && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
              <Typography variant="h6">
                Kód: {formData.discountCode}
              </Typography>
              <Typography variant="body2">
                Zľava: {formData.discountType === 'percentage' ? `${formData.discountPercentage}%` : `${formData.discountValue}€`}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            sx={{ 
              backgroundColor: formData.styling.buttonColor,
              color: formData.styling.buttonTextColor,
              '&:hover': {
                backgroundColor: formData.styling.buttonColor,
                opacity: 0.8,
              }
            }}
          >
            {formData.buttonText}
          </Button>
          {formData.secondaryButtonText && (
            <Button 
              variant="outlined"
              sx={{ color: formData.styling.textColor }}
            >
              {formData.secondaryButtonText}
            </Button>
          )}
          <Button onClick={() => setShowPreview(false)}>
            Zatvoriť
          </Button>
        </DialogActions>
      </Paper>
    </Dialog>
  )

  if (modalsLoading) {
  return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (modalsError) {
    return (
      <Alert severity="error">
        Chyba pri načítavaní modalov: {modalsError.message}
      </Alert>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={sk}>
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
              Správa Vyskakujúcich Okien
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vytvárajte a spravujte vyskakujúce okná pre vašu webstránku
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="info"
              onClick={testApiConnectivity}
              sx={{ borderRadius: 2 }}
            >
              Test API
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={runCompleteModalDebug}
              sx={{ borderRadius: 2 }}
            >
              Complete Debug
            </Button>
            <Button
              variant="contained"
              onClick={() => handleOpenDialog('create')}
              startIcon={<AddIcon />}
              sx={{ borderRadius: 2 }}
            >
              Nový Modal
            </Button>
          </Box>
        </Box>

        {/* Modals Table */}
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Názov</TableCell>
                    <TableCell>Typ</TableCell>
                    <TableCell>Zobrazenie</TableCell>
                    <TableCell>Priorita</TableCell>
                    <TableCell>Stav</TableCell>
                    <TableCell>Štatistiky</TableCell>
                    <TableCell>Akcie</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          Žiadne modaly neboli vytvorené
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    modals.map((modal) => (
                      <TableRow key={modal._id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2">
                              {modal.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {modal.title}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={modalTypeOptions.find(opt => opt.value === modal.type)?.label || modal.type}
                            size="small"
                            color={getModalTypeColor(modal.type)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {displayLocationOptions.find(opt => opt.value === modal.displayLocation)?.label || modal.displayLocation}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getTriggerValueLabel(modal.triggerRule)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={modal.priority}
                            size="small"
                            color={modal.priority >= 8 ? 'error' : modal.priority >= 5 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={modal.isActive ? 'Aktívny' : 'Neaktívny'}
                            color={modal.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Zobrazenia">
                              <Chip
                                icon={<AnalyticsIcon />}
                                label={modal.analytics?.impressions || 0}
                                size="small"
                                variant="outlined"
                              />
                            </Tooltip>
                            <Typography variant="caption" color="text.secondary">
                              CTR: {modal.clickThroughRate || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Upraviť">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenDialog('edit', modal)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={modal.isActive ? 'Deaktivovať' : 'Aktivovať'}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleToggleActive(modal._id, modal.isActive)}
                            >
                              {modal.isActive ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Náhľad">
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setFormData({
                                  ...modal,
                                  styling: modal.styling || initialFormData.styling,
                                  settings: modal.settings || initialFormData.settings,
                                })
                                setShowPreview(true)
                              }}
                            >
                              <PreviewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Vymazať">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(modal._id)}
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

        {/* Modal Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {dialogMode === 'create' ? 'Nový Modal' : 'Upraviť Modal'}
          </DialogTitle>
          
          <form onSubmit={handleSubmit}>
            <DialogContent>
                <Grid container spacing={3}>
                {/* Basic Information */}
                  <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Základné informácie
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                    label="Názov modalu *"
                    value={formData.name}
                    onChange={handleChange('name')}
                    placeholder="napr. Letná akcia"
                    helperText="Interný názov pre identifikáciu"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Typ modalu *</InputLabel>
                    <Select
                      value={formData.type}
                      onChange={handleChange('type')}
                      label="Typ modalu *"
                    >
                      {modalTypeOptions.map((option) => (
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
                    label="Titulok modalu *"
                      value={formData.title}
                      onChange={handleChange('title')}
                      placeholder="napr. Získajte 10% zľavu!"
                    helperText="Zobrazí sa návštevníkom"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                    label="Obsah modalu *"
                      value={formData.content}
                      onChange={handleChange('content')}
                      multiline
                      rows={4}
                      placeholder="napr. Zadajte svoj email a získajte 10% zľavu na prvú rezerváciu!"
                    />
                  </Grid>

                {/* Display & Trigger Settings */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Zobrazenie a spúšťanie
                  </Typography>
                </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                    <InputLabel>Zobrazenie na stránkach</InputLabel>
                      <Select
                      value={formData.displayLocation}
                      onChange={handleChange('displayLocation')}
                      label="Zobrazenie na stránkach"
                    >
                      {displayLocationOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                    <InputLabel>Frekvencia zobrazenia</InputLabel>
                      <Select
                      value={formData.frequency}
                      onChange={handleChange('frequency')}
                      label="Frekvencia zobrazenia"
                    >
                      {frequencyOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                    <InputLabel>Spúšťač</InputLabel>
                      <Select
                        value={formData.triggerRule.type}
                        onChange={handleTriggerChange('type')}
                      label="Spúšťač"
                      >
                        {triggerTypeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                    <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priorita</InputLabel>
                    <Select
                      value={formData.priority}
                      onChange={handleChange('priority')}
                      label="Priorita"
                    >
                      {priorityOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {(formData.triggerRule.type === 'time' || formData.triggerRule.type === 'scroll') && (
                  <Grid item xs={12}>
                      <Typography gutterBottom>
                      {formData.triggerRule.type === 'time' ? 'Oneskorenie (sekundy)' : 'Skrolovanie (%)'}
                      </Typography>
                      <Slider
                        value={formData.triggerRule.value}
                      onChange={(e, value) => handleTriggerChange('value')(e, value)}
                        min={formData.triggerRule.type === 'time' ? 1 : 10}
                        max={formData.triggerRule.type === 'time' ? 60 : 100}
                        step={formData.triggerRule.type === 'time' ? 1 : 5}
                        marks
                      valueLabelDisplay="auto"
                      />
                    </Grid>
                  )}

                {/* Content Specific Fields */}
                {(formData.type === 'newsletter' || formData.type === 'discount') && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Nastavenia obsahu
                      </Typography>
                    </Grid>

                      <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Text tlačidla"
                        value={formData.buttonText}
                        onChange={handleChange('buttonText')}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Text sekundárneho tlačidla"
                        value={formData.secondaryButtonText}
                        onChange={handleChange('secondaryButtonText')}
                      />
                    </Grid>

                    {formData.type === 'newsletter' && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Placeholder pre email"
                          value={formData.emailPlaceholder}
                          onChange={handleChange('emailPlaceholder')}
                        />
                      </Grid>
                  )}

                  {formData.type === 'discount' && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Zľavový kód"
                          value={formData.discountCode}
                          onChange={handleChange('discountCode')}
                        />
                      </Grid>

                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Typ zľavy</InputLabel>
                            <Select
                              value={formData.discountType}
                              onChange={handleChange('discountType')}
                              label="Typ zľavy"
                            >
                              <MenuItem value="percentage">Percentuálna</MenuItem>
                              <MenuItem value="fixed-amount">Pevná suma</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {formData.discountType === 'percentage' ? (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                              label="Percentuálna zľava (%)"
                          type="number"
                          value={formData.discountPercentage}
                          onChange={handleChange('discountPercentage')}
                          inputProps={{ min: 1, max: 100 }}
                        />
                      </Grid>
                        ) : (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                              label="Pevná suma zľavy (€)"
                              type="number"
                              value={formData.discountValue}
                              onChange={handleChange('discountValue')}
                              inputProps={{ min: 1 }}
                    />
                  </Grid>
                        )}
                      </>
                    )}
                  </>
                )}

                  {/* Styling */}
                  <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Vzhľad
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Farba pozadia"
                    type="color"
                    value={formData.styling.backgroundColor}
                    onChange={handleStylingChange('backgroundColor')}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Farba textu"
                    type="color"
                    value={formData.styling.textColor}
                    onChange={handleStylingChange('textColor')}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Farba tlačidla"
                    type="color"
                    value={formData.styling.buttonColor}
                    onChange={handleStylingChange('buttonColor')}
                    />
                  </Grid>

                {/* Settings */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Ďalšie nastavenia
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={handleChange('isActive')}
                      />
                    }
                    label="Aktívny modal"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.settings.showCloseButton}
                        onChange={handleSettingsChange('showCloseButton')}
                      />
                    }
                    label="Zobraziť tlačidlo zatvorenia"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.settings.overlay}
                        onChange={handleSettingsChange('overlay')}
                      />
                    }
                    label="Zobraziť pozadie"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.settings.mobileResponsive}
                        onChange={handleSettingsChange('mobileResponsive')}
                      />
                    }
                    label="Mobilná responzívnosť"
                  />
                </Grid>

                {/* Scheduling */}
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isScheduled}
                        onChange={handleChange('isScheduled')}
                      />
                    }
                    label="Naplánovať zobrazenie"
                  />
                </Grid>

                {formData.isScheduled && (
                  <>
                  <Grid item xs={12} sm={6}>
                    <DateTimePicker
                        label="Dátum začiatku"
                      value={formData.startDate}
                      onChange={handleDateChange('startDate')}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <DateTimePicker
                        label="Dátum ukončenia"
                      value={formData.endDate}
                      onChange={handleDateChange('endDate')}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </Grid>
                  </>
                )}
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setShowPreview(true)} startIcon={<PreviewIcon />}>
                Náhľad
              </Button>
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

        {/* Preview Modal */}
      {renderPreviewModal()}
      </Box>
    </LocalizationProvider>
  )
} 