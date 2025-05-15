// backend/routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

// GET   /api/teams              → list all teams
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// POST  /api/teams              → create a new team
router.post('/', async (req, res) => {
  const { name, created_by, members = [] } = req.body;
  const { data, error } = await supabase
    .from('teams')
    .insert([{ name, created_by, members }])
    .single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});

// PUT   /api/teams/:id          → update team name or members
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body; // e.g. { name: 'New Name' } or { members: [...] }
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

// DELETE /api/teams/:id         → delete team
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id);
  if (error) return res.status(400).json({ message: error.message });
  res.status(204).end();
});

module.exports = router;
