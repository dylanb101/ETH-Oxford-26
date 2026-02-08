# ✈️ Flight Insurance dApp on Flare Network

[![Built for ETHOxford 2026](https://img.shields.io/badge/Built%20for-ETHOxford%202026-blue)](https://ethoxford.com)
[![Flare Network](https://img.shields.io/badge/Network-Flare%20(Coston2)-orange)](https://flare.network)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> A decentralized flight insurance application that automatically triggers payouts based on real-world flight delays, built on the Flare Network for ETHOxford 2026.

## 📘 Introduction

This project implements a complete decentralized insurance solution that combines blockchain smart contracts, oracles, AI-powered actuarial analysis, and external flight data APIs. Users can purchase flight insurance policies that automatically pay out when flights are delayed, without any manual claims processing.

## ✨ Features

- 🔗 **Smart Contracts on Flare**: Automates policy creation, verification, and payouts on Coston2 testnet
- 🧠 **Decentralized Oracle Integration**: Powered by Flare Data Connector (FDC)
- 🌐 **FastAPI Backend**: Handles signing, verification, and API integration
- 💻 **React Frontend**: User-friendly UI for policy interaction (optional)
- 🔐 **EIP-712 Signature Verification**: Ensures secure, verifiable off-chain data

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Frontend  │─────▶│   Backend    │─────▶│ Smart Contract  │
│   (React)   │      │  (FastAPI)   │      │   (Flare)       │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │                        │
                            ▼                        ▼
                     ┌──────────────┐      ┌─────────────────┐
                     │ ANY TRANSPORT│      │      FDC        │
                     │     API      │      │  (Oracle)       │
                     └──────────────┘      └─────────────────┘
```

## ⚙️ Installation

### ✅ Prerequisites

- **Node.js** v18+
- **Python** 3.8+
- **Flare wallet** with Coston2 testnet access
## 🚀 Quick Start

### 1️⃣ Backend Setup (FastAPI)

```bash
# Navigate to backend directory
cd backend/

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `.env` file:
```env
PRIVATE_KEY=your_wallet_private_key
OPENAI_API_KEY=your_openai_key  # Optional
AVIATIONSTACK_API_KEY=your_aviationstack_key  # Optional
```

```bash
# Run the backend
python main.py
# Or using uvicorn
uvicorn main:app --reload
```

Backend will be available at **http://localhost:5000**  
Swagger docs at **http://localhost:5000/docs**

### 2️⃣ Smart Contract Setup (Hardhat)

```bash
# Navigate to smart contract directory
cd flare-hardhat/

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Edit `.env` file:
```env
PRIVATE_KEY=your_wallet_private_key
SIGNER_ADDRESS=your_signer_address
FDC_ADDRESS=flare_data_connector_address
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
```

```bash
# Compile contracts
npm run compile

# Deploy to Coston2 testnet
npm run deploy:coston2
```

### 3️⃣ Frontend Setup (Optional)

```bash
# Navigate to frontend directory
cd frontend/

# Install dependencies
npm install

# Configure API endpoint
# Update src/config.js with your backend URL
```

Edit `src/config.js`:
```javascript
export const API_URL = 'http://localhost:5000';
```

```bash
# Start development server
npm start
```

Frontend will be available at **http://localhost:3000**

## 🧪 Testing the Application

### Step 1: Get a Quote

```bash
curl -X POST http://localhost:5000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "flight_number": "BA123",
    "departure_date": "2026-03-15",
    "coverage_amount": 1000
  }'
```

### Step 2: Purchase Policy

Use the smart contract interface or frontend to:
1. Connect your wallet
2. Enter flight details
3. Pay the premium
4. Receive policy NFT (future feature)

### Step 3: Claim Payout

If flight is delayed beyond threshold:
1. Backend fetches delay data
2. Oracle verifies the data
3. Smart contract automatically processes payout
4. Funds sent to policyholder

## 📂 Project Structure

```
flight-insurance-dapp/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main application entry
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment template
├── flare-hardhat/          # Smart contracts
│   ├── contracts/          # Solidity contracts
│   ├── scripts/            # Deployment scripts
│   ├── test/               # Contract tests
│   ├── hardhat.config.js   # Hardhat configuration
│   └── .env.example        # Environment template
├── frontend/               # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── FDC_ADDRESS_GUIDE.md    # Guide for finding FDC address
└── README.md               # This file
```

## 🛠️ Tech Stack

**Blockchain:**
- Solidity (Smart Contracts)
- Hardhat (Development Framework)
- Flare Network (Coston2 Testnet)
- Ethers.js (Web3 Integration)

**Backend:**
- FastAPI (Python Web Framework)
- TO WRITE DYLAN!!! TO WRITE WORKFLOW HERE ################################

**Frontend:**
- React.js
- Web3.js / Ethers.js
- Material-UI / Tailwind CSS

## 🏆 Built For

This project was created for **ETHOxford 2026**, showcasing the potential of decentralized insurance on the Flare Network.

## 📚 Documentation

- **Backend API**: [Swagger UI](http://localhost:5000/docs)
- **Flare Network**: [Official Docs](https://docs.flare.network)
- **AviationStack**: [API Docs](https://aviationstack.com/documentation)
- **FDC Address Guide**: [FDC_ADDRESS_GUIDE.md](./FDC_ADDRESS_GUIDE.md)



