import React, { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Info as InfoIcon,
  OpenInNew as ModalIcon,
  LocalOffer as DiscountIcon,
  Image as BannerIcon,
  Article as BlogIcon,
} from '@mui/icons-material'
import InfoBarSettings from '../components/website/InfoBarSettings'
import ModalSettings from '../components/website/ModalSettings'
import DiscountCodes from '../components/website/DiscountCodes'
import BannerSettings from '../components/website/BannerSettings'
import BlogSettings from '../components/website/BlogSettings'
import { useGetWebsiteSettingsQuery } from '../store/store'

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`website-tabpanel-${index}`}
      aria-labelledby={`website-tab-${index}`}
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

function a11yProps(index) {
  return {
    id: `website-tab-${index}`,
    'aria-controls': `website-tabpanel-${index}`,
  }
}

export default function Website() {
  const [tabValue, setTabValue] = useState(0)
  
  const {
    data: websiteSettings,
    isLoading: settingsLoading,
    error: settingsError
  } = useGetWebsiteSettingsQuery()

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  if (settingsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (settingsError) {
    return (
      <Alert severity="error">
        Chyba pri načítavaní nastavení webstránky: {settingsError.message}
      </Alert>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Nastavenia Webstránky
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Spravujte vzhľad a funkcionalitu vašej webstránky vrátane info pásikov, modalov, bannerov a zľavových kódov.
        </Typography>
      </Box>

      <Paper sx={{ width: '100%', backgroundColor: 'white' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="website settings tabs"
            sx={{
              '& .MuiTab-root': {
                minHeight: 72,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
              }
            }}
          >
            <Tab 
              icon={<InfoIcon />} 
              label="Výstražná Lišta" 
              iconPosition="start"
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<ModalIcon />} 
              label="Vyskakujúce Okno" 
              iconPosition="start"
              {...a11yProps(1)} 
            />
            <Tab 
              icon={<BannerIcon />} 
              label="Bannery" 
              iconPosition="start"
              {...a11yProps(2)} 
            />
            <Tab 
              icon={<BlogIcon />} 
              label="Blog" 
              iconPosition="start"
              {...a11yProps(3)} 
            />
            <Tab 
              icon={<DiscountIcon />} 
              label="Zľavové Kódy" 
              iconPosition="start"
              {...a11yProps(4)} 
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <InfoBarSettings settings={websiteSettings?.data} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <ModalSettings settings={websiteSettings?.data} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <BannerSettings />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <BlogSettings />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <DiscountCodes />
        </TabPanel>
      </Paper>
    </Box>
  )
} 