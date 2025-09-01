#!/usr/bin/env node

/**
 * Hardhat Deployment Script for Goerli Testnet
 * 
 * This script:
 * 1. Compiles all smart contracts
 * 2. Deploys contracts to Goerli testnet
 * 3. Verifies contracts on Etherscan
 * 4. Prints deployed contract addresses
 * 
 * Usage:
 * npx hardhat run scripts/deploy-goerli.js --network goerli
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration
const DEPLOYMENT_CONFIG = {
  // BlueCarbonCredit contract configuration
  BlueCarbonCredit: {
    name: "BlueCarbonCredit",
    symbol: "BCC",
    decimals: 18,
    initialSupply: ethers.parseEther("1000000"), // 1 million tokens
  },
  // BlueCarbonMRV contract configuration
  BlueCarbonMRV: {
    // Add any specific configuration for MRV contract if needed
  }
};

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "bright");
  log(`${"=".repeat(60)}`, "cyan");
}

function logSubSection(title) {
  log(`\n${"-".repeat(40)}`, "yellow");
  log(`  ${title}`, "yellow");
  log(`${"-".repeat(40)}`, "yellow");
}

/**
 * Save deployment information to a JSON file
 */
function saveDeploymentInfo(deploymentInfo) {
  const deploymentDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `deployment-goerli-${timestamp}.json`;
  const filepath = path.join(deploymentDir, filename);

  const deploymentData = {
    network: "goerli",
    chainId: 5,
    timestamp: new Date().toISOString(),
    deployer: deploymentInfo.deployer,
    contracts: deploymentInfo.contracts,
    gasUsed: deploymentInfo.gasUsed,
    totalCost: deploymentInfo.totalCost,
  };

  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  log(`Deployment info saved to: ${filepath}`, "green");
  
  return filepath;
}

/**
 * Wait for a transaction to be mined
 */
async function waitForTransaction(tx, description) {
  log(`⏳ ${description}...`, "yellow");
  const receipt = await tx.wait();
  log(`✅ ${description} completed!`, "green");
  log(`   Transaction Hash: ${receipt.hash}`, "cyan");
  log(`   Gas Used: ${receipt.gasUsed.toString()}`, "cyan");
  log(`   Block Number: ${receipt.blockNumber}`, "cyan");
  return receipt;
}

/**
 * Verify contract on Etherscan
 */
async function verifyContract(contractAddress, constructorArguments = [], contractName = "") {
  try {
    logSubSection(`Verifying ${contractName} on Etherscan`);
    log(`Contract Address: ${contractAddress}`, "cyan");
    
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments,
    });
    
    log(`✅ ${contractName} verified successfully on Etherscan!`, "green");
    return true;
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      log(`ℹ️  ${contractName} is already verified on Etherscan`, "yellow");
      return true;
    } else {
      log(`❌ Failed to verify ${contractName}: ${error.message}`, "red");
      return false;
    }
  }
}

/**
 * Deploy BlueCarbonCredit contract
 */
async function deployBlueCarbonCredit(deployer) {
  logSubSection("Deploying BlueCarbonCredit Contract");
  
  const config = DEPLOYMENT_CONFIG.BlueCarbonCredit;
  log(`Contract Name: ${config.name}`, "cyan");
  log(`Symbol: ${config.symbol}`, "cyan");
  log(`Decimals: ${config.decimals}`, "cyan");
  log(`Initial Supply: ${ethers.formatEther(config.initialSupply)} ${config.symbol}`, "cyan");
  
  const BlueCarbonCredit = await ethers.getContractFactory("BlueCarbonCredit");
  const blueCarbonCredit = await BlueCarbonCredit.connect(deployer).deploy(
    config.name,
    config.symbol,
    config.decimals,
    config.initialSupply
  );
  
  const receipt = await waitForTransaction(
    blueCarbonCredit.deploymentTransaction(),
    "Deploying BlueCarbonCredit contract"
  );
  
  const contractAddress = await blueCarbonCredit.getAddress();
  log(`✅ BlueCarbonCredit deployed at: ${contractAddress}`, "green");
  
  // Verify contract
  const constructorArgs = [
    config.name,
    config.symbol,
    config.decimals,
    config.initialSupply
  ];
  
  await verifyContract(contractAddress, constructorArgs, "BlueCarbonCredit");
  
  return {
    name: "BlueCarbonCredit",
    address: contractAddress,
    transactionHash: receipt.hash,
    gasUsed: receipt.gasUsed.toString(),
    constructorArgs: constructorArgs
  };
}

/**
 * Deploy BlueCarbonMRV contract
 */
async function deployBlueCarbonMRV(deployer, blueCarbonCreditAddress) {
  logSubSection("Deploying BlueCarbonMRV Contract");
  
  const BlueCarbonMRV = await ethers.getContractFactory("BlueCarbonMRV");
  const blueCarbonMRV = await BlueCarbonMRV.connect(deployer).deploy(
    blueCarbonCreditAddress
  );
  
  const receipt = await waitForTransaction(
    blueCarbonMRV.deploymentTransaction(),
    "Deploying BlueCarbonMRV contract"
  );
  
  const contractAddress = await blueCarbonMRV.getAddress();
  log(`✅ BlueCarbonMRV deployed at: ${contractAddress}`, "green");
  
  // Verify contract
  const constructorArgs = [blueCarbonCreditAddress];
  await verifyContract(contractAddress, constructorArgs, "BlueCarbonMRV");
  
  return {
    name: "BlueCarbonMRV",
    address: contractAddress,
    transactionHash: receipt.hash,
    gasUsed: receipt.gasUsed.toString(),
    constructorArgs: constructorArgs
  };
}

