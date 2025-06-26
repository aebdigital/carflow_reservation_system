# Tenant Separation & Account Isolation Guide

## 🔐 Overview

This car rental system now implements complete tenant separation, ensuring that each user account is completely isolated from others. No user can access another user's data, cars, reservations, or files.

## 🏗️ Architecture

### Tenant Model
- **Each user becomes their own tenant** for maximum security isolation
- **Tenant ID**: Unique identifier for each tenant (equals user ID for complete separation)
- **Storage Folder**: Each tenant gets their own Google Cloud Storage folder structure

### Data Isolation
```
tenant-{tenantId}/
├── user-{userId}/
│   ├── cars/
│   │   ├── {carId}/
│   │   │   ├── images/
│   │   │   └── documents/
│   │   └── ...
│   ├── documents/
│   ├── profiles/
│   └── files/
```

## 🚀 New Account Creation

### Rival Account Created
- **Email**: `rival@rental.com`
- **Password**: `Rival123` (bcrypt hashed)
- **Role**: Admin (Full system access)
- **Tenant ID**: Auto-generated unique identifier
- **Storage Folder**: `tenant-{tenantId}/user-{userId}`

### Login Credentials
```
Email: rival@rental.com
Password: Rival123
```

## 🔧 Implementation Details

### 1. Database Models Enhanced

#### User Model
```javascript
{
  // ... existing fields ...
  tenantId: ObjectId,      // Tenant isolation identifier
  storageFolder: String,   // GCS folder path
  // ... existing fields ...
}
```

#### Car Model
```javascript
{
  tenantId: ObjectId,      // Owner's tenant
  owner: ObjectId,         // User who owns this car
  // ... existing fields ...
}
```

#### Reservation Model
```javascript
{
  tenantId: ObjectId,      // Customer's tenant
  // ... existing fields ...
}
```

### 2. Middleware Protection

#### Tenant Filter Middleware
```javascript
const addTenantFilter = (req, res, next) => {
  req.tenantFilter = { tenantId: req.user.tenantId };
  next();
};
```

#### Tenant Access Validation
```javascript
const validateTenantAccess = (Model) => {
  return async (req, res, next) => {
    const resource = await Model.findById(req.params.id);
    if (resource.tenantId.toString() !== req.user.tenantId.toString()) {
      return res.status(404).json({ message: 'Resource not found.' });
    }
    next();
  };
};
```

### 3. Google Cloud Storage Separation

#### User-Specific Upload Paths
```javascript
// Old: cars/{carId}/image.jpg
// New: tenant-{tenantId}/user-{userId}/cars/{carId}/image.jpg

await cloudStorage.uploadCarImage(
  fileBuffer, 
  originalName, 
  carId, 
  user,  // Now requires user object
  description
);
```

#### Storage Functions
- `uploadCarImage(buffer, name, carId, user, desc)` - Car images
- `uploadUserFile(buffer, name, user, subfolder)` - General files
- `deleteCarImages(carId, user, filename)` - Delete car images
- `deleteUserFiles(user)` - Delete all user files
- `listUserFiles(user, subfolder)` - List user files

## 🛡️ Security Features

### Complete Account Separation
- ✅ **Database Isolation**: All queries are tenant-scoped
- ✅ **File Storage Isolation**: Separate GCS folders per tenant
- ✅ **API Access Control**: Middleware prevents cross-tenant access
- ✅ **Resource Ownership**: Cars and reservations are tenant-owned

### Authentication & Authorization
- ✅ **Bcrypt Password Hashing**: All passwords securely hashed
- ✅ **JWT Token Authentication**: Secure session management
- ✅ **Role-Based Access Control**: Admin, Staff, Customer roles
- ✅ **Rate Limiting**: Per-tenant request limits

### Data Privacy
- ✅ **No Cross-Tenant Visibility**: Users cannot see other tenants' data
- ✅ **Secure File Access**: Files are privately accessible only to owner
- ✅ **Audit Trails**: All actions are logged with tenant context

## 🔄 Migration Process

### Automatic Migration
Run the setup script to migrate existing data:
```bash
cd server
node setup-tenant-separation.js
```

### Migration Steps
1. **Create Rival Account**: Admin account with credentials above
2. **Update Users**: Add tenantId and storageFolder to all users
3. **Update Cars**: Assign tenantId and owner to all cars
4. **Update Reservations**: Add tenantId based on customer
5. **Verify Isolation**: Ensure all data is properly separated

## 📋 Usage Guide

### For Developers

#### Query with Tenant Filter
```javascript
// Always include tenant filter in queries
const cars = await Car.find({ 
  ...req.tenantFilter,  // { tenantId: user.tenantId }
  status: 'available' 
});
```

#### Create Resources
```javascript
// Always set tenantId when creating resources
const newCar = await Car.create({
  ...carData,
  tenantId: req.user.tenantId,
  owner: req.user._id
});
```

#### Upload Files
```javascript
// Use tenant-aware upload functions
const result = await cloudStorage.uploadCarImage(
  fileBuffer,
  'image.jpg',
  carId,
  req.user,  // User object with tenantId and storageFolder
  'Car exterior'
);
```

### For API Routes

#### Apply Middleware
```javascript
router.use(protect);           // Authentication
router.use(addTenantFilter);   // Tenant filtering
router.use(validateTenantAccess(Car)); // Resource validation
```

## 🧪 Testing Tenant Separation

### Verify Account Isolation
1. Create multiple user accounts
2. Add cars to each account
3. Verify users cannot see other users' cars
4. Test file uploads go to correct folders
5. Confirm API returns 404 for cross-tenant resource access

### Test Cases
- ✅ User A cannot access User B's cars
- ✅ User A cannot see User B's reservations
- ✅ User A cannot access User B's uploaded files
- ✅ Admin users can only access their own tenant data
- ✅ File uploads create separate folder structures

## 🚨 Important Notes

### Complete Isolation
- **Each user is their own tenant** for maximum security
- **No shared resources** between different user accounts
- **All data is completely separated** including files and database records

### Breaking Changes
- **API clients must handle tenant-scoped responses**
- **File upload functions now require user parameter**
- **Database queries must include tenant filters**

### Backward Compatibility
- **Existing data is automatically migrated**
- **API endpoints remain the same**
- **Authentication flow is unchanged**

## 🔧 Troubleshooting

### Common Issues

#### Connection Problems
```bash
# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Ubuntu
net start MongoDB                      # Windows
```

#### Migration Errors
```bash
# Check database connection
node -e "require('mongoose').connect('mongodb://localhost:27017/car-rental').then(() => console.log('Connected')).catch(console.error)"

# Run migration manually
node setup-tenant-separation.js
```

#### Storage Issues
- Verify Google Cloud Storage credentials
- Check bucket permissions
- Ensure GCS environment variables are set

## 📞 Support

For issues with tenant separation or account isolation:
1. Check this guide first
2. Verify MongoDB is running
3. Ensure all environment variables are set
4. Run the setup script if needed
5. Check application logs for specific errors

---

**Security Note**: This implementation provides complete isolation between user accounts. Each user operates in their own secure environment with no ability to access other users' data, files, or resources. 