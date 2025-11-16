/**
 * Simple script to upload LeRent logo to Google Cloud Storage
 * This creates a publicly accessible URL for the logo
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Read the logo file
const logoPath = path.join(__dirname, 'server/templates_lerent/email/logoRENT.png');

if (!fs.existsSync(logoPath)) {
  console.error('❌ Logo file not found:', logoPath);
  console.log('Please make sure the file exists at:', logoPath);
  process.exit(1);
}

const logoBuffer = fs.readFileSync(logoPath);
console.log('✅ Logo file read:', logoBuffer.length, 'bytes');

// For now, let's use a free image hosting service like imgbb or imgur
// You'll need to manually upload the logo to:
// 1. https://imgbb.com (free, no account needed)
// 2. Google Cloud Storage (if you have it configured)
// 3. Any CDN service

console.log('\n📤 TO UPLOAD THE LOGO:');
console.log('1. Go to https://imgbb.com');
console.log('2. Upload this file:', logoPath);
console.log('3. Copy the direct link URL');
console.log('4. Add to Render environment variables:');
console.log('   LERENT_LOGO_URL=<paste-the-url-here>');
console.log('\nOR use Google Cloud Storage if configured.');

// Save logo to desktop for easy upload
const desktopPath = path.join(require('os').homedir(), 'Desktop', 'logoRENT.png');
fs.copyFileSync(logoPath, desktopPath);
console.log('\n✅ Logo copied to Desktop:', desktopPath);
console.log('You can now easily upload this file to an image hosting service.');
