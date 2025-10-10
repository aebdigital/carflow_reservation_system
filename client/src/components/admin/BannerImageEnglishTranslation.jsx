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
import { useUpdateBannerImageEnglishMutation } from '../../store/store';

const BannerImageEnglishTranslation = ({ image, bannerId, open, onClose, onSuccess }) => {
  const [altEn, setAltEn] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [updateBannerImageEnglish, { isLoading, isSuccess, isError, error }] =
    useUpdateBannerImageEnglishMutation();

  useEffect(() => {
    if (image) {
      setAltEn(image.altEn || '');
      setTitleEn(image.titleEn || '');
      setDescriptionEn(image.descriptionEn || '');
    }
  }, [image]);

  useEffect(() => {
    if (isSuccess) {
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isSuccess, onClose, onSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image || !bannerId) return;

    try {
      await updateBannerImageEnglish({
        bannerId,
        imageId: image._id,
        altEn,
        titleEn,
        descriptionEn,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update translation:', err);
    }
  };

  if (!image) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title={`English Translation - Banner Image`}
      maxWidth="md"
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
          {/* Image Preview */}
          <Grid item xs={12}>
            <Box
              component="img"
              src={image.url}
              alt={image.alt || 'Banner image'}
              sx={{
                width: '100%',
                maxHeight: 200,
                objectFit: 'cover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.300',
              }}
            />
          </Grid>

          {/* Slovak version for reference */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇸🇰 Slovak Version (Original)
            </Typography>
            <Box p={2} bgcolor="grey.100" borderRadius={1}>
              {image.alt && (
                <Typography variant="body2" gutterBottom>
                  <strong>Alt:</strong> {image.alt}
                </Typography>
              )}
              {image.title && (
                <Typography variant="body2" gutterBottom>
                  <strong>Title:</strong> {image.title}
                </Typography>
              )}
              {image.description && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Description:</strong> {image.description}
                </Typography>
              )}
              {!image.alt && !image.title && !image.description && (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  No Slovak content available
                </Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* English translations */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇬🇧 English Alt Text
            </Typography>
            <TextField
              fullWidth
              value={altEn}
              onChange={(e) => setAltEn(e.target.value)}
              placeholder="Enter English alt text..."
              helperText={`${altEn.length}/200 characters (for accessibility)`}
              inputProps={{ maxLength: 200 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇬🇧 English Title
            </Typography>
            <TextField
              fullWidth
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="Enter English title..."
              helperText={`${titleEn.length}/100 characters`}
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

export default BannerImageEnglishTranslation;
