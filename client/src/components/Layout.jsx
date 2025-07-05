import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  DirectionsCar as CarsIcon,
  BookOnline as ReservationsIcon,
  People as CustomersIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
  Campaign as CampaignIcon,
  Description as ContractIcon,
  Language as WebsiteIcon,
  EventNote as ReservationsIcon,
  Extension as ServicesIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material'
import { selectCurrentUser } from '../store/authSlice'
import { useLogoutMutation } from '../store/store'
import { t } from '../utils/translations'
import logo from '../assets/images/logo.png'
import { api } from '../store/store'
import { clearStateOnLogout } from '../store/authSlice'

const drawerWidth = 280

const menuItems = [
  { text: t('dashboard'), icon: <DashboardIcon />, path: '/' },
  { text: t('reservations'), icon: <ReservationsIcon />, path: '/reservations' },
  { text: t('fleetManagement'), icon: <CarsIcon />, path: '/cars' },
  { text: 'Doplnkové služby', icon: <ServicesIcon />, path: '/additional-services' },
  { text: t('customers'), icon: <CustomersIcon />, path: '/customers' },
  { text: t('calendar'), icon: <CalendarIcon />, path: '/calendar' },
  { text: t('payments'), icon: <PaymentsIcon />, path: '/payments' },
  { text: t('campaigns'), icon: <CampaignIcon />, path: '/campaigns' },
  { text: t('contracts'), icon: <ContractIcon />, path: '/contracts' },
  { text: 'Webstránka', icon: <WebsiteIcon />, path: '/website' },
  { text: t('settings'), icon: <SettingsIcon />, path: '/settings' },
]

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useSelector(selectCurrentUser)
  const [logoutUser] = useLogoutMutation()
  const dispatch = useDispatch()
  
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    try {
      // Step 1: Clear RTK Query cache immediately
      dispatch(api.util.resetApiState())
      
      // Step 2: Clear auth state
      dispatch(clearStateOnLogout())
      
      // Step 3: Call server logout (this will also clear cache again)
      await logoutUser().unwrap()
    } catch (error) {
      // Even if server logout fails, local state is already cleared
      console.log('Logout completed locally')
    }
    
    // Step 4: Force navigation and close menu
    navigate('/login', { replace: true })
    handleProfileMenuClose()
    
    // Step 5: Force page reload as final safeguard (optional - remove if not needed)
    // setTimeout(() => window.location.reload(), 100)
  }

  const handleNavigation = (path) => {
    navigate(path)
    if (mobileOpen) {
      setMobileOpen(false)
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error'
      case 'staff':
        return 'warning'
      default:
        return 'default'
    }
  }

  const drawer = (
    <Box 
      sx={{ 
        height: '100%',
        backgroundColor: 'white',
        color: 'text.primary'
      }}
    >
      <Box sx={{ 
        p: '25px', 
        textAlign: 'center', 
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box 
          sx={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img 
            src={logo} 
            alt="CarFlow Logo" 
            style={{ 
              maxWidth: '200px',
              maxHeight: '100px',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
          }}
          />
        </Box>
      </Box>
      
      <List sx={{ px: 2, py: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path
          return (
            <ListItem
              key={item.text}
              onClick={() => handleNavigation(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                background: isSelected ? 'linear-gradient(135deg, rgb(25, 118, 210) 0%, rgb(100, 181, 246) 100%)' : 'transparent',
                color: isSelected ? 'white' : 'text.primary',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 4px 12px rgba(25, 118, 210, 0.3)' : 'none',
                '&:hover': {
                  background: isSelected ? 'linear-gradient(135deg, rgb(21, 101, 192) 0%, rgb(79, 172, 254) 100%)' : 'rgba(0, 0, 0, 0.04)',
                  boxShadow: isSelected ? '0 6px 16px rgba(25, 118, 210, 0.4)' : 'none',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <ListItemIcon sx={{ 
                color: isSelected ? 'white' : 'text.primary', 
                minWidth: 40,
                transition: 'color 0.2s ease-in-out',
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontSize: '0.9rem',
                  fontWeight: isSelected ? 600 : 500,
                  fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
                  transition: 'all 0.2s ease-in-out',
                }}
              />
            </ListItem>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          borderRadius: 0,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600,
                  fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif'
                }}>
                  {user.firstName} {user.lastName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                  <Typography variant="caption" color="text.secondary" sx={{
                    fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif'
                  }}>
                    {user.email}
                  </Typography>
                  <Chip 
                    label={t(user.role?.toLowerCase() || 'customer').toUpperCase()} 
                    size="small" 
                    color={getRoleColor(user.role)}
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem',
                      fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
                      fontWeight: 500
                    }}
                  />
                </Box>
              </Box>
              
              <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </Avatar>
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: { mt: 1, minWidth: 200 }
        }}
      >
        <MenuItem onClick={() => { handleNavigation('/profile'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <AccountIcon fontSize="small" />
          </ListItemIcon>
          {t('profile')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {t('logout')}
        </MenuItem>
      </Menu>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: 'white',
              border: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: 'white',
              borderRight: '1px solid #e0e0e0',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8, // AppBar height
          backgroundColor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}

export default Layout 