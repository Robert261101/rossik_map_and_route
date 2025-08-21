// frontend/server/spotgo/trucks/[id].js
export default async function handler(req, res) {
  const { id } = req.query;
  const method = req.method;

  if (!['GET', 'PUT', 'DELETE'].includes(method)) {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!id) return res.status(400).json({ error: 'Missing id' });

  // Local access control (don’t forward this to SpotGo)
  const auth = req.headers.authorization || '';
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });

  const base   = process.env.SPOTGO_BASE_URL || 'https://api.spotgo.eu/api/v1';
  const apiKey = process.env.SPOTGO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfigured: SPOTGO_API_KEY' });
  }

  const url = `${base}/vehicles/${encodeURIComponent(id)}`;

  try {
    const upstream = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': req.headers['x-api-version'] || '1.0',
        'X-Api-Key': apiKey, // ✅ SpotGo expects this
      },
      body: method === 'PUT' ? JSON.stringify(req.body || {}) : undefined,
    });

    const text = await upstream.text();
    if (!text) return res.status(upstream.status).end(); // e.g., 204 No Content

    let json;
    try { json = JSON.parse(text); }
    catch { json = { raw: text }; }

    return res.status(upstream.status).json(json);
  } catch (e) {
    console.error('vehicles id error', e);
    return res.status(500).json({ error: 'Upstream error' });
  }
}
