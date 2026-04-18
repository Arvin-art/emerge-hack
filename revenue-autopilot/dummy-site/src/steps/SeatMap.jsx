import { useState } from 'react';

const COLS        = ['A', 'B', 'C', 'D', 'E', 'F'];
const ROWS        = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
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
    if (MOCK_OCCUPIED.has(seatId))    return '#9ca3af';
    if (seatId === selectedSeat)      return '#2563eb';
    if (seatId === originalSelection) return '#d97706';
    if (seatId === hovered)           return '#bfdbfe';
    return '#dbeafe';
  }

  function handleClick(seatId) {
    if (!MOCK_OCCUPIED.has(seatId)) onSelect(seatId);
  }

  return (
    <div className="seat-map-container" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #333', borderRadius: '8px', padding: '10px 0', background: '#1c1c1e' }}>
      <svg viewBox={`0 0 260 ${44 + ROWS.length * 33 + 20}`} width="100%" style={{ maxWidth: 260, display: 'block', margin: '0 auto' }}>
        {COLS.map(col => (
          <text
            key={col}
            x={COL_X[col] + SEAT_W / 2}
            y={28}
            textAnchor="middle"
            fontSize={11}
            fill="#374151"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
          >
            {col}
          </text>
        ))}

        <text x={118} y={28} textAnchor="middle" fontSize={10} fill="#374151" fontFamily="Inter, sans-serif">✈</text>

        {ROWS.map((row, ri) => {
          const y = ROW_Y_START + ri * ROW_H;
          return (
            <g key={row}>
              <text
                x={6}
                y={y + SEAT_H / 2 + 4}
                fontSize={10}
                fill="#374151"
                fontFamily="Inter, sans-serif"
                fontWeight="500"
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

      <div className="seat-legend" style={{display:'flex', gap:'14px', marginTop:'12px', fontSize:'12px', color:'#374151'}}>
        <span style={{display:'flex',alignItems:'center',gap:'5px'}}>
          <span style={{display:'inline-block',width:12,height:12,borderRadius:3,background:'#dbeafe',border:'1px solid #93c5fd'}}/>
          Available
        </span>
        <span style={{display:'flex',alignItems:'center',gap:'5px'}}>
          <span style={{display:'inline-block',width:12,height:12,borderRadius:3,background:'#9ca3af'}}/>
          Occupied
        </span>
        <span style={{display:'flex',alignItems:'center',gap:'5px'}}>
          <span style={{display:'inline-block',width:12,height:12,borderRadius:3,background:'#2563eb'}}/>
          Your Choice
        </span>
        {originalSelection && (
          <span style={{display:'flex',alignItems:'center',gap:'5px'}}>
            <span style={{display:'inline-block',width:12,height:12,borderRadius:3,background:'#d97706'}}/>
            Prior Pick
          </span>
        )}
      </div>
    </div>
  );
}
