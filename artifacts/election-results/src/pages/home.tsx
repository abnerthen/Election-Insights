import { useState, useEffect } from "react";
import { Link, Route, Switch, useParams } from "wouter";
import { Layout } from "@/components/layout";
import { SeatDiagram } from "@/components/seat-diagram";
import { ConstituencyMap } from "@/components/constituency-map";
import { 
  useGetElectionSummary, getGetElectionSummaryQueryKey,
  useGetElectionSeatBreakdown, getGetElectionSeatBreakdownQueryKey,
  useListConstituencies, getListConstituenciesQueryKey,
  useGetElectionVoteShare, getGetElectionVoteShareQueryKey,
  useGetElection, getGetElectionQueryKey,
  useListParties, getListPartiesQueryKey
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export function HomePage({ currentElectionId }: { currentElectionId: number | null }) {
  if (!currentElectionId) {
    return <div className="p-8 text-center text-muted-foreground">Select an election to view results.</div>;
  }

  const { data: election } = useGetElection(currentElectionId, {
    query: { enabled: !!currentElectionId, queryKey: getGetElectionQueryKey(currentElectionId) }
  });

  const { data: parties } = useListParties({
    query: { queryKey: getListPartiesQueryKey() }
  });

  const { data: summary, isLoading: loadingSummary } = useGetElectionSummary(currentElectionId, {
    query: { enabled: !!currentElectionId, queryKey: getGetElectionSummaryQueryKey(currentElectionId) }
  });

  const { data: seatBreakdown, isLoading: loadingSeats } = useGetElectionSeatBreakdown(currentElectionId, {
    query: { enabled: !!currentElectionId, queryKey: getGetElectionSeatBreakdownQueryKey(currentElectionId) }
  });

  const { data: constituencies, isLoading: loadingConstituencies } = useListConstituencies({ electionId: currentElectionId }, {
    query: { enabled: !!currentElectionId, queryKey: getListConstituenciesQueryKey({ electionId: currentElectionId }) }
  });

  const { data: voteShare } = useGetElectionVoteShare(currentElectionId, {
    query: { enabled: !!currentElectionId, queryKey: getGetElectionVoteShareQueryKey(currentElectionId) }
  });

  const isDataLoading = loadingSummary || loadingSeats || loadingConstituencies;

  if (isDataLoading) {
    return <div className="h-[60vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Hero Stats */}
      {summary && (
        <div className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-4 rounded-lg flex flex-col">
            <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-1">Seats Declared</span>
            <div className="text-4xl font-serif font-bold text-foreground">
              {summary.seatsDeclared} <span className="text-xl text-muted-foreground">/ {summary.seatsTotal}</span>
            </div>
            <Progress value={(summary.seatsDeclared / summary.seatsTotal) * 100} className="h-1 mt-3" />
            {election && <div className="text-xs mt-2 uppercase text-muted-foreground">Status: <span className="text-primary font-bold">{election.status}</span></div>}
          </div>
          
          <div className="bg-card border border-border p-4 rounded-lg flex flex-col">
            <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-1">Turnout</span>
            <div className="text-4xl font-serif font-bold text-foreground">
              {summary.turnoutPercent.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-2">{summary.totalVotesCast.toLocaleString()} votes</div>
          </div>

          <div className="bg-card border border-border p-4 rounded-lg flex flex-col col-span-2 relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-1">Projected Winner</span>
              {summary.leadingParty ? (
                <div className="flex items-end gap-3 mt-1">
                  <div className="text-4xl font-serif font-bold" style={{ color: summary.leadingPartyColor || 'white' }}>
                    {summary.leadingParty}
                  </div>
                  <div className="text-xl mb-1 text-muted-foreground">
                    ({summary.leadingPartySeats} seats)
                  </div>
                </div>
              ) : (
                <div className="text-3xl font-serif font-bold text-muted-foreground mt-1">Too close to call</div>
              )}
            </div>
            {summary.leadingPartyColor && (
              <div 
                className="absolute top-0 right-0 w-32 h-32 opacity-20 rounded-full blur-3xl -mr-10 -mt-10"
                style={{ backgroundColor: summary.leadingPartyColor }}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Views */}
      <Tabs defaultValue="seats" className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="bg-secondary p-1 rounded-md grid grid-cols-2 w-64">
            <TabsTrigger value="seats" className="font-bold tracking-wider uppercase text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Hemicycle</TabsTrigger>
            <TabsTrigger value="map" className="font-bold tracking-wider uppercase text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Grid Map</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="seats" className="mt-0">
          <div className="bg-card border border-border rounded-xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 pointer-events-none" />
            <h2 className="text-center font-serif text-2xl mb-8 uppercase tracking-widest text-muted-foreground">National Assembly</h2>
            {seatBreakdown && summary && (
              <SeatDiagram 
                seats={seatBreakdown} 
                totalSeats={summary.seatsTotal} 
                majorityThreshold={summary.majorityThreshold} 
              />
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="map" className="mt-0">
          <div className="bg-card border border-border rounded-xl p-8 shadow-2xl">
             <h2 className="text-center font-serif text-2xl mb-8 uppercase tracking-widest text-muted-foreground">Constituency Map</h2>
             {constituencies && <ConstituencyMap constituencies={constituencies} />}
          </div>
        </TabsContent>
      </Tabs>

      {/* Vote Share Section & Parties List */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {voteShare && (
            <>
              <h3 className="font-serif text-xl mb-6 uppercase tracking-widest border-b border-border pb-2">National Vote Share</h3>
              <div className="flex flex-col gap-4">
                {voteShare.sort((a, b) => b.voteSharePercent - a.voteSharePercent).map(party => (
                  <div key={party.partyId} className="flex items-center gap-4 group">
                    <div className="w-32 font-bold truncate group-hover:text-white transition-colors">{party.partyName}</div>
                    <div className="flex-1 bg-secondary h-6 rounded overflow-hidden relative">
                      <div 
                        className="absolute top-0 left-0 bottom-0 transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${party.voteSharePercent}%`,
                          backgroundColor: party.partyColor
                        }}
                      />
                      <div className="absolute inset-0 flex items-center px-3 text-xs font-bold text-white drop-shadow-md">
                        {party.voteSharePercent.toFixed(1)}%
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
              <h3 className="font-serif text-xl mb-6 uppercase tracking-widest border-b border-border pb-2">Participating Parties</h3>
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
