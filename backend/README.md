# Blue Carbon MRV Backend

A comprehensive Node.js Express backend for managing blue carbon MRV (Monitoring, Reporting, Verification) data and carbon credit tokenization with Ethereum blockchain integration.

## 🎯 Overview

This backend provides a complete API for:
- **Project Registration**: Register and manage blue carbon projects
- **MRV Data Management**: Upload and verify monitoring, reporting, and verification data
- **Carbon Credit Minting**: Mint carbon credit tokens on the blockchain
- **Blockchain Integration**: Seamless interaction with Ethereum smart contracts
- **Data Storage**: MongoDB-based metadata storage with comprehensive validation

## 🏗️ Architecture

### Core Components
- **Express.js**: Web framework for API endpoints
- **Web3.js**: Ethereum blockchain integration
- **MongoDB/Mongoose**: Data persistence and modeling
- **Joi/Express-validator**: Request validation
- **Winston**: Structured logging
- **Multer**: File upload handling

### Key Features
- ✅ RESTful API design
- ✅ Comprehensive input validation
- ✅ File upload support
- ✅ Blockchain transaction management
- ✅ Role-based access control
- ✅ Rate limiting and security
- ✅ Structured logging
- ✅ Error handling middleware
- ✅ MongoDB data models
- ✅ Gas optimization for transactions

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Ethereum node or provider (Infura, Alchemy, etc.)
- Deployed BlueCarbonCredit smart contract

### Installation

1. **Clone and install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment setup**
   ```bash
   cp config.env.example .env
   # Edit .env with your configuration
   ```

3. **Configure environment variables**
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/blue-carbon-mrv

   # Ethereum Configuration
   ETHEREUM_RPC_URL=http://localhost:8545
   CONTRACT_ADDRESS=0xYourDeployedContractAddress
   PRIVATE_KEY=YourPrivateKeyForTransactions

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
Currently uses placeholder authentication. Implement JWT or Web3 signature-based auth as needed.

### Endpoints

#### Project Management

**POST /projects/register**
Register a new blue carbon project

```json
{
  "name": "Sundarbans Mangrove Project",
  "description": "Mangrove restoration in Sundarbans",
  "location": "Sundarbans, Bangladesh",
  "area": 1000000,
  "areaUnit": "sqm",
  "projectType": "mangrove",
  "owner": {
    "address": "0x1234567890123456789012345678901234567890",
    "name": "Project Owner",
    "email": "owner@example.com",
    "organization": "Conservation NGO"
  },
  "coordinates": {
    "latitude": 21.9497,
    "longitude": 89.1833
  }
}
```

**POST /projects/verify**
Verify a project owner on blockchain

```json
{
  "projectId": "BC-2024-00001",
  "ownerAddress": "0x1234567890123456789012345678901234567890"
}
```

**GET /projects**
Get all projects with pagination and filtering

**GET /projects/:projectId**
Get specific project details

#### MRV Data Management

**POST /mrv/upload**
Upload MRV data for a project

```json
{
  "projectId": "BC-2024-00001",
  "measurementData": {
    "co2Sequestered": 150.5,
    "unit": "tons",
    "measurementDate": "2024-01-15T10:00:00Z",
    "measurementMethod": "satellite",
    "measurementLocation": "Sector A, Sundarbans"
  },
  "environmentalData": {
    "temperature": 28.5,
    "humidity": 75,
    "rainfall": 120
  },
  "reporter": {
    "address": "0x1234567890123456789012345678901234567890",
    "name": "Dr. Jane Smith",
    "email": "jane@research.org",
    "organization": "Marine Research Institute",
    "role": "scientist"
  },
  "qualityControl": {
    "accuracy": 95,
    "precision": 92,
    "confidenceLevel": 88
  }
}
```

**POST /mrv/verify**
Verify MRV data

```json
{
  "mrvId": "MRV-2024-00001",
  "verifiedBy": "0x1234567890123456789012345678901234567890",
  "notes": "Data verified through satellite imagery analysis",
  "method": "manual_review"
}
```

**GET /mrv**
Get all MRV data with filtering

**GET /mrv/:mrvId**
Get specific MRV data

#### Carbon Credit Management

**POST /credits/mint**
Mint carbon credits

```json
{
  "projectId": "BC-2024-00001",
  "recipientAddress": "0x1234567890123456789012345678901234567890",
  "amount": 100.5,
  "mintReason": "Verified CO2 sequestration from Q1 2024",
  "mrvDataIds": ["MRV-2024-00001", "MRV-2024-00002"]
}
```

**GET /credits/balance/:address**
Get token balance for an address

**GET /credits/supply**
Get total token supply

**GET /credits/project/:projectId**
Get project credit information

**POST /credits/calculate**
Calculate available credits for minting

```json
{
  "projectId": "BC-2024-00001",
  "mrvDataIds": ["MRV-2024-00001", "MRV-2024-00002"]
}
```

**GET /credits/status**
Get overall system status

## 🗄️ Database Models

### Project Model
- Project identification and metadata
- Owner information and verification status
- Carbon sequestration tracking
- Document attachments
- Blockchain transaction data

### MRV Data Model
- Measurement data (CO2 sequestered, location, method)
- Environmental parameters
- Reporter information
- Verification status and quality control
- Blockchain integration data

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | - |
| `CONTRACT_ADDRESS` | Deployed contract address | - |
| `PRIVATE_KEY` | Wallet private key | - |
| `JWT_SECRET` | JWT signing secret | - |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit requests per window | 100 |
| `MAX_FILE_SIZE` | Maximum file upload size | 10MB |

### Network Configuration
The backend supports multiple Ethereum networks:
- **Development**: Local Hardhat/Ganache
- **Testnet**: Sepolia, Goerli, etc.
- **Mainnet**: Ethereum mainnet

Configure via `NODE_ENV` and corresponding RPC URLs.

## 🔒 Security Features

### Input Validation
- Comprehensive request validation using Joi and express-validator
- Ethereum address format validation
- File type and size restrictions
- SQL injection prevention via Mongoose

### Access Control
- Role-based permissions for project owners
- Blockchain-based verification system
- Rate limiting to prevent abuse

### Data Protection
- Input sanitization
- File upload security
- Error message sanitization in production

## 📊 Monitoring and Logging

### Logging
- Structured logging with Winston
- Separate error and combined log files
- Request/response logging
- Blockchain transaction logging

### Health Checks
- `/health` endpoint for monitoring
- Database connection status
- Blockchain connection status

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm run coverage
```

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure production MongoDB
3. Set up Ethereum mainnet connection
4. Configure SSL/TLS
5. Set up monitoring and logging

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔄 Workflow Example

1. **Project Registration**
   ```
   Client → POST /projects/register → Project stored in MongoDB
   ```

2. **Project Verification**
   ```
   Admin → POST /projects/verify → Owner added to blockchain
   ```

3. **MRV Data Upload**
   ```
   Scientist → POST /mrv/upload → Data stored with quality metrics
   ```

4. **MRV Verification**
   ```
   Verifier → POST /mrv/verify → Data marked as verified
   ```

5. **Credit Minting**
   ```
   Project Owner → POST /credits/mint → Tokens minted on blockchain
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the logs in `backend/logs/`
- Verify environment configuration
- Ensure blockchain connectivity
- Check MongoDB connection

---

**Note**: This backend is designed to work with the BlueCarbonCredit smart contract. Ensure proper deployment and configuration before production use.
