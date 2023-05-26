import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployResult = await deploy("Ink", {
    from: deployer,
    log: true,
    contract: "Ink",
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
    },
  });
  console.log("Ink deployed at:", deployResult.address);
};

export default func;

func.tags = ["Main", "Ink"];
