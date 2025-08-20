// backend/routes/spotgo/trucks/submit.js
const fetch = require('node-fetch');

module.exports = async function submitVehicle(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const apiKey = "zTr@sMfsn%hTJeS58qgmF2Lcq8xd9#J$";
  const ownerEmail = 'spot.loads@rossik.eu';
  if (!apiKey || !ownerEmail) {
    return res.status(500).json({ error: 'Missing SpotGo API key or owner email' });
  }

  const body = { ...(req.body || {}) };
  body.owner = ownerEmail; // SpotGo expects email; keep server-controlled

  try {
    const upstream = await fetch('https://api.spotgo.eu/api/v1/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type'  : 'application/json',
        'x-api-version' : '1.0',
        'X-Api-Key'     : apiKey,
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error(`[SpotGo Vehicles Submit] ${upstream.status}:`, text);
      return res.status(upstream.status).send(text || 'Unknown error from SpotGo');
    }

    try { return res.status(200).json(JSON.parse(text || '{}')); }
    catch { return res.status(200).send(text); }
  } catch (err) {
    console.error('[Vehicles Submit Error]:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
};
