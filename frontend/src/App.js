import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  useEffect(() => {
    // Test connection to backend on mount
    axios.get(`${API_URL}/api/health`)
      .then(res => {
        setResponse(res.data.message || 'Connected to backend!');
      })
      .catch(err => {
        setResponse('Backend not connected. Make sure Flask server is running.');
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/test`, { message });
      setResponse(res.data.response || 'No response');
    } catch (error) {
      setResponse('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>React Frontend</h1>
        <p>Connected to Flask Backend</p>
        
        <div className="status">
          <p><strong>Status:</strong> {response}</p>
        </div>

        <form onSubmit={handleSubmit} className="test-form">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a message"
            className="input-field"
          />
          <button type="submit" className="submit-button">
            Send to Backend
          </button>
        </form>
      </header>
    </div>
  );
}

export default App;

