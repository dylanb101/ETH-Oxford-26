import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const DELAY_THRESHOLD_MINUTES = 120; // Contract condition: payout if delay >= 2hrs

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
let sharedFlightData = null; // AviationStack API response

// AviationStack API function - returns all flights for a flight number and date
async function fetchFlightData(flightNumber, flightDate) {
  // Validate flight number format (e.g., "BA297", "AA100")
  const cleanFlightNumber = flightNumber.toUpperCase().trim();
  const match = cleanFlightNumber.match(/^([A-Z]{2})(\d+)$/);
  if (!match) {
    throw new Error('Invalid flight number format. Use format like BA297 or AA100');
  }
  
  // Format date as YYYY-MM-DD for API
  const formattedDate = flightDate ? new Date(flightDate).toISOString().split('T')[0] : null;
  
  // Note: In production, use environment variable for API key
  // For now, using a placeholder - user will need to add their API key
  // Also note: AviationStack API may require CORS proxy in production
  const API_KEY = process.env.REACT_APP_AVIATIONSTACK_API_KEY || 'YOUR_API_KEY_HERE';
  const API_URL = `https://api.aviationstack.com/v1/flights`;
  
  try {
    const params = {
      access_key: API_KEY,
      flight_iata: cleanFlightNumber,
    };
    
    // Add flight_date parameter if provided
    if (formattedDate) {
      params.flight_date = formattedDate;
    }
    
    const response = await axios.get(API_URL, { params });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data; // Return all matching flights
    }
    throw new Error('Flight not found');
  } catch (error) {
    console.error('AviationStack API error:', error);
    
    // If API key is missing or API fails, return mock data for development/testing
    if (API_KEY === 'YOUR_API_KEY_HERE' || error.response?.status === 401) {
      console.warn('Using mock flight data. Please set REACT_APP_AVIATIONSTACK_API_KEY environment variable for production.');
    }
    
    const [, airlineCode, flightNum] = match;
    const baseDate = formattedDate ? new Date(formattedDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Return mock data - simulate multiple flights if date is provided
    if (formattedDate) {
      const date1 = new Date(baseDate);
      date1.setHours(8, 0, 0, 0);
      const arr1 = new Date(date1);
      arr1.setHours(16, 0, 0, 0);
      
      const date2 = new Date(baseDate);
      date2.setHours(14, 30, 0, 0);
      const arr2 = new Date(date2);
      arr2.setHours(22, 45, 0, 0);
      
      return [
        {
          flight: {
            iata: cleanFlightNumber,
            number: flightNum,
          },
          airline: {
            name: airlineCode === 'BA' ? 'British Airways' : airlineCode === 'AA' ? 'American Airlines' : airlineCode === 'LH' ? 'Lufthansa' : 'Airline',
            iata: airlineCode,
          },
          departure: {
            airport: 'London Heathrow',
            iata: 'LHR',
            scheduled: date1.toISOString(),
          },
          arrival: {
            airport: 'New York JFK',
            iata: 'JFK',
            scheduled: arr1.toISOString(),
          },
          aircraft: {
            name: 'Boeing 777',
          },
        },
        {
          flight: {
            iata: cleanFlightNumber,
            number: flightNum,
          },
          airline: {
            name: airlineCode === 'BA' ? 'British Airways' : airlineCode === 'AA' ? 'American Airlines' : airlineCode === 'LH' ? 'Lufthansa' : 'Airline',
            iata: airlineCode,
          },
          departure: {
            airport: 'London Heathrow',
            iata: 'LHR',
            scheduled: date2.toISOString(),
          },
          arrival: {
            airport: 'New York JFK',
            iata: 'JFK',
            scheduled: arr2.toISOString(),
          },
          aircraft: {
            name: 'Boeing 777',
          },
        },
      ];
    }
    
    // Single flight if no date provided
    return [{
      flight: {
        iata: cleanFlightNumber,
        number: flightNum,
      },
      airline: {
        name: airlineCode === 'BA' ? 'British Airways' : airlineCode === 'AA' ? 'American Airlines' : airlineCode === 'LH' ? 'Lufthansa' : 'Airline',
        iata: airlineCode,
      },
      departure: {
        airport: 'London Heathrow',
        iata: 'LHR',
        scheduled: baseDate.toISOString(),
      },
      arrival: {
        airport: 'New York JFK',
        iata: 'JFK',
        scheduled: new Date(baseDate.getTime() + 8 * 60 * 60 * 1000).toISOString(),
      },
      aircraft: {
        name: 'Boeing 777',
      },
    }];
  }
}

