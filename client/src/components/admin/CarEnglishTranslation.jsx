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
  const [updateCarEnglish, { isLoading, isSuccess, isError, error, reset }] =
    useUpdateCarEnglishMutation();

  useEffect(() => {
    if (car && open) {
      setDescriptionEn(car.descriptionEn || '');
    }
  }, [car, open]);

  useEffect(() => {
    if (!open) {
      // Reset mutation state when dialog closes
      reset();
    }
  }, [open, reset]);

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
