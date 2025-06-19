// backend/routes/profile.js
const express = require('express');
const router = express.Router();

/**
 * GET /api/profile
 *
 * Now that authMiddleware → getUserWithRole have already run for all /api routes,
 * `req.user` contains the full profile you fetched from your users table
 * (id, role, team_id, etc.). We just echo it back here.
 */
router.get('/', (req, res) => {
  // Guard in case this ever slips through without auth
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(req.user);
});

module.exports = router;
