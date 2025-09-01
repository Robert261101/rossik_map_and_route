// backend/routes/spotgo/cleanupExpired.js
const express = require("express");
const fetch = require("node-fetch");
const supabase = require("../../lib/supabaseAdmin").default; // păstrăm default importul tău

const router = express.Router();

// Endpoint-ul nativ SpotGo pentru freights
const SPOTGO_FREIGHTS_BASE = "https://api.spotgo.eu/api/v1/freights";

// GET /api/spotgo/cleanup-expired?dryRun=1
router.get("/", async (req, res) => {
  const dryRun = req.query.dryRun === "1";

  try {
    // 2h buffer (evităm curățarea „la limită” de fus orar)
    const now = new Date();
    const cutoffIso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    // 1) selectăm ofertele expirate (loading_end_time < cutoff)
    const { data: rows, error } = await supabase
      .from("submitted_offers")
      .select("offer_id, loading_end_time")
      .lt("loading_end_time", cutoffIso)
      .limit(1000);

    if (error) throw error;

    const offers = rows || [];
    let cleaned = 0;
    const skipped = [];

    for (const r of offers) {
      const offerId = r?.offer_id;
      if (!offerId) {
        skipped.push({ reason: "missing_offer_id", row: r });
        continue;
      }

      if (!dryRun) {
        // 2) încearcă ștergerea în SpotGo (404 = deja șters => succes)
        try {
          const resp = await fetch(`${SPOTGO_FREIGHTS_BASE}/${offerId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${process.env.SPOTGO_API_KEY}` }
          });

          if (!resp.ok && resp.status !== 404) {
            skipped.push({ offerId, reason: `spotgo_${resp.status}` });
            continue;
          }
        } catch (e) {
          skipped.push({ offerId, reason: "spotgo_request_failed" });
          continue;
        }

        // 3) șterge rândul din Supabase
        const { error: delError } = await supabase
          .from("submitted_offers")
          .delete()
          .eq("offer_id", offerId);

        if (delError) {
          skipped.push({ offerId, reason: "supabase_delete_failed" });
          continue;
        }

        cleaned++; // ✅ incrementăm DOAR când ștergerea chiar s-a făcut
      } // if !dryRun
    }

    return res.json({
      dryRun,
      found: offers.length,
      cleaned,
      skipped
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return res.status(500).json({ error: "Cleanup failed" });
  }
});

module.exports = router;