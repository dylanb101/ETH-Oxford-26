# Flare Network Flight Insurance - Backend Server

Express.js backend server for flight delay insurance on Flare Network using Flare Data Connector (FDC) and AviationStack API.

## Features

- **Express.js Server**: RESTful API server running on port 5000
- **Flare Blockchain Integration**: Direct connection to Flare Network via ethers.js
- **FlightInsurance Contract**: Smart contract integration for policy management
- **FDC Integration**: Uses Flare Data Connector to fetch real-time flight data from AviationStack
- **Hardhat Integration**: Full Hardhat development environment included

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory:
```env
PORT=5000
PRIVATE_KEY=your_private_key_here
SIGNER_ADDRESS=0x...  # Backend admin address that signs quotes
FLIGHT_INSURANCE_ADDRESS=0x...  # Deployed FlightInsurance contract address
FLARE_DATA_CONNECTOR_ADDRESS=0x...  # FDC contract address on Flare network
AVIATIONSTACK_API_KEY=your_aviationstack_api_key  # For flight information API
FLARE_RPC_URL=https://flare-api.flare.network/ext/C/rpc
COSTON_RPC_URL=https://coston-api.flare.network/ext/C/rpc
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

3. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

## Available Networks

- **Flare Mainnet** (Chain ID: 14)
- **Coston Testnet** (Chain ID: 16)
- **Coston2 Testnet** (Chain ID: 114) - Recommended for testing

## Commands

### Server Commands
- `npm start` - Start Express.js server
- `npm run dev` - Start server with nodemon (auto-reload)

### Hardhat Commands
- `npm run compile` - Compile contracts
- `npm run test` - Run tests
- `npm run deploy:flare` - Deploy to Flare mainnet
- `npm run deploy:coston` - Deploy to Coston testnet
- `npm run deploy:coston2` - Deploy to Coston2 testnet
- `npm run deploy:flight-insurance` - Deploy FlightInsurance contract to Coston2
- `npm run node` - Start local Hardhat node

## Deploy FlightInsurance Contract

```bash
# Deploy to Coston2 testnet
npx hardhat run scripts/deploy-flight-insurance.js --network coston2

# Deploy to Flare mainnet
npx hardhat run scripts/deploy-flight-insurance.js --network flare
```

## Contract Architecture

### FlightInsurance.sol

Main contract that:
- Stores insurance policies with flight details and terms
- Verifies EIP-712 signed quotes from backend
- Uses FDC to fetch flight status from AviationStack API
- Automatically processes payouts when delay conditions are met

### Key Functions

- `purchasePolicy()`: Purchase insurance with signed quote
- `verifyContract()`: Verify flight status using FDC and AviationStack
- `claimPayout()`: Claim payout if conditions are met

### Policy Structure

```solidity
struct Policy {
    address user;
    string flightNumber;
    string flightDate;
    uint256 premium;              // Premium paid in Wei
    uint256 payoutAmount;         // Payout if conditions met
    uint256 delayThresholdMinutes; // Minimum delay to trigger payout
    uint256 deadline;            // Quote deadline
    uint256 purchaseTime;         // When policy was purchased
    bool active;                  // Policy status
    bool claimed;                 // Whether payout claimed
    bytes32 flightId;             // Unique flight identifier
}
```

## Flare Data Connector (FDC)

FDC allows smart contracts to request external data from APIs like AviationStack:

1. Contract calls `flareDataConnector.requestData()` with API URL
2. FDC fetches data from AviationStack API
3. Contract receives response and verifies flight delay
4. If conditions met, payout is processed

## API Endpoints

### Health & Info
- `GET /api/health` - Health check
- `GET /api/network` - Get Flare network information
- `GET /api/contract/info` - Get FlightInsurance contract information
- `GET /api/signer/address` - Get signer address (if configured)

### Flight Information
- `POST /api/flight/info` - Fetch flight information from AviationStack API
  - Request body: `{ "flightNumber": "BA297", "flightDate": "2024-12-25" }`
  - Returns parsed flight data from AviationStack

### Contract Purchase
- `POST /api/contract/prepare-purchase` - Prepare transaction data for MetaMask
  - Request body: `{ "premium": "10.5", "expirationTime": 1735689600, "minDelayMinutes": 30, "payoutAmount": "15.75", "merkleProof": [] }`
  - Returns transaction object ready for MetaMask to send C2FLR

### Contract Interactions
- `GET /api/contract/policy-count` - Get total number of policies
- `GET /api/contract/policy/:policyId` - Get policy details by ID
- `POST /api/contract/create-policy` - Get transaction data for creating a policy
- `POST /api/contract/resolve-policy` - Get transaction data for resolving a policy

### Account
- `GET /api/account/balance/:address` - Get account balance in FLR

## Integration Flow

1. Express.js backend provides API endpoints for contract interactions
2. Frontend calls backend endpoints to get transaction data
3. Frontend sends transactions from user's wallet
4. Contract verifies and stores policies
5. After flight, contract uses FDC to check AviationStack
6. If delay threshold met, user can claim payout

## Project Structure

```
backend/
├── server.js                      # Express.js server
├── contracts/
│   ├── FlightInsurance.sol        # Main insurance contract
│   ├── PayoutEngine.sol           # Payout engine contract
│   └── interfaces/
│       └── IFlareDataConnector.sol # FDC interface
├── scripts/
│   └── deploy-flight-insurance.js # Deployment script
├── test/
│   └── FlightInsurance.test.js   # Contract tests
├── artifacts/                     # Compiled contracts
├── abi/                           # Contract ABIs
├── hardhat.config.js
└── package.json
```

## Security Notes

- Never commit your `.env` file or private keys
- Verify FDC address on your target network
- Test thoroughly on testnet before mainnet deployment
- The signer address must match the backend's signing wallet
