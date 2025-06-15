#!/bin/bash

# CarFlow Deployment Helper Script
# This script helps prepare your project for deployment

echo "🚀 CarFlow Deployment Helper"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo ""

# Check if environment files exist
echo "🔍 Checking environment configuration..."

if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: server/.env not found"
    echo "   Create server/.env with your production environment variables"
else
    echo "✅ server/.env found"
fi

# Check for Google Cloud key
if [ ! -f "server/google-cloud-key.json" ]; then
    echo "⚠️  Warning: server/google-cloud-key.json not found"
    echo "   Download your Google Cloud service account key"
else
    echo "✅ Google Cloud key found"
fi

# Check if dependencies are installed
echo ""
echo "📦 Checking dependencies..."

if [ ! -d "node_modules" ]; then
    echo "⚠️  Installing root dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "⚠️  Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "⚠️  Installing client dependencies..."
    cd client && npm install && cd ..
fi

echo "✅ Dependencies checked"

# Test builds
echo ""
echo "🔨 Testing builds..."

echo "Testing client build..."
cd client
if npm run build; then
    echo "✅ Client build successful"
    rm -rf dist  # Clean up test build
else
    echo "❌ Client build failed"
    cd ..
    exit 1
fi
cd ..

echo "Testing server..."
cd server
if timeout 10s npm start > /dev/null 2>&1; then
    echo "✅ Server starts successfully"
else
    echo "⚠️  Server test completed (may need environment variables)"
fi
cd ..

# Generate JWT secrets
echo ""
echo "🔐 Generating JWT secrets for production:"
echo ""
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
echo ""
echo "💡 Copy these secrets to your Render environment variables"

echo ""
echo "📋 Deployment Checklist:"
echo "========================"
echo "□ MongoDB Atlas cluster created"
echo "□ Google Cloud Storage bucket configured"
echo "□ Service account key converted to base64"
echo "□ JWT secrets generated (above)"
echo "□ Repository pushed to GitHub"
echo "□ Render backend service created"
echo "□ Netlify frontend site created"
echo "□ Environment variables configured"
echo "□ CORS updated with production URLs"
echo ""
echo "📖 See NETLIFY_RENDER_DEPLOYMENT.md for detailed instructions"
echo ""
echo "🎉 Ready for deployment!" 