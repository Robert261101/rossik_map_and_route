// backend/routes/routesRoutes.js
const express = require('express');
const router  = express.Router();
const requireRole = require('../middleware/requireRole');

/**
 * GET /api/routes
 * List all runs, with optional filtering by team_id, truck_id, or date.
 * Now uses req.supabase (anon key + user token), so RLS is automatically applied.
 */
router.get(
  '/',
  requireRole('dispatcher', 'transport_manager', 'team_lead', 'admin'),
  async (req, res) => {
    // 1. Guard against unauthenticated access
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      // 2. Build your base query, pulling in related rows and sorting by date
      let q = req.supabase
        .from('routes')
        .select('*, users:created_by(username), trucks!inner(plate), sections(*)')
        .order('date', { ascending: false });

      // 3. Non-admins can only see their own team’s routes
      if (req.user.role !== 'admin') {
        q = q.eq('team_id', req.user.team_id);
      }

      // 4. Apply optional query‐param filters
      if (req.query.team_id)  q = q.eq('team_id', req.query.team_id);
      if (req.query.truck_id) q = q.eq('truck_id', req.query.truck_id);
      if (req.query.date)     q = q.eq('date', req.query.date);

      // 5. Execute
      const { data, error } = await q;
      if (error) throw error;

      res.json(data);
    } catch (err) {
      console.error('Error listing routes:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * DELETE /api/routes/:id
 * Delete a run by ID.
 */
router.delete(
  '/:id',
  requireRole('team_lead', 'admin'),
  async (req, res) => {
    // 1. Guard
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { id } = req.params;

      // 2. Fetch the route to confirm it exists and belongs to the user’s team
      const { data: route, error: fetchErr } = await req.supabase
        .from('routes')
        .select('team_id')
        .eq('id', id)
        .single();

      if (fetchErr || !route) {
        return res.status(404).json({ error: 'Route not found' });
      }
      if (route.team_id !== req.user.team_id) {
        return res.status(403).json({ error: 'Cannot delete route outside your team' });
      }

      // 3. Perform the delete
      const { error: deleteErr } = await req.supabase
        .from('routes')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;
      // 204 since there's no body on success
      return res.status(204).end();
    } catch (err) {
      console.error('Error deleting route:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