/**
 * Initialize contracts with basic setup
 */
async function initializeContracts(deployer, contracts) {
  logSubSection("Initializing Contracts");
  
  const blueCarbonCredit = await ethers.getContractAt("BlueCarbonCredit", contracts.BlueCarbonCredit.address);
  const blueCarbonMRV = await ethers.getContractAt("BlueCarbonMRV", contracts.BlueCarbonMRV.address);
  
  // Add deployer as verified project owner
  log("Adding deployer as verified project owner...", "yellow");
  const addOwnerTx = await blueCarbonCredit.connect(deployer).addVerifiedProjectOwner(deployer.address);
  await waitForTransaction(addOwnerTx, "Adding deployer as verified project owner");
  
  log("✅ Contract initialization completed!", "green");
}

/**
 * Main deployment function
 */
async function main() {
  logSection("BLUE CARBON MRV - GOERLI DEPLOYMENT");
  
  // Check environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }
  
  if (!process.env.GOERLI_RPC_URL) {
    throw new Error("GOERLI_RPC_URL environment variable is required");
  }
  
  if (!process.env.ETHERSCAN_API_KEY) {
    log("⚠️  ETHERSCAN_API_KEY not set. Contract verification will be skipped.", "yellow");
  }
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  log(`Deploying contracts with account: ${deployer.address}`, "cyan");
  
  const balance = await ethers.provider.getBalance(deployer.address);
  log(`Account balance: ${ethers.formatEther(balance)} ETH`, "cyan");
  
  if (balance < ethers.parseEther("0.1")) {
    throw new Error("Insufficient balance. Need at least 0.1 ETH for deployment.");
  }
  
  // Compile contracts
  logSubSection("Compiling Contracts");
  log("Compiling smart contracts...", "yellow");
  await hre.run("compile");
  log("✅ Contracts compiled successfully!", "green");
  
  // Deploy contracts
  logSubSection("Deploying Contracts");
  
  const deploymentInfo = {
    deployer: deployer.address,
    contracts: {},
    gasUsed: 0,
    totalCost: 0
  };
  
  // Deploy BlueCarbonCredit first
  const blueCarbonCreditInfo = await deployBlueCarbonCredit(deployer);
  deploymentInfo.contracts.BlueCarbonCredit = blueCarbonCreditInfo;
  deploymentInfo.gasUsed += parseInt(blueCarbonCreditInfo.gasUsed);
  
  // Deploy BlueCarbonMRV with BlueCarbonCredit address
  const blueCarbonMRVInfo = await deployBlueCarbonMRV(deployer, blueCarbonCreditInfo.address);
  deploymentInfo.contracts.BlueCarbonMRV = blueCarbonMRVInfo;
  deploymentInfo.gasUsed += parseInt(blueCarbonMRVInfo.gasUsed);
  
  // Initialize contracts
  await initializeContracts(deployer, deploymentInfo.contracts);
  
  // Calculate total cost
  const gasPrice = await ethers.provider.getFeeData();
  deploymentInfo.totalCost = ethers.formatEther(
    BigInt(deploymentInfo.gasUsed) * gasPrice.gasPrice
  );
  
  // Print deployment summary
  logSection("DEPLOYMENT SUMMARY");
  log("✅ All contracts deployed successfully!", "green");
  log(`\n📋 Contract Addresses:`, "bright");
  log(`   BlueCarbonCredit: ${deploymentInfo.contracts.BlueCarbonCredit.address}`, "cyan");
  log(`   BlueCarbonMRV:    ${deploymentInfo.contracts.BlueCarbonMRV.address}`, "cyan");
  
  log(`\n💰 Deployment Cost:`, "bright");
  log(`   Total Gas Used: ${deploymentInfo.gasUsed.toLocaleString()}`, "cyan");
  log(`   Total Cost: ${deploymentInfo.totalCost} ETH`, "cyan");
  
  log(`\n🔗 Etherscan Links:`, "bright");
  log(`   BlueCarbonCredit: https://goerli.etherscan.io/address/${deploymentInfo.contracts.BlueCarbonCredit.address}`, "cyan");
  log(`   BlueCarbonMRV:    https://goerli.etherscan.io/address/${deploymentInfo.contracts.BlueCarbonMRV.address}`, "cyan");
  
  // Save deployment info
  const deploymentFile = saveDeploymentInfo(deploymentInfo);
  
  log(`\n📄 Deployment information saved to: ${deploymentFile}`, "green");
  log(`\n🎉 Deployment completed successfully!`, "green");
  
  return deploymentInfo;
}

// Handle errors
main()
  .then(() => {
    log("\n✅ Deployment script completed successfully!", "green");
    process.exit(0);
  })
  .catch((error) => {
    log(`\n❌ Deployment failed: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  });

