import React, { useState, useMemo } from 'react';
import { BrowserProvider, Contract, parseEther } from "ethers";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchFlightData, parseFlightData } from './services/aviationStackService';
import './App.css';
import FlightDelayFactoryABI from "./abis/FlightDelayFactory.json";

const DELAY_THRESHOLD_MINUTES = 120; // Contract condition: payout if delay >= 2hrs

// Static Golden Gate Bridge background image for all pages
const BACKGROUND_IMAGE = 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';

// Airport code to country flag mapping
function getCountryFlag(airportCode) {
  const airportToCountry = {
    // UK airports
    'LHR': 'GB', 'LGW': 'GB', 'STN': 'GB', 'LTN': 'GB', 'EDI': 'GB', 'MAN': 'GB', 'BHX': 'GB',
    // US airports
    'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'DFW': 'US', 'DEN': 'US', 'SFO': 'US', 'SEA': 'US', 'MIA': 'US', 'ATL': 'US',
    // European airports
    'CDG': 'FR', 'ORY': 'FR', 'AMS': 'NL', 'FRA': 'DE', 'MUC': 'DE', 'FCO': 'IT', 'MAD': 'ES', 'BCN': 'ES',
    'ZUR': 'CH', 'VIE': 'AT', 'BRU': 'BE', 'DUB': 'IE', 'CPH': 'DK', 'ARN': 'SE', 'OSL': 'NO',
    // Asian airports
    'DXB': 'AE', 'DOH': 'QA', 'SIN': 'SG', 'HKG': 'HK', 'NRT': 'JP', 'ICN': 'KR', 'PEK': 'CN', 'PVG': 'CN',
    // Other
    'SYD': 'AU', 'MEL': 'AU', 'YYZ': 'CA', 'YVR': 'CA',
  };
  
  const code = airportCode?.toUpperCase().slice(0, 3);
  const countryCode = airportToCountry[code] || 'GB'; // Default to GB
  return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
}

