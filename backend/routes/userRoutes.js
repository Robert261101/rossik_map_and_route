// backend/routes/userRoutes.js
const express = require('express');
const router  = express.Router();

// Auth + role checks
const authMiddleware  = require('../middleware/authMiddleware');
const getUserWithRole = require('../middleware/getUserWithRole');
const requireRole     = require('../middleware/requireRole');
const { supabaseAdmin } = require('../lib/supabase');

// All of these routes are admin-only
router.use(authMiddleware, getUserWithRole, requireRole('admin'));

/**
 * GET /api/users
 * List all users (excluding passwords, since we never store them here).
 */
router.get('/', async (req, res) => {
  try {
    // Bypass RLS so we can see every user
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, role, team_id');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/users
 * Create a new user in both auth and your public users table.
 * Body: { email, password, username, role, team_id }
 */
router.post('/', async (req, res) => {
  const { email, password, username, role, team_id } = req.body;
  if (!email || !password || !username || !role || !team_id) {
    return res.status(400).json({ error: 'email, password, username, role, and team_id are all required' });
  }

  try {
    // 1. Create in the Auth schema
    const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { role, team_id },
    });
    if (createErr) throw createErr;

    // 2. Mirror in your public `users` table
    const { error: insertErr } = await supabaseAdmin
      .from('users')
      .insert({
        id:       authData.user.id,
        username,
        role,
        team_id,
      });
    if (insertErr) throw insertErr;

    res.status(201).json({ user: authData.user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/users/:id
 * Remove both the public record and the auth user.
 */
router.delete('/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    // 1. Delete from your public users table
    const { error: delErr } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);
    if (delErr) throw delErr;

    // 2. Delete from the Auth schema
    const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDelErr) throw authDelErr;

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
