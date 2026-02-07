// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFlareDataConnector
 * @notice Interface for Flare Data Connector to fetch external data
 * @dev FDC allows smart contracts to request data from external APIs like AviationStack
 */
interface IFlareDataConnector {
    /**
     * @notice Request data from an external API
     * @param url The API endpoint URL
     * @param method HTTP method (GET, POST, etc.)
     * @param headers HTTP headers
     * @param body Request body (empty for GET)
     * @return response The API response data
     */
    function requestData(
        string memory url,
        string memory method,
        string[] memory headers,
        bytes memory body
    ) external returns (bytes memory response);
    
    /**
     * @notice Get the latest data for a specific request ID
     * @param requestId The request identifier
     * @return data The response data
     * @return timestamp When the data was fetched
     */
    function getLatestData(bytes32 requestId) external view returns (bytes memory data, uint256 timestamp);
}

