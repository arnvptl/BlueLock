const express = require('express');
const { body, validationResult } = require('express-validator');

const Project = require('../models/Project');
const MRVData = require('../models/MRVData');
const { mintCarbonCredits, getTokenBalance, getTotalSupply, isVerifiedProjectOwner } = require('../services/web3Service');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateCreditMinting = [
  body('projectId').trim().isLength({ min: 1 }).withMessage('Project ID is required'),
  body('recipientAddress').isEthereumAddress().withMessage('Valid recipient Ethereum address is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number greater than 0'),
  body('mintReason').optional().trim().isLength({ max: 500 }).withMessage('Mint reason must be less than 500 characters'),
  body('mrvDataIds').optional().isArray().withMessage('MRV data IDs must be an array'),
  body('mrvDataIds.*').optional().trim().isLength({ min: 1 }).withMessage('Each MRV data ID must not be empty')
];

/**
 * POST /api/credits/mint
 * Mint carbon credits
 */
router.post('/mint', validateCreditMinting, async (req, res) => {
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
      recipientAddress,
      amount,
      mintReason = '',
      mrvDataIds = []
    } = req.body;

    // Verify project exists and is verified
    const project = await Project.findOne({ projectId: projectId.toUpperCase() });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (!project.verificationStatus.isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Project must be verified before minting credits'
      });
    }

    // Verify project owner is verified on blockchain
    const isVerifiedOwner = await isVerifiedProjectOwner(project.owner.address);
    if (!isVerifiedOwner) {
      return res.status(400).json({
        success: false,
        error: 'Project owner must be verified on blockchain before minting credits'
      });
    }

    // Verify MRV data if provided
    if (mrvDataIds.length > 0) {
      const mrvData = await MRVData.find({
        mrvId: { $in: mrvDataIds.map(id => id.toUpperCase()) },
        projectId: projectId.toUpperCase()
      });

      if (mrvData.length !== mrvDataIds.length) {
        return res.status(400).json({
          success: false,
          error: 'Some MRV data not found or does not belong to this project'
        });
      }

      // Check if all MRV data is verified
      const unverifiedMRV = mrvData.filter(mrv => !mrv.verificationStatus.isVerified);
      if (unverifiedMRV.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'All MRV data must be verified before minting credits'
        });
      }

      // Calculate total CO2 from provided MRV data
      const totalCO2FromMRV = mrvData.reduce((sum, mrv) => sum + mrv.measurementData.co2Sequestered, 0);
      
      if (amount > totalCO2FromMRV) {
        return res.status(400).json({
          success: false,
          error: `Amount (${amount}) exceeds total CO2 from provided MRV data (${totalCO2FromMRV})`
        });
      }
    } else {
      // If no MRV data provided, check against project's total CO2
      if (amount > project.carbonData.totalCO2Sequestered) {
        return res.status(400).json({
          success: false,
          error: `Amount (${amount}) exceeds project's total CO2 sequestered (${project.carbonData.totalCO2Sequestered})`
        });
      }
    }

    // Mint credits on blockchain
    const blockchainResult = await mintCarbonCredits(recipientAddress, amount, projectId);

    // Create credit record in database
    const creditRecord = {
      projectId: projectId.toUpperCase(),
      recipientAddress: recipientAddress.toLowerCase(),
      amount: parseFloat(amount),
      mintReason,
      mrvDataIds: mrvDataIds.map(id => id.toUpperCase()),
      blockchainData: {
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        isOnChain: true,
        onChainTimestamp: new Date()
      },
      mintedBy: project.owner.address.toLowerCase(),
      mintedAt: new Date()
    };

    // Store credit record (you might want to create a Credit model for this)
    // For now, we'll just log it
    logger.info('Credit minted:', creditRecord);

    logger.info(`Carbon credits minted: ${amount} credits to ${recipientAddress} for project ${projectId}`);

    res.status(201).json({
      success: true,
      message: 'Carbon credits minted successfully',
      data: {
        projectId: projectId.toUpperCase(),
        recipientAddress: recipientAddress.toLowerCase(),
        amount: parseFloat(amount),
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        mintedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Credit minting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mint carbon credits',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/credits/balance/:address
 * Get token balance for an address
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    const balance = await getTokenBalance(address);

    res.status(200).json({
      success: true,
      data: {
        address: address.toLowerCase(),
        balance: parseFloat(balance),
        unit: 'BCC'
      }
    });

  } catch (error) {
    logger.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token balance'
    });
  }
});

/**
 * GET /api/credits/supply
 * Get total token supply
 */
router.get('/supply', async (req, res) => {
  try {
    const totalSupply = await getTotalSupply();

    res.status(200).json({
      success: true,
      data: {
        totalSupply: parseFloat(totalSupply),
        unit: 'BCC'
      }
    });

  } catch (error) {
    logger.error('Get supply error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get total supply'
    });
  }
});

