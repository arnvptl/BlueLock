const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    required: true,
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
  },
  area: {
    type: Number,
    required: true,
    min: 0
  },
  areaUnit: {
    type: String,
    enum: ['sqm', 'hectares', 'acres', 'sqkm'],
    default: 'sqm'
  },
  projectType: {
    type: String,
    enum: ['mangrove', 'seagrass', 'saltmarsh', 'kelp', 'other'],
    required: true
  },
  owner: {
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
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'verified', 'suspended', 'completed'],
    default: 'draft'
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
    }
  },
  carbonData: {
    totalCO2Sequestered: {
      type: Number,
      default: 0,
      min: 0
    },
    lastMeasurementDate: {
      type: Date
    },
    measurementFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    }
  },
  blockchainData: {
    contractAddress: {
      type: String,
      lowercase: true
    },
    transactionHash: {
      type: String,
      lowercase: true
    },
    blockNumber: {
      type: Number
    },
    isOnChain: {
      type: Boolean,
      default: false
    }
  },
  documents: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['certification', 'measurement', 'verification', 'other'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: String,
      lowercase: true
    }
  }],
  metadata: {
    tags: [{
      type: String,
      trim: true
    }],
    additionalInfo: {
      type: mongoose.Schema.Types.Mixed
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
projectSchema.index({ projectId: 1 });
projectSchema.index({ 'owner.address': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ 'verificationStatus.isVerified': 1 });
projectSchema.index({ projectType: 1 });
projectSchema.index({ location: 'text', name: 'text', description: 'text' });

// Virtual for formatted area
projectSchema.virtual('formattedArea').get(function() {
  if (!this.area) return null;
  
  const formatters = {
    sqm: (area) => `${area.toLocaleString()} m²`,
    hectares: (area) => `${area.toLocaleString()} ha`,
    acres: (area) => `${area.toLocaleString()} acres`,
    sqkm: (area) => `${area.toLocaleString()} km²`
  };
  
  return formatters[this.areaUnit] ? formatters[this.areaUnit](this.area) : `${this.area} ${this.areaUnit}`;
});

// Virtual for project age
projectSchema.virtual('age').get(function() {
  if (!this.createdAt) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware
projectSchema.pre('save', function(next) {
  // Ensure projectId is uppercase
  if (this.projectId) {
    this.projectId = this.projectId.toUpperCase();
  }
  
  // Ensure owner address is lowercase
  if (this.owner && this.owner.address) {
    this.owner.address = this.owner.address.toLowerCase();
  }
  
  next();
});

// Static method to find verified projects
projectSchema.statics.findVerified = function() {
  return this.find({ 'verificationStatus.isVerified': true });
};

// Static method to find projects by owner
projectSchema.statics.findByOwner = function(ownerAddress) {
  return this.find({ 'owner.address': ownerAddress.toLowerCase() });
};

// Static method to find active projects
projectSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Instance method to update verification status
projectSchema.methods.verify = function(verifiedBy, notes = '') {
  this.verificationStatus.isVerified = true;
  this.verificationStatus.verifiedBy = verifiedBy.toLowerCase();
  this.verificationStatus.verifiedAt = new Date();
  this.verificationStatus.verificationNotes = notes;
  this.status = 'verified';
  return this.save();
};

// Instance method to add carbon data
projectSchema.methods.addCarbonData = function(co2Amount, measurementDate = new Date()) {
  this.carbonData.totalCO2Sequestered += co2Amount;
  this.carbonData.lastMeasurementDate = measurementDate;
  return this.save();
};

// Instance method to add document
projectSchema.methods.addDocument = function(documentData) {
  this.documents.push({
    ...documentData,
    uploadedAt: new Date()
  });
  return this.save();
};

// Instance method to update blockchain data
projectSchema.methods.updateBlockchainData = function(blockchainData) {
  this.blockchainData = {
    ...this.blockchainData,
    ...blockchainData,
    isOnChain: true
  };
  return this.save();
};

// Add indexes
projectSchema.index({ projectId: 1 }, { unique: true });
projectSchema.index({ 'location': 1 });
projectSchema.index({ 'status': 1 });
projectSchema.index({ 'createdAt': -1 });

module.exports = mongoose.model('Project', projectSchema);
