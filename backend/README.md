# Express.js Backend

## Setup

1. Install Node.js (v16 or higher recommended)

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
NODE_ENV=development
AVIATION_API_KEY=your_aviationstack_api_key_here
PRIVATE_KEY=your_wallet_private_key_here
OPENAI_API_KEY=your_openai_api_key_here
FLARE_CHAIN_ID=114
```

4. Run the server:
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000` by default.

## API Endpoints

### Health & Status
- `GET /api/health` - Health check endpoint
  - Returns: `{ "status": "healthy", "message": "Flare Insurance dApp backend is running!", "version": "1.0.0" }`

### Flight Data (AviationStack Integration)
- `GET /api/flights/times?flight_number=BA297&date=18/02/2026` - Get available flight times
  - Query Parameters:
    - `flight_number` (required): Flight IATA code (e.g., "BA297")
    - `date` (required): Date in DD/MM/YYYY or DD-MM-YYYY format
  - Returns: `{ "times": [{ "departure_time": "08:00", "arrival_time": "16:00", "route": "London Heathrow → New York JFK", "flight_data": {...} }] }`
  
- `GET /api/flights/details?flight_number=BA297&date=18/02/2026&departure_time=08:00` - Get full flight details
  - Query Parameters:
    - `flight_number` (required): Flight IATA code (e.g., "BA297")
    - `date` (required): Date in DD/MM/YYYY or DD-MM-YYYY format
    - `departure_time` (required): Departure time in HH:MM format (e.g., "08:00")
  - Returns: `{ "from_location": "London Heathrow", "to_location": "New York JFK", "date": "18/02/2026", "departure_time": "08:00", "arrival_time": "16:00", "airline": "British Airways", "aircraft": "Boeing 777" }`

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid API key)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

## Features

- Express.js REST API
- CORS middleware for React frontend integration
- Environment variable configuration with dotenv
- AviationStack API integration for flight data
- Comprehensive error handling
- Graceful shutdown handling

## Development

- Uses `nodemon` for auto-reload during development
- ES6 modules (`type: "module"` in package.json)
- Async/await support throughout

## Dependencies

- `express` - Web framework
- `cors` - CORS middleware
- `dotenv` - Environment variable management
- `axios` - HTTP client for external API calls
- `ethers` - Ethereum/Flare blockchain integration
- `nodemon` - Development auto-reload tool
