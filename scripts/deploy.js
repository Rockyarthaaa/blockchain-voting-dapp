const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Memulai deployment VotingSystem contract...");
  console.log("");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying dengan account:", deployer.address);
  
  // Get balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("");
  
  // Deploy contract
  console.log("⏳ Deploying VotingSystem contract...");
  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
  const votingSystem = await VotingSystem.deploy();
  
  await votingSystem.waitForDeployment();
  
  const contractAddress = await votingSystem.getAddress();
  console.log("✅ VotingSystem deployed to:", contractAddress);
  console.log("");
  
  // Save contract info untuk frontend
  const deploymentInfo = {
    network: "Sepolia Network",
    chainId: 999666,
    rpcUrl: "https://rpc.sepolia.org",
    contractAddress: contractAddress,
    deployedBy: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };
  
  // Save ke file JSON
  const deploymentPath = path.join(__dirname, "../deployment-info.json");
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("📝 Deployment info saved to: deployment-info.json");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ Deployment Summary");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 Contract Address:", contractAddress);
  console.log("⛓️ Network: Sepolia");
  console.log("🔗 RPC: https://rpc.sepolia.org");
  console.log("👤 Deployed by:", deployer.address);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("📌 Next Steps:");
  console.log("1. Copy contract address di atas");
  console.log("2. Paste ke file .env di bagian VITE_CONTRACT_ADDRESS");
  console.log("3. Lanjut build frontend!");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error during deployment:", error);
    process.exit(1);
  });