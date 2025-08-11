// backend/routes/spotgo/update.js
const fetch = require('node-fetch');

module.exports = async function updateSpotGo(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const offerId = req.params.id;
  if (!offerId) return res.status(400).json({ error: 'Missing offer ID in URL.' });

  // Accept both shapes: flat SpotGo body OR { spotGoPayload: {...} }
  const bodyFromClient = req.body || {};
  const spotGoBody = bodyFromClient.spotGoPayload || bodyFromClient;

  // (Optional) If you still want this route to touch Supabase,
  // do it only if the client sent DB-shaped fields (snake_case).
  // Otherwise, skip. For now we skip to avoid clobbering:
  // --- SKIPPING DB UPDATE; the page updates Supabase directly ---

  const apiKey = process.env.SPOTGO_API_KEY || 'zTr@sMfsn%hTJeS58qgmF2Lcq8xd9#J$'; // move to .env
  if (!apiKey) return res.status(500).json({ error: 'Missing SpotGo API key' });

  const url = `https://api.spotgo.eu/api/v1/freights/${offerId}`;

  try {
    // console.log('➡️ PUT SpotGo', url);
    // console.log('🧾 Body:', JSON.stringify(spotGoBody, null, 2));

    const upstream = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type':  'application/json',
        'x-api-version': '1.0',
        'X-Api-Key':     apiKey
      },
      body: JSON.stringify(spotGoBody)
    });

    const respText = await upstream.text();
    // console.log('📨 SpotGo status:', upstream.status);
    // console.log('📨 SpotGo response:', respText);

    if (!upstream.ok) {
      return res.status(upstream.status).send(respText || 'Unknown SpotGo error');
    }

    try {
      return res.status(200).json(JSON.parse(respText));
    } catch {
      return res.status(200).send(respText);
    }
  } catch (err) {
    console.error('[SpotGo Update Error]:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
};
