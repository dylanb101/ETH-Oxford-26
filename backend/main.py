"""
FastAPI main application for Flare Network Insurance dApp.
AI Agent Probability Engine with EIP-712 signing.
"""
import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import uvicorn

from schemas import (
    QuoteRequest, QuoteResponse, HealthResponse,
    ContractVerificationRequest, ContractVerificationResponse
)
from signing_utils import QuoteSigner
from ai_agent import FlightRiskAnalyzer
from aviation_api import AviationStackClient


# Load environment variables
load_dotenv()

# Configuration
PORT = int(os.getenv('PORT', 5000))
DEBUG = os.getenv('FASTAPI_ENV') == 'development'
PRIVATE_KEY = os.getenv('PRIVATE_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Validate required environment variables
if not PRIVATE_KEY:
    raise ValueError("PRIVATE_KEY environment variable is required")


# Initialize services
quote_signer = None
risk_analyzer = None
aviation_client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    global quote_signer, risk_analyzer, aviation_client
    
    # Startup
    print("Initializing Flare Insurance dApp backend...")
    
    # Initialize quote signer
    chain_id = int(os.getenv('FLARE_CHAIN_ID', 114))  # Coston2 default
    quote_signer = QuoteSigner(
        private_key=PRIVATE_KEY,
        domain_name=os.getenv('DOMAIN_NAME', 'Flare Insurance dApp'),
        version=os.getenv('DOMAIN_VERSION', '1'),
        chain_id=chain_id
    )
    print(f"Quote signer initialized. Signer address: {quote_signer.get_signer_address()}")
    
    # Initialize AI risk analyzer (actuary)
    risk_analyzer = FlightRiskAnalyzer(openai_api_key=OPENAI_API_KEY)
    print("AI Actuary (Risk Analyzer) initialized.")
    
    # Initialize AviationStack client
    aviation_client = AviationStackClient()
    print("AviationStack client initialized.")
    
    yield
    
    # Shutdown
    print("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Flare Insurance dApp API",
    description="AI Agent Probability Engine for Flare Network flight insurance",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_quote_signer() -> QuoteSigner:
    """Dependency to get quote signer."""
    if quote_signer is None:
        raise HTTPException(status_code=503, detail="Quote signer not initialized")
    return quote_signer


def get_risk_analyzer() -> FlightRiskAnalyzer:
    """Dependency to get risk analyzer."""
    if risk_analyzer is None:
        raise HTTPException(status_code=503, detail="Risk analyzer not initialized")
    return risk_analyzer


def get_aviation_client() -> AviationStackClient:
    """Dependency to get aviation client."""
    if aviation_client is None:
        raise HTTPException(status_code=503, detail="Aviation client not initialized")
    return aviation_client


@app.get('/api/health', response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status='healthy',
        message='Flare Insurance dApp backend is running!',
        version="1.0.0"
    )


@app.post('/api/v1/quote', response_model=QuoteResponse)
async def create_quote(
    request: QuoteRequest,
    signer: QuoteSigner = Depends(get_quote_signer),
    analyzer: FlightRiskAnalyzer = Depends(get_risk_analyzer)
):
    """
    Create an insurance quote for a flight.
    
    This endpoint:
    1. Analyzes flight risk using AI agent
    2. Calculates premium in FLR
    3. Generates EIP-712 signature for on-chain verification
    """
    try:
        # Step 1: Analyze risk using AI agent
        risk_analysis = analyzer.analyze_risk(
            flight_number=request.flight_number,
            flight_date=request.flight_date,
            departure_airport=request.departure_airport,
            arrival_airport=request.arrival_airport
        )
        
        premium_flr = risk_analysis['premium']
        risk_score = risk_analysis['risk_score']
        delay_probability = risk_analysis['delay_probability']
        delay_threshold_minutes = risk_analysis.get('delay_threshold_minutes', 30)
        payout_multiplier = risk_analysis.get('payout_multiplier', 1.5)
        reasoning = risk_analysis.get('reasoning', '')
        
        # Step 2: Convert premium to Wei (18 decimals)
        premium_wei = signer.flr_to_wei(premium_flr)
        
        # Step 3: Create flight ID
        flight_id = signer.create_flight_id(
            flight_number=request.flight_number,
            flight_date=request.flight_date,
            user_address=request.user_address
        )
        
        # Step 4: Calculate deadline (24 hours from now)
        deadline = signer.calculate_deadline(hours=24)
        
        # Step 5: Sign the quote using EIP-712
        signature = signer.sign_quote(
            user_address=request.user_address,
            flight_id=flight_id,
            premium_amount_wei=premium_wei,
            deadline=deadline
        )
        
        # Step 6: Return quote response with contract conditions
        return QuoteResponse(
            premium=signer.wei_to_flr(premium_wei),  # Return as string for precision
            deadline=deadline,
            signature=signature,
            flight_id=flight_id,
            risk_score=risk_score,
            delay_probability=delay_probability,
            delay_threshold_minutes=delay_threshold_minutes,
            payout_multiplier=payout_multiplier,
            message=reasoning
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error creating quote: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get('/api/v1/signer-address')
async def get_signer_address(signer: QuoteSigner = Depends(get_quote_signer)):
    """Get the address of the signing wallet (for verification purposes)."""
    return {
        "signer_address": signer.get_signer_address(),
        "chain_id": signer.chain_id
    }


@app.post('/api/v1/verify-contract', response_model=ContractVerificationResponse)
async def verify_contract(
    request: ContractVerificationRequest,
    client: AviationStackClient = Depends(get_aviation_client)
):
    """
    Verify if insurance contract conditions are met using AviationStack API.
    This endpoint checks flight status and determines if payout is eligible.
    """
    try:
        # Get flight status from AviationStack
        flight_data = client.get_flight_status(
            request.flight_number,
            request.flight_date
        )
        
        # Get contract conditions (we need to fetch from blockchain or store them)
        # For now, we'll use a default threshold - in production, fetch from contract
        delay_threshold_minutes = 30  # Default, should be fetched from contract
        
        # Check contract conditions
        condition_check = client.check_contract_conditions(
            flight_data,
            delay_threshold_minutes
        )
        
        # Calculate payout amount if eligible
        payout_amount = None
        if condition_check['payout_eligible']:
            # In production, fetch premium from contract and calculate payout
            # For now, return indication that payout is eligible
            payout_amount = "0"  # Should be calculated from contract data
        
        return ContractVerificationResponse(
            condition_met=condition_check['condition_met'],
            delay_minutes=condition_check['delay_minutes'],
            threshold_minutes=condition_check['threshold_minutes'],
            payout_eligible=condition_check['payout_eligible'],
            flight_status=condition_check['flight_status'],
            payout_amount=payout_amount
        )
        
    except Exception as e:
        print(f"Error verifying contract: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == '__main__':
    uvicorn.run(
        "main:app",
        host='0.0.0.0',
        port=PORT,
        reload=DEBUG
    )

