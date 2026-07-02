import { useGetElectionSummary, getGetElectionSummaryQueryKey,
  useGetElectionSeatBreakdown, getGetElectionSeatBreakdownQueryKey,
  useListConstituencies, getListConstituenciesQueryKey,
  useGetElectionVoteShare, getGetElectionVoteShareQueryKey,
  useGetElection, getGetElectionQueryKey,
  useListParties, getListPartiesQueryKey,
  useGetConstituency, getGetConstituencyQueryKey
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeatDiagram } from "@/components/seat-diagram";
import { GaugeCard } from "@/components/gauge-card";
import { PieChartCard } from "@/components/pie-chart-card";
import { ConstituencyMap, ConstituencyRowView } from "@/components/constituency-map";

export function HomePage({ currentElectionId }: { currentElectionId: number | null }) {
  if (!currentElectionId) {
    return <div className="p-8 text-center text-muted-foreground">Select an election to view results.</div>;
  }

  const { data: election } = useGetElection(currentElectionId, {
    query: { enabled: !!currentElectionId, queryKey: getGetElectionQueryKey(currentElectionId), refetchInterval: 5000 }
  });
  const { data: parties } = useListParties({ query: { queryKey: getListPartiesQueryKey(), refetchInterval: 5000 } });
  const { data: summary, isLoading: loadingSummary } = useGetElectionSummary(currentElectionId, {
    query: { enabled: !!currentElectionId, queryKey: getGetElectionSummaryQueryKey(currentElectionId), refetchInterval: 5000 }
  });
  const { data: seatBreakdown, isLoading: loadingSeats } = useGetElectionSeatBreakdown(currentElectionId, {
    query: { enabled: !!currentElectionId, queryKey: getGetElectionSeatBreakdownQueryKey(currentElectionId), refetchInterval: 5000 }
  });
  const { data: constituencies, isLoading: loadingConstituencies } = useListConstituencies(
    { electionId: currentElectionId },
    { query: { enabled: !!currentElectionId, queryKey: getListConstituenciesQueryKey({ electionId: currentElectionId }), refetchInterval: 5000 } }
  );
  const { data: voteShare } = useGetElectionVoteShare(currentElectionId, {
    query: { enabled: !!currentElectionId, queryKey: getGetElectionVoteShareQueryKey(currentElectionId), refetchInterval: 5000 }
  });

  // Find the seat with the slimmest majority among declared constituencies
  const declaredConstituencies = constituencies?.filter(c => c.status === "declared" && c.margin !== null) ?? [];
  const slimmestSeat = declaredConstituencies.length > 0
    ? [...declaredConstituencies].sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0))[0]
    : null;

  const { data: slimmestSeatDetails } = useGetConstituency(slimmestSeat?.id ?? 0, { electionId: currentElectionId ?? undefined }, {
    query: { enabled: !!slimmestSeat, queryKey: getGetConstituencyQueryKey(slimmestSeat?.id ?? 0, { electionId: currentElectionId ?? undefined }), refetchInterval: 5000 }
  });

  if (loadingSummary || loadingSeats || loadingConstituencies) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isJohorState = election?.scope === "state" && election?.state === "Johor";

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Hero Stats — 4 cards */}
      {summary && (
        <div className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">

          {/* Card 1: Seats Declared + Majority Threshold combined */}
          <div className="bg-card border border-border p-4 rounded-lg flex flex-col gap-3">
            <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
              Seats Declared
            </span>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-serif font-bold text-foreground">
                {summary.seatsDeclared}
              </span>
              <span className="text-lg text-muted-foreground mb-1">/ {summary.seatsTotal}</span>
            </div>
            {/* Stacked seat bar */}
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${(summary.seatsDeclared / summary.seatsTotal) * 100}%` }}
              />
            </div>
            <div className="border-t border-border pt-2 mt-1">
              <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                Majority
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-serif font-bold text-amber-400">
                  {summary.majorityThreshold}
                </span>
                <span className="text-xs text-muted-foreground">seats needed</span>
              </div>
              {/* Majority bar showing threshold position */}
              <div className="relative w-full h-1.5 bg-secondary rounded-full mt-2">
                <div
                  className="absolute left-0 top-0 h-full bg-amber-400/60 rounded-full"
                  style={{ width: `${((summary.majorityThreshold ?? 0) / summary.seatsTotal) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-amber-400 rounded"
                  style={{ left: `${((summary.majorityThreshold ?? 0) / summary.seatsTotal) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Turnout — speedometer gauge */}
          <GaugeCard
            label="Turnout"
            value={summary.turnoutPercent}
            max={100}
            unit="%"
            color="#10b981"
            subtitle={`${summary.totalVotesCast.toLocaleString()} of ${summary.totalRegisteredVoters.toLocaleString()} voters`}
          />

          {/* Card 3: Slimmest Majority Seat */}
          <div className="bg-card border border-border p-4 rounded-lg flex flex-col relative overflow-hidden">
            <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
              Slimmest Majority
            </span>
            {slimmestSeat ? (
              <div className="flex flex-col gap-2 mt-1 flex-1 justify-between">
                <div>
                  <div className="text-xl font-serif font-bold text-foreground truncate">
                    {slimmestSeat.code ? `[${slimmestSeat.code}] ` : ""}{slimmestSeat.name}
                  </div>
                  <div className="text-xs text-muted-foreground font-semibold">
                    Winner: {slimmestSeat.winningCandidateName} ({slimmestSeat.winningPartyAbbreviation})
                  </div>
                  <div className="text-sm font-bold text-amber-400 mt-1">
                    Margin: {slimmestSeat.margin?.toLocaleString()} votes
                  </div>
                </div>

                {/* Candidate vote shares list */}
                {slimmestSeatDetails ? (
                  <div className="flex flex-col gap-1.5 mt-2 border-t border-border/40 pt-2">
                    {slimmestSeatDetails.candidates.map((cand) => {
                      const share = slimmestSeatDetails.votesCast > 0
                        ? (cand.votes / slimmestSeatDetails.votesCast) * 100
                        : 0;
                      return (
                        <div key={cand.candidateId} className="flex items-center gap-2 text-xs">
                          <div className="w-8 font-bold text-muted-foreground truncate">{cand.partyAbbreviation}</div>
                          <div className="flex-1 bg-secondary/40 h-3 rounded overflow-hidden relative" style={{ isolation: "isolate" }}>
                            <div className="h-full rounded" style={{ width: `${share}%`, backgroundColor: cand.partyColor }} />
                          </div>
                          <div className="w-10 text-right font-semibold text-foreground">{share.toFixed(1)}%</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-12 bg-secondary/40 animate-pulse rounded mt-2" />
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mt-4">No results declared yet.</div>
            )}
          </div>

          {/* Card 4: Projected winner */}
          <div className="bg-card border border-border p-4 rounded-lg flex flex-col relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-1 block">
                Projected Winner
              </span>
              {summary.leadingParty ? (
                <div className="flex flex-col mt-3">
                  <div className="text-2xl font-serif font-bold leading-tight" style={{ color: summary.leadingPartyColor || "white" }}>
                    {summary.leadingParty}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {summary.leadingPartySeats} seats won
                  </div>
                  {summary.leadingPartySeats != null && summary.majorityThreshold != null && (
                    <div className="text-xs mt-1 font-semibold" style={{ color: summary.leadingPartyColor || "white" }}>
                      {summary.leadingPartySeats >= summary.majorityThreshold
                        ? "✓ Majority secured"
                        : `Need ${summary.majorityThreshold - summary.leadingPartySeats} more`}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xl font-serif font-bold text-muted-foreground mt-2">Too close to call</div>
              )}
            </div>
            {summary.leadingPartyColor && (
              <div
                className="absolute top-0 right-0 w-28 h-28 opacity-20 rounded-full blur-3xl -mr-8 -mt-8"
                style={{ backgroundColor: summary.leadingPartyColor }}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Views */}
      <Tabs defaultValue="seats" className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="bg-secondary/40 p-1 rounded-md grid grid-cols-3 w-96 border border-border/40">
            <TabsTrigger value="seats" className="font-bold tracking-wider uppercase text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Hemicycle
            </TabsTrigger>
            <TabsTrigger value="grid" className="font-bold tracking-wider uppercase text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Grid View
            </TabsTrigger>
            <TabsTrigger value="rows" className="font-bold tracking-wider uppercase text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Row View
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="seats" className="mt-0">
          <div className="bg-card border border-border rounded-xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 pointer-events-none" />
            <h2 className="text-center font-serif text-2xl mb-1 uppercase tracking-widest text-muted-foreground">
              {election?.scope === "federal" ? "Federal Parliament" : `${election?.state || "State"} Assembly`}
            </h2>
            <p className="text-center text-xs text-muted-foreground mb-6 tracking-widest uppercase">
              {election?.scope === "federal" ? "Dewan Rakyat" : `Dewan Undangan Negeri ${election?.state || ""}`} — {summary?.seatsTotal} seats
            </p>
            {seatBreakdown && summary && (
              <SeatDiagram
                seats={seatBreakdown}
                totalSeats={summary.seatsTotal}
                majorityThreshold={summary.majorityThreshold}
              />
            )}
            {/* Seat legend */}
            {seatBreakdown && (
              <div className="mt-4 flex flex-wrap gap-4 justify-center">
                {seatBreakdown.filter(p => p.seatsWon > 0).sort((a,b) => b.seatsWon - a.seatsWon).map(p => (
                  <div key={p.partyId} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.partyColor }} />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {p.partyAbbreviation} <span className="text-foreground">{p.seatsWon}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Vote share chart */}
            {voteShare && (
              <div className="mt-10 border-t border-border pt-8">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-5 text-center">
                  Vote Share
                </h3>
                <div className="max-w-2xl mx-auto flex flex-col gap-3">
                  {voteShare
                    .filter(p => p.totalVotes > 0)
                    .sort((a, b) => b.voteSharePercent - a.voteSharePercent)
                    .map(party => (
                      <div key={party.partyId} className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: party.partyColor }}
                        />
                        <div className="w-16 text-xs font-bold uppercase tracking-wider text-muted-foreground flex-shrink-0">
                          {party.partyAbbreviation}
                        </div>
                        <div className="flex-1 bg-secondary/60 h-5 rounded-sm overflow-hidden relative" style={{ isolation: "isolate" }}>
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${party.voteSharePercent}%`,
                              backgroundColor: party.partyColor,
                              opacity: 0.85,
                            }}
                          />
                          <span
                            className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-white drop-shadow"
                            style={{ mixBlendMode: "difference" }}
                          >
                            {party.voteSharePercent.toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-24 text-right text-xs text-muted-foreground flex-shrink-0">
                          {party.totalVotes.toLocaleString()}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="grid" className="mt-0">
          <div className="bg-card border border-border rounded-xl p-8 shadow-2xl">
            <h2 className="text-center font-serif text-2xl mb-8 uppercase tracking-widest text-muted-foreground">
              Constituency Grid
            </h2>
            {constituencies && <ConstituencyMap constituencies={constituencies} />}
          </div>
        </TabsContent>

        <TabsContent value="rows" className="mt-0">
          <div className="bg-card border border-border rounded-xl p-8 shadow-2xl">
            <h2 className="text-center font-serif text-2xl mb-8 uppercase tracking-widest text-muted-foreground">
              Regional Seat Breakdown
            </h2>
            {constituencies && <ConstituencyRowView constituencies={constituencies} />}
          </div>
        </TabsContent>
      </Tabs>

      {/* Vote Share & Parties */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {voteShare && (
            <>
              <h3 className="font-serif text-xl mb-6 uppercase tracking-widest border-b border-border pb-2">
                Vote Share
              </h3>
              <div className="flex flex-col gap-4">
                {voteShare
                  .filter(p => p.totalVotes > 0)
                  .sort((a, b) => b.voteSharePercent - a.voteSharePercent)
                  .map(party => (
                    <div key={party.partyId} className="flex items-center gap-4 group">
                      <div className="w-20 font-bold text-sm truncate group-hover:text-white transition-colors">
                        {party.partyAbbreviation}
                      </div>
                      <div className="flex-1 bg-secondary h-6 rounded overflow-hidden relative" style={{ isolation: "isolate" }}>
                        <div
                          className="absolute top-0 left-0 bottom-0 transition-all duration-1000 ease-out"
                          style={{ width: `${party.voteSharePercent}%`, backgroundColor: party.partyColor }}
                        />
                        <div
                          className="absolute inset-0 flex items-center px-3 text-xs font-bold text-white drop-shadow-md"
                          style={{ mixBlendMode: "difference" }}
                        >
                          {party.voteSharePercent.toFixed(2)}%
                        </div>
                      </div>
                      <div className="w-24 text-right text-sm text-muted-foreground">
                        {party.totalVotes.toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>

        <div>
          {parties && (
            <>
              <h3 className="font-serif text-xl mb-6 uppercase tracking-widest border-b border-border pb-2">
                Parties
              </h3>
              <div className="flex flex-wrap gap-2">
                {parties.map(party => (
                  <div key={party.id} className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: party.color }} />
                    <span className="text-sm font-bold uppercase tracking-wider">{party.abbreviation}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
