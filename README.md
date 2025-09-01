# Blue Carbon MRV Smart Contract

A comprehensive Solidity smart contract for managing blue carbon MRV (Monitoring, Reporting, Verification) data and minting carbon credit tokens on a private Ethereum-based blockchain.

## 🌊 Overview

This smart contract provides a complete solution for:
- **Project Registration**: Register blue carbon projects with location, area, and ownership details
- **MRV Data Management**: Store and verify monitoring, reporting, and verification data
- **Carbon Credit Tokenization**: Mint ERC-20 tokens representing carbon credits (1 token = 1 ton CO2)
- **Role-Based Access Control**: Manage verifiers, reporters, and project owners
- **Audit Trail**: Complete transparency and traceability of all operations

## 🏗️ Architecture

### Core Components

1. **Project Management**
   - Project registration with unique IDs
   - Location and area tracking
   - Ownership and verification status

2. **MRV Data System**
   - CO2 sequestration measurements
   - Timestamp tracking
   - Verification workflow

3. **Carbon Credit Tokenization**
   - ERC-20 token standard implementation
   - 1:1 ratio (1 token = 1 ton CO2)
   - Minting and retirement mechanisms

4. **Access Control**
   - Owner (contract deployer)
   - Verifiers (can verify projects and MRV data)
   - Reporters (can add MRV data)
   - Project owners

## 📋 Features

### ✅ Core Functionality
- [x] Project registration and management
- [x] MRV data storage and verification
- [x] Carbon credit token minting
- [x] Token retirement (burning)
- [x] Role-based access control
- [x] Emergency pause/unpause functionality
- [x] Comprehensive audit trail with events

### 🔒 Security Features
- [x] Reentrancy protection
- [x] Access control modifiers
- [x] Input validation
- [x] Pausable functionality
- [x] OpenZeppelin security standards

### 📊 Data Management
- [x] Structured data storage
- [x] Efficient mappings and counters
- [x] Query functions for all data
- [x] Project and user relationship tracking

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Hardhat development environment

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blue-carbon-mrv-contract
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile contracts**
   ```bash
   npm run compile
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Deploy to local network**
   ```bash
   npm run node
   # In another terminal
   npm run deploy:local
   ```

## 📖 Usage Guide

### 1. Contract Deployment

```javascript
// Deploy the contract
const BlueCarbonMRV = await ethers.getContractFactory("BlueCarbonMRV");
const blueCarbonMRV = await BlueCarbonMRV.deploy();
await blueCarbonMRV.waitForDeployment();
```

### 2. Project Registration

```javascript
// Register a new blue carbon project
await blueCarbonMRV.registerProject(
  "BC001",                    // Project ID
  "Mangrove Forest, Sundarbans", // Location
  1000000                     // Area in square meters
);
```

### 3. Adding MRV Data

```javascript
// Add MRV data for a project
const timestamp = Math.floor(Date.now() / 1000);
await blueCarbonMRV.addMRVData(
  "BC001",    // Project ID
  100,        // CO2 sequestered in tons
  timestamp   // Measurement timestamp
);
```

### 4. Verification Process

```javascript
// Verify MRV data
await blueCarbonMRV.verifyMRVData(
  1,                          // MRV data ID
  true,                       // Verification status
  "Verified by accredited verifier" // Notes
);

// Verify project
await blueCarbonMRV.verifyProject("BC001", true);
```

### 5. Carbon Credit Minting

```javascript
// Mint carbon credit tokens
await blueCarbonMRV.mintCarbonCredits(
  "BC001",        // Project ID
  recipientAddress, // Recipient address
  100             // Amount in tons
);
```

### 6. Token Retirement

```javascript
// Retire carbon credits
await blueCarbonMRV.retireCarbonCredits(
  1,    // Carbon credit ID
  50    // Amount to retire
);
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Network RPC URLs
TESTNET_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# API Keys (optional)
ETHERSCAN_API_KEY=your_etherscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key

