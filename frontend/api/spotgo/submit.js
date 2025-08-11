import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Require browser JWT (Option B)
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const apiKey = process.env.SPOTGO_API_KEY;
  const ownerEmail = process.env.SPOTGO_OWNER_EMAIL;
  if (!apiKey || !ownerEmail) return res.status(500).json({ error: 'Server misconfigured' });

  const payload = { ...req.body, owner: ownerEmail };

  try {
    const upstream = await fetch('https://api.spotgo.eu/api/v1/freights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-version': '1.0', 'X-Api-Key': apiKey },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    if (!upstream.ok) return res.status(upstream.status).send(text || 'SpotGo error');

    let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return res.status(200).json(json);
  } catch (e) {
    console.error('[spotgo/submit] error:', e);
    return res.status(500).json({ error: 'A server error has occurred' });
  }
}
