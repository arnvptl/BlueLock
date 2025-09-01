const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting BlueCarbonCredit ERC-20 token deployment...");

  // Get the contract factory
  const BlueCarbonCredit = await ethers.getContractFactory("BlueCarbonCredit");
  console.log("📋 Contract factory loaded");

  // Deploy the contract
  console.log("⏳ Deploying BlueCarbonCredit token...");
  const blueCarbonCredit = await BlueCarbonCredit.deploy();
  
  // Wait for deployment to complete
  await blueCarbonCredit.waitForDeployment();
  
  const contractAddress = await blueCarbonCredit.getAddress();
  console.log("✅ BlueCarbonCredit deployed successfully!");
  console.log("📍 Contract address:", contractAddress);

  // Get deployment information
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployed by:", deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Verify contract deployment
  console.log("🔍 Verifying contract deployment...");
  const code = await ethers.provider.getCode(contractAddress);
  if (code === "0x") {
    throw new Error("Contract deployment failed - no code at address");
  }
  console.log("✅ Contract verification successful");

  // Get token details
  const name = await blueCarbonCredit.name();
  const symbol = await blueCarbonCredit.symbol();
  const decimals = await blueCarbonCredit.decimals();
  const totalSupply = await blueCarbonCredit.totalSupply();
  const owner = await blueCarbonCredit.owner();

  console.log("\n📊 Token Details:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals.toString());
  console.log("   Total Supply:", ethers.formatUnits(totalSupply, decimals));
  console.log("   Owner:", owner);

  // Log deployment summary
  console.log("\n🎉 Deployment Summary:");
  console.log("   Network:", network.name);
  console.log("   Contract:", "BlueCarbonCredit");
  console.log("   Address:", contractAddress);
  console.log("   Deployer:", deployer.address);
  console.log("   Gas used:", (await blueCarbonCredit.deploymentTransaction()).gasLimit.toString());

  // Save deployment info to file
  const deploymentInfo = {
    network: network.name,
    contract: "BlueCarbonCredit",
    address: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    gasUsed: (await blueCarbonCredit.deploymentTransaction()).gasLimit.toString(),
    tokenInfo: {
      name: name,
      symbol: symbol,
      decimals: decimals.toString(),
      totalSupply: totalSupply.toString()
    }
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentPath, `BlueCarbonCredit-${network.name}-${Date.now()}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployments folder");

  return {
    contract: blueCarbonCredit,
    address: contractAddress,
    deployer: deployer.address
  };
}

// Handle errors
main()
  .then((result) => {
    console.log("\n🎯 Deployment completed successfully!");
    console.log("📝 Next steps:");
    console.log("   1. Verify the contract on block explorer (if applicable)");
    console.log("   2. Add verified project owners using addVerifiedProjectOwner() function");
    console.log("   3. Start minting carbon credit tokens");
    console.log("   4. Enable trading between users");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
