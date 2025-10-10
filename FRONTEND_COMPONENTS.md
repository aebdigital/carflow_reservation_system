# 📦 Frontend Components for English Translations

## File Structure
```
client/src/
├── components/
│   └── admin/
│       ├── CarEnglishTranslation.jsx
│       ├── ServiceEnglishTranslation.jsx
│       ├── BlogEnglishTranslation.jsx
│       ├── InfoBarEnglishTranslation.jsx
│       ├── ModalEnglishTranslation.jsx
│       └── BannerImageEnglishTranslation.jsx
├── store/
│   └── store.js (add new mutations)
└── pages/
    └── admin/
        ├── CarsPage.jsx (add translation button)
        ├── ServicesPage.jsx (add translation button)
        └── BlogsPage.jsx (add translation button)
```

---

## 1. Update RTK Query Store

**File:** `client/src/store/store.js`

Add these mutations to your existing API:

```javascript
// Add to existing endpoints in your RTK Query API
export const api = createApi({
  // ... existing config ...
  endpoints: (builder) => ({

    // ... your existing endpoints ...

    // ========== ENGLISH TRANSLATION ENDPOINTS ==========

    // Cars
    updateCarEnglish: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `cars/${id}/english`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Cars'],
    }),

    // Additional Services
    updateServiceEnglish: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `additional-services/${id}/english`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Services'],
    }),

    // Blogs
    updateBlogEnglish: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `blogs/${id}/english`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Blogs'],
    }),

    // Info Bar
    updateInfoBarEnglish: builder.mutation({
      query: (body) => ({
        url: 'website/settings/info-bar/english',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),

    // Modals
    updateModalEnglish: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `website/modals/${id}/english`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),

    // Banner Images
    updateBannerImageEnglish: builder.mutation({
      query: ({ bannerId, imageId, ...body }) => ({
        url: `banners/${bannerId}/images/${imageId}/english`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Banners'],
    }),
  }),
});

// Export hooks
export const {
  // ... your existing hooks ...
  useUpdateCarEnglishMutation,
  useUpdateServiceEnglishMutation,
  useUpdateBlogEnglishMutation,
  useUpdateInfoBarEnglishMutation,
  useUpdateModalEnglishMutation,
  useUpdateBannerImageEnglishMutation,
} = api;
```

---

## 2. Reusable Translation Dialog Component

**File:** `client/src/components/admin/TranslationDialog.jsx`

```jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
} from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';

/**
 * Reusable translation dialog wrapper
 */
const TranslationDialog = ({ open, onClose, title, children, maxWidth = 'md' }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LanguageIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
};

export default TranslationDialog;
```

---

## 3. Car English Translation

**File:** `client/src/components/admin/CarEnglishTranslation.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import {
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import TranslationDialog from './TranslationDialog';
import { useUpdateCarEnglishMutation } from '../../store/store';

const CarEnglishTranslation = ({ car, open, onClose }) => {
  const [descriptionEn, setDescriptionEn] = useState('');
  const [updateCarEnglish, { isLoading, isSuccess, isError, error }] =
    useUpdateCarEnglishMutation();

  useEffect(() => {
    if (car) {
      setDescriptionEn(car.descriptionEn || '');
    }
  }, [car]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!car) return;

    try {
      await updateCarEnglish({
        id: car._id,
        descriptionEn,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update translation:', err);
    }
  };

  if (!car) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title={`English Translation - ${car.brand} ${car.model}`}
    >
      <form onSubmit={handleSubmit}>
        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ English translation updated successfully!
          </Alert>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            ❌ {error?.data?.message || 'Failed to update translation'}
          </Alert>
        )}

        {/* Show Slovak version for reference */}
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            🇸🇰 Slovak Description (Original)
          </Typography>
          <Box
            p={2}
            bgcolor="grey.100"
            borderRadius={1}
            maxHeight={150}
            overflow="auto"
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {car.description || 'No description available'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* English translation field */}
        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            🇬🇧 English Description
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            placeholder="Enter English translation..."
            helperText={`${descriptionEn.length}/1000 characters`}
            inputProps={{ maxLength: 1000 }}
          />
        </Box>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? 'Saving...' : 'Save Translation'}
          </Button>
        </DialogActions>
      </form>
    </TranslationDialog>
  );
};

export default CarEnglishTranslation;
```

---

## 4. Additional Service English Translation

**File:** `client/src/components/admin/ServiceEnglishTranslation.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import {
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  Grid,
} from '@mui/material';
import TranslationDialog from './TranslationDialog';
import { useUpdateServiceEnglishMutation } from '../../store/store';

const ServiceEnglishTranslation = ({ service, open, onClose }) => {
  const [nameEn, setNameEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [updateServiceEnglish, { isLoading, isSuccess, isError, error }] =
    useUpdateServiceEnglishMutation();

  useEffect(() => {
    if (service) {
      setNameEn(service.nameEn || '');
      setDescriptionEn(service.descriptionEn || '');
    }
  }, [service]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!service) return;

    try {
      await updateServiceEnglish({
        id: service._id,
        nameEn,
        descriptionEn,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update translation:', err);
    }
  };

  if (!service) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title={`English Translation - ${service.name}`}
    >
      <form onSubmit={handleSubmit}>
        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ English translation updated successfully!
          </Alert>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            ❌ {error?.data?.message || 'Failed to update translation'}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Slovak version for reference */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇸🇰 Slovak Version (Original)
            </Typography>
            <Box p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="body2" fontWeight="bold">
                {service.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {service.description}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* English translations */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇬🇧 English Name
            </Typography>
            <TextField
              fullWidth
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Enter English name..."
              helperText={`${nameEn.length}/100 characters`}
              inputProps={{ maxLength: 100 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇬🇧 English Description
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="Enter English description..."
              helperText={`${descriptionEn.length}/500 characters`}
              inputProps={{ maxLength: 500 }}
            />
          </Grid>
        </Grid>

        <DialogActions sx={{ mt: 2 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? 'Saving...' : 'Save Translation'}
          </Button>
        </DialogActions>
      </form>
    </TranslationDialog>
  );
};

export default ServiceEnglishTranslation;
```

---

## 5. Blog English Translation

**File:** `client/src/components/admin/BlogEnglishTranslation.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import {
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import TranslationDialog from './TranslationDialog';
import { useUpdateBlogEnglishMutation } from '../../store/store';

const BlogEnglishTranslation = ({ blog, open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [titleEn, setTitleEn] = useState('');
  const [slugEn, setSlugEn] = useState('');
  const [excerptEn, setExcerptEn] = useState('');
  const [contentEn, setContentEn] = useState('');

  const [updateBlogEnglish, { isLoading, isSuccess, isError, error }] =
    useUpdateBlogEnglishMutation();

  useEffect(() => {
    if (blog) {
      setTitleEn(blog.titleEn || '');
      setSlugEn(blog.slugEn || '');
      setExcerptEn(blog.excerptEn || '');
      setContentEn(blog.contentEn || '');
    }
  }, [blog]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!blog) return;

    try {
      await updateBlogEnglish({
        id: blog._id,
        titleEn,
        slugEn,
        excerptEn,
        contentEn,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update translation:', err);
    }
  };

  if (!blog) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title={`English Translation - ${blog.title}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit}>
        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ English translation updated successfully!
          </Alert>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            ❌ {error?.data?.message || 'Failed to update translation'}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Basic Info" />
          <Tab label="Content" />
        </Tabs>

        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Slovak version */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🇸🇰 Slovak Version (Original)
              </Typography>
              <Box p={2} bgcolor="grey.100" borderRadius={1}>
                <Typography variant="h6">{blog.title}</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Slug: {blog.slug}
                </Typography>
                <Typography variant="body2" mt={1}>
                  {blog.excerpt}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* English fields */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🇬🇧 English Title
              </Typography>
              <TextField
                fullWidth
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Enter English title..."
                helperText={`${titleEn.length}/200 characters`}
                inputProps={{ maxLength: 200 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🇬🇧 English Slug (URL)
              </Typography>
              <TextField
                fullWidth
                value={slugEn}
                onChange={(e) =>
                  setSlugEn(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                }
                placeholder="english-url-slug"
                helperText="Lowercase letters, numbers, and hyphens only"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🇬🇧 English Excerpt
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={excerptEn}
                onChange={(e) => setExcerptEn(e.target.value)}
                placeholder="Enter English excerpt..."
                helperText={`${excerptEn.length}/500 characters`}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇬🇧 English Content
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={15}
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              placeholder="Enter full English blog content..."
            />
          </Box>
        )}

        <DialogActions sx={{ mt: 2 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? 'Saving...' : 'Save Translation'}
          </Button>
        </DialogActions>
      </form>
    </TranslationDialog>
  );
};

