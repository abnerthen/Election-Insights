import { Router } from "express";
import { electionDataClient } from "../lib/election-data-client";
import { getPartyColor } from "../lib/party-colors";

const router = Router();

router.get("/parties", async (req, res) => {
  try {
    const parties = await electionDataClient.getPartiesDropdown();
    res.json(
      parties
        .filter((p) => p.type === "party")
        .map((p) => ({
          id: p.uid,
          name: p.name_en || p.acronym,
          abbreviation: p.acronym,
          color: getPartyColor(p.acronym),
          description: p.name_bm ?? null,
        }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list parties");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
