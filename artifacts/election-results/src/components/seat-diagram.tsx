import { PartySeatCount } from "@workspace/api-client-react";

interface SeatDiagramProps {
  seats: PartySeatCount[];
  totalSeats: number;
  majorityThreshold?: number;
}

// Concentric arc ring definitions for 56 seats
const RINGS = [
  { radius: 78,  count: 8  },
  { radius: 116, count: 12 },
  { radius: 154, count: 16 },
  { radius: 192, count: 20 },
];

const CX = 400;
const CY = 300;
const SEAT_R = 9;

function buildPositions() {
  // Generate all positions then sort by angle (right → left)
  // so that the fill sweeps across all rings simultaneously (correct hemicycle)
  const all: { x: number; y: number; angle: number; radius: number }[] = [];

  for (const ring of RINGS) {
    const n = ring.count;
    for (let k = 0; k < n; k++) {
      // angle=0 → right baseline, angle=π → left baseline
      const angle = n === 1 ? Math.PI / 2 : (k / (n - 1)) * Math.PI;
      const x = CX + ring.radius * Math.cos(angle);
      const y = CY - ring.radius * Math.sin(angle);
      all.push({ x, y, angle, radius: ring.radius });
    }
  }

  // Sort by angle ascending (rightmost first), then by radius ascending (inner first)
  // This produces column-by-column fill from right → left, which is the classic
  // parliament-style hemicycle sector layout.
  all.sort((a, b) => {
    const da = a.angle - b.angle;
    if (Math.abs(da) > 0.0001) return da;
    return a.radius - b.radius;
  });

  return all;
}

const POSITIONS = buildPositions();

export function SeatDiagram({ seats, totalSeats, majorityThreshold }: SeatDiagramProps) {
  // Sort parties: largest first → appears on right (government side)
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
    flatSeats.push({ color: "var(--color-undeclared)", name: "Undeclared" });
  }

  const declaredCount = seats.reduce((s, p) => s + p.seatsWon, 0);
  const outerR = RINGS[RINGS.length - 1].radius;

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox="0 0 800 350"
        className="w-full max-w-3xl h-auto overflow-visible"
        aria-label="Hemicycle parliament diagram"
      >
        {/* Arc guide rails */}
        {RINGS.map((ring, i) => (
          <path
            key={`guide-${i}`}
            d={`M ${CX - ring.radius} ${CY} A ${ring.radius} ${ring.radius} 0 0 1 ${CX + ring.radius} ${CY}`}
            fill="none"
            stroke="currentColor"
            className="text-border/60"
            strokeWidth="1"
          />
        ))}

        {/* Baseline */}
        <line
          x1={CX - outerR - 16} y1={CY}
          x2={CX + outerR + 16} y2={CY}
          stroke="currentColor"
          className="text-border"
          strokeWidth="1.5"
        />

        {/* Majority line */}
        {majorityThreshold && (
          <>
            <line
              x1={CX} y1={CY - outerR - 8}
              x2={CX} y2={CY}
              stroke="currentColor"
              className="text-muted-foreground/40"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <rect
              x={CX - 58}
              y={CY - outerR - 27}
              width="116"
              height="20"
              rx="3"
              fill="currentColor"
              className="text-card stroke-border"
            />
            <text
              x={CX} y={CY - outerR - 13}
              textAnchor="middle" fontSize="10" fontFamily="sans-serif"
              fontWeight="700"
              fill="currentColor"
              className="text-muted-foreground"
              letterSpacing="1.5"
            >
              MAJORITY ({majorityThreshold})
            </text>
          </>
        )}

        {/* Seat dots — rendered in position order (already sorted right→left) */}
        {POSITIONS.map((pos, i) => {
          const seat = flatSeats[i];
          if (!seat) return null;
          return (
            <circle
              key={i}
              cx={pos.x} cy={pos.y}
              r={SEAT_R}
              fill={seat.color}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="1"
            >
              <title>{seat.name}</title>
            </circle>
          );
        })}

        {/* Centre count */}

      </svg>
    </div>
  );
}
