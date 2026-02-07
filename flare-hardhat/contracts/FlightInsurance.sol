// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {IFdcVerification} from "@flarenetwork/flare-periphery-contracts/coston2/IFdcVerification.sol";
import {IWeb2Json} from "@flarenetwork/flare-periphery-contracts/coston2/IWeb2Json.sol";
import PayoutEngine from "./PayoutEngine.sol";

contract FlightInsuranceFDC {
    PayoutEngine public payoutEngine;
    constructor(address _payoutEngine) {
        payoutEngine = PayoutEngine(_payoutEngine);
    }

    enum PolicyStatus {
        Active,
        Settled,
        Expired
    }

    struct Policy {
        address holder;
        uint256 premium;
        uint256 payout;
        uint256 startTime;
        uint256 expirationTime;
        uint256 minDelayMinutes;
        PolicyStatus status;
    }

    // Data verified via FDC (must match resolve script ABI)
    struct VerifiedDelay {
        uint256 delayMinutes;
    }

    Policy[] public policies;


    event PolicyCreated(uint256 id, address holder);
    event PolicyPaid(uint256 id, uint256 payout);
    event PolicyExpired(uint256 id);


    function createPolicy(
        uint256 expirationTime,
        uint256 minDelayMinutes
    ) external payable {

        require(msg.value > 0, "Premium required");
        require(expirationTime > block.timestamp, "Invalid expiry");

        policies.push(
            Policy({
                holder: msg.sender,
                premium: msg.value,
                payout: msg.value * 2, // demo payout multiplier
                startTime: block.timestamp,
                expirationTime: expirationTime,
                minDelayMinutes: minDelayMinutes,
                status: PolicyStatus.Active
            })
        );

        emit PolicyCreated(policies.length - 1, msg.sender);
    }


    function resolvePolicy(
        uint256 id,
        IWeb2Json.Proof calldata proof
    ) external {

        Policy storage policy = policies[id];

        require(policy.status == PolicyStatus.Active, "Not active");

        // Verify Web2Json proof via Flare FDC
        bool valid = ContractRegistry.getFdcVerification()
            .verifyWeb2Json(proof);

        require(valid, "Invalid FDC proof");

        // Decode verified API response
        VerifiedDelay memory dto =
            abi.decode(
                proof.data.responseBody.abiEncodedData,
                (VerifiedDelay)
            );

        // Expired case
        if (block.timestamp > policy.expirationTime) {
            policy.status = PolicyStatus.Expired;
            emit PolicyExpired(id);
            return;
        }

        // Delay payout logic
        if (dto.delayMinutes >= policy.minDelayMinutes) {

            policy.status = PolicyStatus.Settled;

            payoutEngine.claimPayout(
                policyId=id,
                amount=0.1,
                proof=proof
            )

            emit PolicyPaid(id, policy.payout);
        }
    }


    function policyCount() external view returns (uint256) {
        return policies.length;
    }

    receive() external payable {}
}
