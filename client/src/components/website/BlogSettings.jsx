import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Chip, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Avatar,
  Divider,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
  UnpublishedOutlined as UnpublishIcon,
  Image as ImageIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  ThumbUp as LikeIcon,
  Comment as CommentIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { 
  useGetBlogsQuery, 
  useCreateBlogMutation, 
  useUpdateBlogMutation, 
  useDeleteBlogMutation,
  useToggleBlogStatusMutation,
  useUploadBlogImageMutation
} from '../../store/store';

// Rich text editor component (simplified version)
const RichTextEditor = ({ value, onChange, placeholder }) => {
  return (
    <TextField
      multiline
      rows={8}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      fullWidth
      variant="outlined"
      helperText="HTML značky są podporované pre formátovanie textu"
    />
  );
};

const BlogSettings = () => {
  const [alert, setAlert] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Blog form state
  const [blogData, setBlogData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'general',
    tags: [],
    status: 'draft',
    publishDate: new Date().toISOString().split('T')[0],
    featuredImage: null,
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: []
    },
    socialMedia: {
      ogTitle: '',
      ogDescription: ''
    },
    commentsEnabled: true
  });

  const [newTag, setNewTag] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState(null); // Add this to store selected image file

  // API hooks
  const { data: blogsData, isLoading, error, refetch } = useGetBlogsQuery({
    ...(searchTerm && { search: searchTerm }),
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(categoryFilter !== 'all' && { category: categoryFilter })
  });

  // Debug logging
  useEffect(() => {
    console.log('🔍 Blog Query Debug:', {
      blogsData,
      isLoading,
      error,
      searchTerm,
      statusFilter,
      categoryFilter
    });
  }, [blogsData, isLoading, error, searchTerm, statusFilter, categoryFilter]);

  const [createBlog] = useCreateBlogMutation();
  const [updateBlog] = useUpdateBlogMutation();
  const [deleteBlog] = useDeleteBlogMutation();
  const [toggleBlogStatus] = useToggleBlogStatusMutation();
  const [uploadBlogImage] = useUploadBlogImageMutation();

  // Test function to create a simple blog
  const createTestBlog = async () => {
    try {
      setAlert({ type: 'info', message: 'Vytváram test blog...' });
      
      const testBlogData = {
        title: 'Test Blog - ' + new Date().toLocaleString(),
        slug: 'test-blog-' + Date.now(),
        excerpt: 'Toto je testovací blog post na overenie funkcionality systému.',
        content: '<p>Toto je obsah testovacieho blog postu. <strong>Systém funguje správne!</strong></p>',
        category: 'general',
        tags: ['test', 'debug'],
        status: 'published',
        publishDate: new Date().toISOString().split('T')[0]
      };
      
      console.log('🧪 Creating test blog:', testBlogData);
      const result = await createBlog(testBlogData).unwrap();
      console.log('🧪 Test blog created:', result);
      
      setAlert({ type: 'success', message: 'Test blog bol úspešne vytvorený!' });
      refetch();
    } catch (error) {
      console.error('🧪 Error creating test blog:', error);
      setAlert({ 
        type: 'error', 
        message: `Chyba pri vytváraní test blogu: ${error.data?.message || error.message}` 
      });
    }
  };

  // Clear alert after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Blog categories with Slovak labels
  const categories = [
    { value: 'company-news', label: 'Firemné novinky' },
    { value: 'car-tips', label: 'Tipy pre vodičov' },
    { value: 'travel-guides', label: 'Cestovné sprievodcovia' },
    { value: 'maintenance', label: 'Údržba vozidiel' },
    { value: 'industry-news', label: 'Novinky z odvetvia' },
    { value: 'promotions', label: 'Akcie a zľavy' },
    { value: 'customer-stories', label: 'Príbehy zákazníkov' },
    { value: 'general', label: 'Všeobecné' }
  ];

  // Auto-generate slug from title
  useEffect(() => {
    if (blogData.title && !selectedBlog) {
      const slug = blogData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
      setBlogData(prev => ({ ...prev, slug }));
    }
  }, [blogData.title, selectedBlog]);

  // Auto-generate SEO fields
  useEffect(() => {
    if (blogData.title && !blogData.seo.metaTitle) {
      setBlogData(prev => ({
        ...prev,
        seo: {
          ...prev.seo,
          metaTitle: blogData.title.substring(0, 60)
        }
      }));
    }
    if (blogData.excerpt && !blogData.seo.metaDescription) {
      setBlogData(prev => ({
        ...prev,
        seo: {
          ...prev.seo,
          metaDescription: blogData.excerpt.substring(0, 160)
        }
      }));
    }
  }, [blogData.title, blogData.excerpt]);

  const handleOpenBlogDialog = (blog = null) => {
    // Clean up any existing preview URL
    if (selectedImageFile) {
      setSelectedImageFile(null);
    }
    if (blogData.featuredImage?.isPreview) {
      URL.revokeObjectURL(blogData.featuredImage.url);
    }

    if (blog) {
      setSelectedBlog(blog);
      setBlogData({
        title: blog.title || '',
        slug: blog.slug || '',
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        category: blog.category || 'general',
        tags: blog.tags || [],
        status: blog.status || 'draft',
        publishDate: blog.publishDate ? new Date(blog.publishDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        featuredImage: blog.featuredImage || null,
        seo: blog.seo || { metaTitle: '', metaDescription: '', keywords: [] },
        socialMedia: blog.socialMedia || { ogTitle: '', ogDescription: '' },
        commentsEnabled: blog.commentsEnabled !== false
      });
    } else {
      setSelectedBlog(null);
      setBlogData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        category: 'general',
        tags: [],
        status: 'draft',
        publishDate: new Date().toISOString().split('T')[0],
        featuredImage: null,
        seo: { metaTitle: '', metaDescription: '', keywords: [] },
        socialMedia: { ogTitle: '', ogDescription: '' },
        commentsEnabled: true
      });
    }
    setBlogDialogOpen(true);
  };

  const handleCloseBlogDialog = () => {
    // Clean up preview URL if it exists
    if (blogData.featuredImage?.isPreview) {
      URL.revokeObjectURL(blogData.featuredImage.url);
    }
    
    setBlogDialogOpen(false);
    setSelectedBlog(null);
    setSelectedImageFile(null);
    setNewTag('');
    setNewKeyword('');
  };

  const handleSaveBlog = async () => {
    try {
      let savedBlog;
      
      if (selectedBlog) {
        // Updating existing blog
        savedBlog = await updateBlog({ id: selectedBlog._id, ...blogData }).unwrap();
        setAlert({ type: 'success', message: 'Blog bol úspešne aktualizovaný!' });
      } else {
        // Creating new blog
        savedBlog = await createBlog(blogData).unwrap();
        setAlert({ type: 'success', message: 'Blog bol úspešne vytvorený!' });
      }
      
      // If there's a selected image file and we have a blog ID, upload it
      if (selectedImageFile && savedBlog.data) {
        try {
          const formData = new FormData();
          formData.append('image', selectedImageFile);
          formData.append('isFeatured', 'true');
          formData.append('alt', `Obrázok pre ${blogData.title}`);
          
          await uploadBlogImage({ id: savedBlog.data._id, formData }).unwrap();
          setAlert({ type: 'success', message: 'Blog a obrázok boli úspešne uložené!' });
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          setAlert({ 
            type: 'warning', 
            message: 'Blog bol uložený, ale pri nahrávaní obrázka došlo k chybe. Môžete ho pridať neskôr.' 
          });
        }
      }
      
      handleCloseBlogDialog();
      refetch();
    } catch (error) {
      setAlert({ 
        type: 'error', 
        message: `Chyba pri ukladaní blogu: ${error.data?.message || error.message}` 
      });
    }
  };

  const handleDeleteBlog = async (blogId) => {
    if (window.confirm('Ste si istí, že chcete vymazať tento blog?')) {
      try {
        await deleteBlog(blogId).unwrap();
        setAlert({ type: 'success', message: 'Blog bol úspešne vymazaný!' });
        refetch();
      } catch (error) {
        setAlert({ 
          type: 'error', 
          message: `Chyba pri mazaní blogu: ${error.data?.message || error.message}` 
        });
      }
    }
  };

  const handleToggleStatus = async (blogId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      await toggleBlogStatus({ id: blogId, status: newStatus }).unwrap();
      setAlert({ 
        type: 'success', 
        message: `Blog bol ${newStatus === 'published' ? 'publikovaný' : 'zrušený'}!` 
      });
      refetch();
    } catch (error) {
      setAlert({ 
        type: 'error', 
        message: `Chyba pri zmene stavu blogu: ${error.data?.message || error.message}` 
      });
    }
  };

  const handleImageUpload = async (event, isFeatured = false) => {
    const file = event.target.files[0];
    if (!file) return;

    // If this is an existing blog, upload immediately
    if (selectedBlog) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('isFeatured', isFeatured.toString());
      formData.append('alt', `Obrázok pre ${blogData.title}`);

      try {
        const result = await uploadBlogImage({ id: selectedBlog._id, formData }).unwrap();
        if (isFeatured) {
          setBlogData(prev => ({ ...prev, featuredImage: result.data }));
        }
        setAlert({ type: 'success', message: 'Obrázok bol úspešne nahraný!' });
      } catch (error) {
        setAlert({ 
          type: 'error', 
          message: `Chyba pri nahrávaní obrázka: ${error.data?.message || error.message}` 
        });
      }
    } else {
      // For new blogs, just store the file to upload later
      if (isFeatured) {
        setSelectedImageFile(file);
        // Create a preview URL for display
        const previewUrl = URL.createObjectURL(file);
        setBlogData(prev => ({ 
          ...prev, 
          featuredImage: { 
            url: previewUrl, 
            filename: file.name,
            alt: `Obrázok pre ${blogData.title}`,
            isPreview: true // Flag to indicate this is a preview
          } 
        }));
        setAlert({ type: 'info', message: 'Obrázok bude nahraný po uložení blogu.' });
      }
    }
  };

  const addTag = () => {
    if (newTag.trim() && !blogData.tags.includes(newTag.trim().toLowerCase())) {
      setBlogData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setBlogData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !blogData.seo.keywords.includes(newKeyword.trim())) {
      setBlogData(prev => ({
        ...prev,
        seo: {
          ...prev.seo,
          keywords: [...prev.seo.keywords, newKeyword.trim()]
        }
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keywordToRemove) => {
    setBlogData(prev => ({
      ...prev,
      seo: {
        ...prev.seo,
        keywords: prev.seo.keywords.filter(keyword => keyword !== keywordToRemove)
      }
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'published': return 'Publikované';
      case 'draft': return 'Koncept';
      case 'archived': return 'Archivované';
      default: return status;
    }
  };

  const filteredBlogs = blogsData?.data?.filter(blog => {
    if (!blog) return false;
    
    const matchesSearch = !searchTerm || 
      blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (blog.tags && blog.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesStatus = statusFilter === 'all' || blog.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || blog.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  }) || [];

  // Debug filtered blogs
  useEffect(() => {
    console.log('🔍 Filtered Blogs:', {
      totalBlogs: blogsData?.data?.length || 0,
      filteredCount: filteredBlogs.length,
      filteredBlogs
    });
  }, [blogsData, filteredBlogs]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Správa blogu
      </Typography>

      {/* Alert Messages */}
      {alert && (
        <Alert
          severity={alert.type}
          onClose={() => setAlert(null)}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Blog List and Management */}
      <Card>
        <CardContent>
          {/* Filters and Search */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Hľadať blogy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Stav</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Stav"
                >
                  <MenuItem value="all">Všetky stavy</MenuItem>
                  <MenuItem value="published">Publikované</MenuItem>
                  <MenuItem value="draft">Koncept</MenuItem>
                  <MenuItem value="archived">Archivované</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Kategória</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Kategória"
                >
                  <MenuItem value="all">Všetky kategórie</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenBlogDialog()}
                sx={{ height: '56px' }}
              >
                Nový blog
              </Button>
            </Grid>
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={createTestBlog}
                sx={{ height: '56px' }}
              >
                Test blog
              </Button>
            </Grid>
          </Grid>

          {/* Blog List */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography>Načítavam blogy...</Typography>
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              Chyba pri načítavaní blogov: {error.data?.message || error.message || 'Neznáma chyba'}
              <Button 
                onClick={() => refetch()} 
                size="small" 
                sx={{ ml: 2 }}
              >
                Skúsiť znova
              </Button>
            </Alert>
          ) : filteredBlogs.length === 0 ? (
            <Alert severity="info">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                ? 'Nenašli sa žiadne blogy zodpovedajúce filtru. Skúste zmeniť filter alebo vytvoriť nový blog.'
                : 'Nenašli sa žiadne blogy. Vytvorte svoj prvý blog!'
              }
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {filteredBlogs.map((blog) => (
                <Grid item xs={12} md={6} lg={4} key={blog._id}>
                  <Card variant="outlined">
                    {blog.featuredImage && (
                      <CardMedia
                        component="img"
                        height="140"
                        image={blog.featuredImage.url}
                        alt={blog.featuredImage.alt}
                      />
                    )}
                    <CardContent>
                      <Typography variant="h6" gutterBottom noWrap>
                        {blog.title}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {blog.excerpt?.substring(0, 100)}...
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Chip 
                          label={getStatusLabel(blog.status)} 
                          color={getStatusColor(blog.status)}
                          size="small"
                        />
                        <Chip 
                          label={categories.find(c => c.value === blog.category)?.label || blog.category}
                          variant="outlined"
                          size="small"
                        />
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <ViewIcon fontSize="small" color="action" />
                          <Typography variant="caption">{blog.views || 0}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <LikeIcon fontSize="small" color="action" />
                          <Typography variant="caption">{blog.likes || 0}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <CommentIcon fontSize="small" color="action" />
                          <Typography variant="caption">{blog.commentCount || 0}</Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={1}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenBlogDialog(blog)}
                          color="primary"
                          title="Upraviť"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleToggleStatus(blog._id, blog.status)}
                          color={blog.status === 'published' ? 'warning' : 'success'}
                          title={blog.status === 'published' ? 'Zrušiť publikovanie' : 'Publikovať'}
                        >
                          {blog.status === 'published' ? <UnpublishIcon /> : <PublishIcon />}
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteBlog(blog._id)}
                          color="error"
                          title="Vymazať"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Blog Create/Edit Dialog */}
      <Dialog 
        open={blogDialogOpen} 
        onClose={handleCloseBlogDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedBlog ? 'Upraviť blog' : 'Vytvoriť nový blog'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Základné info" />
            <Tab label="Obsah" />
            <Tab label="SEO a sociálne siete" />
          </Tabs>

          {/* Basic Info Tab */}
          {activeTab === 0 && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Názov blogu"
                    value={blogData.title}
                    onChange={(e) => setBlogData(prev => ({ ...prev, title: e.target.value }))}
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="URL slug"
                    value={blogData.slug}
                    onChange={(e) => setBlogData(prev => ({ ...prev, slug: e.target.value }))}
                    margin="normal"
                    required
                    helperText="URL verzia názvu"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Výpis"
                    value={blogData.excerpt}
                    onChange={(e) => setBlogData(prev => ({ ...prev, excerpt: e.target.value }))}
                    multiline
                    rows={3}
                    margin="normal"
                    required
                    helperText="Krátky popis pre výpis blogov a SEO"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Kategória</InputLabel>
                    <Select
                      value={blogData.category}
                      onChange={(e) => setBlogData(prev => ({ ...prev, category: e.target.value }))}
                      label="Kategória"
                    >
                      {categories.map(category => (
                        <MenuItem key={category.value} value={category.value}>
                          {category.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Dátum publikovania"
                    type="date"
                    value={blogData.publishDate}
                    onChange={(e) => setBlogData(prev => ({ ...prev, publishDate: e.target.value }))}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Tagy</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {blogData.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        onDelete={() => removeTag(tag)}
                        size="small"
                      />
                    ))}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      placeholder="Pridať tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button onClick={addTag} variant="outlined" size="small">
                      Pridať
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Content Tab */}
          {activeTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Obsah blogu
              </Typography>
              <RichTextEditor
                value={blogData.content}
                onChange={(content) => setBlogData(prev => ({ ...prev, content }))}
                placeholder="Napíšte obsah vášho blogu..."
              />
              
              {/* Featured Image */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Hlavný obrázok
                </Typography>
                {blogData.featuredImage ? (
                  <Box sx={{ mb: 2 }}>
                    <img
                      src={blogData.featuredImage.url}
                      alt={blogData.featuredImage.alt || 'Obrázok blogu'}
                      style={{ 
                        maxWidth: '200px', 
                        height: 'auto', 
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        padding: '4px'
                      }}
                      onError={(e) => {
                        console.error('🖼️ Image failed to load:', blogData.featuredImage.url);
                        e.target.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('🖼️ Image loaded successfully:', blogData.featuredImage.url);
                      }}
                    />
                    {blogData.featuredImage.isPreview && (
                      <Typography variant="caption" display="block" color="info.main">
                        Náhľad - obrázok bude nahraný po uložení blogu
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Žiadny hlavný obrázok nie je nahraný
                  </Alert>
                )}
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="featured-image-upload"
                  type="file"
                  onChange={(e) => handleImageUpload(e, true)}
                />
                <label htmlFor="featured-image-upload">
                  <Button variant="outlined" component="span" startIcon={<ImageIcon />}>
                    {blogData.featuredImage ? 'Zmeniť hlavný obrázok' : 'Nahrať hlavný obrázok'}
                  </Button>
                </label>
              </Box>
            </Box>
          )}

          {/* SEO & Social Tab */}
          {activeTab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">SEO nastavenia</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Meta titulok"
                        value={blogData.seo.metaTitle}
                        onChange={(e) => setBlogData(prev => ({
                          ...prev,
                          seo: { ...prev.seo, metaTitle: e.target.value }
                        }))}
                        margin="normal"
                        helperText={`${blogData.seo.metaTitle.length}/60 znakov`}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Meta popis"
                        value={blogData.seo.metaDescription}
                        onChange={(e) => setBlogData(prev => ({
                          ...prev,
                          seo: { ...prev.seo, metaDescription: e.target.value }
                        }))}
                        multiline
                        rows={2}
                        margin="normal"
                        helperText={`${blogData.seo.metaDescription.length}/160 znakov`}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>SEO kľúčové slová</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                        {blogData.seo.keywords.map((keyword, index) => (
                          <Chip
                            key={index}
                            label={keyword}
                            onDelete={() => removeKeyword(keyword)}
                            size="small"
                          />
                        ))}
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <TextField
                          size="small"
                          placeholder="Pridať kľúčové slovo"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                        />
                        <Button onClick={addKeyword} variant="outlined" size="small">
                          Pridať
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Sociálne siete</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Titulok pre sociálne siete"
                        value={blogData.socialMedia.ogTitle}
                        onChange={(e) => setBlogData(prev => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, ogTitle: e.target.value }
                        }))}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Popis pre sociálne siete"
                        value={blogData.socialMedia.ogDescription}
                        onChange={(e) => setBlogData(prev => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, ogDescription: e.target.value }
                        }))}
                        multiline
                        rows={2}
                        margin="normal"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

          {/* Settings Tab */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBlogDialog}>Zrušiť</Button>
          <Button 
            onClick={handleSaveBlog} 
            variant="contained"
            disabled={!blogData.title || !blogData.excerpt || !blogData.content}
          >
            {selectedBlog ? 'Aktualizovať' : 'Vytvoriť'} blog
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BlogSettings; 