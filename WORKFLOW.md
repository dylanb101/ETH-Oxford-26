# Flight Insurance Workflow

This document describes the complete workflow for the Flight Insurance application.

## Overview

The workflow consists of 4 main steps:
1. **Quote Generation** - User sends flight data, backend generates insurance quote
2. **Contract Creation** - User accepts quote, creates smart contract via MetaMask
3. **Claim Verification** - User clicks button, backend verifies flight delay with FDC
4. **Contract Fulfillment** - Backend either fulfills contract automatically or returns transaction data

## Step-by-Step Workflow

### Step 1: Generate Quote

**Endpoint:** `POST /api/quote`

**Request:**
```json
{
  "flightNumber": "BA297",
  "flightDate": "2024-12-25",
  "minDelayMinutes": 30,
  "payoutAmount": "100"
}
```

**Response:**
```json
{
  "success": true,
  "quote": {
    "flightNumber": "BA297",
    "flightDate": "2024-12-25",
    "premium": "8.50",
    "payout": "100.00",
    "minDelayMinutes": 30,
    "expirationTime": 1735689600,
    "expirationTimeReadable": "2024-12-26T00:00:00.000Z",
    "quoteId": "quote_1234567890"
  }
}
```

**Frontend Action:**
- Display quote to user
- Show premium, payout, and conditions
- Provide "Accept Quote" button

---

### Step 2: Create Contract (User Accepts Quote)

**Endpoint:** `POST /api/contract/create`

**Request:**
```json
{
  "premium": "8.50",
  "expirationTime": 1735689600,
  "minDelayMinutes": 30,
  "payoutAmount": "100.00",
  "merkleProof": [],
  "quoteId": "quote_1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "contractAddress": "0x...",
  "premium": "8.50",
  "payoutAmount": "100.00",
  "transaction": {
    "to": "0x...",
    "value": "8500000000000000000",
    "data": "0x...",
    "gasLimit": "200000",
    "gasPrice": "20000000000",
    "chainId": 114
  },
  "message": "Use the transaction object with MetaMask"
}
```

**Frontend Action:**
1. Display transaction data to user
2. Prompt user to connect MetaMask
3. Send transaction using `ethers` or MetaMask
4. Wait for transaction confirmation
5. Store `policyId` from transaction receipt

**MetaMask Transaction:**
```javascript
const tx = await signer.sendTransaction(transactionData);
const receipt = await tx.wait();
// Extract policyId from events or contract state
```

---

### Step 3: Claim Verification (User Clicks "Claim" Button)

**Endpoint:** `POST /api/policies/:policyId/claim`

**Request:**
```json
{
  "flightNumber": "BA297",
  "flightDate": "2024-12-25"
}
```

**Response (if backend has signer - auto-fulfill):**
```json
{
  "success": true,
  "fulfilled": true,
  "policyId": 0,
  "delayMinutes": 135,
  "minDelayMinutes": 30,
  "transactionHash": "0x...",
  "payout": "100000000000000000000",
  "message": "Policy fulfilled and payout sent successfully"
}
```

**Response (if no signer - returns transaction data):**
```json
{
  "success": true,
  "fulfilled": true,
  "policyId": 0,
  "delayMinutes": 135,
  "minDelayMinutes": 30,
  "transaction": {
    "to": "0x...",
    "data": "0x...",
    "gasLimit": "300000",
    "gasPrice": "20000000000",
    "chainId": 114
  },
  "proof": { ... },
  "message": "Flight is eligible. Use transaction data to call resolvePolicy via MetaMask"
}
```

**Response (if not eligible):**
```json
{
  "success": true,
  "fulfilled": false,
  "reason": "Flight delay not sufficient",
  "delayMinutes": 15,
  "minDelayMinutes": 30,
  "message": "Flight delayed by 15 minutes, but minimum is 30 minutes"
}
```

**Frontend Action:**
1. User clicks "Claim" or "Check Eligibility" button
2. Frontend calls this endpoint with policyId and flight info
3. If `fulfilled: true`:
   - If `transactionHash` exists: Show success message
   - If `transaction` exists: Prompt user to send transaction via MetaMask
4. If `fulfilled: false`: Show reason to user

---

## Complete Frontend Flow Example

```javascript
// Step 1: Get Quote
async function getQuote(flightNumber, flightDate) {
  const response = await fetch('http://localhost:5000/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flightNumber, flightDate })
  });
  return await response.json();
}

// Step 2: Create Contract (after user accepts quote)
async function createContract(quote, signer) {
  const response = await fetch('http://localhost:5000/api/contract/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      premium: quote.premium,
      expirationTime: quote.expirationTime,
      minDelayMinutes: quote.minDelayMinutes,
      payoutAmount: quote.payout,
      merkleProof: [],
      quoteId: quote.quoteId
    })
  });
  
  const data = await response.json();
  
  // Send transaction via MetaMask
  const tx = await signer.sendTransaction(data.transaction);
  const receipt = await tx.wait();
  
  // Extract policyId (you may need to parse events or call contract)
  return receipt;
}

// Step 3: Claim Policy
async function claimPolicy(policyId, flightNumber, flightDate, signer) {
  const response = await fetch(`http://localhost:5000/api/policies/${policyId}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flightNumber, flightDate })
  });
  
  const data = await response.json();
  
  if (data.fulfilled) {
    if (data.transactionHash) {
      // Backend fulfilled automatically
      console.log('Policy fulfilled!', data.transactionHash);
    } else if (data.transaction) {
      // User needs to send transaction
      const tx = await signer.sendTransaction(data.transaction);
      const receipt = await tx.wait();
      console.log('Policy fulfilled!', receipt.hash);
    }
  } else {
    console.log('Policy not eligible:', data.reason);
  }
  
  return data;
}
```

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Backend
PORT=5000
FLARE_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
FLIGHT_INSURANCE_ADDRESS=0x...
PRIVATE_KEY=0x...  # Optional: if set, backend can auto-fulfill contracts
AVIATIONSTACK_API_KEY=your_api_key
FLARE_FDC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
```

## Notes

1. **Quote Generation**: Premium calculation is simplified. In production, use ML/risk models.
2. **FDC Proof**: The FDC proof generation requires proper Flare FDC setup. The current implementation is a template.
3. **Policy ID**: After contract creation, you need to extract the policyId from the transaction. This can be done by:
   - Listening to `PolicyCreated` events
   - Calling `policyCount() - 1` after transaction confirms
4. **Auto-fulfillment**: If `PRIVATE_KEY` is set, the backend can automatically fulfill contracts. Otherwise, it returns transaction data for the frontend to send.

