"""
AI Agent for flight risk analysis and premium calculation.
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


class PremiumOutputParser(BaseOutputParser):
    """Parse LLM output to extract premium amount."""
    
    def parse(self, text: str) -> Dict[str, Any]:
        """Parse LLM response to extract premium and risk metrics."""
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
                reasoning = data.get('reasoning', '')
                
                return {
                    'premium': premium,
                    'risk_score': risk_score,
                    'delay_probability': delay_probability,
                    'reasoning': reasoning
                }
        except:
            pass
        
        # Fallback: extract numbers from text
        import re
        numbers = re.findall(r'\d+\.?\d*', text)
        premium = float(numbers[0]) if numbers else 10.0
        risk_score = 0.5
        delay_probability = 0.3
        
        return {
            'premium': premium,
            'risk_score': risk_score,
            'delay_probability': delay_probability,
            'reasoning': text
        }


class FlightRiskAnalyzer:
    """
    AI Agent that analyzes flight risk and calculates insurance premiums.
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize the risk analyzer.
        
        Args:
            openai_api_key: OpenAI API key (if None, uses environment variable)
        """
        self.api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        
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
        
        # Create prompt template
        self.prompt = PromptTemplate(
            input_variables=["flight_number", "flight_date", "departure_airport", 
                           "arrival_airport", "historical_data"],
            template="""
You are an expert aviation risk analyst for a flight delay insurance dApp on Flare Network.

Analyze the following flight information and calculate an appropriate insurance premium in FLR (Flare token).

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
4. reasoning: Brief explanation of your analysis

Consider factors like:
- Historical delay rates for this route
- Airport congestion patterns
- Weather patterns for the date
- Aircraft type reliability
- Airline performance history

Respond ONLY with valid JSON in this format:
{{
    "premium": 25.5,
    "risk_score": 0.35,
    "delay_probability": 0.28,
    "reasoning": "Route has moderate delay history. Weather forecast is clear. Premium reflects standard risk."
}}
"""
        )
        
        if self.use_llm:
            self.chain = LLMChain(
                llm=self.llm,
                prompt=self.prompt,
                output_parser=PremiumOutputParser()
            )
    
    def fetch_historical_data(self, flight_number: str, flight_date: str, 
                            departure_airport: Optional[str] = None,
                            arrival_airport: Optional[str] = None) -> str:
        """
        Fetch historical flight data (placeholder for AviationStack API).
        
        Args:
            flight_number: Flight number
            flight_date: Flight date
            departure_airport: Departure airport code
            arrival_airport: Arrival airport code
            
        Returns:
            Formatted historical data string
        """
        # Placeholder: In production, integrate with AviationStack API
        # For now, return simulated data
        
        # Simulate historical delay rates based on flight number
        base_delay_rate = hash(flight_number) % 40 / 100  # 0-40% delay rate
        
        historical_data = f"""
Historical Analysis for {flight_number}:
- Average delay rate: {base_delay_rate:.1%}
- On-time performance: {1 - base_delay_rate:.1%}
- Typical delay duration: 15-45 minutes
- Route reliability: {'High' if base_delay_rate < 0.2 else 'Moderate' if base_delay_rate < 0.3 else 'Low'}
- Weather impact: Minimal for this route
- Airport congestion: {'Low' if departure_airport else 'Unknown'}
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
        Mock risk analysis when LLM is not available.
        
        Args:
            flight_number: Flight number
            flight_date: Flight date
            historical_data: Historical data context
            
        Returns:
            Mock analysis results
        """
        # Deterministic but varied premium based on flight number
        base_premium = 10.0 + (hash(flight_number) % 40)  # 10-50 FLR
        
        # Calculate risk metrics
        delay_probability = 0.2 + (hash(flight_number) % 30) / 100  # 0.2-0.5
        risk_score = delay_probability + (hash(flight_date) % 20) / 100  # Add date variation
        
        # Clamp values
        risk_score = min(1.0, max(0.0, risk_score))
        delay_probability = min(1.0, max(0.0, delay_probability))
        
        reasoning = f"Mock analysis: Flight {flight_number} shows {delay_probability:.1%} delay probability. Premium calculated based on historical patterns."
        
        return {
            'premium': base_premium,
            'risk_score': risk_score,
            'delay_probability': delay_probability,
            'reasoning': reasoning
        }

