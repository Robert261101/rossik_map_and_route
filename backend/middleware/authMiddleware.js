// backend/middleware/authMiddleware.js
const { supabaseAdmin, getSupabaseForUser } = require('../lib/supabase');

module.exports = async function authMiddleware(req, res, next) {
  // 1. Grab the Bearer token (and guard against malformed headers)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  // 2. Verify it using our service-role client (bypasses RLS)
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // 3. Attach the Supabase-authenticated user & a scoped client to the request
  req.authUser = user;                         // { id, email, role, … }
  req.supabase  = getSupabaseForUser(token);   // RLS-aware client for DB calls

  return next();
};
