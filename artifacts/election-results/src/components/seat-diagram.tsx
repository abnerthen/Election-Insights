import React from "react";
import { PartySeatCount } from "@workspace/api-client-react";

interface SeatDiagramProps {
  seats: PartySeatCount[];
  totalSeats: number;
  majorityThreshold?: number;
}

export function SeatDiagram({ seats, totalSeats, majorityThreshold }: SeatDiagramProps) {
  // Compute positions for a hemicycle (semicircle)
  // We'll create a grid of seats
  const rows = 12;
  const seatsData = [];
  
  // Flatten seats into an array
  let flatSeats: { partyName: string; color: string; id: string }[] = [];
  seats.forEach(party => {
    for (let i = 0; i < party.seatsWon; i++) {
      flatSeats.push({
        partyName: party.partyName,
        color: party.partyColor,
        id: `${party.partyId}-${i}`
      });
    }
  });
  
  // Fill the rest with grey
  const declaredSeats = flatSeats.length;
  const pendingSeats = Math.max(0, totalSeats - declaredSeats);
  
  for (let i = 0; i < pendingSeats; i++) {
    flatSeats.push({
      partyName: "Undeclared",
      color: "#334155", // slate-700
      id: `pending-${i}`
    });
  }

  // Calculate positions in arcs
  const cx = 400;
  const cy = 350;
  
  const arcElements = [];
  
  let currentSeatIndex = 0;
  
  // To make a nice semi-circle we distribute seats across rings
  // Inner ring gets fewer seats, outer ring gets more
  let seatsPerRing = [];
  let ringCount = 10;
  let remainingSeats = totalSeats;
  
  for (let i = 0; i < ringCount; i++) {
    // Formula to distribute seats proportionally to radius
    let fraction = (i + 5) / (ringCount * 1.5 + 5);
    let count = Math.round(totalSeats * fraction / ringCount * 2);
    if (i === ringCount - 1) count = remainingSeats;
    if (count > remainingSeats) count = remainingSeats;
    seatsPerRing.push(count);
    remainingSeats -= count;
  }
  
  // Adjust if we didn't hit total exactly due to rounding
  if (remainingSeats > 0) {
    seatsPerRing[ringCount - 1] += remainingSeats;
  }
  
  // Reverse to build from inner to outer
  // seatsPerRing = seatsPerRing.reverse();
  
  const innerRadius = 100;
  const outerRadius = 350;
  const radiusStep = (outerRadius - innerRadius) / ringCount;
  
  for (let ring = 0; ring < ringCount; ring++) {
    const radius = innerRadius + ring * radiusStep;
    const count = seatsPerRing[ring];
    
    for (let s = 0; s < count; s++) {
      // Angle from 180 degrees (PI) to 0 degrees (0)
      const angle = Math.PI - (s / Math.max(1, count - 1)) * Math.PI;
      const x = cx + radius * Math.cos(angle);
      const y = cy - radius * Math.sin(angle);
      
      const seat = flatSeats[currentSeatIndex];
      
      if (seat) {
        arcElements.push(
          <circle 
            key={seat.id}
            cx={x} 
            cy={y} 
            r={6} 
            fill={seat.color}
            className="transition-all duration-1000 ease-in-out hover:r-[8px] hover:stroke-white hover:stroke-2"
          >
            <title>{seat.partyName}</title>
          </circle>
        );
      }
      currentSeatIndex++;
    }
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full max-w-3xl aspect-[2/1] mb-8">
        <svg viewBox="0 0 800 400" className="w-full h-full overflow-visible">
          {/* Majority Line */}
          {majorityThreshold && (
            <line 
              x1="400" y1="0" 
              x2="400" y2="350" 
              stroke="#64748b" 
              strokeWidth="2" 
              strokeDasharray="4 4" 
              className="opacity-50"
            />
          )}
          
          {arcElements}
          
          {/* Center text */}
          <text x="400" y="320" textAnchor="middle" className="text-6xl font-serif font-bold fill-white">
            {declaredSeats}
          </text>
          <text x="400" y="340" textAnchor="middle" className="text-sm font-sans fill-slate-400 uppercase tracking-widest">
            / {totalSeats} Seats Declared
          </text>
        </svg>
        
        {majorityThreshold && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 bg-slate-800 text-slate-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border border-slate-700">
            Majority ({majorityThreshold})
          </div>
        )}
      </div>
    </div>
  );
}
