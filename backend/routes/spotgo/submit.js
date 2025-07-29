// backend/routes/spotgo/submit.js
// const fetch = require('node-fetch');

module.exports = async function submitHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const apiKey = "zTr@sMfsn%hTJeS58qgmF2Lcq8xd9#J$";
  const ownerEmail = 'spot.loads@rossik.eu';
  if (!apiKey || !ownerEmail) {
    return res.status(500).json({ error: 'Missing API key or owner email' });
  }

  const freightData = req.body;
  freightData.owner = ownerEmail;

  try {
    const response = await fetch('https://api.spotgo.eu/api/v1/freights', {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-api-version':  '1.0',
        'X-Api-Key':      apiKey
      },
      body: JSON.stringify(freightData)
    });

    const text = await response.text();
    if (!response.ok) {
      console.error(`[SpotGo Error] ${response.status}:`, text);
      return res.status(response.status).send(text || 'Unknown error from SpotGo');
    }

    let json;
    try { json = JSON.parse(text); }
    catch { json = { raw: text }; }

    res.status(200).json(json);
  } catch (err) {
    console.error('[SpotGo Submit Error]:', err);
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
};
