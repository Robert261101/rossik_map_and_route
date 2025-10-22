// utils/segments.js

function haversineKm(a, b) {
  const R = 6371;
  const dLat = (Math.PI / 180) * (b.lat - a.lat);
  const dLng = (Math.PI / 180) * (b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 =
    Math.cos((Math.PI / 180) * a.lat) *
    Math.cos((Math.PI / 180) * b.lat) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

export function extractCityFromLabel(label = "") {
  if (!label) return null;
  const first = label.split(",")[0].trim(); // taie țara și restul

  // RO-330161 Deva | TÜ-06420 Ankara | 1000 София | 330161 Deva
  let m = first.match(/^[^\d]*\d{4,6}\s+(.+)$/u);
  if (m) return m[1].trim();

  // Deva 330161
  m = first.match(/^(.+?)\s+\d{4,6}\b/u);
  if (m) return m[1].trim();

  // fallback: primul token fără cifre
  const tok = first.split(/\s+/).find(t => !/\d/.test(t));
  return tok || null;
}

export function segmentsFromHereSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.map((s, i) => {
    const fromAddr = s?.departure?.place?.address || {};
    const toAddr   = s?.arrival?.place?.address || {};
    const fromName =
      fromAddr.city ||
      extractCityFromLabel(fromAddr.label) ||
      `Adresa${i + 1}`;
    const toName =
      toAddr.city ||
      extractCityFromLabel(toAddr.label) ||
      `Adresa${i + 2}`;

    const km = typeof s?.summary?.length === "number" ? s.summary.length / 1000 : undefined;
    const kmRound = km !== undefined ? Math.round(km * 10) / 10 : undefined;

    return {
      key: `${i}`,
      label: `${fromName}→${toName}`,
      km: kmRound,
      display: kmRound !== undefined
        ? `${fromName}→${toName}  -  ${kmRound} km`
        : `${fromName}→${toName}  -  ? km`,
    };
  });
}

export function segmentsFromWaypoints(pts) {
  if (!Array.isArray(pts) || pts.length < 2) return [];
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const km = Math.round(haversineKm(a, b) * 10) / 10;
    const fromName = a.city || extractCityFromLabel(a.label) || `Adresa${i + 1}`;
    const toName   = b.city || extractCityFromLabel(b.label) || `Adresa${i + 2}`;
    out.push({
      key: `${i}`,
      label: `${fromName}→${toName}`,
      km,
      display: `${fromName}→${toName}  -  ${km} km`,
    });
  }
  return out;
}

export { haversineKm };