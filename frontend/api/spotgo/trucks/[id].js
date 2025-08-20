// frontend/api/spotgoTrucks/[id].js
export default async function handler(req, res) {
  const { id } = req.query;
  const method = req.method;

  const auth = req.headers.authorization || '';
  const authEmail = req.headers['authorization-email'] || '';
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });

  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (!['DELETE', 'PUT', 'GET'].includes(method)) {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const base = process.env.SPOTGO_BASE_URL || 'https://api.spotgo.eu/api/v1';
    const url = `${base}/vehicles/${encodeURIComponent(id)}`;

    const upstream = await fetch(url, {
      method,
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'x-api-version': req.headers['x-api-version'] || '1.0',
        'authorization-email': authEmail,
      },
      body: method === 'PUT' ? JSON.stringify(req.body || {}) : undefined,
    });

    const text = await upstream.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

    return res.status(upstream.status).json(json);
  } catch (e) {
    console.error('vehicles id error', e);
    return res.status(500).json({ error: 'Upstream error' });
  }
}
