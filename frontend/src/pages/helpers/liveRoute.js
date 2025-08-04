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
  startStop,
  viaPoint,
  endStop,
  vehicleType,
  apiKey,
  legIdx
) {
  if (!map) return;

  // Build one global‑opt route request with origin → via → destination
  const params = new URLSearchParams({
    origin:                 `${startStop.lat},${startStop.lng}`,
    via:                    `${viaPoint.lat},${viaPoint.lng}`,
    destination:            `${endStop.lat},${endStop.lng}`,
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
    if (
      o instanceof window.H.map.Polyline &&
      o.getData() === `live-${legIdx}`
    ) {
      map.removeObject(o);
    }
  });



  // Draw each section of the fastest route as an orange polyline
  fastestRoute.forEach(section => {
    const ls = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
    const poly = new window.H.map.Polyline(ls, {
      style: { strokeColor: 'orange', lineWidth: 4 }
    });
    poly.setData(`live-${legIdx}`);
    map.addObject(poly);
  });
}
