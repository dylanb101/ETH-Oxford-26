# Flare Network Insurance dApp - FastAPI Backend

AI Agent Probability Engine for flight delay insurance on Flare Network.

## Features

- **AI-Powered Risk Analysis**: Uses LangChain with OpenAI to analyze flight risk and calculate premiums
- **EIP-712 Cryptographic Signing**: Cryptographically signs quotes for on-chain verification
- **Flare Network Integration**: Configured for Flare Coston2 Testnet (Chain ID: 114)
- **18-Decimal Precision**: Handles FLR token amounts with full precision

## Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
FASTAPI_ENV=development

# Required: Admin wallet private key for signing quotes
PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# Flare Network Configuration
FLARE_CHAIN_ID=114  # Coston2 testnet
DOMAIN_NAME=Flare Insurance dApp
DOMAIN_VERSION=1

# Optional: OpenAI API key for AI risk analysis (falls back to mock if not provided)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

4. Run the server:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

The server will run on `http://localhost:5000` by default.

## API Documentation

FastAPI automatically generates interactive API documentation:
- Swagger UI: `http://localhost:5000/docs`
- ReDoc: `http://localhost:5000/redoc`

## API Endpoints

### `POST /api/v1/quote`
Create an insurance quote for a flight.

**Request Body:**
```json
{
  "user_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  "flight_number": "AA123",
  "flight_date": "2024-12-25",
  "departure_airport": "JFK",
  "arrival_airport": "LAX"
}
```

**Response:**
```json
{
  "premium": "25000000000000000000",
  "deadline": 1735084800,
  "signature": "0x...",
  "flight_id": "0x...",
  "risk_score": 0.35,
  "delay_probability": 0.28,
  "message": "Route has moderate delay history..."
}
```

### `GET /api/v1/signer-address`
Get the address of the signing wallet (for verification).

### `GET /api/health`
Health check endpoint.

## Architecture

### File Structure
```
backend/
├── main.py              # FastAPI application and endpoints
├── schemas.py           # Pydantic models for validation
├── signing_utils.py    # EIP-712 signing utilities
├── ai_agent.py         # LangChain-based risk analysis
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

### Key Components

1. **AI Agent (`ai_agent.py`)**: 
   - Uses LangChain to create a risk analysis chain
   - Analyzes flight data and calculates premiums
   - Falls back to mock analysis if OpenAI API key is not provided

2. **Signing Utils (`signing_utils.py`)**:
   - Implements EIP-712 signing for quote verification
   - Handles FLR token precision (18 decimals)
   - Creates deterministic flight IDs

3. **Schemas (`schemas.py`)**:
   - Pydantic models for request/response validation
   - Validates Ethereum addresses and date formats

## Security Notes

- **Private Key**: Never commit your `.env` file or private key to version control
- **EIP-712**: Quotes are cryptographically signed to prevent tampering
- **Precision**: All premium amounts are handled in Wei (18 decimals) for accuracy

## Testing

Test the quote endpoint:
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

## Integration with Flare Smart Contract

The signed quote can be verified on-chain using EIP-712 signature verification. The smart contract should:
1. Recover the signer address from the signature
2. Verify it matches the expected admin address
3. Check the deadline has not passed
4. Verify the premium amount matches the signature

## Future Enhancements

- Integrate with AviationStack API for real flight data
- Add caching for risk analysis results
- Implement quote expiration and renewal
- Add support for multiple insurance tiers
- Implement rate limiting and authentication

