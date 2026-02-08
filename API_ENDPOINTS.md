# API Endpoints Reference

Complete reference for all backend API endpoints.

## Workflow Endpoints

### 1. Generate Quote
**POST** `/api/quote`

Generate an insurance quote based on flight data.

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

---

### 2. Create Contract
**POST** `/api/contract/create`

Create a smart contract and get transaction data for MetaMask.

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
  }
}
```

---

### 3. Claim Policy
**POST** `/api/policies/:policyId/claim`

Verify flight delay and fulfill contract (or return transaction data).

**Request:**
```json
{
  "flightNumber": "BA297",
  "flightDate": "2024-12-25"
}
```

**Response (Auto-fulfilled if backend has signer):**
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

**Response (Returns transaction data if no signer):**
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
  "message": "Flight is eligible. Use transaction data to call resolvePolicy via MetaMask"
}
```

**Response (Not eligible):**
```json
{
  "success": true,
  "fulfilled": false,
  "reason": "Flight delay not sufficient",
  "delayMinutes": 15,
  "minDelayMinutes": 30
}
```

---

## Utility Endpoints

### Check Policy Eligibility
**GET** `/api/policies/:policyId/eligibility?flightNumber=BA297&flightDate=2024-12-25`

Check if a policy is eligible for payout (off-chain check).

### Get Policy Info
**GET** `/api/contract/policy/:policyId`

Get policy details from the blockchain.

### Get Flight Info
**POST** `/api/flight/info`

Fetch flight information from AviationStack API.

### Generate FDC Proof
**POST** `/api/fdc/web2json/proof`

Generate an FDC Web2Json proof for any URL.

**Request:**
```json
{
  "url": "https://api.example.com/data",
  "jsonPath": "$.delayMinutes",
  "method": "GET"
}
```

---

## Health & Info Endpoints

- **GET** `/api/health` - Health check
- **GET** `/api/network` - Network information
- **GET** `/api/contract/info` - Contract information
- **GET** `/api/contract/policy-count` - Total policy count
- **GET** `/api/account/balance/:address` - Account balance
- **GET** `/api/signer/address` - Signer address (if configured)

