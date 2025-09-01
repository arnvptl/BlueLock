const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MRVData = require('../models/MRVData');
const Project = require('../models/Project');
const { isVerifiedProjectOwner } = require('../services/web3Service');
const ipfsService = require('../services/ipfsService');
const { uploadMRVAttachmentsToIPFS } = require('../utils/ipfsUtils');
const logger = require('../utils/logger');
const { generateMRVId } = require('../utils/idGenerator');

const router = express.Router();

// Helper function to determine file type from MIME type
const getFileType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'document';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'spreadsheet';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
  return 'other';
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed'));
    }
  }
});

// Validation middleware
const validateMRVDataUpload = [
  body('projectId').trim().isLength({ min: 1 }).withMessage('Project ID is required'),
  body('measurementData.co2Sequestered').isFloat({ min: 0 }).withMessage('CO2 sequestered must be a positive number'),
  body('measurementData.unit').optional().isIn(['tons', 'kg', 'metric_tons']).withMessage('Invalid unit'),
  body('measurementData.measurementDate').isISO8601().withMessage('Valid measurement date is required'),
  body('measurementData.measurementMethod').isIn(['satellite', 'ground_survey', 'aerial_survey', 'sensor_network', 'other']).withMessage('Invalid measurement method'),
  body('measurementData.measurementLocation').optional().trim().isLength({ max: 200 }).withMessage('Measurement location must be less than 200 characters'),
  body('measurementData.coordinates.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('measurementData.coordinates.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('environmentalData.temperature').optional().isFloat().withMessage('Temperature must be a number'),
  body('environmentalData.humidity').optional().isFloat({ min: 0, max: 100 }).withMessage('Humidity must be between 0 and 100'),
  body('environmentalData.rainfall').optional().isFloat({ min: 0 }).withMessage('Rainfall must be a positive number'),
  body('environmentalData.windSpeed').optional().isFloat({ min: 0 }).withMessage('Wind speed must be a positive number'),
  body('environmentalData.soilMoisture').optional().isFloat({ min: 0, max: 100 }).withMessage('Soil moisture must be between 0 and 100'),
  body('reporter.address').isEthereumAddress().withMessage('Valid Ethereum address is required'),
  body('reporter.name').optional().trim().isLength({ max: 100 }).withMessage('Reporter name must be less than 100 characters'),
  body('reporter.email').optional().isEmail().withMessage('Valid email is required'),
  body('reporter.organization').optional().trim().isLength({ max: 200 }).withMessage('Organization name must be less than 200 characters'),
  body('reporter.role').isIn(['project_owner', 'scientist', 'verifier', 'monitor', 'other']).withMessage('Invalid reporter role'),
  body('qualityControl.accuracy').optional().isFloat({ min: 0, max: 100 }).withMessage('Accuracy must be between 0 and 100'),
  body('qualityControl.precision').optional().isFloat({ min: 0, max: 100 }).withMessage('Precision must be between 0 and 100'),
  body('qualityControl.confidenceLevel').optional().isFloat({ min: 0, max: 100 }).withMessage('Confidence level must be between 0 and 100'),
  body('qualityControl.uncertainty').optional().isFloat({ min: 0 }).withMessage('Uncertainty must be a positive number'),
  body('metadata.tags').optional().isArray().withMessage('Tags must be an array'),
  body('metadata.tags.*').optional().trim().isLength({ max: 50 }).withMessage('Each tag must be less than 50 characters'),
  body('metadata.notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
];

/**
 * POST /api/mrv/upload
 * Upload MRV data
 */
router.post('/upload', upload.array('attachments', 10), validateMRVDataUpload, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      projectId,
      measurementData,
      environmentalData,
      reporter,
      qualityControl,
      metadata
    } = req.body;

    // Verify project exists
    const project = await Project.findOne({ projectId: projectId.toUpperCase() });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if project is active
    if (project.status !== 'active' && project.status !== 'verified') {
      return res.status(400).json({
        success: false,
        error: 'Project must be active or verified to upload MRV data'
      });
    }

    // Verify reporter is project owner or authorized
    const isOwner = project.owner.address.toLowerCase() === reporter.address.toLowerCase();
    const isVerifiedOwner = await isVerifiedProjectOwner(reporter.address);
    
    if (!isOwner && !isVerifiedOwner) {
      return res.status(403).json({
        success: false,
        error: 'Only project owner or verified project owners can upload MRV data'
      });
    }

    // Generate unique MRV ID
    const mrvId = await generateMRVId();

        // Process uploaded attachments and upload to IPFS
    const attachments = await uploadMRVAttachmentsToIPFS(req.files);

    // Create new MRV data
    const mrvData = new MRVData({
      mrvId,
      projectId: projectId.toUpperCase(),
      measurementData: {
        ...measurementData,
        measurementDate: new Date(measurementData.measurementDate)
      },
      environmentalData,
      reporter: {
        ...reporter,
        address: reporter.address.toLowerCase()
      },
      qualityControl,
      attachments,
      metadata
    });

    // Calculate quality score if quality control data is provided
    if (qualityControl) {
      await mrvData.calculateQualityScore();
    }

    // Save MRV data to database
    await mrvData.save();

    // Update project's carbon data
    await project.addCarbonData(
      measurementData.co2Sequestered,
      new Date(measurementData.measurementDate)
    );

    logger.info(`MRV data uploaded: ${mrvId} for project ${projectId} by ${reporter.address}`);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'MRV data uploaded successfully',
      data: {
        mrvId: mrvData.mrvId,
        projectId: mrvData.projectId,
        co2Sequestered: mrvData.measurementData.co2Sequestered,
        unit: mrvData.measurementData.unit,
        measurementDate: mrvData.measurementData.measurementDate,
        reporter: mrvData.reporter.address,
        status: mrvData.status,
        qualityScore: mrvData.qualityControl.qualityScore,
        createdAt: mrvData.createdAt
      }
    });

  } catch (error) {
    logger.error('MRV data upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload MRV data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/mrv/verify
 * Verify MRV data
 */
router.post('/verify', [
  body('mrvId').trim().isLength({ min: 1 }).withMessage('MRV ID is required'),
  body('verifiedBy').isEthereumAddress().withMessage('Valid Ethereum address is required'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  body('method').optional().isIn(['manual_review', 'automated_check', 'third_party_audit', 'peer_review']).withMessage('Invalid verification method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { mrvId, verifiedBy, notes = '', method = 'manual_review' } = req.body;

    // Find MRV data
    const mrvData = await MRVData.findOne({ mrvId: mrvId.toUpperCase() });
    if (!mrvData) {
      return res.status(404).json({
        success: false,
        error: 'MRV data not found'
      });
    }

    // Check if already verified
    if (mrvData.verificationStatus.isVerified) {
      return res.status(409).json({
        success: false,
        error: 'MRV data is already verified'
      });
    }

    // Verify the verifier is authorized (project owner or verified project owner)
    const project = await Project.findOne({ projectId: mrvData.projectId });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const isOwner = project.owner.address.toLowerCase() === verifiedBy.toLowerCase();
    const isVerifiedOwner = await isVerifiedProjectOwner(verifiedBy);
    
    if (!isOwner && !isVerifiedOwner) {
      return res.status(403).json({
        success: false,
        error: 'Only project owner or verified project owners can verify MRV data'
      });
    }

    // Verify MRV data
    await mrvData.verify(verifiedBy, notes, method);

    logger.info(`MRV data verified: ${mrvId} by ${verifiedBy}`);

    res.status(200).json({
      success: true,
      message: 'MRV data verified successfully',
      data: {
        mrvId: mrvData.mrvId,
        projectId: mrvData.projectId,
        verifiedBy: mrvData.verificationStatus.verifiedBy,
        verifiedAt: mrvData.verificationStatus.verifiedAt,
        verificationMethod: mrvData.verificationStatus.verificationMethod,
        status: mrvData.status
      }
    });

  } catch (error) {
    logger.error('MRV verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify MRV data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mrv
 * Get all MRV data with pagination and filtering
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      projectId,
      status,
      verified,
      reporter,
      search
    } = req.query;

    // Build query
    const query = {};
    
    if (projectId) query.projectId = projectId.toUpperCase();
    if (status) query.status = status;
    if (reporter) query['reporter.address'] = reporter.toLowerCase();
    if (verified === 'true') query['verificationStatus.isVerified'] = true;
    if (verified === 'false') query['verificationStatus.isVerified'] = false;

    // Execute query with pagination
    const mrvData = await MRVData.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v')
      .populate('projectId', 'name location projectType');

    // Get total count
    const total = await MRVData.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        mrvData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get MRV data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve MRV data'
    });
  }
});

/**
 * GET /api/mrv/:mrvId
 * Get MRV data by ID
 */
router.get('/:mrvId', async (req, res) => {
  try {
    const { mrvId } = req.params;

    const mrvData = await MRVData.findOne({ mrvId: mrvId.toUpperCase() })
      .populate('projectId', 'name location projectType owner');
    
    if (!mrvData) {
      return res.status(404).json({
        success: false,
        error: 'MRV data not found'
      });
    }

    res.status(200).json({
      success: true,
      data: mrvData
    });

  } catch (error) {
    logger.error('Get MRV data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve MRV data'
    });
  }
});

