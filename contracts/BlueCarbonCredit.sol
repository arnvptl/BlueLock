// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BlueCarbonCredit
 * @dev ERC-20 token for carbon credit tokenization
 * 
 * Features:
 * - Standard ERC-20 functionality
 * - Minting restricted to verified project owners
 * - Transfer functionality for trading between users
 * - Pausable for emergency control
 * - Access control for project owners
 */
contract BlueCarbonCredit is ERC20, Ownable, Pausable, ReentrancyGuard {
    
    // Mapping to track verified project owners
    mapping(address => bool) public verifiedProjectOwners;
    
    // Events
    event ProjectOwnerVerified(address indexed projectOwner, bool isVerified);
    event CarbonCreditsMinted(address indexed to, uint256 amount, string projectId);
    
    // Modifiers
    modifier onlyVerifiedProjectOwner() {
        require(verifiedProjectOwners[msg.sender], "Only verified project owners can mint");
        _;
    }
    
    /**
     * @dev Constructor sets up the token with specified parameters
     */
    constructor() ERC20("BlueCarbonCredit", "BCC") {
        // Token is initialized with 0 total supply
        // Project owners will be added by the contract owner
    }
    
    /**
     * @dev Mint carbon credit tokens (only verified project owners)
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint (in wei - 18 decimals)
     * @param projectId Identifier for the project (for tracking purposes)
     */
    function mint(
        address to, 
        uint256 amount, 
        string memory projectId
    ) external onlyVerifiedProjectOwner whenNotPaused nonReentrant {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        _mint(to, amount);
        
        emit CarbonCreditsMinted(to, amount, projectId);
    }
    
    /**
     * @dev Add a verified project owner (only contract owner)
     * @param projectOwner Address of the project owner to verify
     */
    function addVerifiedProjectOwner(address projectOwner) external onlyOwner {
        require(projectOwner != address(0), "Invalid project owner address");
        verifiedProjectOwners[projectOwner] = true;
        
        emit ProjectOwnerVerified(projectOwner, true);
    }
    
    /**
     * @dev Remove a verified project owner (only contract owner)
     * @param projectOwner Address of the project owner to remove
     */
    function removeVerifiedProjectOwner(address projectOwner) external onlyOwner {
        require(projectOwner != address(0), "Invalid project owner address");
        verifiedProjectOwners[projectOwner] = false;
        
        emit ProjectOwnerVerified(projectOwner, false);
    }
    
    /**
     * @dev Check if an address is a verified project owner
     * @param account Address to check
     * @return bool True if the address is a verified project owner
     */
    function isVerifiedProjectOwner(address account) external view returns (bool) {
        return verifiedProjectOwners[account];
    }
    
    /**
     * @dev Pause all token operations (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause all token operations (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Override transfer function to include pausable functionality
     */
    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom function to include pausable functionality
     */
    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev Override approve function to include pausable functionality
     */
    function approve(address spender, uint256 amount) public override whenNotPaused returns (bool) {
        return super.approve(spender, amount);
    }
    
    /**
     * @dev Get token information
     * @return name Token name
     * @return symbol Token symbol
     * @return decimals Token decimals
     * @return totalSupply Total supply of tokens
     */
    function getTokenInfo() external view returns (
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 totalSupply
    ) {
        return (
            name(),
            symbol(),
            decimals(),
            totalSupply()
        );
    }
}
