import { useEffect } from "react";
import { Link } from "wouter";
import { useListElections, getListElectionsQueryKey } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export function Layout({ children, currentElectionId, onElectionChange }: {
  children: React.ReactNode;
  currentElectionId: number | null;
  onElectionChange: (id: number) => void;
}) {
  const { data: elections, isLoading } = useListElections({ query: { queryKey: getListElectionsQueryKey() } });

  // Auto-select the most recent election on first load
  useEffect(() => {
    if (!currentElectionId && elections && elections.length > 0) {
      // Elections are ordered by date asc from API; pick the last one (most recent)
      const sorted = [...elections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onElectionChange(sorted[0].id);
    }
  }, [elections, currentElectionId, onElectionChange]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground px-2 py-1 rounded-sm text-xs font-black tracking-widest uppercase">
              DUN
            </div>
            <Link href="/" className="font-serif text-xl font-bold tracking-widest text-primary flex items-center uppercase">
              Johor <span className="text-muted-foreground ml-2 font-normal">Election Results</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="w-56 h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <Select
                value={currentElectionId ? currentElectionId.toString() : ""}
                onValueChange={(val) => onElectionChange(parseInt(val))}
              >
                <SelectTrigger className="w-[280px] bg-secondary border-none h-10 text-base font-semibold">
                  <SelectValue placeholder="Select Election" />
                </SelectTrigger>
                <SelectContent>
                  {elections
                    ?.slice()
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((election) => (
                      <SelectItem key={election.id} value={election.id.toString()}>
                        {election.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-card py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground uppercase tracking-widest font-serif">
          Johor Dewan Undangan Negeri — Historical Election Results
        </div>
      </footer>
    </div>
  );
}
