require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Flare Network Configuration
const FLARE_RPC_URL = process.env.FLARE_RPC_URL || process.env.COSTON2_RPC_URL || 'https://coston2-api.flare.network/ext/C/rpc';
const FLIGHT_INSURANCE_ADDRESS = process.env.FLIGHT_INSURANCE_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY || process.env.AVIATION_API_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || FLIGHT_INSURANCE_ADDRESS; // Use contract address as wallet address

// Initialize provider and signer
let provider;
let signer;
let flightInsuranceContract;

// Initialize blockchain connection
function initializeBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(FLARE_RPC_URL);
    
    if (PRIVATE_KEY) {
      signer = new ethers.Wallet(PRIVATE_KEY, provider);
      console.log('Connected to Flare Network with signer:', signer.address);
    } else {
      console.log('Connected to Flare Network (read-only mode)');
    }

    // Load contract ABI if address is provided
    if (FLIGHT_INSURANCE_ADDRESS) {
      try {
        const contractABI = require('./artifacts/contracts/FlightInsurance.sol/FlightInsuranceFDC.json').abi;
        if (signer) {
          flightInsuranceContract = new ethers.Contract(FLIGHT_INSURANCE_ADDRESS, contractABI, signer);
        } else {
          flightInsuranceContract = new ethers.Contract(FLIGHT_INSURANCE_ADDRESS, contractABI, provider);
        }
        console.log('FlightInsurance contract loaded at:', FLIGHT_INSURANCE_ADDRESS);
      } catch (error) {
        console.warn('Could not load FlightInsurance contract ABI:', error.message);
      }
    }
  } catch (error) {
    console.error('Error initializing blockchain connection:', error);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Flare Insurance Backend is running!',
    network: FLARE_RPC_URL,
    contractAddress: FLIGHT_INSURANCE_ADDRESS || 'Not configured',
    signerAddress: signer?.address || 'Not configured'
  });
});

