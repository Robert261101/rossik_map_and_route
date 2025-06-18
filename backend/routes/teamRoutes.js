// backend/routes/teamRoutes.js
const express = require('express');
const router = express.Router();

/**
 * GET   /api/teams
 *   List all teams, ordered by creation date desc.
 *   Uses req.supabase (anon key + user token → RLS).
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// /**
//  * POST  /api/teams
//  *   Create a new team.
//  *   Body: { name, /* other fields as before */ }

//  */
router.post('/', async (req, res) => {
  try {
    // mirror the old behavior—just pass through the same req.body
    const { data, error } = await req.supabase
      .from('teams')
      .insert([req.body])
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * PUT   /api/teams/:id
 *   Update a team by ID.
 *   Body: partial team object to merge.
 */
router.put('/:id', async (req, res) => {
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
    res.status(400).json({ message: err.message });
  }
});

/**
 * DELETE /api/teams/:id
 *   Delete a team by ID.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await req.supabase
      .from('teams')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
