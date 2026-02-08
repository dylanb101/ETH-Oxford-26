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

    event PolicyCreated(uint256 indexed id, address indexed holder);
    event PolicyPaid(uint256 indexed id, uint256 payout);
    event PolicyExpired(uint256 indexed id);

    constructor(address _payoutEngine) {
        payoutEngine = PayoutEngine(_payoutEngine);
    }

    function createPolicy(
        uint256 expirationTime,
        uint256 minDelayMinutes,
        uint256 payoutAmount
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

        emit PolicyCreated(policies.length - 1, msg.sender);
    }

    function resolvePolicy(
        uint256 policyId,
        IWeb2Json.Proof calldata proof,
        bytes32[] calldata merkleProof
    ) external {
        Policy storage policy = policies[policyId];
        require(policy.status == PolicyStatus.Active, "Policy not active");

        // Verify FDC proof
        bool valid = ContractRegistry
            .getFdcVerification()
            .verifyWeb2Json(proof);

        require(valid, "Invalid FDC proof");

        // Decode verified delay
        VerifiedDelay memory dto =
            abi.decode(
                proof.data.responseBody.abiEncodedData,
                (VerifiedDelay)
            );

        // Expiration check
        if (block.timestamp > policy.expirationTime) {
            policy.status = PolicyStatus.Expired;
            emit PolicyExpired(policyId);
            return;
        }

        // Payout condition
        if (dto.delayMinutes >= policy.minDelayMinutes) {
            policy.status = PolicyStatus.Settled;

            payoutEngine.claimPayout(
                policy.holder,
                policyId,
                policy.payout,
                merkleProof
            );

            emit PolicyPaid(policyId, policy.payout);
        }
    }

    function policyCount() external view returns (uint256) {
        return policies.length;
    }

    receive() external payable {}
}
