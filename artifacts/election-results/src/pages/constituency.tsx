import { useParams, Link } from "wouter";
import { ArrowLeft, MapPin, Users, CheckCircle } from "lucide-react";
import { useGetConstituency, getGetConstituencyQueryKey } from "@workspace/api-client-react";

export function ConstituencyPage() {
  const params = useParams();
  const id = parseInt(params.id || "0");

  const { data: constituency, isLoading } = useGetConstituency(id, {
    query: { enabled: !!id, queryKey: getGetConstituencyQueryKey(id) }
  });

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!constituency) {
    return <div className="p-8 text-center text-red-500">Constituency not found</div>;
  }

  const isDeclared = constituency.status === "declared";
  const winner = constituency.candidates.find(c => c.isWinner);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors uppercase tracking-widest text-xs font-bold">
        <ArrowLeft className="w-4 h-4" /> Back to National Results
      </Link>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
        {/* Header Header */}
        <div
          className="p-8 relative"
          style={{
            backgroundColor: isDeclared && winner ? `${winner.partyColor}20` : undefined,
            borderBottom: isDeclared && winner ? `4px solid ${winner.partyColor}` : '4px solid var(--border)'
          }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                <span className="uppercase tracking-widest text-sm font-bold">{constituency.region}</span>
              </div>
              <h1 className="text-5xl font-serif font-bold text-foreground tracking-tight">{constituency.name}</h1>
            </div>

            <div className="flex gap-2">
              {constituency.code && (
                <div className="bg-background/80 backdrop-blur px-4 py-2 rounded border border-border text-center">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Code</div>
                  <div className="font-mono font-bold text-primary uppercase">
                    {constituency.code}
                  </div>
                </div>
              )}
              <div className="bg-background/80 backdrop-blur px-4 py-2 rounded border border-border text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Status</div>
                <div className={`font-bold ${isDeclared ? 'text-green-500' : 'text-amber-500'} uppercase`}>
                  {constituency.status}
                </div>
              </div>
            </div>
          </div>

          {isDeclared && winner && (
            <div className="mt-8 flex items-center gap-4 bg-background/90 p-4 rounded-lg border border-border max-w-xl shadow-lg backdrop-blur">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: winner.partyColor }}>
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Elected MP</div>
                <div className="text-2xl font-bold text-foreground">{winner.name}</div>
                <div className="text-sm font-semibold" style={{ color: winner.partyColor }}>{winner.partyName}</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-8 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="font-serif text-2xl uppercase tracking-widest mb-6">Results</h2>

            <div className="space-y-4">
              {constituency.candidates.sort((a, b) => b.votes - a.votes).map(candidate => (
                <div
                  key={candidate.id}
                  className={`bg-background border p-4 rounded-lg transition-colors ${candidate.isWinner ? 'border-l-4' : 'border-border'}`}
                  style={candidate.isWinner ? { borderLeftColor: candidate.partyColor } : {}}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="font-bold text-lg flex items-center gap-2">
                        {candidate.name}
                        {candidate.isWinner && <CheckCircle className="w-4 h-4" style={{ color: candidate.partyColor }} />}
                      </div>
                      <div className="text-sm font-semibold" style={{ color: candidate.partyColor }}>{candidate.partyName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-serif font-bold text-xl">{candidate.votes.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">{candidate.voteSharePercent.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${candidate.voteSharePercent}%`,
                        backgroundColor: candidate.partyColor
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-xl uppercase tracking-widest mb-6 border-b border-border pb-2">Turnout Data</h2>
            <div className="space-y-6">
              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-widest font-bold mb-1">Voter Turnout</div>
                <div className="text-3xl font-serif font-bold text-foreground">{constituency.turnoutPercent.toFixed(1)}%</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-widest font-bold mb-1">Total Votes Cast</div>
                <div className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  {constituency.votesCast.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-widest font-bold mb-1">Spoilt Votes</div>
                <div className="text-2xl font-serif font-bold text-foreground">
                  {constituency.spoiltVotes?.toLocaleString() ?? 0}
                  <span className="text-sm font-sans font-normal text-muted-foreground ml-2">
                    ({(constituency.votesCast > 0 ? ((constituency.spoiltVotes ?? 0) / constituency.votesCast) * 100 : 0).toFixed(2)}% of turnout)
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-widest font-bold mb-1">Registered Voters</div>
                <div className="text-xl font-serif font-bold text-muted-foreground">{constituency.registeredVoters.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
