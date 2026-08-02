const BASE_URL = "https://api.electiondata.my/v1";
// Per-election result data changes during a live count, so cache it briefly to
// de-duplicate the several calls one dashboard page load fans out into.
const RESULTS_CACHE_TTL_MS = 4000;
// The election/party catalogues change only when a new election is called —
// electiondata.my's own docs recommend caching these for a whole session.
const CATALOGUE_CACHE_TTL_MS = 5 * 60 * 1000;

function getApiKey(): string {
  const key = process.env.ELECTION_DATA_API_KEY;
  if (!key) {
    throw new Error(
      "ELECTION_DATA_API_KEY environment variable is not set. Generate a free key from the electiondata.my API Console."
    );
  }
  return key;
}

const cache = new Map<string, { expires: number; data: unknown }>();

async function get<T>(path: string, params: Record<string, string> = {}, ttlMs = RESULTS_CACHE_TTL_MS): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const cacheKey = url.toString();

  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  const res = await fetch(cacheKey, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  if (!res.ok) {
    throw new Error(`electiondata.my request failed: ${res.status} ${res.statusText} (${url.pathname}${url.search})`);
  }
  const data = (await res.json()) as T;
  cache.set(cacheKey, { expires: Date.now() + ttlMs, data });
  return data;
}

// ── Response shapes (electiondata.my API) ────────────────────────────────────
export interface ElectionDropdownEntry {
  state: string;
  type: "parlimen" | "dun";
  election: string;
  date: string;
}

export interface PartyByElection {
  party_uid: string;
  party: string;
  coalition: string;
  coalition_uid: string;
  seats_contested: number;
  seats_won: number;
  seats_total: number;
  seats_contested_perc: number;
  seats_won_perc: number;
  votes: number;
  votes_total: number;
  votes_perc: number;
}

export interface SeatByElection {
  seat: string;
  state: string;
  date: string;
  name: string;
  party: string;
  party_uid: string;
  coalition: string;
  coalition_uid: number;
  party_lost: string[];
  party_lost_uid: string[];
  coalition_lost: string[];
  coalition_lost_uid: number[];
  n_candidates: number;
  voters_total: number;
  voter_turnout: number;
  voter_turnout_perc: number;
  majority: number;
  majority_perc: number;
  votes_rejected: number;
  votes_rejected_perc: number;
}

export interface ElectionStats {
  voters_total: number;
  voter_turnout: number;
  voter_turnout_perc: number;
  votes_rejected: number;
  votes_rejected_perc: number;
  n_candidates: number;
}

export interface BallotEntry {
  name: string;
  party_uid: string;
  party: string;
  coalition_uid: number;
  coalition: string;
  votes: number;
  votes_perc: number | null;
  result: "won" | "won_uncontested" | "lost" | "lost_deposit";
}

export interface ResultStats {
  date: string;
  voters_total: number;
  voter_turnout: number;
  voter_turnout_perc: number | null;
  votes_rejected: number;
  votes_rejected_perc: number | null;
  majority: number;
  majority_perc: number | null;
}

export interface SeatDropdownEntry {
  seat: string;
  slug: string;
  type: "parlimen" | "dun";
}

export interface PartyDropdownEntry {
  type: "party" | "coalition";
  uid: string;
  maps_to: string;
  acronym: string;
  name_en: string;
  name_bm: string;
}

// electiondata.my can return more than one row for the same party_uid within
// a single by_party response — independents in particular get split across
// rows (e.g. by differing coalition_uid) while sharing the generic "000-BEBAS"
// id. Downstream code (and React list keys) assumes party_uid is unique per
// response, so merge same-uid rows by summing their counts.
function mergePartyRows(rows: PartyByElection[]): PartyByElection[] {
  const merged = new Map<string, PartyByElection>();
  for (const row of rows) {
    const existing = merged.get(row.party_uid);
    if (!existing) {
      merged.set(row.party_uid, { ...row });
      continue;
    }
    existing.seats_contested += row.seats_contested;
    existing.seats_won += row.seats_won;
    existing.votes += row.votes;
    existing.seats_contested_perc = existing.seats_total > 0 ? (existing.seats_contested / existing.seats_total) * 100 : 0;
    existing.seats_won_perc = existing.seats_total > 0 ? (existing.seats_won / existing.seats_total) * 100 : 0;
    existing.votes_perc = existing.votes_total > 0 ? (existing.votes / existing.votes_total) * 100 : 0;
  }
  return [...merged.values()];
}

// Rolls individual parties up into their coalition (e.g. PAS + BERSATU -> PN,
// PBB + PRS + PDP -> GPS) since that's what actually determines who can form
// a government. Parties that contested without a coalition (coalition_uid
// "000-ALONE" — genuine independents, but also named parties like WARISAN
// that ran solo) are NOT merged together; each keeps its own row, since
// "ALONE" isn't a real shared political identity.
export function aggregateByCoalition(rows: PartyByElection[]): PartyByElection[] {
  const groups = new Map<string, PartyByElection>();
  for (const row of rows) {
    const isAlone = row.coalition_uid === "000-ALONE";
    const key = isAlone ? row.party_uid : row.coalition_uid;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...row, party_uid: key, party: isAlone ? row.party : row.coalition });
      continue;
    }
    existing.seats_contested += row.seats_contested;
    existing.seats_won += row.seats_won;
    existing.votes += row.votes;
  }
  for (const g of groups.values()) {
    g.seats_contested_perc = g.seats_total > 0 ? (g.seats_contested / g.seats_total) * 100 : 0;
    g.seats_won_perc = g.seats_total > 0 ? (g.seats_won / g.seats_total) * 100 : 0;
    g.votes_perc = g.votes_total > 0 ? (g.votes / g.votes_total) * 100 : 0;
  }
  return [...groups.values()];
}

