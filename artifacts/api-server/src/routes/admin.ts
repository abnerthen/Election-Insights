import { Router, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import {
  electionsTable,
  partiesTable,
  constituenciesTable,
  candidatesTable,
  constituencyResultsTable,
  candidateVotesTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

// ── Auth middleware ──────────────────────────────────────────────────────────
const ADMIN_SECRET = process.env.ADMIN_SECRET || "dev-admin-secret";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.use("/admin", requireAdmin);

type ElectionStatus = "pending" | "counting" | "declared";
const VALID_STATUSES: ElectionStatus[] = ["pending", "counting", "declared"];

// ── Create election ──────────────────────────────────────────────────────────
router.post("/admin/elections", async (req, res) => {
  try {
    const { name, date, totalSeats, status, scope, state } = req.body as {
      name?: string;
      date?: string;
      totalSeats?: number;
      status?: ElectionStatus;
      scope?: string;
      state?: string;
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!date || typeof date !== "string" || !date.trim()) {
      return res.status(400).json({ error: "date is required" });
    }

    const electionScope = scope || "federal";
    const electionState = electionScope === "federal" ? null : (state || "Johor");
    const seats = Number(totalSeats) || 56;
    const electionStatus: ElectionStatus = VALID_STATUSES.includes(status as ElectionStatus)
      ? (status as ElectionStatus)
      : "pending";

    const [election] = await db
      .insert(electionsTable)
      .values({
        name: name.trim(),
        date: date.trim(),
        totalSeats: seats,
        status: electionStatus,
        scope: electionScope,
        state: electionState,
      })
      .returning();

    // Auto-create constituency_results rows for all constituencies in scope
    const constituencies = await db
      .select({ id: constituenciesTable.id })
      .from(constituenciesTable)
      .where(
        electionScope === "federal"
          ? eq(constituenciesTable.scope, "federal")
          : and(eq(constituenciesTable.scope, "state"), eq(constituenciesTable.state, electionState!))
      );

    if (constituencies.length > 0) {
      await db.insert(constituencyResultsTable).values(
        constituencies.map(c => ({
          electionId: election.id,
          constituencyId: c.id,
          registeredVoters: 0,
          votesCast: 0,
          status: "pending" as const,
        }))
      );
    }

    return res.status(201).json({
      id: election.id,
      name: election.name,
      date: election.date,
      totalSeats: election.totalSeats,
      status: election.status,
      scope: election.scope,
      state: election.state,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create election");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Update election status ───────────────────────────────────────────────────
router.put("/admin/elections/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const { status } = req.body as { status?: ElectionStatus };
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db
      .update(electionsTable)
      .set({ status })
      .where(eq(electionsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json({ id: updated.id, status: updated.status });
  } catch (err) {
    req.log.error({ err }, "Failed to update election status");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Upsert constituency results (candidates + votes) ─────────────────────────
interface CandidateEntry {
  candidateId?: number;
  name: string;
  partyId: number;
  votes: number;
  isWinner: boolean;
}

router.put("/admin/elections/:electionId/constituencies/:constituencyId/results", async (req, res) => {
  try {
    const electionId = parseInt(req.params.electionId, 10);
    const constituencyId = parseInt(req.params.constituencyId, 10);
    if (isNaN(electionId) || isNaN(constituencyId)) {
      return res.status(400).json({ error: "Invalid ids" });
    }

    const { registeredVoters, status, candidates, spoiltVotes } = req.body as {
      registeredVoters?: number;
      status?: ElectionStatus;
      candidates?: CandidateEntry[];
      spoiltVotes?: number;
    };

    if (typeof registeredVoters !== "number" || registeredVoters < 0) {
      return res.status(400).json({ error: "registeredVoters must be a non-negative number" });
    }
    const spoilt = Number(spoiltVotes) || 0;
    if (typeof spoiltVotes !== "undefined" && (isNaN(spoilt) || spoilt < 0)) {
      return res.status(400).json({ error: "spoiltVotes must be a non-negative number" });
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "candidates array is required" });
    }

    // Determine the winner dynamically based on the highest votes
    let winnerIndex = -1;
    let highestVotes = -1;
    for (let i = 0; i < candidates.length; i++) {
      const v = Number(candidates[i].votes) || 0;
      if (v > highestVotes) {
        highestVotes = v;
        winnerIndex = i;
      }
    }

    if (status === "declared" && highestVotes <= 0) {
      return res.status(400).json({ error: "Cannot declare results when all candidates have 0 votes" });
    }

    const totalVotes = candidates.reduce((s, c) => s + (Number(c.votes) || 0), 0) + spoilt;

    // Upsert each candidate and their votes
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      let candidateId = cand.candidateId ? Number(cand.candidateId) : undefined;
      const isWinner = (i === winnerIndex && highestVotes > 0);

      if (!candidateId) {
        const [newCand] = await db
          .insert(candidatesTable)
          .values({
            name: String(cand.name).trim(),
            partyId: Number(cand.partyId),
            constituencyId,
            electionId,
          })
          .returning();
        candidateId = newCand.id;
      } else {
        await db
          .update(candidatesTable)
          .set({ name: String(cand.name).trim(), partyId: Number(cand.partyId) })
          .where(eq(candidatesTable.id, candidateId));
      }

      // Upsert candidate_votes
      const existing = await db
        .select()
        .from(candidateVotesTable)
        .where(
          and(
            eq(candidateVotesTable.candidateId, candidateId),
            eq(candidateVotesTable.electionId, electionId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(candidateVotesTable)
          .set({ votes: Number(cand.votes) || 0, isWinner: isWinner ? 1 : 0 })
          .where(eq(candidateVotesTable.id, existing[0].id));
      } else {
        await db.insert(candidateVotesTable).values({
          electionId,
          candidateId,
          constituencyId,
          votes: Number(cand.votes) || 0,
          isWinner: isWinner ? 1 : 0,
        });
      }
    }

    // Update constituency_results aggregate
    await db
      .update(constituencyResultsTable)
      .set({
        registeredVoters: Number(registeredVoters),
        votesCast: totalVotes,
        spoiltVotes: spoilt,
        status,
      })
      .where(
        and(
          eq(constituencyResultsTable.electionId, electionId),
          eq(constituencyResultsTable.constituencyId, constituencyId)
        )
      );

    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to upsert results");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Get candidates for a constituency/election (for pre-filling the form) ────
router.get("/admin/elections/:electionId/constituencies/:constituencyId/candidates", async (req, res) => {
  try {
    const electionId = parseInt(req.params.electionId, 10);
    const constituencyId = parseInt(req.params.constituencyId, 10);
    if (isNaN(electionId) || isNaN(constituencyId)) {
      return res.status(400).json({ error: "Invalid ids" });
    }

    const rows = await db
      .select({
        candidateId: candidatesTable.id,
        name: candidatesTable.name,
        partyId: partiesTable.id,
        partyName: partiesTable.name,
        partyAbbreviation: partiesTable.abbreviation,
        partyColor: partiesTable.color,
        votes: candidateVotesTable.votes,
        isWinner: candidateVotesTable.isWinner,
      })
      .from(candidatesTable)
      .innerJoin(partiesTable, eq(candidatesTable.partyId, partiesTable.id))
      .leftJoin(
        candidateVotesTable,
        and(
          eq(candidateVotesTable.candidateId, candidatesTable.id),
          eq(candidateVotesTable.electionId, electionId)
        )
      )
      .where(
        and(
          eq(candidatesTable.electionId, electionId),
          eq(candidatesTable.constituencyId, constituencyId)
        )
      )
      .orderBy(sql`${candidateVotesTable.votes} desc nulls last`);

    const [result] = await db
      .select()
      .from(constituencyResultsTable)
      .where(
        and(
          eq(constituencyResultsTable.electionId, electionId),
          eq(constituencyResultsTable.constituencyId, constituencyId)
        )
      )
      .limit(1);

    return res.json({
      registeredVoters: result?.registeredVoters ?? 0,
      spoiltVotes: result?.spoiltVotes ?? 0,
      status: result?.status ?? "pending",
      candidates: rows.map(r => ({
        candidateId: r.candidateId,
        name: r.name,
        partyId: r.partyId,
        partyName: r.partyName,
        partyAbbreviation: r.partyAbbreviation,
        partyColor: r.partyColor,
        votes: r.votes ?? 0,
        isWinner: (r.isWinner ?? 0) === 1,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get candidates");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
