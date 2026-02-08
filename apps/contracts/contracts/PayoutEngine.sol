// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract PayoutEngine {
    IERC20 public fxrp;
    bytes32 public merkleRoot;

    mapping(bytes32 => bool) public claimed;

    event Claimed(address indexed user, uint256 amount);

    constructor(address _fxrp) {
        fxrp = IERC20(_fxrp);
    }

    function setMerkleRoot(bytes32 _root) external {
        merkleRoot = _root;
    }

    function verifyClaim(
        address user,
        uint256 policyId,
        uint256 amount,
        bytes32[] calldata proof
    ) public returns (bytes32 leaf) {
        leaf = keccak256(abi.encodePacked(user, policyId, amount));
        require(!claimed[leaf], "Already claimed");
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");
        claimed[leaf] = true;
    }

    function claimPayout(
        address user,
        uint256 policyId,
        uint256 amount,
        bytes32[] calldata proof
    ) external {
        verifyClaim(user, policyId, amount, proof);
        fxrp.transfer(user, amount);
        emit Claimed(user, amount);
    }
}
