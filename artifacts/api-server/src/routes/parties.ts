import { Router } from "express";
import { db } from "@workspace/db";
import { partiesTable } from "@workspace/db";

const router = Router();

router.get("/parties", async (req, res) => {
  try {
    const parties = await db.select().from(partiesTable).orderBy(partiesTable.name);
    res.json(
      parties.map((p) => ({
        id: p.id,
        name: p.name,
        abbreviation: p.abbreviation,
        color: p.color,
        description: p.description ?? null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list parties");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
