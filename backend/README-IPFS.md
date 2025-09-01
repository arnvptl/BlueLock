# IPFS Integration for Blue Carbon MRV System

This document describes the IPFS (InterPlanetary File System) integration in the Blue Carbon MRV backend system, which enables decentralized storage of files and documents related to carbon credit projects.

## Overview

The IPFS integration provides:
- **Decentralized File Storage**: Upload project documents, MRV data attachments, and images to IPFS
- **Content Addressing**: Files are identified by their content (CID) rather than location
- **Immutable Storage**: Once uploaded, files cannot be modified, ensuring data integrity
- **Distributed Access**: Files can be accessed from multiple gateways worldwide
- **Fallback Support**: Local file storage as backup when IPFS is unavailable

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Admin Dashboard│    │  Drone Analysis │
│                 │    │                 │    │      API        │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │    Express Backend API    │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │   IPFS Service      │  │
                    │  │                     │  │
                    │  │ • Upload Files      │  │
                    │  │ • Retrieve Files    │  │
                    │  │ • Pin/Unpin Files   │  │
                    │  │ • Get Metadata      │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │         IPFS Network      │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │   Local IPFS Node   │  │
                    │  │  (localhost:5001)   │  │
                    │  └─────────────────────┘  │
                    │           │               │
                    │  ┌─────────────────────┐  │
                    │  │   Infura IPFS       │  │
                    │  │   (Fallback)        │  │
                    │  └─────────────────────┘  │
                    └───────────────────────────┘
```

## Features

### 1. File Upload to IPFS
- **Single File Upload**: Upload individual files with metadata
- **Multiple File Upload**: Batch upload multiple files
- **Directory Upload**: Upload entire directories with structure preserved
- **Automatic Pinning**: Files are automatically pinned to ensure availability

### 2. File Retrieval
- **Content-Based Access**: Retrieve files using their CID
- **Metadata Retrieval**: Get file information without downloading
- **Gateway Access**: Access files through multiple IPFS gateways

### 3. File Management
- **Pin Management**: Pin/unpin files to control availability
- **Gateway URLs**: Generate multiple gateway URLs for file access
- **CID Validation**: Validate CID format and integrity

### 4. MRV Data Integration
- **Automatic Upload**: MRV attachments are automatically uploaded to IPFS
- **CID Storage**: Store IPFS CIDs alongside local file references
- **Metadata Storage**: Store MRV metadata on IPFS for verification

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# IPFS Configuration
IPFS_URL=http://localhost:5001
INFURA_IPFS_PROJECT_ID=your_infura_project_id
INFURA_IPFS_PROJECT_SECRET=your_infura_project_secret
```

### IPFS Node Setup

#### Option 1: Local IPFS Node
1. Install IPFS: https://docs.ipfs.io/install/
2. Initialize IPFS: `ipfs init`
3. Start IPFS daemon: `ipfs daemon`
4. Enable API: `ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001`

#### Option 2: Infura IPFS (Recommended for Production)
1. Create account at https://infura.io/
2. Create IPFS project
3. Get project ID and secret
4. Configure environment variables

## API Endpoints

### IPFS Routes

#### Upload Files
```http
POST /api/ipfs/upload
Content-Type: multipart/form-data

file: [file]
description: [optional string]
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded to IPFS successfully",
  "data": {
    "cid": "QmX...",
    "fileName": "document.pdf",
    "fileType": "application/pdf",
    "fileSize": 1024,
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "ipfsUrl": "ipfs://QmX...",
    "gatewayUrl": "https://ipfs.io/ipfs/QmX...",
    "infuraUrl": "https://ipfs.infura.io/ipfs/QmX..."
  }
}
```

#### Upload Multiple Files
```http
POST /api/ipfs/upload-multiple
Content-Type: multipart/form-data

files: [file1, file2, ...]
```

#### Upload Directory
```http
POST /api/ipfs/upload-directory
Content-Type: application/json

{
  "directoryPath": "/path/to/directory"
}
```

#### Retrieve File
```http
GET /api/ipfs/file/:cid
```

#### Get File Metadata
```http
GET /api/ipfs/metadata/:cid
```

#### Pin File
```http
POST /api/ipfs/pin/:cid
```

#### Unpin File
```http
DELETE /api/ipfs/unpin/:cid
```

#### Get Gateway URLs
```http
GET /api/ipfs/gateway-urls/:cid
```

#### IPFS Status
```http
GET /api/ipfs/status
```

### MRV Routes (Enhanced with IPFS)

#### Upload MRV Data with IPFS
```http
POST /api/mrv/upload
Content-Type: multipart/form-data

projectId: "BC-2024-00001"
measurementData: {...}
attachments: [file1, file2, ...]
```

