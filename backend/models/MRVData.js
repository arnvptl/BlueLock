const mongoose = require('mongoose');

const mrvDataSchema = new mongoose.Schema({
  mrvId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  projectId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    ref: 'Project'
  },
  measurementData: {
    co2Sequestered: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      enum: ['tons', 'kg', 'metric_tons'],
      default: 'tons'
    },
    measurementDate: {
      type: Date,
      required: true
    },
    measurementMethod: {
      type: String,
      enum: ['satellite', 'ground_survey', 'aerial_survey', 'sensor_network', 'other'],
      required: true
    },
    measurementLocation: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  environmentalData: {
    temperature: {
      type: Number
    },
    humidity: {
      type: Number,
      min: 0,
      max: 100
    },
    rainfall: {
      type: Number,
      min: 0
    },
    windSpeed: {
      type: Number,
      min: 0
    },
    soilMoisture: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  reporter: {
    address: {
      type: String,
      required: true,
      lowercase: true
    },
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    organization: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['project_owner', 'scientist', 'verifier', 'monitor', 'other'],
      required: true
    }
  },
  verificationStatus: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: String,
      lowercase: true
    },
    verifiedAt: {
      type: Date
    },
    verificationNotes: {
      type: String,
      trim: true
    },
    verificationMethod: {
      type: String,
      enum: ['manual_review', 'automated_check', 'third_party_audit', 'peer_review'],
      default: 'manual_review'
    }
  },
  qualityControl: {
    accuracy: {
      type: Number,
      min: 0,
      max: 100
    },
    precision: {
      type: Number,
      min: 0,
      max: 100
    },
    confidenceLevel: {
      type: Number,
      min: 0,
      max: 100
    },
    uncertainty: {
      type: Number,
      min: 0
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  blockchainData: {
    transactionHash: {
      type: String,
      lowercase: true
    },
    blockNumber: {
      type: Number
    },
    gasUsed: {
      type: Number
    },
    isOnChain: {
      type: Boolean,
      default: false
    },
    onChainTimestamp: {
      type: Date
    }
  },
  attachments: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'document', 'spreadsheet', 'video', 'other'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    ipfsCid: {
      type: String,
      trim: true
    },
    ipfsUrl: {
      type: String,
      trim: true
    },
    gatewayUrl: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    fileSize: {
      type: Number
    }
  }],
  metadata: {
    tags: [{
      type: String,
      trim: true
    }],
    notes: {
      type: String,
      trim: true
    },
    additionalInfo: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'verified', 'rejected', 'on_chain'],
    default: 'draft'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
mrvDataSchema.index({ mrvId: 1 });
mrvDataSchema.index({ projectId: 1 });
mrvDataSchema.index({ 'reporter.address': 1 });
mrvDataSchema.index({ 'verificationStatus.isVerified': 1 });
mrvDataSchema.index({ status: 1 });
mrvDataSchema.index({ 'measurementData.measurementDate': -1 });
mrvDataSchema.index({ 'blockchainData.isOnChain': 1 });

// Virtual for formatted CO2 amount
mrvDataSchema.virtual('formattedCO2Amount').get(function() {
  if (!this.measurementData.co2Sequestered) return null;
  
  const formatters = {
    tons: (amount) => `${amount.toLocaleString()} tons`,
    kg: (amount) => `${amount.toLocaleString()} kg`,
    metric_tons: (amount) => `${amount.toLocaleString()} metric tons`
  };
  
  return formatters[this.measurementData.unit] 
    ? formatters[this.measurementData.unit](this.measurementData.co2Sequestered)
    : `${this.measurementData.co2Sequestered} ${this.measurementData.unit}`;
});

// Virtual for measurement age
mrvDataSchema.virtual('measurementAge').get(function() {
  if (!this.measurementData.measurementDate) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.measurementData.measurementDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware
mrvDataSchema.pre('save', function(next) {
  // Ensure IDs are uppercase
  if (this.mrvId) {
    this.mrvId = this.mrvId.toUpperCase();
  }
  if (this.projectId) {
    this.projectId = this.projectId.toUpperCase();
  }
  
  // Ensure addresses are lowercase
  if (this.reporter && this.reporter.address) {
    this.reporter.address = this.reporter.address.toLowerCase();
  }
  if (this.verificationStatus && this.verificationStatus.verifiedBy) {
    this.verificationStatus.verifiedBy = this.verificationStatus.verifiedBy.toLowerCase();
  }
  
  next();
});

// Static method to find verified MRV data
mrvDataSchema.statics.findVerified = function() {
  return this.find({ 'verificationStatus.isVerified': true });
};

// Static method to find MRV data by project
mrvDataSchema.statics.findByProject = function(projectId) {
  return this.find({ projectId: projectId.toUpperCase() });
};

// Static method to find MRV data by reporter
mrvDataSchema.statics.findByReporter = function(reporterAddress) {
  return this.find({ 'reporter.address': reporterAddress.toLowerCase() });
};

// Static method to find on-chain MRV data
mrvDataSchema.statics.findOnChain = function() {
  return this.find({ 'blockchainData.isOnChain': true });
};

// Instance method to verify MRV data
mrvDataSchema.methods.verify = function(verifiedBy, notes = '', method = 'manual_review') {
  this.verificationStatus.isVerified = true;
  this.verificationStatus.verifiedBy = verifiedBy.toLowerCase();
  this.verificationStatus.verifiedAt = new Date();
  this.verificationStatus.verificationNotes = notes;
  this.verificationStatus.verificationMethod = method;
  this.status = 'verified';
  return this.save();
};

// Instance method to reject MRV data
mrvDataSchema.methods.reject = function(reason) {
  this.verificationStatus.isVerified = false;
  this.verificationStatus.verificationNotes = reason;
  this.status = 'rejected';
  return this.save();
};

// Instance method to update blockchain data
mrvDataSchema.methods.updateBlockchainData = function(blockchainData) {
  this.blockchainData = {
    ...this.blockchainData,
    ...blockchainData,
    isOnChain: true,
    onChainTimestamp: new Date()
  };
  this.status = 'on_chain';
  return this.save();
};

// Instance method to add attachment
mrvDataSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push({
    ...attachmentData,
    uploadedAt: new Date()
  });
  return this.save();
};

// Instance method to calculate quality score
mrvDataSchema.methods.calculateQualityScore = function() {
  let score = 0;
  let factors = 0;
  
  if (this.qualityControl.accuracy !== undefined) {
    score += this.qualityControl.accuracy;
    factors++;
  }
  
  if (this.qualityControl.precision !== undefined) {
    score += this.qualityControl.precision;
    factors++;
  }
  
  if (this.qualityControl.confidenceLevel !== undefined) {
    score += this.qualityControl.confidenceLevel;
    factors++;
  }
  
  this.qualityControl.qualityScore = factors > 0 ? Math.round(score / factors) : 0;
  return this.save();
};

// Add indexes
mrvDataSchema.index({ mrvId: 1 }, { unique: true });
mrvDataSchema.index({ projectId: 1 });
mrvDataSchema.index({ 'measurementData.measurementDate': -1 });
mrvDataSchema.index({ 'status': 1 });
mrvDataSchema.index({ 'createdAt': -1 });

module.exports = mongoose.model('MRVData', mrvDataSchema);
