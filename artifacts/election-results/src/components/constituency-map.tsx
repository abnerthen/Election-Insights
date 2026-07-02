import { ConstituencyResult } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface ConstituencyMapProps {
  constituencies: ConstituencyResult[];
}

export function ConstituencyMap({ constituencies }: ConstituencyMapProps) {
  const [, setLocation] = useLocation();

  // Check if constituencies have custom grid coordinates
  const hasGridCoords = constituencies.some(c => (c as any).gridX != null && (c as any).gridY != null);

  const compareCodes = (a: string | null | undefined, b: string | null | undefined) => {
    const codeA = a || "";
    const codeB = b || "";
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
  };

  // Group by region for the non-coordinate row layout
  const regionsMap: Record<string, ConstituencyResult[]> = {};
  constituencies.forEach(c => {
    const regionName = c.region || "Other";
    if (!regionsMap[regionName]) {
      regionsMap[regionName] = [];
    }
    regionsMap[regionName].push(c);
  });

  const sortedRegions = Object.keys(regionsMap).sort((a, b) => a.localeCompare(b));
  sortedRegions.forEach(regionName => {
    regionsMap[regionName].sort((a, b) => compareCodes(a.code, b.code));
  });

  // Calculate 15x15 grid cells if coordinates are present
  const gridSize = 15;
  const gridCells: { x: number; y: number; constituency?: ConstituencyResult }[] = [];
  if (hasGridCoords) {
    const constLookup = new Map(
      constituencies
        .filter(c => c.gridX != null && c.gridY != null)
        .map(c => [`${c.gridX},${c.gridY}`, c])
    );
    for (let r = 1; r <= gridSize; r++) {
      for (let c = 1; c <= gridSize; c++) {
        const key = `${c},${r}`;
        const constItem = constLookup.get(key);
        gridCells.push({ x: c, y: r, constituency: constItem });
      }
    }
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6 max-w-[800px] mx-auto px-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
          Constituency Grid View
        </div>
      </div>

      {hasGridCoords ? (
        <div 
          className="grid gap-[2px] mx-auto p-4 bg-card border border-border rounded-lg"
          style={{ 
            gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
            maxWidth: "800px" 
          }}
        >
          {gridCells.map((cell) => {
            if (cell.constituency) {
              const c = cell.constituency;
              const isDeclared = c.status === "declared";
              const bgColor = isDeclared && c.winningPartyColor ? c.winningPartyColor : "#1e293b";
              
              return (
                <div 
                  key={c.id}
                  className="aspect-square relative group cursor-pointer transition-transform hover:z-10 hover:scale-125 rounded-sm"
                  style={{ backgroundColor: bgColor }}
                  onClick={() => setLocation(`/constituency/${c.id}`)}
                  data-testid={`map-cell-${c.id}`}
                >
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded shadow-xl border border-slate-700 pointer-events-none transition-opacity z-50">
                    <div className="font-bold text-sm mb-1">
                      {c.code ? `[${c.code}] ` : ""}{c.name}
                    </div>
                    {isDeclared ? (
                      <>
                        <div className="text-xs text-slate-300">{c.winningPartyName} hold/gain</div>
                        <div className="text-xs font-semibold mt-1" style={{ color: c.winningPartyColor || 'white' }}>
                          {c.winningCandidateName}
                        </div>
                        {c.margin && (
                          <div className="text-xs mt-1 bg-slate-800 px-1 py-0.5 rounded inline-block">
                            Margin: {c.margin.toLocaleString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 italic">Pending...</div>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>
                </div>
              );
            } else {
              return (
                <div 
                  key={`empty-${cell.x}-${cell.y}`} 
                  className="aspect-square border border-border/5 bg-secondary/5 rounded-sm pointer-events-none opacity-20"
                />
              );
            }
          })}
        </div>
      ) : (
        <div className="space-y-3 max-w-[800px] mx-auto p-4 bg-card border border-border rounded-lg shadow-xl">
          {sortedRegions.map(regionName => {
            const list = regionsMap[regionName];
            return (
              <div key={regionName} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-border/40 last:border-0">
                {/* Region name label */}
                <div className="w-full sm:w-36 flex-shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {regionName}
                </div>
                
                {/* Constituencies blocks */}
                <div className="flex flex-wrap gap-1.5">
                  {list.map(c => {
                    const isDeclared = c.status === "declared";
                    const bgColor = isDeclared && c.winningPartyColor ? c.winningPartyColor : "#1e293b";
                    
                    return (
                      <div
                        key={c.id}
                        className="w-12 h-12 relative group cursor-pointer transition-all hover:scale-110 rounded border border-border/20 flex flex-col justify-between p-1.5 select-none"
                        style={{ backgroundColor: bgColor }}
                        onClick={() => setLocation(`/constituency/${c.id}`)}
                        data-testid={`map-cell-${c.id}`}
                      >
                        {/* Small Seat Code Display inside block */}
                        <div className="text-[10px] font-bold text-white leading-none">
                          {c.code || ""}
                        </div>
                        
                        {/* Tiny text indicating winning party abbreviated */}
                        <div className="text-[10px] font-extrabold text-white text-right self-end leading-none">
                          {isDeclared ? c.winningPartyAbbreviation : ""}
                        </div>

                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded shadow-xl border border-slate-700 pointer-events-none transition-opacity z-50">
                          <div className="font-bold text-sm mb-1">
                            {c.code ? `[${c.code}] ` : ""}{c.name}
                          </div>
                          {isDeclared ? (
                            <>
                              <div className="text-xs text-slate-300">{c.winningPartyName} hold/gain</div>
                              <div className="text-xs font-semibold mt-1" style={{ color: c.winningPartyColor || 'white' }}>
                                {c.winningCandidateName}
                              </div>
                              {c.margin && (
                                <div className="text-xs mt-1 bg-slate-800 px-1 py-0.5 rounded inline-block">
                                  Margin: {c.margin.toLocaleString()}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-xs text-slate-400 italic">Pending...</div>
                          )}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#1e293b] border border-slate-700 rounded-sm"></div>
          <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Undeclared</span>
        </div>
      </div>
    </div>
  );
}