**Response includes IPFS CIDs:**
```json
{
  "success": true,
  "message": "MRV data uploaded successfully",
  "data": {
    "mrvId": "MRV-2024-00001",
    "attachments": [
      {
        "name": "photo.jpg",
        "type": "image",
        "url": "/uploads/photo-123.jpg",
        "ipfsCid": "QmX...",
        "ipfsUrl": "ipfs://QmX...",
        "gatewayUrl": "https://ipfs.io/ipfs/QmX..."
      }
    ]
  }
}
```

## Usage Examples

### JavaScript/Node.js

#### Upload File to IPFS
```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('file', fs.createReadStream('document.pdf'));
form.append('description', 'Project documentation');

const response = await fetch('http://localhost:3000/api/ipfs/upload', {
  method: 'POST',
  body: form
});

const result = await response.json();
console.log('File CID:', result.data.cid);
```

#### Retrieve File from IPFS
```javascript
const response = await fetch(`http://localhost:3000/api/ipfs/file/${cid}`);
const fileBuffer = await response.arrayBuffer();
```

### Python

#### Upload File to IPFS
```python
import requests

with open('document.pdf', 'rb') as f:
    files = {'file': f}
    data = {'description': 'Project documentation'}
    
    response = requests.post(
        'http://localhost:3000/api/ipfs/upload',
        files=files,
        data=data
    )
    
    result = response.json()
    print(f"File CID: {result['data']['cid']}")
```

## File Types Supported

- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX
- **Spreadsheets**: XLS, XLSX, CSV
- **Text**: TXT, JSON
- **Videos**: MP4, AVI, MOV

## Security Considerations

### File Validation
- File type validation using MIME types
- File size limits (50MB per file, 10 files max)
- Malicious file detection

### Access Control
- IPFS endpoints are currently public (consider adding authentication)
- Rate limiting applied to all API endpoints
- CORS configuration for cross-origin requests

### Data Privacy
- Files are publicly accessible on IPFS
- Consider encryption for sensitive documents
- Implement access control for private files

## Error Handling

### Common Errors

#### IPFS Not Connected
```json
{
  "success": false,
  "message": "IPFS service is not available"
}
```

#### Invalid File Type
```json
{
  "success": false,
  "message": "File type application/octet-stream not allowed"
}
```

#### File Too Large
```json
{
  "success": false,
  "message": "File too large"
}
```

### Fallback Behavior

When IPFS is unavailable:
1. Files are stored locally only
2. System continues to function normally
3. Warning logs are generated
4. No data loss occurs

## Monitoring and Logging

### Log Levels
- **INFO**: Successful uploads, retrievals, pin operations
- **WARN**: IPFS connection issues, fallback to local storage
- **ERROR**: Upload failures, network errors

### Metrics to Monitor
- IPFS connection status
- Upload success/failure rates
- File sizes and types
- Gateway response times
- Pin/unpin operations

## Performance Optimization

### File Upload
- Use streaming for large files
- Implement chunked uploads for files > 100MB
- Parallel uploads for multiple files

### File Retrieval
- Cache frequently accessed files
- Use CDN for gateway access
- Implement retry logic for failed retrievals

### Storage Management
- Regular cleanup of unpinned files
- Monitor storage usage
- Implement file lifecycle policies

## Troubleshooting

### IPFS Connection Issues

1. **Check IPFS daemon status:**
   ```bash
   ipfs id
   ```

2. **Verify API endpoint:**
   ```bash
   curl http://localhost:5001/api/v0/version
   ```

3. **Check firewall settings:**
   ```bash
   netstat -tlnp | grep 5001
   ```

### File Upload Issues

1. **Check file size limits**
2. **Verify file type is supported**
3. **Check disk space**
4. **Review error logs**

### Gateway Access Issues

1. **Try multiple gateways**
2. **Check network connectivity**
3. **Verify CID format**
4. **Wait for IPFS propagation**

## Future Enhancements

### Planned Features
- **Encryption**: Client-side encryption for sensitive files
- **Access Control**: Role-based access to IPFS files
- **Compression**: Automatic file compression
- **Deduplication**: Detect and reuse existing files
- **Backup**: Multiple IPFS node support

### Smart Contract Integration
- Store file CIDs in smart contracts
- Link MRV data to IPFS content
- Verify file integrity on-chain
- Implement file access permissions

## Support

For issues and questions:
1. Check the logs for error messages
2. Verify IPFS node configuration
3. Test with simple file uploads
4. Review network connectivity
5. Contact the development team

## License

This IPFS integration is part of the Blue Carbon MRV system and follows the same license terms.

