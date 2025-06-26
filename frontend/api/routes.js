// /frontend/api/routes.js
import { createClient } from '@supabase/supabase-js';
import getUserWithRole     from './lib/getUserWithRole';
import requireRole         from './lib/requireRole';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED    = ['dispatcher','transport_manager','team_lead','admin'];
const PRIVILEGED = ['admin'];

export default async function handler(req, res) {
  console.log('🛠️  /api/routes handler hit! method=', req.method);

  let user;
  try {
    user = await getUserWithRole(req);
    requireRole(ALLOWED, user);
  } catch (err) {
    console.error('🔒 auth error:', err);
    return res.status(err.status || 401).json({ error: err.message });
  }

  if (req.method === 'POST') {
    // … your POST logic unchanged, using `user` …
  }
  else if (req.method === 'GET') {
    // … your GET logic unchanged, using `user` …
  }
  else {
    res.setHeader('Allow', ['GET','POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
