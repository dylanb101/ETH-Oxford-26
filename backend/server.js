require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const axios = require('axios');

// Load contract ABI
let FlightInsuranceABI;
try {
  FlightInsuranceABI = require('./abis/FlightInsuranceFDC.json');
} catch {
  // Fallback to artifacts if abis folder doesn't exist
  try {
    FlightInsuranceABI = require('../apps/contracts/artifacts/contracts/FlightInsurance.sol/FlightInsuranceFDC.json');
  } catch (error) {
    console.warn('Could not load FlightInsurance ABI:', error.message);
    FlightInsuranceABI = null;
  }
}

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
    if (FLIGHT_INSURANCE_ADDRESS && FlightInsuranceABI) {
      try {
        const contractABI = FlightInsuranceABI.abi || FlightInsuranceABI;
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
// Insurance Quote Generation
// ============================================
/**
 * POST /api/quote
 * 
 * Generates an insurance quote based on flight data
 * This is step 1 of the workflow - user sends flight data, gets quote
 * 
 * Request body:
 * {
 *   "flightNumber": "BA297",
 *   "flightDate": "2024-12-25",
 *   "minDelayMinutes": 30,  // Optional, defaults to 30
 *   "payoutAmount": "100"    // Optional, defaults to calculated amount
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "quote": {
 *     "flightNumber": "BA297",
 *     "flightDate": "2024-12-25",
 *     "premium": "8.50",  // In C2FLR
 *     "payout": "100.00",  // In C2FLR
 *     "minDelayMinutes": 30,
 *     "expirationTime": 1735689600,  // Unix timestamp (flight date + buffer)
 *     "quoteId": "quote_1234567890"  // Unique quote ID
 *   }
 * }
 */
app.post('/api/quote', async (req, res) => {
  try {
    const { flightNumber, flightDate, minDelayMinutes = 30, payoutAmount } = req.body;

    // Validate required fields
    if (!flightNumber || !flightDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: flightNumber and flightDate' 
      });
    }

    // Validate flight number format
    const cleanFlightNumber = flightNumber.toUpperCase().trim();
    const match = cleanFlightNumber.match(/^([A-Z]{2})(\d+)$/);
    if (!match) {
      return res.status(400).json({ 
        error: 'Invalid flight number format. Use format like BA297 or AA100' 
      });
    }

    // Validate date
    const flightDateObj = new Date(flightDate);
    if (isNaN(flightDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid flight date format' });
    }

    // Calculate expiration time (flight date + 24 hours buffer for claims)
    const expirationTime = Math.floor(flightDateObj.getTime() / 1000) + (24 * 60 * 60);

    // Calculate premium based on route/risk (simplified - in production use ML/risk model)
    // For now, using a simple formula: premium = payout * 0.1 (10% of payout)
    const payout = payoutAmount ? parseFloat(payoutAmount) : 100.0; // Default payout
    const premium = payout * 0.085; // 8.5% premium (adjust based on risk model)

    // Generate unique quote ID
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      success: true,
      quote: {
        flightNumber: cleanFlightNumber,
        flightDate,
        premium: premium.toFixed(2),
        payout: payout.toFixed(2),
        minDelayMinutes: parseInt(minDelayMinutes),
        expirationTime,
        expirationTimeReadable: new Date(expirationTime * 1000).toISOString(),
        quoteId
      },
      message: 'Quote generated successfully. User can accept to create contract.'
    });
  } catch (error) {
    console.error('Error generating quote:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
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
 * This is step 2 of the workflow - user accepts quote, creates contract via MetaMask
 * 
 * Request body (can use quote data directly):
 * {
 *   "premium": "10.5",  // Premium amount in C2FLR
 *   "expirationTime": 1735689600,  // Unix timestamp
 *   "minDelayMinutes": 30,  // Minimum delay in minutes to trigger payout
 *   "payoutAmount": "15.75",  // Payout amount in C2FLR
 *   "merkleProof": [],  // Optional merkle proof array
 *   "quoteId": "quote_1234567890"  // Optional: quote ID for tracking
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

// ============================================
// Flight Data Fetch Function
// ============================================
/**
 * Fetches flight delay data from AviationStack API
 * This data is NOT trusted on-chain — it's only for UX + proof building
 * 
 * @param {number} policyId - Policy ID (for logging/tracking)
 * @param {string} flightNumber - Flight IATA code (e.g., "BA297")
 * @param {string} flightDate - Optional flight date in YYYY-MM-DD format
 * @returns {Promise<{delayMinutes: number}>} Flight delay data
 */
async function getFlightDelay(policyId, flightNumber, flightDate = null) {
  try {
    // Validate flight number format
    const cleanFlightNumber = flightNumber.toUpperCase().trim();
    const match = cleanFlightNumber.match(/^([A-Z]{2})(\d+)$/);
    if (!match) {
      throw new Error('Invalid flight number format. Use format like BA297 or AA100');
    }

    // Format date as YYYY-MM-DD for API
    let formattedDate = null;
    if (flightDate) {
      formattedDate = new Date(flightDate).toISOString().split('T')[0];
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
      const response = await axios.get(API_URL, { params });

      if (response.data && response.data.data && response.data.data.length > 0) {
        flightData = response.data.data[0]; // Use first flight
      } else {
        throw new Error('Flight not found');
      }
    } catch (apiError) {
      console.error('AviationStack API error:', apiError.message);

      // If API key is missing or API fails, return mock data for development
      if (!AVIATIONSTACK_API_KEY || apiError.response?.status === 401 || apiError.response?.status === 403) {
        console.warn('Using mock flight delay data (API key not configured)');
        // Return mock delay for development
        return {
          delayMinutes: 135 // Mock delay in minutes
        };
      }

      throw apiError;
    }

    // Extract delay from flight data
    const dep = flightData.departure || {};
    const delayMinutes = dep.delay ? Math.floor(dep.delay / 60) : 0; // Convert seconds to minutes

    return {
      delayMinutes,
      flightNumber: cleanFlightNumber,
      flightDate: formattedDate,
      scheduled: dep.scheduled,
      actual: dep.actual,
      delaySeconds: dep.delay || 0
    };
  } catch (error) {
    console.error(`Error fetching flight delay for policy ${policyId}:`, error);
    throw error;
  }
}

// ============================================
// Flare Data Connector (FDC) Web2Json Verification
// ============================================
/**
 * Requests FDC Web2Json proof from Flare Data Connector
 * This is the important Flare-specific part for on-chain verification
 * 
 * The returned object maps directly to:
 * resolvePolicy(uint256 policyId, IWeb2Json.Proof proof)
 * 
 * @param {Object} options - FDC request options
 * @param {string} options.url - URL to fetch JSON data from
 * @param {string} options.jsonPath - JSONPath to extract the value (e.g., "$.delayMinutes")
 * @param {string} options.method - HTTP method (default: "GET")
 * @returns {Promise<Object>} FDC proof object compatible with IWeb2Json.Proof
 */
async function requestFdcWeb2JsonProof({ url, jsonPath, method = "GET" }) {
  const FLARE_FDC_URL = process.env.FLARE_FDC_URL || 'https://coston2-api.flare.network/ext/bc/C/rpc';
  
  const response = await axios.post(
    `${FLARE_FDC_URL}/web2json/verify`,
    {
      url,
      method,
      responseBodyExtraction: {
        jsonPath
      }
    }
  );

  return response.data;
}

/**
 * POST /api/fdc/web2json/proof
 * 
 * Generates an FDC Web2Json proof for flight delay data
 * This proof can be used with resolvePolicy on-chain
 * 
 * Request body:
 * {
 *   "url": "https://api.flightprovider.com/flight/LH404",
 *   "jsonPath": "$.delayMinutes",
 *   "method": "GET" (optional)
 * }
 */
app.post('/api/fdc/web2json/proof', async (req, res) => {
  try {
    const { url, jsonPath, method = "GET" } = req.body;

    if (!url || !jsonPath) {
      return res.status(400).json({ 
        error: 'Missing required fields: url and jsonPath' 
      });
    }

    const proof = await requestFdcWeb2JsonProof({ url, jsonPath, method });

    res.json({
      success: true,
      proof,
      message: 'Use this proof with resolvePolicy contract function'
    });
  } catch (error) {
    console.error('FDC proof generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate FDC proof', 
      details: error.message 
    });
  }
});

// ============================================
// Policy Claim/Verification Endpoint
// ============================================
/**
 * POST /api/policies/:policyId/claim
 * 
 * This is the final step - user clicks button, backend:
 * 1. Gets flight delay data
 * 2. Gets FDC proof
 * 3. Calls resolvePolicy on-chain (if signer available) OR returns transaction data
 * 4. Returns result
 * 
 * Request body:
 * {
 *   "flightNumber": "BA297",
 *   "flightDate": "2024-12-25"
 * }
 * 
 * Response (if backend has signer):
 * {
 *   "success": true,
 *   "policyId": 0,
 *   "fulfilled": true,
 *   "transactionHash": "0x...",
 *   "message": "Policy fulfilled and payout sent"
 * }
 * 
 * Response (if no signer - returns transaction data for frontend):
 * {
 *   "success": true,
 *   "policyId": 0,
 *   "fulfilled": true,
 *   "transaction": { ... },
 *   "message": "Use transaction data to call resolvePolicy via MetaMask"
 * }
 */
app.post('/api/policies/:policyId/claim', async (req, res) => {
  try {
    if (!flightInsuranceContract) {
      return res.status(503).json({ error: 'FlightInsurance contract not initialized' });
    }

    const policyId = Number(req.params.policyId);
    const { flightNumber, flightDate } = req.body;

    if (!flightNumber || !flightDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: flightNumber and flightDate' 
      });
    }

    // 1. Read policy from chain
    const policy = await flightInsuranceContract.policies(policyId);

    // Check if policy is active
    if (policy.status !== 0n) {
      return res.json({
        success: false,
        fulfilled: false,
        reason: policy.status === 1n ? "Policy already settled" : "Policy expired",
        status: Number(policy.status)
      });
    }

    // 2. Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (now > Number(policy.expirationTime)) {
      return res.json({
        success: false,
        fulfilled: false,
        reason: "Policy expired",
        expirationTime: Number(policy.expirationTime),
        currentTime: now
      });
    }

    // 3. Fetch flight delay data
    let flightDelayData;
    try {
      flightDelayData = await getFlightDelay(policyId, flightNumber, flightDate);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to fetch flight delay data', 
        details: error.message 
      });
    }

    // 4. Check if delay meets minimum threshold
    const minDelayMinutes = Number(policy.minDelayMinutes);
    if (flightDelayData.delayMinutes < minDelayMinutes) {
      return res.json({
        success: true,
        fulfilled: false,
        reason: "Flight delay not sufficient",
        delayMinutes: flightDelayData.delayMinutes,
        minDelayMinutes,
        message: `Flight delayed by ${flightDelayData.delayMinutes} minutes, but minimum is ${minDelayMinutes} minutes`
      });
    }

    // 5. Generate FDC proof
    // The FDC proof needs to encode the delay data as: VerifiedDelay { delayMinutes: uint256 }
    // The ABI signature for encoding: "VerifiedDelay(uint256)"
    
    let fdcProof;
    try {
      // Construct the API URL that FDC will verify
      // Note: In production, you may need to use a public API endpoint without the API key
      // or set up FDC to handle authenticated requests
      const fdcApiUrl = `https://api.aviationstack.com/v1/flights?flight_num=${flightNumber}&flight_date=${flightDate}&access_key=${AVIATIONSTACK_API_KEY}`;
      
      // The JSONPath should extract the delay value (in seconds from API)
      // FDC will then encode it according to the ABI signature
      // ABI signature for VerifiedDelay struct: "VerifiedDelay(uint256)"
      const delaySeconds = flightDelayData.delaySeconds || (flightDelayData.delayMinutes * 60);
      
      // Request FDC proof
      // Note: The actual FDC service will:
      // 1. Fetch the URL
      // 2. Extract the value using jsonPath
      // 3. Encode it according to the ABI signature
      // 4. Return the proof structure
      fdcProof = await requestFdcWeb2JsonProof({
        url: fdcApiUrl,
        jsonPath: "$.data[0].departure.delay", // Extract delay in seconds
        method: "GET"
      });
      
      // Note: The FDC proof's responseBody.abiEncodedData should contain:
      // abi.encode(VerifiedDelay(uint256), delayMinutes)
      // where delayMinutes is converted from seconds to minutes
      // This encoding should be done by the FDC service based on the ABI signature
      
    } catch (fdcError) {
      console.error('FDC proof generation error:', fdcError);
      // If FDC fails, we can still return eligibility but can't fulfill on-chain
      return res.json({
        success: false,
        fulfilled: false,
        reason: "Failed to generate FDC proof",
        delayMinutes: flightDelayData.delayMinutes,
        minDelayMinutes,
        message: "Flight is eligible but FDC proof generation failed. Please try again.",
        details: fdcError.message,
        note: "FDC proof generation requires proper Flare FDC setup. Check FLARE_FDC_URL environment variable."
      });
    }

    // 6. Call resolvePolicy on-chain
    if (signer) {
      // Backend has signer - can execute transaction directly
      try {
        const tx = await flightInsuranceContract.resolvePolicy(
          BigInt(policyId),
          fdcProof
        );
        
        const receipt = await tx.wait();
        
        res.json({
          success: true,
          fulfilled: true,
          policyId,
          delayMinutes: flightDelayData.delayMinutes,
          minDelayMinutes,
          transactionHash: receipt.hash,
          payout: policy.payout.toString(),
          message: "Policy fulfilled and payout sent successfully"
        });
      } catch (txError) {
        console.error('Transaction error:', txError);
        return res.status(500).json({
          error: 'Failed to execute resolvePolicy transaction',
          details: txError.message,
          delayMinutes: flightDelayData.delayMinutes,
          minDelayMinutes
        });
      }
    } else {
      // No signer - return transaction data for frontend to execute
      try {
        const gasEstimate = await flightInsuranceContract.resolvePolicy.estimateGas(
          BigInt(policyId),
          fdcProof
        );

        const feeData = await provider.getFeeData();
        const network = await provider.getNetwork();

        const transactionData = {
          to: FLIGHT_INSURANCE_ADDRESS,
          data: flightInsuranceContract.interface.encodeFunctionData('resolvePolicy', [
            policyId.toString(),
            fdcProof
          ]),
          gasLimit: gasEstimate.toString(),
          gasPrice: feeData.gasPrice?.toString() || '0',
          chainId: Number(network.chainId),
        };

        res.json({
          success: true,
          fulfilled: true,
          policyId,
          delayMinutes: flightDelayData.delayMinutes,
          minDelayMinutes,
          transaction: transactionData,
          proof: fdcProof,
          message: "Flight is eligible. Use transaction data to call resolvePolicy via MetaMask",
          instructions: "Send this transaction from the policy holder's wallet to fulfill the contract"
        });
      } catch (estimateError) {
        console.error('Gas estimation error:', estimateError);
        return res.status(500).json({
          error: 'Failed to estimate gas for resolvePolicy',
          details: estimateError.message,
          delayMinutes: flightDelayData.delayMinutes,
          minDelayMinutes
        });
      }
    }
  } catch (error) {
    console.error('Claim processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process claim', 
      details: error.message 
    });
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

