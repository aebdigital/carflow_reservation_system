import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Alert
} from '@mui/material';

const DamageModal = ({ open, onClose, onSubmit, damage = null, mode = 'add' }) => {
  const [formData, setFormData] = useState({
    description: '',
    severity: '',
    location: '',
    cost: '',
    repaired: false,
    repairedDate: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (damage && mode === 'edit') {
      setFormData({
        description: damage.description || '',
        severity: damage.severity || '',
        location: damage.location || '',
        cost: damage.cost || '',
        repaired: damage.repaired || false,
        repairedDate: damage.repairedDate ? damage.repairedDate.split('T')[0] : ''
      });
    } else {
      setFormData({
        description: '',
        severity: '',
        location: '',
        cost: '',
        repaired: false,
        repairedDate: ''
      });
    }
    setErrors({});
  }, [damage, mode, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Remove all required field validations - make all fields optional
    // Only keep basic format validations for fields that are provided
    
    if (formData.cost && isNaN(parseFloat(formData.cost))) {
      newErrors.cost = 'Neplatná suma';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const damageData = {
      description: formData.description.trim(),
      severity: formData.severity,
      location: formData.location.trim(),
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      repaired: formData.repaired,
      repairedDate: formData.repaired && formData.repairedDate ? formData.repairedDate : undefined
    };

    onSubmit(damageData);
    onClose();
  };

  const severityOptions = [
    { value: 'minor', label: 'Menšie', color: '#4caf50' },
    { value: 'moderate', label: 'Stredné', color: '#ff9800' },
    { value: 'major', label: 'Vážne', color: '#f44336' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'edit' ? 'Upraviť poškodenie' : 'Pridať poškodenie'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Popis poškodenia"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.severity}>
                <InputLabel>Závažnosť</InputLabel>
                <Select
                  value={formData.severity}
                  onChange={(e) => handleChange('severity', e.target.value)}
                  label="Závažnosť"
                >
                  {severityOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: option.color
                          }}
                        />
                        {option.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.severity && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                    {errors.severity}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Miesto poškodenia"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="napr. Predný nárazník, Zadné dvere..."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Odhadovaná cena opravy"
                type="number"
                value={formData.cost}
                onChange={(e) => handleChange('cost', e.target.value)}
                error={!!errors.cost}
                helperText={errors.cost}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.repaired}
                    onChange={(e) => handleChange('repaired', e.target.checked)}
                  />
                }
                label="Poškodenie je opravené"
              />
            </Grid>

            {formData.repaired && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dátum opravy"
                  type="date"
                  value={formData.repairedDate}
                  onChange={(e) => handleChange('repairedDate', e.target.value)}
                  error={!!errors.repairedDate}
                  helperText={errors.repairedDate}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Poškodenie bude zaznamenané s aktuálnym dátumom a priradené k vašemu účtu.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zrušiť</Button>
        <Button onClick={handleSubmit} variant="contained">
          {mode === 'edit' ? 'Uložiť' : 'Pridať'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DamageModal; 