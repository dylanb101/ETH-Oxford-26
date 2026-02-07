import React, { useState, useMemo } from 'react';
import './App.css';

const TRANSPORT_OPTIONS = ['Train', 'Plane', 'Bus', 'Other'];

function getTransportLabels(type) {
  switch (type) {
    case 'Train':
      return { fromTo: 'Station', refLabel: 'Ticket reference', refPlaceholder: 'e.g. TKT-1234' };
    case 'Plane':
      return { fromTo: 'Airport', refLabel: 'Flight number', refPlaceholder: 'e.g. BA 123' };
    case 'Bus':
      return { fromTo: 'Stop or city', refLabel: 'Ticket reference', refPlaceholder: 'e.g. TKT-1234' };
    default:
      return { fromTo: 'City or location', refLabel: 'Reference', refPlaceholder: 'e.g. booking ref' };
  }
}

const INITIAL_CLAIMS = [
  { id: '1', transport: 'Train', ticketRef: 'TKT-7842', journey: 'London → Oxford', date: '2025-02-01', delayMins: 47, amount: '£12.50', status: 'paid' },
  { id: '2', transport: 'Train', ticketRef: 'TKT-8011', journey: 'Oxford → Reading', date: '2025-02-03', delayMins: 23, amount: '£8.00', status: 'pending' },
  { id: '3', transport: 'Plane', ticketRef: 'TKT-8190', journey: 'Reading → London', date: '2025-02-05', delayMins: 15, amount: '£5.00', status: 'submitted' },
];

