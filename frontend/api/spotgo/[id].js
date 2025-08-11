// pages/api/spotGo/[id].js
import { supabaseAdmin } from '../../../src/lib/supabaseAdmin';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: "Missing freight ID in request." });

  const SPOTGO_URL = `https://api.spotgo.eu/api/v1/freights/${id}`;
  const apiKey = "zTr@sMfsn%hTJeS58qgmF2Lcq8xd9#J$";

  if (!apiKey) return res.status(500).json({ error: "Missing SpotGo API key." });

  if (req.method === 'DELETE') {
    try {
      const response = await fetch(SPOTGO_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '1.0',
          'X-Api-Key': apiKey
        }
      });

      const errText = await response.text();
      if (!response.ok) {
        console.error(`[SpotGo Delete Error] ${response.status}:`, errText);
        return res.status(response.status).send(errText || 'Unknown delete error');
      }

      return res.status(200).json({ message: "Freight deleted." });
    } catch (err) {
      console.error("Delete proxy error:", err);
      res.status(500).json({ error: err.message || 'Unexpected error' });
    }
  }

  else if (req.method === 'PUT') {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const userEmail = req.headers['authorization-email'] || "unknown@user.com";

    console.log("💥 Incoming PUT payload:", JSON.stringify(req.body, null, 2));

    try {
        const response = await fetch(SPOTGO_URL, {
            method: 'PUT',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'authorization-email': userEmail,
            'x-api-version': '1.0'
            },
            body: JSON.stringify(req.body)
        });

        const text = await response.text();
        console.log("📨 SpotGo PUT status:", response.status);
        console.log("📨 SpotGo PUT response:", text);

        if (!response.ok) {
            console.error(`[SpotGo PUT Error] ${response.status}:`, text);
            return res.status(response.status).send(text);
        }

        const { error } = await supabaseAdmin
            .from('submitted_offers')
            .update({
            ...req.body,
            updated_at: new Date().toISOString()
            })
            .eq('offer_id', id);

        if (error) console.error("Supabase PUT update error:", error.message);

        return res.status(200).json({id, message: "Freight updated." });
    } catch (err) {
      console.error("PUT proxy error:", err);
      return res.status(500).json({ error: err.message || 'Unexpected PUT error' });
    }
  }

  else {
    res.setHeader('Allow', ['DELETE', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
