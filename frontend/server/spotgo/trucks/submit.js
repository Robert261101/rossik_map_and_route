export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const base = process.env.SPOTGO_BASE_URL || 'https://api.spotgo.eu/api/v1';
  const apiKey = process.env.SPOTGO_API_KEY;
  const ownerEmail = process.env.SPOTGO_OWNER_EMAIL;

  if (!apiKey || !ownerEmail) {
    return res.status(500).json({ error: 'Server misconfigured: SPOTGO_API_KEY / SPOTGO_OWNER_EMAIL' });
  }

  // Use server-controlled owner + pass through the user payload
  const body = { ...(req.body || {}), owner: ownerEmail };

  try {
    const upstream = await fetch(`${base}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': req.headers['x-api-version'] || '1.0',
        'X-Api-Key': apiKey,                // ✅ SpotGo expects this
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error('[SpotGo vehicles submit]', upstream.status, text);
      return res.status(upstream.status).send(text || 'SpotGo error');
    }

    try { return res.status(200).json(JSON.parse(text || '{}')); }
    catch { return res.status(200).send(text); }
  } catch (e) {
    console.error('vehicles submit error', e);
    return res.status(500).json({ error: 'Upstream error' });
  }
}
