import { expect } from "chai";
import {
  artifacts,
  deployments,
  ethers,
  getNamedAccounts,
  hardhatArguments,
} from "hardhat";
import { Ink, InkMaker, InkV2Mock } from "../typechain-types/index";
import { parseEther } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Ink", function () {
  let inkMaker: InkMaker;
  let ink: InkV2Mock;
  let user1: string;
  let user2: string;

  beforeEach(async function () {
    await deployments.fixture(["Main"]);
    ({ user1, user2 } = await getNamedAccounts());
    inkMaker = await ethers.getContract("InkMaker", user1);
    ink = await ethers.getContractAt(
      artifacts.readArtifactSync("InkV2Mock").abi,
      (
        await deployments.get("Ink")
      ).address,
      user1
    );
  });

  it("should be upgradeable", async function () {
    await inkMaker.stake(0, { value: parseEther("200000") });
    await deployments.run(["InkV2", "Mock"], {
      resetMemory: false,
    });

    await time.increase(60 * 60 * 24 * 30);
    await expect(inkMaker.stake(0, { value: 0 })).to.be.revertedWith(
      "InkV2Mock: mint reverted"
    );

    expect(await ink.newVar()).to.equal(42);
  });
});
