// lib/getUserWithRole.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AuthError extends Error {
  constructor(message, status=401) {
    super(message);
    this.status = status;
  }
}

module.exports = async function getUserWithRole(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header', 401);
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new AuthError('Invalid token or user not found', 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new AuthError('User profile not found or error fetching role', 403);
  }

  return profile;  // Pass back the user
};