export default BlogEnglishTranslation;
```

---

## 6. Translation Button Component

**File:** `client/src/components/admin/TranslationButton.jsx`

Reusable button for adding to tables/lists:

```jsx
import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';

const TranslationButton = ({ onClick, tooltip = 'English Translation' }) => {
  return (
    <Tooltip title={tooltip}>
      <IconButton color="primary" size="small" onClick={onClick}>
        <LanguageIcon />
      </IconButton>
    </Tooltip>
  );
};

export default TranslationButton;
```

---

## 7. Example: Integration in Admin Page

**File:** `client/src/pages/admin/CarsPage.jsx`

```jsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useGetCarsQuery } from '../../store/store';
import TranslationButton from '../../components/admin/TranslationButton';
import CarEnglishTranslation from '../../components/admin/CarEnglishTranslation';

const CarsPage = () => {
  const { data: carsData, isLoading } = useGetCarsQuery();
  const [translationDialog, setTranslationDialog] = useState({
    open: false,
    car: null,
  });

  const handleOpenTranslation = (car) => {
    setTranslationDialog({ open: true, car });
  };

  const handleCloseTranslation = () => {
    setTranslationDialog({ open: false, car: null });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Cars Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add New Car
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Brand</TableCell>
              <TableCell>Model</TableCell>
              <TableCell>Year</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Translation</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {carsData?.data?.map((car) => (
              <TableRow key={car._id}>
                <TableCell>{car.brand}</TableCell>
                <TableCell>{car.model}</TableCell>
                <TableCell>{car.year}</TableCell>
                <TableCell>{car.category}</TableCell>
                <TableCell>{car.status}</TableCell>
                <TableCell align="center">
                  <TranslationButton onClick={() => handleOpenTranslation(car)} />
                  {car.descriptionEn && (
                    <span style={{ marginLeft: 8, color: 'green' }}>✓</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Translation Dialog */}
      <CarEnglishTranslation
        car={translationDialog.car}
        open={translationDialog.open}
        onClose={handleCloseTranslation}
      />
    </Box>
  );
};

export default CarsPage;
```

---

## 8. Helper Function for Displaying Translations

**File:** `client/src/utils/translation.js`

```javascript
/**
 * Get translated text based on current language
 * @param {Object} item - The item with translations
 * @param {string} field - The field name (e.g., 'description')
 * @param {string} language - Current language ('SK' or 'EN')
 * @returns {string} - Translated text or fallback to Slovak
 */
export const getTranslatedField = (item, field, language) => {
  if (!item) return '';

  const enField = field + 'En';

  // If English is selected and English translation exists, use it
  if (language === 'EN' && item[enField]) {
    return item[enField];
  }

  // Otherwise fallback to Slovak
  return item[field] || '';
};

/**
 * Check if item has English translation for a field
 * @param {Object} item - The item to check
 * @param {string} field - The field name
 * @returns {boolean} - True if English translation exists
 */
export const hasEnglishTranslation = (item, field) => {
  if (!item) return false;
  const enField = field + 'En';
  return Boolean(item[enField]);
};

/**
 * Get translation completion percentage
 * @param {Object} item - The item to check
 * @param {Array<string>} fields - Fields to check
 * @returns {number} - Percentage (0-100)
 */
export const getTranslationProgress = (item, fields) => {
  if (!item || !fields.length) return 0;

  const translatedCount = fields.filter(field =>
    hasEnglishTranslation(item, field)
  ).length;

  return Math.round((translatedCount / fields.length) * 100);
};
```

**Usage:**

```jsx
import { getTranslatedField, getTranslationProgress } from '../utils/translation';
import { useLanguage } from '../contexts/LanguageContext';

function CarCard({ car }) {
  const { language } = useLanguage();

  const description = getTranslatedField(car, 'description', language);
  const progress = getTranslationProgress(car, ['description']);

  return (
    <div>
      <h3>{car.brand} {car.model}</h3>
      <p>{description}</p>
      {progress < 100 && <span>Translation: {progress}%</span>}
    </div>
  );
}
```

---

## 9. Translation Progress Indicator

**File:** `client/src/components/admin/TranslationProgress.jsx`

```jsx
import React from 'react';
import { Box, LinearProgress, Typography, Chip } from '@mui/material';
import { CheckCircle, Warning } from '@mui/icons-material';

const TranslationProgress = ({ item, fields }) => {
  const calculateProgress = () => {
    const translatedCount = fields.filter(field => {
      const enField = field + 'En';
      return Boolean(item[enField]);
    }).length;

    return Math.round((translatedCount / fields.length) * 100);
  };

  const progress = calculateProgress();
  const isComplete = progress === 100;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant="body2" color="text.secondary">
          Translation Progress
        </Typography>
        {isComplete ? (
          <Chip
            icon={<CheckCircle />}
            label="Complete"
            color="success"
            size="small"
          />
        ) : (
          <Chip
            icon={<Warning />}
            label={`${progress}%`}
            color="warning"
            size="small"
          />
        )}
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        color={isComplete ? 'success' : 'warning'}
      />
    </Box>
  );
};

export default TranslationProgress;
```

**Usage:**

```jsx
<TranslationProgress
  item={car}
  fields={['description']}
/>

<TranslationProgress
  item={service}
  fields={['name', 'description']}
/>

<TranslationProgress
  item={blog}
  fields={['title', 'slug', 'excerpt', 'content']}
/>
```

---

## 10. Quick Actions Menu

**File:** `client/src/components/admin/QuickTranslationMenu.jsx`

```jsx
import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Language as LanguageIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

const QuickTranslationMenu = ({ item, onTranslate, onViewOriginal, onCopyFromOriginal }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    action();
    handleClose();
  };

  return (
    <>
      <IconButton size="small" onClick={handleClick}>
        <MoreIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleAction(onTranslate)}>
          <ListItemIcon>
            <LanguageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Translation</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onViewOriginal)}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Original (SK)</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction(onCopyFromOriginal)}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy from Slovak</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default QuickTranslationMenu;
