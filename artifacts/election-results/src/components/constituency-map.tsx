import { ConstituencyResult } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface ConstituencyMapProps {
  constituencies: ConstituencyResult[];
}

export function ConstituencyMap({ constituencies }: ConstituencyMapProps) {
  const [, setLocation] = useLocation();

  // Create an abstract grid layout based on coordinates or simply sort them
  // We'll map them to a roughly square grid for stylized representation
  const cols = Math.ceil(Math.sqrt(constituencies.length));
  
  // Sort by region, then by name for some geographic correlation
  const sorted = [...constituencies].sort((a, b) => {
    if (a.region !== b.region) return a.region.localeCompare(b.region);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="w-full">
      <div 
        className="grid gap-[2px] mx-auto p-4 bg-card border border-border rounded-lg"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maxWidth: "800px" 
        }}
      >
        {sorted.map((c) => {
          const isDeclared = c.status === "declared";
          const bgColor = isDeclared && c.winningPartyColor ? c.winningPartyColor : "#1e293b"; // slate-800
          
          return (
            <div 
              key={c.id}
              className="aspect-square relative group cursor-pointer transition-transform hover:z-10 hover:scale-125"
              style={{ backgroundColor: bgColor }}
              onClick={() => setLocation(`/constituency/${c.id}`)}
              data-testid={`map-cell-${c.id}`}
            >
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded shadow-xl border border-slate-700 pointer-events-none transition-opacity z-50">
                <div className="font-bold text-sm mb-1">{c.name}</div>
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
        })}
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
