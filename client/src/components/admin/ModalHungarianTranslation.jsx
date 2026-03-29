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
import { useUpdateModalHungarianMutation } from '../../store/store';

const ModalHungarianTranslation = ({ modal, open, onClose }) => {
  const [titleHu, setTitleHu] = useState('');
  const [contentHu, setContentHu] = useState('');
  const [emailPlaceholderHu, setEmailPlaceholderHu] = useState('');
  const [buttonTextHu, setButtonTextHu] = useState('');
  const [secondaryButtonTextHu, setSecondaryButtonTextHu] = useState('');

  const [updateModalHungarian, { isLoading, isSuccess, isError, error, reset }] =
    useUpdateModalHungarianMutation();

  useEffect(() => {
    if (modal && open) {
      setTitleHu(modal.titleHu || '');
      setContentHu(modal.contentHu || '');
      setEmailPlaceholderHu(modal.emailPlaceholderHu || 'Adja meg az e-mail címét');
      setButtonTextHu(modal.buttonTextHu || 'Kedvezmény igénylése');
      setSecondaryButtonTextHu(modal.secondaryButtonTextHu || 'Talán később');
    }
  }, [modal, open]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (isSuccess) setTimeout(() => onClose(), 1500);
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!modal) return;
    try {
      await updateModalHungarian({
        id: modal._id,
        titleHu,
        contentHu,
        emailPlaceholderHu,
        buttonTextHu,
        secondaryButtonTextHu,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update Hungarian translation:', err);
    }
  };

  if (!modal) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title={`Modal – Magyar fordítás - ${modal.name}`}
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
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇸🇰 Szlovák verzió (eredeti)
            </Typography>
            <Box p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="subtitle1" fontWeight="bold">{modal.title}</Typography>
              <Typography variant="body2" mt={1}>{modal.content}</Typography>
              {modal.emailPlaceholder && (
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                  Placeholder: {modal.emailPlaceholder}
                </Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

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
              🇭🇺 Magyar tartalom
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={contentHu}
              onChange={(e) => setContentHu(e.target.value)}
              placeholder="Adja meg a magyar tartalmat..."
              helperText={`${contentHu.length}/1000 karakter`}
              inputProps={{ maxLength: 1000 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇭🇺 E-mail placeholder (Magyar)
            </Typography>
            <TextField
              fullWidth
              value={emailPlaceholderHu}
              onChange={(e) => setEmailPlaceholderHu(e.target.value)}
              placeholder="Adja meg az e-mail címét"
            />
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇭🇺 Elsődleges gomb szövege
            </Typography>
            <TextField
              fullWidth
              value={buttonTextHu}
              onChange={(e) => setButtonTextHu(e.target.value)}
              placeholder="Kedvezmény igénylése"
            />
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇭🇺 Másodlagos gomb szövege
            </Typography>
            <TextField
              fullWidth
              value={secondaryButtonTextHu}
              onChange={(e) => setSecondaryButtonTextHu(e.target.value)}
              placeholder="Talán később"
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

export default ModalHungarianTranslation;
