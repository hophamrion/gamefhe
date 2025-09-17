import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting TrioDuel deployment...");
  
  try {
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      throw new Error("❌ Account has no ETH! Please fund your account with Sepolia ETH.");
    }
    
    // Deploy TrioDuel contract
    console.log("📦 Deploying TrioDuel contract...");
    const TrioDuel = await ethers.getContractFactory("TrioDuel");
    const trioDuel = await TrioDuel.deploy();
    
    console.log("⏳ Waiting for deployment confirmation...");
    await trioDuel.waitForDeployment();
    
    const address = await trioDuel.getAddress();
    console.log("✅ TrioDuel deployed successfully!");
    console.log("📍 Contract address:", address);
    console.log("🔗 Network:", await ethers.provider.getNetwork());
    
    // Save deployment info
    console.log("\n📋 Next steps:");
    console.log("1. Copy this address to aggregator/.env: DUEL_ADDR=" + address);
    console.log("2. ABI is already copied to aggregator/src/abi/TrioDuel.json");
    console.log("3. Start aggregator server: cd aggregator && npm run dev");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
