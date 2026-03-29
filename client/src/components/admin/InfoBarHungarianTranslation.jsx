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
import { useUpdateInfoBarHungarianMutation } from '../../store/store';

const InfoBarHungarianTranslation = ({ infoBar, open, onClose }) => {
  const [textHu, setTextHu] = useState('');
  const [updateInfoBarHungarian, { isLoading, isSuccess, isError, error, reset }] =
    useUpdateInfoBarHungarianMutation();

  useEffect(() => {
    if (infoBar && open) setTextHu(infoBar.textHu || '');
  }, [infoBar, open]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (isSuccess) setTimeout(() => onClose(), 1500);
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!infoBar) return;
    try {
      await updateInfoBarHungarian({ textHu }).unwrap();
    } catch (err) {
      console.error('Failed to update Hungarian translation:', err);
    }
  };

  if (!infoBar) return null;

  return (
    <TranslationDialog open={open} onClose={onClose} title="Info Bar – Magyar fordítás">
      <form onSubmit={handleSubmit}>
        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>Magyar fordítás sikeresen mentve!</Alert>
        )}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error?.data?.message || 'Mentés sikertelen'}
          </Alert>
        )}

        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            🇸🇰 Szlovák szöveg (eredeti)
          </Typography>
          <Box p={2} bgcolor="grey.100" borderRadius={1}>
            <Typography variant="body2">{infoBar.text}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            🇭🇺 Magyar szöveg
          </Typography>
          <TextField
            fullWidth
            value={textHu}
            onChange={(e) => setTextHu(e.target.value)}
            placeholder="Adja meg a magyar fordítást..."
            helperText={`${textHu.length}/200 karakter`}
            inputProps={{ maxLength: 200 }}
          />
        </Box>

        <DialogActions>
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

export default InfoBarHungarianTranslation;
