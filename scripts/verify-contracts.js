#!/usr/bin/env node

/**
 * Contract Verification Script
 * 
 * This script manually verifies deployed contracts on Etherscan.
 * Use this if automatic verification during deployment fails.
 * 
 * Usage:
 * npx hardhat run scripts/verify-contracts.js --network goerli
 */

const { ethers } = require("hardhat");

// Contract addresses and constructor arguments
// Update these with your actual deployed contract addresses
const CONTRACTS_TO_VERIFY = {
  BlueCarbonCredit: {
    address: "0x...", // Replace with actual address
    constructorArgs: [
      "BlueCarbonCredit",
      "BCC", 
      18,
      ethers.parseEther("1000000") // 1 million tokens
    ]
  },
  BlueCarbonMRV: {
    address: "0x...", // Replace with actual address
    constructorArgs: [
      "0x..." // BlueCarbonCredit contract address
    ]
  }
};

async function verifyContract(contractName, contractAddress, constructorArgs) {
  console.log(`\n🔍 Verifying ${contractName}...`);
  console.log(`Address: ${contractAddress}`);
  console.log(`Constructor Args:`, constructorArgs);
  
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    
    console.log(`✅ ${contractName} verified successfully!`);
    console.log(`🔗 Etherscan: https://goerli.etherscan.io/address/${contractAddress}`);
    return true;
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`ℹ️  ${contractName} is already verified`);
      return true;
    } else {
      console.log(`❌ Failed to verify ${contractName}: ${error.message}`);
      return false;
    }
  }
}

async function main() {
  console.log("🔍 Contract Verification Script");
  console.log("================================\n");
  
  // Check if Etherscan API key is set
  if (!process.env.ETHERSCAN_API_KEY) {
    console.log("❌ ETHERSCAN_API_KEY environment variable is required");
    process.exit(1);
  }
  
  let successCount = 0;
  const totalContracts = Object.keys(CONTRACTS_TO_VERIFY).length;
  
  for (const [contractName, contractInfo] of Object.entries(CONTRACTS_TO_VERIFY)) {
    if (contractInfo.address === "0x...") {
      console.log(`⚠️  Skipping ${contractName} - address not set`);
      continue;
    }
    
    const success = await verifyContract(
      contractName,
      contractInfo.address,
      contractInfo.constructorArgs
    );
    
    if (success) successCount++;
  }
  
  console.log(`\n📊 Verification Summary:`);
  console.log(`✅ Successfully verified: ${successCount}/${totalContracts} contracts`);
  
  if (successCount === totalContracts) {
    console.log("🎉 All contracts verified successfully!");
  } else {
    console.log("⚠️  Some contracts failed verification. Check the logs above.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });

