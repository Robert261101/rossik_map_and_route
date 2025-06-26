// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      // stocăm sesiunea exclusiv în sessionStorage
      storage: sessionStorage,
      // auto-refresh token când expiră
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }
)
