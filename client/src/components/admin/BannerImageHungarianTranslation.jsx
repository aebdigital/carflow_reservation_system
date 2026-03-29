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
import { useUpdateBannerImageHungarianMutation } from '../../store/store';

const BannerImageHungarianTranslation = ({ image, bannerId, open, onClose, onSuccess }) => {
  const [altHu, setAltHu] = useState('');
  const [titleHu, setTitleHu] = useState('');
  const [descriptionHu, setDescriptionHu] = useState('');
  const [updateBannerImageHungarian, { isLoading, isSuccess, isError, error, reset }] =
    useUpdateBannerImageHungarianMutation();

  useEffect(() => {
    if (image && open) {
      setAltHu(image.altHu || '');
      setTitleHu(image.titleHu || '');
      setDescriptionHu(image.descriptionHu || '');
    }
  }, [image, open]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (isSuccess) {
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1500);
    }
  }, [isSuccess, onClose, onSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image || !bannerId) return;
    try {
      await updateBannerImageHungarian({
        bannerId,
        imageId: image._id,
        altHu,
        titleHu,
        descriptionHu,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update Hungarian translation:', err);
    }
  };

  if (!image) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title="Banner kép – Magyar fordítás"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit}>
        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>Magyar fordítás sikeresen mentve!</Alert>
        )}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error?.data?.message || 'Mentés sikertelen'}
          </Alert>
        )}

        <Grid container spacing={3}>
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

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇸🇰 Szlovák verzió (eredeti)
            </Typography>
            <Box p={2} bgcolor="grey.100" borderRadius={1}>
              {image.alt && <Typography variant="body2" gutterBottom><strong>Alt:</strong> {image.alt}</Typography>}
              {image.title && <Typography variant="body2" gutterBottom><strong>Cím:</strong> {image.title}</Typography>}
              {image.description && <Typography variant="body2" color="text.secondary"><strong>Leírás:</strong> {image.description}</Typography>}
              {!image.alt && !image.title && !image.description && (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">Nincs elérhető tartalom</Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇭🇺 Magyar alt szöveg
            </Typography>
            <TextField
              fullWidth
              value={altHu}
              onChange={(e) => setAltHu(e.target.value)}
              placeholder="Adja meg a magyar alt szöveget..."
              helperText={`${altHu.length}/200 karakter (akadálymentesítéshez)`}
              inputProps={{ maxLength: 200 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇭🇺 Magyar cím
            </Typography>
            <TextField
              fullWidth
              value={titleHu}
              onChange={(e) => setTitleHu(e.target.value)}
              placeholder="Adja meg a magyar címet..."
              helperText={`${titleHu.length}/100 karakter`}
              inputProps={{ maxLength: 100 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇭🇺 Magyar leírás
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={descriptionHu}
              onChange={(e) => setDescriptionHu(e.target.value)}
              placeholder="Adja meg a magyar leírást..."
              helperText={`${descriptionHu.length}/500 karakter`}
              inputProps={{ maxLength: 500 }}
            />
          </Grid>
        </Grid>

        <DialogActions sx={{ mt: 2 }}>
          <Button onClick={onClose} disabled={isLoading}>Mégse</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? 'Mentés...' : 'Fordítás mentése'}
          </Button>
        </DialogActions>
      </form>
    </TranslationDialog>
  );
};

export default BannerImageHungarianTranslation;
