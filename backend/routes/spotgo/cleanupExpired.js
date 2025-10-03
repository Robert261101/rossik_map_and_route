// backend/routes/spotgo/cleanupExpired.js
const express = require("express");
const { supabaseService } = require("../../lib/supabase");

const router = express.Router();
const SPOTGO_FREIGHTS_BASE = "https://api.spotgo.eu/api/v1/freights";

// GET /api/admin/spotgo/cleanup-expired?dryRun=1
router.get("/", async (req, res) => {
  const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";

  if (!process.env.SPOTGO_API_KEY) {
    return res.status(500).json({ error: "Missing SPOTGO_API_KEY" });
  }

  try {
    // 2h buffer to avoid timezone edge-cases
    const now = new Date();
    const cutoffIso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    // 1) find expired offers
    const { data: rows, error } = await supabaseService
      .from("submitted_offers")
      .select("offer_id, loading_end_time")
      .lt("loading_end_time", cutoffIso)
      .limit(1000);

    if (error) throw error;

    const offers = rows ?? [];
    let cleaned = 0;
    const skipped = [];

    for (const r of offers) {
      const offerId = r?.offer_id;
      if (!offerId) {
        skipped.push({ reason: "missing_offer_id", row: r });
        continue;
      }

      if (!dryRun) {
        // 2) delete in SpotGo (404 is fine → already gone)
        let resp;
        try {
          resp = await fetch(`${SPOTGO_FREIGHTS_BASE}/${offerId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${process.env.SPOTGO_API_KEY}` },
          });
          if (!resp.ok && resp.status !== 404) {
            skipped.push({ offerId, reason: `spotgo_${resp.status}` });
            continue;
          }
        } catch {
          skipped.push({ offerId, reason: "spotgo_request_failed" });
          continue;
        }

        // 3) delete local row
        const { error: delError } = await supabaseService
          .from("submitted_offers")
          .delete()
          .eq("offer_id", offerId);

        if (delError) {
          skipped.push({ offerId, reason: "supabase_delete_failed" });
          continue;
        }

        cleaned++;
      }
    }

    return res.json({ dryRun, found: offers.length, cleaned, skipped });
  } catch (err) {
    console.error("Cleanup error:", err);
    return res.status(500).json({ error: "Cleanup failed" });
  }
});

module.exports = router;
