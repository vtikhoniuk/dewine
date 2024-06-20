import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("DeWineMarketplace", function () {
  async function deployMarketplace() {
    const [owner, seller, buyer] = await ethers.getSigners();
    console.log("owner    -> " + owner.address);
    console.log("seller   -> " + seller.address);
    console.log("buyer    -> " + buyer.address);

    const contractFactory = await ethers.getContractFactory("DeWineMarketplace");
    const contract = await contractFactory.deploy(owner.address);
    await contract.waitForDeployment();

    console.log("marketplaceContract -> " + contract.target);

    return { owner, seller, buyer, contract };
  }

  async function deployToken() {
    const [owner, dummy] = await ethers.getSigners();
    console.log("owner    -> " + owner.address);
    console.log("dummy    -> " + dummy.address);

    const contractFactory = await ethers.getContractFactory("DeWineToken");
    const contract = await contractFactory.deploy(owner.address);
    await contract.waitForDeployment();

    console.log("tokenContract -> " + contract.target);

    return { owner, dummy, contract };
  }

  it("listingFee test", async function () {
    const { seller: dummy, contract } = await loadFixture(deployMarketplace);

    await expect(contract.setListingFee(ethers.parseEther("0.05"))).to.not.be.reverted;
    expect(await contract.getListingFee()).to.be.eq(ethers.parseEther("0.05"));
    await expect(contract.connect(dummy).setListingFee(ethers.parseEther("0.01"))).to.be.reverted;
  });

  it("MarketItem Create/Cancel/Buy test", async function () {
    const { owner, seller, buyer, contract: marketplaceContract } = await loadFixture(deployMarketplace);
    const { contract: tokenContract } = await loadFixture(deployToken);

    await expect(tokenContract.connect(seller).mint(seller.address, 1, 100, "0x00")).to.be.reverted;
    await expect(tokenContract.mint(seller.address, 1, 100, "0x00")).to.not.be.reverted;
    await expect(tokenContract.connect(seller).setApprovalForAll(marketplaceContract.target, true)).to.not.be.reverted;

    // Create 1st marketItem
    let tx = await marketplaceContract
      .connect(seller)
      .createMarketItem(tokenContract.target, 1, 10, ethers.parseEther("0.3"), { value: ethers.parseEther("0.1") });
    let rc = await tx.wait();
    let event = rc.logs.find(event => event?.fragment?.name === "MarketItemCreated");
    expect(event.args[0]).to.be.eq(1);
    expect(event.args[1]).to.be.eq(tokenContract.target);
    expect(event.args[2]).to.be.eq(1);
    expect(event.args[3]).to.be.eq(10);
    expect(event.args[4]).to.be.eq(seller.address);
    expect(event.args[5]).to.be.eq(ethers.parseEther("0.3"));

    expect(await tokenContract.balanceOf(seller.address, 1)).to.be.eq(90);
    expect(await tokenContract.balanceOf(marketplaceContract.target, 1)).to.be.eq(10);
    expect(await ethers.provider.getBalance(seller.address)).to.be.lessThan(ethers.parseEther("9999.9"));

    // Cancel 1st marketItem
    await expect(marketplaceContract.cancelMarketItem(1)).to.be.reverted;
    tx = await marketplaceContract.connect(seller).cancelMarketItem(1);
    rc = await tx.wait();
    event = rc.logs.find(event => event?.fragment?.name === "MarketItemCanceled");
    expect(event.args[0]).to.be.eq(1);
    expect(event.args[1]).to.be.eq(tokenContract.target);
    expect(event.args[2]).to.be.eq(1);
    expect(event.args[3]).to.be.eq(10);
    expect(event.args[4]).to.be.eq(seller.address);
    expect(event.args[5]).to.be.eq(ethers.parseEther("0.3"));

    expect(await tokenContract.balanceOf(seller.address, 1)).to.be.eq(100);
    expect(await tokenContract.balanceOf(marketplaceContract.target, 1)).to.be.eq(0);
    expect(await ethers.provider.getBalance(seller.address)).to.be.lessThan(ethers.parseEther("9999.9"));

    // Create 2nd item
    await expect(tokenContract.mint(seller.address, 2, 50, "0x00")).to.not.be.reverted;

    tx = await marketplaceContract
      .connect(seller)
      .createMarketItem(tokenContract.target, 2, 22, ethers.parseEther("0.5"), { value: ethers.parseEther("0.22") });
    rc = await tx.wait();
    event = rc.logs.find(event => event?.fragment?.name === "MarketItemCreated");
    expect(event.args[0]).to.be.eq(2);
    expect(event.args[1]).to.be.eq(tokenContract.target);
    expect(event.args[2]).to.be.eq(2);
    expect(event.args[3]).to.be.eq(22);
    expect(event.args[4]).to.be.eq(seller.address);
    expect(event.args[5]).to.be.eq(ethers.parseEther("0.5"));

    expect(await tokenContract.balanceOf(seller.address, 2)).to.be.eq(28);
    expect(await tokenContract.balanceOf(marketplaceContract.target, 2)).to.be.eq(22);
    expect(await ethers.provider.getBalance(seller.address)).to.be.lessThan(ethers.parseEther("9999.7"));

    // Buy 2nd item
    await expect(marketplaceContract.connect(seller).cancelMarketItem(1)).to.be.reverted;
    await expect(marketplaceContract.connect(buyer).buyMarketItem(1, 1)).to.be.reverted;
    await expect(marketplaceContract.connect(buyer).buyMarketItem(2, 23)).to.be.reverted;

    tx = await marketplaceContract.connect(buyer).buyMarketItem(2, 14, { value: ethers.parseEther("7") });
    rc = await tx.wait();
    event = rc.logs.find(event => event?.fragment?.name === "MarketItemBought");
    expect(event.args[0]).to.be.eq(2);
    expect(event.args[1]).to.be.eq(tokenContract.target);
    expect(event.args[2]).to.be.eq(2);
    expect(event.args[3]).to.be.eq(14);
    expect(event.args[4]).to.be.eq(buyer.address);
    expect(event.args[5]).to.be.eq(ethers.parseEther("0.5"));

    expect(await tokenContract.balanceOf(buyer, 2)).to.be.eq(14);
    expect(await tokenContract.balanceOf(marketplaceContract.target, 2)).to.be.eq(8);
    expect(await ethers.provider.getBalance(seller.address)).to.be.greaterThan(ethers.parseEther("10006"));
    expect(await ethers.provider.getBalance(buyer.address)).to.be.lessThan(ethers.parseEther("9993"));
    console.log(await ethers.provider.getBalance(buyer.address));

    // Buy the rest of 2nd item
    tx = await marketplaceContract.buyMarketItem(2, 8, { value: ethers.parseEther("4") });
    rc = await tx.wait();
    event = rc.logs.find(event => event?.fragment?.name === "MarketItemBought");
    expect(event.args[0]).to.be.eq(2);
    expect(event.args[1]).to.be.eq(tokenContract.target);
    expect(event.args[2]).to.be.eq(2);
    expect(event.args[3]).to.be.eq(8);
    expect(event.args[4]).to.be.eq(owner.address);
    expect(event.args[5]).to.be.eq(ethers.parseEther("0.5"));

    expect(await tokenContract.balanceOf(owner, 2)).to.be.eq(8);
    expect(await tokenContract.balanceOf(marketplaceContract.target, 2)).to.be.eq(0);
    expect(await ethers.provider.getBalance(seller.address)).to.be.greaterThan(ethers.parseEther("10010"));
    expect(await ethers.provider.getBalance(owner.address)).to.be.lessThan(ethers.parseEther("9997"));
    console.log(await ethers.provider.getBalance(owner.address));

    // Try to buy empty item
    await expect(marketplaceContract.connect(buyer).buyMarketItem(2, 1)).to.be.reverted;
  });
});
