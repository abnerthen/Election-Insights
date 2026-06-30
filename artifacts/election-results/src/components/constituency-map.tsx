import { useState } from "react";
import { ConstituencyResult } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface ConstituencyMapProps {
  constituencies: ConstituencyResult[];
}

export function ConstituencyMap({ constituencies }: ConstituencyMapProps) {
  const [, setLocation] = useLocation();
  const [sortBy, setSortBy] = useState<"name" | "code">("name");

  // Check if constituencies have custom grid coordinates
  const hasGridCoords = constituencies.some(c => (c as any).gridX != null && (c as any).gridY != null);

  // Create an abstract grid layout based on coordinates or simply sort them
  const cols = Math.ceil(Math.sqrt(constituencies.length));

  const compareCodes = (a: string | null | undefined, b: string | null | undefined) => {
    const codeA = a || "";
    const codeB = b || "";
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
  };
  
  // Sort by region/name or by seat code
  const sorted = [...constituencies].sort((a, b) => {
    if (sortBy === "code") {
      return compareCodes(a.code, b.code);
    }
    if (a.region !== b.region) return a.region.localeCompare(b.region);
    return a.name.localeCompare(b.name);
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
      <div className="flex justify-between items-center mb-4 max-w-[800px] mx-auto px-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
          Constituency Grid View
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Sort by:</span>
          <div className="bg-secondary/40 p-0.5 rounded border border-border/40 flex text-xs">
            <button
              type="button"
              onClick={() => setSortBy("name")}
              className={`px-2 py-1 rounded font-bold uppercase tracking-wider transition-colors ${sortBy === "name" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Name
            </button>
            <button
              type="button"
              onClick={() => setSortBy("code")}
              className={`px-2 py-1 rounded font-bold uppercase tracking-wider transition-colors ${sortBy === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Code
            </button>
          </div>
        </div>
      </div>

      <div 
        className="grid gap-[2px] mx-auto p-4 bg-card border border-border rounded-lg"
        style={{ 
          gridTemplateColumns: hasGridCoords ? "repeat(15, minmax(0, 1fr))" : `repeat(${cols}, minmax(0, 1fr))`,
          maxWidth: "800px" 
        }}
      >
        {hasGridCoords ? (
          gridCells.map((cell) => {
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
                    {/* Arrow */}
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
          })
        ) : (
          sorted.map((c: any) => {
            const isDeclared = c.status === "declared";
            const bgColor = isDeclared && c.winningPartyColor ? c.winningPartyColor : "#1e293b"; // slate-800
            
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
                  
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              </div>
            );
          })
        )}
      </div>
      
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
