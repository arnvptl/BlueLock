const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Project = require('../models/Project');
const { addVerifiedProjectOwner, isVerifiedProjectOwner } = require('../services/web3Service');
const logger = require('../utils/logger');
const { generateProjectId } = require('../utils/idGenerator');

const router = express.Router();

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
const validateProjectRegistration = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Project name is required and must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('location').trim().isLength({ min: 1, max: 200 }).withMessage('Location is required and must be less than 200 characters'),
  body('area').isFloat({ min: 0 }).withMessage('Area must be a positive number'),
  body('areaUnit').optional().isIn(['sqm', 'hectares', 'acres', 'sqkm']).withMessage('Invalid area unit'),
  body('projectType').isIn(['mangrove', 'seagrass', 'saltmarsh', 'kelp', 'other']).withMessage('Invalid project type'),
  body('owner.address').isEthereumAddress().withMessage('Valid Ethereum address is required'),
  body('owner.name').optional().trim().isLength({ max: 100 }).withMessage('Owner name must be less than 100 characters'),
  body('owner.email').optional().isEmail().withMessage('Valid email is required'),
  body('owner.organization').optional().trim().isLength({ max: 200 }).withMessage('Organization name must be less than 200 characters'),
  body('coordinates.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('coordinates.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('metadata.tags').optional().isArray().withMessage('Tags must be an array'),
  body('metadata.tags.*').optional().trim().isLength({ max: 50 }).withMessage('Each tag must be less than 50 characters')
];

/**
 * POST /api/projects/register
 * Register a new project
 */
router.post('/register', upload.array('documents', 10), validateProjectRegistration, async (req, res) => {
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
      name,
      description,
      location,
      area,
      areaUnit = 'sqm',
      projectType,
      owner,
      coordinates,
      metadata
    } = req.body;

    // Generate unique project ID
    const projectId = await generateProjectId();

    // Check if project with same name and owner already exists
    const existingProject = await Project.findOne({
      name: name,
      'owner.address': owner.address.toLowerCase()
    });

    if (existingProject) {
      return res.status(409).json({
        success: false,
        error: 'Project with this name already exists for this owner'
      });
    }

    // Process uploaded documents
    const documents = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        documents.push({
          name: file.originalname,
          type: 'other',
          url: `/uploads/${file.filename}`,
          uploadedBy: owner.address.toLowerCase(),
          fileSize: file.size
        });
      });
    }

    // Create new project
    const project = new Project({
      projectId,
      name,
      description,
      location,
      area: parseFloat(area),
      areaUnit,
      projectType,
      owner: {
        ...owner,
        address: owner.address.toLowerCase()
      },
      coordinates,
      documents,
      metadata
    });

    // Save project to database
    await project.save();

    logger.info(`Project registered: ${projectId} by ${owner.address}`);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Project registered successfully',
      data: {
        projectId: project.projectId,
        name: project.name,
        location: project.location,
        owner: project.owner.address,
        status: project.status,
        createdAt: project.createdAt
      }
    });

  } catch (error) {
    logger.error('Project registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register project',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/projects/verify
 * Verify a project owner on blockchain
 */
router.post('/verify', [
  body('projectId').trim().isLength({ min: 1 }).withMessage('Project ID is required'),
  body('ownerAddress').isEthereumAddress().withMessage('Valid Ethereum address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { projectId, ownerAddress } = req.body;

    // Find project in database
    const project = await Project.findOne({ projectId: projectId.toUpperCase() });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Verify owner address matches
    if (project.owner.address.toLowerCase() !== ownerAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Owner address does not match project owner'
      });
    }

    // Check if already verified on blockchain
    const isVerified = await isVerifiedProjectOwner(ownerAddress);
    if (isVerified) {
      return res.status(409).json({
        success: false,
        error: 'Project owner is already verified on blockchain'
      });
    }

    // Add verified project owner on blockchain
    const blockchainResult = await addVerifiedProjectOwner(ownerAddress);

    // Update project verification status
    project.verificationStatus.isVerified = true;
    project.verificationStatus.verifiedBy = 'system';
    project.verificationStatus.verifiedAt = new Date();
    project.verificationStatus.verificationNotes = 'Verified via API';
    project.status = 'verified';
    project.blockchainData = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      transactionHash: blockchainResult.transactionHash,
      blockNumber: blockchainResult.blockNumber,
      isOnChain: true
    };

    await project.save();

    logger.info(`Project owner verified on blockchain: ${projectId} - ${ownerAddress}`);

    res.status(200).json({
      success: true,
      message: 'Project owner verified successfully',
      data: {
        projectId: project.projectId,
        ownerAddress: project.owner.address,
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        verifiedAt: project.verificationStatus.verifiedAt
      }
    });

  } catch (error) {
    logger.error('Project verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify project owner',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/projects
 * Get all projects with pagination and filtering
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      projectType,
      owner,
      verified,
      search
    } = req.query;

    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (projectType) query.projectType = projectType;
    if (owner) query['owner.address'] = owner.toLowerCase();
    if (verified === 'true') query['verificationStatus.isVerified'] = true;
    if (verified === 'false') query['verificationStatus.isVerified'] = false;
    
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query with pagination
    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    // Get total count
    const total = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        projects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve projects'
    });
  }
});

/**
 * GET /api/projects/:projectId
 * Get project by ID
 */
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ projectId: projectId.toUpperCase() });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      data: project
    });

  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve project'
    });
  }
});

/**
 * PUT /api/projects/:projectId
 * Update project
 */
router.put('/:projectId', upload.array('documents', 10), async (req, res) => {
  try {
    const { projectId } = req.params;
    const updateData = req.body;

    const project = await Project.findOne({ projectId: projectId.toUpperCase() });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Process new documents if uploaded
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        project.documents.push({
          name: file.originalname,
          type: 'other',
          url: `/uploads/${file.filename}`,
          uploadedBy: project.owner.address,
          fileSize: file.size
        });
      });
    }

    // Update allowed fields
    const allowedFields = ['name', 'description', 'location', 'area', 'areaUnit', 'projectType', 'coordinates', 'metadata'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        project[field] = updateData[field];
      }
    });

    await project.save();

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });

  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
});

/**
 * DELETE /api/projects/:projectId
 * Delete project (soft delete by setting status to suspended)
 */
router.delete('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ projectId: projectId.toUpperCase() });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Soft delete by setting status to suspended
    project.status = 'suspended';
    await project.save();

    res.status(200).json({
      success: true,
      message: 'Project suspended successfully'
    });

  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suspend project'
    });
  }
});

module.exports = router;
