// AFTER: backend/lib/supabase.js
const { createClient } = require('@supabase/supabase-js');

/**
 * supabaseAdmin: full-privilege client (bypasses RLS).
 * Use this sparingly for things like token-validation, user management, etc.
 */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * getSupabaseForUser: per-request client that enforces RLS.
 * @param {string} token  – a valid Supabase JWT (access_token)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabaseForUser(token) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      // Disable built-in session handling on the server
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    }
  );
  supabase.auth.setAuth(token);
  return supabase;
}

module.exports = { supabaseAdmin, getSupabaseForUser };
