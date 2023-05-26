import { expect, should } from "chai";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import { Canvas, Ink, InkMaker } from "../typechain-types";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Canvas", function () {
  let inkMaker: InkMaker;
  let inkMakerAsUser2: InkMaker;
  let canvas: Canvas;
  let ink: Ink;
  let user1: string;
  let user2: string;

  beforeEach(async function () {
    await deployments.fixture(["Main"]);
    ({ user1, user2 } = await getNamedAccounts());
    inkMaker = await ethers.getContract("InkMaker", user1);
    inkMakerAsUser2 = await ethers.getContract("InkMaker", user2);
    ink = await ethers.getContract("Ink", user1);
    canvas = await ethers.getContract("Canvas", user1);
  });

  describe("Pixel placing", function () {
    it("should allow user to give tokens for pixels", async function () {
      await inkMaker.stake(0, { value: parseEther("100000") });
      await time.increase(60 * 60 * 24);
      await inkMaker.stake(0);
      let balance = await ink.balanceOf(user1);

      await ink.approve(canvas.address, parseEther("1"));
      await canvas.setPixel(0, 0, 1);

      expect(await ink.balanceOf(user1)).to.equal(balance.sub(parseEther("1")));
      expect(await canvas.getPixel(0, 0)).to.equal(1);
    });
  });
});
