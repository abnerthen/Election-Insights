import { Router } from "express";
import { db } from "@workspace/db";
import {
  electionsTable,
  partiesTable,
  constituenciesTable,
  candidatesTable,
  constituencyResultsTable,
  candidateVotesTable,
} from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router = Router();

router.get("/elections", async (req, res) => {
  try {
    const elections = await db.select().from(electionsTable).orderBy(electionsTable.date);
    res.json(
      elections.map((e) => ({
        id: e.id,
        name: e.name,
        date: e.date,
        totalSeats: e.totalSeats,
        status: e.status,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list elections");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/elections/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [election] = await db.select().from(electionsTable).where(eq(electionsTable.id, id));
    if (!election) return res.status(404).json({ error: "Not found" });

    res.json({
      id: election.id,
      name: election.name,
      date: election.date,
      totalSeats: election.totalSeats,
      status: election.status,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get election");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/elections/:id/summary", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [election] = await db.select().from(electionsTable).where(eq(electionsTable.id, id));
    if (!election) return res.status(404).json({ error: "Not found" });

    const results = await db
      .select()
      .from(constituencyResultsTable)
      .where(eq(constituencyResultsTable.electionId, id));

    const totalRegisteredVoters = results.reduce((sum, r) => sum + r.registeredVoters, 0);
    const totalVotesCast = results.reduce((sum, r) => sum + r.votesCast, 0);
    const turnoutPercent =
      totalRegisteredVoters > 0
        ? Math.round((totalVotesCast / totalRegisteredVoters) * 10000) / 100
        : 0;
    const seatsDeclared = results.filter((r) => r.status === "declared").length;

    // Find leading party by seat count
    const winnerRows = await db
      .select({
        partyId: candidatesTable.partyId,
        seats: sql<number>`count(*)`.as("seats"),
      })
      .from(candidateVotesTable)
      .innerJoin(candidatesTable, eq(candidateVotesTable.candidateId, candidatesTable.id))
      .where(
        and(
          eq(candidateVotesTable.electionId, id),
          eq(candidateVotesTable.isWinner, 1)
        )
      )
      .groupBy(candidatesTable.partyId)
      .orderBy(sql`count(*) desc`)
      .limit(1);

    let leadingParty: string | null = null;
    let leadingPartyColor: string | null = null;
    let leadingPartySeats: number | null = null;

    if (winnerRows.length > 0) {
      const [party] = await db
        .select()
        .from(partiesTable)
        .where(eq(partiesTable.id, winnerRows[0].partyId));
      if (party) {
        leadingParty = party.name;
        leadingPartyColor = party.color;
        leadingPartySeats = Number(winnerRows[0].seats);
      }
    }

    const majorityThreshold = Math.floor(election.totalSeats / 2) + 1;

    res.json({
      electionId: election.id,
      electionName: election.name,
      totalRegisteredVoters,
      totalVotesCast,
      turnoutPercent,
      seatsTotal: election.totalSeats,
      seatsDeclared,
      leadingParty,
      leadingPartyColor,
      leadingPartySeats,
      majorityThreshold,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get election summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/elections/:id/seat-breakdown", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const rows = await db
      .select({
        partyId: partiesTable.id,
        partyName: partiesTable.name,
        partyAbbreviation: partiesTable.abbreviation,
        partyColor: partiesTable.color,
        seatsWon: sql<number>`count(${candidateVotesTable.id})`.as("seatsWon"),
      })
      .from(partiesTable)
      .leftJoin(candidatesTable, eq(candidatesTable.partyId, partiesTable.id))
      .leftJoin(
        candidateVotesTable,
        and(
          eq(candidateVotesTable.candidateId, candidatesTable.id),
          eq(candidateVotesTable.electionId, id),
          eq(candidateVotesTable.isWinner, 1)
        )
      )
      .groupBy(partiesTable.id, partiesTable.name, partiesTable.abbreviation, partiesTable.color)
      .orderBy(sql`count(${candidateVotesTable.id}) desc`);

    res.json(
      rows.map((r) => ({
        partyId: r.partyId,
        partyName: r.partyName,
        partyAbbreviation: r.partyAbbreviation,
        partyColor: r.partyColor,
        seatsWon: Number(r.seatsWon),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get seat breakdown");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/elections/:id/vote-share", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const rows = await db
      .select({
        partyId: partiesTable.id,
        partyName: partiesTable.name,
        partyAbbreviation: partiesTable.abbreviation,
        partyColor: partiesTable.color,
        totalVotes: sql<number>`coalesce(sum(${candidateVotesTable.votes}), 0)`.as("totalVotes"),
      })
      .from(partiesTable)
      .leftJoin(candidatesTable, eq(candidatesTable.partyId, partiesTable.id))
      .leftJoin(
        candidateVotesTable,
        and(
          eq(candidateVotesTable.candidateId, candidatesTable.id),
          eq(candidateVotesTable.electionId, id)
        )
      )
      .groupBy(partiesTable.id, partiesTable.name, partiesTable.abbreviation, partiesTable.color)
      .orderBy(sql`coalesce(sum(${candidateVotesTable.votes}), 0) desc`);

    const grandTotal = rows.reduce((sum, r) => sum + Number(r.totalVotes), 0);

    res.json(
      rows.map((r) => ({
        partyId: r.partyId,
        partyName: r.partyName,
        partyAbbreviation: r.partyAbbreviation,
        partyColor: r.partyColor,
        totalVotes: Number(r.totalVotes),
        voteSharePercent:
          grandTotal > 0
            ? Math.round((Number(r.totalVotes) / grandTotal) * 10000) / 100
            : 0,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get vote share");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
