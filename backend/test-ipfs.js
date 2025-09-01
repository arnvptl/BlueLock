#!/usr/bin/env node

/**
 * IPFS Integration Test Script
 * 
 * This script demonstrates the IPFS functionality in the Blue Carbon MRV system.
 * It tests file uploads, retrievals, and metadata operations.
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_FILE_PATH = path.join(__dirname, 'test-file.txt');

// Create a test file if it doesn't exist
function createTestFile() {
  const testContent = `Blue Carbon MRV Test File
Generated: ${new Date().toISOString()}
This is a test file for IPFS integration testing.
Content: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;

  fs.writeFileSync(TEST_FILE_PATH, testContent);
  console.log(`✅ Test file created: ${TEST_FILE_PATH}`);
}

// Test IPFS status
async function testIPFSStatus() {
  console.log('\n🔍 Testing IPFS Status...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ipfs/status`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ IPFS Status:', result.data.connected ? 'Connected' : 'Disconnected');
      if (result.data.nodeInfo) {
        console.log('   Node Version:', result.data.nodeInfo.version);
        console.log('   Node ID:', result.data.nodeInfo.nodeId);
      }
    } else {
      console.log('❌ IPFS Status Error:', result.message);
    }
    
    return result.data.connected;
  } catch (error) {
    console.log('❌ IPFS Status Error:', error.message);
    return false;
  }
}

// Test single file upload
async function testSingleFileUpload() {
  console.log('\n📤 Testing Single File Upload...');
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE_PATH));
    form.append('description', 'Test file for IPFS integration');
    
    const response = await fetch(`${API_BASE_URL}/api/ipfs/upload`, {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ File uploaded successfully');
      console.log('   CID:', result.data.cid);
      console.log('   File Name:', result.data.fileName);
      console.log('   File Size:', result.data.fileSize, 'bytes');
      console.log('   IPFS URL:', result.data.ipfsUrl);
      console.log('   Gateway URL:', result.data.gatewayUrl);
      return result.data.cid;
    } else {
      console.log('❌ Upload failed:', result.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Upload error:', error.message);
    return null;
  }
}

// Test multiple file upload
async function testMultipleFileUpload() {
  console.log('\n📤 Testing Multiple File Upload...');
  
  try {
    // Create additional test files
    const testFiles = [
      { name: 'test1.txt', content: 'Test file 1 content' },
      { name: 'test2.txt', content: 'Test file 2 content' },
      { name: 'test3.json', content: JSON.stringify({ test: 'data', timestamp: new Date().toISOString() }) }
    ];
    
    const form = new FormData();
    
    for (const file of testFiles) {
      const filePath = path.join(__dirname, file.name);
      fs.writeFileSync(filePath, file.content);
      form.append('files', fs.createReadStream(filePath));
    }
    
    const response = await fetch(`${API_BASE_URL}/api/ipfs/upload-multiple`, {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Multiple files uploaded successfully');
      console.log('   Total Files:', result.data.totalFiles);
      console.log('   CIDs:', result.data.files.map(f => f.cid));
      return result.data.files.map(f => f.cid);
    } else {
      console.log('❌ Multiple upload failed:', result.message);
      return [];
    }
  } catch (error) {
    console.log('❌ Multiple upload error:', error.message);
    return [];
  }
}

// Test file retrieval
async function testFileRetrieval(cid) {
  console.log('\n📥 Testing File Retrieval...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ipfs/file/${cid}`);
    
    if (response.ok) {
      const fileContent = await response.text();
      console.log('✅ File retrieved successfully');
      console.log('   Content length:', fileContent.length, 'characters');
      console.log('   Content preview:', fileContent.substring(0, 100) + '...');
      return true;
    } else {
      console.log('❌ File retrieval failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ File retrieval error:', error.message);
    return false;
  }
}

// Test metadata retrieval
async function testMetadataRetrieval(cid) {
  console.log('\n📋 Testing Metadata Retrieval...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ipfs/metadata/${cid}`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Metadata retrieved successfully');
      console.log('   CID:', result.data.cid);
      console.log('   Size:', result.data.size, 'bytes');
      console.log('   Type:', result.data.type);
      console.log('   IPFS URL:', result.data.ipfsUrl);
      return true;
    } else {
      console.log('❌ Metadata retrieval failed:', result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Metadata retrieval error:', error.message);
    return false;
  }
}

// Test gateway URLs
async function testGatewayUrls(cid) {
  console.log('\n🌐 Testing Gateway URLs...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ipfs/gateway-urls/${cid}`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Gateway URLs generated successfully');
      console.log('   IPFS:', result.data.gatewayUrls.ipfs);
      console.log('   IPFS.io:', result.data.gatewayUrls.ipfsIo);
      console.log('   Infura:', result.data.gatewayUrls.infura);
      console.log('   Cloudflare:', result.data.gatewayUrls.cloudflare);
      return true;
    } else {
      console.log('❌ Gateway URLs failed:', result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Gateway URLs error:', error.message);
    return false;
  }
}

// Test pin/unpin operations
async function testPinOperations(cid) {
  console.log('\n📌 Testing Pin Operations...');
  
  try {
    // Pin file
    const pinResponse = await fetch(`${API_BASE_URL}/api/ipfs/pin/${cid}`, {
      method: 'POST'
    });
    const pinResult = await pinResponse.json();
    
    if (pinResult.success) {
      console.log('✅ File pinned successfully');
    } else {
      console.log('❌ Pin failed:', pinResult.message);
      return false;
    }
    
    // Unpin file
    const unpinResponse = await fetch(`${API_BASE_URL}/api/ipfs/unpin/${cid}`, {
      method: 'DELETE'
    });
    const unpinResult = await unpinResponse.json();
    
    if (unpinResult.success) {
      console.log('✅ File unpinned successfully');
      return true;
    } else {
      console.log('❌ Unpin failed:', unpinResult.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Pin operations error:', error.message);
    return false;
  }
}

// Test MRV data upload with IPFS
async function testMRVUploadWithIPFS() {
  console.log('\n📊 Testing MRV Upload with IPFS...');
  
  try {
    const form = new FormData();
    
    // Add MRV data
    const mrvData = {
      projectId: 'BC-2024-TEST01',
      measurementData: {
        co2Sequestered: 100.5,
        unit: 'tons',
        measurementDate: new Date().toISOString(),
        measurementMethod: 'ground_survey',
        measurementLocation: 'Test Location'
      },
      reporter: {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Reporter',
        email: 'test@example.com',
        organization: 'Test Organization',
        role: 'scientist'
      }
    };
    
    form.append('projectId', mrvData.projectId);
    form.append('measurementData', JSON.stringify(mrvData.measurementData));
    form.append('reporter', JSON.stringify(mrvData.reporter));
    
    // Add attachment
    form.append('attachments', fs.createReadStream(TEST_FILE_PATH));
    
    const response = await fetch(`${API_BASE_URL}/api/mrv/upload`, {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ MRV data uploaded successfully');
      console.log('   MRV ID:', result.data.mrvId);
      console.log('   Project ID:', result.data.projectId);
      console.log('   CO2 Sequestered:', result.data.co2Sequestered, result.data.unit);
      
      if (result.data.attachments && result.data.attachments.length > 0) {
        console.log('   Attachments with IPFS CIDs:', result.data.attachments.length);
        result.data.attachments.forEach((att, index) => {
          console.log(`     ${index + 1}. ${att.name} -> ${att.ipfsCid || 'No CID'}`);
        });
      }
      return true;
    } else {
      console.log('❌ MRV upload failed:', result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ MRV upload error:', error.message);
    return false;
  }
}

// Clean up test files
function cleanup() {
  console.log('\n🧹 Cleaning up test files...');
  
  const testFiles = [
    TEST_FILE_PATH,
    path.join(__dirname, 'test1.txt'),
    path.join(__dirname, 'test2.txt'),
    path.join(__dirname, 'test3.json')
  ];
  
  testFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`   Deleted: ${path.basename(filePath)}`);
    }
  });
}

// Main test function
async function runTests() {
  console.log('🚀 Starting IPFS Integration Tests...');
  console.log('=====================================');
  
  // Create test file
  createTestFile();
  
  // Test IPFS status
  const isConnected = await testIPFSStatus();
  
  if (!isConnected) {
    console.log('\n⚠️  IPFS is not connected. Some tests may fail.');
    console.log('   Please ensure IPFS daemon is running or configure Infura IPFS.');
  }
  
  // Test single file upload
  const singleFileCid = await testSingleFileUpload();
  
  if (singleFileCid) {
    // Test file retrieval
    await testFileRetrieval(singleFileCid);
    
    // Test metadata retrieval
    await testMetadataRetrieval(singleFileCid);
    
    // Test gateway URLs
    await testGatewayUrls(singleFileCid);
    
    // Test pin operations
    await testPinOperations(singleFileCid);
  }
  
  // Test multiple file upload
  const multipleFileCids = await testMultipleFileUpload();
  
  // Test MRV upload with IPFS
  await testMRVUploadWithIPFS();
  
  // Cleanup
  cleanup();
  
  console.log('\n✅ IPFS Integration Tests Completed!');
  console.log('=====================================');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testIPFSStatus,
  testSingleFileUpload,
  testMultipleFileUpload,
  testFileRetrieval,
  testMetadataRetrieval,
  testGatewayUrls,
  testPinOperations,
  testMRVUploadWithIPFS
};

