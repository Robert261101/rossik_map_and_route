// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.REACT_APP_SUPABASE_URL,           // same URL
  process.env.SUPABASE_SERVICE_ROLE_KEY           // stronger key, DO NOT expose in browser!
);

export default supabaseAdmin;
