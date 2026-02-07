// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {IWeb2Json} from "@flarenetwork/flare-periphery-contracts/coston2/IWeb2Json.sol";
import "./PayoutEngine.sol";

contract FlightInsuranceFDC {

    enum PolicyStatus { Active, Settled, Expired }

    struct Policy {
        address holder;
        uint256 premium;
        uint256 payout;
        uint256 startTime;
        uint256 expirationTime;
        uint256 minDelayMinutes;
        PolicyStatus status;
    }

    struct VerifiedDelay {
        uint256 delayMinutes;
    }

    Policy[] public policies;
    PayoutEngine public payoutEngine;

    // Mapping to store Merkle proofs for each policy
    mapping(uint256 => bytes32[]) public policyProofs;

    event PolicyCreated(uint256 id, address holder);
    event PolicyPaid(uint256 id, uint256 payout);
    event PolicyExpired(uint256 id);

    constructor(address _payoutEngine) {
        payoutEngine = PayoutEngine(_payoutEngine);
    }

    function createPolicy(
        uint256 expirationTime,
        uint256 minDelayMinutes,
        uint256 payoutAmount,
        bytes32[] calldata merkleProof
    ) external payable {
        require(msg.value > 0, "Premium required");
        require(expirationTime > block.timestamp, "Invalid expiry");

        policies.push(
            Policy({
                holder: msg.sender,
                premium: msg.value,
                payout: payoutAmount,
                startTime: block.timestamp,
                expirationTime: expirationTime,
                minDelayMinutes: minDelayMinutes,
                status: PolicyStatus.Active
            })
        );

        uint256 policyId = policies.length - 1;
        policyProofs[policyId] = merkleProof;

        emit PolicyCreated(policyId, msg.sender);
    }

    function resolvePolicy(
        uint256 policyId,
        IWeb2Json.Proof calldata proof
    ) external {
        Policy storage policy = policies[policyId];
        require(policy.status == PolicyStatus.Active, "Not active");

        // Verify Web2Json proof via Flare FDC
        bool valid = ContractRegistry.getFdcVerification().verifyWeb2Json(proof);
        require(valid, "Invalid FDC proof");

        // Decode verified API response
        VerifiedDelay memory dto = abi.decode(proof.data.responseBody.abiEncodedData, (VerifiedDelay));

        // Expired case
        if (block.timestamp > policy.expirationTime) {
            policy.status = PolicyStatus.Expired;
            emit PolicyExpired(policyId);
            return;
        }

        // Delay payout logic
        if (dto.delayMinutes >= policy.minDelayMinutes) {
            policy.status = PolicyStatus.Settled;

            // Pass Merkle proof to payout contract
            payoutEngine.claimPayout(
                policy.holder,
                policyId,
                policy.payout,
                policyProofs[policyId]
            );

            emit PolicyPaid(policyId, policy.payout);
        }
    }

    function policyCount() external view returns (uint256) {
        return policies.length;
    }

    receive() external payable {}
}
