# BlueCarbonCredit ERC-20 Token

A focused ERC-20 smart contract for tokenizing carbon credits with restricted minting capabilities and full transfer functionality.

## 🎯 Overview

**BlueCarbonCredit (BCC)** is a standard ERC-20 token designed specifically for carbon credit tokenization with the following key features:

- **Name**: BlueCarbonCredit
- **Symbol**: BCC  
- **Decimals**: 18
- **Minting**: Restricted to verified project owners only
- **Transfer**: Full ERC-20 transfer functionality for trading between users

## 🏗️ Contract Features

### ✅ Core Functionality
- [x] Standard ERC-20 token implementation
- [x] Restricted minting (verified project owners only)
- [x] Full transfer functionality between users
- [x] Approval and transferFrom mechanisms
- [x] Emergency pause/unpause functionality
- [x] Access control for project owner management

### 🔒 Security Features
- [x] OpenZeppelin security standards
- [x] Reentrancy protection
- [x] Access control modifiers
- [x] Input validation
- [x] Pausable functionality

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Hardhat development environment

### Installation & Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Compile contracts**
   ```bash
   npm run compile
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Deploy to local network**
   ```bash
   npm run node
   # In another terminal
   npm run deploy:bcc:local
   ```

## 📖 Usage Guide

### 1. Contract Deployment

```javascript
// Deploy the BlueCarbonCredit token
const BlueCarbonCredit = await ethers.getContractFactory("BlueCarbonCredit");
const blueCarbonCredit = await BlueCarbonCredit.deploy();
await blueCarbonCredit.waitForDeployment();
```

### 2. Adding Verified Project Owners

```javascript
// Only contract owner can add verified project owners
await blueCarbonCredit.addVerifiedProjectOwner(projectOwnerAddress);

// Check if an address is a verified project owner
const isVerified = await blueCarbonCredit.isVerifiedProjectOwner(projectOwnerAddress);
```

### 3. Minting Carbon Credits

```javascript
// Only verified project owners can mint tokens
await blueCarbonCredit.connect(projectOwner).mint(
  recipientAddress,           // Address to receive tokens
  ethers.parseUnits("1000", 18), // Amount in wei (1000 tokens)
  "BC001"                     // Project identifier
);
```

### 4. Transferring Tokens

```javascript
// Direct transfer between users
await blueCarbonCredit.transfer(
  recipientAddress,
  ethers.parseUnits("100", 18) // 100 tokens
);

// Transfer with approval
await blueCarbonCredit.approve(spenderAddress, ethers.parseUnits("50", 18));
await blueCarbonCredit.connect(spender).transferFrom(
  ownerAddress,
  recipientAddress,
  ethers.parseUnits("50", 18)
);
```

### 5. Emergency Controls

```javascript
// Pause all operations (only owner)
await blueCarbonCredit.pause();

// Unpause operations (only owner)
await blueCarbonCredit.unpause();
```

## 📊 Contract Functions

### Project Owner Management
- `addVerifiedProjectOwner(address)` - Add verified project owner (owner only)
- `removeVerifiedProjectOwner(address)` - Remove verified project owner (owner only)
- `isVerifiedProjectOwner(address)` - Check if address is verified project owner

### Token Operations
- `mint(address to, uint256 amount, string projectId)` - Mint tokens (verified project owners only)
- `transfer(address to, uint256 amount)` - Transfer tokens
- `transferFrom(address from, address to, uint256 amount)` - Transfer with approval
- `approve(address spender, uint256 amount)` - Approve spender
- `allowance(address owner, address spender)` - Check allowance

### View Functions
- `name()` - Get token name
- `symbol()` - Get token symbol
- `decimals()` - Get token decimals
- `totalSupply()` - Get total supply
- `balanceOf(address)` - Get balance of address
- `getTokenInfo()` - Get complete token information

### Emergency Functions
- `pause()` - Pause all operations (owner only)
- `unpause()` - Unpause operations (owner only)
- `paused()` - Check if contract is paused

## 🔍 Events

The contract emits events for all major operations:

- `ProjectOwnerVerified(address indexed projectOwner, bool isVerified)` - Project owner verification status change
- `CarbonCreditsMinted(address indexed to, uint256 amount, string projectId)` - Token minting
- `Transfer(address indexed from, address indexed to, uint256 value)` - Token transfers
- `Approval(address indexed owner, address indexed spender, uint256 value)` - Approval events

## 🛡️ Security Considerations

### Access Control
- Only contract owner can add/remove verified project owners
- Only verified project owners can mint tokens
- All users can transfer tokens (standard ERC-20 behavior)

### Data Validation
- Cannot mint to zero address
- Cannot mint zero amount
- Cannot add/remove zero address as project owner

### Emergency Controls
- Contract can be paused/unpaused by owner
- All operations are disabled when paused
- Reentrancy protection on minting function

## 🔄 Workflow Example

1. **Contract Deployment**
   ```
   Owner → Deploy Contract → Token Created
   ```

2. **Project Owner Verification**
   ```
   Owner → addVerifiedProjectOwner() → Project Owner Verified
   ```

3. **Token Minting**
   ```
   Verified Project Owner → mint() → Tokens Minted
   ```

4. **Token Trading**
   ```
   User A → transfer() → User B → Tokens Transferred
   ```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npx hardhat test test/BlueCarbonCredit.test.js
```

### Test Coverage
```bash
npm run coverage
```

## 📈 Gas Optimization

The contract is optimized for gas efficiency:
- Uses OpenZeppelin's optimized ERC-20 implementation
- Minimal custom logic to reduce gas costs
- Efficient access control mechanisms

## 🔧 Configuration

### Environment Variables
Create a `.env` file based on `env.example`:

```env
PRIVATE_KEY=your_private_key_here
TESTNET_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

### Network Configuration
Update `hardhat.config.js` with your network settings for deployment.

## 🎯 Use Cases

### Carbon Credit Projects
- Blue carbon projects (mangroves, seagrasses, salt marshes)
- Forest conservation projects
- Renewable energy projects
- Carbon sequestration initiatives

### Trading Scenarios
- Direct peer-to-peer trading
- Exchange listings
- Carbon offset purchases
- Portfolio management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Note**: This contract is designed for carbon credit tokenization. Ensure proper verification and auditing before deployment to production networks.
