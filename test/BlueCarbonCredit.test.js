const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlueCarbonCredit", function () {
  let BlueCarbonCredit;
  let blueCarbonCredit;
  let owner;
  let projectOwner1;
  let projectOwner2;
  let user1;
  let user2;
  let user3;

  const MINT_AMOUNT = ethers.parseUnits("1000", 18); // 1000 tokens
  const TRANSFER_AMOUNT = ethers.parseUnits("100", 18); // 100 tokens
  const PROJECT_ID = "BC001";

  beforeEach(async function () {
    // Get signers
    [owner, projectOwner1, projectOwner2, user1, user2, user3] = await ethers.getSigners();

    // Deploy contract
    BlueCarbonCredit = await ethers.getContractFactory("BlueCarbonCredit");
    blueCarbonCredit = await BlueCarbonCredit.deploy();
    await blueCarbonCredit.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await blueCarbonCredit.owner()).to.equal(owner.address);
    });

    it("Should set the correct token name and symbol", async function () {
      expect(await blueCarbonCredit.name()).to.equal("BlueCarbonCredit");
      expect(await blueCarbonCredit.symbol()).to.equal("BCC");
    });

    it("Should set the correct decimals", async function () {
      expect(await blueCarbonCredit.decimals()).to.equal(18);
    });

    it("Should start with zero total supply", async function () {
      expect(await blueCarbonCredit.totalSupply()).to.equal(0);
    });

    it("Should return correct token info", async function () {
      const tokenInfo = await blueCarbonCredit.getTokenInfo();
      expect(tokenInfo.name).to.equal("BlueCarbonCredit");
      expect(tokenInfo.symbol).to.equal("BCC");
      expect(tokenInfo.decimals).to.equal(18);
      expect(tokenInfo.totalSupply).to.equal(0);
    });
  });

  describe("Project Owner Management", function () {
    it("Should allow owner to add verified project owner", async function () {
      await expect(blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address))
        .to.emit(blueCarbonCredit, "ProjectOwnerVerified")
        .withArgs(projectOwner1.address, true);
      
      expect(await blueCarbonCredit.isVerifiedProjectOwner(projectOwner1.address)).to.be.true;
    });

    it("Should allow owner to remove verified project owner", async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
      
      await expect(blueCarbonCredit.removeVerifiedProjectOwner(projectOwner1.address))
        .to.emit(blueCarbonCredit, "ProjectOwnerVerified")
        .withArgs(projectOwner1.address, false);
      
      expect(await blueCarbonCredit.isVerifiedProjectOwner(projectOwner1.address)).to.be.false;
    });

    it("Should not allow non-owner to add verified project owner", async function () {
      await expect(
        blueCarbonCredit.connect(user1).addVerifiedProjectOwner(projectOwner1.address)
      ).to.be.revertedWithCustomError(blueCarbonCredit, "OwnableUnauthorizedAccount");
    });

    it("Should not allow non-owner to remove verified project owner", async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
      
      await expect(
        blueCarbonCredit.connect(user1).removeVerifiedProjectOwner(projectOwner1.address)
      ).to.be.revertedWithCustomError(blueCarbonCredit, "OwnableUnauthorizedAccount");
    });

    it("Should not allow adding zero address as project owner", async function () {
      await expect(
        blueCarbonCredit.addVerifiedProjectOwner(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid project owner address");
    });

    it("Should not allow removing zero address as project owner", async function () {
      await expect(
        blueCarbonCredit.removeVerifiedProjectOwner(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid project owner address");
    });

    it("Should correctly check verified project owner status", async function () {
      expect(await blueCarbonCredit.isVerifiedProjectOwner(projectOwner1.address)).to.be.false;
      
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
      expect(await blueCarbonCredit.isVerifiedProjectOwner(projectOwner1.address)).to.be.true;
      
      await blueCarbonCredit.removeVerifiedProjectOwner(projectOwner1.address);
      expect(await blueCarbonCredit.isVerifiedProjectOwner(projectOwner1.address)).to.be.false;
    });
  });

  describe("Minting", function () {
    beforeEach(async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
    });

    it("Should allow verified project owner to mint tokens", async function () {
      await expect(blueCarbonCredit.connect(projectOwner1).mint(user1.address, MINT_AMOUNT, PROJECT_ID))
        .to.emit(blueCarbonCredit, "CarbonCreditsMinted")
        .withArgs(user1.address, MINT_AMOUNT, PROJECT_ID);

      expect(await blueCarbonCredit.balanceOf(user1.address)).to.equal(MINT_AMOUNT);
      expect(await blueCarbonCredit.totalSupply()).to.equal(MINT_AMOUNT);
    });

    it("Should not allow non-verified project owner to mint tokens", async function () {
      await expect(
        blueCarbonCredit.connect(user1).mint(user2.address, MINT_AMOUNT, PROJECT_ID)
      ).to.be.revertedWith("Only verified project owners can mint");
    });

    it("Should not allow minting to zero address", async function () {
      await expect(
        blueCarbonCredit.connect(projectOwner1).mint(ethers.ZeroAddress, MINT_AMOUNT, PROJECT_ID)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should not allow minting zero amount", async function () {
      await expect(
        blueCarbonCredit.connect(projectOwner1).mint(user1.address, 0, PROJECT_ID)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should allow multiple verified project owners to mint", async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner2.address);
      
      await blueCarbonCredit.connect(projectOwner1).mint(user1.address, MINT_AMOUNT, "PROJECT1");
      await blueCarbonCredit.connect(projectOwner2).mint(user2.address, MINT_AMOUNT, "PROJECT2");
      
      expect(await blueCarbonCredit.balanceOf(user1.address)).to.equal(MINT_AMOUNT);
      expect(await blueCarbonCredit.balanceOf(user2.address)).to.equal(MINT_AMOUNT);
      expect(await blueCarbonCredit.totalSupply()).to.equal(MINT_AMOUNT * 2n);
    });

    it("Should track total supply correctly after multiple mints", async function () {
      const mintAmount1 = ethers.parseUnits("500", 18);
      const mintAmount2 = ethers.parseUnits("300", 18);
      
      await blueCarbonCredit.connect(projectOwner1).mint(user1.address, mintAmount1, "PROJECT1");
      await blueCarbonCredit.connect(projectOwner1).mint(user2.address, mintAmount2, "PROJECT2");
      
      expect(await blueCarbonCredit.totalSupply()).to.equal(mintAmount1 + mintAmount2);
    });
  });

  describe("Transfer Functionality", function () {
    beforeEach(async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
      await blueCarbonCredit.connect(projectOwner1).mint(user1.address, MINT_AMOUNT, PROJECT_ID);
    });

    it("Should allow users to transfer tokens", async function () {
      await expect(blueCarbonCredit.connect(user1).transfer(user2.address, TRANSFER_AMOUNT))
        .to.emit(blueCarbonCredit, "Transfer")
        .withArgs(user1.address, user2.address, TRANSFER_AMOUNT);

      expect(await blueCarbonCredit.balanceOf(user1.address)).to.equal(MINT_AMOUNT - TRANSFER_AMOUNT);
      expect(await blueCarbonCredit.balanceOf(user2.address)).to.equal(TRANSFER_AMOUNT);
    });

    it("Should not allow transfer of more tokens than balance", async function () {
      const excessiveAmount = MINT_AMOUNT + ethers.parseUnits("1", 18);
      
      await expect(
        blueCarbonCredit.connect(user1).transfer(user2.address, excessiveAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should not allow transfer to zero address", async function () {
      await expect(
        blueCarbonCredit.connect(user1).transfer(ethers.ZeroAddress, TRANSFER_AMOUNT)
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("Should allow transferFrom with approval", async function () {
      await blueCarbonCredit.connect(user1).approve(user2.address, TRANSFER_AMOUNT);
      
      await expect(blueCarbonCredit.connect(user2).transferFrom(user1.address, user3.address, TRANSFER_AMOUNT))
        .to.emit(blueCarbonCredit, "Transfer")
        .withArgs(user1.address, user3.address, TRANSFER_AMOUNT);

      expect(await blueCarbonCredit.balanceOf(user1.address)).to.equal(MINT_AMOUNT - TRANSFER_AMOUNT);
      expect(await blueCarbonCredit.balanceOf(user3.address)).to.equal(TRANSFER_AMOUNT);
    });

    it("Should not allow transferFrom without sufficient allowance", async function () {
      await expect(
        blueCarbonCredit.connect(user2).transferFrom(user1.address, user3.address, TRANSFER_AMOUNT)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should allow multiple transfers between users", async function () {
      // Transfer from user1 to user2
      await blueCarbonCredit.connect(user1).transfer(user2.address, TRANSFER_AMOUNT);
      
      // Transfer from user2 to user3
      await blueCarbonCredit.connect(user2).transfer(user3.address, TRANSFER_AMOUNT);
      
      expect(await blueCarbonCredit.balanceOf(user1.address)).to.equal(MINT_AMOUNT - TRANSFER_AMOUNT);
      expect(await blueCarbonCredit.balanceOf(user2.address)).to.equal(0);
      expect(await blueCarbonCredit.balanceOf(user3.address)).to.equal(TRANSFER_AMOUNT);
    });
  });

  describe("Approval Functionality", function () {
    beforeEach(async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
      await blueCarbonCredit.connect(projectOwner1).mint(user1.address, MINT_AMOUNT, PROJECT_ID);
    });

    it("Should allow users to approve spender", async function () {
      await expect(blueCarbonCredit.connect(user1).approve(user2.address, TRANSFER_AMOUNT))
        .to.emit(blueCarbonCredit, "Approval")
        .withArgs(user1.address, user2.address, TRANSFER_AMOUNT);

      expect(await blueCarbonCredit.allowance(user1.address, user2.address)).to.equal(TRANSFER_AMOUNT);
    });

    it("Should allow users to increase allowance", async function () {
      await blueCarbonCredit.connect(user1).approve(user2.address, TRANSFER_AMOUNT);
      await blueCarbonCredit.connect(user1).approve(user2.address, TRANSFER_AMOUNT * 2n);
      
      expect(await blueCarbonCredit.allowance(user1.address, user2.address)).to.equal(TRANSFER_AMOUNT * 2n);
    });

    it("Should allow users to decrease allowance", async function () {
      await blueCarbonCredit.connect(user1).approve(user2.address, TRANSFER_AMOUNT * 2n);
      await blueCarbonCredit.connect(user1).approve(user2.address, TRANSFER_AMOUNT);
      
      expect(await blueCarbonCredit.allowance(user1.address, user2.address)).to.equal(TRANSFER_AMOUNT);
    });
  });

  describe("Pausable Functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      await blueCarbonCredit.pause();
      expect(await blueCarbonCredit.paused()).to.be.true;

      await blueCarbonCredit.unpause();
      expect(await blueCarbonCredit.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        blueCarbonCredit.connect(user1).pause()
      ).to.be.revertedWithCustomError(blueCarbonCredit, "OwnableUnauthorizedAccount");
    });

    it("Should not allow non-owner to unpause", async function () {
      await blueCarbonCredit.pause();
      
      await expect(
        blueCarbonCredit.connect(user1).unpause()
      ).to.be.revertedWithCustomError(blueCarbonCredit, "OwnableUnauthorizedAccount");
    });

    it("Should prevent minting when paused", async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
      await blueCarbonCredit.pause();
      
      await expect(
        blueCarbonCredit.connect(projectOwner1).mint(user1.address, MINT_AMOUNT, PROJECT_ID)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent transfer when paused", async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
      await blueCarbonCredit.connect(projectOwner1).mint(user1.address, MINT_AMOUNT, PROJECT_ID);
      await blueCarbonCredit.pause();
      
      await expect(
        blueCarbonCredit.connect(user1).transfer(user2.address, TRANSFER_AMOUNT)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent approval when paused", async function () {
      await blueCarbonCredit.pause();
      
      await expect(
        blueCarbonCredit.connect(user1).approve(user2.address, TRANSFER_AMOUNT)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very large mint amounts", async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
      const largeAmount = ethers.parseUnits("1000000000", 18); // 1 billion tokens
      
      await expect(blueCarbonCredit.connect(projectOwner1).mint(user1.address, largeAmount, PROJECT_ID))
        .to.emit(blueCarbonCredit, "CarbonCreditsMinted");
      
      expect(await blueCarbonCredit.balanceOf(user1.address)).to.equal(largeAmount);
      expect(await blueCarbonCredit.totalSupply()).to.equal(largeAmount);
    });

    it("Should handle multiple project owners with different statuses", async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner2.address);
      
      // Remove one project owner
      await blueCarbonCredit.removeVerifiedProjectOwner(projectOwner1.address);
      
      // Only projectOwner2 should be able to mint
      await expect(
        blueCarbonCredit.connect(projectOwner1).mint(user1.address, MINT_AMOUNT, PROJECT_ID)
      ).to.be.revertedWith("Only verified project owners can mint");
      
      await expect(blueCarbonCredit.connect(projectOwner2).mint(user1.address, MINT_AMOUNT, PROJECT_ID))
        .to.emit(blueCarbonCredit, "CarbonCreditsMinted");
    });

    it("Should maintain correct balances after complex transfer scenarios", async function () {
      await blueCarbonCredit.addVerifiedProjectOwner(projectOwner1.address);
      await blueCarbonCredit.connect(projectOwner1).mint(user1.address, MINT_AMOUNT, PROJECT_ID);
      
      // Transfer to multiple users
      const transfer1 = ethers.parseUnits("100", 18);
      const transfer2 = ethers.parseUnits("200", 18);
      const transfer3 = ethers.parseUnits("300", 18);
      
      await blueCarbonCredit.connect(user1).transfer(user2.address, transfer1);
      await blueCarbonCredit.connect(user1).transfer(user3.address, transfer2);
      await blueCarbonCredit.connect(user2).transfer(user3.address, transfer3);
      
      expect(await blueCarbonCredit.balanceOf(user1.address)).to.equal(MINT_AMOUNT - transfer1 - transfer2);
      expect(await blueCarbonCredit.balanceOf(user2.address)).to.equal(transfer1 - transfer3);
      expect(await blueCarbonCredit.balanceOf(user3.address)).to.equal(transfer2 + transfer3);
      expect(await blueCarbonCredit.totalSupply()).to.equal(MINT_AMOUNT);
    });
  });
});
