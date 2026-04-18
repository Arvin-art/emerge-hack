import { useState, useEffect } from 'react';

export default function DetailsStep({ initialData, showCrackBadge, onNext, onBack }) {
  const [firstName, setFirstName] = useState(initialData.firstName || '');
  const [lastName,  setLastName]  = useState(initialData.lastName  || '');
  const [email,     setEmail]     = useState(initialData.email     || '');

  useEffect(() => {
    setFirstName(initialData.firstName || '');
    setLastName(initialData.lastName   || '');
    setEmail(initialData.email         || '');
  }, [initialData]);

  return (
    <div className="step-card">
      <div className="step-progress">
        <div className="step-dot done" />
        <div className="step-dot active" />
        <div className="step-dot" />
        <div className="step-dot" />
      </div>
      <p className="step-eyebrow">Step 2 of 4</p>
      <h1 className="step-title">Passenger Details</h1>
      {showCrackBadge && (
        <p className="step-subtitle">
          <span className="crack-badge">⚠ State Lost — your data was cleared</span>
        </p>
      )}
      {!showCrackBadge && (
        <p className="step-subtitle">Tell us who&apos;s flying today</p>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">First Name</label>
          <input
            id="first-name"
            data-cache="firstName"
            className="form-input"
            placeholder="John"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Last Name</label>
          <input
            data-cache="lastName"
            className="form-input"
            placeholder="Doe"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Email Address</label>
        <input
          data-cache="email"
          className="form-input"
          type="email"
          placeholder="john@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>

      <div className="btn-row">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <button
          className="btn-primary"
          onClick={() => onNext({ firstName, lastName, email })}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
