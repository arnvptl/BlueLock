// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title BlueCarbonMRV
 * @dev Smart contract for managing blue carbon MRV (Monitoring, Reporting, Verification) data
 * and minting carbon credit tokens on a private Ethereum-based blockchain.
 * 
 * Features:
 * - Project registration and management
 * - MRV data storage and verification
 * - Carbon credit token minting (1 token = 1 ton CO2)
 * - Role-based access control
 * - Audit trail and transparency
 */
contract BlueCarbonMRV is ERC20, Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Structs
    struct Project {
        string projectID;
        string location;
        uint256 area; // in square meters
        address owner;
        bool isVerified;
        bool isActive;
        uint256 totalCO2Sequestered;
        uint256 createdAt;
        uint256 lastUpdated;
    }

    struct MRVData {
        string projectID;
        uint256 co2Sequestered; // in tons
        uint256 timestamp;
        address reporter;
        bool isVerified;
        string verificationNotes;
    }

    struct CarbonCredit {
        string projectID;
        uint256 amount; // in tons
        uint256 mintedAt;
        address recipient;
        bool isRetired;
    }

    // State variables
    Counters.Counter private _projectCounter;
    Counters.Counter private _mrvDataCounter;
    Counters.Counter private _carbonCreditCounter;

    mapping(string => Project) public projects;
    mapping(uint256 => MRVData) public mrvData;
    mapping(uint256 => CarbonCredit) public carbonCredits;
    mapping(string => uint256[]) public projectMRVData; // projectID => array of MRV data IDs
    mapping(string => uint256[]) public projectCarbonCredits; // projectID => array of carbon credit IDs
    mapping(address => string[]) public userProjects; // user address => array of project IDs

    // Events
    event ProjectRegistered(string indexed projectID, address indexed owner, string location, uint256 area);
    event ProjectVerified(string indexed projectID, bool isVerified);
    event MRVDataAdded(string indexed projectID, uint256 indexed mrvDataId, uint256 co2Sequestered, uint256 timestamp);
    event MRVDataVerified(uint256 indexed mrvDataId, bool isVerified, string verificationNotes);
    event CarbonCreditsMinted(string indexed projectID, address indexed recipient, uint256 amount, uint256 carbonCreditId);
    event CarbonCreditsRetired(uint256 indexed carbonCreditId, uint256 amount);
    event ProjectDeactivated(string indexed projectID);

    // Modifiers
    modifier onlyProjectOwner(string memory projectID) {
        require(projects[projectID].owner == msg.sender, "Only project owner can perform this action");
        _;
    }

    modifier onlyVerifiedProject(string memory projectID) {
        require(projects[projectID].isVerified, "Project must be verified");
        require(projects[projectID].isActive, "Project must be active");
        _;
    }

    modifier projectExists(string memory projectID) {
        require(bytes(projects[projectID].projectID).length > 0, "Project does not exist");
        _;
    }

    modifier onlyOwnerOrVerifier() {
        require(msg.sender == owner() || isVerifier(msg.sender), "Only owner or verifier can perform this action");
        _;
    }

    // Role management
    mapping(address => bool) public verifiers;
    mapping(address => bool) public reporters;

    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event ReporterAdded(address indexed reporter);
    event ReporterRemoved(address indexed reporter);

    constructor() ERC20("Blue Carbon Credits", "BCC") {
        // Initialize with owner as first verifier
        verifiers[msg.sender] = true;
        emit VerifierAdded(msg.sender);
    }

    /**
     * @dev Register a new blue carbon project
     * @param projectID Unique identifier for the project
     * @param location Geographic location of the project
     * @param area Area of the project in square meters
     */
    function registerProject(
        string memory projectID,
        string memory location,
        uint256 area
    ) external whenNotPaused nonReentrant {
        require(bytes(projectID).length > 0, "Project ID cannot be empty");
        require(bytes(location).length > 0, "Location cannot be empty");
        require(area > 0, "Area must be greater than 0");
        require(bytes(projects[projectID].projectID).length == 0, "Project ID already exists");

        _projectCounter.increment();

        projects[projectID] = Project({
            projectID: projectID,
            location: location,
            area: area,
            owner: msg.sender,
            isVerified: false,
            isActive: true,
            totalCO2Sequestered: 0,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        userProjects[msg.sender].push(projectID);

        emit ProjectRegistered(projectID, msg.sender, location, area);
    }

    /**
     * @dev Add MRV data for a project
     * @param projectID Project identifier
     * @param co2Sequestered Amount of CO2 sequestered in tons
     * @param timestamp Timestamp of the measurement
     */
    function addMRVData(
        string memory projectID,
        uint256 co2Sequestered,
        uint256 timestamp
    ) external whenNotPaused nonReentrant projectExists(projectID) {
        require(co2Sequestered > 0, "CO2 sequestered must be greater than 0");
        require(timestamp <= block.timestamp, "Timestamp cannot be in the future");
        require(
            msg.sender == projects[projectID].owner || reporters[msg.sender],
            "Only project owner or authorized reporter can add MRV data"
        );

        _mrvDataCounter.increment();
        uint256 mrvDataId = _mrvDataCounter.current();

        mrvData[mrvDataId] = MRVData({
            projectID: projectID,
            co2Sequestered: co2Sequestered,
            timestamp: timestamp,
            reporter: msg.sender,
            isVerified: false,
            verificationNotes: ""
        });

        projectMRVData[projectID].push(mrvDataId);
        projects[projectID].totalCO2Sequestered += co2Sequestered;
        projects[projectID].lastUpdated = block.timestamp;

        emit MRVDataAdded(projectID, mrvDataId, co2Sequestered, timestamp);
    }

    /**
     * @dev Verify MRV data (only owner or verifiers)
     * @param mrvDataId ID of the MRV data to verify
     * @param isVerified Verification status
     * @param verificationNotes Notes about the verification
     */
    function verifyMRVData(
        uint256 mrvDataId,
        bool isVerified,
        string memory verificationNotes
    ) external whenNotPaused onlyOwnerOrVerifier {
        require(mrvDataId > 0 && mrvDataId <= _mrvDataCounter.current(), "Invalid MRV data ID");

        mrvData[mrvDataId].isVerified = isVerified;
        mrvData[mrvDataId].verificationNotes = verificationNotes;

        emit MRVDataVerified(mrvDataId, isVerified, verificationNotes);
    }

    /**
     * @dev Verify a project (only owner or verifiers)
     * @param projectID Project identifier
     * @param isVerified Verification status
     */
    function verifyProject(
        string memory projectID,
        bool isVerified
    ) external whenNotPaused onlyOwnerOrVerifier projectExists(projectID) {
        projects[projectID].isVerified = isVerified;
        projects[projectID].lastUpdated = block.timestamp;

        emit ProjectVerified(projectID, isVerified);
    }

    /**
     * @dev Mint carbon credit tokens based on verified MRV data
     * @param projectID Project identifier
     * @param recipient Address to receive the tokens
     * @param amount Amount of tokens to mint (in tons)
     */
    function mintCarbonCredits(
        string memory projectID,
        address recipient,
        uint256 amount
    ) external whenNotPaused nonReentrant onlyOwnerOrVerifier onlyVerifiedProject(projectID) {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= projects[projectID].totalCO2Sequestered, "Amount exceeds total CO2 sequestered");

        _carbonCreditCounter.increment();
        uint256 carbonCreditId = _carbonCreditCounter.current();

        carbonCredits[carbonCreditId] = CarbonCredit({
            projectID: projectID,
            amount: amount,
            mintedAt: block.timestamp,
            recipient: recipient,
            isRetired: false
        });

        projectCarbonCredits[projectID].push(carbonCreditId);

        // Mint ERC-20 tokens (1 token = 1 ton CO2)
        _mint(recipient, amount * 10**decimals());

        emit CarbonCreditsMinted(projectID, recipient, amount, carbonCreditId);
    }

    /**
     * @dev Retire carbon credits (burn tokens)
     * @param carbonCreditId ID of the carbon credit to retire
     * @param amount Amount to retire
     */
    function retireCarbonCredits(
        uint256 carbonCreditId,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        require(carbonCreditId > 0 && carbonCreditId <= _carbonCreditCounter.current(), "Invalid carbon credit ID");
        require(amount > 0, "Amount must be greater than 0");
        require(!carbonCredits[carbonCreditId].isRetired, "Carbon credit already retired");
        require(carbonCredits[carbonCreditId].amount >= amount, "Insufficient carbon credit amount");

        CarbonCredit storage credit = carbonCredits[carbonCreditId];
        require(credit.recipient == msg.sender, "Only recipient can retire carbon credits");

        // Burn ERC-20 tokens
        _burn(msg.sender, amount * 10**decimals());

        credit.amount -= amount;
        if (credit.amount == 0) {
            credit.isRetired = true;
        }

        emit CarbonCreditsRetired(carbonCreditId, amount);
    }

    /**
     * @dev Deactivate a project (only project owner or owner)
     * @param projectID Project identifier
     */
    function deactivateProject(
        string memory projectID
    ) external whenNotPaused projectExists(projectID) {
        require(
            msg.sender == projects[projectID].owner || msg.sender == owner(),
            "Only project owner or contract owner can deactivate project"
        );

        projects[projectID].isActive = false;
        projects[projectID].lastUpdated = block.timestamp;

        emit ProjectDeactivated(projectID);
    }

    // Role management functions
    function addVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        verifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }

    function removeVerifier(address verifier) external onlyOwner {
        require(verifier != owner(), "Cannot remove owner as verifier");
        verifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    function addReporter(address reporter) external onlyOwner {
        require(reporter != address(0), "Invalid reporter address");
        reporters[reporter] = true;
        emit ReporterAdded(reporter);
    }

    function removeReporter(address reporter) external onlyOwner {
        reporters[reporter] = false;
        emit ReporterRemoved(reporter);
    }

    // View functions
    function isVerifier(address account) public view returns (bool) {
        return verifiers[account];
    }

    function isReporter(address account) public view returns (bool) {
        return reporters[account];
    }

    function getProject(string memory projectID) external view returns (Project memory) {
        return projects[projectID];
    }

    function getMRVData(uint256 mrvDataId) external view returns (MRVData memory) {
        return mrvData[mrvDataId];
    }

    function getCarbonCredit(uint256 carbonCreditId) external view returns (CarbonCredit memory) {
        return carbonCredits[carbonCreditId];
    }

    function getProjectMRVData(string memory projectID) external view returns (uint256[] memory) {
        return projectMRVData[projectID];
    }

    function getProjectCarbonCredits(string memory projectID) external view returns (uint256[] memory) {
        return projectCarbonCredits[projectID];
    }

    function getUserProjects(address user) external view returns (string[] memory) {
        return userProjects[user];
    }

    function getTotalProjects() external view returns (uint256) {
        return _projectCounter.current();
    }

    function getTotalMRVData() external view returns (uint256) {
        return _mrvDataCounter.current();
    }

    function getTotalCarbonCredits() external view returns (uint256) {
        return _carbonCreditCounter.current();
    }

    // Emergency functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Override ERC20 functions to include pausable functionality
    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    function approve(address spender, uint256 amount) public override whenNotPaused returns (bool) {
        return super.approve(spender, amount);
    }
}
