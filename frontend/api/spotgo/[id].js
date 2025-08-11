// frontend/api/spotgo/[id].js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const apiKey = "zTr@sMfsn%hTJeS58qgmF2Lcq8xd9#J$"

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing freight ID' });

  // Auth from browser (Option B)
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token or user not found' });

  apiKey = process.env.SPOTGO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfigured (SPOTGO_API_KEY)' });

  const url = `https://api.spotgo.eu/api/v1/freights/${id}`;
  const common = { 'x-api-version': '1.0', 'X-Api-Key': apiKey };

  try {
    if (req.method === 'PUT') {
      // IMPORTANT: SpotGo expects X-Api-Key, not your Supabase token
      const upstream = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...common },
        body: JSON.stringify(req.body)
      });

      const text = await upstream.text();
      if (!upstream.ok) return res.status(upstream.status).send(text || 'SpotGo error');

      // Optional: update your DB row
      const { error } = await supabaseAdmin
        .from('submitted_offers')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('offer_id', id);
      if (error) console.error('Supabase PUT update error:', error.message);

      return res.status(200).send(text);
    }

    if (req.method === 'DELETE') {
      const upstream = await fetch(url, { method: 'DELETE', headers: common });
      const text = await upstream.text();
      if (!upstream.ok) return res.status(upstream.status).send(text || 'SpotGo error');

      // Optional: delete from DB
      const { error } = await supabaseAdmin
        .from('submitted_offers')
        .delete()
        .eq('offer_id', id);
      if (error) console.error('Supabase delete error:', error.message);

      return res.status(200).json({ message: 'Freight deleted.' });
    }

    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (e) {
    console.error('[spotgo/[id]] error:', e);
    return res.status(500).json({ error: 'A server error has occurred' });
  }
}
