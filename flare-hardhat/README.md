# Flare Network Flight Insurance - Hardhat Project

Smart contracts for flight delay insurance on Flare Network using Flare Data Connector (FDC) and AviationStack API.

## Features

- **FlightInsurance Contract**: Main insurance contract with policy management
- **FDC Integration**: Uses Flare Data Connector to fetch real-time flight data from AviationStack
- **EIP-712 Signing**: Cryptographically signed quotes from backend AI actuary
- **Automated Payouts**: Automatic payout when delay conditions are met

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PRIVATE_KEY=your_private_key_here
SIGNER_ADDRESS=0x...  # Backend admin address that signs quotes
FLARE_DATA_CONNECTOR_ADDRESS=0x...  # FDC contract address on Flare network
FLARE_RPC_URL=https://flare-api.flare.network/ext/C/rpc
COSTON_RPC_URL=https://coston-api.flare.network/ext/C/rpc
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

## Available Networks

- **Flare Mainnet** (Chain ID: 14)
- **Coston Testnet** (Chain ID: 16)
- **Coston2 Testnet** (Chain ID: 114) - Recommended for testing

## Commands

- `npm run compile` - Compile contracts
- `npm run test` - Run tests
- `npm run deploy:flare` - Deploy to Flare mainnet
- `npm run deploy:coston` - Deploy to Coston testnet
- `npm run deploy:coston2` - Deploy to Coston2 testnet
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

## Integration with Backend

The contract works with the FastAPI backend:

1. Backend AI actuary calculates premium and contract conditions
2. Backend signs quote with EIP-712
3. User purchases policy on-chain with signed quote
4. Contract verifies signature and stores policy
5. After flight, contract uses FDC to check AviationStack
6. If delay threshold met, user can claim payout

## Project Structure

```
flare-hardhat/
├── contracts/
│   ├── FlightInsurance.sol      # Main insurance contract
│   ├── interfaces/
│   │   └── IFlareDataConnector.sol  # FDC interface
│   └── ...
├── scripts/
│   └── deploy-flight-insurance.js   # Deployment script
├── test/
│   └── FlightInsurance.test.js      # Contract tests
├── hardhat.config.js
└── package.json
```

## Security Notes

- Never commit your `.env` file or private keys
- Verify FDC address on your target network
- Test thoroughly on testnet before mainnet deployment
- The signer address must match the backend's signing wallet
