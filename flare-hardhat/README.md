# Flare Hardhat Starter

A Hardhat starter project configured for Flare Network development.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```
PRIVATE_KEY=your_private_key_here
FLARE_RPC_URL=https://flare-api.flare.network/ext/C/rpc
COSTON_RPC_URL=https://coston-api.flare.network/ext/C/rpc
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

## Available Networks

- **Flare Mainnet** (Chain ID: 14)
- **Coston Testnet** (Chain ID: 16)
- **Coston2 Testnet** (Chain ID: 114)

## Commands

- `npm run compile` - Compile contracts
- `npm run test` - Run tests
- `npm run deploy:flare` - Deploy to Flare mainnet
- `npm run deploy:coston` - Deploy to Coston testnet
- `npm run deploy:coston2` - Deploy to Coston2 testnet
- `npm run node` - Start local Hardhat node

## Project Structure

```
flare-hardhat/
├── contracts/          # Solidity contracts
├── scripts/            # Deployment scripts
├── test/              # Test files
├── hardhat.config.js  # Hardhat configuration
└── package.json       # Dependencies
```

## Security Note

Never commit your `.env` file or private keys to version control!

