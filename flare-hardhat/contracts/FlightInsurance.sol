// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IFlareDataConnector.sol";

/**
 * @title FlightInsurance
 * @notice Smart contract for flight delay insurance on Flare Network
 * @dev Uses Flare Data Connector (FDC) to verify flight status via AviationStack API
 */
contract FlightInsurance is Ownable {
    using ECDSA for bytes32;
    
    // Flare Data Connector for external API calls
    IFlareDataConnector public flareDataConnector;
    
    // FLR token (native token, but we use address(0) for native transfers)
    address public constant FLR_TOKEN = address(0);
    
    // Insurance policy structure
    struct Policy {
        address user;
        string flightNumber;
        string flightDate;
        uint256 premium; // Premium paid in Wei (18 decimals)
        uint256 payoutAmount; // Payout amount in Wei if conditions met
        uint256 delayThresholdMinutes; // Minimum delay to trigger payout
        uint256 deadline; // Quote deadline timestamp
        uint256 purchaseTime; // When policy was purchased
        bool active; // Whether policy is still active
        bool claimed; // Whether payout has been claimed
        bytes32 flightId; // Unique flight identifier
    }
    
    // Mapping from policy ID to Policy
    mapping(bytes32 => Policy) public policies;
    
    // Mapping from user address to their policy IDs
    mapping(address => bytes32[]) public userPolicies;
    
    // Signer address for quote verification
    address public signerAddress;
    
    // EIP-712 domain separator
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant QUOTE_TYPEHASH = keccak256(
        "Quote(address userAddress,string flightId,uint256 premiumAmount,uint256 deadline)"
    );
    
    // Events
    event PolicyPurchased(
        bytes32 indexed policyId,
        address indexed user,
        string flightNumber,
        string flightDate,
        uint256 premium,
        uint256 payoutAmount,
        uint256 delayThresholdMinutes
    );
    
    event PayoutClaimed(
        bytes32 indexed policyId,
        address indexed user,
        uint256 payoutAmount,
        uint256 delayMinutes
    );
    
    event ContractVerified(
        bytes32 indexed policyId,
        bool conditionMet,
        uint256 delayMinutes,
        bool payoutEligible
    );
    
    // Errors
    error InvalidSignature();
    error QuoteExpired();
    error PolicyNotFound();
    error PolicyNotActive();
    error AlreadyClaimed();
    error ConditionNotMet();
    error TransferFailed();
    error InvalidFlightData();
    
    /**
     * @notice Constructor
     * @param _signerAddress Address that signs quotes (backend admin)
     * @param _flareDataConnector Address of Flare Data Connector contract
     */
    constructor(address _signerAddress, address _flareDataConnector) Ownable(msg.sender) {
        signerAddress = _signerAddress;
        flareDataConnector = IFlareDataConnector(_flareDataConnector);
        
        // EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("Flare Insurance dApp"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }
    
    /**
     * @notice Purchase insurance policy
     * @param userAddress User's wallet address
     * @param flightNumber Flight number (e.g., "AA123")
     * @param flightDate Flight date (YYYY-MM-DD)
     * @param premiumAmount Premium amount in Wei
     * @param payoutAmount Payout amount in Wei if conditions met
     * @param delayThresholdMinutes Minimum delay in minutes to trigger payout
     * @param deadline Quote deadline timestamp
     * @param flightId Unique flight identifier
     * @param signature EIP-712 signature from backend
     */
    function purchasePolicy(
        address userAddress,
        string memory flightNumber,
        string memory flightDate,
        uint256 premiumAmount,
        uint256 payoutAmount,
        uint256 delayThresholdMinutes,
        uint256 deadline,
        bytes32 flightId,
        bytes memory signature
    ) external payable {
        // Verify quote signature
        if (!_verifyQuoteSignature(
            userAddress,
            flightId,
            premiumAmount,
            deadline,
            signature
        )) {
            revert InvalidSignature();
        }
        
        // Check quote hasn't expired
        if (block.timestamp > deadline) {
            revert QuoteExpired();
        }
        
        // Verify payment matches premium
        if (msg.value != premiumAmount) {
            revert("Premium amount mismatch");
        }
        
        // Create policy ID
        bytes32 policyId = keccak256(
            abi.encodePacked(userAddress, flightId, block.timestamp)
        );
        
        // Check policy doesn't already exist
        require(policies[policyId].user == address(0), "Policy already exists");
        
        // Create policy
        policies[policyId] = Policy({
            user: userAddress,
            flightNumber: flightNumber,
            flightDate: flightDate,
            premium: premiumAmount,
            payoutAmount: payoutAmount,
            delayThresholdMinutes: delayThresholdMinutes,
            deadline: deadline,
            purchaseTime: block.timestamp,
            active: true,
            claimed: false,
            flightId: flightId
        });
        
        // Add to user's policies
        userPolicies[userAddress].push(policyId);
        
        emit PolicyPurchased(
            policyId,
            userAddress,
            flightNumber,
            flightDate,
            premiumAmount,
            payoutAmount,
            delayThresholdMinutes
        );
    }
    
    /**
     * @notice Verify contract conditions using FDC and AviationStack API
     * @param policyId Policy ID to verify
     * @param aviationStackApiKey AviationStack API key (passed to FDC)
     * @return conditionMet Whether conditions are met
     * @return delayMinutes Actual delay in minutes
     */
    function verifyContract(
        bytes32 policyId,
        string memory aviationStackApiKey
    ) external returns (bool conditionMet, uint256 delayMinutes) {
        Policy storage policy = policies[policyId];
        
        if (policy.user == address(0)) {
            revert PolicyNotFound();
        }
        
        if (!policy.active) {
            revert PolicyNotActive();
        }
        
        // Construct AviationStack API URL
        string memory apiUrl = string(abi.encodePacked(
            "http://api.aviationstack.com/v1/flights?access_key=",
            aviationStackApiKey,
            "&flight_iata=",
            policy.flightNumber,
            "&flight_date=",
            policy.flightDate
        ));
        
        // Request data from FDC
        string[] memory headers = new string[](1);
        headers[0] = "Content-Type: application/json";
        
        bytes memory response = flareDataConnector.requestData(
            apiUrl,
            "GET",
            headers,
            ""
        );
        
        // Parse response (simplified - in production, use proper JSON parsing)
        // For now, we'll use a mock delay value
        // In production, you'd parse the JSON response from AviationStack
        delayMinutes = _parseDelayFromResponse(response, policy.flightNumber);
        
        // Check if condition is met
        conditionMet = delayMinutes >= policy.delayThresholdMinutes;
        
        emit ContractVerified(policyId, conditionMet, delayMinutes, conditionMet);
        
        return (conditionMet, delayMinutes);
    }
    
    /**
     * @notice Claim payout if conditions are met
     * @param policyId Policy ID to claim
     * @param delayMinutes Actual delay in minutes (verified off-chain or via FDC)
     */
    function claimPayout(bytes32 policyId, uint256 delayMinutes) external {
        Policy storage policy = policies[policyId];
        
        if (policy.user == address(0)) {
            revert PolicyNotFound();
        }
        
        if (!policy.active) {
            revert PolicyNotActive();
        }
        
        if (policy.claimed) {
            revert AlreadyClaimed();
        }
        
        // Verify conditions are met
        if (delayMinutes < policy.delayThresholdMinutes) {
            revert ConditionNotMet();
        }
        
        // Mark as claimed
        policy.claimed = true;
        policy.active = false;
        
        // Transfer payout to user
        (bool success, ) = payable(policy.user).call{value: policy.payoutAmount}("");
        if (!success) {
            revert TransferFailed();
        }
        
        emit PayoutClaimed(policyId, policy.user, policy.payoutAmount, delayMinutes);
    }
    
    /**
     * @notice Get user's policies
     * @param user User address
     * @return Array of policy IDs
     */
    function getUserPolicies(address user) external view returns (bytes32[] memory) {
        return userPolicies[user];
    }
    
    /**
     * @notice Get policy details
     * @param policyId Policy ID
     * @return Policy struct
     */
    function getPolicy(bytes32 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }
    
    /**
     * @notice Update signer address (only owner)
     */
    function setSignerAddress(address _signerAddress) external onlyOwner {
        signerAddress = _signerAddress;
    }
    
    /**
     * @notice Update Flare Data Connector address (only owner)
     */
    function setFlareDataConnector(address _flareDataConnector) external onlyOwner {
        flareDataConnector = IFlareDataConnector(_flareDataConnector);
    }
    
    /**
     * @notice Withdraw contract balance (only owner, for emergency)
     */
    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    
    /**
     * @notice Verify EIP-712 quote signature
     */
    function _verifyQuoteSignature(
        address userAddress,
        bytes32 flightId,
        uint256 premiumAmount,
        uint256 deadline,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        QUOTE_TYPEHASH,
                        userAddress,
                        keccak256(abi.encodePacked(flightId)),
                        premiumAmount,
                        deadline
                    )
                )
            )
        );
        
        address recovered = hash.recover(signature);
        return recovered == signerAddress;
    }
    
    /**
     * @notice Parse delay from AviationStack API response
     * @dev Simplified parser - in production, use proper JSON parsing library
     * @param response API response bytes
     * @param flightNumber Flight number for fallback
     * @return delayMinutes Delay in minutes
     */
    function _parseDelayFromResponse(
        bytes memory response,
        string memory flightNumber
    ) internal pure returns (uint256 delayMinutes) {
        // Simplified parsing - in production, use a JSON parser
        // For now, return a mock value based on flight number hash
        // In production, parse the actual JSON response from AviationStack
        
        // Mock implementation: extract delay from response if present
        // This is a placeholder - real implementation would parse JSON
        string memory responseStr = string(response);
        
        // Try to find delay in response (simplified)
        // In production, use a proper JSON parser like abi.decode or a library
        bytes memory delayBytes = bytes(responseStr);
        
        // Fallback: use deterministic value based on flight number
        if (delayBytes.length == 0) {
            return uint256(keccak256(abi.encodePacked(flightNumber))) % 120;
        }
        
        // Simplified: look for "delay" in response
        // Real implementation would parse: {"data":[{"departure":{"delay":30}]}
        // For now, return a mock value
        return 30; // Placeholder - replace with actual JSON parsing
    }
    
    // Receive function to accept native FLR
    receive() external payable {}
}

