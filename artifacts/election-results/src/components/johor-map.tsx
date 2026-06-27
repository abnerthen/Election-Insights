import { useState } from "react";
import { useLocation } from "wouter";
import { ConstituencyResult } from "@workspace/api-client-react";

interface JohorMapProps {
  constituencies: ConstituencyResult[];
}

// All 56 Johor DUN seats with approximate geographic coordinates
// Ordered by district, matching the constituency names seeded in the DB
const DUN_POSITIONS: Record<string, [number, number]> = {
  // Segamat District (north)
  "Buloh Kasap":    [102.78, 2.53],
  "Jementah":       [102.98, 2.62],
  "Pemanis":        [103.05, 2.52],
  "Tenang":         [102.98, 2.37],
  "Bekok":          [103.12, 2.43],
  "Serom":          [102.92, 2.24],
  "Bukit Kepong":   [102.75, 2.44],
  "Gambir":         [103.09, 2.32],
  // Muar / Tangkak District (northwest)
  "Tangkak":        [102.98, 2.27],
  "Maharani":       [102.77, 2.05],
  "Sungai Abong":   [102.85, 2.10],
  "Parit Jawa":     [102.82, 1.93],
  "Bukit Serampang":[102.93, 2.16],
  "Sungai Balang":  [102.96, 1.97],
  "Bukit Naning":   [102.88, 2.20],
  "Jorak":          [102.88, 2.33],
  // Batu Pahat District (southwest)
  "Senggarang":     [102.97, 1.87],
  "Yong Peng":      [103.07, 2.00],
  "Bentayan":       [102.88, 1.93],
  "Semerah":        [102.99, 1.77],
  "Sri Gading":     [102.87, 1.75],
  "Bukit Pasir":    [102.93, 1.72],
  "Rengit":         [102.99, 1.68],
  // Pontian District (south-west)
  "Kukup":          [103.42, 1.33],
  "Pekan Nanas":    [103.53, 1.55],
  "Benut":          [103.25, 1.43],
  "Ayer Baloi":     [103.14, 1.50],
  "Bukit Permai":   [103.47, 1.62],
  "Rimba Terjun":   [103.37, 1.55],
  // Kulai / Iskandar Puteri (south-central)
  "Skudai":         [103.67, 1.58],
  "Senai":          [103.67, 1.65],
  "Bukit Batu":     [103.68, 1.72],
  "Kulai":          [103.60, 1.67],
  "Cangkat":        [103.52, 1.73],
  // Johor Bahru District (southeast)
  "Permas":         [103.81, 1.49],
  "Larkin":         [103.73, 1.50],
  "Johor Jaya":     [103.78, 1.52],
  "Kempas":         [103.68, 1.53],
  "Stulang":        [103.75, 1.46],
  "Bukit Chagar":   [103.72, 1.42],
  "Tiram":          [103.85, 1.55],
  // Kluang District (central)
  "Paloh":          [103.38, 2.10],
  "Mengkibol":      [103.32, 2.02],
  "Mahkota":        [103.42, 2.02],
  "Simpang Masai":  [103.42, 1.85],
  "Chamek":         [103.30, 2.18],
  "Kemelah":        [103.45, 2.18],
  "Nitar":          [103.52, 2.10],
  // Kota Tinggi / Mersing District (east)
  "Johor Lama":     [103.97, 1.78],
  "Tanjung Surat":  [103.97, 1.65],
  "Sedili":         [104.10, 1.95],
  "Penawar":        [104.10, 1.73],
  "Kota Tinggi":    [103.90, 1.73],
  "Mersing":        [103.82, 2.45],
  "Tenggaroh":      [103.60, 2.30],
  "Tanjung Gemok":  [103.75, 2.35],
};

// Simplified Johor state outline polygon (lng, lat pairs)
const JOHOR_OUTLINE: [number, number][] = [
  [102.58, 2.68], [102.72, 2.72], [103.00, 2.72], [103.35, 2.62],
  [103.60, 2.52], [103.82, 2.50], [104.00, 2.48], [104.18, 2.30],
  [104.28, 2.10], [104.25, 1.85], [104.22, 1.65], [104.15, 1.45],
  [104.05, 1.30], [103.92, 1.25], [103.78, 1.22], [103.60, 1.22],
  [103.42, 1.25], [103.25, 1.35], [103.08, 1.50], [102.95, 1.62],
  [102.85, 1.72], [102.75, 1.92], [102.65, 2.15], [102.58, 2.42],
  [102.58, 2.68],
];

const LNG_MIN = 102.5;
const LNG_MAX = 104.35;
const LAT_MIN = 1.15;
const LAT_MAX = 2.78;

const SVG_W = 800;
const SVG_H = 480;
const PAD = 24;

