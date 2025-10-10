# 🚀 English Translations - Quick Reference Card

## 📋 API Endpoints (All Require JWT Token)

### Cars
```http
PUT /api/cars/:id/english
Body: { "descriptionEn": "English text here" }
```

### Services
```http
PUT /api/additional-services/:id/english
Body: {
  "nameEn": "English name",
  "descriptionEn": "English description"
}
```

### Blogs
```http
PUT /api/blogs/:id/english
Body: {
  "titleEn": "English title",
  "slugEn": "english-url-slug",
  "excerptEn": "English excerpt",
  "contentEn": "Full English content"
}
```

### Banners
```http
PUT /api/banners/:bannerId/images/:imageId/english
Body: {
  "titleEn": "English title",
  "descriptionEn": "English description",
  "altEn": "English alt text"
}
```

### Info Bar
```http
PUT /api/website/settings/info-bar/english
Body: { "textEn": "English announcement text" }
```

### Modals
```http
PUT /api/website/modals/:modalId/english
Body: {
  "titleEn": "English title",
  "contentEn": "English content",
  "emailPlaceholderEn": "Email placeholder",
  "buttonTextEn": "Button text",
  "secondaryButtonTextEn": "Secondary button"
}
```

---

## 🔑 JWT Authentication

### Get Token
```bash
POST /api/auth/login
{
  "email": "nitra-car@nitra-car.sk",
  "password": "your-password"
}
```

### Use Token
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Contains
- User ID
- Tenant ID (for data isolation)
- Role (admin/staff/customer)
- Expiration (if configured)

---

## 📦 Frontend Quick Setup

### 1. Add to RTK Query (`store.js`)
```javascript
updateCarEnglish: builder.mutation({
  query: ({ id, ...body }) => ({
    url: `cars/${id}/english`,
    method: 'PUT',
    body,
  }),
  invalidatesTags: ['Cars'],
}),
```

### 2. Use in Component
```javascript
const [updateCarEnglish] = useUpdateCarEnglishMutation();

await updateCarEnglish({
  id: carId,
  descriptionEn: 'English text'
}).unwrap();
```

### 3. Display on Website
```javascript
const { language } = useLanguage();

const text = language === 'EN' && item.textEn
  ? item.textEn
  : item.text;
```

---

## 🎯 Translation Fields by Model

| Model | Slovak → English |
|-------|------------------|
| **Car** | `description` → `descriptionEn` |
| **Service** | `name` → `nameEn`<br>`description` → `descriptionEn` |
| **Blog** | `title` → `titleEn`<br>`slug` → `slugEn`<br>`excerpt` → `excerptEn`<br>`content` → `contentEn` |
| **Banner** | `title` → `titleEn`<br>`description` → `descriptionEn`<br>`alt` → `altEn` |
| **InfoBar** | `text` → `textEn` |
| **Modal** | `title` → `titleEn`<br>`content` → `contentEn`<br>`emailPlaceholder` → `emailPlaceholderEn`<br>`buttonText` → `buttonTextEn`<br>`secondaryButtonText` → `secondaryButtonTextEn` |

---

## 🛠️ Testing Commands

### Test Car Translation
```bash
curl -X PUT http://localhost:3001/api/cars/CAR_ID/english \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"descriptionEn":"Test translation"}'
```

### Test Service Translation
```bash
curl -X PUT http://localhost:3001/api/additional-services/SERVICE_ID/english \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nameEn":"GPS","descriptionEn":"Navigation system"}'
```

---

## 📁 File Locations

### Backend (Already Updated ✅)
- Models: `server/models/*.js`
- Controllers: `server/controllers/*Controller.js`
- Routes: `server/routes/*.js`

### Frontend (Ready to Create 📦)
```
client/src/components/admin/
├── TranslationDialog.jsx
├── CarEnglishTranslation.jsx
├── ServiceEnglishTranslation.jsx
├── BlogEnglishTranslation.jsx
├── TranslationButton.jsx
└── TranslationProgress.jsx
```

### Documentation
- **ENGLISH_TRANSLATIONS_GUIDE.md** - Full API + JWT guide
- **FRONTEND_COMPONENTS.md** - All React components
- **IMPLEMENTATION_SUMMARY.md** - Complete overview
- **QUICK_REFERENCE.md** - This file

---

## ⚡ 5-Minute Start

```bash
# 1. Login and get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nitra-car@nitra-car.sk","password":"YOUR_PASSWORD"}'

# 2. Copy token from response

# 3. Get a car ID
curl http://localhost:3001/api/cars \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Add English translation
curl -X PUT http://localhost:3001/api/cars/CAR_ID/english \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"descriptionEn":"Spacious family SUV with modern features"}'

# 5. Verify it saved
curl http://localhost:3001/api/cars/CAR_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎨 Component Usage Examples

### Add Translation Button to Table
```jsx
<TableCell>
  <TranslationButton
    onClick={() => setDialog({ open: true, item: car })}
  />
  {car.descriptionEn && <Chip label="EN" color="success" />}
</TableCell>
```

### Show Translation Dialog
```jsx
<CarEnglishTranslation
  car={dialog.item}
  open={dialog.open}
  onClose={() => setDialog({ open: false, item: null })}
/>
```

### Display Translated Content
```jsx
const { language } = useLanguage();
const description = language === 'EN' && car.descriptionEn
  ? car.descriptionEn
  : car.description;
```

---

## ✅ Checklist

### Backend (Done ✅)
- [x] Models updated with English fields
- [x] Controllers have translation endpoints
- [x] Routes configured
- [x] JWT authentication working
- [x] Multi-tenant isolation enforced

### Frontend (To Do 📦)
- [ ] Copy components from FRONTEND_COMPONENTS.md
- [ ] Update RTK Query store
- [ ] Add translation buttons to admin pages
- [ ] Test with nitra-car@nitra-car.sk
- [ ] Verify translations display on website

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Token is not valid" | Login again to get fresh token |
| "Access denied" | Ensure user has admin/staff role |
| "Cannot find module" | Check component file paths |
| Translation not showing | Check language context logic |
| 401 Unauthorized | Token missing or expired |
| 403 Forbidden | User lacks required role |

---

## 📞 Need Help?

1. **API Documentation** → `ENGLISH_TRANSLATIONS_GUIDE.md`
2. **React Components** → `FRONTEND_COMPONENTS.md`
3. **Full Overview** → `IMPLEMENTATION_SUMMARY.md`
4. **This Quick Ref** → `QUICK_REFERENCE.md`

---

**Ready to translate! 🌍**
