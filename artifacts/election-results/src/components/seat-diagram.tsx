import { useMemo } from "react";
import { PartySeatCount } from "@workspace/api-client-react";

interface SeatDiagramProps {
  seats: PartySeatCount[];
  totalSeats: number;
  majorityThreshold?: number;
}

interface Ring {
  radius: number;
  count: number;
}

const CX = 400;
const SEAT_R = 9;
const TOP_PADDING = 50;
const BOTTOM_PADDING = 20;

// Same geometry (78/38/30.4) that originally produced the fixed 8/12/16/20-seat,
// 56-seat hemicycle — generalized here to any seat count so every assembly
// (Perlis's 15 seats up to the 222-seat federal Parliament) fills its rings
// completely instead of leaving gaps or seats with nowhere to render.
function buildRings(totalSeats: number): Ring[] {
  if (totalSeats <= 0) return [];

  const innerRadius = 78;
  const rowGap = 38;
  const arcSpacing = 30.4;

  const rings: Ring[] = [];
  let radius = innerRadius;
  let cumulative = 0;
  while (cumulative < totalSeats) {
    const count = Math.max(1, Math.round((Math.PI * radius) / arcSpacing));
    rings.push({ radius, count });
    cumulative += count;
    radius += rowGap;
  }

  // The greedy loop above almost always overshoots totalSeats on its last
  // ring — scale every ring down proportionally (not just the last one) so
  // the trim is spread evenly and doesn't leave one ring looking like a
  // sliver next to a full one.
  if (cumulative > totalSeats) {
    const scale = totalSeats / cumulative;
    const floored = rings.map((r) => Math.floor(r.count * scale));
    let remainder = totalSeats - floored.reduce((a, b) => a + b, 0);
    const byRemainder = rings
      .map((r, i) => ({ i, frac: r.count * scale - floored[i] }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < byRemainder.length && remainder > 0; k++) {
      floored[byRemainder[k].i] += 1;
      remainder--;
    }
    rings.forEach((r, i) => {
      r.count = floored[i];
    });
  }

  return rings.filter((r) => r.count > 0);
}

function buildPositions(rings: Ring[]) {
  // Generate all positions then sort by angle (right → left) so that the
  // fill sweeps across all rings simultaneously (correct hemicycle). `y` is
  // relative to the (as-yet-unknown) center — the caller adds CY.
  const all: { x: number; yOffset: number; angle: number; radius: number }[] = [];

  for (const ring of rings) {
    const n = ring.count;
    for (let k = 0; k < n; k++) {
      // angle=0 → right baseline, angle=π → left baseline
      const angle = n === 1 ? Math.PI / 2 : (k / (n - 1)) * Math.PI;
      const x = CX + ring.radius * Math.cos(angle);
      const yOffset = -ring.radius * Math.sin(angle);
      all.push({ x, yOffset, angle, radius: ring.radius });
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

export function SeatDiagram({ seats, totalSeats, majorityThreshold }: SeatDiagramProps) {
  const rings = useMemo(() => buildRings(totalSeats), [totalSeats]);
  const positions = useMemo(() => buildPositions(rings), [rings]);

  const outerR = rings.length > 0 ? rings[rings.length - 1].radius : 0;
  const CY = outerR + TOP_PADDING;
  const viewBoxHeight = CY + BOTTOM_PADDING;

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

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox={`0 0 800 ${viewBoxHeight}`}
        className="w-full max-w-3xl h-auto overflow-visible"
        aria-label="Hemicycle parliament diagram"
      >
        {/* Arc guide rails */}
        {rings.map((ring, i) => (
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
        {positions.map((pos, i) => {
          const seat = flatSeats[i];
          if (!seat) return null;
          return (
            <circle
              key={i}
              cx={pos.x} cy={CY + pos.yOffset}
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