// Get network info
app.get('/api/network', async (req, res) => {
  try {
    if (!provider) {
      return res.status(503).json({ error: 'Blockchain provider not initialized' });
    }

    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getFeeData();

    res.json({
      chainId: Number(network.chainId),
      name: network.name,
      blockNumber,
      gasPrice: gasPrice.gasPrice?.toString(),
      rpcUrl: FLARE_RPC_URL
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get contract info
app.get('/api/contract/info', async (req, res) => {
  try {
    if (!flightInsuranceContract) {
      return res.status(503).json({ error: 'FlightInsurance contract not initialized' });
    }

    const policyCount = await flightInsuranceContract.policyCount();
    const payoutEngineAddress = await flightInsuranceContract.payoutEngine();

    res.json({
      address: FLIGHT_INSURANCE_ADDRESS,
      policyCount: policyCount.toString(),
      payoutEngine: payoutEngineAddress
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get policy by ID
app.get('/api/contract/policy/:policyId', async (req, res) => {
  try {
    if (!flightInsuranceContract) {
      return res.status(503).json({ error: 'FlightInsurance contract not initialized' });
    }

    const policyId = parseInt(req.params.policyId);
    const policy = await flightInsuranceContract.policies(policyId);

    res.json({
      policyId,
      holder: policy.holder,
      premium: policy.premium.toString(),
      payout: policy.payout.toString(),
      startTime: policy.startTime.toString(),
      expirationTime: policy.expirationTime.toString(),
      minDelayMinutes: policy.minDelayMinutes.toString(),
      status: policy.status // 0: Active, 1: Settled, 2: Expired
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get policy count
app.get('/api/contract/policy-count', async (req, res) => {
  try {
    if (!flightInsuranceContract) {
      return res.status(503).json({ error: 'FlightInsurance contract not initialized' });
    }

    const count = await flightInsuranceContract.policyCount();
    res.json({ count: count.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create policy (requires transaction from user's wallet)
// This endpoint provides the transaction data for the frontend to send
app.post('/api/contract/create-policy', async (req, res) => {
  try {
    if (!flightInsuranceContract) {
      return res.status(503).json({ error: 'FlightInsurance contract not initialized' });
    }

    const { expirationTime, minDelayMinutes, payoutAmount, merkleProof } = req.body;

    if (!expirationTime || !minDelayMinutes || !payoutAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert to BigInt/Wei
    const expirationTimeBN = BigInt(expirationTime);
    const minDelayMinutesBN = BigInt(minDelayMinutes);
    const payoutAmountBN = ethers.parseEther(payoutAmount.toString());
    const merkleProofArray = merkleProof || [];

    // Estimate gas
    const gasEstimate = await flightInsuranceContract.createPolicy.estimateGas(
      expirationTimeBN,
      minDelayMinutesBN,
      payoutAmountBN,
      merkleProofArray
    );

    // Get current gas price
    const feeData = await provider.getFeeData();

    res.json({
      success: true,
      contractAddress: FLIGHT_INSURANCE_ADDRESS,
      functionName: 'createPolicy',
      parameters: {
        expirationTime: expirationTimeBN.toString(),
        minDelayMinutes: minDelayMinutesBN.toString(),
        payoutAmount: payoutAmountBN.toString(),
        merkleProof: merkleProofArray
      },
      gasEstimate: gasEstimate.toString(),
      gasPrice: feeData.gasPrice?.toString(),
      // Note: Frontend should send the actual transaction from user's wallet
      message: 'Use this data to construct the transaction in the frontend'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve policy (requires FDC proof)
app.post('/api/contract/resolve-policy', async (req, res) => {
  try {
    if (!flightInsuranceContract) {
      return res.status(503).json({ error: 'FlightInsurance contract not initialized' });
    }

    const { policyId, proof } = req.body;

    if (policyId === undefined || !proof) {
      return res.status(400).json({ error: 'Missing required fields: policyId and proof' });
    }

    // Estimate gas
    const gasEstimate = await flightInsuranceContract.resolvePolicy.estimateGas(
      BigInt(policyId),
      proof
    );

    const feeData = await provider.getFeeData();

    res.json({
      success: true,
      contractAddress: FLIGHT_INSURANCE_ADDRESS,
      functionName: 'resolvePolicy',
      parameters: {
        policyId: policyId.toString(),
        proof
      },
      gasEstimate: gasEstimate.toString(),
      gasPrice: feeData.gasPrice?.toString(),
      message: 'Use this data to construct the transaction'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get account balance
app.get('/api/account/balance/:address', async (req, res) => {
  try {
    if (!provider) {
      return res.status(503).json({ error: 'Blockchain provider not initialized' });
    }

    const address = req.params.address;
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    const balance = await provider.getBalance(address);
    res.json({
      address,
      balance: balance.toString(),
      balanceFLR: ethers.formatEther(balance)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get signer address (if configured)
app.get('/api/signer/address', (req, res) => {
  if (!signer) {
    return res.status(503).json({ error: 'Signer not configured' });
  }
  res.json({ address: signer.address });
});

// ============================================
// Endpoint 1: Flight Information
// ============================================
/**
 * POST /api/flight/info
 * Receives flight information from frontend and fetches data from AviationStack API
 * 
 * Request body:
 * {
 *   "flightNumber": "BA297",
 *   "flightDate": "2024-12-25" (optional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "flightNumber": "BA297",
 *   "flightDate": "2024-12-25",
 *   "flights": [...],
 *   "count": 1
 * }
 */
app.post('/api/flight/info', async (req, res) => {
  try {
    const { flightNumber, flightDate } = req.body;

    // Validate input
    if (!flightNumber) {
      return res.status(400).json({ error: 'flightNumber is required' });
    }

    // Validate flight number format (e.g., "BA297", "AA100")
    const cleanFlightNumber = flightNumber.toUpperCase().trim();
    const match = cleanFlightNumber.match(/^([A-Z]{2})(\d+)$/);
    if (!match) {
      return res.status(400).json({ 
        error: 'Invalid flight number format. Use format like BA297 or AA100' 
      });
    }

    // Format date as YYYY-MM-DD for API
    let formattedDate = null;
    if (flightDate) {
      formattedDate = new Date(flightDate).toISOString().split('T')[0];
      
      // Validate date is not in the past
      const today = new Date().toISOString().split('T')[0];
      if (formattedDate < today) {
        return res.status(400).json({ error: 'Flight date cannot be in the past' });
      }
    }

    // Call AviationStack API
    const API_URL = 'http://api.aviationstack.com/v1/flights';
    const params = {
      access_key: AVIATIONSTACK_API_KEY,
      flight_num: cleanFlightNumber,
    };

    if (formattedDate) {
      params.flight_date = formattedDate;
    }

    let flightData;
    try {
      const response = await axios.get(API_URL, { params: params });
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        flightData = response.data.data;
      } else {
        return res.status(404).json({ error: 'Flight not found' });
      }
    } catch (apiError) {
      console.error('AviationStack API error:', apiError.message);
      
      // If API key is missing or API fails, return error
      if (!AVIATIONSTACK_API_KEY || apiError.response?.status === 401 || apiError.response?.status === 403) {
        return res.status(503).json({ 
          error: 'AviationStack API key not configured. Please set AVIATIONSTACK_API_KEY in environment variables.',
          mockData: getMockFlightData(cleanFlightNumber, formattedDate, match)
        });
      }
      
      if (apiError.response?.status === 429) {
        return res.status(429).json({ error: 'API rate limit exceeded. Please try again later.' });
      }
      
      if (apiError.response?.status >= 500) {
        return res.status(503).json({ error: 'Flight API service is temporarily unavailable. Please try again later.' });
      }
      
      throw apiError;
    }

    // Parse flight data
    const parsedFlights = flightData.map(flight => {
      const dep = flight.departure || {};
      const arr = flight.arrival || {};
      const airline = flight.airline || {};
      const aircraft = flight.aircraft || {};
      const flightInfo = flight.flight || {};

      return {
        // Raw API data (keep for reference)
        raw: flight,
        
        // Parsed fields
        from: dep.airport || dep.iata || '',
        fromIata: dep.iata || '',
        to: arr.airport || arr.iata || '',
        toIata: arr.iata || '',
        departureTime: dep.scheduled || '',
        arrivalTime: arr.scheduled || '',
        date: flight.flight_date || (dep.scheduled ? dep.scheduled.split('T')[0] : ''),
        airline: airline.name || airline.iata || '',
        airlineIata: airline.iata || '',
        aircraft: aircraft.name || aircraft.iata || aircraft.registration || 'N/A',
        flightNumber: flightInfo.iata || '',
        flightNumberNumeric: flightInfo.number || '',
        flightStatus: flight.flight_status || 'scheduled',
        delay: dep.delay || 0,
      };
    });

    res.json({
      success: true,
      flightNumber: cleanFlightNumber,
      flightDate: formattedDate,
      flights: parsedFlights,
      count: parsedFlights.length
    });

  } catch (error) {
    console.error('Error fetching flight info:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Helper function for mock flight data (fallback)
function getMockFlightData(cleanFlightNumber, formattedDate, match) {
  const [, airlineCode, flightNum] = match;
  const baseDate = formattedDate ? new Date(formattedDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  const airlineNames = {
    'BA': 'British Airways',
    'AA': 'American Airlines',
    'LH': 'Lufthansa',
    'DL': 'Delta Air Lines',
    'UA': 'United Airlines',
    'AF': 'Air France',
  };
  
  const date1 = new Date(baseDate);
  date1.setHours(8, 0, 0, 0);
  const arr1 = new Date(date1);
  arr1.setHours(16, 0, 0, 0);
  
  return [{
    flight: { iata: cleanFlightNumber, number: flightNum },
    airline: { name: airlineNames[airlineCode] || 'Airline', iata: airlineCode },
    departure: { airport: 'London Heathrow', iata: 'LHR', scheduled: date1.toISOString() },
    arrival: { airport: 'New York JFK', iata: 'JFK', scheduled: arr1.toISOString() },
    aircraft: { name: 'Boeing 777', iata: 'B777' },
    flight_date: formattedDate || baseDate.toISOString().split('T')[0],
    flight_status: 'scheduled',
  }];
}

// ============================================
// Endpoint 2: Create Contract (C2FLR)
// ============================================
/**
 * POST /api/contract/create
 * Creates a contract and prepares transaction data for MetaMask
 * Accepts amounts in C2FLR (not Wei) and returns transaction data for frontend
 * 
 * Request body:
 * {
 *   "premium": "10.5",  // Premium amount in C2FLR
 *   "expirationTime": 1735689600,  // Unix timestamp
 *   "minDelayMinutes": 30,  // Minimum delay in minutes to trigger payout
 *   "payoutAmount": "15.75",  // Payout amount in C2FLR
 *   "merkleProof": []  // Optional merkle proof array
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "contractAddress": "0x...",
 *   "premium": "10.5",  // In C2FLR
 *   "payoutAmount": "15.75",  // In C2FLR
 *   "transaction": { ... },  // MetaMask transaction data
 *   "walletAddress": "0x...",  // Address to send C2FLR to
 *   ...
 * }
 */
app.post('/api/contract/create', async (req, res) => {
  try {
    if (!flightInsuranceContract) {
      return res.status(503).json({ error: 'FlightInsurance contract not initialized' });
    }

    const { premium, expirationTime, minDelayMinutes, payoutAmount, merkleProof } = req.body;

    // Validate required fields
    if (!premium || !expirationTime || minDelayMinutes === undefined || !payoutAmount) {
      return res.status(400).json({ 
        error: 'Missing required fields: premium, expirationTime, minDelayMinutes, payoutAmount' 
      });
    }

    // Validate premium is positive
    const premiumNum = parseFloat(premium);
    if (isNaN(premiumNum) || premiumNum <= 0) {
      return res.status(400).json({ error: 'Premium must be a positive number' });
    }

    // Validate payout amount is positive
    const payoutNum = parseFloat(payoutAmount);
    if (isNaN(payoutNum) || payoutNum <= 0) {
      return res.status(400).json({ error: 'Payout amount must be a positive number' });
    }

    // Validate expiration time is in the future
    const expirationTimestamp = parseInt(expirationTime);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (expirationTimestamp <= currentTimestamp) {
      return res.status(400).json({ error: 'Expiration time must be in the future' });
    }

    // Convert C2FLR to Wei for blockchain (internal conversion only)
    const premiumWei = ethers.parseEther(premium.toString());
    const payoutAmountWei = ethers.parseEther(payoutAmount.toString());
    const minDelayMinutesBN = BigInt(minDelayMinutes);
    const expirationTimeBN = BigInt(expirationTimestamp);
    const merkleProofArray = merkleProof || [];

    // Estimate gas for the transaction
    let gasEstimate;
    try {
      gasEstimate = await flightInsuranceContract.createPolicy.estimateGas(
        expirationTimeBN,
        minDelayMinutesBN,
        payoutAmountWei,
        merkleProofArray,
        { value: premiumWei }
      );
    } catch (error) {
      console.error('Gas estimation error:', error);
      // Use a default gas estimate if estimation fails
      gasEstimate = BigInt(200000); // Default gas limit
    }

    // Get current gas price and network info
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || await provider.getFeeData().then(f => f.gasPrice);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    // Prepare transaction data for MetaMask
    // Note: value must be in Wei for the blockchain, but we'll show C2FLR in response
    const transactionData = {
      to: FLIGHT_INSURANCE_ADDRESS,
      value: premiumWei.toString(), // Must be in Wei for blockchain
      data: flightInsuranceContract.interface.encodeFunctionData('createPolicy', [
        expirationTimeBN.toString(),
        minDelayMinutesBN.toString(),
        payoutAmountWei.toString(),
        merkleProofArray
      ]),
      gasLimit: gasEstimate.toString(),
      gasPrice: gasPrice?.toString() || '0',
      chainId: Number(network.chainId),
    };

    // Return response with C2FLR amounts (not Wei)
    res.json({
      success: true,
      contractAddress: FLIGHT_INSURANCE_ADDRESS,
      premium: premium.toString(), // In C2FLR
      payoutAmount: payoutAmount.toString(), // In C2FLR
      transaction: transactionData,
      walletAddress: WALLET_ADDRESS, // Address where C2FLR will be sent
      parameters: {
        expirationTime: expirationTimestamp,
        expirationTimeReadable: new Date(expirationTimestamp * 1000).toISOString(),
        minDelayMinutes: parseInt(minDelayMinutes),
        merkleProof: merkleProofArray
      },
      gasEstimate: gasEstimate.toString(),
      gasPrice: gasPrice?.toString() || '0',
      network: {
        chainId: Number(network.chainId),
        name: network.name,
        blockNumber
      },
      message: 'Use the transaction object with MetaMask. The premium amount is in C2FLR.'
    });

  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Start server
initializeBlockchain();

app.listen(PORT, () => {
  console.log(`🚀 Flare Insurance Backend Server running on port ${PORT}`);
  console.log(`📡 Connected to: ${FLARE_RPC_URL}`);
  if (FLIGHT_INSURANCE_ADDRESS) {
    console.log(`📄 Contract: ${FLIGHT_INSURANCE_ADDRESS}`);
  }
});

