// src/pages/helpers/liveRoute.js

/**
 * Returns a single FlexiblePolyline string for the best truck‐route
 * from o → d (no via, no radius).
 */
async function drawLeg(o, d, vehicleType, apiKey) {
  const qs = [
    `origin=${o.lat},${o.lng}`,
    `destination=${d.lat},${d.lng}`,
    `return=polyline`,
    `transportMode=truck`,
    `truck[axleCount]=${vehicleType.axles}`,
    `vehicle[grossWeight]=${vehicleType.weight}`,
    `apikey=${apiKey}`
  ].join("&");

  const res = await fetch(`https://router.hereapi.com/v8/routes?${qs}`);
  const { routes } = await res.json();
  if (!routes?.length) return null;

  // concatenate all section polylines
  return routes[0].sections.map(s => s.polyline).join("");
}

export async function calculateAndDisplayLiveRoute(
  map, start, end, vehicleType,
  viaLat, viaLng,
  apiKey
) {
  if (!map) return;

  // snap your draggable handle to the road? (optional)
  const snappedVia = { lat: viaLat, lng: viaLng };

  // build leg1 and leg2 in parallel
  const [leg1, leg2] = await Promise.all([
    drawLeg(start,      snappedVia,   vehicleType, apiKey),
    drawLeg(snappedVia, end,          vehicleType, apiKey)
  ]);

  // clear old live-route
  map.getObjects().forEach(o => {
    if (o instanceof window.H.map.Polyline && o.getData()==="live") {
      map.removeObject(o);
    }
  });

  // render each leg as its own orange polyline
  for (let pl of [leg1, leg2]) {
    if (!pl) continue;
    const ls = window.H.geo.LineString.fromFlexiblePolyline(pl);
    const poly = new window.H.map.Polyline(ls, {
      style: { strokeColor: "orange", lineWidth: 4 }
    });
    poly.setData("live");
    map.addObject(poly);
  }
}
