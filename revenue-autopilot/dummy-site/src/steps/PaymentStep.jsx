import { useState } from 'react';

const BASE_FARE = 1100;
const SEAT_FEE  = 50;
const TAXES     = 50;
const TOTAL     = BASE_FARE + SEAT_FEE + TAXES;

export default function PaymentStep({ searchData, detailsData, seatData, onBack }) {
  const [cardNum, setCardNum] = useState('');
  const [expiry,  setExpiry]  = useState('');
  const [cvv,     setCvv]     = useState('');

  const hasPassenger = detailsData.firstName && detailsData.lastName;

  return (
    <div className="step-card">
      <div className="step-progress">
        <div className="step-dot done" />
        <div className="step-dot done" />
        <div className="step-dot done" />
        <div className="step-dot active" />
      </div>
      <p className="step-eyebrow">Step 4 of 4</p>
      <h1 className="step-title">Confirm & Pay</h1>
      <p className="step-subtitle">Secure checkout — your seat is held for 8 minutes</p>

      {hasPassenger && (
        <div className="booking-summary">
          <div className="summary-row">
            <span>✈</span>
            <span>
              <strong>{searchData.from || 'JFK'}</strong> → <strong>{searchData.to || 'LAX'}</strong>
              {searchData.date && (
                <span style={{ marginLeft: 8, color: 'rgba(0,0,0,0.4)', fontSize: 13 }}>
                  {searchData.date}
                </span>
              )}
              {searchData.cabin && (
                <span style={{ marginLeft: 8, color: 'rgba(0,0,0,0.4)', fontSize: 13 }}>
                  · {searchData.cabin}
                </span>
              )}
            </span>
          </div>
          <div className="summary-row">
            <span>👤</span>
            <span>
              <strong>{detailsData.firstName} {detailsData.lastName}</strong>
              {searchData.passengers > 1 && (
                <span style={{ marginLeft: 6, color: 'rgba(0,0,0,0.4)', fontSize: 13 }}>
                  +{searchData.passengers - 1} more
                </span>
              )}
            </span>
          </div>
          {seatData.seat && (
            <div className="summary-row">
              <span>💺</span>
              <span>Seat <strong>{seatData.seat}</strong></span>
            </div>
          )}
          <div className="summary-price-breakdown">
            <div className="summary-price-row">
              <span>Base fare</span>
              <span>${BASE_FARE.toLocaleString()}.00</span>
            </div>
            <div className="summary-price-row">
              <span>Seat selection</span>
              <span>${SEAT_FEE}.00</span>
            </div>
            <div className="summary-price-row">
              <span>Taxes & fees</span>
              <span>${TAXES}.00</span>
            </div>
            <div className="summary-price-row summary-price-total">
              <span>Total</span>
              <strong>${TOTAL.toLocaleString()}.00</strong>
            </div>
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Card Number</label>
        <input
          data-cache="cardNum"
          className="form-input"
          placeholder="4242 4242 4242 4242"
          value={cardNum}
          onChange={e => setCardNum(e.target.value)}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Expiry</label>
          <input
            className="form-input"
            placeholder="MM / YY"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">CVV</label>
          <input
            className="form-input"
            placeholder="•••"
            type="password"
            value={cvv}
            onChange={e => setCvv(e.target.value)}
          />
        </div>
      </div>

      <div className="btn-row">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <button className="btn-primary">Pay ${TOTAL.toLocaleString()} →</button>
      </div>
    </div>
  );
}
