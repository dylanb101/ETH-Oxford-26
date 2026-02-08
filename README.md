# ✈️ Flight Insurance dApp on Flare Network

[![Built for ETHOxford 2026](https://img.shields.io/badge/Built%20for-ETHOxford%202026-blue)](https://ethoxford.com)
[![Flare Network](https://img.shields.io/badge/Network-Flare%20(Coston2)-orange)](https://flare.network)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> A decentralized flight insurance application that automatically triggers payouts based on real-world flight delays, built on the Flare Network for ETHOxford 2026.

## 📘 Introduction

This project implements a complete decentralized insurance solution that combines blockchain smart contracts, (proposed AI-powered actuarial analysis), and external flight data APIs (when they aren't trying to scam us). Users can purchase flight insurance policies that automatically pay out when flights are delayed, with the click of one button.

## ✨ Features

- 🔗 **Smart Contracts on Flare**: Automates policy creation, verification, and payouts on Coston2 testnet.
- 🧠 **Decentralized Oracle Integration**: Powered by Flare Data Connector (FDC).
- 🌐 **Node / Express js Backend**: Handles signing, verification, and API integration.
- 💻 **React Frontend**: User-friendly UI for policy interaction.

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
- **Flare wallet** with Coston2 testnet access
## 🚀 Quick Start



### 1️⃣ Smart Contract Setup (Hardhat) and Meta Mask Account

```bash
# Navigate to smart contract directory
cd apps/contracts

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Compile artifacts
npm compile

# Create Meta Mask account
# Put Private Key from account into .env file

# Deploy files on the Flare testnet (coston2)
npx hardhat run scripts/deploy.js --network coston2

```

Edit `.env` file:
```env
PRIVATE_KEY=your_wallet_private_key
SIGNER_ADDRESS=your_signer_address
FDC_ADDRESS=flare_data_connector_address
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
```


### 2️⃣ Backend (Node.js / Express.js) 

Edit `.env` file:
```env
PRIVATE_KEY=your_wallet_private_key
SIGNER_ADDRESS=your_signer_address
FDC_ADDRESS=flare_data_connector_address
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
```

```bash
# Navigate to backend directory
cd backend/
npm install
npm run start
```

Backend will be available at **http://localhost:5000**  

### 3️⃣ Frontend Setup 

```bash
# Navigate to frontend directory
cd frontend/

# Install dependencies
npm install

# Configure API endpoint
# Update src/config.js with your backend URL

Edit `src/config.js`:
export const API_URL = 'http://localhost:5000';

# Start development server
npm start
```

Frontend will be available at **http://localhost:3000**

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
- Node / Express js

**Frontend:**
- React.js
- Web3.js / Ethers.js
- Material-UI / Tailwind CSS

**"Proposed" Workflow**
- A user enters the website with an already booked plane ticket
- They enter the route number and the date.
- We then display whether there are multiple flights and get the user to pick the one they want to insure their ticket for.
- We then retrieve the rest of the information about the flight to the user.
- We also check their booking confirmation to confirm they have bought a ticket.
- The backend then provides a premium for the user to pay to insure their ticket.
- Once the flight has happened it would appear as journey complete in their dashboard and if there was a delay within a reasonable period the user would click redeem in order to gain the original price of the ticket.

## 🏆 Built For

This project was created for **ETHOxford 2026**, showcasing the potential of decentralized insurance on the Flare Network.

## 📚 Documentation

- **Backend API**: [Swagger UI](http://localhost:5000/docs)
- **Flare Network**: [Official Docs](https://docs.flare.network)
- **AviationStack**: [API Docs](https://aviationstack.com/documentation)
- **FDC Address Guide**: [FDC_ADDRESS_GUIDE.md](./FDC_ADDRESS_GUIDE.md)











Note: this project is not complete.