function project(lng: number, lat: number): [number, number] {
  const x = PAD + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (SVG_W - PAD * 2);
  const y = PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (SVG_H - PAD * 2);
  return [x, y];
}

const outlinePoints = JOHOR_OUTLINE.map(([lng, lat]) => project(lng, lat))
  .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export function JohorMap({ constituencies }: JohorMapProps) {
  const [, setLocation] = useLocation();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; c: ConstituencyResult } | null>(null);

  const lookup = new Map(constituencies.map(c => [c.name, c]));

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full max-w-4xl">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-auto"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* State outline */}
          <polygon
            points={outlinePoints}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* District label zones */}
          {[
            { label: "SEGAMAT", lng: 102.92, lat: 2.58 },
            { label: "MUAR", lng: 102.83, lat: 2.08 },
            { label: "BATU PAHAT", lng: 102.91, lat: 1.80 },
            { label: "PONTIAN", lng: 103.30, lat: 1.48 },
            { label: "JOHOR BAHRU", lng: 103.75, lat: 1.44 },
            { label: "KLUANG", lng: 103.40, lat: 2.08 },
            { label: "MERSING", lng: 103.82, lat: 2.40 },
            { label: "KOTA TINGGI", lng: 104.05, lat: 1.72 },
          ].map(({ label, lng, lat }) => {
            const [x, y] = project(lng, lat);
            return (
              <text
                key={label}
                x={x} y={y}
                textAnchor="middle"
                fontSize="9"
                fill="#475569"
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="1"
                className="select-none pointer-events-none"
              >
                {label}
              </text>
            );
          })}

          {/* Constituency circles */}
          {Object.entries(DUN_POSITIONS).map(([name, [lng, lat]]) => {
            const [x, y] = project(lng, lat);
            const c = lookup.get(name);
            const isDeclared = c?.status === "declared";
            const color = isDeclared && c?.winningPartyColor ? c.winningPartyColor : "#1e293b";
            const stroke = isDeclared && c?.winningPartyColor ? c.winningPartyColor : "#334155";

            return (
              <g key={name}>
                <circle
                  cx={x} cy={y} r={8}
                  fill={color}
                  stroke={stroke}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-200 hover:r-10"
                  style={{ filter: isDeclared ? `drop-shadow(0 0 4px ${color}88)` : "none" }}
                  onMouseEnter={(e) => c && setTooltip({ x, y, c })}
                  onClick={() => c && setLocation(`/constituency/${c.id}`)}
                />
              </g>
            );
          })}

          {/* Tooltip */}
          {tooltip && (() => {
            const { x, y, c } = tooltip;
            const isDeclared = c.status === "declared";
            // Flip tooltip if near bottom
            const tipY = y > SVG_H - 100 ? y - 120 : y + 16;
            const tipX = Math.min(Math.max(x - 75, 4), SVG_W - 154);
            return (
              <g>
                <rect
                  x={tipX} y={tipY}
                  width={150} height={isDeclared ? 88 : 48}
                  rx={4} fill="#0f172a" stroke="#334155" strokeWidth="1"
                />
                <text x={tipX + 8} y={tipY + 18} fontSize="11" fontWeight="bold" fill="white" fontFamily="sans-serif">
                  {c.name}
                </text>
                <text x={tipX + 8} y={tipY + 33} fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
                  {c.region}
                </text>
                {isDeclared ? (
                  <>
                    <rect x={tipX + 8} y={tipY + 42} width={8} height={8} rx={2} fill={c.winningPartyColor || "#64748b"} />
                    <text x={tipX + 20} y={tipY + 50} fontSize="10" fontWeight="bold" fill={c.winningPartyColor || "white"} fontFamily="sans-serif">
                      {c.winningPartyAbbreviation}
                    </text>
                    <text x={tipX + 8} y={tipY + 66} fontSize="9" fill="#cbd5e1" fontFamily="sans-serif">
                      {c.winningCandidateName}
                    </text>
                    <text x={tipX + 8} y={tipY + 80} fontSize="9" fill="#64748b" fontFamily="sans-serif">
                      Turnout: {c.turnoutPercent.toFixed(1)}%
                    </text>
                  </>
                ) : (
                  <text x={tipX + 8} y={tipY + 44} fontSize="10" fill="#64748b" fontFamily="sans-serif" fontStyle="italic">
                    Pending
                  </text>
                )}
              </g>
            );
          })()}
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          {Array.from(new Set(constituencies.filter(c => c.winningPartyColor).map(c => c.winningPartyAbbreviation))).map(abbr => {
            const party = constituencies.find(c => c.winningPartyAbbreviation === abbr);
            return party ? (
              <div key={abbr} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: party.winningPartyColor || "#64748b" }} />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{abbr}</span>
              </div>
            ) : null;
          })}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#1e293b] border border-slate-700" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Undeclared</span>
          </div>
        </div>
      </div>
    </div>
  );
}
