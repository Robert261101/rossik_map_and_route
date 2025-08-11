const supabase = require('../../lib/supabaseAdmin').default;
const fetch = require('node-fetch');

module.exports = async function updateSpotGo(req, res) {
  const offerId = req.params.id;
  const payload = req.body;

  if (!offerId) {
    return res.status(400).json({ error: 'Missing offer ID in URL.' });
  }

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid payload.' });
  }

  try {
    // 1. Update în Supabase
    const { error: supabaseError } = await supabase
      .from('submitted_offers')
      .update({
        loading_address: payload.loading_address,
        unloading_address: payload.unloading_address,
        external_number: payload.external_number,
        external_comment: payload.external_comment,
        hide_locations: payload.hide_locations,
        pallets_exchange: payload.pallets_exchange,
        vehicle_types: payload.vehicle_types,
        body_types: payload.body_types,
        freight_charge: payload.freight_charge,
        currency: payload.currency,
        payment_due: payload.payment_due,
        length_m: payload.length_m,
        weight_t: payload.weight_t,
        submitted_by_email: payload.submitted_by_email,
        loading_country_code: payload.loading_country_code,
        loading_postal_code: payload.loading_postal_code,
        loading_lat: payload.loading_lat,
        loading_lng: payload.loading_lng,
        unloading_country_code: payload.unloading_country_code,
        unloading_postal_code: payload.unloading_postal_code,
        unloading_lat: payload.unloading_lat,
        unloading_lng: payload.unloading_lng,
        loading_start_time: payload.loading_start_time,
        loading_end_time: payload.loading_end_time,
        unloading_start_time: payload.unloading_start_time,
        unloading_end_time: payload.unloading_end_time,
        updated_at: new Date().toISOString()
      })
      .eq('offer_id', offerId);

    if (supabaseError) {
      console.error('Supabase update error:', supabaseError.message);
      return res.status(500).json({ error: 'Failed to update offer in DB.' });
    }

    // 2. (Opțional) Update în SpotGo
    if (payload.sendToSpotGo) {
      const spotGoUrl = `https://api.spotgo.eu/api/v1/freights/${offerId}`;
      console.log("🚚 SpotGo PAYLOAD TRIMIS:", JSON.stringify(payload.spotGoPayload, null, 2));
      console.log("🔑 SpotGo API Key (first 6 chars):", process.env.SPOTGO_API_KEY?.slice(0, 6));
      const spotGoRes = await fetch(spotGoUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '1.0',
          'X-Api-Key': process.env.SPOTGO_API_KEY || 'MISSING_API_KEY'
        },
        body: JSON.stringify(payload.spotGoPayload) // presupunem ca frontend-ul trimite și payloadul complet pt SpotGo
        
      });

      console.log("📦 SpotGo headers:", headers);

      const responseText = await spotGoRes.text();  // <- citește textul brut din răspuns
      console.log("🔍 SpotGo RESPONSE TEXT:", responseText);

      if (!spotGoRes.ok) {
        const errText = await spotGoRes.text();
        console.warn('SpotGo update error:', spotGoRes.status, errText);
        return res.status(502).json({ error: `SpotGo error: ${errText}` });
      }
    }

    return res.status(200).json({ message: 'Offer updated successfully.' });
  } catch (err) {
    console.error('Unexpected error during update:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
};