# Gas reporting
REPORT_GAS=true
```

### Network Configuration

Update `hardhat.config.js` with your network settings:

```javascript
networks: {
  private: {
    url: "http://your-private-blockchain-node:8545",
    chainId: 12345, // Your private blockchain chain ID
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  },
}
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npx hardhat test test/BlueCarbonMRV.test.js
```

### Test Coverage
```bash
npm run coverage
```

### Gas Reporting
```bash
REPORT_GAS=true npm test
```

## 📊 Contract Functions

### Project Management
- `registerProject(projectID, location, area)` - Register new project
- `verifyProject(projectID, isVerified)` - Verify project
- `deactivateProject(projectID)` - Deactivate project
- `getProject(projectID)` - Get project details

### MRV Data
- `addMRVData(projectID, co2Sequestered, timestamp)` - Add MRV data
- `verifyMRVData(mrvDataId, isVerified, notes)` - Verify MRV data
- `getMRVData(mrvDataId)` - Get MRV data details

### Carbon Credits
- `mintCarbonCredits(projectID, recipient, amount)` - Mint tokens
- `retireCarbonCredits(carbonCreditId, amount)` - Retire tokens
- `getCarbonCredit(carbonCreditId)` - Get credit details

### Role Management
- `addVerifier(verifier)` - Add verifier role
- `removeVerifier(verifier)` - Remove verifier role
- `addReporter(reporter)` - Add reporter role
- `removeReporter(reporter)` - Remove reporter role

### View Functions
- `getTotalProjects()` - Get total project count
- `getTotalMRVData()` - Get total MRV data count
- `getTotalCarbonCredits()` - Get total carbon credit count
- `getUserProjects(user)` - Get user's projects
- `getProjectMRVData(projectID)` - Get project's MRV data
- `getProjectCarbonCredits(projectID)` - Get project's carbon credits

## 🔍 Events

The contract emits events for all major operations:

- `ProjectRegistered` - New project registration
- `ProjectVerified` - Project verification status change
- `MRVDataAdded` - New MRV data added
- `MRVDataVerified` - MRV data verification
- `CarbonCreditsMinted` - Token minting
- `CarbonCreditsRetired` - Token retirement
- `ProjectDeactivated` - Project deactivation
- `VerifierAdded/Removed` - Verifier role changes
- `ReporterAdded/Removed` - Reporter role changes

## 🛡️ Security Considerations

### Access Control
- Only contract owner can add/remove verifiers and reporters
- Only project owners or authorized reporters can add MRV data
- Only verifiers or owner can verify projects and MRV data
- Only carbon credit recipients can retire their credits

### Data Validation
- Project IDs must be unique and non-empty
- Locations must be non-empty
- Areas must be greater than zero
- CO2 amounts must be greater than zero
- Timestamps cannot be in the future

### Emergency Controls
- Contract can be paused/unpaused by owner
- All operations are disabled when paused
- Reentrancy protection on all state-changing functions

## 📈 Gas Optimization

The contract is optimized for gas efficiency:
- Uses counters for ID generation
- Efficient data structures
- Optimized Solidity compiler settings
- Minimal storage operations

## 🔄 Workflow Example

1. **Project Registration**
   ```
   Project Owner → registerProject() → Project Created
   ```

2. **MRV Data Collection**
   ```
   Project Owner/Reporter → addMRVData() → MRV Data Stored
   ```

3. **Verification Process**
   ```
   Verifier → verifyMRVData() → verifyProject() → Project Verified
   ```

4. **Token Minting**
   ```
   Verifier/Owner → mintCarbonCredits() → Tokens Minted
   ```

5. **Token Usage**
   ```
   Token Holder → retireCarbonCredits() → Tokens Burned
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the test files for usage examples

## 🔗 Related Links

- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethereum Development](https://ethereum.org/developers/)

---

**Note**: This contract is designed for private Ethereum-based blockchains. Ensure proper testing and auditing before deployment to production networks.
