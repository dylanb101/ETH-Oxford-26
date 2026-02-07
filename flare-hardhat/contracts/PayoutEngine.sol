// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import "./interfaces/ISecureRandom.sol";

contract PayoutEngine {
    // --- Flare / external ---
    bytes32 public merkleRoot;
    IERC20 public fxrp;
    ISecureRandom public secureRandom;

    // --- config ---
    bool public bonusEnabled;
    uint256 public bonusAmount;
    uint256 public bonusOdds;

    // --- accounting ---
    mapping(bytes32 => bool) public claimed;

    // --- events ---
    event Claimed(address indexed user, uint256 amount);
    event BonusPaid(address indexed user, uint256 amount);

    // --- errors ---
    error InvalidProof();

    function setMerkleRoot(bytes32 _root) external {
        merkleRoot = _root;
    }


    function verifyClaim(
        address user,
        uint256 amount,
        bytes32[] calldata proof
    ) public returns (bytes32) {
        bytes32 leaf = keccak256(
            abi.encodePacked(user, amount)
        );

        if (claimed[leaf]) {
            revert("Already claimed");
        }


        bool valid = MerkleProof.verify(
            proof,
            merkleRoot,
            leaf
        );

        if (!valid) {
            revert InvalidProof();
        }

        claimed[leaf] = true; // no longer a view function since that view means it can't update state. 
        
        return leaf;
    }
}
