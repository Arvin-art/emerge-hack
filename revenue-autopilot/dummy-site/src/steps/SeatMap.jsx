import { useState } from 'react';

const COLS        = ['A', 'B', 'C', 'D', 'E', 'F'];
const ROWS        = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const COL_X       = { A: 20, B: 57, C: 94, D: 142, E: 179, F: 216 };
const ROW_Y_START = 44;
const ROW_H       = 33;
const SEAT_W      = 32;
const SEAT_H      = 26;

const MOCK_OCCUPIED = new Set([
  '10B','10E','11A','11D','11F','12B','12C','13A','13E',
  '14B','14D','15C','15F','16A','16E','17B','17D','18C',
  '18F','19A','19D','20B','20E',
]);

export default function SeatMap({ originalSelection, selectedSeat, onSelect }) {
  const [hovered, setHovered] = useState(null);

  function getFill(seatId) {
    if (MOCK_OCCUPIED.has(seatId))    return '#3a3a3c';
    if (seatId === selectedSeat)      return '#0071e3';
    if (seatId === originalSelection) return '#C9A84C';
    if (seatId === hovered)           return '#d1d1d6';
    return '#e5e5ea';
  }

  function handleClick(seatId) {
    if (!MOCK_OCCUPIED.has(seatId)) onSelect(seatId);
  }

  return (
    <div className="seat-map-container">
      <svg viewBox="0 0 260 410" width="100%" style={{ maxWidth: 260 }}>
        {COLS.map(col => (
          <text
            key={col}
            x={COL_X[col] + SEAT_W / 2}
            y={28}
            textAnchor="middle"
            fontSize={11}
            fill="#86868b"
            fontFamily="Inter, sans-serif"
          >
            {col}
          </text>
        ))}

        <text x={118} y={28} textAnchor="middle" fontSize={10} fill="#86868b" fontFamily="Inter, sans-serif">✈</text>

        {ROWS.map((row, ri) => {
          const y = ROW_Y_START + ri * ROW_H;
          return (
            <g key={row}>
              <text
                x={6}
                y={y + SEAT_H / 2 + 4}
                fontSize={10}
                fill="#86868b"
                fontFamily="Inter, sans-serif"
              >
                {row}
              </text>
              {COLS.map(col => {
                const seatId   = `${row}${col}`;
                const occupied = MOCK_OCCUPIED.has(seatId);
                return (
                  <rect
                    key={seatId}
                    data-seat={seatId}
                    x={COL_X[col]}
                    y={y}
                    width={SEAT_W}
                    height={SEAT_H}
                    rx={4}
                    fill={getFill(seatId)}
                    cursor={occupied ? 'not-allowed' : 'pointer'}
                    style={{ transition: 'fill 0.15s' }}
                    onClick={() => handleClick(seatId)}
                    onMouseEnter={() => { if (!occupied) setHovered(seatId); }}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      <div className="seat-legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: '#e5e5ea' }} />
          Available
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: '#3a3a3c' }} />
          Occupied
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: '#0071e3' }} />
          Your Choice
        </span>
        {originalSelection && (
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#C9A84C' }} />
            Prior Pick
          </span>
        )}
      </div>
    </div>
  );
}
