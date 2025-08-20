// backend/routes/spotgo/trucks/update.js
const fetch = require('node-fetch');

module.exports = async function updateVehicle(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'Missing vehicle ID in URL.' });

  const apiKey = process.env.SPOTGO_API_KEY || 'YOUR_KEY_HERE';
  if (!apiKey) return res.status(500).json({ error: 'Missing SpotGo API key' });

  const body = req.body || {};
  // If you want to enforce owner here too, uncomment:
  // body.owner = process.env.SPOTGO_OWNER_EMAIL || 'spot.loads@rossik.eu';

  try {
    const upstream = await fetch(`https://api.spotgo.eu/api/v1/vehicles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type'  : 'application/json',
        'x-api-version' : '1.0',
        'X-Api-Key'     : apiKey,
      },
      body: JSON.stringify(body),
    });

    const txt = await upstream.text();
    if (!upstream.ok) return res.status(upstream.status).send(txt || 'Unknown SpotGo error');
    try { return res.status(200).json(JSON.parse(txt || '{}')); }
    catch { return res.status(200).send(txt); }
  } catch (err) {
    console.error('[Vehicles Update Error]:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
};
