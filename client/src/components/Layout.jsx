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
} from '@mui/icons-material'
import { selectCurrentUser } from '../store/authSlice'
import { useLogoutMutation } from '../store/store'
import { t } from '../utils/translations'
import logo from '../assets/images/logo.png'

const drawerWidth = 280

const menuItems = [
  { text: t('dashboard'), icon: <DashboardIcon />, path: '/' },
  { text: t('reservations'), icon: <ReservationsIcon />, path: '/reservations' },
  { text: t('fleetManagement'), icon: <CarsIcon />, path: '/cars' },
  { text: t('customers'), icon: <CustomersIcon />, path: '/customers' },
  { text: t('calendar'), icon: <CalendarIcon />, path: '/calendar' },
  { text: t('payments'), icon: <PaymentsIcon />, path: '/payments' },
  { text: t('campaigns'), icon: <CampaignIcon />, path: '/campaigns' },
  { text: t('contracts'), icon: <ContractIcon />, path: '/contracts' },
  { text: t('settings'), icon: <SettingsIcon />, path: '/settings' },
]

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useSelector(selectCurrentUser)
  const [logoutUser] = useLogoutMutation()
  
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
      // This will clear RTK Query cache and auth state automatically
      await logoutUser().unwrap()
    } catch (error) {
      // Even if server logout fails, local state will still be cleared
      console.log('Logout completed locally')
    }
    navigate('/login')
    handleProfileMenuClose()
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
    <Box>
      <Box sx={{ p: '25px', textAlign: 'center', borderBottom: 1, borderColor: 'divider' }}>
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
                backgroundColor: isSelected ? 'primary.main' : 'transparent',
                color: isSelected ? 'white' : 'inherit',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ color: isSelected ? 'white' : 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontSize: '0.9rem',
                  fontWeight: isSelected ? 600 : 400 
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
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {user.firstName} {user.lastName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                  <Chip 
                    label={t(user.role?.toLowerCase() || 'customer').toUpperCase()} 
                    size="small" 
                    color={getRoleColor(user.role)}
                    sx={{ height: 20, fontSize: '0.7rem' }}
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
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
              borderRight: '1px solid #e0e0e0'
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