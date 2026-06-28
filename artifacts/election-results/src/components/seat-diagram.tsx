import { PartySeatCount } from "@workspace/api-client-react";

interface SeatDiagramProps {
  seats: PartySeatCount[];
  totalSeats: number;
  majorityThreshold?: number;
}

// Concentric arc layout for 56 seats: must sum to totalSeats
const RINGS = [
  { radius: 80,  count: 8  },
  { radius: 120, count: 12 },
  { radius: 160, count: 16 },
  { radius: 200, count: 20 },
];

export function SeatDiagram({ seats, totalSeats, majorityThreshold }: SeatDiagramProps) {
  const cx = 400;
  const cy = 295;
  const seatR = 9;

  // Build flat ordered seat list: biggest party first (right side), filling right→left
  const sortedParties = [...seats]
    .filter(p => p.seatsWon > 0)
    .sort((a, b) => b.seatsWon - a.seatsWon);

  const flatSeats: { color: string; name: string }[] = [];
  for (const party of sortedParties) {
    for (let i = 0; i < party.seatsWon; i++) {
      flatSeats.push({ color: party.partyColor, name: party.partyName });
    }
  }
  while (flatSeats.length < totalSeats) {
    flatSeats.push({ color: "#1e293b", name: "Undeclared" });
  }

  // Generate positions ring by ring, right→left (k=0 is rightmost)
  // x = cx + r*cos(angle), y = cy - r*sin(angle)
  // angle=0 → right baseline, angle=π → left baseline, angle=π/2 → top
  const positions: { x: number; y: number }[] = [];
  for (const ring of RINGS) {
    const n = ring.count;
    for (let k = 0; k < n; k++) {
      const angle = n === 1 ? Math.PI / 2 : (k / (n - 1)) * Math.PI;
      const x = cx + ring.radius * Math.cos(angle);
      const y = cy - ring.radius * Math.sin(angle);
      positions.push({ x, y });
    }
  }

  const declaredCount = seats.reduce((s, p) => s + p.seatsWon, 0);
  const outerR = RINGS[RINGS.length - 1].radius;

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox="0 0 800 360"
        className="w-full max-w-3xl h-auto overflow-visible"
        aria-label="Hemicycle parliament diagram"
      >
        {/* Arc guide rails */}
        {RINGS.map((ring, i) => (
          <path
            key={`guide-${i}`}
            d={`M ${cx - ring.radius} ${cy} A ${ring.radius} ${ring.radius} 0 0 1 ${cx + ring.radius} ${cy}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}

        {/* Baseline */}
        <line
          x1={cx - outerR - 16}
          y1={cy}
          x2={cx + outerR + 16}
          y2={cy}
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Majority line */}
        {majorityThreshold && (
          <>
            <line
              x1={cx}
              y1={cy - outerR - 10}
              x2={cx}
              y2={cy}
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <rect
              x={cx - 55}
              y={cy - outerR - 28}
              width="110"
              height="20"
              rx="3"
              fill="#1e293b"
              stroke="#334155"
            />
            <text
              x={cx}
              y={cy - outerR - 14}
              textAnchor="middle"
              fontSize="10"
              fontFamily="sans-serif"
              fontWeight="700"
              fill="#94a3b8"
              letterSpacing="1.5"
            >
              MAJORITY ({majorityThreshold})
            </text>
          </>
        )}

        {/* Seat dots */}
        {positions.map((pos, i) => {
          const seat = flatSeats[i];
          if (!seat) return null;
          return (
            <circle
              key={i}
              cx={pos.x}
              cy={pos.y}
              r={seatR}
              fill={seat.color}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="1"
            >
              <title>{seat.name}</title>
            </circle>
          );
        })}

        {/* Centre count */}
        <text
          x={cx}
          y={cy + 36}
          textAnchor="middle"
          fontSize="44"
          fontFamily="Georgia, serif"
          fontWeight="bold"
          fill="white"
        >
          {declaredCount}
        </text>
        <text
          x={cx}
          y={cy + 54}
          textAnchor="middle"
          fontSize="10"
          fontFamily="sans-serif"
          fill="#64748b"
          letterSpacing="2"
        >
          / {totalSeats} SEATS DECLARED
        </text>
      </svg>
    </div>
  );
}
