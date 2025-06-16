import React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/material'
import { Settings as SettingsIcon } from '@mui/icons-material'
import { t } from '../utils/translations'

function Settings() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        {t('settings')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('configureSettings')}
      </Typography>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <SettingsIcon sx={{ fontSize: 100, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            {t('systemSettings')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('underDevelopment')}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • {t('businessHours')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • {t('pricingRules')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • {t('notifications')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • {t('userRoles')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Settings 