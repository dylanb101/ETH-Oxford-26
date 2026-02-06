# Flask Backend

## Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python app.py
```

The server will run on `http://localhost:5000` by default.

## Environment Variables

Create a `.env` file in the backend directory:
```
PORT=5000
FLASK_ENV=development
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/hello` - Simple hello endpoint
- `POST /api/test` - Test endpoint that echoes back messages

