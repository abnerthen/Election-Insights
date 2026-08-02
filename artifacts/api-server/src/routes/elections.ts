import { Router } from "express";
import {
  electionDataClient,
  encodeElectionId,
  decodeElectionId,
  getPartyNameMap,
  type ElectionDropdownEntry,
  type PartyByElection,
  type PartyNames,
} from "../lib/election-data-client";
import { getPartyColor } from "../lib/party-colors";

const router = Router();

// After the coalition rollup a row's `party` field holds the coalition's
// acronym, except for parties that stood alone, which keep their own — so
// each has to be looked up in the matching namespace.
function displayName(names: PartyNames, row: PartyByElection): string {
  return row.coalition_uid === "000-ALONE" ? names.party(row.party) : names.coalition(row.party);
}

function toElectionName(entry: Pick<ElectionDropdownEntry, "state" | "election">): string {
  // "Malaysia" is the canonical whole-country aggregate and gets no suffix;
  // every other scope (including "Semenanjung", Peninsular-only) needs one so
  // multiple rows for the same `election` code don't render identically.
  return entry.state === "Malaysia" ? entry.election : `${entry.election} (${entry.state})`;
}

function toElectionDto(entry: ElectionDropdownEntry) {
  return {
    id: encodeElectionId(entry.type, entry.state, entry.election),
    name: toElectionName(entry),
    date: entry.date,
    scope: entry.type === "parlimen" ? "federal" : "state",
    state: entry.state,
  };
}

router.get("/elections", async (req, res) => {
  try {
    const entries = await electionDataClient.getElectionsDropdown();
    res.json(entries.map(toElectionDto));
  } catch (err) {
    req.log.error({ err }, "Failed to list elections");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/elections/:id", async (req, res) => {
  try {
    const decoded = decodeElectionId(req.params.id);
    if (!decoded) return res.status(400).json({ error: "Invalid id" });

    const entries = await electionDataClient.getElectionsDropdown();
    const match = entries.find((e) => e.state === decoded.state && e.election === decoded.election);
    if (!match) return res.status(404).json({ error: "Not found" });

    return res.json(toElectionDto(match));
  } catch (err) {
    req.log.error({ err }, "Failed to get election");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/elections/:id/summary", async (req, res) => {
  try {
    const decoded = decodeElectionId(req.params.id);
    if (!decoded) return res.status(400).json({ error: "Invalid id" });
    const { state, election } = decoded;

    const [byParty, stats, bySeat, partyNames] = await Promise.all([
      electionDataClient.getElectionsByParty(state, election),
      electionDataClient.getElectionsStats(state, election),
      electionDataClient.getElectionsBySeat(state, election),
      getPartyNameMap(),
    ]);

    if (byParty.length === 0) return res.status(404).json({ error: "Not found" });

    const seatsTotal = byParty[0].seats_total;
    const seatsDeclared = bySeat.length;
    const majorityThreshold = Math.floor(seatsTotal / 2) + 1;

    const leading = [...byParty].sort((a, b) => b.seats_won - a.seats_won)[0];
    const hasLeader = !!leading && leading.seats_won > 0;

    return res.json({
      electionId: req.params.id,
      electionName: toElectionName({ state, election }),
      totalRegisteredVoters: stats?.voters_total ?? 0,
      totalVotesCast: stats?.voter_turnout ?? 0,
      turnoutPercent: stats?.voter_turnout_perc ?? 0,
      seatsTotal,
      seatsDeclared,
      leadingParty: hasLeader ? displayName(partyNames, leading) : null,
      leadingPartyColor: hasLeader ? getPartyColor(leading.party) : null,
      leadingPartySeats: hasLeader ? leading.seats_won : null,
      majorityThreshold,
      partyContestedSeats: byParty.map((p) => ({
        partyId: p.party_uid,
        partyName: displayName(partyNames, p),
        partyAbbreviation: p.party,
        partyColor: getPartyColor(p.party),
        seatsContested: p.seats_contested,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get election summary");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/elections/:id/seat-breakdown", async (req, res) => {
  try {
    const decoded = decodeElectionId(req.params.id);
    if (!decoded) return res.status(400).json({ error: "Invalid id" });

    const [byParty, partyNames] = await Promise.all([
      electionDataClient.getElectionsByParty(decoded.state, decoded.election),
      getPartyNameMap(),
    ]);

    return res.json(
      byParty.map((p) => ({
        partyId: p.party_uid,
        partyName: displayName(partyNames, p),
        partyAbbreviation: p.party,
        partyColor: getPartyColor(p.party),
        seatsWon: p.seats_won,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get seat breakdown");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/elections/:id/vote-share", async (req, res) => {
  try {
    const decoded = decodeElectionId(req.params.id);
    if (!decoded) return res.status(400).json({ error: "Invalid id" });

    const [byParty, partyNames] = await Promise.all([
      electionDataClient.getElectionsByParty(decoded.state, decoded.election),
      getPartyNameMap(),
    ]);

    return res.json(
      byParty.map((p) => ({
        partyId: p.party_uid,
        partyName: displayName(partyNames, p),
        partyAbbreviation: p.party,
        partyColor: getPartyColor(p.party),
        totalVotes: p.votes,
        voteSharePercent: p.votes_perc,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get vote share");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
