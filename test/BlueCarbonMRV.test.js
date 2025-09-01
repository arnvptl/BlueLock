const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlueCarbonMRV", function () {
  let BlueCarbonMRV;
  let blueCarbonMRV;
  let owner;
  let projectOwner;
  let verifier;
  let reporter;
  let user1;
  let user2;

  const PROJECT_ID = "BC001";
  const LOCATION = "Mangrove Forest, Sundarbans";
  const AREA = 1000000; // 1 square kilometer in square meters
  const CO2_AMOUNT = 100; // 100 tons of CO2

  beforeEach(async function () {
    // Get signers
    [owner, projectOwner, verifier, reporter, user1, user2] = await ethers.getSigners();

    // Deploy contract
    BlueCarbonMRV = await ethers.getContractFactory("BlueCarbonMRV");
    blueCarbonMRV = await BlueCarbonMRV.deploy();
    await blueCarbonMRV.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await blueCarbonMRV.owner()).to.equal(owner.address);
    });

    it("Should set the correct token name and symbol", async function () {
      expect(await blueCarbonMRV.name()).to.equal("Blue Carbon Credits");
      expect(await blueCarbonMRV.symbol()).to.equal("BCC");
    });

    it("Should set the correct decimals", async function () {
      expect(await blueCarbonMRV.decimals()).to.equal(18);
    });

    it("Should set owner as verifier", async function () {
      expect(await blueCarbonMRV.isVerifier(owner.address)).to.be.true;
    });

    it("Should start with zero total supply", async function () {
      expect(await blueCarbonMRV.totalSupply()).to.equal(0);
    });
  });

  describe("Role Management", function () {
    it("Should allow owner to add verifier", async function () {
      await expect(blueCarbonMRV.addVerifier(verifier.address))
        .to.emit(blueCarbonMRV, "VerifierAdded")
        .withArgs(verifier.address);
      
      expect(await blueCarbonMRV.isVerifier(verifier.address)).to.be.true;
    });

    it("Should allow owner to remove verifier", async function () {
      await blueCarbonMRV.addVerifier(verifier.address);
      await expect(blueCarbonMRV.removeVerifier(verifier.address))
        .to.emit(blueCarbonMRV, "VerifierRemoved")
        .withArgs(verifier.address);
      
      expect(await blueCarbonMRV.isVerifier(verifier.address)).to.be.false;
    });

    it("Should not allow non-owner to add verifier", async function () {
      await expect(
        blueCarbonMRV.connect(user1).addVerifier(verifier.address)
      ).to.be.revertedWithCustomError(blueCarbonMRV, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to add reporter", async function () {
      await expect(blueCarbonMRV.addReporter(reporter.address))
        .to.emit(blueCarbonMRV, "ReporterAdded")
        .withArgs(reporter.address);
      
      expect(await blueCarbonMRV.isReporter(reporter.address)).to.be.true;
    });

    it("Should not allow owner to remove themselves as verifier", async function () {
      await expect(
        blueCarbonMRV.removeVerifier(owner.address)
      ).to.be.revertedWith("Cannot remove owner as verifier");
    });
  });

  describe("Project Registration", function () {
    it("Should register a new project successfully", async function () {
      await expect(blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA))
        .to.emit(blueCarbonMRV, "ProjectRegistered")
        .withArgs(PROJECT_ID, projectOwner.address, LOCATION, AREA);

      const project = await blueCarbonMRV.getProject(PROJECT_ID);
      expect(project.projectID).to.equal(PROJECT_ID);
      expect(project.location).to.equal(LOCATION);
      expect(project.area).to.equal(AREA);
      expect(project.owner).to.equal(projectOwner.address);
      expect(project.isVerified).to.be.false;
      expect(project.isActive).to.be.true;
      expect(project.totalCO2Sequestered).to.equal(0);
    });

    it("Should not allow duplicate project ID", async function () {
      await blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA);
      
      await expect(
        blueCarbonMRV.connect(user1).registerProject(PROJECT_ID, "Different Location", AREA)
      ).to.be.revertedWith("Project ID already exists");
    });

    it("Should not allow empty project ID", async function () {
      await expect(
        blueCarbonMRV.connect(projectOwner).registerProject("", LOCATION, AREA)
      ).to.be.revertedWith("Project ID cannot be empty");
    });

    it("Should not allow empty location", async function () {
      await expect(
        blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, "", AREA)
      ).to.be.revertedWith("Location cannot be empty");
    });

    it("Should not allow zero area", async function () {
      await expect(
        blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, 0)
      ).to.be.revertedWith("Area must be greater than 0");
    });

    it("Should track user projects", async function () {
      await blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA);
      
      const userProjects = await blueCarbonMRV.getUserProjects(projectOwner.address);
      expect(userProjects).to.include(PROJECT_ID);
    });
  });

  describe("MRV Data Management", function () {
    beforeEach(async function () {
      await blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA);
    });

    it("Should add MRV data successfully", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      
      await expect(blueCarbonMRV.connect(projectOwner).addMRVData(PROJECT_ID, CO2_AMOUNT, timestamp))
        .to.emit(blueCarbonMRV, "MRVDataAdded")
        .withArgs(PROJECT_ID, 1, CO2_AMOUNT, timestamp);

      const mrvData = await blueCarbonMRV.getMRVData(1);
      expect(mrvData.projectID).to.equal(PROJECT_ID);
      expect(mrvData.co2Sequestered).to.equal(CO2_AMOUNT);
      expect(mrvData.timestamp).to.equal(timestamp);
      expect(mrvData.reporter).to.equal(projectOwner.address);
      expect(mrvData.isVerified).to.be.false;
    });

    it("Should allow authorized reporter to add MRV data", async function () {
      await blueCarbonMRV.addReporter(reporter.address);
      const timestamp = Math.floor(Date.now() / 1000);
      
      await expect(blueCarbonMRV.connect(reporter).addMRVData(PROJECT_ID, CO2_AMOUNT, timestamp))
        .to.emit(blueCarbonMRV, "MRVDataAdded");
    });

    it("Should not allow unauthorized user to add MRV data", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      
      await expect(
        blueCarbonMRV.connect(user1).addMRVData(PROJECT_ID, CO2_AMOUNT, timestamp)
      ).to.be.revertedWith("Only project owner or authorized reporter can add MRV data");
    });

    it("Should not allow adding MRV data for non-existent project", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      
      await expect(
        blueCarbonMRV.connect(projectOwner).addMRVData("NONEXISTENT", CO2_AMOUNT, timestamp)
      ).to.be.revertedWith("Project does not exist");
    });

    it("Should not allow zero CO2 amount", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      
      await expect(
        blueCarbonMRV.connect(projectOwner).addMRVData(PROJECT_ID, 0, timestamp)
      ).to.be.revertedWith("CO2 sequestered must be greater than 0");
    });

    it("Should not allow future timestamp", async function () {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400; // 1 day in future
      
      await expect(
        blueCarbonMRV.connect(projectOwner).addMRVData(PROJECT_ID, CO2_AMOUNT, futureTimestamp)
      ).to.be.revertedWith("Timestamp cannot be in the future");
    });

    it("Should update project total CO2 sequestered", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      await blueCarbonMRV.connect(projectOwner).addMRVData(PROJECT_ID, CO2_AMOUNT, timestamp);
      
      const project = await blueCarbonMRV.getProject(PROJECT_ID);
      expect(project.totalCO2Sequestered).to.equal(CO2_AMOUNT);
    });
  });

  describe("MRV Data Verification", function () {
    beforeEach(async function () {
      await blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA);
      await blueCarbonMRV.connect(projectOwner).addMRVData(PROJECT_ID, CO2_AMOUNT, Math.floor(Date.now() / 1000));
      await blueCarbonMRV.addVerifier(verifier.address);
    });

    it("Should allow owner to verify MRV data", async function () {
      await expect(blueCarbonMRV.verifyMRVData(1, true, "Verified by owner"))
        .to.emit(blueCarbonMRV, "MRVDataVerified")
        .withArgs(1, true, "Verified by owner");

      const mrvData = await blueCarbonMRV.getMRVData(1);
      expect(mrvData.isVerified).to.be.true;
      expect(mrvData.verificationNotes).to.equal("Verified by owner");
    });

    it("Should allow verifier to verify MRV data", async function () {
      await expect(blueCarbonMRV.connect(verifier).verifyMRVData(1, true, "Verified by verifier"))
        .to.emit(blueCarbonMRV, "MRVDataVerified")
        .withArgs(1, true, "Verified by verifier");
    });

    it("Should not allow unauthorized user to verify MRV data", async function () {
      await expect(
        blueCarbonMRV.connect(user1).verifyMRVData(1, true, "Unauthorized verification")
      ).to.be.revertedWith("Only owner or verifier can perform this action");
    });

    it("Should not allow verification of non-existent MRV data", async function () {
      await expect(
        blueCarbonMRV.verifyMRVData(999, true, "Invalid ID")
      ).to.be.revertedWith("Invalid MRV data ID");
    });
  });

  describe("Project Verification", function () {
    beforeEach(async function () {
      await blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA);
      await blueCarbonMRV.addVerifier(verifier.address);
    });

    it("Should allow owner to verify project", async function () {
      await expect(blueCarbonMRV.verifyProject(PROJECT_ID, true))
        .to.emit(blueCarbonMRV, "ProjectVerified")
        .withArgs(PROJECT_ID, true);

      const project = await blueCarbonMRV.getProject(PROJECT_ID);
      expect(project.isVerified).to.be.true;
    });

    it("Should allow verifier to verify project", async function () {
      await expect(blueCarbonMRV.connect(verifier).verifyProject(PROJECT_ID, true))
        .to.emit(blueCarbonMRV, "ProjectVerified");
    });

    it("Should not allow unauthorized user to verify project", async function () {
      await expect(
        blueCarbonMRV.connect(user1).verifyProject(PROJECT_ID, true)
      ).to.be.revertedWith("Only owner or verifier can perform this action");
    });
  });

  describe("Carbon Credit Minting", function () {
    beforeEach(async function () {
      await blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA);
      await blueCarbonMRV.connect(projectOwner).addMRVData(PROJECT_ID, CO2_AMOUNT, Math.floor(Date.now() / 1000));
      await blueCarbonMRV.verifyProject(PROJECT_ID, true);
      await blueCarbonMRV.verifyMRVData(1, true, "Verified");
    });

    it("Should mint carbon credits successfully", async function () {
      await expect(blueCarbonMRV.mintCarbonCredits(PROJECT_ID, user1.address, CO2_AMOUNT))
        .to.emit(blueCarbonMRV, "CarbonCreditsMinted")
        .withArgs(PROJECT_ID, user1.address, CO2_AMOUNT, 1);

      expect(await blueCarbonMRV.balanceOf(user1.address)).to.equal(CO2_AMOUNT * 10**18);
      expect(await blueCarbonMRV.totalSupply()).to.equal(CO2_AMOUNT * 10**18);
    });

    it("Should not mint credits for unverified project", async function () {
      await blueCarbonMRV.verifyProject(PROJECT_ID, false);
      
      await expect(
        blueCarbonMRV.mintCarbonCredits(PROJECT_ID, user1.address, CO2_AMOUNT)
      ).to.be.revertedWith("Project must be verified");
    });

    it("Should not mint more credits than available CO2", async function () {
      await expect(
        blueCarbonMRV.mintCarbonCredits(PROJECT_ID, user1.address, CO2_AMOUNT + 1)
      ).to.be.revertedWith("Amount exceeds total CO2 sequestered");
    });

    it("Should not mint to zero address", async function () {
      await expect(
        blueCarbonMRV.mintCarbonCredits(PROJECT_ID, ethers.ZeroAddress, CO2_AMOUNT)
      ).to.be.revertedWith("Invalid recipient address");
    });
  });

  describe("Carbon Credit Retirement", function () {
    beforeEach(async function () {
      await blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA);
      await blueCarbonMRV.connect(projectOwner).addMRVData(PROJECT_ID, CO2_AMOUNT, Math.floor(Date.now() / 1000));
      await blueCarbonMRV.verifyProject(PROJECT_ID, true);
      await blueCarbonMRV.verifyMRVData(1, true, "Verified");
      await blueCarbonMRV.mintCarbonCredits(PROJECT_ID, user1.address, CO2_AMOUNT);
    });

    it("Should retire carbon credits successfully", async function () {
      const retirementAmount = 50;
      
      await expect(blueCarbonMRV.connect(user1).retireCarbonCredits(1, retirementAmount))
        .to.emit(blueCarbonMRV, "CarbonCreditsRetired")
        .withArgs(1, retirementAmount);

      expect(await blueCarbonMRV.balanceOf(user1.address)).to.equal((CO2_AMOUNT - retirementAmount) * 10**18);
      expect(await blueCarbonMRV.totalSupply()).to.equal((CO2_AMOUNT - retirementAmount) * 10**18);
    });

    it("Should not allow non-recipient to retire credits", async function () {
      await expect(
        blueCarbonMRV.connect(user2).retireCarbonCredits(1, 50)
      ).to.be.revertedWith("Only recipient can retire carbon credits");
    });

    it("Should not retire more than available", async function () {
      await expect(
        blueCarbonMRV.connect(user1).retireCarbonCredits(1, CO2_AMOUNT + 1)
      ).to.be.revertedWith("Insufficient carbon credit amount");
    });

    it("Should mark credit as retired when fully retired", async function () {
      await blueCarbonMRV.connect(user1).retireCarbonCredits(1, CO2_AMOUNT);
      
      const carbonCredit = await blueCarbonMRV.getCarbonCredit(1);
      expect(carbonCredit.isRetired).to.be.true;
    });
  });

  describe("Project Deactivation", function () {
    beforeEach(async function () {
      await blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA);
    });

    it("Should allow project owner to deactivate project", async function () {
      await expect(blueCarbonMRV.connect(projectOwner).deactivateProject(PROJECT_ID))
        .to.emit(blueCarbonMRV, "ProjectDeactivated")
        .withArgs(PROJECT_ID);

      const project = await blueCarbonMRV.getProject(PROJECT_ID);
      expect(project.isActive).to.be.false;
    });

    it("Should allow contract owner to deactivate project", async function () {
      await expect(blueCarbonMRV.deactivateProject(PROJECT_ID))
        .to.emit(blueCarbonMRV, "ProjectDeactivated");
    });

    it("Should not allow unauthorized user to deactivate project", async function () {
      await expect(
        blueCarbonMRV.connect(user1).deactivateProject(PROJECT_ID)
      ).to.be.revertedWith("Only project owner or contract owner can deactivate project");
    });
  });

  describe("Pausable Functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      await blueCarbonMRV.pause();
      expect(await blueCarbonMRV.paused()).to.be.true;

      await blueCarbonMRV.unpause();
      expect(await blueCarbonMRV.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        blueCarbonMRV.connect(user1).pause()
      ).to.be.revertedWithCustomError(blueCarbonMRV, "OwnableUnauthorizedAccount");
    });

    it("Should prevent operations when paused", async function () {
      await blueCarbonMRV.pause();
      
      await expect(
        blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await blueCarbonMRV.connect(projectOwner).registerProject(PROJECT_ID, LOCATION, AREA);
      await blueCarbonMRV.connect(projectOwner).addMRVData(PROJECT_ID, CO2_AMOUNT, Math.floor(Date.now() / 1000));
    });

    it("Should return correct totals", async function () {
      expect(await blueCarbonMRV.getTotalProjects()).to.equal(1);
      expect(await blueCarbonMRV.getTotalMRVData()).to.equal(1);
      expect(await blueCarbonMRV.getTotalCarbonCredits()).to.equal(0);
    });

    it("Should return project MRV data IDs", async function () {
      const mrvDataIds = await blueCarbonMRV.getProjectMRVData(PROJECT_ID);
      expect(mrvDataIds).to.have.lengthOf(1);
      expect(mrvDataIds[0]).to.equal(1);
    });

    it("Should return user projects", async function () {
      const userProjects = await blueCarbonMRV.getUserProjects(projectOwner.address);
      expect(userProjects).to.have.lengthOf(1);
      expect(userProjects[0]).to.equal(PROJECT_ID);
    });
  });
});