function isDateInPast(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

const INITIAL_CLAIMS = [
  { id: '1', transport: 'Train', ticketRef: 'TKT-7842', journey: 'London → Oxford', date: '2025-02-01', delayMins: 47, amount: '£12.50', status: 'paid' },
  { id: '2', transport: 'Train', ticketRef: 'TKT-8011', journey: 'Oxford → Reading', date: '2025-02-03', delayMins: 23, amount: '£8.00', status: 'pending' },
  { id: '3', transport: 'Plane', ticketRef: 'TKT-8190', journey: 'Reading → London', date: '2025-02-05', delayMins: 15, amount: '£5.00', status: 'submitted' },
];

// Shared state context (simplified - in production use Context API or state management)
let sharedClaims = INITIAL_CLAIMS;
let sharedFlightData = null; // Parsed flight data from API

function TopBar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const [address, setAddress] = useState(null);

  // Connect to MetaMask and set address
  const ConnectToMetaMask = async () => {
    try {
      if (window.ethereum) {
        const Accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAddress(Accounts[0]);
        console.log('Connected to MetaMask!', Accounts);
      } else {
        console.error('MetaMask not found. Please install MetaMask to use this application.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...`;
  };

  return (
    <header className="topbar">
      <Link to="/" className="topbar-logo">Delay Repay</Link>
      <nav className="topbar-nav">
        <Link to="/" className={`topbar-btn ${isActive('/') ? 'topbar-btn-active' : ''}`}>
          Home
        </Link>
        <Link to="/insure" className={`topbar-btn ${isActive('/insure') ? 'topbar-btn-active' : ''}`}>
          Insure
        </Link>
        <Link to="/dashboard" className={`topbar-btn ${isActive('/dashboard') ? 'topbar-btn-active' : ''}`}>
          Dashboard
        </Link>
        <Link to="/claims" className={`topbar-btn ${isActive('/claims') ? 'topbar-btn-active' : ''}`}>
          My claims
        </Link>
        <Link to="/account" className={`topbar-btn ${isActive('/account') ? 'topbar-btn-active' : ''}`}>
          Account
        </Link>
        {!address ? (
          <button
            type="button"
            className="topbar-btn topbar-btn-outline"
            onClick={ConnectToMetaMask}
          >
            Connect
          </button>
        ) : (
          <button type="button" className="topbar-btn topbar-btn-outline topbar-wallet-btn" title={address}>
            <span className="wallet-icon" aria-hidden>🦊</span>
            <span className="wallet-addr">{truncateAddress(address)}</span>
          </button>
        )}
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>Ticket-based delay insurance · Premium from delay probability · Smart contract + FDC verification</p>
      <nav className="footer-nav" aria-label="Footer">
        <Link to="/trust" className="footer-link">Trust</Link>
        <Link to="/privacy" className="footer-link">Privacy</Link>
      </nav>
    </footer>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableFlights, setAvailableFlights] = useState([]);
  const [showTimeSelection, setShowTimeSelection] = useState(false);

  const handleFlightNumberChange = (e) => {
    setFlightNumber(e.target.value.toUpperCase().trim());
    setError(null);
  };

  const handleFlightDateChange = (e) => {
    setFlightDate(e.target.value);
    setError(null);
  };

  const handleContinueToDetails = async (e) => {
    e.preventDefault();
    if (!flightNumber) {
      setError('Please enter a flight number');
      return;
    }
    if (!flightDate) {
      setError('Please select a flight date');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch raw flight data from API
      const rawFlights = await fetchFlightData(flightNumber, flightDate);
      
      // Parse flight data into structured format
      const parsedFlights = parseFlightData(rawFlights);
      
      if (parsedFlights.length === 0) {
        setError('No flights found for this flight number and date');
        setIsLoading(false);
        return;
      }
      
      // If only one flight, proceed directly to insure page
      if (parsedFlights.length === 1) {
        sharedFlightData = parsedFlights[0];
        navigate('/insure', { state: { flightData: parsedFlights[0], flightNumber } });
        return;
      }
      
      // If multiple flights, show time selection
      setAvailableFlights(parsedFlights);
      setShowTimeSelection(true);
      setIsLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to fetch flight data. Please check the flight number and date and try again.');
      setIsLoading(false);
    }
  };

  const handleTimeSelection = (selectedFlight) => {
    sharedFlightData = selectedFlight;
    navigate('/insure', { state: { flightData: selectedFlight, flightNumber } });
  };

  const formatFlightTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const isHomeStart = true;

  return (
    <div className={`app ${isHomeStart ? 'app--home' : ''}`}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <main id="main-content" className={`main ${isHomeStart ? 'main--home' : ''}`} role="main">
        <div className="page page--home-start">
          <section className="hero" aria-label="Start your claim">
            <div 
              className="hero-bg" 
              aria-hidden="true"
              style={{
                backgroundImage: `url(${BACKGROUND_IMAGE})`
              }}
            />
            <div className="hero-inner">
              <div className="hero-content-grid">
                {/* Single horizontal form box - flight number and date */}
                <div className="hero-form-wrapper">
                  <div className="hero-form-card hero-form-card--horizontal">
                    {!showTimeSelection ? (
                      <form onSubmit={handleContinueToDetails} className="hero-claim-form hero-claim-form--horizontal">
                        <div className="horizontal-form-row">
                          <div className="horizontal-form-field">
                            <label className="horizontal-form-label">Flight Number</label>
                            <input
                              type="text"
                              name="flightNumber"
                              value={flightNumber}
                              onChange={handleFlightNumberChange}
                              placeholder="e.g., BA297, AA100"
                              className="horizontal-form-input"
                              required
                              disabled={isLoading}
                            />
                          </div>
                          <div className="horizontal-form-field">
                            <label className="horizontal-form-label">Flight Date</label>
                            <input
                              type="date"
                              name="flightDate"
                              value={flightDate}
                              onChange={handleFlightDateChange}
                              className="horizontal-form-input"
                              min={new Date().toISOString().split('T')[0]}
                              required
                              disabled={isLoading}
                            />
                          </div>
                          <div className="horizontal-form-field horizontal-form-field--action">
                            <button
                              type="submit"
                              className="btn-primary btn-horizontal-submit"
                              disabled={!flightNumber || !flightDate || isLoading}
                            >
                              {isLoading ? 'Loading...' : 'Continue'}
                            </button>
                          </div>
                        </div>
                        {error && (
                          <p className="form-error" role="alert" style={{ marginTop: 'var(--space-12)' }}>
                            {error}
                          </p>
                        )}
                      </form>
                    ) : (
                      <div className="time-selection-container">
                        <h3 className="time-selection-title">Select Your Flight Time</h3>
                        <p className="time-selection-subtitle">Multiple flights found for {flightNumber} on {new Date(flightDate).toLocaleDateString()}</p>
                        <div className="time-selection-list">
                          {availableFlights.map((flight, index) => (
                            <button
                              key={index}
                              type="button"
                              className="time-selection-option"
                              onClick={() => handleTimeSelection(flight)}
                            >
                              <span className="time-selection-content">
                                <span className="time-selection-time">{formatFlightTime(flight.departureTime)}</span>
                                <span className="time-selection-arrow"> → </span>
                                <span className="time-selection-time">{formatFlightTime(flight.arrivalTime)}</span>
                                <span className="time-selection-route"> ({flight.from} → {flight.to})</span>
                              </span>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="time-selection-back"
                          onClick={() => {
                            setShowTimeSelection(false);
                            setAvailableFlights([]);
                          }}
                        >
                          ← Back
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Small website description below form - centered */}
                  <p className="hero-description">Instant delay insurance powered by blockchain — No claims, just code</p>
                </div>

                 {/* Slogan text - right side */}
                <div className="hero-copy hero-copy--right">
                  <p className="hero-headline">Delay insurance on your journey.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function InsurePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const flightDataFromRoute = location.state?.flightData || sharedFlightData;
  const flightNumberFromRoute = location.state?.flightNumber || '';
  
  // Extract flight details from parsed flight data
  const getFlightDetails = (data) => {
    if (!data) return {};
    
    // Parse times from ISO strings
    const depTime = data.departureTime ? new Date(data.departureTime).toTimeString().slice(0, 5) : '';
    const arrTime = data.arrivalTime ? new Date(data.arrivalTime).toTimeString().slice(0, 5) : '';
    
    return {
      from: data.from || '',
      to: data.to || '',
      date: data.date || '',
      depTime,
      arrTime,
      airline: data.airline || '',
      aircraft: data.aircraft || '',
      flightNumber: data.flightNumber || flightNumberFromRoute || '',
    };
  };

  const flightDetails = getFlightDetails(flightDataFromRoute);
  
  const [form, setForm] = useState({
    from: flightDetails.from || '',
    to: flightDetails.to || '',
    date: flightDetails.date || '',
    depTime: flightDetails.depTime || '',
    arrTime: flightDetails.arrTime || '',
    airline: flightDetails.airline || '',
    aircraft: flightDetails.aircraft || '',
    flightNumber: flightDetails.flightNumber || '',
    ticketRef: '',
    delayMins: '',
    amount: '',
  });
  const [claims, setClaims] = useState(sharedClaims);
  const [showInfoBars, setShowInfoBars] = useState(false);
  const [submittedTicketRef, setSubmittedTicketRef] = useState(''); // Store ticketRef for final submission
  const [fieldErrors, setFieldErrors] = useState({}); // Track field validation errors
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false); // Track if form submission was attempted

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Get airport code from airport name (e.g., "London Heathrow" -> "LHR")
  const getAirportCode = (airportName) => {
    if (!airportName) return '';
    // Try to extract IATA code if available, otherwise use airport name
    const codes = {
      'London Heathrow': 'LHR', 'Heathrow': 'LHR',
      'New York JFK': 'JFK', 'JFK': 'JFK',
      'Los Angeles': 'LAX', 'LAX': 'LAX',
      'Chicago O\'Hare': 'ORD', 'O\'Hare': 'ORD',
      'Paris Charles de Gaulle': 'CDG', 'CDG': 'CDG',
      'Amsterdam': 'AMS', 'AMS': 'AMS',
      'Frankfurt': 'FRA', 'FRA': 'FRA',
    };
    for (const [key, code] of Object.entries(codes)) {
      if (airportName.includes(key) || airportName === code) {
        return code;
      }
    }
    // Extract first 3 letters if it looks like a code
    const match = airportName.match(/^([A-Z]{3})/);
    return match ? match[1] : airportName.slice(0, 3).toUpperCase();
  };

  const minDate = new Date().toISOString().slice(0, 10);

  // Validate required fields
  const validateForm = () => {
    const errors = {};
    
    // Required fields for first submission
    if (!form.from || form.from.trim() === '') {
      errors.from = 'This field is required';
    }
    if (!form.to || form.to.trim() === '') {
      errors.to = 'This field is required';
    }
    if (!form.date || form.date.trim() === '') {
      errors.date = 'This field is required';
    }
    if (!form.ticketRef || form.ticketRef.trim() === '') {
      errors.ticketRef = 'This field is required';
    }
    
    // Date validation
    if (form.date && isDateInPast(form.date)) {
      errors.date = 'Contract cannot be created after the travel date. Please choose today or a future date.';
    }
    
    return errors;
  };

  // First submit: show info bars and clear passenger details
  const handleShowInfoBars = (e) => {
    e.preventDefault();
    
    // Mark that submission was attempted
    setHasAttemptedSubmit(true);
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    // Clear any previous errors
    setFieldErrors({});
    
    // Store ticketRef for final submission
    setSubmittedTicketRef(form.ticketRef);
    
    // Clear passenger detail fields (ticketRef and any other passenger fields)
    setForm((prev) => ({
      ...prev,
      ticketRef: '', // Clear ticket code/booking reference
    }));
    
    // Show info bars
    setShowInfoBars(true);
  };

  // Final submit: create claim and navigate
  const FACTORY_ADDRESS = process.env.REACT_APP_FLARE_FACTORY_ADDRESS;
  // Example handleSubmitClaim function
  const handleSubmitClaim = async (
    e,
    expirationTime,
    minDelayMinutes,
    payoutAmount,
    premium,
    flightRef,
    account,           // user's wallet address
    insuranceContract, // ethers.js contract instance
  ) => {
    e.preventDefault();
    try {
      console.log("🚀 Submitting policy creation transaction...");

      // 1️⃣ Send transaction to smart contract
      const tx = await insuranceContract.createPolicy(
        expirationTime,
        minDelayMinutes,
        payoutAmount,
        { value: premium }
      );
      console.log("Transaction sent, waiting for confirmation...", tx.hash);

      // 2️⃣ Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt.transactionHash);

      // 3️⃣ Parse logs to extract PolicyCreated event
      const event = receipt.logs
        .map((log) => {
          try {
            return insuranceContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "PolicyCreated");

      if (!event) throw new Error("PolicyCreated event not found in transaction logs");

      const policyId = Number(event.args.id);
      console.log(`✅ Policy created successfully with ID: ${policyId}`);

      // 4️⃣ Send policy to backend
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId,
          userAddress: account,
          flightRef,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to register policy in backend: ${res.status} - ${errorText}`);
      }

      console.log("✅ Policy registered in backend successfully");

      return policyId; // return ID in case caller needs it
    } catch (err) {
      console.error("❌ Error submitting claim:", err);
      alert("Failed to create policy. Check console for details.");
      throw err; // re-throw in case caller wants to handle
    }
  }

  // Mock premium and contract data (will come from API later)
  const premiumAmount = 8.50;
  const contractConditions = `Payout if delay ≥ ${DELAY_THRESHOLD_MINUTES} minutes. Verified by Flare Data Connector (FDC). Contract created before travel — no contracts after the event date.`;

  return (
    <div 
      className="page page--insure"
      style={{
        backgroundImage: `url(${BACKGROUND_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        minHeight: '100vh'
      }}
    >
      <div className="insure-page-background-overlay" />
      <div className="insure-page">
        <div className="insure-inner">
          <button type="button" className="claim-details-back" onClick={() => navigate('/')}>
            ← Back to home
          </button>
          <h1 className="page-title">Insure your ticket</h1>
          
          {/* Form with auto-populated flight data from API */}
          <div className="panel panel--insure">
            <form onSubmit={handleShowInfoBars} className="insure-form">
              <div className="flight-details-section">
                <h2 className="flight-details-title">Flight Details</h2>
                
                <div className="flight-details-grid">
                  <label>
                    Flight Number
                    <input
                      type="text"
                      name="flightNumber"
                      value={form.flightNumber}
                      onChange={handleChange}
                      placeholder="e.g., BA297"
                      required
                      readOnly
                      className="readonly-field"
                    />
                  </label>
                  
                  <label className="input-with-flag">
                    From
                    <div className="input-wrapper">
                      <input
                        type="text"
                        name="from"
                        value={form.from}
                        onChange={handleChange}
                        placeholder="Departure airport"
                        required
                        readOnly={!!flightDataFromRoute}
                        className={`${flightDataFromRoute ? 'readonly-field' : ''}`}
                      />
                      {form.from && (
                        <img 
                          src={getCountryFlag(getAirportCode(form.from))} 
                          alt="Country flag" 
                          className="country-flag"
                        />
                      )}
                      {!form.from && hasAttemptedSubmit && (
                        <div className="input-red-overlay" />
                      )}
                    </div>
                  </label>
                  
                  <label className="input-with-flag">
                    To
                    <div className="input-wrapper">
                      <input
                        type="text"
                        name="to"
                        value={form.to}
                        onChange={handleChange}
                        placeholder="Arrival airport"
                        required
                        readOnly={!!flightDataFromRoute}
                        className={`${flightDataFromRoute ? 'readonly-field' : ''}`}
                      />
                      {form.to && (
                        <img 
                          src={getCountryFlag(getAirportCode(form.to))} 
                          alt="Country flag" 
                          className="country-flag"
                        />
                      )}
                      {!form.to && hasAttemptedSubmit && (
                        <div className="input-red-overlay" />
                      )}
                    </div>
                  </label>
                  
                  <label>
                    Date
                    <div className="input-wrapper">
                      <input
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleChange}
                        min={minDate}
                        required
                        readOnly={!!flightDataFromRoute}
                        className={flightDataFromRoute ? 'readonly-field' : ''}
                      />
                      {!form.date && hasAttemptedSubmit && (
                        <div className="input-red-overlay" />
                      )}
                    </div>
                  </label>
                  
                  <label>
                    Departure Time
                    <input
                      type="time"
                      name="depTime"
                      value={form.depTime}
                      onChange={handleChange}
                      placeholder="HH:MM"
                      readOnly={!!flightDataFromRoute}
                      className={flightDataFromRoute ? 'readonly-field' : ''}
                    />
                  </label>
                  
                  <label>
                    Arrival Time
                    <input
                      type="time"
                      name="arrTime"
                      value={form.arrTime}
                      onChange={handleChange}
                      placeholder="HH:MM"
                      readOnly={!!flightDataFromRoute}
                      className={flightDataFromRoute ? 'readonly-field' : ''}
                    />
                  </label>
                  
                  <label>
                    Airline
                    <input
                      type="text"
                      name="airline"
                      value={form.airline}
                      onChange={handleChange}
                      placeholder="Airline name"
                      readOnly={!!flightDataFromRoute}
                      className={flightDataFromRoute ? 'readonly-field' : ''}
                    />
                  </label>
                  
                  <label>
                    Aircraft
                    <input
                      type="text"
                      name="aircraft"
                      value={form.aircraft}
                      onChange={handleChange}
                      placeholder="Aircraft type"
                      readOnly={!!flightDataFromRoute}
                      className={flightDataFromRoute ? 'readonly-field' : ''}
                    />
                  </label>
                </div>
              </div>
              
              <div className="passenger-details-section">
                <h2 className="passenger-details-title">Passenger Details</h2>
                
                <label>
                  Ticket Code / Booking Reference
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="ticketRef"
                      value={form.ticketRef}
                      onChange={handleChange}
                      placeholder="e.g., ABC123XYZ"
                      required
                    />
                    {!form.ticketRef && hasAttemptedSubmit && (
                      <div className="input-red-overlay" />
                    )}
                  </div>
                </label>
                
                <div className="upload-zone" aria-label="Optional ticket upload">
                  <p className="upload-zone-text">Optional: drag and drop ticket image or scan for auto-fill</p>
                </div>
              </div>
              {!showInfoBars && (
                <div className="hero-form-actions">
                  <button
                    type="submit"
                    className="btn-primary btn-hero"
                  >
                    Continue
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Three info bars - shown after form submission */}
          {showInfoBars && (
            <>
              {/* 1. Compact Info Bar */}
              <div className="claim-details-summary">
                <p className="claim-details-route"><strong>{form.from} → {form.to}</strong></p>
                <p className="claim-details-meta">Flight {form.flightNumber} · {form.date}</p>
              </div>

              {/* 2. Premium Returns Cost Box */}
              <div className="workflow-block workflow-block--premium workflow-block--horizontal">
                <div className="workflow-block-left">
                  <h3 className="workflow-block-title">Premium</h3>
                  <p className="workflow-block-subtitle">Calculated from delay probability for this route.</p>
                </div>
                <div className="workflow-block-right">
                  <span className="workflow-block-value">£{premiumAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* 3. Contract Conditions Box */}
              <div className="workflow-block workflow-block--contract workflow-block--horizontal">
                <div className="workflow-block-left">
                  <h3 className="workflow-block-title">Contract condition</h3>
                </div>
                <div className="workflow-block-right">
                  <span className="workflow-block-value workflow-block-value--text">{contractConditions}</span>
                </div>
              </div>

              {/* Final Submit Button */}
              <form onSubmit={handleSubmitClaim} className="claim-details-form">
                <button 
                  type="submit" 
                  className="btn-primary btn-submit-full"
                >
                  Submit
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="page page--dashboard">
      <div className="dashboard-wrap">
        <h1 className="page-title">Active insurance</h1>
        <section className="dashboard-section" aria-labelledby="active-heading">
          <h2 id="active-heading" className="section-title">Active policies</h2>
          <p className="panel empty-state">No active policies. <Link to="/insure" className="link-button">Insure a ticket</Link></p>
        </section>
        <section className="dashboard-section" aria-labelledby="tracker-heading">
          <h2 id="tracker-heading" className="section-title">Journey tracker</h2>
          <div className="panel">
            <p className="risk-hint">Live map and station progress for your insured journeys. Delay probability updates in real time.</p>
          </div>
        </section>
        {/* Event Monitoring section REMOVED */}
      </div>
    </div>
  );
}

function ClaimsPage() {
  const [claimsTab, setClaimsTab] = useState('submitted');
  const [claims] = useState(sharedClaims);

  const stats = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) => c.status === 'pending').length;
    const submitted = claims.filter((c) => c.status === 'submitted').length;
    const paid = claims.filter((c) => c.status === 'paid').length;
    const amountPaid = claims
      .filter((c) => c.status === 'paid' && c.amount !== '—')
      .reduce((sum, c) => sum + parseFloat(String(c.amount).replace(/[^0-9.]/g, '')) || 0, 0);
    return { total, pending, submitted, paid, amountPaid };
  }, [claims]);

  const claimsByStatus = useMemo(() => ({
    submitted: claims.filter((c) => c.status === 'submitted'),
    pending: claims.filter((c) => c.status === 'pending'),
    paid: claims.filter((c) => c.status === 'paid'),
  }), [claims]);

  const statusClass = (status) => {
    if (status === 'paid') return 'status-paid';
    if (status === 'pending') return 'status-pending';
    return 'status-submitted';
  };

  return (
    <div className="page page--claims">
      <div className="claims-page">
        <div className="claims-page-inner">
          <h1 className="page-title">My claims</h1>

          <section className="claims-overview" aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="visually-hidden">Overview</h2>
            <div className="stat-cards">
              <div className="stat-card stat-card--total">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-card stat-card--submitted">
                <span className="stat-value">{stats.submitted}</span>
                <span className="stat-label">Submitted</span>
              </div>
              <div className="stat-card stat-card--pending">
                <span className="stat-value">{stats.pending}</span>
                <span className="stat-label">Pending</span>
              </div>
              <div className="stat-card stat-card--paid">
                <span className="stat-value">{stats.paid}</span>
                <span className="stat-label">Paid</span>
              </div>
              <div className="stat-card stat-card--repaid">
                <span className="stat-value">£{stats.amountPaid.toFixed(2)}</span>
                <span className="stat-label">Repaid</span>
              </div>
            </div>
            <div className="claims-details-row">
              <span>Transaction</span>
              <a href="https://flare-explorer.flare.network" target="_blank" rel="noopener noreferrer" className="link-button">
                View on Flare Explorer →
              </a>
            </div>
          </section>

          <div className="claims-tabs" role="tablist" aria-label="Claim status">
            <button
              type="button"
              role="tab"
              aria-selected={claimsTab === 'submitted'}
              className={`claims-tab ${claimsTab === 'submitted' ? 'claims-tab--active' : ''}`}
              onClick={() => setClaimsTab('submitted')}
            >
              Submitted
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={claimsTab === 'pending'}
              className={`claims-tab ${claimsTab === 'pending' ? 'claims-tab--active' : ''}`}
              onClick={() => setClaimsTab('pending')}
            >
              Pending
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={claimsTab === 'paid'}
              className={`claims-tab ${claimsTab === 'paid' ? 'claims-tab--active' : ''}`}
              onClick={() => setClaimsTab('paid')}
            >
              Paid
            </button>
          </div>

          <div id={`claims-panel-${claimsTab}`} role="tabpanel" className="claims-panel">
            <div className="claims-table-wrap">
              <ClaimsTable
                claims={claimsByStatus[claimsTab]}
                statusClass={statusClass}
                emptyLabel={
                  claimsTab === 'submitted' ? 'No submitted claims.' :
                  claimsTab === 'pending' ? 'No pending claims.' :
                  'No paid claims yet.'
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClaimsTable({ claims, statusClass, emptyLabel }) {
  if (claims.length === 0) {
    return <p className="claims-table-empty">{emptyLabel}</p>;
  }
  return (
    <table className="claims-table" cellPadding={0} cellSpacing={0}>
      <thead>
        <tr>
          <th scope="col">Route</th>
          <th scope="col">Date</th>
          <th scope="col">Delay</th>
          <th scope="col">Amount</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {claims.map((c) => (
          <tr key={c.id} className="claims-table-row">
            <td className="claims-table-route">{c.journey}</td>
            <td className="claims-table-date">{c.date}</td>
            <td className="claims-table-delay">{c.delayMins} min</td>
            <td className="claims-table-amount">{c.amount}</td>
            <td>
              <span className={`status ${statusClass(c.status)}`}>{c.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TrustPage() {
  return (
    <div className="page page--trust">
      <div className="dashboard-wrap">
        <h1 className="page-title">Event verification</h1>
        <div className="panel panel--trust">
          <h2 className="panel-title">Event verification (FDC)</h2>
          <dl className="contract-terms">
            <dt>Data sources</dt>
            <dd>National Rail API · Flare Data Connector (FDC) · Station sensors</dd>
            <dt>Verification method</dt>
            <dd>Independent oracle queries · Multi-source consensus · Merkle proof validation</dd>
            <dt>Trust score</dt>
            <dd>98.5%</dd>
          </dl>
          <p className="risk-hint">DQMan: API status, data freshness, source reliability, fallbacks.</p>
        </div>
      </div>
    </div>
  );
}

function AccountPage() {
  return (
    <div className="page page--account">
      <div className="dashboard-wrap">
        <h1 className="page-title">Account</h1>
        <section className="dashboard-section">
          <h2 className="section-title">Profile</h2>
          <p className="risk-hint">Personal information, contact details, premium status, smart account connection.</p>
        </section>
        <div className="panel panel--account">
          <h2 className="panel-title">Your smart account</h2>
          <ul className="account-list">
            <li><strong>Account type</strong> Premium</li>
            <li><strong>ELO score</strong> 1,847 (Trusted user)</li>
            <li><strong>Connected</strong> Flare Wallet · Privacera audit trail</li>
            <li><strong>Transaction history</strong> 47 · Total insured £3,420 · Total payouts £890 · Success rate 26%</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function PrivacyPage() {
  return (
    <div className="page page--privacy">
      <div className="dashboard-wrap">
        <h1 className="page-title">Privacy & trust</h1>
        <div className="panel">
          <h2 className="panel-title">Privacy & trust</h2>
          <dl className="contract-terms">
            <dt>Your data</dt>
            <dd>Encrypted on-chain · Privacera audit trail · GDPR compliant</dd>
            <dt>Smart contract storage</dt>
            <dd>Insurance params only · No personal identifiers · Anonymized records</dd>
            <dt>Audit trail</dt>
            <dd><button type="button" className="link-button">View all contract interactions →</button></dd>
          </dl>
          <p className="risk-hint">Blocked users: fraud detection, community reporting, smart contract blacklist, appeal process.</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <TopBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/insure" element={<InsurePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/claims" element={<ClaimsPage />} />
          <Route path="/trust" element={<TrustPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
