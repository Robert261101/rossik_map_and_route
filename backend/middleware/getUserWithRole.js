// backend/middleware/getUserWithRole.js

const { supabaseAdmin } = require('../lib/supabase');

/**
 * After authMiddleware has verified the JWT, this middleware
 * looks up the user’s “role” (and any other metadata) in your
 * own users table so you can do role-based checks downstream.
 */
module.exports = async function getUserWithRole(req, res, next) {
  // 1. authMiddleware should already have populated req.authUser
  if (!req.authUser || !req.authUser.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  // 2. Pull in the user’s profile (role, team_id, etc.) with the service role key
  const { data: profile, error } = await supabaseAdmin
    .from('users')                 // your custom users table
    .select('id, role, team_id')
    .eq('id', req.authUser.id)
    .single();

  if (error || !profile) {
    return res
      .status(403)
      .json({ error: 'User profile not found or error fetching role' });
  }

  // 3. Attach it and move on
  req.user = profile;              // { id, role, team_id }
  next();
};