export const electionDataClient = {
  getElectionsDropdown: () =>
    get<{ elections: ElectionDropdownEntry[] }>("/elections/dropdown", {}, CATALOGUE_CACHE_TTL_MS).then(
      (r) => r.elections
    ),
  getElectionsByParty: (state: string, election: string) =>
    get<{ by_party: PartyByElection[] }>("/elections/by_party", { state, election }).then((r) =>
      aggregateByCoalition(mergePartyRows(r.by_party))
    ),
  getElectionsBySeat: (state: string, election: string) =>
    get<{ by_seat: SeatByElection[] }>("/elections/by_seat", { state, election }).then((r) => r.by_seat),
  getElectionsStats: (state: string, election: string) =>
    get<{ stats: ElectionStats[] }>("/elections/stats", { state, election }).then((r) => r.stats[0]),
  getResults: (seat: string, state: string, date: string) =>
    get<{ ballot: BallotEntry[]; stats: ResultStats[] }>("/results", { seat, state, date }),
  getPartiesDropdown: () =>
    get<{ data: PartyDropdownEntry[] }>("/parties/dropdown", {}, CATALOGUE_CACHE_TTL_MS).then((r) => r.data),
  getSeatsDropdown: () =>
    get<{ seats: SeatDropdownEntry[] }>("/seats/dropdown", {}, CATALOGUE_CACHE_TTL_MS).then((r) => r.seats),
};

let partyNameMapPromise: Promise<Map<string, string>> | null = null;
let partyNameMapExpires = 0;

// Full party names (e.g. "Pakatan Harapan") for display — /elections/by_party
// and /elections/by_seat only ever give the acronym.
export function getPartyNameMap(): Promise<Map<string, string>> {
  if (partyNameMapPromise && partyNameMapExpires > Date.now()) {
    return partyNameMapPromise;
  }
  partyNameMapExpires = Date.now() + CATALOGUE_CACHE_TTL_MS;
  partyNameMapPromise = electionDataClient.getPartiesDropdown().then((parties) => {
    const map = new Map<string, string>();
    for (const p of parties) {
      if (!map.has(p.acronym)) map.set(p.acronym, p.name_en || p.acronym);
    }
    return map;
  });
  return partyNameMapPromise;
}

let seatStateMapPromise: Promise<Map<string, string>> | null = null;
let seatStateMapExpires = 0;

// /elections/by_seat only echoes back the query's `state` param (e.g. "Malaysia"
// for a national-scope query), not each seat's actual home state. /seats/dropdown
// (the master roster of currently-existing seats) always includes a ", <state>"
// suffix on `seat`, so use it to build an accurate code -> state map.
export function getSeatStateMap(): Promise<Map<string, string>> {
  if (seatStateMapPromise && seatStateMapExpires > Date.now()) {
    return seatStateMapPromise;
  }
  seatStateMapExpires = Date.now() + CATALOGUE_CACHE_TTL_MS;
  seatStateMapPromise = electionDataClient.getSeatsDropdown().then((seats) => {
    const map = new Map<string, string>();
    for (const s of seats) {
      const commaIdx = s.seat.lastIndexOf(", ");
      if (commaIdx === -1) continue;
      const code = s.seat.slice(0, commaIdx).split(" ")[0];
      const state = s.seat.slice(commaIdx + 2);
      map.set(code, state);
    }
    return map;
  });
  return seatStateMapPromise;
}

// ── Opaque id helpers ─────────────────────────────────────────────────────────
// electiondata.my addresses an election by (state, election) and a seat by
// (seat, state, date) — no numeric ids. We encode those tuples into opaque
// strings that the frontend just passes through unchanged.
export function encodeElectionId(type: "parlimen" | "dun", state: string, election: string): string {
  return `${type}::${encodeURIComponent(state)}::${encodeURIComponent(election)}`;
}

export function decodeElectionId(id: string): { type: "parlimen" | "dun"; state: string; election: string } | null {
  const parts = id.split("::");
  if (parts.length !== 3 || (parts[0] !== "parlimen" && parts[0] !== "dun")) return null;
  return { type: parts[0], state: decodeURIComponent(parts[1]), election: decodeURIComponent(parts[2]) };
}

export function encodeConstituencyId(seat: string, state: string, date: string): string {
  return `${encodeURIComponent(seat)}::${encodeURIComponent(state)}::${encodeURIComponent(date)}`;
}

export function decodeConstituencyId(id: string): { seat: string; state: string; date: string } | null {
  const parts = id.split("::");
  if (parts.length !== 3) return null;
  return {
    seat: decodeURIComponent(parts[0]),
    state: decodeURIComponent(parts[1]),
    date: decodeURIComponent(parts[2]),
  };
}

// The `seat` field's format is inconsistent across electiondata.my's own docs —
// sometimes it includes a trailing ", <state>" suffix, sometimes not. When
// present, that suffix is the seat's actual home state, which matters when
// `queryState` is a national aggregate like "Malaysia" (echoed back verbatim
// on every row, so it can't be used for per-seat grouping). Parse
// defensively: prefer the suffix if present, else fall back to queryState.
export function parseSeatName(seat: string, queryState: string): { code: string; name: string; region: string } {
  const commaIdx = seat.lastIndexOf(", ");
  const withoutSuffix = commaIdx === -1 ? seat : seat.slice(0, commaIdx);
  const region = commaIdx === -1 ? queryState : seat.slice(commaIdx + 2);
  const spaceIdx = withoutSuffix.indexOf(" ");
  const code = spaceIdx === -1 ? withoutSuffix : withoutSuffix.slice(0, spaceIdx);
  const name = spaceIdx === -1 ? withoutSuffix : withoutSuffix.slice(spaceIdx + 1);
  return { code, name, region };
}
