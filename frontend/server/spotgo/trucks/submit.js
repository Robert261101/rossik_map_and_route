// frontend/api/spotgoTrucks/submit.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = req.headers.authorization || '';
  const authEmail = req.headers['authorization-email'] || '';
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });

  try {
    const base = process.env.SPOTGO_BASE_URL || 'https://api.spotgo.eu/api/v1';
    const url = `${base}/vehicles`; // SpotGo Vehicles endpoint

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        // pass-through extras if you use them
        'x-api-version': req.headers['x-api-version'] || '1.0',
        'authorization-email': authEmail,
      },
      body: JSON.stringify(req.body || {}),
    });

    const text = await upstream.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

    // Propagate status from SpotGo
    return res.status(upstream.status).json(json);
  } catch (e) {
    console.error('vehicles submit error', e);
    return res.status(500).json({ error: 'Upstream error' });
  }
}
