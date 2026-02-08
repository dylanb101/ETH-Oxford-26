// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IFlightStatusOracle {
    function isFlightDelayed(
        string calldata flightNumber,
        uint256 departureDate,
        uint256 minDelayMinutes
    ) external view returns (bool);
}

contract FlightDelayPolicy {
    address public insurer;
    address public insured;

    string public flightNumber;
    uint256 public departureDate;
    uint256 public minDelayMinutes;

    uint256 public premium;
    uint256 public payout;

    bool public active;
    bool public paid;

    IFlightStatusOracle public oracle;

    constructor(
        address _insured,
        string memory _flightNumber,
        uint256 _departureDate,
        uint256 _minDelayMinutes,
        uint256 _premium,
        uint256 _payout,
        address _oracle
    ) payable {
        insurer = msg.sender;
        insured = _insured;

        flightNumber = _flightNumber;
        departureDate = _departureDate;
        minDelayMinutes = _minDelayMinutes;

        premium = _premium;
        payout = _payout;
        oracle = IFlightStatusOracle(_oracle);

        require(msg.value == payout, "Payout not funded");

        active = true;
    }

    function claim() external {
        require(active, "Inactive");
        require(!paid, "Already paid");

        bool delayed = oracle.isFlightDelayed(
            flightNumber,
            departureDate,
            minDelayMinutes
        );

        require(delayed, "Flight not delayed enough");

        paid = true;
        active = false;

        payable(insured).transfer(payout);
    }
}

