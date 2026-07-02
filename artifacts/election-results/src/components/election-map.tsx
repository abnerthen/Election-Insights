import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ConstituencyResult } from "@workspace/api-client-react";

interface ElectionMapProps {
  constituencies: ConstituencyResult[];
  scope: "federal" | "state";
  stateName: string | null;
}

export function ElectionMap({ constituencies, scope, stateName }: ElectionMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    c: any;
  } | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const validConsts = constituencies.filter(c => c.latitude !== null && c.longitude !== null);
    if (validConsts.length === 0) return;

    // Premium dark style using CartoDB Dark Matter tiles
    const mapStyle = {
      version: 8,
      sources: {
        "cartodb-dark-tiles": {
          type: "raster",
          tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors, © CARTO"
        }
      },
      layers: [
        {
          id: "cartodb-dark-layer",
          type: "raster",
          source: "cartodb-dark-tiles",
          minzoom: 0,
          maxzoom: 20
        }
      ]
    };

    // Calculate bounding box bounds
    const lats = validConsts.map(c => c.latitude as number);
    const lngs = validConsts.map(c => c.longitude as number);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle as any,
      center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
      zoom: 6,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      // Fit map bounds
      map.fitBounds([minLng, minLat, maxLng, maxLat], {
        padding: 40,
        animate: false
      });

      // Compute Voronoi polygons dynamically
      const getConstituencyGeoPolygon = (
        current: { lng: number; lat: number },
        others: { lng: number; lat: number }[]
      ): [number, number][] => {
        if (others.length === 0) return [];
        const midpoints = others.map(o => {
          const mlng = (current.lng + o.lng) / 2;
          const mlat = (current.lat + o.lat) / 2;
          const dlng = o.lng - current.lng;
          const dlat = o.lat - current.lat;
          const dist = Math.sqrt(dlng * dlng + dlat * dlat);
          return { lng: mlng, lat: mlat, dist };
        });

        midpoints.sort((a, b) => a.dist - b.dist);
        // limit to closest neighbors to form cell bounds
        const closest = midpoints.slice(0, 6);

        closest.sort((a, b) => {
          const angleA = Math.atan2(a.lat - current.lat, a.lng - current.lng);
          const angleB = Math.atan2(b.lat - current.lat, b.lng - current.lng);
          return angleA - angleB;
        });

        const scale = 0.90;
        const polygonCoords = closest.map(p => {
          const slng = current.lng + (p.lng - current.lng) * scale;
          const slat = current.lat + (p.lat - current.lat) * scale;
          return [slng, slat] as [number, number];
        });

        if (polygonCoords.length > 0) {
          polygonCoords.push(polygonCoords[0]);
        }
        return polygonCoords;
      };

      const features = validConsts.map(c => {
        const coords = getConstituencyGeoPolygon(
          { lng: c.longitude as number, lat: c.latitude as number },
          validConsts
            .filter(o => o.id !== c.id)
            .map(o => ({ lng: o.longitude as number, lat: o.latitude as number }))
        );

        return {
          type: "Feature",
          properties: {
            id: c.id,
            electionId: c.electionId,
            name: c.name,
            code: c.code,
            region: c.region,
            status: c.status,
            winningPartyAbbreviation: c.winningPartyAbbreviation,
            winningPartyColor: c.winningPartyColor,
            winningCandidateName: c.winningCandidateName,
            turnoutPercent: c.turnoutPercent,
            registeredVoters: c.registeredVoters,
            votesCast: c.votesCast
          },
          geometry: {
            type: "Polygon",
            coordinates: [coords]
          }
        };
      });

      map.addSource("constituencies", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: features as any
        }
      });

      // Layer 1: Fill
      map.addLayer({
        id: "constituency-fills",
        type: "fill",
        source: "constituencies",
        paint: {
          "fill-color": [
            "coalesce",
            ["get", "winningPartyColor"],
            "#1e293b"
          ],
          "fill-opacity": [
            "case",
            ["==", ["get", "status"], "declared"],
            0.6,
            0.25
          ]
        }
      });

      // Layer 2: Outline borders
      map.addLayer({
        id: "constituency-borders",
        type: "line",
        source: "constituencies",
        paint: {
          "line-color": "#334155",
          "line-width": 1.5
        }
      });

      // Layer 3: Highlight hovered
      map.addLayer({
        id: "constituency-highlight",
        type: "line",
        source: "constituencies",
        paint: {
          "line-color": "#ffffff",
          "line-width": 3
        },
        filter: ["==", ["get", "id"], -1]
      });

      // Click event
      map.on("click", "constituency-fills", (e) => {
        const feature = e.features?.[0];
        if (feature) {
          setLocation(`/constituency/${feature.properties.id}?electionId=${feature.properties.electionId}`);
        }
      });

      // Hover events
      map.on("mousemove", "constituency-fills", (e) => {
        const feature = e.features?.[0];
        if (feature) {
          map.setFilter("constituency-highlight", ["==", ["get", "id"], feature.properties.id]);
          map.getCanvas().style.cursor = "pointer";

          setTooltip({
            x: e.point.x,
            y: e.point.y,
            c: feature.properties
          });
        }
      });

      map.on("mouseleave", "constituency-fills", () => {
        map.setFilter("constituency-highlight", ["==", ["get", "id"], -1]);
        map.getCanvas().style.cursor = "";
        setTooltip(null);
      });
    });

    return () => {
      map.remove();
    };
  }, [constituencies]);

  const validConsts = constituencies.filter(c => c.latitude !== null && c.longitude !== null);
  if (validConsts.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-lg">
        No map coordinates available for this election.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full max-w-4xl border border-border/60 rounded-xl overflow-hidden shadow-2xl">
        <div ref={mapContainerRef} className="w-full h-[500px] bg-slate-950" />

        {/* Map Tooltip */}
        {tooltip && (() => {
          const { x, y, c } = tooltip;
          const isDeclared = c.status === "declared";
          return (
            <div 
              className="absolute pointer-events-none z-50 bg-slate-950/95 backdrop-blur-md text-white p-3 rounded-lg shadow-2xl border border-slate-700 flex flex-col gap-1 w-48 text-xs"
              style={{
                left: `${x + 15}px`,
                top: `${y - 45}px`
              }}
            >
              <div className="font-bold text-sm">
                {c.code ? `[${c.code}] ` : ""}{c.name}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">{c.region}</div>
              
              {isDeclared ? (
                <div className="mt-1 pt-1.5 border-t border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold uppercase" style={{ color: c.winningPartyColor || "white" }}>
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: c.winningPartyColor || "#64748b" }} />
                    {c.winningPartyAbbreviation}
                  </div>
                  <div className="text-slate-200 font-semibold truncate">{c.winningCandidateName}</div>
                  <div className="text-[10px] text-slate-500">
                    Turnout: {Number(c.turnoutPercent).toFixed(2)}%
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-amber-500 font-bold uppercase tracking-wider animate-pulse">
                  Counting...
                </div>
              )}
            </div>
          );
        })()}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap gap-2 justify-center bg-slate-900/90 backdrop-blur-md border border-border/40 p-2.5 rounded-lg shadow-xl max-w-2xl mx-auto">
          {Array.from(new Set(constituencies.filter(c => c.winningPartyColor).map(c => c.winningPartyAbbreviation))).map(abbr => {
            const party = constituencies.find(c => c.winningPartyAbbreviation === abbr);
            return party ? (
              <div key={abbr} className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/60 border border-border/30">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: party.winningPartyColor || "#64748b" }} />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">{abbr}</span>
              </div>
            ) : null;
          })}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/60 border border-border/30">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1e293b] border border-slate-700" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Undeclared</span>
          </div>
        </div>
      </div>
    </div>
  );
}
