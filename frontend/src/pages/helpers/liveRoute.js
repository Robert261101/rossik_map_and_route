// src/pages/helpers/liveRoute.js

/**
 * Displays a single fully-constrained truck route (with a via) in orange on the HERE map,
 * choosing the fastest among alternatives, and returns a cleanup handle.
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
  if (!map) return { remove() {} }; // graceful no-op

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
    console.error('HERE live-route error', res.status, await res.text());
    return { remove() {} };
  }

  const { routes } = await res.json();
  if (!routes?.length) return { remove() {} };

  // pick the fastest by total duration
  const fastestSections = routes
    .map(r => ({
      sections: r.sections,
      duration: r.sections.reduce((sum, s) => sum + (s.summary?.duration || 0), 0)
    }))
    .sort((a, b) => a.duration - b.duration)[0].sections;

  // group all preview polylines for this call
  const group = new window.H.map.Group();
  fastestSections.forEach(section => {
    const ls = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
    const poly = new window.H.map.Polyline(ls, {
      style: { strokeColor: 'orange', lineWidth: 4 }
    });
    // tag if you still want (not strictly needed now)
    poly.setData(`live-${legIdx}`);
    group.addObject(poly);
  });

  map.addObject(group);

  // return cleanup handle so caller can replace/undo previews for this leg
  return {
    remove() {
      try { map.removeObject(group); } catch (_) {}
    }
  };
}