/**
 * GET /api/mrv/project/:projectId
 * Get all MRV data for a specific project
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 10, status, verified } = req.query;

    // Build query
    const query = { projectId: projectId.toUpperCase() };
    
    if (status) query.status = status;
    if (verified === 'true') query['verificationStatus.isVerified'] = true;
    if (verified === 'false') query['verificationStatus.isVerified'] = false;

    // Execute query with pagination
    const mrvData = await MRVData.find(query)
      .sort({ 'measurementData.measurementDate': -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    // Get total count
    const total = await MRVData.countDocuments(query);

    // Calculate total CO2 sequestered for the project
    const totalCO2 = await MRVData.aggregate([
      { $match: { projectId: projectId.toUpperCase() } },
      { $group: { _id: null, total: { $sum: '$measurementData.co2Sequestered' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        mrvData,
        totalCO2Sequestered: totalCO2.length > 0 ? totalCO2[0].total : 0,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get project MRV data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve project MRV data'
    });
  }
});

/**
 * PUT /api/mrv/:mrvId
 * Update MRV data
 */
router.put('/:mrvId', upload.array('attachments', 10), async (req, res) => {
  try {
    const { mrvId } = req.params;
    const updateData = req.body;

    const mrvData = await MRVData.findOne({ mrvId: mrvId.toUpperCase() });
    
    if (!mrvData) {
      return res.status(404).json({
        success: false,
        error: 'MRV data not found'
      });
    }

    // Only allow updates if not verified
    if (mrvData.verificationStatus.isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update verified MRV data'
      });
    }

    // Process new attachments if uploaded
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        mrvData.attachments.push({
          name: file.originalname,
          type: 'other',
          url: `/uploads/${file.filename}`,
          description: '',
          fileSize: file.size
        });
      });
    }

    // Update allowed fields
    const allowedFields = [
      'measurementData.measurementLocation',
      'measurementData.coordinates',
      'environmentalData',
      'qualityControl',
      'metadata'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        const fieldParts = field.split('.');
        let current = mrvData;
        for (let i = 0; i < fieldParts.length - 1; i++) {
          current = current[fieldParts[i]];
        }
        current[fieldParts[fieldParts.length - 1]] = updateData[field];
      }
    });

    // Recalculate quality score if quality control data was updated
    if (updateData.qualityControl) {
      await mrvData.calculateQualityScore();
    }

    await mrvData.save();

    res.status(200).json({
      success: true,
      message: 'MRV data updated successfully',
      data: mrvData
    });

  } catch (error) {
    logger.error('Update MRV data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update MRV data'
    });
  }
});

module.exports = router;
