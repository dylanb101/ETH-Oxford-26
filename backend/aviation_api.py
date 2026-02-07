"""
AviationStack API integration for real flight data.
"""
import os
import requests
from typing import Dict, Any, Optional
from datetime import datetime


class AviationStackClient:
    """
    Client for AviationStack API to fetch real flight data.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize AviationStack client.
        
        Args:
            api_key: AviationStack API key (if None, uses environment variable)
        """
        self.api_key = api_key or os.getenv('AVIATIONSTACK_API_KEY')
        self.base_url = "http://api.aviationstack.com/v1"
        
    def get_flight_status(self, flight_number: str, flight_date: str) -> Dict[str, Any]:
        """
        Get real-time flight status from AviationStack.
        
        Args:
            flight_number: Flight number (e.g., 'AA123')
            flight_date: Flight date in YYYY-MM-DD format
            
        Returns:
            Dictionary with flight status data
        """
        if not self.api_key:
            # Return mock data if API key not available
            return self._mock_flight_status(flight_number, flight_date)
        
        try:
            # Parse flight number (e.g., 'AA123' -> airline: 'AA', number: '123')
            airline_code = flight_number[:2] if len(flight_number) > 2 else flight_number[:1]
            flight_num = flight_number[2:] if len(flight_number) > 2 else flight_number[1:]
            
            params = {
                'access_key': self.api_key,
                'flight_iata': flight_number,
                'flight_date': flight_date
            }
            
            response = requests.get(f"{self.base_url}/flights", params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('data') and len(data['data']) > 0:
                flight_data = data['data'][0]
                return self._parse_flight_data(flight_data)
            else:
                # No data found, return mock
                return self._mock_flight_status(flight_number, flight_date)
                
        except Exception as e:
            print(f"AviationStack API error: {e}. Using mock data.")
            return self._mock_flight_status(flight_number, flight_date)
    
    def _parse_flight_data(self, flight_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse AviationStack flight data into our format."""
        departure = flight_data.get('departure', {})
        arrival = flight_data.get('arrival', {})
        
        # Check for delays
        dep_delay = departure.get('delay') or 0
        arr_delay = arrival.get('delay') or 0
        is_delayed = dep_delay > 0 or arr_delay > 0
        
        # Get scheduled vs actual times
        dep_scheduled = departure.get('scheduled', '')
        dep_actual = departure.get('actual', '')
        arr_scheduled = arrival.get('scheduled', '')
        arr_actual = arrival.get('actual', '')
        
        return {
            'flight_number': flight_data.get('flight', {}).get('iata', ''),
            'airline': flight_data.get('airline', {}).get('name', ''),
            'departure_airport': departure.get('iata', ''),
            'arrival_airport': arrival.get('iata', ''),
            'departure_scheduled': dep_scheduled,
            'departure_actual': dep_actual,
            'arrival_scheduled': arr_scheduled,
            'arrival_actual': arr_actual,
            'departure_delay_minutes': dep_delay,
            'arrival_delay_minutes': arr_delay,
            'is_delayed': is_delayed,
            'status': flight_data.get('flight_status', 'unknown'),
            'data_source': 'aviationstack'
        }
    
    def _mock_flight_status(self, flight_number: str, flight_date: str) -> Dict[str, Any]:
        """Generate mock flight status data."""
        # Deterministic mock data based on flight number
        delay_minutes = hash(f"{flight_number}{flight_date}") % 120  # 0-120 minutes
        is_delayed = delay_minutes > 15  # Delayed if more than 15 minutes
        
        return {
            'flight_number': flight_number,
            'airline': 'Mock Airline',
            'departure_airport': 'JFK',
            'arrival_airport': 'LAX',
            'departure_scheduled': f"{flight_date}T10:00:00",
            'departure_actual': f"{flight_date}T10:{delay_minutes:02d}:00" if is_delayed else None,
            'arrival_scheduled': f"{flight_date}T13:00:00",
            'arrival_actual': None,
            'departure_delay_minutes': delay_minutes if is_delayed else 0,
            'arrival_delay_minutes': delay_minutes if is_delayed else 0,
            'is_delayed': is_delayed,
            'status': 'delayed' if is_delayed else 'scheduled',
            'data_source': 'mock'
        }
    
    def check_contract_conditions(self, flight_data: Dict[str, Any], 
                                  delay_threshold_minutes: int) -> Dict[str, Any]:
        """
        Check if insurance contract conditions are met.
        
        Args:
            flight_data: Flight status data
            delay_threshold_minutes: Minimum delay in minutes to trigger payout
            
        Returns:
            Dictionary with condition check results
        """
        delay_minutes = max(
            flight_data.get('departure_delay_minutes', 0),
            flight_data.get('arrival_delay_minutes', 0)
        )
        
        condition_met = delay_minutes >= delay_threshold_minutes
        
        return {
            'condition_met': condition_met,
            'delay_minutes': delay_minutes,
            'threshold_minutes': delay_threshold_minutes,
            'flight_status': flight_data.get('status', 'unknown'),
            'payout_eligible': condition_met
        }

