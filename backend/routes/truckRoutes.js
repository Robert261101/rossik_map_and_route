// backend/routes/truckRoutes.js
const router            = require('express').Router();
const authMiddleware    = require('../middleware/authMiddleware');
const getUserWithRole   = require('../middleware/getUserWithRole');
const requireRole       = require('../middleware/requireRole');
const { saveRoute, getRoutesByPlate } = require('../controllers/truckController');

// ─────────────────────────────────────────────────────
// All routes in this router now require a valid Supabase JWT
// and will have req.user populated
// ─────────────────────────────────────────────────────
router.use(authMiddleware, getUserWithRole);

// POST /api/trucks
// Save a route (dispatcher, transport_manager, team_lead, admin)
router.post(
  '/',
  requireRole('dispatcher', 'transport_manager', 'team_lead', 'admin'),
  saveRoute
);

// GET /api/trucks/:plate
// Get routes for a specific truck plate (dispatcher, transport_manager, team_lead, admin)
router.get(
  '/:plate',
  requireRole('dispatcher', 'transport_manager', 'team_lead', 'admin'),
  getRoutesByPlate
);

module.exports = router;
