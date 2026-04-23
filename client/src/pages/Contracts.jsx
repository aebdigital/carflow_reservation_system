import React, { useState, useEffect } from 'react'
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
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Tabs,
  Tab,
  Autocomplete,
  CircularProgress,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { sk } from 'date-fns/locale'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  Description as ContractIcon,
  ExpandMore as ExpandMoreIcon,
  PersonAdd as PersonAddIcon,
  DirectionsCar as CarIcon,
  EventNote as EventIcon,
  MonetizationOn as MoneyIcon,
  MonetizationOn as MonetizationOnIcon,
  Rule as RuleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import {
  useGetContractsQuery,
  useGetContractQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useDeleteContractMutation,
  useUpdateContractStatusMutation,
  useSignContractStaffMutation,
  useGenerateContractPDFMutation,
  useGetContractStatsQuery,
  useGetReservationsQuery,
  useGenerateReservationSlovakAgreementMutation,
  useGetReservationQuery,
  useUpdateReservationMutation,
  useUpdateUserMutation,
  useGetCarsQuery,
  useGetSettingsQuery,
} from '../store/store'
import { t } from '../utils/translations'

function Contracts() {
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'view'
  const [selectedContract, setSelectedContract] = useState(null)
  const [alert, setAlert] = useState(null)

  // NitraCar edit dialog state
  const auth = useSelector((state) => state.auth)
  const isNitraCarUser = auth.user?.email === 'nitra-car@nitra-car.sk'
  const [editOpen, setEditOpen] = useState(false)
  const [editTabValue, setEditTabValue] = useState(0)
  const [editReservationId, setEditReservationId] = useState(null)
  const [editCustomerId, setEditCustomerId] = useState(null)
  const [editReservationData, setEditReservationData] = useState({})
  const [editCustomerData, setEditCustomerData] = useState({})
  const [editSelectedServices, setEditSelectedServices] = useState([])
  const [availableServices, setAvailableServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [editContractId, setEditContractId] = useState(null)
  const [editPaymentMethod, setEditPaymentMethod] = useState('hotovost')
  const [editIdDocumentType, setEditIdDocumentType] = useState('op')
  const [editSecondDriver, setEditSecondDriver] = useState({ firstName: '', lastName: '', idDocumentType: 'op', idNumber: '', phone: '', licenseNumber: '', dateOfBirth: null })
  const [editPickupFee, setEditPickupFee] = useState(0)
  const [editDropoffFee, setEditDropoffFee] = useState(0)
  const [formData, setFormData] = useState({
    reservationId: '',
    paymentMethod: 'hotovost',
    customer: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Slovensko'
      },
      idNumber: '' // cislo op - ID number
    },
    vehicle: {
      brand: '',
      model: '',
      year: '',
      registrationNumber: '', // ECV
      vin: '', // VIN
      category: '',
      fuelType: '',
      transmission: '',
      color: '' // farba - color
    },
    rental: {
      startDate: '', // zaciatok najmu
      endDate: '', // koniec najmu
      pickupLocation: '',
      returnLocation: '',
      totalDays: 0, // pocet dni
      dailyRate: 0, // denna sadzba
      totalAmount: 0 // cena bez depozitu
    },
    services: {
      additionalServices: [], // sluzby a priplatky
      servicesTotal: 0 // sluzby a priplatky cena
    },
    pricing: {
      subtotal: 0, // cena bez depozitu
      servicesTotal: 0, // sluzby a priplatky cena  
      totalAmount: 0 // spolu cena
    },
    additionalServices: [],
    specialServices: {
      delivery: {
        isSelected: false,
        price: 0,
        address: ''
      },
      afterHours: {
        isSelected: false,
        price: 0,
        notes: ''
      }
    },
    rentalRules: {
      dailyKmLimit: 200,
      excessKmFee: 0.25,
      insuranceDeductible: 1000,
      prohibitedActivities: [
        'Fajčenie vo vozidle',
        'Prevoz domácich zvierat bez schválenia',
        'Jazda v teréne',
        'Používanie vozidla na komerčné účely'
      ],
      cancellationPolicy: 'Zrušenie rezervácie je možné do 24 hodín pred začiatkom prenájmu bez poplatku. Pri zrušení menej ako 24 hodín pred začiatkom sa účtuje poplatok 50% z celkovej sumy.'
    },
    notes: '',
    status: 'draft'
  })

  // API hooks
  const { data: contractsData, isLoading: contractsLoading, error: contractsError, refetch } = useGetContractsQuery()
  const { data: contractStatsData } = useGetContractStatsQuery()
  const { data: reservationsData } = useGetReservationsQuery({ status: 'confirmed' })
  const [createContract, { isLoading: creating }] = useCreateContractMutation()
  const [updateContract, { isLoading: updating }] = useUpdateContractMutation()
  const [deleteContract, { isLoading: deleting }] = useDeleteContractMutation()
  const [updateContractStatus] = useUpdateContractStatusMutation()
  const [signContractStaff] = useSignContractStaffMutation()
  const [generateContractPDF] = useGenerateContractPDFMutation()
  const [generateSlovakAgreement] = useGenerateReservationSlovakAgreementMutation()

  // NitraCar edit hooks
  const { data: editReservationResult, isLoading: editReservationLoading } = useGetReservationQuery(editReservationId, { skip: !editReservationId })
  const [updateReservation, { isLoading: updatingReservation }] = useUpdateReservationMutation()
  const [updateUser, { isLoading: updatingUser }] = useUpdateUserMutation()
  const { data: carsData } = useGetCarsQuery(undefined, { skip: !isNitraCarUser })
  const { data: settingsData, isLoading: settingsLoading } = useGetSettingsQuery(undefined, { skip: !isNitraCarUser })
  const cars = carsData?.data || []
  const pickupLocations = (settingsData?.data?.business?.pickupLocations || []).filter(loc => loc.isActive !== false)

  const contracts = contractsData?.data || []
  const stats = contractStatsData?.data || {}
  const availableReservations = reservationsData?.data || []

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  // Populate edit form when reservation data loads
  useEffect(() => {
    if (editReservationResult?.data && editOpen) {
      const res = editReservationResult.data
      setEditReservationData({
        car: res.car || null,
        startDate: res.startDate ? new Date(res.startDate) : null,
        endDate: res.endDate ? new Date(res.endDate) : null,
        pickupLocation: res.pickupLocation || { name: '', address: { street: '', city: '', state: '', zipCode: '', country: '' } },
        dropoffLocation: res.dropoffLocation || { name: '', address: { street: '', city: '', state: '', zipCode: '', country: '' } },
        status: res.status || 'pending',
        pricing: res.pricing || {},
        specialRequests: res.specialRequests || '',
        servicesTotal: res.servicesTotal || 0,
      })
      setEditSelectedServices(res.selectedServices || [])
      setEditPickupFee(res.pricing?.pickupFee || 0)
      setEditDropoffFee(res.pricing?.dropoffFee || 0)
      setEditCustomerId(res.customer?._id || null)
      setEditCustomerData({
        firstName: res.customer?.firstName || '',
        lastName: res.customer?.lastName || '',
        email: res.customer?.email || '',
        phone: res.customer?.phone || '',
        dateOfBirth: res.customer?.dateOfBirth ? new Date(res.customer.dateOfBirth).toISOString().split('T')[0] : '',
        rodneCislo: res.customer?.rodneCislo || '',
        licenseNumber: res.customer?.licenseNumber || '',
        licenseExpiry: res.customer?.licenseExpiry ? new Date(res.customer.licenseExpiry).toISOString().split('T')[0] : '',
        status: res.customer?.status || 'active',
        address: {
          street: res.customer?.address?.street || '',
          city: res.customer?.address?.city || '',
          state: res.customer?.address?.state || '',
          zipCode: res.customer?.address?.zipCode || '',
          country: res.customer?.address?.country || '',
        }
      })
    }
  }, [editReservationResult, editOpen])

  // Fetch available services when edit dialog opens
  useEffect(() => {
    const fetchServices = async () => {
      if (isNitraCarUser && editOpen) {
        setServicesLoading(true)
        try {
          const baseUrl = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '')
          const response = await fetch(`${baseUrl}/additional-services`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
          const result = await response.json()
          if (result.success) {
            setAvailableServices(result.data.filter(s => s.isActive))
          }
        } catch (err) {
          console.error('Error fetching services:', err)
        } finally {
          setServicesLoading(false)
        }
      }
    }
    fetchServices()
  }, [isNitraCarUser, editOpen])

  // Determine location fee based on location name (NitraCar)
  const getLocationFee = (locationName) => {
    if (!locationName) return { fee: 0, isCustom: false }
    const name = locationName.toLowerCase()
    if (name.includes('iná adresa') || name.includes('ina adresa')) return { fee: 0, isCustom: true }
    if (name.includes('v nitre')) return { fee: 10, isCustom: false }
    return { fee: 0, isCustom: false }
  }

  // Calculate rate matching server's Car.calculateRate() method exactly
  const calculateCarRate = (car, days) => {
    const rates = car?.pricing?.rates || {}

    // LeRent pricing structure
    if (days >= 2 && days <= 3 && rates['2-3days']) return { dailyRate: rates['2-3days'], subtotal: rates['2-3days'] * days }
    if (days >= 4 && days <= 10 && rates['4-10days']) return { dailyRate: rates['4-10days'], subtotal: rates['4-10days'] * days }
    if (days >= 11 && days <= 20 && rates['11-20days']) return { dailyRate: rates['11-20days'], subtotal: rates['11-20days'] * days }
    if (days >= 21 && days <= 29 && rates['21-29days']) return { dailyRate: rates['21-29days'], subtotal: rates['21-29days'] * days }
    if (days >= 30 && days <= 60 && rates['30-60days']) return { dailyRate: rates['30-60days'], subtotal: rates['30-60days'] * days }

    // NitraCar pricing structure
    if (days >= 4 && days <= 9 && rates['4-9days']) return { dailyRate: rates['4-9days'], subtotal: rates['4-9days'] * days }
    if (days >= 10 && days <= 25 && rates['10-25days']) return { dailyRate: rates['10-25days'], subtotal: rates['10-25days'] * days }
    if (days >= 26 && rates['26plus']) return { dailyRate: rates['26plus'], subtotal: rates['26plus'] * days }

    // Legacy structure
    if (days === 1 && rates['1day']) return { dailyRate: rates['1day'], subtotal: rates['1day'] }
    if (days >= 11 && days <= 17 && rates['11-17days']) return { dailyRate: rates['11-17days'], subtotal: rates['11-17days'] * days }
    if (days >= 18 && days <= 24 && rates['18-24days']) return { dailyRate: rates['18-24days'], subtotal: rates['18-24days'] * days }
    if (days >= 25 && days <= 29 && rates['25-29days']) return { dailyRate: rates['25-29days'], subtotal: rates['25-29days'] * days }

    // Fallback to dailyRate
    const dailyRate = car?.pricing?.dailyRate || car?.dailyRate || 0
    return { dailyRate, subtotal: dailyRate * days }
  }

  // Recalculate pricing when car, dates, locations or services change in edit mode
  useEffect(() => {
    if (editOpen && editReservationData.car?._id && editReservationData.startDate && editReservationData.endDate) {
      const days = Math.ceil((new Date(editReservationData.endDate) - new Date(editReservationData.startDate)) / (1000 * 60 * 60 * 24))
      if (days > 0) {
        const { dailyRate, subtotal } = calculateCarRate(editReservationData.car, days)
        const servicesTotal = editSelectedServices?.reduce((sum, s) => {
          const pricingType = s.pricingType || s.pricing?.type || 'fixed'
          const unitPrice = s.unitPrice || s.pricing?.amount || 0
          const price = pricingType === 'per_day' ? unitPrice * days * (s.quantity || 1) : unitPrice * (s.quantity || 1)
          return sum + price
        }, 0) || 0

        // Location fees (NitraCar)
        const pickupInfo = getLocationFee(editReservationData.pickupLocation?.name)
        const dropoffInfo = getLocationFee(editReservationData.dropoffLocation?.name)
        const pickupFee = pickupInfo.isCustom ? editPickupFee : pickupInfo.fee
        const dropoffFee = dropoffInfo.isCustom ? editDropoffFee : dropoffInfo.fee
        const locationFeesTotal = pickupFee + dropoffFee

        const totalAmount = subtotal + servicesTotal + locationFeesTotal

        setEditReservationData(prev => ({
          ...prev,
          pricing: { ...prev.pricing, dailyRate, totalDays: days, subtotal, totalAmount, locationFeesTotal, pickupFee, dropoffFee },
          servicesTotal
        }))
      }
    }
  }, [editOpen, editReservationData.car?._id, editReservationData.startDate, editReservationData.endDate, editSelectedServices, editReservationData.pickupLocation?.name, editReservationData.dropoffLocation?.name, editPickupFee, editDropoffFee])

  // Automatically calculate total pricing when values change
  useEffect(() => {
    const subtotal = formData.rental.totalAmount || 0;
    const servicesTotal = formData.services.servicesTotal || 0;
    const totalAmount = subtotal + servicesTotal;

    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        subtotal: subtotal,
        servicesTotal: servicesTotal,
        totalAmount: totalAmount
      }
    }));
  }, [formData.rental.totalAmount, formData.services.servicesTotal]);

  // Handlers
  const handleOpenDialog = (mode, contract = null) => {
    setDialogMode(mode)
    setSelectedContract(contract)
    
    if (mode === 'create') {
      setFormData({
        reservationId: '',
        customer: {
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'Slovensko'
          },
          idNumber: ''
        },
        vehicle: {
          brand: '',
          model: '',
          year: '',
          registrationNumber: '',
          vin: '',
          category: '',
          fuelType: '',
          transmission: '',
          color: ''
        },
        rental: {
          startDate: '',
          endDate: '',
          pickupLocation: '',
          returnLocation: '',
          totalDays: 0,
          dailyRate: 0,
          totalAmount: 0
        },
        services: {
          additionalServices: [],
          servicesTotal: 0
        },
        pricing: {
          subtotal: 0,
          servicesTotal: 0,
          totalAmount: 0
        },
        additionalServices: [],
        specialServices: {
          delivery: {
            isSelected: false,
            price: 0,
            address: ''
          },
          afterHours: {
            isSelected: false,
            price: 0,
            notes: ''
          }
        },
        rentalRules: {
          dailyKmLimit: 200,
          excessKmFee: 0.25,
          insuranceDeductible: 1000,
          prohibitedActivities: [
            'Fajčenie vo vozidle',
            'Prevoz domácich zvierat bez schválenia',
            'Jazda v teréne',
            'Používanie vozidla na komerčné účely'
          ],
          cancellationPolicy: 'Zrušenie rezervácie je možné do 24 hodín pred začiatkom prenájmu bez poplatku. Pri zrušení menej ako 24 hodín pred začiatkom sa účtuje poplatok 50% z celkovej sumy.'
        },
        notes: '',
        status: 'draft'
      })
    } else if (mode === 'view' && contract) {
      setFormData(contract)
    }
    
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedContract(null)
  }

  const handleReservationChange = (reservationId) => {
    const reservation = availableReservations.find(r => r._id === reservationId)
    if (reservation) {
      const days = Math.ceil((new Date(reservation.endDate) - new Date(reservation.startDate)) / (1000 * 60 * 60 * 24));
      
      // Calculate base rental cost
      const dailyRate = reservation.pricing?.dailyRate || reservation.car?.pricing?.dailyRate || 0;
      const rentalAmount = reservation.pricing?.totalAmount || (dailyRate * days);
      
      // Calculate additional services cost
      let servicesTotal = 0;
      const additionalServices = [];
      
      if (reservation.additionalServices && reservation.additionalServices.length > 0) {
        reservation.additionalServices.forEach(service => {
          const servicePrice = service.pricing?.amount || 0;
          const serviceTotalPrice = service.pricing?.type === 'per_day' ? servicePrice * days : servicePrice;
          servicesTotal += serviceTotalPrice;
          
          additionalServices.push({
            name: service.name || 'Neznáma služba',
            price: serviceTotalPrice,
            type: service.pricing?.type || 'fixed'
          });
        });
      }
      
      // Calculate insurance costs if any
      if (reservation.insurance && reservation.insurance.length > 0) {
        reservation.insurance.forEach(insurance => {
          const insurancePrice = insurance.pricing?.amount || 0;
          const insuranceTotalPrice = insurance.pricing?.type === 'per_day' ? insurancePrice * days : insurancePrice;
          servicesTotal += insuranceTotalPrice;
          
          additionalServices.push({
            name: insurance.name || 'Poistenie',
            price: insuranceTotalPrice,
            type: insurance.pricing?.type || 'fixed'
          });
        });
      }
      
      const totalAmount = rentalAmount + servicesTotal;

      setFormData(prev => ({
        ...prev,
        reservationId,
        customer: {
          firstName: reservation.customer?.firstName || '',
          lastName: reservation.customer?.lastName || '',
          phone: reservation.customer?.phone || '',
          email: reservation.customer?.email || '',
          address: reservation.customer?.address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'Slovensko'
          },
          idNumber: reservation.customer?.idNumber || ''
        },
        vehicle: {
          brand: reservation.car?.brand || '',
          model: reservation.car?.model || '',
          year: reservation.car?.year || '',
          registrationNumber: reservation.car?.registrationNumber || '',
          vin: reservation.car?.vin || '',
          category: reservation.car?.category || '',
          fuelType: reservation.car?.fuelType || '',
          transmission: reservation.car?.transmission || '',
          color: reservation.car?.color || ''
        },
        rental: {
          startDate: reservation.startDate || '',
          endDate: reservation.endDate || '',
          pickupLocation: reservation.pickupLocation?.name || '',
          returnLocation: reservation.dropoffLocation?.name || '',
          totalDays: days,
          dailyRate: dailyRate,
          totalAmount: rentalAmount
        },
        services: {
          additionalServices: additionalServices,
          servicesTotal: servicesTotal
        },
        pricing: {
          subtotal: rentalAmount,
          servicesTotal: servicesTotal,
          totalAmount: totalAmount
        }
      }))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    try {
      if (dialogMode === 'create') {
        // For create mode, send only what the backend expects
        const contractData = {
          reservationId: formData.reservationId,
          additionalServices: formData.additionalServices || [],
          specialServices: formData.specialServices || {},
          rentalRules: formData.rentalRules || {},
          notes: formData.notes || '',
          ...(isNitraCarUser && formData.paymentMethod ? { paymentMethod: formData.paymentMethod } : {})
        };
        
        console.log('Creating contract with data:', contractData);
        await createContract(contractData).unwrap()
        setAlert({ type: 'success', message: 'Zmluva bola úspešne vytvorená!' })
      }
      
      handleCloseDialog()
      refetch()
    } catch (error) {
      console.error('Error saving contract:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri ukladaní zmluvy: ${error.data?.message || error.message}` 
      })
    }
  }

  const handleDelete = async (contractId) => {
    if (window.confirm('Ste si istí, že chcete vymazať túto zmluvu?')) {
      try {
        await deleteContract(contractId).unwrap()
        setAlert({ type: 'success', message: 'Zmluva bola úspešne vymazaná!' })
        refetch()
      } catch (error) {
        console.error('Error deleting contract:', error)
        setAlert({ 
          type: 'error', 
          message: `Chyba pri mazaní zmluvy: ${error.data?.message || error.message}` 
        })
      }
    }
  }

  const handleStatusChange = async (contractId, newStatus) => {
    try {
      await updateContractStatus({ id: contractId, status: newStatus }).unwrap()
      setAlert({ type: 'success', message: `Stav zmluvy bol zmenený na ${newStatus}!` })
      refetch()
    } catch (error) {
      console.error('Error updating contract status:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri zmene stavu zmluvy: ${error.data?.message || error.message}` 
      })
    }
  }

  const handleSignContract = async (contractId) => {
    try {
      await signContractStaff(contractId).unwrap()
      setAlert({ type: 'success', message: 'Zmluva bola podpísaná!' })
      refetch()
    } catch (error) {
      console.error('Error signing contract:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri podpisovaní zmluvy: ${error.data?.message || error.message}` 
      })
    }
  }

  const handleDownloadPDF = async (contractId) => {
    try {
      await generateContractPDF({ id: contractId, preview: false }).unwrap()
      setAlert({ type: 'success', message: 'PDF zmluvy sa sťahuje!' })
    } catch (error) {
      console.error('Error generating PDF:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri generovaní PDF: ${error.data?.message || error.message || 'Neočakávaná chyba'}` 
      })
    }
  }

  const handlePreviewPDF = async (contractId) => {
    try {
      await generateContractPDF({ id: contractId, preview: true }).unwrap()
      setAlert({ type: 'success', message: 'PDF zmluvy sa otvára v novom okne!' })
    } catch (error) {
      console.error('Error previewing PDF:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri náhľade PDF: ${error.data?.message || error.message || 'Neočakávaná chyba'}` 
      })
    }
  }

  // NitraCar Edit handlers
  const handleOpenEdit = (contract) => {
    const resId = contract.reservation?._id || contract.reservation
    setEditReservationId(resId)
    setEditContractId(contract._id)
    setEditPaymentMethod(contract.paymentMethod || 'hotovost')
    setEditIdDocumentType(contract.customer?.idDocumentType || 'op')
    setEditSecondDriver(contract.secondDriver || { firstName: '', lastName: '', idDocumentType: 'op', idNumber: '', phone: '', licenseNumber: '', dateOfBirth: null })
    setEditTabValue(0)
    setEditOpen(true)
  }

  const handleCloseEdit = () => {
    setEditOpen(false)
    setEditReservationId(null)
    setEditContractId(null)
    setEditCustomerId(null)
    setEditReservationData({})
    setEditCustomerData({})
    setEditSelectedServices([])
    setEditPaymentMethod('hotovost')
    setEditIdDocumentType('op')
    setEditSecondDriver({ firstName: '', lastName: '', idDocumentType: 'op', idNumber: '', phone: '', licenseNumber: '', dateOfBirth: null })
    setEditPickupFee(0)
    setEditDropoffFee(0)
  }

  const handleEditSave = async () => {
    try {
      // Prepare reservation update data
      const days = editReservationData.pricing?.totalDays || Math.ceil((new Date(editReservationData.endDate) - new Date(editReservationData.startDate)) / (1000 * 60 * 60 * 24))
      const car = editReservationData.car
      const { dailyRate, subtotal } = calculateCarRate(car, days)

      const servicesTotal = editSelectedServices?.reduce((sum, s) => {
        const pricingType = s.pricingType || s.pricing?.type || 'fixed'
        const unitPrice = s.unitPrice || s.pricing?.amount || 0
        const price = pricingType === 'per_day' ? unitPrice * days * (s.quantity || 1) : unitPrice * (s.quantity || 1)
        return sum + price
      }, 0) || 0

      // Location fees (NitraCar)
      const pickupInfo = getLocationFee(editReservationData.pickupLocation?.name)
      const dropoffInfo = getLocationFee(editReservationData.dropoffLocation?.name)
      const pickupFee = pickupInfo.isCustom ? editPickupFee : pickupInfo.fee
      const dropoffFee = dropoffInfo.isCustom ? editDropoffFee : dropoffInfo.fee
      const locationFeesTotal = pickupFee + dropoffFee

      const totalAmount = subtotal + servicesTotal + locationFeesTotal

      const reservationUpdateData = {
        id: editReservationId,
        customer: editCustomerId,
        car: car?._id,
        startDate: new Date(editReservationData.startDate).toISOString(),
        endDate: new Date(editReservationData.endDate).toISOString(),
        pickupLocation: editReservationData.pickupLocation,
        dropoffLocation: editReservationData.dropoffLocation,
        status: editReservationData.status,
        specialRequests: editReservationData.specialRequests || '',
        selectedServices: editSelectedServices?.map(s => ({
          _id: s._id || s.service,
          service: s._id || s.service,
          name: s.name,
          category: s.category,
          quantity: s.quantity || 1,
          unitPrice: s.unitPrice || s.pricing?.amount || 0,
          totalPrice: (s.pricingType === 'per_day' || s.pricing?.type === 'per_day')
            ? (s.unitPrice || s.pricing?.amount || 0) * days * (s.quantity || 1)
            : (s.unitPrice || s.pricing?.amount || 0) * (s.quantity || 1),
          pricingType: s.pricingType || s.pricing?.type || 'fixed'
        })) || [],
        servicesTotal,
        pricing: { ...editReservationData.pricing, dailyRate, totalDays: days, subtotal, totalAmount, locationFeesTotal, pickupFee, dropoffFee }
      }

      // Prepare customer update data
      const customerUpdateData = {
        id: editCustomerId,
        firstName: editCustomerData.firstName,
        lastName: editCustomerData.lastName,
        email: editCustomerData.email,
        phone: editCustomerData.phone,
        dateOfBirth: editCustomerData.dateOfBirth || undefined,
        rodneCislo: editCustomerData.rodneCislo || undefined,
        licenseNumber: editCustomerData.licenseNumber || undefined,
        licenseExpiry: editCustomerData.licenseExpiry || undefined,
        status: editCustomerData.status,
        address: editCustomerData.address,
      }

      // Call mutations
      const promises = [
        updateReservation(reservationUpdateData).unwrap(),
        updateUser(customerUpdateData).unwrap(),
      ]
      // Also update contract paymentMethod if changed
      if (editContractId) {
        const contractUpdate = { id: editContractId, paymentMethod: editPaymentMethod }
        if (isNitraCarUser) {
          contractUpdate['customer.idDocumentType'] = editIdDocumentType
          contractUpdate['customer.idNumber'] = editCustomerData.idNumber || ''
          contractUpdate.secondDriver = editSecondDriver

          // Update rental location strings (include custom address when "Iná adresa")
          const pickupCustomAddress = editReservationData.pickupLocation?.address?.street || ''
          const dropoffCustomAddress = editReservationData.dropoffLocation?.address?.street || ''
          const pickupIsCustom = getLocationFee(editReservationData.pickupLocation?.name).isCustom
          const dropoffIsCustom = getLocationFee(editReservationData.dropoffLocation?.name).isCustom
          contractUpdate['rental.pickupLocation'] = (pickupIsCustom && pickupCustomAddress)
            ? pickupCustomAddress
            : (editReservationData.pickupLocation?.name || 'Neuvedené')
          contractUpdate['rental.returnLocation'] = (dropoffIsCustom && dropoffCustomAddress)
            ? dropoffCustomAddress
            : (editReservationData.dropoffLocation?.name || 'Neuvedené')
        }
        promises.push(updateContract(contractUpdate).unwrap())
      }
      await Promise.all(promises)

      setAlert({ type: 'success', message: 'Rezervácia a zákazník boli úspešne aktualizované!' })
      handleCloseEdit()
      refetch()
    } catch (error) {
      console.error('Error updating from contract edit:', error)
      setAlert({
        type: 'error',
        message: `Chyba pri aktualizácii: ${error.data?.message || error.message}`
      })
    }
  }

  const handleDownloadSlovakAgreement = async (contract) => {
    try {
      if (!contract.reservationId) {
        setAlert({ type: 'error', message: 'Zmluva nemá priradenú rezerváciu' })
        return
      }

      // Open the Slovak agreement PDF in a new tab
      const url = `/api/reservations/${contract.reservationId}/slovak-agreement?preview=true`
      window.open(url, '_blank')
      
      setAlert({ type: 'success', message: 'Slovenská zmluva o nájme sa otvára!' })
    } catch (error) {
      console.error('Error generating Slovak agreement:', error)
      setAlert({ 
        type: 'error', 
        message: `Chyba pri generovaní slovenskej zmluvy: ${error.data?.message || error.message}` 
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'signed': return 'success'
      case 'pending': return 'warning'
      case 'draft': return 'default'
      case 'cancelled': return 'error'
      case 'expired': return 'error'
      default: return 'default'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'signed': return 'Podpísaná'
      case 'pending': return 'Čakajúca'
      case 'draft': return 'Koncept'
      case 'cancelled': return 'Zrušená'
      case 'expired': return 'Vypršaná'
      default: return status
    }
  }

  if (contractsLoading) {
    return <Typography>Načítava sa...</Typography>
  }

  if (contractsError) {
    return <Alert severity="error">Chyba pri načítavaní zmlúv: {contractsError.message}</Alert>
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
            {t('contracts')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Vytvárajte a spravujte zmluvy pre rezervácie vozidiel.
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
          Nová zmluva
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {stats.totalContracts || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Celkový počet zmlúv
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {stats.signedContracts || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Podpísané zmluvy
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {stats.contractsThisMonth || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Zmluvy tento mesiac
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                {stats.contractsByStatus?.find(s => s._id === 'pending')?.count || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Čakajúce zmluvy
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Contracts Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Zmluvy
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Číslo zmluvy</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Zákazník</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Vozidlo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Dátum vytvorenia</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Suma</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Akcie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Žiadne zmluvy neboli vytvorené
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  contracts.map((contract) => (
                    <TableRow key={contract._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {contract.contractNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {contract.customer.firstName} {contract.customer.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {contract.customer.email}
                        </Typography>
                        {isNitraCarUser && contract.customer.rodneCislo && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            RČ: {contract.customer.rodneCislo}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {contract.vehicle.brand} {contract.vehicle.model}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {contract.vehicle.registrationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(contract.createdAt).toLocaleDateString('sk-SK')}
                        </Typography>
                      </TableCell>
                    <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {contract.rental.totalAmount}€
                      </Typography>
                    </TableCell>
                    <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {isNitraCarUser && (
                            <Tooltip title="Upraviť rezerváciu a zákazníka">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEdit(contract)}
                                color="warning"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Stiahnuť PDF">
                      <IconButton
                        size="small"
                              onClick={() => handleDownloadPDF(contract._id)}
                        color="primary"
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                          </Tooltip>
                          <Tooltip title="Náhľad PDF">
                            <IconButton
                              size="small"
                              onClick={() => handlePreviewPDF(contract._id)}
                              color="info"
                            >
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Vymazať">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(contract._id)}
                              color="error"
                              disabled={contract.status === 'signed'}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Contract Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' && 'Nová zmluva'}
          {dialogMode === 'view' && 'Zobraziť zmluvu'}
        </DialogTitle>
        
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {dialogMode === 'create' && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Vyberte rezerváciu</InputLabel>
                    <Select
                      value={formData.reservationId}
                      onChange={(e) => handleReservationChange(e.target.value)}
                      label="Vyberte rezerváciu"
                    >
                      {availableReservations.map((reservation) => (
                        <MenuItem key={reservation._id} value={reservation._id}>
                          {reservation.reservationNumber} - {reservation.customer?.firstName} {reservation.customer?.lastName} - {reservation.car?.brand} {reservation.car?.model}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {isNitraCarUser && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Spôsob úhrady</InputLabel>
                      <Select
                        value={formData.paymentMethod || 'hotovost'}
                        onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        label="Spôsob úhrady"
                      >
                        <MenuItem value="hotovost">Hotovosť</MenuItem>
                        <MenuItem value="prevod">Bankový prevod</MenuItem>
                        <MenuItem value="karta">Karta</MenuItem>
                        <MenuItem value="online">Online</MenuItem>
                        <MenuItem value="qr_kod">QR kód</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Customer Information */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <PersonAddIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Informácie o zákazníkovi</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Meno"
                      value={formData.customer.firstName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, firstName: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Priezvisko"
                      value={formData.customer.lastName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, lastName: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Telefón"
                      value={formData.customer.phone}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, phone: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="E-mail"
                      value={formData.customer.email}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, email: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Adresa"
                      value={formData.customer.address.street}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { 
                          ...prev.customer, 
                          address: { ...prev.customer.address, street: e.target.value }
                        }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Číslo OP (voliteľné)"
                      value={formData.customer.idNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, idNumber: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Vehicle Information */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <CarIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Informácie o vozidle</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Značka"
                      value={formData.vehicle.brand}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vehicle: { ...prev.vehicle, brand: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Model"
                      value={formData.vehicle.model}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vehicle: { ...prev.vehicle, model: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Evidenčné číslo"
                      value={formData.vehicle.registrationNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vehicle: { ...prev.vehicle, registrationNumber: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Rok výroby"
                      type="number"
                      value={formData.vehicle.year}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vehicle: { ...prev.vehicle, year: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Farba"
                      value={formData.vehicle.color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vehicle: { ...prev.vehicle, color: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Rental Details */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <EventIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Detaily prenájmu</Typography>
              </AccordionSummary>
              <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                      label="Dátum od"
                      type="date"
                      value={formData.rental.startDate ? new Date(formData.rental.startDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, startDate: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                      InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                      label="Dátum do"
                type="date"
                      value={formData.rental.endDate ? new Date(formData.rental.endDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, endDate: e.target.value }
                      }))}
                disabled={dialogMode === 'view'}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Miesto prevzatia"
                      value={formData.rental.pickupLocation}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, pickupLocation: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Miesto vrátenia"
                      value={formData.rental.returnLocation}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, returnLocation: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Počet dní"
                      type="number"
                      value={formData.rental.totalDays}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, totalDays: parseInt(e.target.value) || 0 }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Denná sadzba (€)"
                      type="number"
                      value={formData.rental.dailyRate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, dailyRate: parseFloat(e.target.value) || 0 }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Celková suma (€)"
                      type="number"
                      value={formData.rental.totalAmount}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rental: { ...prev.rental, totalAmount: parseFloat(e.target.value) || 0 }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Services and Additional Charges */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <MoneyIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Služby a priplatky</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
            <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Dodatočné služby a priplatky:
                    </Typography>
                    <List dense>
                      {formData.services.additionalServices.map((service, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={service.name} secondary={`${service.price}€`} />
                          <ListItemSecondaryAction>
                            <IconButton
                              size="small"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                services: {
                                  ...prev.services,
                                  additionalServices: prev.services.additionalServices.filter((_, i) => i !== index)
                                }
                              }))}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Dodatočná služba/priplátky (€)"
                      type="number"
                      value={formData.services.servicesTotal}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        services: {
                          ...prev.services,
                          servicesTotal: parseFloat(e.target.value) || 0
                        }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Celková suma služieb a priplatkov (€)"
                      type="number"
                      value={formData.services.servicesTotal}
                      disabled
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Pricing */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <MonetizationOnIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Cena</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cena bez depozitu (€)"
                      type="number"
                      value={formData.pricing.subtotal}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Celková suma služieb a priplatkov (€)"
                      type="number"
                      value={formData.pricing.servicesTotal}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Celková suma (€)"
                      type="number"
                      value={formData.pricing.totalAmount}
                      disabled
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Rental Rules */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <RuleIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Pravidlá prenájmu</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Denný limit km"
                      type="number"
                      value={formData.rentalRules.dailyKmLimit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rentalRules: { ...prev.rentalRules, dailyKmLimit: parseInt(e.target.value) || 0 }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Poplatok za nadlimitné km (€/km)"
                      type="number"
                      step="0.01"
                      value={formData.rentalRules.excessKmFee}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rentalRules: { ...prev.rentalRules, excessKmFee: parseFloat(e.target.value) || 0 }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Spoluúčasť pri poistení (€)"
                      type="number"
                      value={formData.rentalRules.insuranceDeductible}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rentalRules: { ...prev.rentalRules, insuranceDeductible: parseInt(e.target.value) || 0 }
                      }))}
                  disabled={dialogMode === 'view'}
                    />
            </Grid>
            <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Storno podmienky"
                      multiline
                      rows={3}
                      value={formData.rentalRules.cancellationPolicy}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rentalRules: { ...prev.rentalRules, cancellationPolicy: e.target.value }
                      }))}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Notes */}
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Poznámky"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={dialogMode === 'view'}
              />
            </Box>
        </DialogContent>
        
          <DialogActions>
          <Button onClick={handleCloseDialog}>
              Zrušiť
          </Button>
          {dialogMode !== 'view' && (
              <Button 
                type="submit" 
                variant="contained" 
                disabled={creating}
              >
                {creating ? 'Ukladá sa...' : 'Uložiť'}
              </Button>
          )}
        </DialogActions>
        </form>
      </Dialog>

      {/* NitraCar Edit Reservation & Customer Dialog */}
      {isNitraCarUser && (
        <Dialog
          open={editOpen}
          onClose={handleCloseEdit}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Upraviť rezerváciu a zákazníka</DialogTitle>
          <DialogContent>
            {editReservationLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Tabs value={editTabValue} onChange={(e, v) => setEditTabValue(v)} sx={{ mb: 2 }}>
                  <Tab label="Rezervácia" />
                  <Tab label="Zákazník" />
                </Tabs>

                {/* Reservation Tab */}
                {editTabValue === 0 && (
                  <Grid container spacing={2}>
                    {/* Car Selection */}
                    <Grid item xs={12}>
                      <Autocomplete
                        options={cars}
                        getOptionLabel={(option) => `${option.brand} ${option.model} - ${option.registrationNumber || option.licensePlate || ''}`}
                        value={editReservationData.car || null}
                        onChange={(e, newValue) => {
                          setEditReservationData(prev => ({ ...prev, car: newValue }))
                        }}
                        isOptionEqualToValue={(option, value) => option._id === value?._id}
                        renderInput={(params) => (
                          <TextField {...params} label="Vozidlo" required />
                        )}
                      />
                    </Grid>

                    {/* Dates */}
                    <Grid item xs={12} md={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={sk}>
                        <DatePicker
                          label="Dátum od"
                          value={editReservationData.startDate ? new Date(editReservationData.startDate) : null}
                          onChange={(newValue) => setEditReservationData(prev => ({ ...prev, startDate: newValue }))}
                          slotProps={{ textField: { fullWidth: true, required: true } }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={sk}>
                        <DatePicker
                          label="Dátum do"
                          value={editReservationData.endDate ? new Date(editReservationData.endDate) : null}
                          onChange={(newValue) => setEditReservationData(prev => ({ ...prev, endDate: newValue }))}
                          slotProps={{ textField: { fullWidth: true, required: true } }}
                        />
                      </LocalizationProvider>
                    </Grid>

                    {/* Pickup / Dropoff Locations */}
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        options={pickupLocations}
                        getOptionLabel={(option) => option?.name || ''}
                        value={editReservationData.pickupLocation || null}
                        onChange={(e, newValue) => {
                          setEditReservationData(prev => ({
                            ...prev,
                            pickupLocation: newValue ? {
                              name: newValue.name,
                              address: { street: newValue.address || '', city: '', state: '', zipCode: '', country: '' }
                            } : { name: '', address: { street: '', city: '', state: '', zipCode: '', country: '' } }
                          }))
                          const info = getLocationFee(newValue?.name)
                          if (!info.isCustom) setEditPickupFee(info.fee)
                          else setEditPickupFee(0)
                        }}
                        loading={settingsLoading}
                        isOptionEqualToValue={(option, value) => option.name?.trim() === value?.name?.trim()}
                        renderInput={(params) => (
                          <TextField {...params} label="Miesto prevzatia" />
                        )}
                      />
                    </Grid>
                    {getLocationFee(editReservationData.pickupLocation?.name).isCustom && (
                      <>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Individuálna adresa prevzatia"
                            value={editReservationData.pickupLocation?.address?.street || ''}
                            onChange={(e) => setEditReservationData(prev => ({
                              ...prev,
                              pickupLocation: { ...prev.pickupLocation, address: { ...prev.pickupLocation?.address, street: e.target.value } }
                            }))}
                            placeholder="Napr. Piaristická 2, Nitra"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Cena za pristavenie (€)"
                            type="number"
                            value={editPickupFee}
                            onChange={(e) => setEditPickupFee(Number(e.target.value) || 0)}
                            inputProps={{ min: 0, step: 1 }}
                          />
                        </Grid>
                      </>
                    )}
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        options={pickupLocations}
                        getOptionLabel={(option) => option?.name || ''}
                        value={editReservationData.dropoffLocation || null}
                        onChange={(e, newValue) => {
                          setEditReservationData(prev => ({
                            ...prev,
                            dropoffLocation: newValue ? {
                              name: newValue.name,
                              address: { street: newValue.address || '', city: '', state: '', zipCode: '', country: '' }
                            } : { name: '', address: { street: '', city: '', state: '', zipCode: '', country: '' } }
                          }))
                          const info = getLocationFee(newValue?.name)
                          if (!info.isCustom) setEditDropoffFee(info.fee)
                          else setEditDropoffFee(0)
                        }}
                        loading={settingsLoading}
                        isOptionEqualToValue={(option, value) => option.name?.trim() === value?.name?.trim()}
                        renderInput={(params) => (
                          <TextField {...params} label="Miesto vrátenia" />
                        )}
                      />
                    </Grid>
                    {getLocationFee(editReservationData.dropoffLocation?.name).isCustom && (
                      <>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Individuálna adresa vrátenia"
                            value={editReservationData.dropoffLocation?.address?.street || ''}
                            onChange={(e) => setEditReservationData(prev => ({
                              ...prev,
                              dropoffLocation: { ...prev.dropoffLocation, address: { ...prev.dropoffLocation?.address, street: e.target.value } }
                            }))}
                            placeholder="Napr. Piaristická 2, Nitra"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Cena za vrátenie (€)"
                            type="number"
                            value={editDropoffFee}
                            onChange={(e) => setEditDropoffFee(Number(e.target.value) || 0)}
                            inputProps={{ min: 0, step: 1 }}
                          />
                        </Grid>
                      </>
                    )}

                    {/* Status */}
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Stav</InputLabel>
                        <Select
                          value={editReservationData.status || 'pending'}
                          onChange={(e) => setEditReservationData(prev => ({ ...prev, status: e.target.value }))}
                          label="Stav"
                        >
                          {isNitraCarUser ? (
                            [
                              <MenuItem key="pending" value="pending">Nová</MenuItem>,
                              <MenuItem key="awaiting_payment" value="awaiting_payment">Čakajúca</MenuItem>,
                              <MenuItem key="confirmed" value="confirmed">Potvrdená</MenuItem>,
                              <MenuItem key="cancelled" value="cancelled">Zrušená</MenuItem>
                            ]
                          ) : (
                            [
                              <MenuItem key="pending" value="pending">Čakajúca</MenuItem>,
                              <MenuItem key="awaiting_payment" value="awaiting_payment">Čaká na platbu</MenuItem>,
                              <MenuItem key="confirmed" value="confirmed">Potvrdená</MenuItem>,
                              <MenuItem key="zaplatene" value="zaplatene">Zaplatené</MenuItem>,
                              <MenuItem key="ongoing" value="ongoing">Prebiehajúca</MenuItem>,
                              <MenuItem key="completed" value="completed">Dokončená</MenuItem>,
                              <MenuItem key="cancelled" value="cancelled">Zrušená</MenuItem>
                            ]
                          )}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Payment Method */}
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Spôsob úhrady</InputLabel>
                        <Select
                          value={editPaymentMethod || 'hotovost'}
                          onChange={(e) => setEditPaymentMethod(e.target.value)}
                          label="Spôsob úhrady"
                        >
                          <MenuItem value="hotovost">Hotovosť</MenuItem>
                          <MenuItem value="prevod">Bankový prevod</MenuItem>
                          <MenuItem value="karta">Karta</MenuItem>
                          <MenuItem value="online">Online</MenuItem>
                          <MenuItem value="qr_kod">QR kód</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Additional Services */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom color="primary">
                            Dodatočné služby
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <Autocomplete
                              options={availableServices.filter(s =>
                                !editSelectedServices?.some(sel => (sel._id || sel.service?._id) === s._id)
                              )}
                              getOptionLabel={(option) => `${option.name} - ${option.pricing?.amount || 0}€${option.pricing?.type === 'per_day' ? '/deň' : ''}`}
                              loading={servicesLoading}
                              onChange={(e, value) => {
                                if (value) {
                                  const days = editReservationData.pricing?.totalDays || 1
                                  const amount = value.pricing?.amount || 0
                                  const totalPrice = value.pricing?.type === 'per_day' ? amount * days : amount
                                  setEditSelectedServices(prev => [...prev, {
                                    _id: value._id,
                                    service: value._id,
                                    name: value.name,
                                    category: value.category,
                                    quantity: 1,
                                    unitPrice: amount,
                                    totalPrice,
                                    pricingType: value.pricing?.type || 'fixed',
                                    pricing: value.pricing
                                  }])
                                }
                              }}
                              renderInput={(params) => (
                                <TextField {...params} label="Pridať službu" placeholder="Vyhľadajte a pridajte službu..." size="small" />
                              )}
                              value={null}
                              blurOnSelect
                              clearOnBlur
                            />
                          </Box>
                          {editSelectedServices && editSelectedServices.length > 0 ? (
                            <Grid container spacing={2}>
                              {editSelectedServices.map((service, index) => {
                                const days = editReservationData.pricing?.totalDays || 1
                                const pricingType = service.pricingType || service.pricing?.type || 'fixed'
                                const unitPrice = service.unitPrice || service.pricing?.amount || 0
                                const displayPrice = pricingType === 'per_day' ? unitPrice * days * (service.quantity || 1) : unitPrice * (service.quantity || 1)
                                return (
                                  <Grid item xs={12} md={6} key={service._id || index}>
                                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200', position: 'relative' }}>
                                      <IconButton size="small" color="error" onClick={() => {
                                        setEditSelectedServices(prev => prev.filter((_, i) => i !== index))
                                      }} sx={{ position: 'absolute', top: 4, right: 4 }}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, pr: 4 }}>
                                        <Typography variant="body2" fontWeight="medium">
                                          {service.quantity > 1 ? `${service.quantity}x ` : ''}{service.name || 'Služba'}
                                        </Typography>
                                        <Typography variant="body2" color="primary" fontWeight="medium">
                                          {displayPrice.toFixed(2)}€
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Množstvo:</Typography>
                                        <IconButton size="small" onClick={() => {
                                          if (service.quantity > 1) {
                                            const updated = [...editSelectedServices]
                                            updated[index] = { ...service, quantity: service.quantity - 1 }
                                            setEditSelectedServices(updated)
                                          }
                                        }} disabled={service.quantity <= 1}>
                                          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>-</span>
                                        </IconButton>
                                        <Typography variant="body2">{service.quantity || 1}</Typography>
                                        <IconButton size="small" onClick={() => {
                                          const updated = [...editSelectedServices]
                                          updated[index] = { ...service, quantity: (service.quantity || 1) + 1 }
                                          setEditSelectedServices(updated)
                                        }}>
                                          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>+</span>
                                        </IconButton>
                                        <Chip
                                          label={pricingType === 'per_day' ? 'Za deň' : 'Pevná cena'}
                                          size="small"
                                          color="primary"
                                          variant="outlined"
                                          sx={{ ml: 1 }}
                                        />
                                      </Box>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                        Jednotková cena: {unitPrice.toFixed(2)}€{pricingType === 'per_day' ? `/deň × ${days} dní` : ''}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                )
                              })}
                            </Grid>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                              Žiadne dodatočné služby
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Pricing Summary */}
                    {editReservationData.pricing && (
                      <Grid item xs={12}>
                        <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom color="primary">
                              Cenová kalkulácia
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">
                                Prenájom vozidla ({editReservationData.pricing.totalDays || 0} dní × {editReservationData.pricing.dailyRate?.toFixed(2) || 0}€):
                              </Typography>
                              <Typography variant="body2" fontWeight="medium">
                                {(editReservationData.pricing.subtotal || 0).toFixed(2)}€
                              </Typography>
                            </Box>
                            {editReservationData.servicesTotal > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">Dodatočné služby:</Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {editReservationData.servicesTotal.toFixed(2)}€
                                </Typography>
                              </Box>
                            )}
                            {(editReservationData.pricing?.pickupFee > 0 || editReservationData.pricing?.dropoffFee > 0) && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">
                                  Poplatky za miesto ({[
                                    editReservationData.pricing?.pickupFee > 0 && `prevzatie ${editReservationData.pricing.pickupFee}€`,
                                    editReservationData.pricing?.dropoffFee > 0 && `vrátenie ${editReservationData.pricing.dropoffFee}€`
                                  ].filter(Boolean).join(' + ')}):
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {(editReservationData.pricing?.locationFeesTotal || 0).toFixed(2)}€
                                </Typography>
                              </Box>
                            )}
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body1" fontWeight="bold">Celkom:</Typography>
                              <Typography variant="body1" fontWeight="bold" color="primary">
                                {(editReservationData.pricing.totalAmount || 0).toFixed(2)}€
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    {/* Special Requests */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Špeciálne požiadavky"
                        multiline
                        rows={2}
                        value={editReservationData.specialRequests || ''}
                        onChange={(e) => setEditReservationData(prev => ({ ...prev, specialRequests: e.target.value }))}
                      />
                    </Grid>
                  </Grid>
                )}

                {/* Customer Tab */}
                {editTabValue === 1 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Meno"
                        value={editCustomerData.firstName || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Priezvisko"
                        value={editCustomerData.lastName || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="E-mail"
                        type="email"
                        value={editCustomerData.email || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Telefón"
                        value={editCustomerData.phone || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Dátum narodenia"
                        type="date"
                        value={editCustomerData.dateOfBirth || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Stav zákazníka</InputLabel>
                        <Select
                          value={editCustomerData.status || 'active'}
                          onChange={(e) => setEditCustomerData(prev => ({ ...prev, status: e.target.value }))}
                          label="Stav zákazníka"
                        >
                          <MenuItem value="active">Aktívny</MenuItem>
                          <MenuItem value="inactive">Neaktívny</MenuItem>
                          <MenuItem value="pending">Čakajúci</MenuItem>
                          <MenuItem value="blacklisted">Na čiernej listine</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* License */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>Vodičský preukaz</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Číslo vodičského preukazu"
                        value={editCustomerData.licenseNumber || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Platnosť vodičského preukazu"
                        type="date"
                        value={editCustomerData.licenseExpiry || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, licenseExpiry: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Rodné číslo"
                        value={editCustomerData.rodneCislo || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '')
                          setEditCustomerData(prev => ({ ...prev, rodneCislo: val }))
                        }}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                      />
                    </Grid>

                    {/* ID Document Type - NitraCar only */}
                    {isNitraCarUser && (
                      <>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>Doklad totožnosti</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Typ dokladu</InputLabel>
                            <Select
                              value={editIdDocumentType}
                              onChange={(e) => setEditIdDocumentType(e.target.value)}
                              label="Typ dokladu"
                            >
                              <MenuItem value="op">Občiansky preukaz</MenuItem>
                              <MenuItem value="pas">Pas</MenuItem>
                              <MenuItem value="pobyt">Doklad o povolení na pobyt</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Číslo dokladu"
                            value={editCustomerData.idNumber || ''}
                            onChange={(e) => setEditCustomerData(prev => ({ ...prev, idNumber: e.target.value }))}
                          />
                        </Grid>
                      </>
                    )}

                    {/* Second Driver - NitraCar only */}
                    {isNitraCarUser && (
                      <>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>Druhý vodič</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Meno"
                            value={editSecondDriver.firstName || ''}
                            onChange={(e) => setEditSecondDriver(prev => ({ ...prev, firstName: e.target.value }))}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Priezvisko"
                            value={editSecondDriver.lastName || ''}
                            onChange={(e) => setEditSecondDriver(prev => ({ ...prev, lastName: e.target.value }))}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <FormControl fullWidth>
                            <InputLabel>Typ dokladu</InputLabel>
                            <Select
                              value={editSecondDriver.idDocumentType || 'op'}
                              onChange={(e) => setEditSecondDriver(prev => ({ ...prev, idDocumentType: e.target.value }))}
                              label="Typ dokladu"
                            >
                              <MenuItem value="op">Občiansky preukaz</MenuItem>
                              <MenuItem value="pas">Pas</MenuItem>
                              <MenuItem value="pobyt">Doklad o povolení na pobyt</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Číslo dokladu"
                            value={editSecondDriver.idNumber || ''}
                            onChange={(e) => setEditSecondDriver(prev => ({ ...prev, idNumber: e.target.value }))}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Telefón"
                            value={editSecondDriver.phone || ''}
                            onChange={(e) => setEditSecondDriver(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Číslo vodičského preukazu"
                            value={editSecondDriver.licenseNumber || ''}
                            onChange={(e) => setEditSecondDriver(prev => ({ ...prev, licenseNumber: e.target.value }))}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={sk}>
                            <DatePicker
                              label="Dátum narodenia"
                              value={editSecondDriver.dateOfBirth ? new Date(editSecondDriver.dateOfBirth) : null}
                              onChange={(date) => setEditSecondDriver(prev => ({ ...prev, dateOfBirth: date }))}
                              slotProps={{ textField: { fullWidth: true } }}
                            />
                          </LocalizationProvider>
                        </Grid>
                      </>
                    )}

                    {/* Address */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>Adresa</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Ulica"
                        value={editCustomerData.address?.street || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Mesto"
                        value={editCustomerData.address?.city || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="PSČ"
                        value={editCustomerData.address?.zipCode || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, address: { ...prev.address, zipCode: e.target.value } }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Krajina"
                        value={editCustomerData.address?.country || ''}
                        onChange={(e) => setEditCustomerData(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
                      />
                    </Grid>
                  </Grid>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit}>Zrušiť</Button>
            <Button
              onClick={handleEditSave}
              variant="contained"
              disabled={updatingReservation || updatingUser || editReservationLoading}
            >
              {(updatingReservation || updatingUser) ? <CircularProgress size={20} /> : 'Uložiť zmeny'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}

export default Contracts