const ipfsService = require('../services/ipfsService');
const logger = require('./logger');

/**
 * Upload MRV attachments to IPFS
 * @param {Array} files - Array of file objects from multer
 * @returns {Promise<Array>} - Array of attachment objects with IPFS data
 */
const uploadMRVAttachmentsToIPFS = async (files) => {
  const attachments = [];
  
  if (!files || files.length === 0) {
    return attachments;
  }

  try {
    // Check IPFS connection
    if (!ipfsService.isIPFSConnected()) {
      logger.warn('IPFS not connected, storing files locally only');
      return processFilesLocally(files);
    }

    // Upload files to IPFS
    for (const file of files) {
      const attachment = {
        name: file.originalname,
        type: getFileType(file.mimetype),
        url: `/uploads/${file.filename}`, // Keep local URL as fallback
        description: '',
        fileSize: file.size
      };

      try {
        // Upload to IPFS
        const ipfsResult = await ipfsService.uploadFile(
          file.buffer || require('fs').readFileSync(file.path),
          file.originalname,
          file.mimetype
        );
        
        attachment.ipfsCid = ipfsResult.cid;
        attachment.ipfsUrl = ipfsResult.ipfsUrl;
        attachment.gatewayUrl = ipfsResult.gatewayUrl;
        
        logger.info(`MRV attachment uploaded to IPFS: ${file.originalname} -> ${ipfsResult.cid}`);
      } catch (ipfsError) {
        logger.error(`Failed to upload MRV attachment to IPFS: ${file.originalname}`, ipfsError);
        // Continue with local storage only
      }

      attachments.push(attachment);
    }

    return attachments;
  } catch (error) {
    logger.error('Error processing MRV attachments for IPFS:', error);
    return processFilesLocally(files);
  }
};

/**
 * Process files locally when IPFS is not available
 * @param {Array} files - Array of file objects
 * @returns {Array} - Array of attachment objects
 */
const processFilesLocally = (files) => {
  return files.map(file => ({
    name: file.originalname,
    type: getFileType(file.mimetype),
    url: `/uploads/${file.filename}`,
    description: '',
    fileSize: file.size
  }));
};

/**
 * Get file type from MIME type
 * @param {string} mimeType - MIME type of the file
 * @returns {string} - File type category
 */
const getFileType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'document';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'spreadsheet';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
  return 'other';
};

/**
 * Validate IPFS CID
 * @param {string} cid - Content Identifier to validate
 * @returns {boolean} - Whether CID is valid
 */
const validateIPFSCID = (cid) => {
  return ipfsService.constructor.validateCID(cid);
};

/**
 * Get IPFS gateway URLs for a CID
 * @param {string} cid - Content Identifier
 * @returns {Object} - Object with different gateway URLs
 */
const getIPFSGatewayUrls = (cid) => {
  try {
    return ipfsService.constructor.getGatewayUrls(cid);
  } catch (error) {
    logger.error('Error generating gateway URLs:', error);
    return null;
  }
};

/**
 * Upload project documents to IPFS
 * @param {Array} files - Array of file objects from multer
 * @returns {Promise<Array>} - Array of document objects with IPFS data
 */
const uploadProjectDocumentsToIPFS = async (files) => {
  const documents = [];
  
  if (!files || files.length === 0) {
    return documents;
  }

  try {
    // Check IPFS connection
    if (!ipfsService.isIPFSConnected()) {
      logger.warn('IPFS not connected, storing project documents locally only');
      return processFilesLocally(files);
    }

    // Upload files to IPFS
    for (const file of files) {
      const document = {
        name: file.originalname,
        type: getFileType(file.mimetype),
        url: `/uploads/${file.filename}`, // Keep local URL as fallback
        description: '',
        fileSize: file.size
      };

      try {
        // Upload to IPFS
        const ipfsResult = await ipfsService.uploadFile(
          file.buffer || require('fs').readFileSync(file.path),
          file.originalname,
          file.mimetype
        );
        
        document.ipfsCid = ipfsResult.cid;
        document.ipfsUrl = ipfsResult.ipfsUrl;
        document.gatewayUrl = ipfsResult.gatewayUrl;
        
        logger.info(`Project document uploaded to IPFS: ${file.originalname} -> ${ipfsResult.cid}`);
      } catch (ipfsError) {
        logger.error(`Failed to upload project document to IPFS: ${file.originalname}`, ipfsError);
        // Continue with local storage only
      }

      documents.push(document);
    }

    return documents;
  } catch (error) {
    logger.error('Error processing project documents for IPFS:', error);
    return processFilesLocally(files);
  }
};

/**
 * Store MRV data CID in smart contract (placeholder for future implementation)
 * @param {string} mrvId - MRV data ID
 * @param {string} cid - IPFS CID
 * @param {Object} mrvData - MRV data object
 * @returns {Promise<Object>} - Transaction result
 */
const storeMRVCIDInSmartContract = async (mrvId, cid, mrvData) => {
  // This is a placeholder for future implementation
  // Currently, the BlueCarbonCredit.sol contract doesn't store MRV data
  // This would require a separate smart contract or modification of the existing one
  
  logger.info(`Would store MRV CID in smart contract: ${mrvId} -> ${cid}`);
  
  return {
    success: true,
    message: 'CID storage in smart contract not yet implemented',
    mrvId,
    cid,
    timestamp: new Date()
  };
};

/**
 * Create IPFS metadata for MRV data
 * @param {Object} mrvData - MRV data object
 * @param {Array} attachmentCids - Array of attachment CIDs
 * @returns {Object} - IPFS metadata object
 */
const createMRVIPFSMetadata = (mrvData, attachmentCids = []) => {
  return {
    mrvId: mrvData.mrvId,
    projectId: mrvData.projectId,
    measurementData: mrvData.measurementData,
    environmentalData: mrvData.environmentalData,
    reporter: mrvData.reporter,
    qualityControl: mrvData.qualityControl,
    attachments: attachmentCids,
    metadata: mrvData.metadata,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
};

/**
 * Upload MRV metadata to IPFS
 * @param {Object} mrvData - MRV data object
 * @param {Array} attachmentCids - Array of attachment CIDs
 * @returns {Promise<Object>} - IPFS upload result
 */
const uploadMRVMetadataToIPFS = async (mrvData, attachmentCids = []) => {
  try {
    if (!ipfsService.isIPFSConnected()) {
      throw new Error('IPFS not connected');
    }

    const metadata = createMRVIPFSMetadata(mrvData, attachmentCids);
    const metadataJson = JSON.stringify(metadata, null, 2);
    
    const result = await ipfsService.uploadFile(
      Buffer.from(metadataJson, 'utf8'),
      `mrv-${mrvData.mrvId}-metadata.json`,
      'application/json'
    );

    logger.info(`MRV metadata uploaded to IPFS: ${mrvData.mrvId} -> ${result.cid}`);
    
    return result;
  } catch (error) {
    logger.error('Error uploading MRV metadata to IPFS:', error);
    throw error;
  }
};

module.exports = {
  uploadMRVAttachmentsToIPFS,
  uploadProjectDocumentsToIPFS,
  validateIPFSCID,
  getIPFSGatewayUrls,
  storeMRVCIDInSmartContract,
  uploadMRVMetadataToIPFS,
  createMRVIPFSMetadata,
  getFileType
};
