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
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import TranslationDialog from './TranslationDialog';
import { useUpdateBlogHungarianMutation } from '../../store/store';

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['blockquote'],
    ['link', 'image'],
    ['clean']
  ]
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'align', 'blockquote', 'link', 'image'
];

const BlogHungarianTranslation = ({ blog, open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [titleHu, setTitleHu] = useState('');
  const [slugHu, setSlugHu] = useState('');
  const [contentHu, setContentHu] = useState('');

  const [updateBlogHungarian, { isLoading, isSuccess, isError, error, reset }] =
    useUpdateBlogHungarianMutation();

  useEffect(() => {
    if (blog && open) {
      setTitleHu(blog.titleHu || '');
      setSlugHu(blog.slugHu || '');
      setContentHu(blog.contentHu || '');
      setActiveTab(0);
    }
  }, [blog, open]);

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
    if (!blog) return;
    try {
      await updateBlogHungarian({ id: blog._id, titleHu, slugHu, contentHu }).unwrap();
    } catch (err) {
      console.error('Failed to update Hungarian translation:', err);
    }
  };

  if (!blog) return null;

  return (
    <TranslationDialog
      open={open}
      onClose={onClose}
      title={`Magyar fordítás - ${blog.title}`}
      maxWidth="lg"
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

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Alapadatok" />
          <Tab label="Tartalom" />
        </Tabs>

        {activeTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🇸🇰 Szlovák verzió (eredeti)
              </Typography>
              <Box p={2} bgcolor="grey.100" borderRadius={1}>
                <Typography variant="h6">{blog.title}</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Slug: {blog.slug}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
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
                helperText={`${titleHu.length}/200 karakter`}
                inputProps={{ maxLength: 200 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🇭🇺 Magyar slug (URL)
              </Typography>
              <TextField
                fullWidth
                value={slugHu}
                onChange={(e) =>
                  setSlugHu(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                }
                placeholder="magyar-url-slug"
                helperText="Csak kisbetűk, számok és kötőjelek"
              />
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              🇭🇺 Magyar tartalom
            </Typography>
            <Box sx={{
              '& .ql-container': { minHeight: '300px', fontSize: '14px' },
              '& .ql-editor': { minHeight: '300px' }
            }}>
              <ReactQuill
                key={blog?._id ? `${blog._id}-hu` : 'new-hu'}
                theme="snow"
                value={contentHu || ''}
                onChange={(content, delta, source) => {
                  if (source === 'user') setContentHu(content);
                }}
                placeholder="Írja be a blog magyar tartalmát..."
                modules={quillModules}
                formats={quillFormats}
              />
            </Box>
          </Box>
        )}

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

export default BlogHungarianTranslation;
