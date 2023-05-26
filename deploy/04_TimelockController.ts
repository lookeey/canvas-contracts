import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployResult = await deploy("TimelockController", {
    from: deployer,
    log: true,
    args: [
      // min delay
      60 * 60 * 24 * 2,
      // proposer
      [deployer],
      // executor
      [deployer],
      // admin
      ethers.constants.AddressZero,
    ],
  });
  console.log("TimelockController deployed at:", deployResult.address);
};

export default func;

func.tags = ["Main", "TimelockController"];
