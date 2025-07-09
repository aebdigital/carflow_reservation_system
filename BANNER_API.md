# Banner API Documentation

## Overview
The Banner API supports multi-image banners (up to 6 images per banner) with drag & drop reordering capabilities. All banners maintain backward compatibility with single-image format.

## Banner Data Structure

### New Multi-Image Format
```json
{
  "id": "64f...",
  "position": "hero-section",
  "isActive": true,
  "sortOrder": 0,
  "images": [
    {
      "_id": "64f...",
      "url": "https://...",
      "filename": "banner-1.jpg",
      "alt": "Banner image 1",
      "title": "Optional title",
      "description": "Optional description", 
      "sortOrder": 0,
      "uploadDate": "2024-01-01T00:00:00.000Z"
    }
  ],
  "tenantId": "64f...",
  "createdBy": "64f...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  
  // Virtual properties for backward compatibility
  "imageUrl": "https://...", // URL of first image
  "image": { /* first image object */ },
  "hasImages": true,
  "primaryImage": { /* first image object */ },
  "imageUrls": ["https://...", "https://..."]
}
```

## Position Types
- `hero-section` - Main hero banner
- `homepage-carousel-1` - First carousel section
- `homepage-carousel-2` - Second carousel section

## Admin Endpoints (Authentication Required)

### Get All Banners
```http
GET /api/banners
Authorization: Bearer <token>
```

### Get Single Banner
```http
GET /api/banners/:id
Authorization: Bearer <token>
```

### Create Banner (Multi-Image)
```http
POST /api/banners
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- position: string (required)
- isActive: boolean
- sortOrder: number
- images: File[] (required, max 6 files)
- titles: string[] (optional)
- descriptions: string[] (optional)
```

### Update Banner
```http
PUT /api/banners/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- position: string
- isActive: boolean
- sortOrder: number
- images: File[] (optional, adds new images)
```

### Delete Banner
```http
DELETE /api/banners/:id
Authorization: Bearer <token>
```

## Image Management Endpoints

### Add Images to Existing Banner
```http
POST /api/banners/:id/images
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- images: File[] (required, max 6 total per banner)
```

### Remove Specific Image
```http
DELETE /api/banners/:id/images/:imageId
Authorization: Bearer <token>
```

### Reorder Images
```http
PUT /api/banners/:id/images/reorder
Authorization: Bearer <token>
Content-Type: application/json

{
  "imageIds": ["imageId1", "imageId2", "imageId3"]
}
```

### Update Image Details
```http
PUT /api/banners/:id/images/:imageId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New title",
  "description": "New description", 
  "alt": "New alt text"
}
```

## Public Endpoints (No Authentication)

### Get Banners by Position
```http
GET /api/banners/position/:position
Headers:
- x-tenant-id: <tenantId> (required)

Example: GET /api/banners/position/hero-section
```

### Get All Active Banners
```http
GET /api/banners/active
Headers:
- x-tenant-id: <tenantId> (required)
```

### Get Public Banners
```http
GET /api/public/banners?tenantId=<tenantId>&position=<position>
```

### Get Public Banners by User
```http
GET /api/public/users/:email/banners?position=<position>
```

## Frontend RTK Query Hooks

### Admin Hooks
```javascript
// Banner CRUD
const { data, isLoading } = useGetBannersQuery()
const { data } = useGetBannerQuery(bannerId)
const [createBanner] = useCreateBannerMutation()
const [updateBanner] = useUpdateBannerMutation()
const [deleteBanner] = useDeleteBannerMutation()

// Image Management
const [addBannerImages] = useAddBannerImagesMutation()
const [removeBannerImage] = useRemoveBannerImageMutation()
const [reorderBannerImages] = useReorderBannerImagesMutation()
const [updateBannerImage] = useUpdateBannerImageMutation()
```

### Public Hooks
```javascript
// Public banner fetching
const { data } = useGetBannersByPositionQuery({ position: 'hero-section', tenantId })
const { data } = useGetActiveBannersQuery({ tenantId })
const { data } = useGetPublicBannersQuery({ tenantId, position })
const { data } = useGetPublicBannersByUserQuery({ userEmail, position })
```

## Frontend Usage Examples

### Displaying Banner Images
```javascript
// Handle both new multi-image and old single-image formats
const renderBannerImages = (banner) => {
  // New format: use images array
  if (banner.images && banner.images.length > 0) {
    return banner.images.map((image, index) => (
      <img 
        key={image._id || index}
        src={image.url} 
        alt={image.alt}
        title={image.title}
      />
    ))
  }
  
  // Backward compatibility: use virtual properties
  if (banner.imageUrl) {
    return <img src={banner.imageUrl} alt={banner.image?.alt || 'Banner'} />
  }
  
  return null
}
```

### Safe Image Access
```javascript
// Always check for image existence
const banner = useGetBannersByPositionQuery({ position: 'hero-section', tenantId })

if (banner.data?.data?.length > 0) {
  const firstBanner = banner.data.data[0]
  
  // Safe access to primary image
  if (firstBanner.hasImages && firstBanner.primaryImage) {
    const primaryImageUrl = firstBanner.primaryImage.url
    // Use the image safely
  }
}
```

## Migration Notes

### From Single Image to Multi-Image
- Old banners automatically work with virtual properties
- `banner.imageUrl` returns first image URL
- `banner.image` returns first image object
- Frontend should check `banner.hasImages` before accessing images

### Validation Rules
- Maximum 6 images per banner
- Minimum 1 image per banner
- Image files only (validated on upload)
- Maximum 5MB per image file

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "error": "Maximum 6 images allowed per banner"
}
```

```json
{
  "success": false,
  "error": "Cannot remove the last image. Banner must have at least one image."
}
```

```json
{
  "success": false,
  "error": "Tenant ID is required"
}
``` 