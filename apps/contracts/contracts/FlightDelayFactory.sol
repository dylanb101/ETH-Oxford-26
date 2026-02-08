// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./FlightDelayPolicy.sol";

contract FlightDelayFactory {
    address public oracle;
    address[] public policies;

    event PolicyCreated(
        address indexed policy,
        address indexed insured,
        string flightNumber,
        uint256 departureDate
    );

    constructor(address _oracle) {
        oracle = _oracle;
    }

    function createPolicy(
        address insured,
        string calldata flightNumber,
        uint256 departureDate,
        uint256 minDelayMinutes,
        uint256 premium,
        uint256 payout
    ) external payable returns (address) {
        require(msg.value == payout, "Payout must be funded");

        FlightDelayPolicy policy =
            (new FlightDelayPolicy){ value: payout }(
                insured,
                flightNumber,
                departureDate,
                minDelayMinutes,
                premium,
                payout,
                oracle
            );

        policies.push(address(policy));

        emit PolicyCreated(
            address(policy),
            insured,
            flightNumber,
            departureDate
        );

        return address(policy);
    }

    function getPolicies() external view returns (address[] memory) {
        return policies;
    }
}

