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
import { useUpdateModalEnglishMutation } from '../../store/store';

const ModalEnglishTranslation = ({ modal, open, onClose }) => {
  const [titleEn, setTitleEn] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [emailPlaceholderEn, setEmailPlaceholderEn] = useState('');
  const [buttonTextEn, setButtonTextEn] = useState('');
  const [secondaryButtonTextEn, setSecondaryButtonTextEn] = useState('');

  const [updateModalEnglish, { isLoading, isSuccess, isError, error, reset }] =
    useUpdateModalEnglishMutation();

  useEffect(() => {
    if (modal && open) {
      setTitleEn(modal.titleEn || '');
      setContentEn(modal.contentEn || '');
      setEmailPlaceholderEn(modal.emailPlaceholderEn || 'Enter your email');
      setButtonTextEn(modal.buttonTextEn || 'Get Discount');
      setSecondaryButtonTextEn(modal.secondaryButtonTextEn || 'Maybe Later');
    }
  }, [modal, open]);

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
    if (!modal) return;

    try {
      await updateModalEnglish({
        id: modal._id,
        titleEn,
        contentEn,
        emailPlaceholderEn,
        buttonTextEn,
        secondaryButtonTextEn,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update translation:', err);
    }
  };

  if (!modal) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title={`Modal English Translation - ${modal.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit}>
        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Modal English translation updated successfully!
          </Alert>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            ❌ {error?.data?.message || 'Failed to update translation'}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Slovak version */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇸🇰 Slovak Version (Original)
            </Typography>
            <Box p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                {modal.title}
              </Typography>
              <Typography variant="body2" mt={1}>
                {modal.content}
              </Typography>
              {modal.emailPlaceholder && (
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                  Placeholder: {modal.emailPlaceholder}
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
              🇬🇧 English Content
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              placeholder="Enter English content..."
              helperText={`${contentEn.length}/1000 characters`}
              inputProps={{ maxLength: 1000 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇬🇧 Email Placeholder (English)
            </Typography>
            <TextField
              fullWidth
              value={emailPlaceholderEn}
              onChange={(e) => setEmailPlaceholderEn(e.target.value)}
              placeholder="Enter your email"
            />
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇬🇧 Primary Button Text
            </Typography>
            <TextField
              fullWidth
              value={buttonTextEn}
              onChange={(e) => setButtonTextEn(e.target.value)}
              placeholder="Get Discount"
            />
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇬🇧 Secondary Button Text
            </Typography>
            <TextField
              fullWidth
              value={secondaryButtonTextEn}
              onChange={(e) => setSecondaryButtonTextEn(e.target.value)}
              placeholder="Maybe Later"
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

export default ModalEnglishTranslation;
