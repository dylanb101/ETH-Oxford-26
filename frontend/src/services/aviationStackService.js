import axios from 'axios';

const AVIATION_API_KEY = process.env.REACT_APP_AVIATIONSTACK_API_KEY || process.env.REACT_APP_AVIATION_API_KEY;

/**
 * Fetches flight data from AviationStack API
 * @param {string} flightNumber - Flight IATA code (e.g., "BA297")
 * @param {string} flightDate - Flight date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of flight objects from API response
 */
export async function fetchFlightData(flightNumber, flightDate) {
  // Validate flight number format (e.g., "BA297", "AA100")
  const cleanFlightNumber = flightNumber.toUpperCase().trim();
  const match = cleanFlightNumber.match(/^([A-Z]{2})(\d+)$/);
  if (!match) {
    throw new Error('Invalid flight number format. Use format like BA297 or AA100');
  }
  
  // Format date as YYYY-MM-DD for API
  const formattedDate = flightDate ? new Date(flightDate).toISOString().split('T')[0] : null;
  
  // Validate date is not in the past
  if (formattedDate) {
    const today = new Date().toISOString().split('T')[0];
    if (formattedDate < today) {
      throw new Error('Flight date cannot be in the past');
    }
  }
  
  const API_URL = `https://api.aviationstack.com/v1/flights`;
  
  try {
    const params = {
      access_key: AVIATION_API_KEY,
      flight_iata: cleanFlightNumber,
    };
    
    // Add flight_date parameter if provided
    if (formattedDate) {
      params.flight_date = formattedDate;
    }
    
    const response = await axios.get(API_URL, { params });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data; // Return all matching flights
    }
    throw new Error('Flight not found');
  } catch (error) {
    console.error('AviationStack API error:', error);
    
    // If API key is missing or API fails, return mock data for development/testing
    if (!AVIATION_API_KEY || AVIATION_API_KEY === 'YOUR_API_KEY_HERE' || error.response?.status === 401) {
      console.warn('Using mock flight data. Please set REACT_APP_AVIATIONSTACK_API_KEY environment variable for production.');
      return getMockFlightData(cleanFlightNumber, formattedDate, match);
    }
    
    // Re-throw API errors
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Flight API service is temporarily unavailable. Please try again later.');
    }
    
    throw new Error(error.message || 'Failed to fetch flight data. Please check the flight number and date and try again.');
  }
}

/**
 * Parses raw API response into structured flight data
 * @param {Array} apiFlights - Array of flight objects from API
 * @returns {Array} Array of parsed flight objects
 */
export function parseFlightData(apiFlights) {
  if (!apiFlights || apiFlights.length === 0) {
    return [];
  }
  
  return apiFlights.map(flight => {
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
    };
  });
}

/**
 * Generates mock flight data for development/testing
 * @param {string} cleanFlightNumber - Cleaned flight number
 * @param {string} formattedDate - Formatted date string
 * @param {Array} match - Regex match result
 * @returns {Array} Mock flight data
 */
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
  
  // Return mock data - simulate multiple flights if date is provided
  if (formattedDate) {
    const date1 = new Date(baseDate);
    date1.setHours(8, 0, 0, 0);
    const arr1 = new Date(date1);
    arr1.setHours(16, 0, 0, 0);
    
    const date2 = new Date(baseDate);
    date2.setHours(14, 30, 0, 0);
    const arr2 = new Date(date2);
    arr2.setHours(22, 45, 0, 0);
    
    return [
      {
        flight: {
          iata: cleanFlightNumber,
          number: flightNum,
        },
        airline: {
          name: airlineNames[airlineCode] || 'Airline',
          iata: airlineCode,
        },
        departure: {
          airport: 'London Heathrow',
          iata: 'LHR',
          scheduled: date1.toISOString(),
        },
        arrival: {
          airport: 'New York JFK',
          iata: 'JFK',
          scheduled: arr1.toISOString(),
        },
        aircraft: {
          name: 'Boeing 777',
          iata: 'B777',
        },
        flight_date: formattedDate,
      },
      {
        flight: {
          iata: cleanFlightNumber,
          number: flightNum,
        },
        airline: {
          name: airlineNames[airlineCode] || 'Airline',
          iata: airlineCode,
        },
        departure: {
          airport: 'London Heathrow',
          iata: 'LHR',
          scheduled: date2.toISOString(),
        },
        arrival: {
          airport: 'New York JFK',
          iata: 'JFK',
          scheduled: arr2.toISOString(),
        },
        aircraft: {
          name: 'Boeing 777',
          iata: 'B777',
        },
        flight_date: formattedDate,
      },
    ];
  }
  
  // Single flight if no date provided
  return [{
    flight: {
      iata: cleanFlightNumber,
      number: flightNum,
    },
    airline: {
      name: airlineNames[airlineCode] || 'Airline',
      iata: airlineCode,
    },
    departure: {
      airport: 'London Heathrow',
      iata: 'LHR',
      scheduled: baseDate.toISOString(),
    },
    arrival: {
      airport: 'New York JFK',
      iata: 'JFK',
      scheduled: new Date(baseDate.getTime() + 8 * 60 * 60 * 1000).toISOString(),
    },
    aircraft: {
      name: 'Boeing 777',
      iata: 'B777',
    },
    flight_date: baseDate.toISOString().split('T')[0],
  }];
}
