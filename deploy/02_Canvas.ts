import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployResult = await deploy("Canvas", {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
    },
  });
  console.log("Canvas deployed at:", deployResult.address);

  const canvas = await ethers.getContractAt("Canvas", deployResult.address);
  const inkAddress = (await deployments.get("Ink")).address;
  canvas.initialize(inkAddress);
  console.log("Canvas initialized with Ink at:", inkAddress);

  const ink = await ethers.getContractAt("Ink", inkAddress);
  await ink.initialize(canvas.address);
  console.log("Ink initialized with Canvas at:", canvas.address);
};

export default func;

func.tags = ["Main"];
