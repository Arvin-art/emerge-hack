import { useState } from 'react';
import SeatMap from './SeatMap';

export default function SeatStep({ originalSelection, onNext, onBack }) {
  const [selectedSeat, setSelectedSeat] = useState(null);

  return (
    <div className="step-card step-card-wide">
      <div className="step-progress">
        <div className="step-dot done" />
        <div className="step-dot done" />
        <div className="step-dot active" />
        <div className="step-dot" />
      </div>
      <p className="step-eyebrow">Step 3 of 4</p>
      <h1 className="step-title">Choose Your Seat</h1>
      <p className="step-subtitle">Rows 10–20 · Economy class</p>

      <input type="hidden" data-cache="seat" value={selectedSeat || ''} readOnly />

      <SeatMap
        originalSelection={originalSelection}
        selectedSeat={selectedSeat}
        onSelect={setSelectedSeat}
      />

      {selectedSeat && (
        <p className="seat-selected-label">
          Selected: <strong>{selectedSeat}</strong>
        </p>
      )}

      <div className="btn-row">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <button
          className="btn-primary"
          disabled={!selectedSeat}
          style={!selectedSeat ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          onClick={() => onNext({ seat: selectedSeat })}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
