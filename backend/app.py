from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Configuration
PORT = int(os.getenv('PORT', 5000))
DEBUG = os.getenv('FLASK_ENV') == 'development'

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Flask backend is running!'
    }), 200

@app.route('/api/test', methods=['POST'])
def test_endpoint():
    """Test endpoint that echoes back the message"""
    try:
        data = request.get_json()
        message = data.get('message', 'No message provided')
        
        return jsonify({
            'success': True,
            'response': f'Backend received: {message}'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/hello', methods=['GET'])
def hello():
    """Simple hello endpoint"""
    return jsonify({
        'message': 'Hello from Flask backend!'
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=DEBUG)

