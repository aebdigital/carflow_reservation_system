# CarFlow Reservation System

A comprehensive car rental management system with a React frontend and Node.js backend, featuring advanced reservation management, payment processing, and invoice generation.

## 🚗 Features

### Admin Panel
- **Dashboard**: Real-time statistics and overview
- **Car Management**: Add, edit, delete cars with image uploads
- **Customer Management**: Customer profiles and history
- **Reservation Management**: Create, modify, and track reservations
- **Payment Processing**: Invoice generation and payment confirmation
- **Calendar View**: Visual reservation scheduling
- **PDF Invoices**: Professional invoice generation and download

### Technical Features
- **Authentication**: JWT-based secure authentication
- **File Uploads**: Google Cloud Storage integration
- **Database**: MongoDB with Mongoose ODM
- **Real-time Updates**: Automatic data refresh
- **Responsive Design**: Mobile-friendly Material-UI interface
- **Payment Demo**: Stripe-like payment simulation

## 🏗️ Project Structure

```
carflow_reservation_system/
├── server/                 # Backend (Node.js/Express)
│   ├── controllers/        # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── services/          # Business logic services
│   ├── config/            # Configuration files
│   ├── uploads/           # File upload directory
│   ├── logs/              # Application logs
│   └── server.js          # Server entry point
├── client/                # Frontend (React/Vite)
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store and API
│   │   └── App.jsx        # Main app component
│   ├── public/            # Static assets
│   └── index.html         # HTML template
├── docs/                  # Documentation
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Google Cloud Storage account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aebdigital/carflow_reservation_system.git
   cd carflow_reservation_system
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies
   cd server && npm install
   
   # Install client dependencies
   cd ../client && npm install
   ```

3. **Environment Setup**
   
   Create `.env` file in the `server/` directory:
   ```bash
   cp server/.env.example server/.env
   ```
   
   Edit `server/.env` with your configuration:
   ```bash
   # Required variables
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret-key
   JWT_REFRESH_SECRET=your-refresh-jwt-secret
   GCS_PROJECT_ID=your-google-cloud-project-id
   GCS_BUCKET_NAME=your-storage-bucket-name
   ```

4. **Google Cloud Storage Setup**
   
   - Download your service account key from Google Cloud Console
   - Save it as `server/google-cloud-key.json`
   - See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed instructions

5. **Start the application**
   ```bash
   # From root directory - starts both server and client
   npm run dev
   ```
   
   Or start individually:
   ```bash
   # Start server (from root)
   npm run server
   
   # Start client (from root)
   npm run client
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Default Login Credentials

```
Admin:
Email: admin@example.com
Password: password123

Customer:
Email: john@example.com
Password: password123
```

## 📋 Environment Variables

### Required Server Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/car-rental-admin` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-jwt-key` |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | `your-refresh-secret-key` |
| `GCS_PROJECT_ID` | Google Cloud project ID | `my-project-123456` |
| `GCS_BUCKET_NAME` | Storage bucket name | `my-car-rental-bucket` |

### Optional Server Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `MAX_IMAGE_SIZE` | Max upload size in bytes | `5242880` (5MB) |
| `MAX_IMAGES_PER_CAR` | Max images per car | `10` |

See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for complete configuration guide.

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create database user
4. Whitelist your IP
5. Get connection string

### Local MongoDB

```bash
# Install MongoDB
brew install mongodb/brew/mongodb-community

# Start MongoDB
brew services start mongodb/brew/mongodb-community
```

## ☁️ Google Cloud Storage Setup

### 1. Create Project and Bucket

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Cloud Storage API
4. Create storage bucket

### 2. Service Account

1. Go to IAM & Admin > Service Accounts
2. Create service account
3. Assign roles: Storage Object Admin
4. Create and download JSON key
5. Save as `server/google-cloud-key.json`

### 3. Bucket Configuration

```bash
# Set bucket to public read (for image access)
gsutil iam ch allUsers:objectViewer gs://your-bucket-name
```

## 🔧 Development

### Available Scripts

```bash
# Root directory
npm run dev          # Start both server and client
npm run server       # Start server only
npm run client       # Start client only
npm run install-all  # Install all dependencies

# Server directory
npm run dev          # Start with nodemon
npm start           # Start production server

# Client directory
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
```

### API Documentation

The API includes the following main endpoints:

- **Authentication**: `/api/auth/*`
- **Cars**: `/api/cars/*`
- **Customers**: `/api/users/*`
- **Reservations**: `/api/reservations/*`
- **Payments**: `/api/payments/*`

See [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) for detailed API documentation.

## 🧪 Testing

### Demo Data

Create demo data for testing:

```bash
cd server
node setup-demo-data.js
```

This creates:
- Admin and customer users
- Sample cars with images
- Test reservations
- Sample payments

## 🚀 Deployment

### Environment Variables for Production

**Required for all platforms:**
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `GCS_PROJECT_ID`
- `GCS_BUCKET_NAME`
- `GCS_CREDENTIALS` (base64 encoded service account JSON)
- `NODE_ENV=production`

### Platform-Specific Deployment

#### Heroku
```bash
# Set environment variables
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
# ... other variables

# Deploy
git push heroku main
```

#### Vercel (Frontend)
```bash
# Build client
cd client && npm run build

# Deploy to Vercel
vercel --prod
```

#### Railway/Render
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3001

CMD ["npm", "start"]
```

## 🔒 Security

### Production Checklist

- [ ] Change default JWT secrets
- [ ] Use strong MongoDB credentials
- [ ] Enable HTTPS
- [ ] Set secure CORS origins
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Regular security updates

### JWT Secret Generation

```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

### Common Issues

1. **MongoDB Connection Failed**
   - Check connection string format
   - Verify network connectivity
   - Check IP whitelist in Atlas

2. **Google Cloud Storage Errors**
   - Verify service account key
   - Check bucket permissions
   - Ensure API is enabled

3. **Payment Confirmation Issues**
   - Check server logs for debugging info
   - Verify payment data structure
   - Ensure proper API calls

### Getting Help

- Check [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for configuration
- Review [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) for API usage
- Open an issue for bugs or feature requests

## 🔄 Recent Updates

- ✅ Fixed payment confirmation functionality
- ✅ Enhanced PDF invoice generation
- ✅ Improved error handling and debugging
- ✅ Added comprehensive environment setup guide
- ✅ Separated server and client configurations

---

**CarFlow Reservation System** - Built with ❤️ for efficient car rental management 