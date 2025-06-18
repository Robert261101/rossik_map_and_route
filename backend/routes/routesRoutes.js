// backend/routes/routesRoutes.js
const express = require('express');
const router  = express.Router();

/**
 * GET /api/routes
 * List all runs, with optional filtering by team_id, truck_id, or date.
 * Now uses req.supabase (anon key + user token), so RLS is automatically applied.
 */
router.get('/', async (req, res) => {
  // 1) Start from the per-request client
  let q = req.supabase.from('routes').select('*');

  // 2) Apply the same query-param filters you had before
  if (req.query.team_id)  q = q.eq('team_id', req.query.team_id);
  if (req.query.truck_id) q = q.eq('truck_id', req.query.truck_id);
  if (req.query.date)     q = q.eq('date', req.query.date);

  // 3) Order exactly as before
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });

  res.json(data);
});

/**
 * DELETE /api/routes/:id
 * Delete a run by ID.
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await req.supabase
    .from('routes')
    .delete()
    .eq('id', id);

  if (error) return res.status(400).json({ message: error.message });
  res.status(204).end();
});

module.exports = router;
