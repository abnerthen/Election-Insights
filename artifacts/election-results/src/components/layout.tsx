import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useListElections, getListElectionsQueryKey } from "@workspace/api-client-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { BarChart3, Map, Tv } from "lucide-react";

export function Layout({ children, currentElectionId, onElectionChange }: { children: React.ReactNode, currentElectionId: number | null, onElectionChange: (id: number) => void }) {
  const { data: elections, isLoading } = useListElections({ query: { queryKey: getListElectionsQueryKey() } });
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-2 rounded-sm">
              <Tv className="w-5 h-5" />
            </div>
            <Link href="/" className="font-serif text-2xl font-bold tracking-widest text-primary flex items-center uppercase">
              Election <span className="text-muted-foreground ml-1">Night</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="w-48 h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <Select 
                value={currentElectionId ? currentElectionId.toString() : ""} 
                onValueChange={(val) => onElectionChange(parseInt(val))}
              >
                <SelectTrigger className="w-[280px] bg-secondary border-none h-10 text-base font-semibold">
                  <SelectValue placeholder="Select Election" />
                </SelectTrigger>
                <SelectContent>
                  {elections?.map((election) => (
                    <SelectItem key={election.id} value={election.id.toString()}>
                      {election.name} ({new Date(election.date).getFullYear()})
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
          Decision Desk HQ • Live Data Feed
        </div>
      </footer>
    </div>
  );
}
