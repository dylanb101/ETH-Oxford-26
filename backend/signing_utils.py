"""
EIP-712 signing utilities for Flare Network quote verification.
"""
import os
from typing import Dict, Any
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3
from datetime import datetime, timedelta
import hashlib


class QuoteSigner:
    """
    Handles EIP-712 signing of insurance quotes for Flare Network.
    """
    
    def __init__(self, private_key: str, domain_name: str = "Flare Insurance dApp", 
                 version: str = "1", chain_id: int = 114):  # Coston2 chain ID
        """
        Initialize the quote signer.
        
        Args:
            private_key: Private key of the admin wallet (hex string with 0x prefix)
            domain_name: EIP-712 domain name
            version: EIP-712 domain version
            chain_id: Flare Network chain ID (114 for Coston2)
        """
        if not private_key.startswith('0x'):
            private_key = '0x' + private_key
        
        self.private_key = private_key
        self.account = Account.from_key(private_key)
        self.domain_name = domain_name
        self.version = version
        self.chain_id = chain_id
        self.w3 = Web3()
        
    def _get_domain_separator(self) -> Dict[str, Any]:
        """Get EIP-712 domain separator."""
        return {
            "name": self.domain_name,
            "version": self.version,
            "chainId": self.chain_id,
            "verifyingContract": "0x0000000000000000000000000000000000000000"  # Placeholder
        }
    
    def _get_quote_type(self) -> Dict[str, Any]:
        """Get EIP-712 type definition for Quote."""
        return {
            "Quote": [
                {"name": "userAddress", "type": "address"},
                {"name": "flightId", "type": "string"},
                {"name": "premiumAmount", "type": "uint256"},
                {"name": "deadline", "type": "uint256"}
            ]
        }
    
    def create_flight_id(self, flight_number: str, flight_date: str, user_address: str) -> str:
        """
        Create a unique flight identifier.
        
        Args:
            flight_number: Flight number
            flight_date: Flight date in YYYY-MM-DD format
            user_address: User's wallet address
            
        Returns:
            Unique flight ID (hex string)
        """
        # Create deterministic flight ID
        data = f"{flight_number}:{flight_date}:{user_address.lower()}"
        flight_id = hashlib.sha256(data.encode()).hexdigest()
        return f"0x{flight_id[:40]}"  # 20 bytes (40 hex chars)
    
    def calculate_deadline(self, hours: int = 24) -> int:
        """
        Calculate quote deadline timestamp.
        
        Args:
            hours: Number of hours until deadline (default 24)
            
        Returns:
            Unix timestamp
        """
        deadline = datetime.utcnow() + timedelta(hours=hours)
        return int(deadline.timestamp())
    
    def wei_to_flr(self, wei_amount: int) -> str:
        """
        Convert Wei amount to FLR string (18 decimals).
        
        Args:
            wei_amount: Amount in Wei
            
        Returns:
            FLR amount as string with 18 decimals
        """
        return str(wei_amount)
    
    def flr_to_wei(self, flr_amount: float) -> int:
        """
        Convert FLR amount to Wei (18 decimals).
        
        Args:
            flr_amount: Amount in FLR
            
        Returns:
            Amount in Wei
        """
        return int(flr_amount * 10**18)
    
    def sign_quote(self, user_address: str, flight_id: str, 
                   premium_amount_wei: int, deadline: int) -> str:
        """
        Sign a quote using EIP-712.
        
        Args:
            user_address: User's wallet address
            flight_id: Unique flight identifier
            premium_amount_wei: Premium amount in Wei (18 decimals)
            deadline: Unix timestamp deadline
            
        Returns:
            EIP-712 signature (hex string with 0x prefix)
        """
        # Normalize addresses
        user_address = Web3.to_checksum_address(user_address)
        
        # Prepare EIP-712 message
        domain = self._get_domain_separator()
        types = self._get_quote_type()
        
        message = {
            "userAddress": user_address,
            "flightId": flight_id,
            "premiumAmount": premium_amount_wei,
            "deadline": deadline
        }
        
        # Sign using eth_account
        # Note: eth_account's sign_message handles EIP-712 encoding
        # For full EIP-712, we use structured data signing
        from eth_account.messages import encode_structured_data
        
        structured_msg = {
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"}
                ],
                "Quote": types["Quote"]
            },
            "primaryType": "Quote",
            "domain": domain,
            "message": message
        }
        
        encoded = encode_structured_data(structured_msg)
        signed_message = Account.sign_message(encoded, self.private_key)
        
        return signed_message.signature.hex()
    
    def get_signer_address(self) -> str:
        """Get the address of the signing wallet."""
        return self.account.address

