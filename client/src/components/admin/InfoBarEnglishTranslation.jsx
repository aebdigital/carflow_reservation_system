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
import { useUpdateInfoBarEnglishMutation } from '../../store/store';

const InfoBarEnglishTranslation = ({ infoBar, open, onClose }) => {
  const [textEn, setTextEn] = useState('');
  const [updateInfoBarEnglish, { isLoading, isSuccess, isError, error }] =
    useUpdateInfoBarEnglishMutation();

  useEffect(() => {
    if (infoBar) {
      setTextEn(infoBar.textEn || '');
    }
  }, [infoBar]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!infoBar) return;

    try {
      await updateInfoBarEnglish({ textEn }).unwrap();
    } catch (err) {
      console.error('Failed to update translation:', err);
    }
  };

  if (!infoBar) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title="Info Bar English Translation"
    >
      <form onSubmit={handleSubmit}>
        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Info bar English translation updated successfully!
          </Alert>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            ❌ {error?.data?.message || 'Failed to update translation'}
          </Alert>
        )}

        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            🇸🇰 Slovak Text (Original)
          </Typography>
          <Box p={2} bgcolor="grey.100" borderRadius={1}>
            <Typography variant="body2">{infoBar.text}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            🇬🇧 English Text
          </Typography>
          <TextField
            fullWidth
            value={textEn}
            onChange={(e) => setTextEn(e.target.value)}
            placeholder="Enter English translation..."
            helperText={`${textEn.length}/200 characters`}
            inputProps={{ maxLength: 200 }}
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

export default InfoBarEnglishTranslation;
