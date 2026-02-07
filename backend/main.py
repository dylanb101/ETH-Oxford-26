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

from schemas import QuoteRequest, QuoteResponse, HealthResponse
from signing_utils import QuoteSigner
from ai_agent import FlightRiskAnalyzer


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    global quote_signer, risk_analyzer
    
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
    
    # Initialize AI risk analyzer
    risk_analyzer = FlightRiskAnalyzer(openai_api_key=OPENAI_API_KEY)
    print("AI Risk Analyzer initialized.")
    
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
        
        # Step 6: Return quote response
        return QuoteResponse(
            premium=signer.wei_to_flr(premium_wei),  # Return as string for precision
            deadline=deadline,
            signature=signature,
            flight_id=flight_id,
            risk_score=risk_score,
            delay_probability=delay_probability,
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


if __name__ == '__main__':
    uvicorn.run(
        "main:app",
        host='0.0.0.0',
        port=PORT,
        reload=DEBUG
    )

