// frontend/api/spotGo/submit.js

import { supabaseAdmin } from '../../src/lib/supabaseAdmin'

const formatName = (email = '') => {
  if (!email.includes('@')) return '';
  const local = email.split('@')[0];
  return local
    .split('.')
    .map(p => p[0]?.toUpperCase() + p.slice(1))
    .join(' ');
};

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


    if (!response.ok) {
      console.error(`[SpotGo Error] ${response.status}:`, text);
      return res.status(response.status).send(text || 'Unknown error from SpotGo');
    }

    const json = await response.json();

    try {
      const userEmail = req.headers['authorization-email'] || 'unknown@example.com';
      const namePrefix = formatName(userEmail);

      freightData.externalNumber = namePrefix;

      console.log("freightData.comments:", freightData.comments);
      console.log("freightData.payment:", freightData.payment);
      console.log("freightData.requirements:", freightData.requirements);
      console.log("freightData.locations:", freightData.locations);


      console.log("DB INSERT PAYLOAD:", {
        offer_id: json.id || null,
        external_number: freightData.externalNumber,
        loading_address: freightData.locations?.[0]?.address?.label || '',
        unloading_address: freightData.locations?.[1]?.address?.label || '',
        external_comment: freightData.comments || null,
        hide_locations: freightData.useAlternativeLocations ?? null,
        pallets_exchange: freightData.requirements?.palletsExchange ?? null,
        vehicle_types: freightData.requirements?.vehicleTypes || null,
        body_types: freightData.requirements?.trailerTypes || null,
        freight_charge: freightData.payment?.from ?? null,
        currency: freightData.payment?.currency || null,
        payment_due: freightData.payment?.dueDate || null,
        length_m: freightData.requirements?.ldm ?? null,
        weight_t: freightData.requirements?.capacity ?? null,
        submitted_by_email: userEmail
      });

      const { error } = await supabaseAdmin.from('submitted_offers').insert([
        {
          offer_id: json.id || null,
          external_number: namePrefix,
          loading_address: freightData.locations?.[0]?.address?.label || '',
          unloading_address: freightData.locations?.[1]?.address?.label || '',
          created_at: new Date().toISOString(),

          // new fields
          external_comment: freightData.comments || null,
          hide_locations: freightData.useAlternativeLocations ?? null,
          pallets_exchange: freightData.requirements?.palletsExchange ?? null,
          vehicle_types: freightData.requirements?.vehicleTypes || null,
          body_types: freightData.requirements?.trailerTypes || null,
          freight_charge: freightData.payment?.from ?? null,
          currency: freightData.payment?.currency || null,
          payment_due: freightData.payment?.dueDate || null,
          length_m: freightData.requirements?.ldm ?? null,
          weight_t: freightData.requirements?.capacity ?? null,
          submitted_by_email: userEmail
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