/**
 * GET /api/credits/project/:projectId
 * Get credit information for a specific project
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project information
    const project = await Project.findOne({ projectId: projectId.toUpperCase() });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get verified MRV data for the project
    const verifiedMRVData = await MRVData.find({
      projectId: projectId.toUpperCase(),
      'verificationStatus.isVerified': true
    });

    // Calculate total CO2 from verified MRV data
    const totalCO2FromMRV = verifiedMRVData.reduce((sum, mrv) => sum + mrv.measurementData.co2Sequestered, 0);

    // Get project owner's token balance
    const ownerBalance = await getTokenBalance(project.owner.address);

    res.status(200).json({
      success: true,
      data: {
        projectId: project.projectId,
        projectName: project.name,
        totalCO2Sequestered: project.carbonData.totalCO2Sequestered,
        totalCO2FromVerifiedMRV: totalCO2FromMRV,
        verifiedMRVCount: verifiedMRVData.length,
        ownerAddress: project.owner.address,
        ownerBalance: parseFloat(ownerBalance),
        projectStatus: project.status,
        isVerified: project.verificationStatus.isVerified
      }
    });

  } catch (error) {
    logger.error('Get project credits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project credit information'
    });
  }
});

/**
 * POST /api/credits/calculate
 * Calculate available credits for minting based on MRV data
 */
router.post('/calculate', [
  body('projectId').trim().isLength({ min: 1 }).withMessage('Project ID is required'),
  body('mrvDataIds').optional().isArray().withMessage('MRV data IDs must be an array'),
  body('mrvDataIds.*').optional().trim().isLength({ min: 1 }).withMessage('Each MRV data ID must not be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { projectId, mrvDataIds = [] } = req.body;

    // Verify project exists
    const project = await Project.findOne({ projectId: projectId.toUpperCase() });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    let availableCredits = 0;
    let mrvDataDetails = [];

    if (mrvDataIds.length > 0) {
      // Calculate based on specific MRV data
      const mrvData = await MRVData.find({
        mrvId: { $in: mrvDataIds.map(id => id.toUpperCase()) },
        projectId: projectId.toUpperCase(),
        'verificationStatus.isVerified': true
      });

      availableCredits = mrvData.reduce((sum, mrv) => sum + mrv.measurementData.co2Sequestered, 0);
      
      mrvDataDetails = mrvData.map(mrv => ({
        mrvId: mrv.mrvId,
        co2Sequestered: mrv.measurementData.co2Sequestered,
        unit: mrv.measurementData.unit,
        measurementDate: mrv.measurementData.measurementDate,
        verifiedAt: mrv.verificationStatus.verifiedAt
      }));
    } else {
      // Calculate based on all verified MRV data for the project
      const verifiedMRVData = await MRVData.find({
        projectId: projectId.toUpperCase(),
        'verificationStatus.isVerified': true
      });

      availableCredits = verifiedMRVData.reduce((sum, mrv) => sum + mrv.measurementData.co2Sequestered, 0);
      
      mrvDataDetails = verifiedMRVData.map(mrv => ({
        mrvId: mrv.mrvId,
        co2Sequestered: mrv.measurementData.co2Sequestered,
        unit: mrv.measurementData.unit,
        measurementDate: mrv.measurementData.measurementDate,
        verifiedAt: mrv.verificationStatus.verifiedAt
      }));
    }

    res.status(200).json({
      success: true,
      data: {
        projectId: project.projectId,
        projectName: project.name,
        availableCredits,
        mrvDataCount: mrvDataDetails.length,
        mrvDataDetails,
        canMint: project.verificationStatus.isVerified && availableCredits > 0
      }
    });

  } catch (error) {
    logger.error('Calculate credits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate available credits'
    });
  }
});

/**
 * GET /api/credits/status
 * Get overall credit system status
 */
router.get('/status', async (req, res) => {
  try {
    // Get total supply
    const totalSupply = await getTotalSupply();

    // Get project statistics
    const totalProjects = await Project.countDocuments();
    const verifiedProjects = await Project.countDocuments({ 'verificationStatus.isVerified': true });
    const activeProjects = await Project.countDocuments({ status: 'active' });

    // Get MRV data statistics
    const totalMRVData = await MRVData.countDocuments();
    const verifiedMRVData = await MRVData.countDocuments({ 'verificationStatus.isVerified': true });

    // Calculate total CO2 from all verified MRV data
    const totalCO2Result = await MRVData.aggregate([
      { $match: { 'verificationStatus.isVerified': true } },
      { $group: { _id: null, total: { $sum: '$measurementData.co2Sequestered' } } }
    ]);

    const totalCO2Sequestered = totalCO2Result.length > 0 ? totalCO2Result[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        tokenInfo: {
          totalSupply: parseFloat(totalSupply),
          unit: 'BCC'
        },
        projects: {
          total: totalProjects,
          verified: verifiedProjects,
          active: activeProjects
        },
        mrvData: {
          total: totalMRVData,
          verified: verifiedMRVData
        },
        carbonData: {
          totalCO2Sequestered,
          unit: 'tons'
        }
      }
    });

  } catch (error) {
    logger.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status'
    });
  }
});

module.exports = router;
