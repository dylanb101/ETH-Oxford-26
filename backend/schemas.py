"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from decimal import Decimal


class QuoteRequest(BaseModel):
    """Request schema for insurance quote."""
    user_address: str = Field(..., description="Ethereum-compatible wallet address")
    flight_number: str = Field(..., description="Flight number (e.g., 'AA123')")
    flight_date: str = Field(..., description="Flight date in ISO format (YYYY-MM-DD)")
    departure_airport: Optional[str] = Field(None, description="IATA departure airport code")
    arrival_airport: Optional[str] = Field(None, description="IATA arrival airport code")
    
    @validator('user_address')
    def validate_address(cls, v):
        """Validate Ethereum address format."""
        if not v.startswith('0x') or len(v) != 42:
            raise ValueError('Invalid Ethereum address format')
        return v.lower()
    
    @validator('flight_date')
    def validate_date(cls, v):
        """Validate date format."""
        try:
            datetime.strptime(v, '%Y-%m-%d')
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')
        return v


class QuoteResponse(BaseModel):
    """Response schema for insurance quote."""
    premium: str = Field(..., description="Premium amount in FLR (18 decimals, as string)")
    deadline: int = Field(..., description="Unix timestamp deadline for quote acceptance")
    signature: str = Field(..., description="EIP-712 signature of the quote")
    flight_id: str = Field(..., description="Unique flight identifier")
    risk_score: float = Field(..., description="Risk score (0.0 to 1.0)")
    delay_probability: float = Field(..., description="Estimated delay probability (0.0 to 1.0)")
    delay_threshold_minutes: int = Field(..., description="Minimum delay in minutes to trigger payout")
    payout_multiplier: float = Field(..., description="Payout multiplier (e.g., 1.5 = 1.5x premium)")
    message: Optional[str] = Field(None, description="Additional information about the quote")


class ContractVerificationRequest(BaseModel):
    """Request schema for contract verification."""
    flight_number: str = Field(..., description="Flight number")
    flight_date: str = Field(..., description="Flight date in ISO format (YYYY-MM-DD)")
    contract_address: str = Field(..., description="Smart contract address")
    user_address: str = Field(..., description="User wallet address")


class ContractVerificationResponse(BaseModel):
    """Response schema for contract verification."""
    condition_met: bool = Field(..., description="Whether contract conditions are met")
    delay_minutes: int = Field(..., description="Actual delay in minutes")
    threshold_minutes: int = Field(..., description="Required delay threshold")
    payout_eligible: bool = Field(..., description="Whether payout is eligible")
    flight_status: str = Field(..., description="Current flight status")
    payout_amount: Optional[str] = Field(None, description="Payout amount in FLR (if eligible)")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    message: str
    version: str = "1.0.0"

