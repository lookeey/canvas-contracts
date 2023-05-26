import { expect, should } from "chai";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import { Ink, InkMaker } from "../typechain-types/index";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber, ContractTransaction } from "ethers";

import {
  MAX_INK_REWARD_PER_DAY,
  STAKING_SUPPLY_SOFT_CAP,
} from "../config/index";
import { calculateRewardsPerDay } from "../util/cubicFunction";

let maxCapacity = STAKING_SUPPLY_SOFT_CAP;
let halfMaxCapacity = STAKING_SUPPLY_SOFT_CAP / 2;
let fifthOfMaxCapacity = STAKING_SUPPLY_SOFT_CAP / 5;

async function fees(txns: ContractTransaction[]) {
  let totalFees = BigNumber.from(0);
  for (const txn of txns) {
    let receipt = await txn.wait();
    totalFees = totalFees.add(receipt.effectiveGasPrice.mul(receipt.gasUsed));
  }
  return totalFees;
}

describe("InkMaker", function () {
  let inkMaker: InkMaker;
  let inkMakerAsUser2: InkMaker;
  let ink: Ink;
  let user1: string;
  let user2: string;

  beforeEach(async function () {
    await deployments.fixture(["Main"]);
    ({ user1, user2 } = await getNamedAccounts());
    inkMaker = await ethers.getContract("InkMaker", user1);
    inkMakerAsUser2 = await ethers.getContract("InkMaker", user2);
    ink = await ethers.getContract("Ink", user1);
  });

  describe("Shares distribution", function () {
    it("should return same amount when lockup = 0", async function () {
      const result = await inkMaker.calcLockupMultiplier(parseEther("1"), 0);
      expect(result).to.equal(parseEther("1"));
    });

    it("should mint stake tokens", async function () {
      await inkMaker.stake(0, { value: parseEther("1") });
      expect(await inkMaker.balanceOf(user1)).to.equal(parseEther("1"));
    });

    it("should mint approx. twice as many stake tokens if lockup = 1 month", async function () {
      await inkMaker.stake(60 * 60 * 24 * 30, { value: parseEther("1") });
      expect(await inkMaker.balanceOf(user1)).to.approximately(
        parseEther("2"),
        parseEther("0.000001")
      );
    });

    it("should mint approx. 7x as many stake tokens if lockup = 6 months", async function () {
      await inkMaker.stake(60 * 60 * 24 * 180, {
        value: parseEther("1"),
      });
      expect(await inkMaker.balanceOf(user1)).to.approximately(
        parseEther("7"),
        parseEther("0.000001")
      );
    });

    it("should revert on staking with lockup > 7 months", async function () {
      await expect(
        inkMaker.stake(60 * 60 * 24 * 180 + 1, {
          value: parseEther("1"),
        })
      ).to.revertedWith("calcLockupMultiplier: max lockup exceeded.");
    });
  });

  describe("Cubic function distribution", function () {
    it(`1. should mint max. ${MAX_INK_REWARD_PER_DAY} Ink/day`, async function () {
      await inkMaker.stake(0, {
        value: parseEther(STAKING_SUPPLY_SOFT_CAP.toString()),
      });
      let emissionsPerSecond = await inkMaker.getCurrentRewardPerSecond();
      expect(emissionsPerSecond).to.be.approximately(
        parseEther(
          (calculateRewardsPerDay(STAKING_SUPPLY_SOFT_CAP) / 86400).toString()
        ),
        parseEther("0.0001")
      );
    });

    it(`2. should mint approx. ${calculateRewardsPerDay(
      halfMaxCapacity
    )} Ink/day if totalShares = ${halfMaxCapacity}`, async function () {
      await inkMaker.stake(0, {
        value: parseEther(halfMaxCapacity.toString()),
      });
      let emissionsPerSecond = await inkMaker.getCurrentRewardPerSecond();
      expect(emissionsPerSecond).to.be.approximately(
        parseEther(
          (calculateRewardsPerDay(halfMaxCapacity) / 86400).toString()
        ),
        parseEther("0.0001")
      );
    });

    it(`3. should mint approx. ${calculateRewardsPerDay(
      fifthOfMaxCapacity
    )} Ink/day if totalShares = ${fifthOfMaxCapacity}`, async function () {
      await inkMaker.stake(0, {
        value: parseEther(fifthOfMaxCapacity.toString()),
      });
      let emissionsPerSecond = await inkMaker.getCurrentRewardPerSecond();
      expect(emissionsPerSecond).to.be.approximately(
        parseEther(
          (calculateRewardsPerDay(fifthOfMaxCapacity) / 86400).toFixed(10)
        ),
        parseEther("0.0001")
      );
    });
  });

  describe("Claiming rewards", function () {
    it("should mint correct amount of rewards", async function () {
      await inkMaker.stake(0, {
        value: parseEther(fifthOfMaxCapacity.toString()),
      });
      await time.increase(86400);
      await inkMaker.stake(0, { value: parseEther("0") });
      expect(await ink.balanceOf(user1)).to.be.approximately(
        parseEther(calculateRewardsPerDay(fifthOfMaxCapacity).toString()),
        parseEther("0.1")
      );
    });

    it("should mint correct amount of rewards if lockup = 1 month", async function () {
      await inkMaker.stake(60 * 60 * 24 * 30, {
        value: parseEther(fifthOfMaxCapacity.toString()),
      });
      await time.increase(86400);
      await inkMaker.stake(0, { value: parseEther("0") });
      expect(await ink.balanceOf(user1)).to.be.approximately(
        parseEther(calculateRewardsPerDay(fifthOfMaxCapacity * 2).toFixed(18)),
        parseEther("0.2")
      );
    });

    it("should mint correct amounts for multiple users", async function () {
      await inkMaker.stake(0, {
        value: parseEther(fifthOfMaxCapacity.toString()),
      });
      await time.increase(86400);
      await inkMaker.stake(0, { value: parseEther("0") });

      let expectedRewardsDay1 = calculateRewardsPerDay(fifthOfMaxCapacity);
      expect(await ink.balanceOf(user1)).to.be.approximately(
        parseEther(expectedRewardsDay1.toString()),
        parseEther("0.1")
      );

      await inkMakerAsUser2.stake(0, {
        value: parseEther(fifthOfMaxCapacity.toString()),
      });
      await time.increase(86400);

      let expectedRewardsDay2 = calculateRewardsPerDay(fifthOfMaxCapacity * 2);
      await inkMakerAsUser2.stake(0, { value: parseEther("0") });
      expect(await ink.balanceOf(user2)).to.be.approximately(
        parseEther((expectedRewardsDay2 / 2).toFixed(10)),
        parseEther("0.5")
      );

      await inkMaker.stake(0, { value: parseEther("0") });
      expect(await ink.balanceOf(user1)).to.be.approximately(
        parseEther((expectedRewardsDay1 + expectedRewardsDay2 / 2).toFixed(10)),
        parseEther("0.5")
      );
    });

    it("should claim on withdraw", async function () {
      await inkMaker.stake(0, {
        value: parseEther(fifthOfMaxCapacity.toString()),
      });
      await time.increase(86400);
      await inkMaker.withdraw(0);
      expect(await ink.balanceOf(user1)).to.be.approximately(
        parseEther(calculateRewardsPerDay(fifthOfMaxCapacity).toFixed(10)),
        parseEther("0.1")
      );
    });

    it("should revert on withdrawing twice", async function () {
      await inkMaker.stake(0, {
        value: parseEther(fifthOfMaxCapacity.toString()),
      });
      await time.increase(86400);
      await inkMaker.withdraw(0);
      expect(inkMaker.withdraw(0)).to.be.revertedWith(
        "withdraw: already claimed"
      );
    });

    it("should allow multiple stakings", async function () {
      const initialBalance = await ethers.provider.getBalance(user1);
      let tx1 = await inkMaker.stake(0, {
        value: parseEther((fifthOfMaxCapacity / 2).toString()),
      });
      let tx2 = await inkMaker.stake(0, {
        value: parseEther((fifthOfMaxCapacity / 2).toString()),
      });
      expect(await ethers.provider.getBalance(user1)).to.equal(
        initialBalance
          .sub(parseEther(fifthOfMaxCapacity.toString()))
          .sub(await fees([tx1, tx2]))
      );

      await time.increase(86400);
      let tx3 = await inkMaker.stake(0, { value: parseEther("0") });
      expect(await ink.balanceOf(user1)).to.be.approximately(
        parseEther(calculateRewardsPerDay(fifthOfMaxCapacity).toString()),
        parseEther("0.2")
      );

      let tx4 = await inkMaker.withdraw(0);
      let tx5 = await inkMaker.withdraw(1);

      expect(await ethers.provider.getBalance(user1)).to.equal(
        initialBalance.sub(await fees([tx1, tx2, tx3, tx4, tx5]))
      );
    });
  });
});
