// middleware/getUserWithRole.js
const { supabaseAnon, supabaseService } = require('../lib/supabase');

module.exports = async function getUserWithRole(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token or user not found' });

  const { data: profile, error: profileError } = await supabaseService
    .from('users')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return res.status(403).json({ error: 'User profile not found or error fetching role' });
  }

  req.user = profile;
  next();
};
