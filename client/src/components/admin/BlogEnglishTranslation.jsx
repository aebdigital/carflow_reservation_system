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
  Tabs,
  Tab,
} from '@mui/material';
import TranslationDialog from './TranslationDialog';
import { useUpdateBlogEnglishMutation } from '../../store/store';

const BlogEnglishTranslation = ({ blog, open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [titleEn, setTitleEn] = useState('');
  const [slugEn, setSlugEn] = useState('');
  const [excerptEn, setExcerptEn] = useState('');
  const [contentEn, setContentEn] = useState('');

  const [updateBlogEnglish, { isLoading, isSuccess, isError, error }] =
    useUpdateBlogEnglishMutation();

  useEffect(() => {
    if (blog) {
      setTitleEn(blog.titleEn || '');
      setSlugEn(blog.slugEn || '');
      setExcerptEn(blog.excerptEn || '');
      setContentEn(blog.contentEn || '');
    }
  }, [blog]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!blog) return;

    try {
      await updateBlogEnglish({
        id: blog._id,
        titleEn,
        slugEn,
        excerptEn,
        contentEn,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update translation:', err);
    }
  };

  if (!blog) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title={`English Translation - ${blog.title}`}
      maxWidth="lg"
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

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Basic Info" />
          <Tab label="Content" />
        </Tabs>

        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Slovak version */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🇸🇰 Slovak Version (Original)
              </Typography>
              <Box p={2} bgcolor="grey.100" borderRadius={1}>
                <Typography variant="h6">{blog.title}</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Slug: {blog.slug}
                </Typography>
                <Typography variant="body2" mt={1}>
                  {blog.excerpt}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* English fields */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🇬🇧 English Title
              </Typography>
              <TextField
                fullWidth
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Enter English title..."
                helperText={`${titleEn.length}/200 characters`}
                inputProps={{ maxLength: 200 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🇬🇧 English Slug (URL)
              </Typography>
              <TextField
                fullWidth
                value={slugEn}
                onChange={(e) =>
                  setSlugEn(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                }
                placeholder="english-url-slug"
                helperText="Lowercase letters, numbers, and hyphens only"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🇬🇧 English Excerpt
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={excerptEn}
                onChange={(e) => setExcerptEn(e.target.value)}
                placeholder="Enter English excerpt..."
                helperText={`${excerptEn.length}/500 characters`}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇬🇧 English Content
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={15}
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              placeholder="Enter full English blog content..."
            />
          </Box>
        )}

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

export default BlogEnglishTranslation;
