#!/usr/bin/env node
/**
 * Test script for CarFlow Public API endpoints
 * Tests both authenticated and public endpoints to ensure they work correctly
 */

const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'https://carflow-reservation-system.onrender.com';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@example.com';

// Test configuration
const TESTS = [
  {
    name: 'Public Cars Endpoint',
    url: `${BASE_URL}/api/public/cars`,
    method: 'GET',
    expectedFields: ['success', 'data']
  },
  {
    name: 'Single Public Car Endpoint (example)',
    url: `${BASE_URL}/api/public/cars/000000000000000000000000`,
    method: 'GET',
    expectedStatus: [200, 404] // 404 is acceptable if car doesn't exist
  },
  {
    name: 'Tenant-Specific Cars',
    url: `${BASE_URL}/api/public/users/${TEST_EMAIL}/cars`,
    method: 'GET',
    expectedFields: ['success', 'data']
  },
  {
    name: 'Cars by Category',
    url: `${BASE_URL}/api/public/users/${TEST_EMAIL}/cars/category/economy`,
    method: 'GET',
    expectedFields: ['success', 'data', 'count']
  },
  {
    name: 'Available Features',
    url: `${BASE_URL}/api/public/users/${TEST_EMAIL}/features`,
    method: 'GET',
    expectedFields: ['success', 'data']
  },
  {
    name: 'Website Settings',
    url: `${BASE_URL}/api/public/users/${TEST_EMAIL}/website-settings`,
    method: 'GET',
    expectedFields: ['success', 'data']
  },
  {
    name: 'Info Bar',
    url: `${BASE_URL}/api/public/users/${TEST_EMAIL}/info-bar?page=homepage`,
    method: 'GET',
    expectedFields: ['success']
  },
  {
    name: 'Modal Settings',
    url: `${BASE_URL}/api/public/users/${TEST_EMAIL}/modal?page=homepage`,
    method: 'GET',
    expectedFields: ['success']
  }
];

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CarFlow-API-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Function to test a single endpoint
async function testEndpoint(test) {
  console.log(`\n🧪 Testing: ${test.name}`);
  console.log(`📡 URL: ${test.url}`);
  
  try {
    const response = await makeRequest(test.url, test.method, test.data);
    
    // Check status code
    const expectedStatus = test.expectedStatus || [200];
    const statusOk = expectedStatus.includes(response.status);
    
    console.log(`📊 Status: ${response.status} ${statusOk ? '✅' : '❌'}`);
    
    if (!statusOk) {
      console.log(`❌ Expected status codes: ${expectedStatus.join(', ')}`);
      return false;
    }
    
    // Check if response is valid JSON
    if (response.error) {
      console.log(`❌ Response error: ${response.error}`);
      return false;
    }
    
    // Check expected fields
    if (test.expectedFields && response.data && typeof response.data === 'object') {
      const missingFields = test.expectedFields.filter(field => !(field in response.data));
      
      if (missingFields.length > 0) {
        console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
        return false;
      }
      
      console.log(`✅ All expected fields present: ${test.expectedFields.join(', ')}`);
    }
    
    // Check success field if present
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      console.log(`📈 Success: ${response.data.success ? '✅' : '❌'}`);
      
      if (response.data.success === false && response.data.message) {
        console.log(`💬 Message: ${response.data.message}`);
      }
    }
    
    // Show data summary
    if (response.data && typeof response.data === 'object') {
      if (response.data.data && Array.isArray(response.data.data)) {
        console.log(`📦 Data: Array with ${response.data.data.length} items`);
      } else if (response.data.data && typeof response.data.data === 'object') {
        console.log(`📦 Data: Object with keys: ${Object.keys(response.data.data).slice(0, 5).join(', ')}${Object.keys(response.data.data).length > 5 ? '...' : ''}`);
      }
      
      if (response.data.count !== undefined) {
        console.log(`🔢 Count: ${response.data.count}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return false;
  }
}

// Function to test reservation creation (separate because it's POST)
async function testReservationCreation() {
  console.log(`\n🧪 Testing: Create Reservation (Public)`);
  
  const testReservationData = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '+421901234567',
    licenseNumber: 'TEST123456',
    carId: '000000000000000000000000', // Invalid ID for test
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // Day after tomorrow
  };
  
  try {
    const response = await makeRequest(
      `${BASE_URL}/api/public/reservations`,
      'POST',
      testReservationData
    );
    
    console.log(`📊 Status: ${response.status}`);
    
    // We expect this to fail with 404 (car not found) which is good
    if (response.status === 404 || response.status === 400) {
      console.log(`✅ Expected error response (car not found or validation error)`);
      if (response.data && response.data.message) {
        console.log(`💬 Message: ${response.data.message}`);
      }
      return true;
    } else if (response.status === 201) {
      console.log(`✅ Reservation created successfully`);
      return true;
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting CarFlow Public API Tests');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`👤 Test Email: ${TEST_EMAIL}`);
  console.log('=' .repeat(50));
  
  let passed = 0;
  let total = 0;
  
  // Test all GET endpoints
  for (const test of TESTS) {
    total++;
    const success = await testEndpoint(test);
    if (success) passed++;
  }
  
  // Test reservation creation
  total++;
  const reservationSuccess = await testReservationCreation();
  if (reservationSuccess) passed++;
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log(`📋 Test Summary: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! API is working correctly.');
    process.exit(0);
  } else {
    console.log(`❌ ${total - passed} tests failed. Check the issues above.`);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testEndpoint }; 