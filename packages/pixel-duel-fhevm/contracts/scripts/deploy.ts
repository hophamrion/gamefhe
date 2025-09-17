import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("TrioDuel");
  const duel = await factory.deploy();
  await duel.waitForDeployment();
  const addr = await duel.getAddress();
  console.log("TrioDuel deployed:", addr);
}

main().catch((e) => { console.error(e); process.exit(1); });
