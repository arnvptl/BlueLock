const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting BlueCarbonMRV contract deployment...");

  // Get the contract factory
  const BlueCarbonMRV = await ethers.getContractFactory("BlueCarbonMRV");
  console.log("📋 Contract factory loaded");

  // Deploy the contract
  console.log("⏳ Deploying BlueCarbonMRV contract...");
  const blueCarbonMRV = await BlueCarbonMRV.deploy();
  
  // Wait for deployment to complete
  await blueCarbonMRV.waitForDeployment();
  
  const contractAddress = await blueCarbonMRV.getAddress();
  console.log("✅ BlueCarbonMRV deployed successfully!");
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

  // Get contract details
  const name = await blueCarbonMRV.name();
  const symbol = await blueCarbonMRV.symbol();
  const decimals = await blueCarbonMRV.decimals();
  const owner = await blueCarbonMRV.owner();
  const isVerifier = await blueCarbonMRV.isVerifier(deployer.address);

  console.log("\n📊 Contract Details:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals.toString());
  console.log("   Owner:", owner);
  console.log("   Deployer is verifier:", isVerifier);

  // Log deployment summary
  console.log("\n🎉 Deployment Summary:");
  console.log("   Network:", network.name);
  console.log("   Contract:", "BlueCarbonMRV");
  console.log("   Address:", contractAddress);
  console.log("   Deployer:", deployer.address);
  console.log("   Gas used:", (await blueCarbonMRV.deploymentTransaction()).gasLimit.toString());

  // Save deployment info to file (optional)
  const deploymentInfo = {
    network: network.name,
    contract: "BlueCarbonMRV",
    address: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    gasUsed: (await blueCarbonMRV.deploymentTransaction()).gasLimit.toString()
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentPath, `${network.name}-${Date.now()}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployments folder");

  return {
    contract: blueCarbonMRV,
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
    console.log("   2. Add verifiers using addVerifier() function");
    console.log("   3. Add reporters using addReporter() function");
    console.log("   4. Start registering projects and adding MRV data");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
