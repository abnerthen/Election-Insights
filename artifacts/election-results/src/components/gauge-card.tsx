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
  color = "#10b981", // default emerald green
  formatValue,
}: GaugeCardProps) {
  const pct = Math.min(Math.max(value / max, 0), 1);

  // Semi-circle gauge geometry
  const W = 160;
  const H = 72;
  const cx = W / 2;
  const cy = H - 4;
  const r = 62;
  const strokeW = 12;

  // Arc path helper: semi-circle from left to right
  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;

  const arcPath = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;
  const arcLen = Math.PI * r;
  const filled = arcLen * pct;
  const gap = arcLen - filled;

  const displayValue = formatValue ? formatValue(value) : `${value.toFixed(1)}${unit}`;

  return (
    <div className="bg-card border border-border p-4 rounded-lg flex flex-col items-center">
      <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold self-start mb-4">
        {label}
      </span>

      <div className="relative w-full max-w-[160px] flex justify-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
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
            className="transition-all duration-500 ease-out"
          />
        </svg>
      </div>

      <div className="text-center -mt-2 relative z-10">
        <div className="text-3xl font-bold font-serif tracking-tight text-foreground">
          {displayValue}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 leading-tight max-w-[200px]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
