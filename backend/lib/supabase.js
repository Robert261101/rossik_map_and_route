// backend/lib/supabase.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ——— Fail fast if any key is missing ———
['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].forEach((k) => {
  if (!process.env[k]) {
    throw new Error(`Missing environment variable: ${k}`);
  }
});

/**
 * supabaseAdmin: full-privilege client (bypasses RLS).
 * Use sparingly (token validation, user mgmt, etc).
 */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * getSupabaseForUser: per-request client that enforces RLS.
 * @param {string} token – a valid Supabase JWT (access_token)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabaseForUser(token) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

module.exports = { supabaseAdmin, getSupabaseForUser };
