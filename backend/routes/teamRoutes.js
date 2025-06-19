// backend/routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');

/**
 * GET /api/teams
 * List all teams, ordered by creation date desc.
 */
router.get(
  '/',
  requireRole('admin'),
  async (req, res) => {
    try {
      const { data, error } = await req.supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Error fetching teams:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/teams
 * Create a new team.
 */
router.post(
  '/',
  requireRole('admin'),
  async (req, res) => {
    try {
      const { data, error } = await req.supabase
        .from('teams')
        .insert([req.body])
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('Error creating team:', err);
      res.status(400).json({ error: err.message });
    }
  }
);

/**
 * PUT /api/teams/:id
 * Update a team by ID.
 */
router.put(
  '/:id',
  requireRole('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const { data, error } = await req.supabase
        .from('teams')
        .update(updates)
        .eq('id', id)
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Error updating team:', err);
      res.status(400).json({ error: err.message });
    }
  }
);

/**
 * DELETE /api/teams/:id
 * Delete a team by ID.
 */
router.delete(
  '/:id',
  requireRole('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await req.supabase
        .from('teams')
        .delete()
        .eq('id', id);
      if (error) throw error;
      res.status(204).end();
    } catch (err) {
      console.error('Error deleting team:', err);
      res.status(400).json({ error: err.message });
    }
  }
);

module.exports = router;
