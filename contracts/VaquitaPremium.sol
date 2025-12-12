// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title Vault
 * @dev A secure vault contract for depositing and withdrawing ERC20 tokens
 * @notice Users can deposit tokens and receive shares proportional to their deposit
 */
contract Vault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 public immutable token;
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    // Events
    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 amount, uint256 shares);
    event EmergencyWithdraw(address indexed owner, uint256 amount);

    /**
     * @dev Constructor to initialize the vault with a token
     * @param _token Address of the ERC20 token to be stored in the vault
     */
    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    /**
     * @dev Deposit tokens into the vault
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Cannot deposit 0");

        uint256 sharesToMint;
        uint256 totalTokens = token.balanceOf(address(this));

        if (totalShares == 0 || totalTokens == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = (amount * totalShares) / totalTokens;
        }

        require(sharesToMint > 0, "Cannot mint 0 shares");

        shares[msg.sender] += sharesToMint;
        totalShares += sharesToMint;

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, amount, sharesToMint);
    }

    /**
     * @dev Withdraw tokens from the vault
     * @param sharesToBurn Amount of shares to burn for withdrawal
     */
    function withdraw(uint256 sharesToBurn) external nonReentrant {
        require(sharesToBurn > 0, "Cannot withdraw 0");
        require(shares[msg.sender] >= sharesToBurn, "Insufficient shares");

        uint256 totalTokens = token.balanceOf(address(this));
        uint256 amountToWithdraw = (sharesToBurn * totalTokens) / totalShares;

        require(amountToWithdraw > 0, "Cannot withdraw 0 tokens");

        shares[msg.sender] -= sharesToBurn;
        totalShares -= sharesToBurn;

        token.safeTransfer(msg.sender, amountToWithdraw);

        emit Withdraw(msg.sender, amountToWithdraw, sharesToBurn);
    }

    /**
     * @dev Withdraw all tokens for the caller
     */
    function withdrawAll() external nonReentrant {
        uint256 userShares = shares[msg.sender];
        require(userShares > 0, "No shares to withdraw");

        uint256 totalTokens = token.balanceOf(address(this));
        uint256 amountToWithdraw = (userShares * totalTokens) / totalShares;

        shares[msg.sender] = 0;
        totalShares -= userShares;

        token.safeTransfer(msg.sender, amountToWithdraw);

        emit Withdraw(msg.sender, amountToWithdraw, userShares);
    }

    /**
     * @dev Get the token balance for a user
     * @param user Address of the user
     * @return Amount of tokens the user can withdraw
     */
    function balanceOf(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        uint256 totalTokens = token.balanceOf(address(this));
        return (shares[user] * totalTokens) / totalShares;
    }

    /**
     * @dev Get the total token balance in the vault
     * @return Total amount of tokens in the vault
     */
    function totalAssets() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @dev Pause deposits
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause deposits
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw function for owner (use with caution)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= token.balanceOf(address(this)), "Insufficient balance");
        token.safeTransfer(owner(), amount);
        emit EmergencyWithdraw(owner(), amount);
    }
}