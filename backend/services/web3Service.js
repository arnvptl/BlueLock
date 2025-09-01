const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let web3;
let contract;
let contractAddress;
let account;

/**
 * Connect to Ethereum blockchain
 */
const connectWeb3 = async () => {
  try {
    // Get RPC URL based on environment
    const rpcUrl = getRpcUrl();
    
    // Initialize Web3
    web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
    
    // Check connection
    const isListening = await web3.eth.net.isListening();
    if (!isListening) {
      throw new Error('Cannot connect to Ethereum network');
    }
    
    // Get network ID
    const networkId = await web3.eth.net.getId();
    logger.info(`Connected to Ethereum network ID: ${networkId}`);
    
    // Load contract ABI
    const contractAbi = loadContractAbi();
    
    // Get contract address
    contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('Contract address not configured');
    }
    
    // Initialize contract
    contract = new web3.eth.Contract(contractAbi, contractAddress);
    
    // Setup account
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Private key not configured');
    }
    
    account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    
    logger.info(`Web3 initialized with account: ${account.address}`);
    logger.info(`Contract address: ${contractAddress}`);
    
    return { web3, contract, account };
  } catch (error) {
    logger.error('Web3 connection failed:', error);
    throw error;
  }
};

/**
 * Get RPC URL based on environment
 */
const getRpcUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return process.env.ETHEREUM_RPC_URL_MAINNET;
    case 'testnet':
      return process.env.ETHEREUM_RPC_URL_TESTNET;
    default:
      return process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
  }
};

/**
 * Load contract ABI from file
 */
const loadContractAbi = () => {
  try {
    const abiPath = process.env.CONTRACT_ABI_PATH || 
      path.join(__dirname, '../../contracts/artifacts/contracts/BlueCarbonCredit.sol/BlueCarbonCredit.json');
    
    const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return contractJson.abi;
  } catch (error) {
    logger.error('Failed to load contract ABI:', error);
    throw new Error('Contract ABI not found');
  }
};

/**
 * Get gas price
 */
const getGasPrice = async () => {
  try {
    const gasPrice = await web3.eth.getGasPrice();
    return gasPrice;
  } catch (error) {
    logger.error('Failed to get gas price:', error);
    return process.env.GAS_PRICE || '20000000000'; // 20 gwei default
  }
};

/**
 * Estimate gas for transaction
 */
const estimateGas = async (method, ...params) => {
  try {
    const gasEstimate = await method.estimateGas(...params);
    return Math.floor(gasEstimate * 1.2); // Add 20% buffer
  } catch (error) {
    logger.error('Gas estimation failed:', error);
    return process.env.GAS_LIMIT || 3000000;
  }
};

/**
 * Send transaction to blockchain
 */
const sendTransaction = async (method, ...params) => {
  try {
    const gasPrice = await getGasPrice();
    const gasLimit = await estimateGas(method, ...params);
    
    const transaction = {
      from: account.address,
      gas: gasLimit,
      gasPrice: gasPrice,
      ...params
    };
    
    logger.info(`Sending transaction: ${JSON.stringify(transaction)}`);
    
    const result = await method.send(transaction);
    logger.info(`Transaction successful: ${result.transactionHash}`);
    
    return result;
  } catch (error) {
    logger.error('Transaction failed:', error);
    throw error;
  }
};

/**
 * Add verified project owner
 */
const addVerifiedProjectOwner = async (projectOwnerAddress) => {
  try {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    
    const result = await sendTransaction(
      contract.methods.addVerifiedProjectOwner(projectOwnerAddress)
    );
    
    return {
      success: true,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber
    };
  } catch (error) {
    logger.error('Failed to add verified project owner:', error);
    throw error;
  }
};

/**
 * Mint carbon credits
 */
const mintCarbonCredits = async (toAddress, amount, projectId) => {
  try {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    
    // Convert amount to wei (assuming amount is in tokens)
    const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
    
    const result = await sendTransaction(
      contract.methods.mint(toAddress, amountInWei, projectId)
    );
    
    return {
      success: true,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      amount: amount,
      recipient: toAddress,
      projectId: projectId
    };
  } catch (error) {
    logger.error('Failed to mint carbon credits:', error);
    throw error;
  }
};

/**
 * Get token balance
 */
const getTokenBalance = async (address) => {
  try {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    
    const balance = await contract.methods.balanceOf(address).call();
    return web3.utils.fromWei(balance, 'ether');
  } catch (error) {
    logger.error('Failed to get token balance:', error);
    throw error;
  }
};

/**
 * Get total supply
 */
const getTotalSupply = async () => {
  try {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    
    const totalSupply = await contract.methods.totalSupply().call();
    return web3.utils.fromWei(totalSupply, 'ether');
  } catch (error) {
    logger.error('Failed to get total supply:', error);
    throw error;
  }
};

/**
 * Check if address is verified project owner
 */
const isVerifiedProjectOwner = async (address) => {
  try {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    
    return await contract.methods.isVerifiedProjectOwner(address).call();
  } catch (error) {
    logger.error('Failed to check verified project owner:', error);
    throw error;
  }
};

/**
 * Get contract information
 */
const getContractInfo = async () => {
  try {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.methods.name().call(),
      contract.methods.symbol().call(),
      contract.methods.decimals().call(),
      contract.methods.totalSupply().call()
    ]);
    
    return {
      name,
      symbol,
      decimals: parseInt(decimals),
      totalSupply: web3.utils.fromWei(totalSupply, 'ether'),
      address: contractAddress
    };
  } catch (error) {
    logger.error('Failed to get contract info:', error);
    throw error;
  }
};

/**
 * Get transaction receipt
 */
const getTransactionReceipt = async (transactionHash) => {
  try {
    return await web3.eth.getTransactionReceipt(transactionHash);
  } catch (error) {
    logger.error('Failed to get transaction receipt:', error);
    throw error;
  }
};

/**
 * Get current block number
 */
const getCurrentBlock = async () => {
  try {
    return await web3.eth.getBlockNumber();
  } catch (error) {
    logger.error('Failed to get current block:', error);
    throw error;
  }
};

module.exports = {
  connectWeb3,
  addVerifiedProjectOwner,
  mintCarbonCredits,
  getTokenBalance,
  getTotalSupply,
  isVerifiedProjectOwner,
  getContractInfo,
  getTransactionReceipt,
  getCurrentBlock,
  web3: () => web3,
  contract: () => contract,
  account: () => account
};
