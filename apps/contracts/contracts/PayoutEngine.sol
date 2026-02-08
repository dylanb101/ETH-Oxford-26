// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract PayoutEngine {

    IERC20 public token;
    bytes32 public merkleRoot;
    address public admin;

    mapping(bytes32 => bool) public claimed;

    event Claimed(address indexed user, uint256 amount);
    event MerkleRootUpdated(bytes32 root);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(address _token) {
        token = IERC20(_token);
        admin = msg.sender;
    }

    function setMerkleRoot(bytes32 _root) external onlyAdmin {
        merkleRoot = _root;
        emit MerkleRootUpdated(_root);
    }

    function verifyClaim(
        address user,
        uint256 policyId,
        uint256 amount,
        bytes32[] calldata proof
    ) internal returns (bytes32 leaf) {
        leaf = keccak256(abi.encodePacked(user, policyId, amount));
        require(!claimed[leaf], "Already claimed");
        require(
            MerkleProof.verify(proof, merkleRoot, leaf),
            "Invalid Merkle proof"
        );
        claimed[leaf] = true;
    }

    function claimPayout(
        address user,
        uint256 policyId,
        uint256 amount,
        bytes32[] calldata proof
    ) external {
        verifyClaim(user, policyId, amount, proof);
        require(
            token.transfer(user, amount),
            "Token transfer failed"
        );
        emit Claimed(user, amount);
    }
}
