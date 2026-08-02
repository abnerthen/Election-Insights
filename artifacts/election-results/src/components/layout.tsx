import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListElections, getListElectionsQueryKey } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Landmark, MapPin, ShieldAlert, X } from "lucide-react";

// electiondata.my's whole-country aggregate. Federal elections also have a
// per-state row (the same GE, narrowed to one state's seats) plus a
// "Semenanjung" regional aggregate — those are drill-downs, not separate
// elections, so they're reached from Row View rather than the dropdown.
const NATIONAL_SCOPE = "Malaysia";

const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu"
];

export function Layout({ children, currentElectionId, onElectionChange }: {
  children: React.ReactNode;
  currentElectionId: string | null;
  onElectionChange: (id: string) => void;
}) {
  const { data: elections, isLoading } = useListElections({ query: { queryKey: getListElectionsQueryKey() } });

  const [location, setLocation] = useLocation();
  const [scope, setScope] = useState<"federal" | "state">("federal");
  const [stateFilter, setStateFilter] = useState<string>("Johor");

  const triggerElectionChange = (nextElectionId: string) => {
    onElectionChange(nextElectionId);

    // Check if location matches /constituency/:id
    const match = location.match(/^\/constituency\/([^/?]+)/);
    if (match) {
      const constituencyId = match[1];
      setLocation(`/constituency/${constituencyId}?electionId=${encodeURIComponent(nextElectionId)}`);
    }
  };

  const activeElection = elections?.find((e) => e.id === currentElectionId);

  // Sync selectors when active election changes externally
  useEffect(() => {
    if (activeElection) {
      setScope(activeElection.scope as "federal" | "state");
      if (activeElection.scope === "state" && activeElection.state) {
        setStateFilter(activeElection.state);
      }
    }
  }, [activeElection]);

  // Handle switching scopes
  const handleScopeChange = (newScope: "federal" | "state") => {
    if (!elections) return;
    setScope(newScope);

    // Find the most recent election for the new scope. Federal elections have
    // one row per state on top of the national one, all sharing a date, so
    // pick the national row explicitly rather than relying on list order.
    const filtered = elections.filter(e =>
      newScope === "federal"
        ? e.scope === "federal" && e.state === NATIONAL_SCOPE
        : e.scope === "state" && e.state === stateFilter
    );

    if (filtered.length > 0) {
      const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      triggerElectionChange(sorted[0].id);
    }
  };

  // Handle switching states
  const handleStateChange = (newState: string) => {
    if (!elections) return;
    setStateFilter(newState);

    const filtered = elections.filter(e => e.scope === "state" && e.state === newState);
    if (filtered.length > 0) {
      const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      triggerElectionChange(sorted[0].id);
    }
  };

  // Only show elections matching the selected level. Under Parliament that
  // means the national general elections only; under State Assembly, the
  // selected state's elections.
  const displayedElections = (elections || []).filter((e) => {
    if (e.scope !== scope) return false;
    if (scope === "state") return e.state === stateFilter;
    return e.state === NATIONAL_SCOPE;
  });

  // Viewing one state's slice of a general election (reached by clicking a
  // state in Row View). The dropdown keeps showing which GE we're in, and the
  // chip below shows/clears the state we've drilled into.
  const drilledIntoState =
    activeElection?.scope === "federal" && activeElection.state !== NATIONAL_SCOPE
      ? activeElection.state
      : null;
  const nationalElection = drilledIntoState
    ? elections?.find(
        (e) => e.scope === "federal" && e.state === NATIONAL_SCOPE && e.date === activeElection!.date
      )
    : undefined;
  const selectedElectionId = drilledIntoState
    ? nationalElection?.id ?? ""
    : currentElectionId ?? "";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased selection:bg-primary selection:text-primary-foreground">

      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 px-2 py-1 rounded font-black tracking-widest text-xs uppercase shadow-md">
              GE / PRU
            </div>
            <Link href="/" className="font-serif text-lg md:text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 flex items-center uppercase hover:opacity-90 transition-opacity">
              Malaysia <span className="text-muted-foreground ml-2 font-normal font-sans text-sm tracking-normal capitalize hidden sm:inline">Election Results Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Segmented Control / Filter Bar */}
      <div className="bg-secondary/40 border-b border-border/60 py-3 shadow-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Level Toggle: Federal vs State */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Level:</span>
            <ToggleGroup
              type="single"
              value={scope}
              onValueChange={(val) => {
                if (val) handleScopeChange(val as "federal" | "state");
              }}
              className="bg-card p-1 border border-border rounded-lg inline-flex"
            >
              <ToggleGroupItem
                value="federal"
                className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-md data-[state=on]:bg-amber-500 data-[state=on]:text-black text-foreground transition-all"
              >
                <Landmark className="w-3.5 h-3.5 mr-1.5" />
                Parliament
              </ToggleGroupItem>
              <ToggleGroupItem
                value="state"
                className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-md data-[state=on]:bg-amber-500 data-[state=on]:text-black text-foreground transition-all"
              >
                <MapPin className="w-3.5 h-3.5 mr-1.5" />
                State Assembly
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* State Dropdown + Election Selection */}
          <div className="flex flex-wrap items-center gap-4">

            {scope === "state" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">State:</span>
                <Select value={stateFilter} onValueChange={handleStateChange}>
                  <SelectTrigger className="w-40 bg-card border-border text-foreground text-sm font-semibold h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MALAYSIAN_STATES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Election:</span>
              {isLoading ? (
                <div className="w-[240px] h-9 bg-secondary animate-pulse rounded-md" />
              ) : (
                <Select
                  value={selectedElectionId}
                  onValueChange={(val) => triggerElectionChange(val)}
                >
                  <SelectTrigger className="w-[260px] bg-card border-border text-foreground text-sm font-bold h-9">
                    <SelectValue placeholder="Select Election" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayedElections
                      ?.slice()
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((election) => (
                        <SelectItem key={election.id} value={election.id}>
                          {election.name} ({new Date(election.date).getFullYear()})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {drilledIntoState && nationalElection && (
              <button
                type="button"
                onClick={() => triggerElectionChange(nationalElection.id)}
                title="Back to all-Malaysia results"
                className="flex items-center gap-1.5 h-9 px-3 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-sm font-bold hover:bg-amber-500/25 transition-colors"
              >
                {drilledIntoState}
                <X className="w-3.5 h-3.5" />
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 mt-16 text-center">
        <div className="container mx-auto px-4 flex flex-col items-center gap-3">
          <div className="font-serif text-sm font-black tracking-widest text-muted-foreground uppercase">
            Malaysian Live Election Results Dashboard
          </div>
          <div className="text-xs text-muted-foreground/80 max-w-md">
            Data sourced from electiondata.my and Wikipedia. All rights reserved by their respective owners. Please direct any queries and suggestions on dashboard to @abnerthen on GitHub.
          </div>
        </div>
      </footer>
    </div>
  );
}
