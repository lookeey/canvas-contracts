import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { artifacts, ethers } from "hardhat";
import { InkV2Mock } from "../../typechain-types/index";

const func: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployResult = await deploy("Ink", {
    from: deployer,
    log: true,
    contract: "InkV2Mock",
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
    },
  });

  const ink = (await ethers.getContractAt(
    artifacts.readArtifactSync("InkV2Mock").abi,
    deployResult.address
  )) as InkV2Mock;
  ink.setNewVar(42);

  console.log(
    "Ink Upgraded deployed at:",
    deployResult.implementation,
    "via proxy at:",
    deployResult.address
  );
};

export default func;

func.tags = ["InkV2", "Mock"];
