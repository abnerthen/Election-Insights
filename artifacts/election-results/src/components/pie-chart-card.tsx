interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartCardProps {
  slices: PieSlice[];
  title?: string;
}

export function PieChartCard({ slices, title }: PieChartCardProps) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  const cx = 80;
  const cy = 80;
  const R = 68;
  const innerR = 36;

  // Build SVG arc paths
  let startAngle = -Math.PI / 2; // start at top
  const paths: { d: string; color: string; label: string; pct: number }[] = [];

  for (const slice of slices) {
    if (slice.value <= 0) continue;
    const angle = (slice.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);

    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);

    const d = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${ix1.toFixed(2)} ${iy1.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)}`,
      "Z",
    ].join(" ");

    paths.push({ d, color: slice.color, label: slice.label, pct: (slice.value / total) * 100 });
    startAngle = endAngle;
  }

  const topSlices = slices.filter(s => s.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <div className="bg-card border border-border p-4 rounded-lg flex flex-col">
      {title && (
        <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-3">
          {title}
        </span>
      )}

      <div className="flex items-center gap-4 flex-1">
        {/* Pie */}
        <svg viewBox="0 0 160 160" className="w-32 h-32 flex-shrink-0">
          {paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill={p.color}
              stroke="#0f172a"
              strokeWidth="1.5"
            >
              <title>{p.label}: {p.pct.toFixed(2)}%</title>
            </path>
          ))}
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {topSlices.map(sl => (
            <div key={sl.label} className="flex items-center gap-2 min-w-0">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: sl.color }}
              />
              <span className="text-xs font-bold text-muted-foreground truncate flex-1">
                {sl.label}
              </span>
              <span className="text-xs font-semibold text-foreground flex-shrink-0">
                {((sl.value / total) * 100).toFixed(2)}%
              </span>
            </div>
          ))}
          {slices.filter(s => s.value > 0).length > 5 && (
            <span className="text-xs text-muted-foreground">+ others</span>
          )}
        </div>
      </div>
    </div>
  );
}
