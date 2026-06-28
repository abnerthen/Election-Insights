interface GaugeCardProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  subtitle?: string;
  color?: string;
  formatValue?: (v: number) => string;
}

export function GaugeCard({
  label,
  value,
  max = 100,
  unit = "%",
  subtitle,
  color = "#3b82f6",
  formatValue,
}: GaugeCardProps) {
  const pct = Math.min(Math.max(value / max, 0), 1);

  // Semi-circle gauge geometry
  const W = 160;
  const H = 90;
  const cx = W / 2;
  const cy = H - 10;
  const R = 62;
  const strokeW = 10;

  // Arc path helper: semi-circle from 180° (left) to 0° (right)
  // We use stroke-dasharray trick on a full semi-circle path
  const r = R;
  // Full arc length of a semi-circle
  const arcLen = Math.PI * r;
  const filled = arcLen * pct;
  const gap = arcLen - filled;

  // The path goes from left (180°) counter-clockwise to right (0°)
  // But SVG arcs: we go from left baseline point to right baseline point
  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;

  const arcPath = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;

  // Needle angle: maps 0 → 180°, max → 0° (i.e., left to right)
  const needleAngleDeg = 180 - pct * 180;
  const needleRad = (needleAngleDeg * Math.PI) / 180;
  const needleLen = r - strokeW - 4;
  const nx = cx + needleLen * Math.cos(Math.PI - needleRad * 0);
  // Actually let's do: angle from left (180°) sweeping right
  const theta = Math.PI * (1 - pct); // π when value=0, 0 when value=max
  const needleX = cx + needleLen * Math.cos(theta);
  const needleY = cy - needleLen * Math.sin(theta);

  const displayValue = formatValue ? formatValue(value) : `${value.toFixed(1)}${unit}`;

  return (
    <div className="bg-card border border-border p-4 rounded-lg flex flex-col">
      <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-2">
        {label}
      </span>

      <div className="flex-1 flex flex-col items-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-w-[180px]"
          aria-label={`${label}: ${displayValue}`}
        >
          {/* Background track */}
          <path
            d={arcPath}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />

          {/* Colored fill arc */}
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${gap + 1}`}
            strokeDashoffset={0}
            style={{ opacity: 0.9 }}
          />

          {/* Tick marks at 25%, 50%, 75% */}
          {[0.25, 0.5, 0.75].map((t) => {
            const ta = Math.PI * (1 - t);
            const x1 = cx + (r - strokeW - 2) * Math.cos(ta);
            const y1 = cy - (r - strokeW - 2) * Math.sin(ta);
            const x2 = cx + (r + 2) * Math.cos(ta);
            const y2 = cy - (r + 2) * Math.sin(ta);
            return (
              <line
                key={t}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#334155" strokeWidth="1.5"
              />
            );
          })}

          {/* Needle */}
          <line
            x1={cx} y1={cy}
            x2={needleX} y2={needleY}
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{ opacity: 0.8 }}
          />
          <circle cx={cx} cy={cy} r="3" fill="white" opacity="0.7" />

          {/* Value label in center */}
          <text
            x={cx} y={cy - 4}
            textAnchor="middle"
            fontSize="15"
            fontFamily="Georgia, serif"
            fontWeight="bold"
            fill="white"
          >
            {displayValue}
          </text>

          {/* Min / max labels */}
          <text x={startX - 2} y={cy + 12} textAnchor="middle" fontSize="8" fill="#475569" fontFamily="sans-serif">0</text>
          <text x={endX + 2} y={cy + 12} textAnchor="middle" fontSize="8" fill="#475569" fontFamily="sans-serif">{max}{unit}</text>
        </svg>

        {subtitle && (
          <p className="text-xs text-muted-foreground text-center mt-1 leading-tight">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
