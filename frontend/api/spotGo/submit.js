// // api/spotGo/submit.js

// import fetch from 'node-fetch';

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     res.setHeader('Allow', ['POST']);
//     return res.status(405).end(`Method ${req.method} Not Allowed`);
//   }

//   const SPOTGO_URL = 'https://api.spotgo.eu/api/v1/freights';
//   const apiKey = process.env.SPOTGO_API_KEY;
//   const ownerEmail = process.env.SPOTGO_OWNER_EMAIL;

//   if (!apiKey || !ownerEmail) {
//     return res.status(500).json({ error: "Missing API key or owner email in server config." });
//   }

//   const freightData = req.body;
//   freightData.owner = ownerEmail;

//   try {
//     const response = await fetch(SPOTGO_URL, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'x-api-version': '1.0',
//         'X-Api-Key': apiKey
//       },
//       body: JSON.stringify(freightData)
//     });

//     const text = await response.text();

//     if (!response.ok) {
//       console.error(`[SpotGo Error] ${response.status}:`, text);
//       return res.status(response.status).send(text || 'Unknown error from SpotGo');
//     }

//     let json;
//     try {
//       json = JSON.parse(text);
//     } catch {
//       json = { raw: text };
//     }

//     res.status(200).json(json);
//   } catch (err) {
//     console.error("[API Proxy Error]:", err);
//     res.status(500).json({ error: err.message || 'Unexpected server error' });
//   }
// }
