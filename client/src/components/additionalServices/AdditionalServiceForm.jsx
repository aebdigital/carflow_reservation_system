import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Avatar,
  Alert,
  Slider,
  Divider,
  Icon
} from '@mui/material';
import {
  PhotoCamera as PhotoIcon,
  Euro as EuroIcon,
  Info as InfoIcon,
  Palette as PaletteIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { HexColorPicker } from 'react-colorful';

function AdditionalServiceForm({
  formData,
  setFormData,
  dialogMode,
  selectedImage,
  imagePreview,
  onImageChange,
  categoryConfig,
  userEmail
}) {
  // Check if user is nitracar
  const isNitraCar = userEmail?.toLowerCase() === 'nitra-car@nitra-car.sk';
  const [activeTab, setActiveTab] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const vehicleCategories = [
    { value: 'economy', label: 'Ekonomická' },
    { value: 'compact', label: 'Kompaktná' },
    { value: 'midsize', label: 'Stredná' },
    { value: 'fullsize', label: 'Veľká' },
    { value: 'luxury', label: 'Luxusná' },
    { value: 'suv', label: 'SUV' },
    { value: 'minivan', label: 'Minivan' },
    { value: 'convertible', label: 'Kabriolet' },
    { value: 'sports', label: 'Športové' },
    { value: 'utility', label: 'Úžitkové' },
    { value: 'caravan', label: 'Obytné' },
    { value: 'motorcycle', label: 'Motorka' },
    { value: 'electric', label: 'Elektro' }
  ];

  const pricingTypes = [
    { value: 'fixed', label: 'Pevná cena', description: 'Jednorazový poplatok' },
    { value: 'per_day', label: 'Cena za deň', description: 'Počet dní × cena' },
    { value: 'per_km', label: 'Cena za km', description: 'Počet kilometrov × cena' },
    { value: 'percentage', label: 'Percentuálny poplatok', description: '% zo základnej ceny' }
  ];

  const iconOptions = [
    { value: '', label: 'Žiadna', icon: null },
    { value: 'extension', label: 'Rozšírenie', icon: 'extension' },
    { value: 'directions_car', label: 'Auto', icon: 'directions_car' },
    { value: 'security', label: 'Bezpečnosť', icon: 'security' },
    { value: 'schedule', label: 'Harmonogram', icon: 'schedule' },
    { value: 'local_shipping', label: 'Preprava', icon: 'local_shipping' },
    { value: 'family_restroom', label: 'Rodina', icon: 'family_restroom' },
    { value: 'settings', label: 'Nastavenia', icon: 'settings' },
    { value: 'navigation', label: 'Navigácia', icon: 'navigation' },
    { value: 'baby_changing_station', label: 'Detská stanica', icon: 'baby_changing_station' },
    { value: 'ac_unit', label: 'Klimatizácia', icon: 'ac_unit' },
    { value: 'wifi', label: 'WiFi', icon: 'wifi' },
    { value: 'bluetooth', label: 'Bluetooth', icon: 'bluetooth' },
    { value: 'electric_car', label: 'Elektromobil', icon: 'electric_car' }
  ];

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const keys = field.split('.');
      setFormData(prev => {
        const newData = { ...prev };
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
      });
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const renderBasicInfoTab = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Názov služby"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={dialogMode === 'view'}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="Kategória"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            disabled={dialogMode === 'view'}
            required
          >
            {Object.entries(categoryConfig).map(([key, config]) => (
              <MenuItem key={key} value={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {config.icon}
                  {config.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Popis služby"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            disabled={dialogMode === 'view'}
            multiline
            rows={3}
            helperText="Stručný popis služby, ktorý sa zobrazí zákazníkom"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="Ikona"
            value={formData.icon}
            onChange={(e) => handleChange('icon', e.target.value)}
            disabled={dialogMode === 'view'}
          >
            {iconOptions.map((iconOption) => (
              <MenuItem key={iconOption.value} value={iconOption.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {iconOption.icon ? (
                    <Icon>{iconOption.icon}</Icon>
                  ) : (
                    <Box sx={{ width: 24, height: 24 }} />
                  )}
                  {iconOption.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ position: 'relative' }}>
            <TextField
              fullWidth
              label="Farba"
              value={formData.color}
              disabled={dialogMode === 'view'}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <Button
                    variant="outlined"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    sx={{ 
                      minWidth: '100px',
                      backgroundColor: formData.color,
                      color: formData.color === '#ffffff' ? '#000' : '#fff',
                      border: 'none',
                      '&:hover': {
                        backgroundColor: formData.color,
                        opacity: 0.8,
                        border: 'none'
                      }
                    }}
                    disabled={dialogMode === 'view'}
                  >
                    {formData.color}
                  </Button>
                )
              }}
            />
            {showColorPicker && (
              <Box sx={{ 
                position: 'absolute', 
                top: '100%',
                left: 0,
                zIndex: 1000, 
                mt: 1,
                boxShadow: 3,
                borderRadius: 1,
                backgroundColor: 'white',
                p: 1
              }}>
                <Box
                  sx={{ 
                    position: 'fixed', 
                    top: 0, 
                    right: 0, 
                    bottom: 0, 
                    left: 0,
                    zIndex: 999
                  }}
                  onClick={() => setShowColorPicker(false)}
                />
                <HexColorPicker 
                  color={formData.color} 
                  onChange={(color) => handleChange('color', color)}
                />
              </Box>
            )}
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Obrázok služby
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {(imagePreview || formData.image?.url) && (
                  <Avatar
                    src={imagePreview || formData.image?.url}
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      backgroundColor: 'transparent' 
                    }}
                    variant="rounded"
                  />
                )}
                {dialogMode !== 'view' && (
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<PhotoIcon />}
                  >
                    {imagePreview || formData.image?.url ? 'Zmeniť obrázok' : 'Pridať obrázok'}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={onImageChange}
                    />
                  </Button>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Odporúčaný pomer strán: 1:1, maximálna veľkosť: 5MB
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                disabled={dialogMode === 'view'}
              />
            }
            label="Aktívna služba"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isPublic}
                onChange={(e) => handleChange('isPublic', e.target.checked)}
                disabled={dialogMode === 'view'}
              />
            }
            label="Zobrazovať v sekcii 'Naše služby'"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderPricingTab = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info" icon={<EuroIcon />}>
            Nastavte cenu a typ účtovania pre túto službu
          </Alert>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="Typ účtovania"
            value={formData.pricing.type}
            onChange={(e) => handleChange('pricing.type', e.target.value)}
            disabled={dialogMode === 'view'}
            required
          >
            {pricingTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                <Box>
                  <Typography variant="body1">{type.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {type.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Cena"
            type="number"
            value={formData.pricing.amount}
            onChange={(e) => handleChange('pricing.amount', parseFloat(e.target.value) || 0)}
            disabled={dialogMode === 'view'}
            required
            InputProps={{
              startAdornment: <InputAdornment position="start">€</InputAdornment>,
              inputProps: { min: 0, step: 0.01 }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Mena"
            value={formData.pricing.currency}
            onChange={(e) => handleChange('pricing.currency', e.target.value)}
            disabled={dialogMode === 'view'}
            helperText="Predvolená mena je EUR"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderAvailabilityTab = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info" icon={<SettingsIcon />}>
            Nastavte dostupnosť služby pre rôzne kategórie vozidiel
          </Alert>
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.availability.isGlobal}
                onChange={(e) => handleChange('availability.isGlobal', e.target.checked)}
                disabled={dialogMode === 'view'}
              />
            }
            label="Globálne dostupná (pre všetky vozidlá)"
          />
        </Grid>

        {!formData.availability.isGlobal && (
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Dostupná pre kategórie vozidiel</InputLabel>
              <Select
                multiple
                value={formData.availability.vehicleCategories}
                onChange={(e) => handleChange('availability.vehicleCategories', e.target.value)}
                disabled={dialogMode === 'view'}
                input={<OutlinedInput label="Dostupná pre kategórie vozidiel" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={vehicleCategories.find(cat => cat.value === value)?.label || value}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {vehicleCategories.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    <Checkbox
                      checked={formData.availability.vehicleCategories.indexOf(category.value) > -1}
                    />
                    <ListItemText primary={category.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderBehaviorTab = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info" icon={<ScheduleIcon />}>
            Nastavte správanie služby v procese rezervácie
          </Alert>
        </Grid>

        {/* Hide these behavior options for NitraCar - they manage this on frontend */}
        {!isNitraCar && (
          <>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.behavior.isAutoSelected}
                    onChange={(e) => handleChange('behavior.isAutoSelected', e.target.checked)}
                    disabled={dialogMode === 'view'}
                  />
                }
                label="Automaticky vybraté"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Služba bude automaticky označená pri rezervácii
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.behavior.isRequired}
                    onChange={(e) => handleChange('behavior.isRequired', e.target.checked)}
                    disabled={dialogMode === 'view'}
                  />
                }
                label="Povinná služba"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Zákazník nemôže zrušiť výber tejto služby
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.behavior.requiresApproval}
                    onChange={(e) => handleChange('behavior.requiresApproval', e.target.checked)}
                    disabled={dialogMode === 'view'}
                  />
                }
                label="Vyžaduje schválenie"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Služba musí byť schválená administrátorom
              </Typography>
            </Grid>
          </>
        )}

        {/* Max quantity field - hide for NitraCar (they use frontend quantity selection instead) */}
        {!isNitraCar && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Maximálne množstvo"
              type="number"
              value={formData.behavior.maxQuantity}
              onChange={(e) => handleChange('behavior.maxQuantity', parseInt(e.target.value) || 1)}
              disabled={dialogMode === 'view'}
              InputProps={{
                inputProps: { min: 1, max: 10 }
              }}
              helperText="Maximálny počet kusov na jednu rezerváciu"
            />
          </Grid>
        )}

        {/* Quantity selection toggle - only for NitraCar */}
        {isNitraCar && (
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom color="primary">
              Výber množstva na webe
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.behavior.allowQuantitySelection || false}
                  onChange={(e) => handleChange('behavior.allowQuantitySelection', e.target.checked)}
                  disabled={dialogMode === 'view'}
                  color="primary"
                />
              }
              label="Povoliť zákazníkovi vybrať množstvo (1-4 ks)"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Zákazník si bude môcť na webe vybrať počet kusov tejto služby (napr. 2x detská sedačka)
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderDynamicPricingTab = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info" icon={<TrendingUpIcon />}>
            Dynamická cena sa používa pre služby závislé od vzdialenosti
          </Alert>
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.dynamicPricing.isEnabled}
                onChange={(e) => handleChange('dynamicPricing.isEnabled', e.target.checked)}
                disabled={dialogMode === 'view'}
              />
            }
            label="Aktivovať dynamickú cenu"
          />
        </Grid>

        {formData.dynamicPricing.isEnabled && (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Základná cena"
                type="number"
                value={formData.dynamicPricing.basePrice}
                onChange={(e) => handleChange('dynamicPricing.basePrice', parseFloat(e.target.value) || 0)}
                disabled={dialogMode === 'view'}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cena za kilometer"
                type="number"
                value={formData.dynamicPricing.pricePerKm}
                onChange={(e) => handleChange('dynamicPricing.pricePerKm', parseFloat(e.target.value) || 0)}
                disabled={dialogMode === 'view'}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Minimálna cena"
                type="number"
                value={formData.dynamicPricing.minimumPrice}
                onChange={(e) => handleChange('dynamicPricing.minimumPrice', parseFloat(e.target.value) || 0)}
                disabled={dialogMode === 'view'}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Maximálna cena"
                type="number"
                value={formData.dynamicPricing.maximumPrice}
                onChange={(e) => handleChange('dynamicPricing.maximumPrice', parseFloat(e.target.value) || 0)}
                disabled={dialogMode === 'view'}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.dynamicPricing.useGoogleMapsAPI}
                    onChange={(e) => handleChange('dynamicPricing.useGoogleMapsAPI', e.target.checked)}
                    disabled={dialogMode === 'view'}
                  />
                }
                label="Použiť Google Maps API pre výpočet vzdialenosti"
              />
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );

  // For NitraCar, we have fewer tabs (no Dynamic Pricing tab)
  const nitraCarTabs = [
    { label: "Základné info", icon: <InfoIcon /> },
    { label: "Cena", icon: <EuroIcon /> },
    { label: "Dostupnosť", icon: <SettingsIcon /> },
    { label: "Správanie", icon: <ScheduleIcon /> }
  ];

  const defaultTabs = [
    { label: "Základné info", icon: <InfoIcon /> },
    { label: "Cena", icon: <EuroIcon /> },
    { label: "Dostupnosť", icon: <SettingsIcon /> },
    { label: "Správanie", icon: <ScheduleIcon /> },
    { label: "Dynamická cena", icon: <TrendingUpIcon /> }
  ];

  const tabs = isNitraCar ? nitraCarTabs : defaultTabs;

  // Map tab index to content for NitraCar (same order, just without dynamic pricing)
  const renderTabContent = () => {
    if (isNitraCar) {
      switch (activeTab) {
        case 0: return renderBasicInfoTab();
        case 1: return renderPricingTab();
        case 2: return renderAvailabilityTab();
        case 3: return renderBehaviorTab();
        default: return null;
      }
    } else {
      switch (activeTab) {
        case 0: return renderBasicInfoTab();
        case 1: return renderPricingTab();
        case 2: return renderAvailabilityTab();
        case 3: return renderBehaviorTab();
        case 4: return renderDynamicPricingTab();
        default: return null;
      }
    }
  };

  return (
    <Box>
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
        {tabs.map((tab, index) => (
          <Tab key={index} label={tab.label} icon={tab.icon} iconPosition="start" />
        ))}
      </Tabs>

      {renderTabContent()}
    </Box>
  );
}

export default AdditionalServiceForm; 