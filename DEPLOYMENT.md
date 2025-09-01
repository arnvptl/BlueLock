# Blue Carbon MRV Smart Contract Deployment Guide

This guide provides step-by-step instructions for deploying the Blue Carbon MRV smart contracts to the Goerli testnet.

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **Goerli ETH** for gas fees (get from [Goerli Faucet](https://goerlifaucet.com/))
4. **Infura Account** (or other RPC provider)
5. **Etherscan Account** (for contract verification)

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the environment example file and configure your variables:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```bash
# Private Key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs
GOERLI_RPC_URL=https://goerli.infura.io/v3/YOUR_INFURA_PROJECT_ID
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Etherscan API Key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Gas Reporter (optional)
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here

# Network Configuration
NETWORK=goerli
```

### 3. Get Required API Keys

#### Infura API Key
1. Go to [Infura](https://infura.io/)
2. Create an account and project
3. Copy your project ID
4. Use format: `https://goerli.infura.io/v3/YOUR_PROJECT_ID`

#### Etherscan API Key
1. Go to [Etherscan](https://etherscan.io/)
2. Create an account
3. Go to API Keys section
4. Create a new API key

#### Goerli ETH
1. Go to [Goerli Faucet](https://goerlifaucet.com/)
2. Connect your wallet
3. Request test ETH (you'll need at least 0.1 ETH for deployment)

## 🚀 Deployment

### Quick Deployment

```bash
npm run deploy:goerli
```

### Step-by-Step Deployment

1. **Compile Contracts**
   ```bash
   npm run compile
   ```

2. **Deploy to Goerli**
   ```bash
   npx hardhat run scripts/deploy-goerli.js --network goerli
   ```

3. **Verify Contracts** (automatic with deployment script)
   ```bash
   npx hardhat verify --network goerli CONTRACT_ADDRESS [constructor_args]
   ```

## 📊 Deployment Output

The deployment script will provide:

```
============================================================
  BLUE CARBON MRV - GOERLI DEPLOYMENT
============================================================

Deploying contracts with account: 0x...
Account balance: 0.5 ETH

----------------------------------------
  Compiling Contracts
----------------------------------------
Compiling smart contracts...
✅ Contracts compiled successfully!

----------------------------------------
  Deploying Contracts
----------------------------------------

----------------------------------------
  Deploying BlueCarbonCredit Contract
----------------------------------------
Contract Name: BlueCarbonCredit
Symbol: BCC
Decimals: 18
Initial Supply: 1000000 BCC

⏳ Deploying BlueCarbonCredit contract...
✅ Deploying BlueCarbonCredit contract completed!
   Transaction Hash: 0x...
   Gas Used: 1234567
   Block Number: 12345678

✅ BlueCarbonCredit deployed at: 0x...

----------------------------------------
  Verifying BlueCarbonCredit on Etherscan
----------------------------------------
Contract Address: 0x...
✅ BlueCarbonCredit verified successfully on Etherscan!

----------------------------------------
  Deploying BlueCarbonMRV Contract
----------------------------------------
⏳ Deploying BlueCarbonMRV contract...
✅ Deploying BlueCarbonMRV contract completed!
   Transaction Hash: 0x...
   Gas Used: 2345678
   Block Number: 12345679

✅ BlueCarbonMRV deployed at: 0x...

----------------------------------------
  Verifying BlueCarbonMRV on Etherscan
----------------------------------------
Contract Address: 0x...
✅ BlueCarbonMRV verified successfully on Etherscan!

----------------------------------------
  Initializing Contracts
----------------------------------------
Adding deployer as verified project owner...
⏳ Adding deployer as verified project owner...
✅ Adding deployer as verified project owner completed!
   Transaction Hash: 0x...
   Gas Used: 45678
   Block Number: 12345680

✅ Contract initialization completed!

============================================================
  DEPLOYMENT SUMMARY
============================================================
✅ All contracts deployed successfully!

📋 Contract Addresses:
   BlueCarbonCredit: 0x...
   BlueCarbonMRV:    0x...

💰 Deployment Cost:
   Total Gas Used: 3,625,123
   Total Cost: 0.07250246 ETH

🔗 Etherscan Links:
   BlueCarbonCredit: https://goerli.etherscan.io/address/0x...
   BlueCarbonMRV:    https://goerli.etherscan.io/address/0x...

📄 Deployment information saved to: deployments/deployment-goerli-2024-01-01T12-00-00-000Z.json

🎉 Deployment completed successfully!
```

## 📁 Deployment Files

The deployment script creates a JSON file in the `deployments/` directory containing:

```json
{
  "network": "goerli",
  "chainId": 5,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "deployer": "0x...",
  "contracts": {
    "BlueCarbonCredit": {
      "name": "BlueCarbonCredit",
      "address": "0x...",
      "transactionHash": "0x...",
      "gasUsed": "1234567",
      "constructorArgs": [...]
    },
    "BlueCarbonMRV": {
      "name": "BlueCarbonMRV",
      "address": "0x...",
      "transactionHash": "0x...",
      "gasUsed": "2345678",
      "constructorArgs": [...]
    }
  },
  "gasUsed": 3625123,
  "totalCost": "0.07250246"
}
```

## 🔍 Verification

### Manual Verification

If automatic verification fails, you can manually verify contracts:

```bash
# BlueCarbonCredit
npx hardhat verify --network goerli 0xCONTRACT_ADDRESS "BlueCarbonCredit" "BCC" 18 1000000000000000000000000

# BlueCarbonMRV
npx hardhat verify --network goerli 0xCONTRACT_ADDRESS 0xBLUECARBONCREDIT_ADDRESS
```

### Check Verification Status

Visit the Etherscan links provided in the deployment output to verify contracts are properly verified.

## 🧪 Testing

### Local Testing

```bash
# Start local node
npm run node

# Deploy to local network
npm run deploy:local

# Run tests
npm test
```

### Testnet Testing

```bash
# Deploy to Sepolia
npm run deploy:sepolia

# Run tests on testnet
npx hardhat test --network sepolia
```

## 🔧 Troubleshooting

### Common Issues

1. **Insufficient Balance**
   ```
   Error: Insufficient balance. Need at least 0.1 ETH for deployment.
   ```
   **Solution**: Get more Goerli ETH from a faucet.

2. **Invalid Private Key**
   ```
   Error: PRIVATE_KEY environment variable is required
   ```
   **Solution**: Check your `.env` file and ensure PRIVATE_KEY is set correctly.

3. **RPC Connection Failed**
   ```
   Error: GOERLI_RPC_URL environment variable is required
   ```
   **Solution**: Verify your Infura project ID and RPC URL.

4. **Contract Verification Failed**
   ```
   ❌ Failed to verify BlueCarbonCredit: Already Verified
   ```
   **Solution**: This is normal if the contract was already verified.

5. **Gas Estimation Failed**
   ```
   Error: gas required exceeds allowance
   ```
   **Solution**: Increase gas limit in hardhat.config.js or check contract constructor parameters.

### Debug Mode

Enable debug logging:

```bash
DEBUG=hardhat:* npm run deploy:goerli
```

### Gas Optimization

To optimize gas usage:

```bash
# Enable gas reporting
REPORT_GAS=true npm run deploy:goerli

# Or run gas report separately
npm run coverage
```

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Etherscan API Documentation](https://docs.etherscan.io/)
- [Infura Documentation](https://docs.infura.io/)
- [Goerli Testnet Information](https://goerli.net/)

## 🔒 Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit private keys** to version control
2. **Use test accounts** for development and testing
3. **Verify contracts** on Etherscan after deployment
4. **Test thoroughly** on testnets before mainnet deployment
5. **Keep deployment records** for audit trails

## 📞 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Hardhat and Etherscan documentation
3. Check the deployment logs for specific error messages
4. Verify all environment variables are set correctly
5. Ensure sufficient testnet ETH balance

---

**Happy Deploying! 🚀**

