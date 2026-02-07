from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import uvicorn

load_dotenv()

app = FastAPI(title="FastAPI Backend", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
PORT = int(os.getenv('PORT', 5000))
DEBUG = os.getenv('FASTAPI_ENV') == 'development'

# Pydantic models for request/response
class TestRequest(BaseModel):
    message: str

class HealthResponse(BaseModel):
    status: str
    message: str

class TestResponse(BaseModel):
    success: bool
    response: str = None
    error: str = None

class HelloResponse(BaseModel):
    message: str

@app.get('/api/health', response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status='healthy',
        message='FastAPI backend is running!'
    )

@app.post('/api/test', response_model=TestResponse)
async def test_endpoint(request_data: TestRequest):
    """Test endpoint that echoes back the message"""
    try:
        return TestResponse(
            success=True,
            response=f'Backend received: {request_data.message}'
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@app.get('/api/hello', response_model=HelloResponse)
async def hello():
    """Simple hello endpoint"""
    return HelloResponse(
        message='Hello from FastAPI backend!'
    )

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=PORT, reload=DEBUG)

