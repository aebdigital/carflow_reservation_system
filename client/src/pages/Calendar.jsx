import React, { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar
} from '@mui/material'
import {
  CalendarToday as CalendarIcon,
  DirectionsCar as CarIcon,
  Build as MaintenanceIcon,
  BookOnline as ReservationIcon,
  FilterList as FilterIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  ViewWeek as WeekIcon,
  ViewModule as MonthIcon,
  CalendarMonth as SubscribeIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon
} from '@mui/icons-material'
import {
  useGetCarsQuery,
  useGetReservationsQuery,
  useCreateCalendarTokenMutation,
  useGetCalendarTokensQuery
} from '../store/store'
import { t } from '../utils/translations'

// NitraCar email for feature visibility
const NITRACAR_EMAIL = 'nitra-car@nitra-car.sk'

function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'month', 'week'
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCarType, setFilterCarType] = useState('all')
  const [filterCar, setFilterCar] = useState('all')

  // Calendar subscription state (NitraCar only)
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false)
  const [subscriptionUrl, setSubscriptionUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)

  // Get current user from Redux store
  const { user } = useSelector((state) => state.auth)
  const isNitraCar = user?.email?.toLowerCase() === NITRACAR_EMAIL.toLowerCase()

  // API hooks
  const {
    data: carsData,
    isLoading: carsLoading,
    error: carsError
  } = useGetCarsQuery({})

  const {
    data: reservationsData,
    isLoading: reservationsLoading,
    error: reservationsError
  } = useGetReservationsQuery({ populate: 'customer,car' })

  // Calendar subscription hooks (NitraCar only)
  const [createCalendarToken, { isLoading: isCreatingToken }] = useCreateCalendarTokenMutation()
  const { data: existingTokens } = useGetCalendarTokensQuery(undefined, { skip: !isNitraCar })

  const cars = carsData?.data || []
  const reservations = reservationsData?.data || []

  // Calendar navigation
  const navigateCalendar = (direction) => {
    const newDate = new Date(selectedDate)
    if (viewMode === 'month') {
      newDate.setMonth(selectedDate.getMonth() + direction)
    } else {
      newDate.setDate(selectedDate.getDate() + (direction * 7))
    }
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  // Get calendar data
  const getCalendarData = useMemo(() => {
    const startDate = new Date(selectedDate)
    const endDate = new Date(selectedDate)

    if (viewMode === 'month') {
      // Include days from previous and next month for full calendar grid
      startDate.setDate(1)
      const firstDayOfWeek = startDate.getDay()
      startDate.setDate(startDate.getDate() - firstDayOfWeek)
      
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0)
      const lastDayOfWeek = endDate.getDay()
      endDate.setDate(endDate.getDate() + (6 - lastDayOfWeek))
    } else {
      // Week view
      const startOfWeek = selectedDate.getDate() - selectedDate.getDay()
      startDate.setDate(startOfWeek)
      endDate.setDate(startOfWeek + 6)
    }

    // Filter cars based on selected filters
    let filteredCars = cars
    if (filterStatus !== 'all') {
      filteredCars = filteredCars.filter(car => car.status === filterStatus)
    }
    if (filterCarType !== 'all') {
      filteredCars = filteredCars.filter(car => car.category === filterCarType)
    }
    if (filterCar !== 'all') {
      filteredCars = filteredCars.filter(car => car._id === filterCar)
    }

    // Get reservations for the date range
    const relevantReservations = reservations.filter(reservation => {
      const resStart = new Date(reservation.startDate)
      const resEnd = new Date(reservation.endDate)
      
      // Exclude cancelled reservations from calendar
      if (reservation.status === 'cancelled') {
        return false
      }
      
      // If car filter is active, only show reservations for that car
      if (filterCar !== 'all' && reservation.car?._id !== filterCar) {
        return false
      }
      
      return (resStart <= endDate && resEnd >= startDate)
    })

    return {
      cars: filteredCars,
      reservations: relevantReservations,
      startDate,
      endDate
    }
  }, [selectedDate, viewMode, cars, reservations, filterStatus, filterCarType, filterCar])

  // Generate calendar days (including previous/next month days)
  const generateCalendarDays = () => {
    const { startDate, endDate } = getCalendarData
    const days = []
    const current = new Date(startDate)
    const currentMonth = selectedDate.getMonth()

    while (current <= endDate) {
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === currentMonth,
        isToday: current.toDateString() === new Date().toDateString()
      })
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  // Get car status for a specific date
  const getCarStatusForDate = (car, date) => {
    const reservation = reservations.find(res => {
      const startDate = new Date(res.startDate)
      const endDate = new Date(res.endDate)
      return res.car?._id === car._id && 
             date >= startDate && 
             date <= endDate &&
             ['confirmed', 'ongoing'].includes(res.status) &&
             res.status !== 'cancelled'
    })

    if (reservation) {
      return {
        status: 'reserved',
        reservation,
        color: 'primary'
      }
    }

    // Check if car is in maintenance (you can extend this logic)
    if (car.status === 'unavailable') {
      return {
        status: 'unavailable',
        color: 'warning'
      }
    }

    if (car.status === 'archived') {
      return {
        status: 'archived',
        color: 'error'
      }
    }

    return {
      status: 'active',
      color: 'success'
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      reserved: 'primary',
      unavailable: 'warning',
      archived: 'error',
      booked: 'info'
    }
    return colors[status] || 'default'
  }

  // Get unique car categories for filter
  const carCategories = [...new Set(cars.map(car => car.category))].filter(Boolean)

  const calendarDays = generateCalendarDays()

  // Calendar subscription handlers (NitraCar only)
  const handleOpenSubscribeDialog = async () => {
    try {
      const result = await createCalendarToken('NitraCar Calendar').unwrap()
      if (result?.data?.urls?.https) {
        setSubscriptionUrl(result.data.urls.https)
        setSubscribeDialogOpen(true)
      }
    } catch (error) {
      console.error('Error creating calendar token:', error)
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(subscriptionUrl)
      setCopied(true)
      setSnackbarOpen(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const handleCloseSubscribeDialog = () => {
    setSubscribeDialogOpen(false)
    setSubscriptionUrl('')
    setCopied(false)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            {t('calendar')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('trackAllocations')}
          </Typography>
        </Box>

        {/* Calendar Subscription Button - NitraCar only */}
        {isNitraCar && (
          <Button
            variant="outlined"
            startIcon={<SubscribeIcon />}
            onClick={handleOpenSubscribeDialog}
            disabled={isCreatingToken}
          >
            {isCreatingToken ? 'Generujem...' : 'Pridať do Apple Calendar'}
          </Button>
        )}
      </Box>

      {/* Calendar Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigateCalendar(-1)}>
                  <PrevIcon />
                </IconButton>
                
                <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 200, textAlign: 'center' }}>
                  {selectedDate.toLocaleDateString('sk-SK', { 
                    year: 'numeric',
                    month: 'long',
                    ...(viewMode === 'week' && { day: 'numeric' })
                  })}
                </Typography>
                
                <IconButton onClick={() => navigateCalendar(1)}>
                  <NextIcon />
                </IconButton>
                
                <Button
                  variant="outlined"
                  onClick={goToToday}
                  startIcon={<TodayIcon />}
                  size="small"
                >
                  {t('today')}
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {/* View Mode Toggle */}
                <Box sx={{ display: 'flex', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Button
                    variant={viewMode === 'month' ? 'contained' : 'text'}
                    onClick={() => setViewMode('month')}
                    startIcon={<MonthIcon />}
                    size="small"
                    sx={{ borderRadius: 0 }}
                  >
                    {t('month')}
                  </Button>
                  <Button
                    variant={viewMode === 'week' ? 'contained' : 'text'}
                    onClick={() => setViewMode('week')}
                    startIcon={<WeekIcon />}
                    size="small"
                    sx={{ borderRadius: 0 }}
                  >
                    {t('week')}
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon />
            Filtre
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>{t('status')}</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label={t('status')}
              >
                <MenuItem value="all">Všetky stavy</MenuItem>
                <MenuItem value="active">{t('available')}</MenuItem>
                <MenuItem value="booked">{t('booked')}</MenuItem>
                <MenuItem value="unavailable">{t('maintenance')}</MenuItem>
                <MenuItem value="archived">{t('outOfService')}</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>{t('category')}</InputLabel>
              <Select
                value={filterCarType}
                onChange={(e) => setFilterCarType(e.target.value)}
                label={t('category')}
              >
                <MenuItem value="all">Všetky kategórie</MenuItem>
                {carCategories.map(category => (
                  <MenuItem key={category} value={category}>
                    {t(category.toLowerCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Auto</InputLabel>
              <Select
                value={filterCar}
                onChange={(e) => setFilterCar(e.target.value)}
                label="Auto"
              >
                <MenuItem value="all">Všetky autá</MenuItem>
                {cars.map(car => (
                  <MenuItem key={car._id} value={car._id}>
                    {car.brand} {car.model} ({car.registrationNumber})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>


      {/* Loading/Error States */}
      {(carsLoading || reservationsLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {(carsError || reservationsError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Chyba pri načítaní údajov: {carsError?.message || reservationsError?.message}
        </Alert>
      )}

      {/* Calendar Grid */}
      {!carsLoading && !reservationsLoading && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {viewMode === 'month' ? (
              // Month View - Google Calendar Style
              <Box>
                {/* Calendar Header - Days of Week */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  borderBottom: 1,
                  borderColor: 'divider',
                  backgroundColor: 'grey.50'
                }}>
                  {['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'].map(day => (
                    <Box key={day} sx={{ p: 2, textAlign: 'center', borderRight: 1, borderColor: 'divider' }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: 600, 
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          fontSize: '0.75rem'
                        }}
                      >
                        {day}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Calendar Days Grid - Google Calendar Style */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gridTemplateRows: `repeat(${Math.ceil(calendarDays.length / 7)}, 1fr)`,
                  minHeight: '600px'
                }}>
                  {calendarDays.map((day, index) => {
                    const reservationsForDay = getCalendarData.reservations.filter(res => {
                      const startDate = new Date(res.startDate)
                      const endDate = new Date(res.endDate)
                      return day.date >= startDate && day.date <= endDate
                    })

                    return (
                      <Box
                        key={index}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderTop: 0,
                          borderLeft: index % 7 === 0 ? 1 : 0,
                          p: 1,
                          minHeight: '120px',
                          position: 'relative',
                          backgroundColor: day.isCurrentMonth 
                            ? (day.isToday ? 'primary.50' : 'background.paper')
                            : 'grey.25',
                          '&:hover': {
                            backgroundColor: day.isCurrentMonth 
                              ? (day.isToday ? 'primary.100' : 'grey.50')
                              : 'grey.50'
                          },
                          cursor: 'pointer'
                        }}
                      >
                        {/* Day Number */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: day.isToday ? 'center' : 'flex-start',
                          mb: 1 
                        }}>
                          <Box
                            sx={{
                              width: day.isToday ? 28 : 'auto',
                              height: day.isToday ? 28 : 'auto',
                              borderRadius: day.isToday ? '50%' : 0,
                              backgroundColor: day.isToday ? 'primary.main' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 20
                            }}
                          >
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: day.isToday ? 600 : (day.isCurrentMonth ? 500 : 400),
                                color: day.isToday 
                                  ? 'white' 
                                  : (day.isCurrentMonth ? 'text.primary' : 'text.disabled'),
                                fontSize: '0.875rem'
                              }}
                            >
                              {day.date.getDate()}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Reservations for this day */}
                        <Stack spacing={0.25} sx={{ maxHeight: '80px', overflow: 'hidden' }}>
                          {reservationsForDay.slice(0, 4).map(reservation => {
                            const startDate = new Date(reservation.startDate)
                            const endDate = new Date(reservation.endDate)
                            const isStartDay = startDate.toDateString() === day.date.toDateString()
                            const isEndDay = endDate.toDateString() === day.date.toDateString()
                            const isMultiDay = startDate.toDateString() !== endDate.toDateString()
                            
                            return (
                              <Tooltip
                                key={reservation._id}
                                title={
                                  <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                      {reservation.car?.brand} {reservation.car?.model}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      Zákazník: {reservation.customer?.firstName} {reservation.customer?.lastName}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      {startDate.toLocaleDateString('sk-SK')} - {endDate.toLocaleDateString('sk-SK')}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      Stav: {t(reservation.status)}
                                    </Typography>
                                  </Box>
                                }
                                placement="top"
                              >
                                <Box
                                  sx={{
                                    backgroundColor: getStatusColor(reservation.status) === 'primary' ? 'primary.main' :
                                                   getStatusColor(reservation.status) === 'success' ? 'success.main' :
                                                   getStatusColor(reservation.status) === 'warning' ? 'warning.main' :
                                                   getStatusColor(reservation.status) === 'error' ? 'error.main' : 'info.main',
                                    color: 'white',
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: 1,
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    position: 'relative',
                                    cursor: 'pointer',
                                    '&:hover': {
                                      opacity: 0.8
                                    },
                                    // Visual indicators for multi-day events
                                    borderTopLeftRadius: isStartDay || !isMultiDay ? 1 : 0,
                                    borderBottomLeftRadius: isStartDay || !isMultiDay ? 1 : 0,
                                    borderTopRightRadius: isEndDay || !isMultiDay ? 1 : 0,
                                    borderBottomRightRadius: isEndDay || !isMultiDay ? 1 : 0,
                                  }}
                                >
                                  <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem' }}>
                                    {reservation.car?.brand} {reservation.car?.model}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            )
                          })}
                          
                          {/* Show "X more" if there are more reservations */}
                          {reservationsForDay.length > 4 && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', pl: 0.75 }}>
                              +{reservationsForDay.length - 4} ďalších
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            ) : (
              // Week View - Table Format
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Car</TableCell>
                      {calendarDays.map(day => (
                        <TableCell key={day.date.toISOString()} align="center">
                          <Box>
                            <Typography variant="caption" display="block">
                              {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {day.date.getDate()}
                            </Typography>
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getCalendarData.cars.map(car => (
                      <TableRow key={car._id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                              <CarIcon fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {car.brand} {car.model}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {car.registrationNumber}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        {calendarDays.map(day => {
                          const dayStatus = getCarStatusForDate(car, day.date)
                          return (
                            <TableCell key={day.date.toISOString()} align="center">
                              <Chip
                                label={dayStatus.status}
                                color={dayStatus.color}
                                size="small"
                                sx={{ fontSize: '0.7rem', height: 24 }}
                              />
                              {dayStatus.reservation && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {dayStatus.reservation.customer?.firstName}
                                </Typography>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Legenda stavov
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={t('available')} color="success" size="small" />
            <Chip label="Rezervované" color="primary" size="small" />
            <Chip label={t('maintenance')} color="warning" size="small" />
            <Chip label={t('outOfService')} color="error" size="small" />
          </Box>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mt: 3, ml: 0 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {cars.filter(car => car.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dostupné autá
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <ReservationIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {reservations.filter(res => ['confirmed', 'ongoing'].includes(res.status) && res.status !== 'cancelled').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aktívne rezervácie
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <MaintenanceIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {cars.filter(car => car.status === 'unavailable').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    V údržbe
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <CarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {cars.filter(car => car.status === 'archived').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mimo prevádzky
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Calendar Subscription Dialog - NitraCar only */}
      {isNitraCar && (
        <>
          <Dialog
            open={subscribeDialogOpen}
            onClose={handleCloseSubscribeDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              Pridať kalendár do Apple Calendar
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Skopírujte tento odkaz a pridajte ho do Apple Calendar, Google Calendar alebo Outlook
                ako odber kalendára. Rezervácie sa budú automaticky synchronizovať.
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  URL pre odber kalendára:
                </Typography>
                <TextField
                  fullWidth
                  value={subscriptionUrl}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <IconButton onClick={handleCopyUrl} edge="end">
                        {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                      </IconButton>
                    )
                  }}
                  size="small"
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Ako pridať do Apple Calendar:
                </Typography>
                <Typography variant="body2" component="div">
                  1. Otvorte Apple Calendar<br />
                  2. Vyberte Súbor → Nový odber kalendára<br />
                  3. Prilepte skopírovaný odkaz<br />
                  4. Kliknite na Odoberať
                </Typography>
              </Alert>

              <Alert severity="warning">
                <Typography variant="body2">
                  Tento odkaz je súkromný. Nezdieľajte ho s inými osobami.
                </Typography>
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseSubscribeDialog}>
                Zavrieť
              </Button>
              <Button
                variant="contained"
                onClick={handleCopyUrl}
                startIcon={copied ? <CheckIcon /> : <CopyIcon />}
              >
                {copied ? 'Skopírované!' : 'Kopírovať URL'}
              </Button>
            </DialogActions>
          </Dialog>

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={3000}
            onClose={() => setSnackbarOpen(false)}
            message="URL skopírované do schránky"
          />
        </>
      )}
    </Box>
  )
}

export default Calendar 