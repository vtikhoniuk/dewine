import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("DeWine", function () {
  async function deploy() {
    const [owner, dummy] = await ethers.getSigners();
    console.log("owner    -> " + owner.address);
    console.log("dummy    -> " + dummy.address);

    const contractFactory = await ethers.getContractFactory("DeWineToken");
    const contract = await contractFactory.deploy(owner.address);
    await contract.waitForDeployment();

    console.log("Contract -> " + contract.target);

    return { owner, dummy, contract };
  }

  it("Base test", async function () {
    const { contract } = await loadFixture(deploy);

    await expect(contract.setURI("http://dewine.ru")).to.not.be.reverted;
  });

  it("Mint test", async function () {
    const { owner, dummy, contract } = await loadFixture(deploy);

    await expect(contract.mint(owner.address, 1, 100, "0x00")).to.not.be.reverted;
    expect(await contract.balanceOf(owner.address, 1)).to.be.eq(100);
    await expect(contract.mint(ethers.ZeroAddress, 2, 100, "0x00")).to.be.reverted;
    await expect(contract.connect(dummy).mint(dummy.address, 1, 100, "0x00")).to.be.reverted;
    await expect(contract.mint(dummy.address, 2, 100, "0x00")).to.not.be.reverted;
    expect(await contract.balanceOf(dummy.address, 1)).to.be.eq(0);
    expect(await contract.balanceOf(dummy.address, 2)).to.be.eq(100);
  });
});
