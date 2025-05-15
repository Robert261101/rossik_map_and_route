// backend/routes/routesRoutes.js
const express = require('express');
const router  = express.Router();
const { supabase } = require('../lib/supabase');

// GET   /api/routes                → list all runs (optionally filter by team_id, truck_id, date)
router.get('/', async (req, res) => {
  let q = supabase.from('routes').select('*');
  if (req.query.team_id)  q = q.eq('team_id', req.query.team_id);
  if (req.query.truck_id) q = q.eq('truck_id', req.query.truck_id);
  if (req.query.date)     q = q.eq('date', req.query.date);

  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// POST  /api/routes                → save a new run
router.post('/', async (req, res) => {
  const {
    team_id,
    created_by,
    date,
    identifier,
    truck_id,
    addresses,
    euro_per_km,
    distance_km,
    cost_per_km,
    tolls,
    toll_cost,
    total_cost,
    duration
  } = req.body;

  const { data, error } = await supabase
    .from('routes')
    .insert([{
      team_id,
      created_by,
      date,
      identifier,
      truck_id,
      addresses,
      euro_per_km,
      distance_km,
      cost_per_km,
      tolls,
      toll_cost,
      total_cost,
      duration
    }])
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});

// PUT   /api/routes/:id            → update an existing run
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body; // any of the fields you want to patch
  const { data, error } = await supabase
    .from('routes')
    .update(updates)
    .eq('id', id)
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

// DELETE /api/routes/:id           → delete a run
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('routes')
    .delete()
    .eq('id', id);

  if (error) return res.status(400).json({ message: error.message });
  res.status(204).end();
});

module.exports = router;