function App() {
  const [page, setPage] = useState('home'); // 'home' | 'claims'
  const [claimStep, setClaimStep] = useState('start'); // 'start' | 'details' (only when on home)
  const [transportType, setTransportType] = useState(null);
  const [claims, setClaims] = useState(INITIAL_CLAIMS);
  const [form, setForm] = useState({
    from: '',
    to: '',
    ticketRef: '',
    date: '',
    delayMins: '',
    amount: '',
  });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContinueToDetails = (e) => {
    e.preventDefault();
    if (!transportType || !form.from || !form.to || !form.date) return;
    setClaimStep('details');
  };

  const handleBackToStart = () => {
    setClaimStep('start');
  };

  const handleSubmitClaim = (e) => {
    e.preventDefault();
    if (!transportType || !form.from || !form.to || !form.date || !form.delayMins) return;
    const journey = `${form.from} → ${form.to}`;
    const newClaim = {
      id: String(Date.now()),
      transport: transportType,
      ticketRef: form.ticketRef || '—',
      journey,
      date: form.date,
      delayMins: form.delayMins,
      amount: form.amount || '—',
      status: 'submitted',
    };
    setClaims((prev) => [newClaim, ...prev]);
    setForm({ from: '', to: '', ticketRef: '', date: '', delayMins: '', amount: '' });
    setTransportType(null);
    setClaimStep('start');
    setPage('claims');
  };

  const statusClass = (status) => {
    if (status === 'paid') return 'status-paid';
    if (status === 'pending') return 'status-pending';
    return 'status-submitted';
  };

  const isHomeStart = page === 'home' && claimStep === 'start';

  return (
    <div className={`app ${isHomeStart ? 'app--home' : ''}`}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Top bar: long bar, logo left, buttons right */}
      <header className="topbar">
        <div className="topbar-logo">Delay Repay</div>
        <nav className="topbar-nav">
          <button
            type="button"
            className={`topbar-btn ${page === 'home' ? 'topbar-btn-active' : ''}`}
            onClick={() => { setPage('home'); setClaimStep('start'); }}
          >
            Home
          </button>
          <button
            type="button"
            className={`topbar-btn ${page === 'claims' ? 'topbar-btn-active' : ''}`}
            onClick={() => setPage('claims')}
          >
            My claims
          </button>
          {page === 'home' && claimStep === 'details' && (
            <button type="button" className="topbar-btn" onClick={handleBackToStart}>
              ← Back
            </button>
          )}
          <button type="button" className="topbar-btn topbar-btn-outline">
            Sign in
          </button>
        </nav>
      </header>

      <main id="main-content" className={`main ${isHomeStart ? 'main--home' : ''}`} role="main">
        {/* Home step 1: minimal hero — transport, city to city, date, Continue */}
        {page === 'home' && claimStep === 'start' && (
          <section className="hero" aria-label="Start your claim">
            <div className="hero-bg" aria-hidden="true" />
            <div className="hero-inner">
              <div className="hero-form-card hero-form-card--minimal">
                <h2 className="hero-form-title">Submit a claim</h2>
                <p className="hero-form-hint">City to city, date and transport.</p>

                <form onSubmit={handleContinueToDetails} className="hero-claim-form hero-claim-form--minimal">
                  <div className="transport-selector" role="group" aria-label="Transport type">
                    {TRANSPORT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`transport-opt ${transportType === opt ? 'transport-opt-selected' : ''}`}
                        onClick={() => setTransportType(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <label>
                    From
                    <input
                      type="text"
                      name="from"
                      value={form.from}
                      onChange={handleChange}
                      placeholder="City"
                      required
                    />
                  </label>
                  <label>
                    To
                    <input
                      type="text"
                      name="to"
                      value={form.to}
                      onChange={handleChange}
                      placeholder="City"
                      required
                    />
                  </label>
                  <label>
                    Date
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <button type="submit" className="btn-primary btn-hero" disabled={!transportType}>
                    Continue →
                  </button>
                </form>
              </div>
              <div className="hero-copy">
                <p className="hero-headline">Delays and compensation?</p>
                <p className="hero-sub">Instant delay repayment.</p>
                <button type="button" className="hero-cta" onClick={() => setPage('claims')}>
                  View my claims
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Home step 2: separate full-details page */}
        {page === 'home' && claimStep === 'details' && (
          <div className="claim-details-page">
            <div className="claim-details-inner">
              <button type="button" className="claim-details-back" onClick={handleBackToStart}>
                ← Back to start
              </button>
              <h1 className="claim-details-title">Complete your claim</h1>

              <div className="claim-details-summary">
                <p><strong>{form.from} → {form.to}</strong></p>
                <p>{transportType} · {form.date}</p>
              </div>

              <form onSubmit={handleSubmitClaim} className="claim-details-form">
                {transportType && (() => {
                  const labels = getTransportLabels(transportType);
                  return (
                    <>
                      <label>
                        {labels.refLabel}
                        <input
                          type="text"
                          name="ticketRef"
                          value={form.ticketRef}
                          onChange={handleChange}
                          placeholder={labels.refPlaceholder}
                        />
                      </label>
                      <label>
                        Delay (minutes)
                        <input
                          type="number"
                          name="delayMins"
                          value={form.delayMins}
                          onChange={handleChange}
                          placeholder="e.g. 30"
                          min="1"
                          required
                        />
                      </label>
                      <label>
                        Amount claimed (optional)
                        <input
                          type="text"
                          name="amount"
                          value={form.amount}
                          onChange={handleChange}
                          placeholder="e.g. £12.50"
                        />
                      </label>
                    </>
                  );
                })()}
                <button type="submit" className="btn-primary btn-claim-details">
                  Submit claim →
                </button>
              </form>
            </div>
          </div>
        )}

        {page === 'claims' && (
          <div className="claims-page">
            <div className="claims-page-inner">
              <h1 className="claims-page-title">My claims</h1>

              {/* Stats */}
              <section className="dashboard-section" aria-labelledby="stats-heading">
                <h2 id="stats-heading" className="section-title">Overview</h2>
                <div className="stat-cards">
                  <div className="stat-card">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{stats.submitted}</span>
                    <span className="stat-label">Submitted</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{stats.pending}</span>
                    <span className="stat-label">Pending</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{stats.paid}</span>
                    <span className="stat-label">Paid</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">£{stats.amountPaid.toFixed(2)}</span>
                    <span className="stat-label">Repaid</span>
                  </div>
                </div>
              </section>

              {/* Submitted */}
              <section className="claims-status-section" aria-labelledby="submitted-heading">
                <h2 id="submitted-heading" className="section-title">Submitted</h2>
                <div className="panel panel-no-padding">
                  <ClaimList claims={claimsByStatus.submitted} statusClass={statusClass} emptyLabel="No submitted claims." />
                </div>
              </section>

              {/* Pending */}
              <section className="claims-status-section" aria-labelledby="pending-heading">
                <h2 id="pending-heading" className="section-title">Pending</h2>
                <div className="panel panel-no-padding">
                  <ClaimList claims={claimsByStatus.pending} statusClass={statusClass} emptyLabel="No pending claims." />
                </div>
              </section>

              {/* Paid */}
              <section className="claims-status-section" aria-labelledby="paid-heading">
                <h2 id="paid-heading" className="section-title">Paid</h2>
                <div className="panel panel-no-padding">
                  <ClaimList claims={claimsByStatus.paid} statusClass={statusClass} emptyLabel="No paid claims yet." />
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {page !== 'home' && (
        <footer className="footer">
          <p>Ticket-based insurance · Instant delay repayment</p>
        </footer>
      )}
    </div>
  );
}

function ClaimList({ claims, statusClass, emptyLabel }) {
  return (
    <ul className="claims-list">
      {claims.length === 0 ? (
        <li className="empty">{emptyLabel}</li>
      ) : (
        claims.map((c) => (
          <li key={c.id} className="claim-card">
            <div className="claim-meta">
              <span className="ticket-ref">{c.ticketRef}</span>
              <span className="claim-transport">{c.transport}</span>
              <span className={`status ${statusClass(c.status)}`}>{c.status}</span>
            </div>
            <div className="claim-details">
              <span className="journey">{c.journey}</span>
              <span className="date">{c.date}</span>
              <span className="delay">{c.delayMins} min delay</span>
              <span className="amount">{c.amount}</span>
            </div>
          </li>
        ))
      )}
    </ul>
  );
}

export default App;
