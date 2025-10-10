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
