import React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/material'
import { Settings as SettingsIcon } from '@mui/icons-material'

function Settings() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure system settings, business rules, and application preferences.
      </Typography>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <SettingsIcon sx={{ fontSize: 100, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            System Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will contain system configuration options including:
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • Business hours and operational settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Pricing rules and tax configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Notification preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • User roles and permissions
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Settings 