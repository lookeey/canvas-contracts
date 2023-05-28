import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { Ink, InkMaker } from "../typechain-types/index";
import {
  MAX_INK_REWARD_PER_DAY,
  STAKING_SUPPLY_SOFT_CAP,
} from "../config/index";
import { parseEther } from "ethers/lib/utils";

const func: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) {
  const { deploy } = deployments;
  const { deployer, user1 } = await getNamedAccounts();

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

  const ink: Ink = await ethers.getContractAt("Ink", inkAddress);
  if (network.name === "hardhat") {
    await ink.mint(user1, parseEther("1000000"));
  }
  await ink.transferOwnership(inkMaker.address);
  console.log("Set InkMaker as owner of Ink");
};

export default func;

func.tags = ["Main", "InkMaker"];
