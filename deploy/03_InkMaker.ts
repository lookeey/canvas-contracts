import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { InkMaker } from "../typechain-types/index";
import {
  MAX_INK_REWARD_PER_DAY,
  STAKING_SUPPLY_SOFT_CAP,
} from "../config/index";

const func: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployResult = await deploy("InkMaker", {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
    },
  });
  console.log("InkMaker deployed at:", deployResult.address);

  const inkMaker: InkMaker = await ethers.getContractAt(
    "InkMaker",
    deployResult.address
  );
  const inkAddress = (await deployments.get("Ink")).address;
  inkMaker.initialize(
    inkAddress,
    MAX_INK_REWARD_PER_DAY * 1e2, // two decimals
    STAKING_SUPPLY_SOFT_CAP
  );
  console.log("Initialized InkMaker with Ink at", inkAddress);

  const ink = await ethers.getContractAt("Ink", inkAddress);
  await ink.transferOwnership(inkMaker.address);
  console.log("Set InkMaker as owner of Ink");
};

export default func;

func.tags = ["Main", "InkMaker"];
