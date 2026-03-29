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
import { useUpdateServiceHungarianMutation } from '../../store/store';

const ServiceHungarianTranslation = ({ service, open, onClose }) => {
  const [nameHu, setNameHu] = useState('');
  const [descriptionHu, setDescriptionHu] = useState('');
  const [updateServiceHungarian, { isLoading, isSuccess, isError, error, reset }] =
    useUpdateServiceHungarianMutation();

  useEffect(() => {
    if (service && open) {
      setNameHu(service.nameHu || '');
      setDescriptionHu(service.descriptionHu || '');
    }
  }, [service, open]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (isSuccess) setTimeout(() => onClose(), 1500);
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!service) return;
    try {
      await updateServiceHungarian({ id: service._id, nameHu, descriptionHu }).unwrap();
    } catch (err) {
      console.error('Failed to update Hungarian translation:', err);
    }
  };

  if (!service) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title={`Magyar fordítás - ${service.name}`}
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

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇸🇰 Szlovák verzió (eredeti)
            </Typography>
            <Box p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="body2" fontWeight="bold">{service.name}</Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>{service.description}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇭🇺 Magyar név
            </Typography>
            <TextField
              fullWidth
              value={nameHu}
              onChange={(e) => setNameHu(e.target.value)}
              placeholder="Adja meg a magyar nevet..."
              helperText={`${nameHu.length}/100 karakter`}
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

export default ServiceHungarianTranslation;
