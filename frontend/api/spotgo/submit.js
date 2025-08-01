// frontend/api/spotGo/submit.js

// import fetch from 'node-fetch';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const SPOTGO_URL = 'https://api.spotgo.eu/api/v1/freights';
  const apiKey = "zTr@sMfsn%hTJeS58qgmF2Lcq8xd9#J$";
  const ownerEmail = 'spot.loads@rossik.eu';

  if (!apiKey || !ownerEmail) {
    return res.status(500).json({ error: "Missing API key or owner email in server config." });
  }

  const freightData = req.body;
  freightData.owner = ownerEmail;

  try {
    const response = await fetch(SPOTGO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '1.0',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify(freightData)
    });

    const text = await response.text();

    if (!response.ok) {
      console.error(`[SpotGo Error] ${response.status}:`, text);
      return res.status(response.status).send(text || 'Unknown error from SpotGo');
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    try {
      const { error } = await supabaseAdmin.from('submitted_offers').insert([
        {
          offer_id: json.id || null,
          external_number: freightData.externalNumber,
          loading_address: freightData.locations?.[0]?.address?.label || '',
          unloading_address: freightData.locations?.[1]?.address?.label || '',
          submitted_at: new Date().toISOString()
        }
      ]);

      if (error) {
        console.error("Failed to save to Supabase:", error);
      }
    } catch (e) {
      console.error("Supabase insert exception:", e);
    }
    
    res.status(200).json(json);
  } catch (err) {
    console.error("[API Proxy Error]:", err);
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
