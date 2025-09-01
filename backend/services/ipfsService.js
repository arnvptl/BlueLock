const ipfsClient = require('ipfs-http-client');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class IPFSService {
  constructor() {
    this.ipfs = null;
    this.isConnected = false;
    this.initializeIPFS();
  }

  /**
   * Initialize IPFS client connection
   */
  async initializeIPFS() {
    try {
      // Connect to IPFS node (can be local or remote)
      const ipfsUrl = process.env.IPFS_URL || 'http://localhost:5001';
      this.ipfs = ipfsClient.create({ url: ipfsUrl });
      
      // Test connection
      const version = await this.ipfs.version();
      this.isConnected = true;
      logger.info(`IPFS connected successfully. Version: ${version.version}`);
    } catch (error) {
      logger.error('Failed to connect to IPFS:', error.message);
      this.isConnected = false;
      
      // Fallback to Infura IPFS if local node is not available
      if (process.env.INFURA_IPFS_PROJECT_ID && process.env.INFURA_IPFS_PROJECT_SECRET) {
        try {
          const auth = 'Basic ' + Buffer.from(
            process.env.INFURA_IPFS_PROJECT_ID + ':' + process.env.INFURA_IPFS_PROJECT_SECRET
          ).toString('base64');
          
          this.ipfs = create({
            host: 'ipfs.infura.io',
            port: 5001,
            protocol: 'https',
            headers: {
              authorization: auth,
            },
          });
          
          const version = await this.ipfs.version();
          this.isConnected = true;
          logger.info(`IPFS connected via Infura. Version: ${version.version}`);
        } catch (infuraError) {
          logger.error('Failed to connect to Infura IPFS:', infuraError.message);
        }
      }
    }
  }

  /**
   * Upload a file to IPFS
   * @param {Buffer|string} fileData - File data as buffer or file path
   * @param {string} fileName - Name of the file
   * @param {string} fileType - MIME type of the file
   * @returns {Promise<Object>} - Object containing CID and metadata
   */
  async uploadFile(fileData, fileName, fileType = 'application/octet-stream') {
    if (!this.isConnected || !this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      let fileBuffer;
      
      // Handle different input types
      if (Buffer.isBuffer(fileData)) {
        fileBuffer = fileData;
      } else if (typeof fileData === 'string') {
        // Check if it's a file path
        if (fs.existsSync(fileData)) {
          fileBuffer = fs.readFileSync(fileData);
        } else {
          // Treat as string data
          fileBuffer = Buffer.from(fileData, 'utf8');
        }
      } else {
        throw new Error('Invalid file data type');
      }

      // Create file object for IPFS
      const file = {
        path: fileName,
        content: fileBuffer
      };

      // Add file to IPFS
      const result = await this.ipfs.add(file, {
        pin: true, // Pin the file to keep it available
        wrapWithDirectory: false
      });

      logger.info(`File uploaded to IPFS: ${fileName} -> CID: ${result.cid}`);

      return {
        cid: result.cid.toString(),
        fileName: fileName,
        fileType: fileType,
        fileSize: fileBuffer.length,
        uploadedAt: new Date(),
        ipfsUrl: `ipfs://${result.cid}`,
        gatewayUrl: `https://ipfs.io/ipfs/${result.cid}`,
        infuraUrl: `https://ipfs.infura.io/ipfs/${result.cid}`
      };
    } catch (error) {
      logger.error('Error uploading file to IPFS:', error);
      throw new Error(`Failed to upload file to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload multiple files to IPFS
   * @param {Array} files - Array of file objects with data, name, and type
   * @returns {Promise<Array>} - Array of upload results
   */
  async uploadMultipleFiles(files) {
    if (!this.isConnected || !this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      const uploadPromises = files.map(file => 
        this.uploadFile(file.data, file.name, file.type)
      );
      
      const results = await Promise.all(uploadPromises);
      logger.info(`Uploaded ${results.length} files to IPFS`);
      
      return results;
    } catch (error) {
      logger.error('Error uploading multiple files to IPFS:', error);
      throw new Error(`Failed to upload multiple files to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload a directory to IPFS
   * @param {string} directoryPath - Path to the directory
   * @returns {Promise<Object>} - Object containing directory CID and file list
   */
  async uploadDirectory(directoryPath) {
    if (!this.isConnected || !this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      if (!fs.existsSync(directoryPath)) {
        throw new Error('Directory does not exist');
      }

      const files = [];
      
      // Recursively read directory
      const readDirectory = (dir, basePath = '') => {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const relativePath = path.join(basePath, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            readDirectory(fullPath, relativePath);
          } else {
            files.push({
              path: relativePath,
              content: fs.readFileSync(fullPath)
            });
          }
        }
      };

      readDirectory(directoryPath);

      // Add all files to IPFS
      const result = await this.ipfs.addAll(files, {
        pin: true,
        wrapWithDirectory: true
      });

      // Find the directory CID (last item in the result)
      const directoryResult = Array.from(result).pop();
      
      logger.info(`Directory uploaded to IPFS: ${directoryPath} -> CID: ${directoryResult.cid}`);

      return {
        cid: directoryResult.cid.toString(),
        directoryName: path.basename(directoryPath),
        fileCount: files.length,
        uploadedAt: new Date(),
        ipfsUrl: `ipfs://${directoryResult.cid}`,
        gatewayUrl: `https://ipfs.io/ipfs/${directoryResult.cid}`,
        infuraUrl: `https://ipfs.infura.io/ipfs/${directoryResult.cid}`,
        files: files.map(f => f.path)
      };
    } catch (error) {
      logger.error('Error uploading directory to IPFS:', error);
      throw new Error(`Failed to upload directory to IPFS: ${error.message}`);
    }
  }

  /**
   * Get file from IPFS by CID
   * @param {string} cid - Content Identifier
   * @returns {Promise<Buffer>} - File data as buffer
   */
  async getFile(cid) {
    if (!this.isConnected || !this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      
      const fileData = Buffer.concat(chunks);
      logger.info(`Retrieved file from IPFS: ${cid}`);
      
      return fileData;
    } catch (error) {
      logger.error('Error retrieving file from IPFS:', error);
      throw new Error(`Failed to retrieve file from IPFS: ${error.message}`);
    }
  }

  /**
   * Get file metadata from IPFS by CID
   * @param {string} cid - Content Identifier
   * @returns {Promise<Object>} - File metadata
   */
  async getFileMetadata(cid) {
    if (!this.isConnected || !this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      const stats = await this.ipfs.files.stat(`/ipfs/${cid}`);
      logger.info(`Retrieved metadata from IPFS: ${cid}`);
      
      return {
        cid: cid,
        size: stats.size,
        type: stats.type,
        hash: stats.hash,
        ipfsUrl: `ipfs://${cid}`,
        gatewayUrl: `https://ipfs.io/ipfs/${cid}`,
        infuraUrl: `https://ipfs.infura.io/ipfs/${cid}`
      };
    } catch (error) {
      logger.error('Error retrieving metadata from IPFS:', error);
      throw new Error(`Failed to retrieve metadata from IPFS: ${error.message}`);
    }
  }

  /**
   * Pin a file to IPFS (keep it available)
   * @param {string} cid - Content Identifier
   * @returns {Promise<Object>} - Pin result
   */
  async pinFile(cid) {
    if (!this.isConnected || !this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      await this.ipfs.pin.add(cid);
      logger.info(`Pinned file to IPFS: ${cid}`);
      
      return {
        cid: cid,
        pinned: true,
        pinnedAt: new Date()
      };
    } catch (error) {
      logger.error('Error pinning file to IPFS:', error);
      throw new Error(`Failed to pin file to IPFS: ${error.message}`);
    }
  }

  /**
   * Unpin a file from IPFS
   * @param {string} cid - Content Identifier
   * @returns {Promise<Object>} - Unpin result
   */
  async unpinFile(cid) {
    if (!this.isConnected || !this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      await this.ipfs.pin.rm(cid);
      logger.info(`Unpinned file from IPFS: ${cid}`);
      
      return {
        cid: cid,
        pinned: false,
        unpinnedAt: new Date()
      };
    } catch (error) {
      logger.error('Error unpinning file from IPFS:', error);
      throw new Error(`Failed to unpin file from IPFS: ${error.message}`);
    }
  }

  /**
   * Check if IPFS is connected
   * @returns {boolean} - Connection status
   */
  isIPFSConnected() {
    return this.isConnected;
  }

  /**
   * Get IPFS node information
   * @returns {Promise<Object>} - Node information
   */
  async getNodeInfo() {
    if (!this.isConnected || !this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      const version = await this.ipfs.version();
      const id = await this.ipfs.id();
      
      return {
        version: version.version,
        commit: version.commit,
        nodeId: id.id,
        addresses: id.addresses,
        agentVersion: id.agentVersion,
        protocolVersion: id.protocolVersion
      };
    } catch (error) {
      logger.error('Error getting IPFS node info:', error);
      throw new Error(`Failed to get IPFS node info: ${error.message}`);
    }
  }

  /**
   * Validate CID format
   * @param {string} cid - Content Identifier to validate
   * @returns {boolean} - Whether CID is valid
   */
  static validateCID(cid) {
    if (!cid || typeof cid !== 'string') {
      return false;
    }
    
    // Basic CID validation (supports both v0 and v1)
    const cidRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^bafy[a-z2-7]{55}$/;
    return cidRegex.test(cid);
  }

  /**
   * Generate IPFS gateway URLs for a CID
   * @param {string} cid - Content Identifier
   * @returns {Object} - Object with different gateway URLs
   */
  static getGatewayUrls(cid) {
    if (!this.validateCID(cid)) {
      throw new Error('Invalid CID format');
    }

    return {
      ipfs: `ipfs://${cid}`,
      ipfsIo: `https://ipfs.io/ipfs/${cid}`,
      infura: `https://ipfs.infura.io/ipfs/${cid}`,
      cloudflare: `https://cloudflare-ipfs.com/ipfs/${cid}`,
      dweb: `https://dweb.link/ipfs/${cid}`
    };
  }
}

// Create singleton instance
const ipfsService = new IPFSService();

module.exports = ipfsService;
