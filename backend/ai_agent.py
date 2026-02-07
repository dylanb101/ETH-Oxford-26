"""
AI Agent for flight risk analysis and premium calculation.
Acts as an actuary to determine premiums and contract conditions.
"""
import os
from typing import Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import BaseOutputParser
from decimal import Decimal
import json
import random
from datetime import datetime
from aviation_api import AviationStackClient


class ActuaryOutputParser(BaseOutputParser):
    """Parse LLM output to extract premium and contract conditions."""
    
    def parse(self, text: str) -> Dict[str, Any]:
        """Parse LLM response to extract premium, risk metrics, and contract conditions."""
        try:
            # Try to parse as JSON first
            if '{' in text:
                # Extract JSON from text
                start = text.find('{')
                end = text.rfind('}') + 1
                json_str = text[start:end]
                data = json.loads(json_str)
                
                premium = float(data.get('premium', 0))
                risk_score = float(data.get('risk_score', 0.5))
                delay_probability = float(data.get('delay_probability', 0.3))
                delay_threshold_minutes = int(data.get('delay_threshold_minutes', 30))
                payout_multiplier = float(data.get('payout_multiplier', 1.5))
                reasoning = data.get('reasoning', '')
                
                return {
                    'premium': premium,
                    'risk_score': risk_score,
                    'delay_probability': delay_probability,
                    'delay_threshold_minutes': delay_threshold_minutes,
                    'payout_multiplier': payout_multiplier,
                    'reasoning': reasoning
                }
        except Exception as e:
            print(f"Error parsing LLM output: {e}")
        
        # Fallback: extract numbers from text
        import re
        numbers = re.findall(r'\d+\.?\d*', text)
        premium = float(numbers[0]) if numbers else 10.0
        risk_score = 0.5
        delay_probability = 0.3
        delay_threshold_minutes = 30
        payout_multiplier = 1.5
        
        return {
            'premium': premium,
            'risk_score': risk_score,
            'delay_probability': delay_probability,
            'delay_threshold_minutes': delay_threshold_minutes,
            'payout_multiplier': payout_multiplier,
            'reasoning': text
        }


