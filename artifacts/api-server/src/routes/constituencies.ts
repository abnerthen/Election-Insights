import { Router } from "express";
import { db } from "@workspace/db";
import {
  constituenciesTable,
  candidatesTable,
  candidateVotesTable,
  partiesTable,
  constituencyResultsTable,
  electionsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

router.get("/constituencies", async (req, res) => {
  try {
    const electionId = req.query.electionId ? parseInt(req.query.electionId as string, 10) : null;

    const results = await db
      .select({
        id: constituenciesTable.id,
        name: constituenciesTable.name,
        region: constituenciesTable.region,
        code: constituenciesTable.code,
        latitude: constituenciesTable.latitude,
        longitude: constituenciesTable.longitude,
        gridX: constituenciesTable.gridX,
        gridY: constituenciesTable.gridY,
        scope: constituenciesTable.scope,
        state: constituenciesTable.state,
        registeredVoters: constituencyResultsTable.registeredVoters,
        votesCast: constituencyResultsTable.votesCast,
        spoiltVotes: constituencyResultsTable.spoiltVotes,
        status: constituencyResultsTable.status,
        electionId: constituencyResultsTable.electionId,
      })
      .from(constituenciesTable)
      .innerJoin(
        constituencyResultsTable,
        and(
          eq(constituencyResultsTable.constituencyId, constituenciesTable.id),
          electionId !== null ? eq(constituencyResultsTable.electionId, electionId) : sql`1=1`
        )
      )
      .orderBy(constituenciesTable.name);

    // For each constituency, find the winner
    const winnerRows = await db
      .select({
        constituencyId: candidateVotesTable.constituencyId,
        candidateId: candidateVotesTable.candidateId,
        votes: candidateVotesTable.votes,
        candidateName: candidatesTable.name,
        partyId: partiesTable.id,
        partyName: partiesTable.name,
        partyColor: partiesTable.color,
        partyAbbreviation: partiesTable.abbreviation,
        electionId: candidateVotesTable.electionId,
      })
      .from(candidateVotesTable)
      .innerJoin(candidatesTable, eq(candidateVotesTable.candidateId, candidatesTable.id))
      .innerJoin(partiesTable, eq(candidatesTable.partyId, partiesTable.id))
      .where(
        and(
          eq(candidateVotesTable.isWinner, 1),
          electionId !== null ? eq(candidateVotesTable.electionId, electionId) : sql`1=1`
        )
      );

    const winnerMap = new Map(winnerRows.map((w) => [w.constituencyId, w]));

    res.json(
      results.map((r) => {
        const winner = winnerMap.get(r.id);
        const turnoutPercent =
          r.registeredVoters > 0
            ? Math.round((r.votesCast / r.registeredVoters) * 10000) / 100
            : 0;

        // Find second place to compute margin — simplified: just return winner votes
        return {
          id: r.id,
          name: r.name,
          region: r.region,
          code: r.code ?? "",
          scope: r.scope,
          state: r.state,
          registeredVoters: r.registeredVoters,
          votesCast: r.votesCast,
          spoiltVotes: r.spoiltVotes,
          turnoutPercent,
          status: r.status,
          winningPartyId: winner?.partyId ?? null,
          winningPartyName: winner?.partyName ?? null,
          winningPartyColor: winner?.partyColor ?? null,
          winningPartyAbbreviation: winner?.partyAbbreviation ?? null,
          winningCandidateName: winner?.candidateName ?? null,
          winningVotes: winner?.votes ?? null,
          margin: null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          gridX: r.gridX ?? null,
          gridY: r.gridY ?? null,
        };
      })
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list constituencies");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/constituencies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [constituency] = await db
      .select()
      .from(constituenciesTable)
      .where(eq(constituenciesTable.id, id));
    if (!constituency) return res.status(404).json({ error: "Not found" });

    // Get latest result for this constituency (most recent by election date)
    const [result] = await db
      .select({
        electionId: constituencyResultsTable.electionId,
        constituencyId: constituencyResultsTable.constituencyId,
        registeredVoters: constituencyResultsTable.registeredVoters,
        votesCast: constituencyResultsTable.votesCast,
        spoiltVotes: constituencyResultsTable.spoiltVotes,
        status: constituencyResultsTable.status,
      })
      .from(constituencyResultsTable)
      .innerJoin(electionsTable, eq(electionsTable.id, constituencyResultsTable.electionId))
      .where(eq(constituencyResultsTable.constituencyId, id))
      .orderBy(sql`${electionsTable.date} desc`)
      .limit(1);

    if (!result) return res.status(404).json({ error: "No results found" });

    const turnoutPercent =
      result.registeredVoters > 0
        ? Math.round((result.votesCast / result.registeredVoters) * 10000) / 100
        : 0;

    // Get all candidates and their votes
    const candidateRows = await db
      .select({
        candidateId: candidatesTable.id,
        candidateName: candidatesTable.name,
        partyId: partiesTable.id,
        partyName: partiesTable.name,
        partyAbbreviation: partiesTable.abbreviation,
        partyColor: partiesTable.color,
        votes: candidateVotesTable.votes,
        isWinner: candidateVotesTable.isWinner,
      })
      .from(candidatesTable)
      .innerJoin(partiesTable, eq(candidatesTable.partyId, partiesTable.id))
      .innerJoin(
        candidateVotesTable,
        and(
          eq(candidateVotesTable.candidateId, candidatesTable.id),
          eq(candidateVotesTable.electionId, result.electionId)
        )
      )
      .where(
        and(
          eq(candidatesTable.constituencyId, id),
          eq(candidatesTable.electionId, result.electionId)
        )
      )
      .orderBy(sql`${candidateVotesTable.votes} desc`);

    const totalVotes = candidateRows.reduce((sum, c) => sum + c.votes, 0);

    return res.json({
      id: constituency.id,
      name: constituency.name,
      region: constituency.region,
      code: constituency.code ?? "",
      scope: constituency.scope,
      state: constituency.state,
      registeredVoters: result.registeredVoters,
      votesCast: result.votesCast,
      spoiltVotes: result.spoiltVotes,
      turnoutPercent,
      status: result.status,
      latitude: constituency.latitude ?? null,
      longitude: constituency.longitude ?? null,
      gridX: constituency.gridX ?? null,
      gridY: constituency.gridY ?? null,
      candidates: candidateRows.map((c) => ({
        id: c.candidateId,
        name: c.candidateName,
        partyId: c.partyId,
        partyName: c.partyName,
        partyAbbreviation: c.partyAbbreviation,
        partyColor: c.partyColor,
        votes: c.votes,
        voteSharePercent:
          totalVotes > 0 ? Math.round((c.votes / totalVotes) * 10000) / 100 : 0,
        isWinner: c.isWinner === 1,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get constituency");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
