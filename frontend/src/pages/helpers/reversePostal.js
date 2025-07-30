export async function fetchPostalCode(lat, lng) {
  const res = await fetch(
    `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat},${lng}` +
    `&lang=en-US&limit=1&apikey=${process.env.REACT_APP_HERE_API_KEY}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0]?.address?.postalCode || null;
}

// src/pages/helpers/reverseGeocode.js
export async function fetchAddressDetails(lat, lng) {
  const res = await fetch(
    `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat},${lng}` +
    `&lang=en-US&limit=1&apikey=${process.env.REACT_APP_HERE_API_KEY}`
  );
  if (!res.ok) return {};
  const data = await res.json();
  return data.items?.[0]?.address || {};
}