const express = require('express');
const multer = require('multer');
const { body, param, validationResult } = require('express-validator');
const ipfsService = require('../services/ipfsService');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv', 'application/json',
      'video/mp4', 'video/avi', 'video/mov'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

/**
 * @route   POST /api/ipfs/upload
 * @desc    Upload a single file to IPFS
 * @access  Public
 */
router.post('/upload', 
  upload.single('file'),
  [
    body('description').optional().isString().trim().isLength({ max: 500 })
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Check IPFS connection
      if (!ipfsService.isIPFSConnected()) {
        return res.status(503).json({
          success: false,
          message: 'IPFS service is not available'
        });
      }

      // Upload file to IPFS
      const uploadResult = await ipfsService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Add description if provided
      if (req.body.description) {
        uploadResult.description = req.body.description;
      }

      logger.info(`File uploaded to IPFS: ${req.file.originalname} -> ${uploadResult.cid}`);

      res.status(201).json({
        success: true,
        message: 'File uploaded to IPFS successfully',
        data: uploadResult
      });

    } catch (error) {
      logger.error('Error uploading file to IPFS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload file to IPFS',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/ipfs/upload-multiple
 * @desc    Upload multiple files to IPFS
 * @access  Public
 */
router.post('/upload-multiple',
  upload.array('files', 10),
  async (req, res) => {
    try {
      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      // Check IPFS connection
      if (!ipfsService.isIPFSConnected()) {
        return res.status(503).json({
          success: false,
          message: 'IPFS service is not available'
        });
      }

      // Prepare files for upload
      const files = req.files.map(file => ({
        data: file.buffer,
        name: file.originalname,
        type: file.mimetype
      }));

      // Upload files to IPFS
      const uploadResults = await ipfsService.uploadMultipleFiles(files);

      logger.info(`Uploaded ${uploadResults.length} files to IPFS`);

      res.status(201).json({
        success: true,
        message: 'Files uploaded to IPFS successfully',
        data: {
          totalFiles: uploadResults.length,
          files: uploadResults
        }
      });

    } catch (error) {
      logger.error('Error uploading multiple files to IPFS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload files to IPFS',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/ipfs/upload-directory
 * @desc    Upload a directory to IPFS
 * @access  Public
 */
router.post('/upload-directory',
  [
    body('directoryPath').isString().trim().notEmpty()
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check IPFS connection
      if (!ipfsService.isIPFSConnected()) {
        return res.status(503).json({
          success: false,
          message: 'IPFS service is not available'
        });
      }

      const { directoryPath } = req.body;

      // Upload directory to IPFS
      const uploadResult = await ipfsService.uploadDirectory(directoryPath);

      logger.info(`Directory uploaded to IPFS: ${directoryPath} -> ${uploadResult.cid}`);

      res.status(201).json({
        success: true,
        message: 'Directory uploaded to IPFS successfully',
        data: uploadResult
      });

    } catch (error) {
      logger.error('Error uploading directory to IPFS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload directory to IPFS',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/ipfs/file/:cid
 * @desc    Get file from IPFS by CID
 * @access  Public
 */
router.get('/file/:cid',
  [
    param('cid').isString().trim().notEmpty()
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { cid } = req.params;

      // Validate CID format
      if (!ipfsService.constructor.validateCID(cid)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid CID format'
        });
      }

      // Check IPFS connection
      if (!ipfsService.isIPFSConnected()) {
        return res.status(503).json({
          success: false,
          message: 'IPFS service is not available'
        });
      }

      // Get file from IPFS
      const fileData = await ipfsService.getFile(cid);

      // Set appropriate headers
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="ipfs-${cid}"`,
        'Content-Length': fileData.length
      });

      res.send(fileData);

    } catch (error) {
      logger.error('Error retrieving file from IPFS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve file from IPFS',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/ipfs/metadata/:cid
 * @desc    Get file metadata from IPFS by CID
 * @access  Public
 */
router.get('/metadata/:cid',
  [
    param('cid').isString().trim().notEmpty()
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { cid } = req.params;

      // Validate CID format
      if (!ipfsService.constructor.validateCID(cid)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid CID format'
        });
      }

      // Check IPFS connection
      if (!ipfsService.isIPFSConnected()) {
        return res.status(503).json({
          success: false,
          message: 'IPFS service is not available'
        });
      }

      // Get file metadata from IPFS
      const metadata = await ipfsService.getFileMetadata(cid);

      res.json({
        success: true,
        message: 'File metadata retrieved successfully',
        data: metadata
      });

    } catch (error) {
      logger.error('Error retrieving metadata from IPFS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve metadata from IPFS',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/ipfs/pin/:cid
 * @desc    Pin a file to IPFS
 * @access  Public
 */
router.post('/pin/:cid',
  [
    param('cid').isString().trim().notEmpty()
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { cid } = req.params;

      // Validate CID format
      if (!ipfsService.constructor.validateCID(cid)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid CID format'
        });
      }

      // Check IPFS connection
      if (!ipfsService.isIPFSConnected()) {
        return res.status(503).json({
          success: false,
          message: 'IPFS service is not available'
        });
      }

      // Pin file to IPFS
      const pinResult = await ipfsService.pinFile(cid);

      res.json({
        success: true,
        message: 'File pinned to IPFS successfully',
        data: pinResult
      });

    } catch (error) {
      logger.error('Error pinning file to IPFS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pin file to IPFS',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/ipfs/unpin/:cid
 * @desc    Unpin a file from IPFS
 * @access  Public
 */
router.delete('/unpin/:cid',
  [
    param('cid').isString().trim().notEmpty()
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { cid } = req.params;

      // Validate CID format
      if (!ipfsService.constructor.validateCID(cid)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid CID format'
        });
      }

      // Check IPFS connection
      if (!ipfsService.isIPFSConnected()) {
        return res.status(503).json({
          success: false,
          message: 'IPFS service is not available'
        });
      }

      // Unpin file from IPFS
      const unpinResult = await ipfsService.unpinFile(cid);

      res.json({
        success: true,
        message: 'File unpinned from IPFS successfully',
        data: unpinResult
      });

    } catch (error) {
      logger.error('Error unpinning file from IPFS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unpin file from IPFS',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/ipfs/gateway-urls/:cid
 * @desc    Get gateway URLs for a CID
 * @access  Public
 */
router.get('/gateway-urls/:cid',
  [
    param('cid').isString().trim().notEmpty()
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { cid } = req.params;

      // Validate CID format
      if (!ipfsService.constructor.validateCID(cid)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid CID format'
        });
      }

      // Get gateway URLs
      const gatewayUrls = ipfsService.constructor.getGatewayUrls(cid);

      res.json({
        success: true,
        message: 'Gateway URLs generated successfully',
        data: {
          cid: cid,
          gatewayUrls: gatewayUrls
        }
      });

    } catch (error) {
      logger.error('Error generating gateway URLs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate gateway URLs',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/ipfs/status
 * @desc    Get IPFS service status
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const isConnected = ipfsService.isIPFSConnected();
    
    let nodeInfo = null;
    if (isConnected) {
      try {
        nodeInfo = await ipfsService.getNodeInfo();
      } catch (error) {
        logger.warn('Could not get IPFS node info:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'IPFS status retrieved successfully',
      data: {
        connected: isConnected,
        nodeInfo: nodeInfo,
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Error getting IPFS status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get IPFS status',
      error: error.message
    });
  }
});

module.exports = router;
