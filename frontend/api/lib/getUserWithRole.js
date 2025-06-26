// api/lib/getUserWithRole.js
const { createClient } = require('@supabase/supabase-js');

console.log('🔥 getUserWithRole env:', {
  SUPABASE_URL:                process.env.SUPABASE_URL,
  SERVICE_ROLE_KEY:            process.env.SUPABASE_SERVICE_ROLE_KEY,
  HAS_REACT_APP_PREFIXED_URL:  process.env.REACT_APP_SUPABASE_URL,
  HAS_REACT_APP_PREFIXED_KEY:  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
});


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


module.exports = async function getUserWithRole(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token or user not found' });
  }

  const { data: profile, error: profileError } = await supabase
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