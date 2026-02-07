import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import AviationStackClient from './aviationStackClient.js';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 5000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // React dev server
  credentials: true
}));
app.use(express.json());

// Initialize services
let aviationClient;

try {
  aviationClient = new AviationStackClient();
  console.log('AviationStack client initialized.');
} catch (error) {
  console.error('Failed to initialize AviationStack client:', error.message);
  console.warn('API endpoints will not work until AVIATION_API_KEY is set.');
  aviationClient = null;
}

// ============= API ROUTES =============

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Flare Insurance dApp backend is running!',
    version: '1.0.0'
  });
});

/**
 * Get available flight times for a flight number and date
 * Query params: flight_number, date (DD/MM/YYYY)
 */
app.get('/api/flights/times', async (req, res) => {
  if (!aviationClient) {
    return res.status(500).json({
      error: 'AVIATION_API_KEY environment variable is not set'
    });
  }

  try {
    const { flight_number, date } = req.query;
    
    if (!flight_number || !date) {
      return res.status(400).json({
        error: 'Missing required parameters: flight_number and date'
      });
    }

    const times = await aviationClient.getFlightTimes(flight_number, date);
    
    res.json({ times });
  } catch (error) {
    console.error('Error in /api/flights/times:', error);
    
    // Determine status code based on error type
    let statusCode = 500;
    if (error.message.includes('Invalid API key') || error.message.includes('401')) {
      statusCode = 401;
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      statusCode = 429;
    } else if (error.message.includes('Missing') || error.message.includes('required')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      error: 'Failed to fetch flight times',
      message: error.message
    });
  }
});

/**
 * Get full flight details for selected time
 * Query params: flight_number, date (DD/MM/YYYY), departure_time (HH:MM)
 */
app.get('/api/flights/details', async (req, res) => {
  if (!aviationClient) {
    return res.status(500).json({
      error: 'AVIATION_API_KEY environment variable is not set'
    });
  }

  try {
    const { flight_number, date, departure_time } = req.query;
    
    if (!flight_number || !date || !departure_time) {
      return res.status(400).json({
        error: 'Missing required parameters: flight_number, date, and departure_time'
      });
    }

    const details = await aviationClient.getFlightDetails(
      flight_number,
      date,
      departure_time
    );
    
    res.json(details);
  } catch (error) {
    console.error('Error in /api/flights/details:', error);
    
    // Determine status code based on error type
    let statusCode = 500;
    if (error.message.includes('Invalid API key') || error.message.includes('401')) {
      statusCode = 401;
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      statusCode = 429;
    } else if (error.message.includes('No flight found') || error.message.includes('Missing')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      error: 'Failed to fetch flight details',
      message: error.message
    });
  }
});

// ============= START SERVER =============

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  Flare Insurance dApp Backend (Express)   ║
║  Status: Running                           ║
║  Port: ${PORT}                                ║
║  Environment: ${isDevelopment ? 'Development' : 'Production'}              ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});