class FlightRiskAnalyzer:
    """
    AI Agent that analyzes flight risk and calculates insurance premiums.
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize the risk analyzer (actuary).
        
        Args:
            openai_api_key: OpenAI API key (if None, uses environment variable)
        """
        self.api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        self.aviation_client = AviationStackClient()
        
        # Initialize LLM (use OpenAI if available, otherwise use mock)
        if self.api_key:
            try:
                self.llm = ChatOpenAI(
                    temperature=0.3,
                    openai_api_key=self.api_key,
                    model="gpt-3.5-turbo"
                )
                self.use_llm = True
            except Exception as e:
                print(f"Warning: Failed to initialize OpenAI. Using mock risk analysis. Error: {e}")
                self.llm = None
                self.use_llm = False
        else:
            self.llm = None
            self.use_llm = False
            print("Warning: OPENAI_API_KEY not set. Using mock risk analysis.")
        
        # Create prompt template for actuary analysis
        self.prompt = PromptTemplate(
            input_variables=["flight_number", "flight_date", "departure_airport", 
                           "arrival_airport", "historical_data"],
            template="""
You are an expert actuary for a flight delay insurance dApp on Flare Network. Your role is to:
1. Calculate appropriate insurance premiums based on risk analysis
2. Determine contract conditions (delay thresholds, payout terms)

Analyze the following flight information:

Flight Details:
- Flight Number: {flight_number}
- Date: {flight_date}
- Departure: {departure_airport}
- Arrival: {arrival_airport}

Historical Data Context:
{historical_data}

Based on this information, provide a JSON response with:
1. premium: The insurance premium in FLR (typically 5-50 FLR for domestic, 10-100 FLR for international)
2. risk_score: A risk score from 0.0 (low risk) to 1.0 (high risk)
3. delay_probability: Estimated probability of delay (0.0 to 1.0)
4. delay_threshold_minutes: Minimum delay in minutes required to trigger payout (typically 15-60 minutes)
5. payout_multiplier: Multiplier for payout amount (e.g., 1.5 means 1.5x premium payout, typically 1.0-3.0)
6. reasoning: Brief explanation of your actuarial analysis

Consider factors like:
- Historical delay rates for this route
- Airport congestion patterns
- Weather patterns for the date
- Aircraft type reliability
- Airline performance history
- Typical delay durations when delays occur

The delay_threshold_minutes should be set based on:
- Higher risk routes: Lower threshold (15-30 min) to be more competitive
- Lower risk routes: Higher threshold (30-60 min) to reduce payout frequency
- Industry standard is typically 30-45 minutes

Respond ONLY with valid JSON in this format:
{{
    "premium": 25.5,
    "risk_score": 0.35,
    "delay_probability": 0.28,
    "delay_threshold_minutes": 30,
    "payout_multiplier": 1.5,
    "reasoning": "Route has moderate delay history (28% probability). Setting 30-minute threshold balances competitiveness with risk. Premium reflects standard actuarial pricing."
}}
"""
        )
        
        if self.use_llm:
            self.chain = LLMChain(
                llm=self.llm,
                prompt=self.prompt,
                output_parser=ActuaryOutputParser()
            )
    
    def fetch_historical_data(self, flight_number: str, flight_date: str, 
                            departure_airport: Optional[str] = None,
                            arrival_airport: Optional[str] = None) -> str:
        """
        Fetch historical flight data using AviationStack API.
        
        Args:
            flight_number: Flight number
            flight_date: Flight date
            departure_airport: Departure airport code
            arrival_airport: Arrival airport code
            
        Returns:
            Formatted historical data string
        """
        # Try to fetch real data from AviationStack
        try:
            flight_data = self.aviation_client.get_flight_status(flight_number, flight_date)
            
            if flight_data.get('data_source') == 'aviationstack':
                # Real data from API
                delay_min = flight_data.get('departure_delay_minutes', 0)
                status = flight_data.get('status', 'unknown')
                
                historical_data = f"""
Real-time Flight Data from AviationStack for {flight_number}:
- Current Status: {status}
- Departure Delay: {delay_min} minutes
- Departure Airport: {flight_data.get('departure_airport', 'Unknown')}
- Arrival Airport: {flight_data.get('arrival_airport', 'Unknown')}
- Airline: {flight_data.get('airline', 'Unknown')}
- Scheduled Departure: {flight_data.get('departure_scheduled', 'Unknown')}
- Actual Departure: {flight_data.get('departure_actual', 'Not yet departed')}
"""
            else:
                # Mock data fallback
                base_delay_rate = hash(flight_number) % 40 / 100
                historical_data = f"""
Historical Analysis for {flight_number} (Simulated):
- Average delay rate: {base_delay_rate:.1%}
- On-time performance: {1 - base_delay_rate:.1%}
- Typical delay duration: 15-45 minutes
- Route reliability: {'High' if base_delay_rate < 0.2 else 'Moderate' if base_delay_rate < 0.3 else 'Low'}
"""
        except Exception as e:
            # Fallback to simulated data
            base_delay_rate = hash(flight_number) % 40 / 100
            historical_data = f"""
Historical Analysis for {flight_number} (Simulated):
- Average delay rate: {base_delay_rate:.1%}
- On-time performance: {1 - base_delay_rate:.1%}
- Typical delay duration: 15-45 minutes
- Route reliability: {'High' if base_delay_rate < 0.2 else 'Moderate' if base_delay_rate < 0.3 else 'Low'}
- Note: Using simulated data (AviationStack API unavailable)
"""
        
        return historical_data
    
    def analyze_risk(self, flight_number: str, flight_date: str,
                    departure_airport: Optional[str] = None,
                    arrival_airport: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze flight risk and calculate premium.
        
        Args:
            flight_number: Flight number
            flight_date: Flight date
            departure_airport: Departure airport code
            arrival_airport: Arrival airport code
            
        Returns:
            Dictionary with premium, risk_score, delay_probability, and reasoning
        """
        # Fetch historical data
        historical_data = self.fetch_historical_data(
            flight_number, flight_date, departure_airport, arrival_airport
        )
        
        if self.use_llm:
            # Use LLM for analysis
            try:
                result = self.chain.run(
                    flight_number=flight_number,
                    flight_date=flight_date,
                    departure_airport=departure_airport or "Unknown",
                    arrival_airport=arrival_airport or "Unknown",
                    historical_data=historical_data
                )
                return result
            except Exception as e:
                print(f"LLM analysis failed: {e}. Falling back to mock analysis.")
                return self._mock_analysis(flight_number, flight_date, historical_data)
        else:
            # Use mock analysis
            return self._mock_analysis(flight_number, flight_date, historical_data)
    
    def _mock_analysis(self, flight_number: str, flight_date: str, 
                      historical_data: str) -> Dict[str, Any]:
        """
        Mock actuarial analysis when LLM is not available.
        
        Args:
            flight_number: Flight number
            flight_date: Flight date
            historical_data: Historical data context
            
        Returns:
            Mock analysis results with contract conditions
        """
        # Deterministic but varied premium based on flight number
        base_premium = 10.0 + (hash(flight_number) % 40)  # 10-50 FLR
        
        # Calculate risk metrics
        delay_probability = 0.2 + (hash(flight_number) % 30) / 100  # 0.2-0.5
        risk_score = delay_probability + (hash(flight_date) % 20) / 100  # Add date variation
        
        # Determine delay threshold based on risk
        # Higher risk = lower threshold (more competitive)
        # Lower risk = higher threshold (reduce payouts)
        if delay_probability > 0.4:
            delay_threshold_minutes = 15  # High risk, competitive threshold
        elif delay_probability > 0.3:
            delay_threshold_minutes = 30  # Moderate risk, standard threshold
        else:
            delay_threshold_minutes = 45  # Low risk, higher threshold
        
        # Payout multiplier based on risk (higher risk = higher multiplier)
        payout_multiplier = 1.0 + (delay_probability * 1.5)  # 1.0 to 2.5x
        
        # Clamp values
        risk_score = min(1.0, max(0.0, risk_score))
        delay_probability = min(1.0, max(0.0, delay_probability))
        payout_multiplier = min(3.0, max(1.0, payout_multiplier))
        
        reasoning = f"Mock actuarial analysis: Flight {flight_number} shows {delay_probability:.1%} delay probability. Premium: {base_premium} FLR. Contract triggers payout if delay ≥ {delay_threshold_minutes} minutes. Payout: {payout_multiplier:.1f}x premium."
        
        return {
            'premium': base_premium,
            'risk_score': risk_score,
            'delay_probability': delay_probability,
            'delay_threshold_minutes': delay_threshold_minutes,
            'payout_multiplier': payout_multiplier,
            'reasoning': reasoning
        }

