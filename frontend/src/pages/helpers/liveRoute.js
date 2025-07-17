// // src/pages/helpers/liveRoute.js

// /**
//  * Requests a fully‐constrained truck route leg, returning both polyline AND summary/toll info.
//  */
// async function drawLeg(o, d, vehicleType, apiKey) {
//   const params = new URLSearchParams({
//     origin:      `${o.lat},${o.lng}`,
//     destination: `${d.lat},${d.lng}`,
//     transportMode:   "truck",
//     "truck[axleCount]":   vehicleType.axles,
//     "vehicle[grossWeight]": vehicleType.weight,
//     "vehicle[height]":     400,
//     "vehicle[width]":      255,
//     "vehicle[length]":     1875,
//     "tolls[emissionType]": "euro6",
//     alternatives: "1",
//     return:       "polyline,summary,actions,instructions,tolls",
//     apikey:       apiKey,
//   });

//   const res = await fetch(
//     `https://router.hereapi.com/v8/routes?${params.toString()}`
//   );
//   if (!res.ok) throw new Error(`HERE API error ${res.status}`);
//   const { routes } = await res.json();
//   return routes?.[0]?.sections.map(s => s.polyline).join("") || null;
// }


// export async function calculateAndDisplayLiveRoute(
//   map, start, end, vehicleType,
//   viaLat, viaLng,
//   apiKey
// ) {
//   if (!map) return;

//   const snappedVia = { lat: viaLat, lng: viaLng };

//   // build leg1 and leg2 in parallel
//   const [leg1, leg2] = await Promise.all([
//     drawLeg(start,      snappedVia,   vehicleType, apiKey),
//     drawLeg(snappedVia, end,          vehicleType, apiKey)
//   ]);

//   // clear old live-route
//   map.getObjects().forEach(o => {
//     if (o instanceof window.H.map.Polyline && o.getData()==="live") {
//       map.removeObject(o);
//     }
//   });

//   // render each leg as its own orange polyline
//   for (let pl of [leg1, leg2]) {
//     if (!pl) continue;
//     const ls = window.H.geo.LineString.fromFlexiblePolyline(pl);
//     const poly = new window.H.map.Polyline(ls, {
//       style: { strokeColor: "orange", lineWidth: 4 }
//     });
//     poly.setData("live");
//     map.addObject(poly);
//   }
// }


// src/pages/helpers/liveRoute.js

/**
 * Displays a single fully‐constrained truck route (with a via) in orange on the HERE map.
 */
import React from 'react';

/**
 * Displays a single fully‑constrained truck route (with a via) in orange on the HERE map,
 * choosing the fastest among alternatives.
 */
export async function calculateAndDisplayLiveRoute(
  map,
  start,
  end,
  vehicleType,
  viaLat,
  viaLng,
  apiKey
) {
  if (!map) return;

  // Build one global‑opt route request with origin → via → destination
  const params = new URLSearchParams({
    origin:                 `${start.lat},${start.lng}`,
    via:                    `${viaLat},${viaLng}`,
    destination:            `${end.lat},${end.lng}`,
    transportMode:          'truck',
    'truck[axleCount]':     vehicleType.axles,
    'vehicle[grossWeight]': vehicleType.weight,
    'vehicle[height]':      vehicleType.height ?? 400,
    'vehicle[width]':       vehicleType.width  ?? 255,
    'vehicle[length]':      vehicleType.length ?? 1875,
    'tolls[emissionType]':  'euro6',
    alternatives:           '3',
    return:                 'polyline,summary,actions,instructions,tolls',
    apikey:                 apiKey,
  });

  params.append('vehicle[weightPerAxle]', '11500');
  params.append('truck[limitedWeight]',  '7500');

  const res = await fetch(`https://router.hereapi.com/v8/routes?${params.toString()}`);
  if (!res.ok) {
    console.error('HERE live‑route error', res.status, await res.text());
    return;
  }
  const { routes } = await res.json();
  if (!routes?.length) return;

  // Determine the fastest route by total duration
  const fastestRoute = routes
    .map(r => ({
      sections: r.sections,
      duration: r.sections.reduce((sum, s) => sum + (s.summary?.duration || 0), 0)
    }))
    .sort((a, b) => a.duration - b.duration)[0].sections;

  // Clear previous live‑preview polylines
  map.getObjects().forEach(o => {
    if (o instanceof window.H.map.Polyline && o.getData() === 'live') {
      map.removeObject(o);
    }
  });

  // Draw each section of the fastest route as an orange polyline
  fastestRoute.forEach(section => {
    const ls = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
    const poly = new window.H.map.Polyline(ls, {
      style: { strokeColor: 'orange', lineWidth: 4 }
    });
    poly.setData('live');
    map.addObject(poly);
  });
}
