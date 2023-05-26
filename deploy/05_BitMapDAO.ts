import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
  network,
}: HardhatRuntimeEnvironment) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployResult = await deploy("BitMapDAO", {
    from: deployer,
    log: true,
    args: [
      // Votes Token
      (
        await deployments.get("InkMaker")
      ).address,
      // Timelock Controller
      (
        await deployments.get("TimelockController")
      ).address,
    ],
  });
  console.log("BitMapDAO deployed at:", deployResult.address);

  const daoAddress = deployResult.address;

  async function updateAdmin(address: string) {
    const proxyAdmin = await ethers.getContractAt(
      "ProxyAdmin",
      (
        await deployments.get("DefaultProxyAdmin")
      ).address
    );
    proxyAdmin.changeProxyAdmin(address, daoAddress);
    console.log(`Updated admin of ${address} to DAO`);
  }

  const inkAddr = (await deployments.get("Ink")).address;
  const inkMakerAddr = (await deployments.get("InkMaker")).address;
  const canvasAddr = (await deployments.get("Canvas")).address;

  if (network.name !== "hardhat") {
    await updateAdmin(inkAddr);
    await updateAdmin(inkMakerAddr);
    await updateAdmin(canvasAddr);
  }
};

export default func;

func.tags = ["Main", "BitMapDAO"];