```

---

## 🎯 Complete Usage Example

Here's how everything ties together in a complete admin page:

```jsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { useGetAdditionalServicesQuery } from '../../store/store';
import TranslationButton from '../../components/admin/TranslationButton';
import ServiceEnglishTranslation from '../../components/admin/ServiceEnglishTranslation';
import TranslationProgress from '../../components/admin/TranslationProgress';
import { hasEnglishTranslation } from '../../utils/translation';

const ServicesPage = () => {
  const { data: servicesData } = useGetAdditionalServicesQuery();
  const [dialog, setDialog] = useState({ open: false, service: null });

  return (
    <Box p={3}>
      <h1>Additional Services</h1>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Service Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Translation Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {servicesData?.data?.map((service) => (
              <TableRow key={service._id}>
                <TableCell>{service.name}</TableCell>
                <TableCell>{service.category}</TableCell>
                <TableCell>€{service.pricing.amount}</TableCell>
                <TableCell>
                  <TranslationProgress
                    item={service}
                    fields={['name', 'description']}
                  />
                </TableCell>
                <TableCell align="center">
                  <TranslationButton
                    onClick={() => setDialog({ open: true, service })}
                  />
                  {hasEnglishTranslation(service, 'name') && (
                    <Chip label="EN" size="small" color="success" sx={{ ml: 1 }} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ServiceEnglishTranslation
        service={dialog.service}
        open={dialog.open}
        onClose={() => setDialog({ open: false, service: null })}
      />
    </Box>
  );
};

export default ServicesPage;
```

---

## ✅ Installation Checklist

1. **Copy all component files** to your project
2. **Update RTK Query** with new mutations
3. **Add translation buttons** to existing admin pages
4. **Test with nitra-car@nitra-car.sk** user
5. **Verify translations** appear on public website

---

**Ready to translate! 🚀**
