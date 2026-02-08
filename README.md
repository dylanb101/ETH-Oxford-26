🧪 Project Title
Flight Insurance dApp on Flare Network
📘 Introduction
This project implements a decentralized flight insurance application built on the Flare Network, created for ETHOxford 2026. It enables users to purchase flight insurance policies, automatically triggering payouts based on real-world flight delays. The system combines blockchain smart contracts, oracles, AI-powered actuarial analysis, and external flight data APIs to deliver a complete decentralized insurance solution.
Targeted at developers, hackathon participants, and Web3 insurance innovators.
✨ Features
🔗 Smart Contracts on Flare (Coston2 testnet): Automates policy creation, verification, and payouts.
🤖 AI Actuary: Uses OpenAI to calculate premiums and thresholds.
🛫 Real Flight Data Integration: Fetches actual flight delay data via the AviationStack API.
🧠 Decentralized Oracle Integration: Via Flare Data Connector (FDC).
🌐 FastAPI Backend: Handles signing, verification, and integration with APIs.
💻 React Frontend (optional): UI for interacting with the app.
🔐 EIP-712 Signature Verification: Ensures secure, verifiable off-chain data.
⚙️ Installation
✅ Prerequisites
Node.js (v18+)
Python 3.8+
A Flare wallet (testnet: Coston2)
OpenAI API key (optional)
AviationStack API key (optional)
🚀 Usage
🔧 Backend Setup (FastAPI)
Navigate to backend/
Create virtual environment and install dependencies.
Set up .env file with:
PRIVATE_KEY (admin wallet for signing)
Optional API keys
Run backend with python main.py or uvicorn main:app --reload
Backend available at http://localhost:5000, Swagger docs at /docs.
📜 Smart Contract Setup (Hardhat)
Navigate to flare-hardhat/
Install dependencies and set up .env with:
PRIVATE_KEY, SIGNER_ADDRESS, FDC address, RPC URLs
Compile and deploy contracts to Coston2 testnet.
🧪 Testing
Get a quote via the backend.
Purchase a policy using the smart contract.
Verify and claim payout if delay conditions are met.
💻 Frontend (Optional)
Navigate to frontend/
Install dependencies
Update API URL
Run with npm start at http://localhost:3000
📚 Documentation
Backend Swagger UI: http://localhost:5000/docs
Flare Docs
AviationStack Docs
🧑‍💻 Contributing
While not explicitly stated, contributors are encouraged to:
Fork and clone the repo
Use issues or discussions for bugs/features
Submit PRs with changes
📫 Contact Information
Not provided directly, but you can reach the original developer via GitHub: @dylanb101
🔍 Bonus: Finding FDC (Flare Data Connector) Address
The repo includes a detailed guide (FDC_ADDRESS_GUIDE.md) on how to find or mock the FDC address for deploying on testnet or mainnet. It walks through:
Checking Flare docs & GitHub
Querying with ethers.js
Using mock contracts for testing
Exploring with Flare explorer
