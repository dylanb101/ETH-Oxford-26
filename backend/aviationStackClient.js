import axios from 'axios';

class AviationStackClient {
  constructor() {
    this.apiKey = process.env.AVIATION_API_KEY;
    if (!this.apiKey) {
      throw new Error('AVIATION_API_KEY environment variable is required');
    }
    this.baseUrl = 'http://api.aviationstack.com/v1';
  }

  /**
   * Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
   */
  _convertDateFormat(dateStr) {
    const normalized = dateStr.replace(/\//g, '-');
    const parts = normalized.split('-');
    if (parts.length === 3) {
      // Check if already in YYYY-MM-DD format (first part is 4 digits)
      if (parts[0].length === 4) {
        return dateStr; // Already in correct format
      }
      // Convert DD-MM-YYYY to YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  }

  /**
   * Extract HH:MM time from ISO datetime string
   */
  _extractTime(datetimeStr) {
    if (!datetimeStr) return 'N/A';
    try {
      const date = new Date(datetimeStr);
      return date.toTimeString().slice(0, 5); // HH:MM
    } catch {
      return 'N/A';
    }
  }

  /**
   * Get available flight times for a specific flight number and date
   * 
   * @param {string} flightNumber - e.g., "BA297"
   * @param {string} date - in DD/MM/YYYY or DD-MM-YYYY format
   * @returns {Promise<Array>} List of flight times
   */
  async getFlightTimes(flightNumber, date) {
    const apiDate = this._convertDateFormat(date);
    
    try {
      const response = await axios.get(`${this.baseUrl}/flights`, {
        params: {
          access_key: this.apiKey,
          flight_iata: flightNumber.toUpperCase(),
          flight_date: apiDate
        },
        timeout: 10000
      });

      // Check for API errors in response
      if (response.data.error) {
        const errorInfo = response.data.error;
        throw new Error(`AviationStack API error: ${errorInfo.info || 'Unknown error'}`);
      }

      const flights = response.data.data || [];
      
      if (flights.length === 0) {
        return [];
      }
      
      return flights.map(flight => ({
        departure_time: this._extractTime(flight.departure?.scheduled),
        arrival_time: this._extractTime(flight.arrival?.scheduled),
        route: `${flight.departure?.airport || ''} → ${flight.arrival?.airport || ''}`,
        flight_data: flight // Store full data for getFlightDetails
      }));
    } catch (error) {
      console.error('Error fetching flight times:', error.message);
      if (error.response) {
        // HTTP error response
        if (error.response.status === 401) {
          throw new Error('Invalid API key');
        } else if (error.response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (error.response.status >= 500) {
          throw new Error('Flight API service is temporarily unavailable. Please try again later.');
        }
        throw new Error(`API error: ${error.response.status}`);
      }
      throw new Error(`Failed to fetch flight times: ${error.message}`);
    }
  }

  /**
   * Get detailed flight information for a specific flight
   * 
   * @param {string} flightNumber - e.g., "BA297"
   * @param {string} date - in DD/MM/YYYY format
   * @param {string} departureTime - e.g., "08:00"
   * @returns {Promise<Object>} Flight details
   */
  async getFlightDetails(flightNumber, date, departureTime) {
    // First get all flights for that day
    const flightTimes = await this.getFlightTimes(flightNumber, date);
    
    // Find the specific flight matching the departure time
    const selectedFlight = flightTimes.find(
      flight => flight.departure_time === departureTime
    );
    
    if (!selectedFlight) {
      throw new Error(`No flight found for ${flightNumber} at ${departureTime}`);
    }

    const flight = selectedFlight.flight_data;
    
    // Extract aircraft name (prefer name, fallback to iata or registration)
    const aircraftData = flight.aircraft || {};
    const aircraftName = aircraftData.name || 
                         aircraftData.iata || 
                         aircraftData.registration || 
                         'N/A';
    
    return {
      from_location: flight.departure?.airport || '',
      to_location: flight.arrival?.airport || '',
      date: date, // Keep original format
      departure_time: this._extractTime(flight.departure?.scheduled),
      arrival_time: this._extractTime(flight.arrival?.scheduled),
      airline: flight.airline?.name || '',
      aircraft: aircraftName
    };
  }
}

export default AviationStackClient;