function TopBar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

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
        <button type="button" className="topbar-btn topbar-btn-outline">
          Sign in
        </button>
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
      const flights = await fetchFlightData(flightNumber, flightDate);
      
      if (flights.length === 0) {
        setError('No flights found for this flight number and date');
        setIsLoading(false);
        return;
      }
      
      // If only one flight, proceed directly to insure page
      if (flights.length === 1) {
        sharedFlightData = flights[0];
        navigate('/insure', { state: { flightData: flights[0], flightNumber } });
        return;
      }
      
      // If multiple flights, show time selection
      setAvailableFlights(flights);
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

  const formatFlightDisplay = (flight) => {
    const dep = flight.departure || {};
    const arr = flight.arrival || {};
    const depTime = formatFlightTime(dep.scheduled);
    const arrTime = formatFlightTime(arr.scheduled);
    return `${depTime} → ${arrTime} (${dep.airport || dep.iata} → ${arr.airport || arr.iata})`;
  };

  const isHomeStart = true;

  return (
    <div className={`app ${isHomeStart ? 'app--home' : ''}`}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <main id="main-content" className={`main ${isHomeStart ? 'main--home' : ''}`} role="main">
        <div className="page page--home-start">
          <section className="hero" aria-label="Start your claim">
            <div className="hero-bg" aria-hidden="true" />
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
                              <span className="time-selection-time">{formatFlightTime(flight.departure?.scheduled)}</span>
                              <span className="time-selection-details">{formatFlightDisplay(flight)}</span>
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
                  <p className="hero-sub">Premium from delay probability. Smart contract pays out if the condition is met. Verified by Flare (FDC).</p>
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
  
  // Extract flight details from API response
  const getFlightDetails = (data) => {
    if (!data) return {};
    const dep = data.departure || {};
    const arr = data.arrival || {};
    const airline = data.airline || {};
    const flight = data.flight || {};
    const aircraft = data.aircraft || {};
    
    // Parse date from scheduled time (format: "2026-02-15T14:30:00+00:00")
    const depDate = dep.scheduled ? new Date(dep.scheduled).toISOString().slice(0, 10) : '';
    const depTime = dep.scheduled ? new Date(dep.scheduled).toTimeString().slice(0, 5) : '';
    const arrTime = arr.scheduled ? new Date(arr.scheduled).toTimeString().slice(0, 5) : '';
    
    return {
      from: dep.airport || dep.iata || '',
      to: arr.airport || arr.iata || '',
      date: depDate,
      depTime,
      arrTime,
      airline: airline.name || airline.iata || '',
      aircraft: aircraft.name || '',
      flightNumber: flight.iata || flightNumberFromRoute || '',
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
  const handleSubmitClaim = (e) => {
    e.preventDefault();
    
    // Use submittedTicketRef (stored from first submission) or current form.ticketRef as fallback
    const ticketRef = submittedTicketRef || form.ticketRef;
    
    // Validate required fields for final submission
    const errors = {};
    if (!form.from || form.from.trim() === '') {
      errors.from = 'This field is required';
    }
    if (!form.to || form.to.trim() === '') {
      errors.to = 'This field is required';
    }
    if (!ticketRef || ticketRef.trim() === '') {
      errors.ticketRef = 'This field is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    // Clear any errors
    setFieldErrors({});
    
    const claimDate = form.date || new Date().toISOString().slice(0, 10);
    const journey = `${form.from} → ${form.to}`;
    const newClaim = {
      id: String(Date.now()),
      transport: 'Plane',
      ticketRef: ticketRef,
      journey,
      date: claimDate,
      delayMins: '—',
      amount: '—',
      status: 'submitted',
    };
    const updatedClaims = [newClaim, ...claims];
    setClaims(updatedClaims);
    sharedClaims = updatedClaims;
    
    // Reset form state after successful submission
    setForm((prev) => ({
      ...prev,
      ticketRef: '', // Clear ticket code field
    }));
    setSubmittedTicketRef(''); // Clear stored ticketRef
    setShowInfoBars(false); // Reset info bars state
    setFieldErrors({}); // Clear all errors
    
    navigate('/claims');
  };

  // Mock premium and contract data (will come from API later)
  const premiumAmount = 8.50;
  const contractConditions = `Payout if delay ≥ ${DELAY_THRESHOLD_MINUTES} minutes. Verified by Flare Data Connector (FDC). Contract created before travel — no contracts after the event date.`;

  return (
    <div className="page page--insure">
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
                  
                  <label>
                    From
                    <input
                      type="text"
                      name="from"
                      value={form.from}
                      onChange={handleChange}
                      placeholder="Departure airport"
                      required
                      className={fieldErrors.from ? 'input-error' : ''}
                    />
                    {fieldErrors.from && (
                      <span className="field-error-message" role="alert">{fieldErrors.from}</span>
                    )}
                  </label>
                  
                  <label>
                    To
                    <input
                      type="text"
                      name="to"
                      value={form.to}
                      onChange={handleChange}
                      placeholder="Arrival airport"
                      required
                      className={fieldErrors.to ? 'input-error' : ''}
                    />
                    {fieldErrors.to && (
                      <span className="field-error-message" role="alert">{fieldErrors.to}</span>
                    )}
                  </label>
                  
                  <label>
                    Date
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      min={minDate}
                      required
                      className={fieldErrors.date ? 'input-error' : ''}
                    />
                    {fieldErrors.date && (
                      <span className="field-error-message" role="alert">{fieldErrors.date}</span>
                    )}
                  </label>
                  
                  <label>
                    Departure Time
                    <input
                      type="time"
                      name="depTime"
                      value={form.depTime}
                      onChange={handleChange}
                      placeholder="HH:MM"
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
                    />
                  </label>
                </div>
              </div>
              
              <div className="passenger-details-section">
                <h2 className="passenger-details-title">Passenger Details</h2>
                
                <label>
                  Ticket Code / Booking Reference
                  <input
                    type="text"
                    name="ticketRef"
                    value={form.ticketRef}
                    onChange={handleChange}
                    placeholder="e.g., ABC123XYZ"
                    required
                    className={fieldErrors.ticketRef ? 'input-error' : ''}
                  />
                  {fieldErrors.ticketRef && (
                    <span className="field-error-message" role="alert">{fieldErrors.ticketRef}</span>
                  )}
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
                  <p className="workflow-block-subtitle">Calculated from delay probability for this route (Flare AI / custom agent)</p>
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
