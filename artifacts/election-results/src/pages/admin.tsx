import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Save, LogOut, RefreshCw, ChevronDown } from "lucide-react";
import { useListElections, getListElectionsQueryKey, useListConstituencies, getListConstituenciesQueryKey, useListParties, getListPartiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCreateParty } from "@workspace/api-client-react";
import { Textarea } from "@/components/ui/textarea";

const MALAYSIAN_STATES = [
  "Johor",
  "Selangor",
  "Penang",
  "Kedah",
  "Kelantan",
  "Terengganu",
  "Pahang",
  "Negeri Sembilan",
  "Melaka",
  "Perlis",
  "Sabah",
  "Sarawak"
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function adminFetch(path: string, adminKey: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// ── Password gate ────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await adminFetch("/admin/elections", key, { method: "GET" }).catch(async () => {
        // GET isn't defined; use a harmless check: try a real endpoint that needs auth
        const r = await fetch(`${BASE}/api/healthz`);
        await r.json();
      });
      // Verify key by calling an admin endpoint
      await fetch(`${BASE}/api/elections`, { headers: { "X-Admin-Key": key } });
      // Try the actual auth check
      const check = await fetch(`${BASE}/api/admin/elections`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": key },
        body: JSON.stringify({}),
      });
      if (check.status === 401) {
        setError("Invalid admin key.");
        setLoading(false);
        return;
      }
      // 400 (bad body) is fine — it means auth passed
      sessionStorage.setItem("admin_key", key);
      onAuth(key);
    } catch (err) {
      setError(
        `Could not reach the server: ${err instanceof Error ? err.message : String(err)}. Check that the API server is running and the port is correct.`
      );
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-card border border-border rounded-xl p-10 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary text-primary-foreground px-2 py-1 rounded-sm text-xs font-black tracking-widest uppercase">DUN</div>
          <span className="font-serif text-lg font-bold uppercase tracking-widest">Admin Panel</span>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2 block">Admin Key</label>
            <Input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Enter admin key…"
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={loading || !key} className="w-full">
            {loading ? "Checking…" : "Enter"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Default dev key: <code className="bg-secondary px-1 rounded">dev-admin-secret</code>
        </p>
      </div>
    </div>
  );
}

interface CandidateRow {
  candidateId?: number;
  name: string;
  partyId: number;
  votes: number;
  isWinner: boolean;
}

interface Party { id: number; name: string; abbreviation: string; color: string; }

