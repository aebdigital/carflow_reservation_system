#!/usr/bin/env node

/**
 * JSON Verification Script
 * Validates all package.json files before deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying JSON files...');

const jsonFiles = [
  'package.json',
  'server/package.json',
  'client/package.json'
];

let allValid = true;

jsonFiles.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for any non-JSON content appended
      const trimmed = content.trim();
      if (!trimmed.endsWith('}')) {
        console.error(`❌ ${filePath}: File doesn't end with '}' - possible corruption`);
        allValid = false;
        return;
      }
      
      // Try to parse JSON
      JSON.parse(content);
      console.log(`✅ ${filePath}: Valid JSON`);
      
      // Check for suspicious content
      if (content.includes('EMERGENCY') || content.includes('DEPLOY')) {
        console.error(`❌ ${filePath}: Contains suspicious deployment text`);
        allValid = false;
      }
      
    } else {
      console.log(`⚠️  ${filePath}: File not found (optional)`);
    }
  } catch (error) {
    console.error(`❌ ${filePath}: Invalid JSON - ${error.message}`);
    allValid = false;
  }
});

if (allValid) {
  console.log('✅ All JSON files are valid');
  process.exit(0);
} else {
  console.error('❌ JSON validation failed');
  process.exit(1);
} 