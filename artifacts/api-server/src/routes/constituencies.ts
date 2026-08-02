import { Router } from "express";
import {
  electionDataClient,
  decodeElectionId,
  decodeConstituencyId,
  encodeConstituencyId,
  parseSeatName,
  getPartyNameMap,
  getSeatStateMap,
} from "../lib/election-data-client";
import { getPartyColor, getWinnerColor } from "../lib/party-colors";
import { getSeatLayout } from "../lib/seat-layout";
import { getSeatDistrict } from "../lib/seat-districts";

const router = Router();

router.get("/constituencies", async (req, res) => {
  try {
    const electionIdParam = req.query.electionId as string | undefined;
    if (!electionIdParam) return res.status(400).json({ error: "electionId is required" });
    const decoded = decodeElectionId(electionIdParam);
    if (!decoded) return res.status(400).json({ error: "Invalid electionId" });

    const scope = decoded.type === "parlimen" ? "federal" : "state";

    const [bySeat, partyNames, seatStates] = await Promise.all([
      electionDataClient.getElectionsBySeat(decoded.state, decoded.election),
      getPartyNameMap(),
      getSeatStateMap(),
    ]);

    return res.json(
      bySeat.map((s) => {
        const { code, name, region: fallbackRegion } = parseSeatName(s.seat, decoded.state);
        // `fallbackRegion` (from the query's `state` param) is only wrong when
        // that param was itself a national aggregate ("Malaysia"/"Semenanjung")
        // — every other query (including all state-assembly queries, which
        // always specify one real state) already gets the correct state back.
        // Only consult the master-roster map in that aggregate case: DUN seat
        // codes like "N.01" restart in every state, so a code-only lookup
        // would otherwise resolve to whichever state's "N.01" happens to be
        // last in the roster, not the seat we're actually looking at.
        const isAggregateQuery = decoded.state === "Malaysia" || decoded.state === "Semenanjung";
        const stateName = isAggregateQuery ? (seatStates.get(code) ?? fallbackRegion) : fallbackRegion;
        const layout = getSeatLayout(stateName, code);
        // For state assembly seats, group by the parliamentary constituency
        // they fall under (where we have verified data for it) instead of
        // just the whole state — falls back to the state name otherwise.
        const district = decoded.type === "dun" ? getSeatDistrict(stateName, code) : null;
        return {
          id: encodeConstituencyId(s.seat, stateName, s.date),
          electionId: electionIdParam,
          name,
          region: district ?? stateName,
          code,
          scope,
          state: stateName,
          registeredVoters: s.voters_total,
          votesCast: s.voter_turnout,
          spoiltVotes: s.votes_rejected,
          turnoutPercent: Math.round((s.voter_turnout_perc ?? 0) * 100) / 100,
          status: "declared",
          winningPartyId: s.party_uid,
          winningPartyName: partyNames.party(s.party),
          // Grid/row views color by coalition (who governs), not individual
          // party — matches the hemicycle/vote-share grouping.
          winningPartyColor: getWinnerColor(s.party, s.coalition),
          winningPartyAbbreviation: s.party,
          winningCandidateName: s.name,
          // electiondata.my's by_seat endpoint gives the winning margin but not
          // the winner's raw vote count — only /results (single-seat) has that.
          winningVotes: null,
          margin: s.majority,
          latitude: null,
          longitude: null,
          gridX: layout?.gridX ?? null,
          gridY: layout?.gridY ?? null,
        };
      })
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list constituencies");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/constituencies/:id", async (req, res) => {
  try {
    const decoded = decodeConstituencyId(req.params.id);
    if (!decoded) return res.status(400).json({ error: "Invalid id" });
    const { seat, state, date } = decoded;

    const [{ ballot, stats }, partyNames] = await Promise.all([
      electionDataClient.getResults(seat, state, date),
      getPartyNameMap(),
    ]);

    const contestStats = stats[0];
    if (!contestStats) return res.status(404).json({ error: "Not found" });

    const { code, name, region } = parseSeatName(seat, state);
    const layout = getSeatLayout(region, code);

    // electionId query param isn't required to look up a single contest (the
    // opaque constituency id already carries seat/state/date), but we still
    // need the election's `type` to report scope, so infer it from the
    // catalogue instead of a fourth external call whenever possible.
    const electionIdParam = req.query.electionId as string | undefined;
    const decodedElection = electionIdParam ? decodeElectionId(electionIdParam) : null;
    const scope = decodedElection ? (decodedElection.type === "parlimen" ? "federal" : "state") : (code.startsWith("P") ? "federal" : "state");

    return res.json({
      id: req.params.id,
      name,
      region,
      code,
      scope,
      state: region,
      registeredVoters: contestStats.voters_total,
      votesCast: contestStats.voter_turnout,
      spoiltVotes: contestStats.votes_rejected,
      turnoutPercent: Math.round((contestStats.voter_turnout_perc ?? 0) * 100) / 100,
      status: "declared",
      latitude: null,
      longitude: null,
      gridX: layout?.gridX ?? null,
      gridY: layout?.gridY ?? null,
      candidates: ballot.map((c, i) => ({
        id: i,
        name: c.name,
        partyId: c.party_uid,
        partyName: partyNames.party(c.party),
        partyAbbreviation: c.party,
        partyColor: getPartyColor(c.party),
        votes: c.votes,
        voteSharePercent: c.votes_perc ?? 0,
        // electiondata.my doesn't expose a previous-election comparison in this
        // response — swing tracking would need a second /results lookup against
        // the prior contest for the same seat, out of scope for now.
        voteShareChangePercent: null,
        isWinner: c.result === "won" || c.result === "won_uncontested",
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get constituency");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