// ── Candidate form row ────────────────────────────────────────────
function CandidateFormRow({
  cand, index, parties, onChange, onRemove, isWinner
}: {
  cand: CandidateRow;
  index: number;
  parties: Party[];
  onChange: (field: keyof CandidateRow, val: string | number | boolean) => void;
  onRemove: () => void;
  isWinner: boolean;
}) {
  const party = parties.find(p => p.id === cand.partyId);
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border ${isWinner ? "border-green-500/50 bg-green-950/20" : "border-border bg-secondary/30"}`}>
      {/* Auto-Winner Indicator */}
      {isWinner ? (
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs select-none" title="Projected Winner">
          ✓
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex-shrink-0" title="Runner-up" />
      )}

      {/* Party dot */}
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: party?.color || "#64748b" }} />

      {/* Candidate name */}
      <Input
        className="flex-1 h-8 text-sm"
        placeholder="Candidate name"
        value={cand.name}
        onChange={e => onChange("name", e.target.value)}
      />

      {/* Party select */}
      <Select value={cand.partyId.toString()} onValueChange={v => onChange("partyId", parseInt(v))}>
        <SelectTrigger className="w-28 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {parties.map(p => (
            <SelectItem key={p.id} value={p.id.toString()}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                {p.abbreviation}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Votes */}
      <Input
        className="w-24 h-8 text-sm text-right"
        type="number"
        min={0}
        placeholder="Votes"
        value={cand.votes || ""}
        onChange={e => onChange("votes", parseInt(e.target.value) || 0)}
      />

      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-red-400 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Constituency entry dialog ─────────────────────────────────────────────────
interface ConstituencyInfo {
  id: number; name: string; region: string; code?: string;
  status: string;
  winningPartyColor?: string | null;
  winningPartyAbbreviation?: string | null;
}

function EntryDialog({
  open, onClose, electionId, constituency, parties, adminKey, onSaved
}: {
  open: boolean;
  onClose: () => void;
  electionId: number;
  constituency: ConstituencyInfo | null;
  parties: Party[];
  adminKey: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [registeredVoters, setRegisteredVoters] = useState(0);
  const [spoiltVotes, setSpoiltVotes] = useState(0);
  const [status, setStatus] = useState<"pending" | "counting" | "declared">("pending");
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open || !constituency || !electionId) return;
    setFetching(true);
    adminFetch(`/admin/elections/${electionId}/constituencies/${constituency.id}/candidates`, adminKey)
      .then(data => {
        setRegisteredVoters(data.registeredVoters || 0);
        setSpoiltVotes(data.spoiltVotes || 0);
        setStatus(data.status || "pending");
        if (data.candidates.length > 0) {
          setCandidates(data.candidates.map((c: CandidateRow & { partyId: number }) => ({
            candidateId: c.candidateId,
            name: c.name,
            partyId: c.partyId,
            votes: c.votes,
            isWinner: c.isWinner,
          })));
        } else {
          setCandidates([
            { name: "", partyId: parties[0]?.id || 9, votes: 0, isWinner: false },
            { name: "", partyId: parties[0]?.id || 9, votes: 0, isWinner: false },
          ]);
        }
      })
      .catch(() => {
        setRegisteredVoters(0);
        setSpoiltVotes(0);
        setStatus("pending");
        setCandidates([
          { name: "", partyId: parties[0]?.id || 9, votes: 0, isWinner: false },
          { name: "", partyId: parties[0]?.id || 9, votes: 0, isWinner: false },
        ]);
      })
      .finally(() => setFetching(false));
  }, [open, constituency?.id, electionId]);

  function updateCandidate(idx: number, field: keyof CandidateRow, val: string | number | boolean) {
    setCandidates(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  }

  function addCandidate() {
    setCandidates(prev => [...prev, { name: "", partyId: parties[0]?.id || 9, votes: 0, isWinner: false }]);
  }

  function removeCandidate(idx: number) {
    setCandidates(prev => prev.filter((_, i) => i !== idx));
  }

  const totalValidVotes = candidates.reduce((s, c) => s + (c.votes || 0), 0);
  const totalVotesCast = totalValidVotes + spoiltVotes;
  const maxVotes = Math.max(...candidates.map(c => c.votes || 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!constituency) return;
    const filled = candidates.filter(c => c.name.trim());
    if (filled.length === 0) {
      toast({ title: "Add at least one candidate", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await adminFetch(
        `/admin/elections/${electionId}/constituencies/${constituency.id}/results`,
        adminKey,
        {
          method: "PUT",
          body: JSON.stringify({
            registeredVoters,
            status,
            spoiltVotes,
            candidates: filled,
          }),
        }
      );
      toast({ title: `${constituency.name} saved`, description: `${filled.length} candidates · ${totalVotesCast.toLocaleString()} votes cast` });
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
    setLoading(false);
  }

  const statusColors = { pending: "text-slate-400", counting: "text-amber-400", declared: "text-green-400" };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-3">
            {constituency?.code ? `[${constituency.code}] ` : ""}{constituency?.name}
            <span className="text-sm text-muted-foreground font-sans font-normal">{constituency?.region}</span>
          </DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Meta row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">
                  Registered Voters
                </label>
                <Input
                  type="number"
                  min={0}
                  value={registeredVoters || ""}
                  onChange={e => setRegisteredVoters(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 25000"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">
                  Spoilt Votes
                </label>
                <Input
                  type="number"
                  min={0}
                  value={spoiltVotes || ""}
                  onChange={e => setSpoiltVotes(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 150"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">
                  Status
                </label>
                <Select value={status} onValueChange={v => setStatus(v as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="counting">Counting</SelectItem>
                    <SelectItem value="declared">Declared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Candidates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                  Candidates · {candidates.filter(c => c.name).length} entered · {totalValidVotes.toLocaleString()} valid votes
                </label>
                <span className="text-xs text-muted-foreground">Winner set automatically to the highest votes</span>
              </div>
              <div className="flex flex-col gap-2">
                {candidates.map((cand, i) => (
                  <CandidateFormRow
                    key={i}
                    index={i}
                    cand={cand}
                    parties={parties}
                    isWinner={cand.votes === maxVotes && maxVotes > 0}
                    onChange={(field, val) => updateCandidate(i, field, val)}
                    onRemove={() => removeCandidate(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addCandidate}
                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-3 h-3" /> Add candidate
              </button>
            </div>

            {/* Turnout preview */}
            {registeredVoters > 0 && totalVotesCast > 0 && (
              <div className="bg-secondary/50 rounded-lg px-4 py-2 text-sm text-muted-foreground flex gap-6">
                <span>Turnout: <strong className="text-foreground">{((totalVotesCast / registeredVoters) * 100).toFixed(1)}%</strong></span>
                <span>Valid: <strong className="text-foreground">{totalValidVotes.toLocaleString()}</strong></span>
                <span>Spoilt: <strong className="text-foreground">{spoiltVotes.toLocaleString()}</strong></span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading} className="gap-2">
                <Save className="w-4 h-4" />
                {loading ? "Saving…" : "Save Result"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── New election dialog ────────────────────────────────────────────────────────
function NewElectionDialog({ open, onClose, adminKey, onCreated }: {
  open: boolean; onClose: () => void; adminKey: string; onCreated: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [scope, setScope] = useState<"federal" | "state">("federal");
  const [stateName, setStateName] = useState("Johor");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const SEAT_COUNTS: Record<string, number> = {
      federal: 114,
      Johor: 56,
      Selangor: 56,
      Penang: 40,
      Kedah: 36,
      Kelantan: 45,
      Terengganu: 32,
      Pahang: 42,
      "Negeri Sembilan": 36,
      Melaka: 28,
      Perlis: 15,
      Sabah: 73,
      Sarawak: 82,
    };

    const seats = scope === "federal" ? SEAT_COUNTS.federal : (SEAT_COUNTS[stateName] || 40);

    try {
      await adminFetch("/admin/elections", adminKey, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          date: date.trim(),
          totalSeats: seats,
          status: "pending",
          scope,
          state: scope === "state" ? stateName : null
        }),
      });
      toast({ title: "Election created", description: name });
      onCreated();
      onClose();
      setName(""); setDate("");
    } catch (err: unknown) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Election</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">Election Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Selangor election..." required />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">Level</label>
            <Select value={scope} onValueChange={(v) => setScope(v as "federal" | "state")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="federal">Parliament (Federal)</SelectItem>
                <SelectItem value="state">State Assembly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scope === "state" && (
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">State</label>
              <Select value={stateName} onValueChange={setStateName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MALAYSIAN_STATES.map((st) => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !name || !date}>{loading ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// - Add Party Dialog

function AddPartyDialog() {
  const createParty = useCreateParty();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", abbreviation: "", color: "#3b82f6", description: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createParty.mutateAsync({
      data: form
    });
    // Invalidate parties list to refresh candidate party dropdowns automatically
    queryClient.invalidateQueries({ queryKey: getListPartiesQueryKey() });
    setIsOpen(false);
    setForm({ name: "", abbreviation: "", color: "#3b82f6", description: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-9">
          <Plus className="w-3.5 h-3.5" /> New Party
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Party</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold uppercase">Party Name</label>
            <Input value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm font-bold uppercase">Abbreviation</label>
            <Input value={form.abbreviation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, abbreviation: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm font-bold uppercase">Theme Color</label>
            <div className="flex gap-2">
              <Input type="color" value={form.color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, color: e.target.value })} className="w-12 p-0 h-10 border-0" />
              <Input value={form.color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, color: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold uppercase">Description</label>
            <Textarea value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createParty.isPending}>
              {createParty.isPending ? "Creating..." : "Save Party"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// ── Main admin panel ──────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  declared: "bg-green-900/50 border-green-700 text-green-300",
  counting: "bg-amber-900/50 border-amber-700 text-amber-300",
  pending: "bg-slate-800/80 border-slate-700 text-slate-400",
};

function AdminPanel({ adminKey, onLogout }: { adminKey: string; onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [electionId, setElectionId] = useState<number | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState<ConstituencyInfo | null>(null);
  const [showNewElection, setShowNewElection] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "counting" | "declared">("all");
  const [sortBy, setSortBy] = useState<"name" | "code">("name");

  const { data: elections, refetch: refetchElections } = useListElections({
    query: { queryKey: getListElectionsQueryKey(), refetchInterval: 5000 }
  });
  const { data: constituencies, refetch: refetchConstituencies } = useListConstituencies(
    { electionId: electionId ?? undefined },
    { query: { enabled: !!electionId, queryKey: getListConstituenciesQueryKey({ electionId: electionId ?? undefined }), refetchInterval: 5000 } }
  );
  const { data: parties } = useListParties({ query: { queryKey: getListPartiesQueryKey() } });

  // Auto-select most recent election
  useEffect(() => {
    if (!electionId && elections && elections.length > 0) {
      const sorted = [...elections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setElectionId(sorted[0].id);
    }
  }, [elections]);

  function handleSaved() {
    refetchConstituencies();
    queryClient.invalidateQueries({ queryKey: getListConstituenciesQueryKey({ electionId: electionId ?? undefined }) });
  }

  const filtered = constituencies?.filter(c =>
    filter === "all" ? true : c.status === filter
  ) ?? [];

  const counts = {
    declared: constituencies?.filter(c => c.status === "declared").length ?? 0,
    counting: constituencies?.filter(c => c.status === "counting").length ?? 0,
    pending: constituencies?.filter(c => c.status === "pending").length ?? 0,
  };

  const currentElection = elections?.find(e => e.id === electionId);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur h-14 flex items-center px-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded-sm text-xs font-black tracking-widest uppercase">DUN</div>
          <span className="font-serif font-bold tracking-widest uppercase text-sm">Admin Panel</span>
        </div>

        <div className="flex-1 flex items-center gap-3">
          {elections && (
            <Select value={electionId?.toString() ?? ""} onValueChange={v => setElectionId(parseInt(v))}>
              <SelectTrigger className="w-72 h-9 bg-secondary border-none text-sm font-semibold">
                <SelectValue placeholder="Select election…" />
              </SelectTrigger>
              <SelectContent>
                {[...elections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => setShowNewElection(true)}>
            <Plus className="w-3.5 h-3.5" /> New Election
          </Button>
          <AddPartyDialog />
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => refetchConstituencies()}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={onLogout}>
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
          <Link href="/">
            <Button size="sm" variant="ghost" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Public View
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {!electionId ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
            <p className="text-lg">Select or create an election to begin entering results.</p>
            <Button onClick={() => setShowNewElection(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create Election
            </Button>
          </div>
        ) : (
          <>
            {/* Status bar */}
            <div className="mb-6 flex items-center gap-4 flex-wrap">
              <div className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{currentElection?.name}</span>
                {" · "}{currentElection?.date}
              </div>

              <div className="flex items-center gap-4 ml-auto flex-wrap">
                {/* Sort Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Sort by:</span>
                  <div className="bg-secondary/40 p-0.5 rounded border border-border/40 flex text-xs">
                    <button
                      type="button"
                      onClick={() => setSortBy("name")}
                      className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-colors ${sortBy === "name" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Name
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("code")}
                      className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-colors ${sortBy === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Code
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                  {(["all", "declared", "counting", "pending"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-xs uppercase tracking-wider font-bold px-3 py-1 rounded border transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {f === "all" ? `All (${constituencies?.length ?? 0})` :
                        f === "declared" ? `Declared (${counts.declared})` :
                          f === "counting" ? `Counting (${counts.counting})` :
                            `Pending (${counts.pending})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress summary */}
            <div className="mb-6 bg-card border border-border rounded-xl p-4 flex gap-8 items-center">
              <div className="text-center">
                <div className="text-3xl font-serif font-bold text-green-400">{counts.declared}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Declared</div>
              </div>
              <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden flex">
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(counts.declared / (currentElection?.totalSeats || 56)) * 100}%` }} />
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(counts.counting / (currentElection?.totalSeats || 56)) * 100}%` }} />
              </div>
              <div className="text-center">
                <div className="text-3xl font-serif font-bold text-amber-400">{counts.counting}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Counting</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-serif font-bold text-slate-400">{counts.pending}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Pending</div>
              </div>
            </div>

            {/* Constituency grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {(() => {
                const compareCodes = (a: any, b: any) => {
                  const codeA = a.code || "";
                  const codeB = b.code || "";
                  return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
                };

                return [...filtered]
                  .sort((a, b) => {
                    if (sortBy === "code") return compareCodes(a, b);
                    return a.name.localeCompare(b.name);
                  })
                  .map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConstituency(c as ConstituencyInfo)}
                      className={`p-2.5 rounded-lg border text-left transition-all hover:scale-[1.02] hover:shadow-lg ${STATUS_STYLE[c.status] || STATUS_STYLE.pending}`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-xs font-bold leading-tight line-clamp-2">
                          {c.code ? `[${c.code}] ` : ""}{c.name}
                        </span>
                        {c.winningPartyColor && (
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: c.winningPartyColor }} />
                        )}
                      </div>
                      <div className="text-xs opacity-70 truncate">{c.region}</div>
                      {c.winningPartyAbbreviation && (
                        <div className="text-xs font-bold mt-1" style={{ color: c.winningPartyColor || "inherit" }}>
                          {c.winningPartyAbbreviation}
                        </div>
                      )}
                      <div className="text-xs opacity-60 mt-0.5 capitalize">{c.status}</div>
                    </button>
                  ));
              })()}
            </div>
          </>
        )}
      </main>

      {/* Entry dialog */}
      {parties && (
        <EntryDialog
          open={!!selectedConstituency}
          onClose={() => setSelectedConstituency(null)}
          electionId={electionId ?? 0}
          constituency={selectedConstituency}
          parties={parties}
          adminKey={adminKey}
          onSaved={handleSaved}
        />
      )}

      <NewElectionDialog
        open={showNewElection}
        onClose={() => setShowNewElection(false)}
        adminKey={adminKey}
        onCreated={() => { refetchElections(); }}
      />
    </div>
  );
}

// ── Top-level admin export ────────────────────────────────────────────────────
export function AdminPage() {
  const [adminKey, setAdminKey] = useState<string | null>(() => sessionStorage.getItem("admin_key"));

  if (typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
  }

  if (!adminKey) {
    return <PasswordGate onAuth={key => { sessionStorage.setItem("admin_key", key); setAdminKey(key); }} />;
  }

  return (
    <AdminPanel
      adminKey={adminKey}
      onLogout={() => { sessionStorage.removeItem("admin_key"); setAdminKey(null); }}
    />
  );
}
