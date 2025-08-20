// backend/routes/spotgo/trucks/submit.js
const fetch = require('node-fetch');

module.exports = async function submitVehicle(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing freight ID' });
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const apiKey = "zTr@sMfsn%hTJeS58qgmF2Lcq8xd9#J$";
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing SpotGo API key' });
  }

  try {
    const response = await fetch(`https://api.spotgo.eu/api/v1/vehicles/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type'  : 'application/json',
        'x-api-version' : '1.0',
        'X-Api-Key'     : apiKey,
      },
    });

    if (response.ok) {
      return res.status(200).json({ message: 'Vehicle deleted.' });
    }
    const text = await response.text();
    console.error(`[SpotGo Delete Error] ${response.status}:`, errText);
    return res.status(response.status).send(errText || 'Unknown delete error');
  } catch (err) {
    console.error('[Vehicles Submit Error]:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
};
