import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const chainId = await hre.getChainId();
  const chainName = hre.network.name;

  const contractName = "TrioDuel";
  const deployed = await deploy(contractName, {
    from: deployer,
    log: true,
  });

  console.log(`${contractName} contract address: ${deployed.address}`);
  console.log(`${contractName} chainId: ${chainId}`);
  console.log(`${contractName} chainName: ${chainName}`);

  // TODO: Manually copy ABI to aggregator after deployment
  console.log(`\n📋 Next steps:`);
  console.log(`1. Copy ABI from: artifacts/contracts/TrioDuel.sol/TrioDuel.json`);
  console.log(`2. Paste to: ../../aggregator/src/abi/TrioDuel.json`);
  console.log(`3. Update DUEL_ADDR in aggregator/.env with: ${deployed.address}`);
};

export default func;

func.id = "deploy_trioDuel"; // id required to prevent reexecution
func.tags = ["TrioDuel"];
