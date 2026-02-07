# Flight Insurance dApp - Setup & Run Guide

Complete guide to set up and run the Flare Network Flight Insurance application.

## Prerequisites

- Node.js (v18+) and npm
- Python 3.8+
- A Flare Network wallet (for testnet: Coston2)
- OpenAI API key for AI actuary
- AviationStack API key for real flight data

---

## Part 1: Backend Setup (FastAPI)

### Step 1: Navigate to backend directory
```bash
cd backend
```

### Step 2: Create virtual environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 3: Install dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Create `.env` file
Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5000
FASTAPI_ENV=development

# Required: Admin wallet private key for signing quotes
# Generate a new wallet or use an existing one (NEVER use mainnet keys!)
PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# Flare Network Configuration
FLARE_CHAIN_ID=114  # Coston2 testnet
DOMAIN_NAME=Flare Insurance dApp
DOMAIN_VERSION=1

# Optional: OpenAI API key for AI actuary (falls back to mock if not provided)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: AviationStack API key for real flight data
AVIATIONSTACK_API_KEY=your-aviationstack-api-key-here
```

**Important**: 
- Replace `PRIVATE_KEY` with your actual private key (use a test wallet!)
- Get OpenAI API key from: https://platform.openai.com/api-keys
- Get AviationStack API key from: https://aviationstack.com/

### Step 5: Run the backend
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

The backend will start on `http://localhost:5000`

### Step 6: Verify backend is running
- Open browser: `http://localhost:5000/docs` (Swagger UI)
- Or test health endpoint: `http://localhost:5000/api/health`

---

## Part 2: Smart Contract Setup (Hardhat)

### Step 1: Navigate to hardhat directory
```bash
cd ../flare-hardhat
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Create `.env` file
Create a `.env` file in the `flare-hardhat/` directory:

```env
# Wallet private key for deployment (use testnet wallet!)
PRIVATE_KEY=your_private_key_here

# Backend signer address (must match the PRIVATE_KEY address from backend/.env)
SIGNER_ADDRESS=0x...  # Get this from backend startup logs or calculate from PRIVATE_KEY

# Flare Data Connector address (check Flare docs for testnet/mainnet addresses)
# For Coston2 testnet, you may need to deploy a mock or use placeholder
FLARE_DATA_CONNECTOR_ADDRESS=0x0000000000000000000000000000000000000000

# RPC URLs
FLARE_RPC_URL=https://flare-api.flare.network/ext/C/rpc
COSTON_RPC_URL=https://coston-api.flare.network/ext/C/rpc
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

**Note**: To get `SIGNER_ADDRESS`, run the backend and check the startup logs, or calculate it from the private key.

### Step 4: Compile contracts
```bash
npm run compile
```

### Step 5: Deploy to Coston2 testnet
```bash
npx hardhat run scripts/deploy-flight-insurance.js --network coston2
```

This will output:
- Contract address (save this!)
- Signer address
- FDC address

### Step 6: Update backend with contract address
After deployment, update your backend `.env` or configuration with the deployed contract address.

---

## Part 3: Testing the Application

### Test Backend API

#### 1. Get a quote
```bash
curl -X POST "http://localhost:5000/api/v1/quote" \
  -H "Content-Type: application/json" \
  -d '{
    "user_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    "flight_number": "AA123",
    "flight_date": "2024-12-25",
    "departure_airport": "JFK",
    "arrival_airport": "LAX"
  }'
```

Response will include:
- `premium`: Premium amount in Wei
- `delay_threshold_minutes`: Minimum delay to trigger payout
- `payout_multiplier`: Payout multiplier
- `signature`: EIP-712 signature
- `flight_id`: Unique flight identifier

#### 2. Verify contract
```bash
curl -X POST "http://localhost:5000/api/v1/verify-contract" \
  -H "Content-Type: application/json" \
  -d '{
    "flight_number": "AA123",
    "flight_date": "2024-12-25",
    "contract_address": "0x...",
    "user_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
  }'
```

### Test Smart Contract

#### 1. Purchase a policy (using ethers.js or web3)
You'll need to:
1. Get a signed quote from the backend
2. Call `purchasePolicy()` on the contract with the quote data
3. Send the premium amount in FLR

#### 2. Verify contract conditions
Call `verifyContract()` on the contract with:
- Policy ID
- AviationStack API key

#### 3. Claim payout
If conditions are met, call `claimPayout()` with:
- Policy ID
- Delay minutes

---

## Part 4: Frontend Integration (Optional)

### Step 1: Navigate to frontend
```bash
cd ../frontend
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Update API URL
Update `src/App.js` to point to your backend:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

### Step 4: Run frontend
```bash
npm start
```

Frontend will start on `http://localhost:3000`

---

## Quick Start (Minimal Setup)

If you just want to test quickly without API keys:

### Backend:
1. `cd backend`
2. `python3 -m venv venv && source venv/bin/activate`
3. `pip install -r requirements.txt`
4. Create `.env` with just `PRIVATE_KEY` (generate a test key)
5. `python main.py`

The backend will use mock data for AI analysis and flight data.

### Smart Contract:
1. `cd flare-hardhat`
2. `npm install`
3. Create `.env` with `PRIVATE_KEY` and `SIGNER_ADDRESS`
4. `npm run compile`
5. Deploy to testnet

---

## Troubleshooting

### Backend Issues

**"PRIVATE_KEY environment variable is required"**
- Make sure `.env` file exists in `backend/` directory
- Check that `PRIVATE_KEY` is set in `.env`

**"OPENAI_API_KEY not set"**
- This is optional - backend will use mock analysis
- To use real AI, add your OpenAI API key to `.env`

**Port already in use**
- Change `PORT=5000` to another port in `.env`
- Or kill the process using port 5000

### Smart Contract Issues

**"Insufficient funds"**
- Make sure your wallet has testnet FLR tokens
- Get testnet tokens from Flare faucet

**"Invalid signature"**
- Make sure `SIGNER_ADDRESS` in hardhat matches backend's signer address
- Verify the private key in backend `.env` matches the signer

**"FDC address not found"**
- Check Flare documentation for FDC contract addresses
- For testing, you can use a placeholder address

---

## Environment Variables Summary

### Backend `.env`
- `PRIVATE_KEY` - **Required** - Admin wallet private key
- `OPENAI_API_KEY` - Optional - For AI actuary
- `AVIATIONSTACK_API_KEY` - Optional - For real flight data

### Hardhat `.env`
- `PRIVATE_KEY` - **Required** - Deployment wallet private key
- `SIGNER_ADDRESS` - **Required** - Must match backend signer
- `FLARE_DATA_CONNECTOR_ADDRESS` - Required - FDC contract address

---

## Next Steps

1. **Get testnet tokens**: Request FLR from Flare Coston2 faucet
2. **Deploy contract**: Deploy FlightInsurance to Coston2
3. **Test flow**: Create quote → Purchase policy → Verify → Claim
4. **Integrate frontend**: Connect React frontend to backend and contract
5. **Add real APIs**: Add OpenAI and AviationStack keys for production

---

## Support

- Backend API docs: `http://localhost:5000/docs`
- Flare Network docs: https://docs.flare.network/
- AviationStack docs: https://aviationstack.com/documentation

