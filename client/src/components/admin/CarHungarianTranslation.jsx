import React, { useState, useEffect } from 'react';
import {
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import TranslationDialog from './TranslationDialog';
import { useUpdateCarHungarianMutation } from '../../store/store';

const CarHungarianTranslation = ({ car, open, onClose }) => {
  const [descriptionHu, setDescriptionHu] = useState('');
  const [updateCarHungarian, { isLoading, isSuccess, isError, error, reset }] =
    useUpdateCarHungarianMutation();

  useEffect(() => {
    if (car && open) {
      setDescriptionHu(car.descriptionHu || '');
    }
  }, [car, open]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => onClose(), 1500);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!car) return;
    try {
      await updateCarHungarian({ id: car._id, descriptionHu }).unwrap();
    } catch (err) {
      console.error('Failed to update Hungarian translation:', err);
    }
  };

  if (!car) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title={`Magyar fordítás - ${car.brand} ${car.model}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit}>
        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Magyar fordítás sikeresen mentve!
          </Alert>
        )}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error?.data?.message || 'Mentés sikertelen'}
          </Alert>
        )}

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          🇸🇰 Szlovák leírás (eredeti)
        </Typography>
        <Box p={2} bgcolor="grey.100" borderRadius={1} mb={3}>
          <Typography variant="body2">{car.description || '—'}</Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          🇭🇺 Magyar leírás
        </Typography>
        <Box
          component="textarea"
          value={descriptionHu}
          onChange={(e) => setDescriptionHu(e.target.value)}
          placeholder="Írja be a jármű magyar leírását..."
          maxLength={1000}
          rows={6}
          sx={{
            width: '100%',
            p: 1.5,
            fontSize: '14px',
            fontFamily: 'inherit',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {descriptionHu.length}/1000 karakter
        </Typography>

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

export default CarHungarianTranslation;
