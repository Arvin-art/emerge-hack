import { useState } from 'react';

export default function SearchStep({ onNext }) {
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');
  const [date,       setDate]       = useState('');
  const [passengers, setPassengers] = useState('1');
  const [cabin,      setCabin]      = useState('Economy');

  return (
    <div className="step-card">
      <div className="step-progress">
        <div className="step-dot active" />
        <div className="step-dot" />
        <div className="step-dot" />
        <div className="step-dot" />
      </div>
      <p className="step-eyebrow">Step 1 of 4</p>
      <h1 className="step-title">Where are you flying?</h1>
      <p className="step-subtitle">Search thousands of routes at the best prices</p>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">From</label>
          <input
            className="form-input"
            placeholder="New York (JFK)"
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">To</label>
          <input
            className="form-input"
            placeholder="Los Angeles (LAX)"
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Departure Date</label>
        <input
          className="form-input"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Passengers</label>
          <select
            className="form-select"
            value={passengers}
            onChange={e => setPassengers(e.target.value)}
          >
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <option key={n} value={n}>{n} passenger{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Cabin Class</label>
          <select
            className="form-select"
            value={cabin}
            onChange={e => setCabin(e.target.value)}
          >
            <option>Economy</option>
            <option>Business</option>
            <option>First</option>
          </select>
        </div>
      </div>

      <div className="btn-row">
        <button
          className="btn-primary"
          onClick={() => onNext({ from, to, date, passengers, cabin })}
        >
          Search Flights →
        </button>
      </div>
    </div>
  );
}
