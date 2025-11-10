// pages/spotGoTrucks.js
import React, { useState, useEffect } from "react";
import AutoCompleteInput from "../AutoCompleteInput";
import { supabase } from "../lib/supabase";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import Header from "../components/header";
import { shortCodeFor, fullNameForShortCode } from "../utils/userShortCodes";

countries.registerLocale(enLocale);

// ---- SpotGo mappings (docs) ----
// Vehicle Types
const vehicleTypes = {
  1: "Semi trailer",
  2: "Solo (<12t)",
  3: "Solo (<7.5t)",
  4: "Van/Bus",
  5: "Double Trailer",
};
// Trailer Types
const trailerTypes = {
  1: "Tent",
  2: "Refrigerator",
  3: "Tautliner",
  4: "Box",
  5: "Isotherm",
  6: "Mega",
  7: "Jumbo",
  8: "Van",
  10: "Any",
  11: "Platform",
  12: "Road Train 120 m3",
  13: "Tanker",
  14: "Walking Floor",
  15: "CoilMulde",
  16: "Dump Truck",
  17: "Car Transporter",
  18: "Joloda",
  19: "Low Loader",
};
// Capabilities (using freight codes – vehicles accept an int array too)
const capabilityMap = {
  1: "ADR",
  2: "Double Deck",
  3: "Code XL",
  4: "Tail Lift",
  5: "Forklift",
  6: "Two Drivers",
  7: "GPS",
  8: "Multi Temp",
};

// Vehicles API needs STRING codes (not the freight numeric ones)
const VEHICLE_CAPABILITY_CODES = {
  1: "adr",
  2: "doubleDeck",
  3: "codeXL",
  4: "lift",
  5: "forklift",
  6: "twoDrivers",
  7: "gps",
  8: "multiTemp",
};

const panel =
  "rounded-lg p-5 border bg-white text-gray-900 " +
  "border-gray-200 shadow-xl " +
  "dark:bg-gray-800/70 dark:text-gray-100 dark:border-gray-700";

const field =
  "w-full rounded-md px-3 py-2 " +
  "border border-gray-300 bg-gray-50 text-gray-900 " +
  "placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 " +
  "dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400";

// From email -> "Firstname Lastname"
const fullNameFromEmail = (email = '') => {
  const local = email.split('@')[0] || '';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(p => p[0]?.toUpperCase() + p.slice(1))
    .join(' ');
};

// Prefer your mapping if it exists, else build from email
const displayNameForEmail = (email = '') => {
  const code = shortCodeFor(email);
  const mapped = fullNameForShortCode(code);
  return mapped !== code ? mapped : fullNameFromEmail(email);
};


const RANGE_OPTIONS = [50, 100, 150];

const HERE_API_KEY = process.env.REACT_APP_HERE_API_KEY;
const API_BASE =
  process.env.REACT_APP_API_BASE ??
  (window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : window.location.origin);

// --- utils reused from your freight page (trimmed) ---
function cityFromAddress(addr) {
  if (addr?.city) return addr.city;
  const label = addr?.label || "";
  const parts = label.split(",");
  return parts.length >= 2 ? parts[parts.length - 2].trim() : "Unknown";
}

const parseDbDate = s => (s ? new Date(s).toISOString().slice(0,10) : new Date().toISOString().slice(0,10));
const parseDbHHMM = s => (s ? new Date(s).toISOString().slice(11,16) : "08:00");


// Reverse-geocode with fallback (slimmed)
async function reverseWithFallback(loc, apiKey) {
  const base = "https://revgeocode.search.hereapi.com/v1/revgeocode";
  const url = `${base}?at=${loc.lat},${loc.lng}&lang=en-US&limit=1&apiKey=${apiKey}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return {};
    const { items = [] } = await r.json();
    const item = items[0];
    const pos = item?.position || item?.access?.[0]?.position;
    const a = item?.address ? { ...item.address, lat: pos?.lat, lng: pos?.lng } : null;
    if (!a) return {};
    const rawCC = a.countryCode || "";
    const cc2 = countries.alpha3ToAlpha2(rawCC) || (rawCC.length === 2 && rawCC) || "";
    return {
      ...a,
      countryCode: cc2,
    };
  } catch {
    return {};
  }
}

export default function SpotGoTrucks({ user }) {
  // Addresses + period + range
  const todayStr = new Date().toISOString().slice(0, 10);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [loadingLoc, setLoadingLoc] = useState(null);
  const [unloadingLoc, setUnloadingLoc] = useState(null);
  const [loadStartDate, setLoadStartDate] = useState(todayStr);
  const [loadStartTime, setLoadStartTime] = useState("08:00");
  const [loadEndDate, setLoadEndDate] = useState(todayStr);
  const [loadEndTime, setLoadEndTime] = useState("17:00");
  const [rangeKm, setRangeKm] = useState(50);

  // Requirements
  const [vehicleType, setVehicleType] = useState(1);
  const [trailerType, setTrailerType] = useState(1);
  const [capacityT, setCapacityT] = useState("24");
  const [ldm, setLdm] = useState("13.6");
  const [pallets, setPallets] = useState("33");
  const [interestedLtl, setInterestedLtl] = useState(false);
  const [capabilities, setCapabilities] = useState([]); // [int]

  // // Meta
  // const [sources, setSources] = useState([1, 2, 4, 9]); // default same vibe as freight
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // offers table (very light list)
  const [vehicles, setVehicles] = useState([]);

  // Auto times: if date is today -> next full hour / +2h ; else fallback defaults
  useEffect(() => {
    if (isPrefilling) return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (loadStartDate === today) {
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(now.getHours() + 1);
      setLoadStartTime(nextHour.toTimeString().slice(0, 5));
    } else {
      setLoadStartTime("08:00");
    }
  }, [loadStartDate, isPrefilling]);

  useEffect(() => {
    if (isPrefilling) return;
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(now.getHours() + 1);
    const end = new Date(nextHour);
    end.setHours(nextHour.getHours() + 2);
    const today = now.toISOString().slice(0, 10);
    if (loadEndDate === today) {
      setLoadEndTime(end.toTimeString().slice(0, 5));
    } else {
      setLoadEndTime("17:00");
    }
  }, [loadEndDate, isPrefilling]);


  const btn = {
    padding: "10px 16px",
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontWeight: 700,
    cursor: "pointer",
  };

  // Handlers
  const handleSelectLoading = async (loc) => {
    const enriched = await reverseWithFallback(loc, HERE_API_KEY);
    setLoadingLoc({ ...loc, ...enriched });
  };
  const handleSelectUnloading = async (loc) => {
    const enriched = await reverseWithFallback(loc, HERE_API_KEY);
    setUnloadingLoc({ ...loc, ...enriched });
  };

  const toggleCapability = (id) =>
    setCapabilities((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  // const toggleSource = (id) =>
  //   setSources((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function resetForm() {
    setLoadingLoc(null);
    setUnloadingLoc(null);
    setLoadStartDate(todayStr);
    setLoadEndDate(todayStr);
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(now.getHours() + 1);
    const end = new Date(nextHour);
    end.setHours(nextHour.getHours() + 2);
    setLoadStartTime(nextHour.toTimeString().slice(0, 5));
    setLoadEndTime(end.toTimeString().slice(0, 5));
    setRangeKm(50);
    setVehicleType(1);
    setTrailerType(1);
    setCapacityT("24");
    setLdm("13.6");
    setPallets("33");
    setInterestedLtl(false);
    setCapabilities([]);
    // setSources([1, 2, 4, 9]);
    setComments("");
    setResetKey((k) => k + 1);
  }

  const cleanAddr = (raw) => ({
    countryCode: (raw?.countryCode || "").toUpperCase(),
    city: raw?.city || cityFromAddress(raw),
    postalCode: raw?.postalCode || "",
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!loadingLoc || !unloadingLoc) {
      alert("Pick loading and unloading.");
      return;
    }
    const cap = parseFloat(capacityT);
    const ldmN = parseFloat(ldm);
    const pal = parseInt(pallets, 10);
    if (Number.isNaN(cap) || cap <= 0) return alert("Capacity must be > 0");
    if (Number.isNaN(ldmN) || ldmN <= 0) return alert("LDM must be > 0");
    if (Number.isNaN(pal) || pal <= 0) return alert("Pallets must be > 0");

    const startISO = `${loadStartDate}T${loadStartTime}:00Z`;
    const endISO = `${loadEndDate}T${loadEndTime}:00Z`;
    if (!(new Date(startISO) < new Date(endISO))) {
      alert("Loading start must be before end.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Please sign in first.");
        setSubmitting(false);
        return;
      }
      const userEmail = session.user.email;
      const userDisplay = displayNameForEmail(userEmail);


      const allowedRange = RANGE_OPTIONS.includes(Number(rangeKm)) ? Number(rangeKm) : 50;

      const payload = {
        owner: userDisplay, // backend will overwrite to fixed email; NBD
        sources: [1, 2, 4, 9],

        requirements: {
          vehicleType,
          trailerType,
          capacity: cap,            // Vehicles API field name
          ldm: ldmN,
          pallets: pal,
          interestedInLtl: !!interestedLtl,
          // map numeric capability IDs -> string codes
          capabilities: (capabilities || [])
            .map(id => VEHICLE_CAPABILITY_CODES[id])
            .filter(Boolean),
        },
        loading: {
          address: cleanAddr(loadingLoc),
          period: { startDate: startISO, endDate: endISO },
        },
        unloading: {
          address: [cleanAddr(unloadingLoc)], // single object, not array
        },
        range: allowedRange,
        comments: comments || "",
      };

      // Your backend proxy to SpotGo Vehicles
      const res = await fetch(`${API_BASE}/api/spotgo/trucks/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "authorization-email": userEmail,
          "Content-Type": "application/json",
          "x-api-version": "1.0",
        },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      if (!res.ok) throw new Error(raw || "Submit failed");
      let result = {};
      try { result = raw ? JSON.parse(raw) : {}; } catch {}
      const vehicleId = result.id || null; // docs say body may be empty

      await supabase.from("spotgo_trucks").insert([
        {
          vehicle_id: vehicleId,
          owner_code: shortCodeFor(userEmail),
          owner_name: userDisplay,
          loading_address: loadingLoc?.label || "",
          unloading_address: unloadingLoc?.label || "",
          loading_country_code: loadingLoc?.countryCode || null,
          loading_postal_code: loadingLoc?.postalCode || null,
          unloading_country_code: unloadingLoc?.countryCode || null,
          unloading_postal_code: unloadingLoc?.postalCode || null,
          start_time: startISO,
          end_time: endISO,
          range_km: allowedRange,
          vehicle_type: vehicleType,
          trailer_type: trailerType,
          capacity_t: cap,
          ldm_m: ldmN,
          pallets: pal,
          interested_ltl: !!interestedLtl,
          capabilities: capabilities.length ? capabilities : null,
          // sources: sources.length ? sources : null,
          comments: comments || null,
          submitted_by_email: userEmail,
          created_at: new Date().toISOString(),
        },
      ]);

      // Update list view UI (optimistic)
      setVehicles((v) => [
        {
          id: vehicleId || `temp-${Date.now()}`,
          owner: userDisplay,
          loading: `${loadingLoc?.postalCode || ""} ${cityFromAddress(loadingLoc)}`,
          unloading: `${unloadingLoc?.postalCode || ""} ${cityFromAddress(unloadingLoc)}`,
        },
        ...v,
      ]);

      resetForm();
    } catch (e) {
      console.error(e);
      alert("Could not publish vehicle.");
    } finally {
      setSubmitting(false);
    }
  }

  // (Optional) simple delete using your proxy
  async function handleDelete(id) {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return alert("Please sign in first.");
      await fetch(`${API_BASE}/api/spotgo/trucks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      await supabase.from("spotgo_trucks").delete().eq("vehicle_id", id);
      setVehicles((v) => v.filter((x) => x.id !== id));
      alert("Vehicle deleted")
    } catch {
      alert("Delete failed.");
    }
  }

async function handleCopy(id) {
  try {
    setIsPrefilling(true);
    // pull full row for this vehicle
    const { data: row, error } = await supabase
      .from('spotgo_trucks')
      .select('*')
      .eq('vehicle_id', id)
      .single();

    if (error || !row) { alert('Failed to load vehicle for copy.'); return; }

    // reconstruct HERE-like address objects (lat/lng weren’t stored; not needed)
    const loadObj = {
      label: row.loading_address || '',
      postalCode: row.loading_postal_code || '',
      countryCode: (row.loading_country_code || '').toUpperCase(),
      city: cityFromAddress({ label: row.loading_address || '' })
    };
    const unloadObj = {
      label: row.unloading_address || '',
      postalCode: row.unloading_postal_code || '',
      countryCode: (row.unloading_country_code || '').toUpperCase(),
      city: cityFromAddress({ label: row.unloading_address || '' })
    };

    // prefill the form
    setLoadingLoc(loadObj);
    setUnloadingLoc(unloadObj);

    setLoadStartDate(parseDbDate(row.start_time));
    setLoadStartTime(parseDbHHMM(row.start_time));
    setLoadEndDate(parseDbDate(row.end_time));
    setLoadEndTime(parseDbHHMM(row.end_time));

    setRangeKm(row.range_km ?? 50);
    setVehicleType(row.vehicle_type ?? 1);
    setTrailerType(row.trailer_type ?? 1);
    setCapacityT(String(row.capacity_t ?? '24'));
    setLdm(String(row.ldm_m ?? '13.6'));
    setPallets(String(row.pallets ?? '33'));
    setInterestedLtl(!!row.interested_ltl);
    setCapabilities(Array.isArray(row.capabilities) ? row.capabilities : []);
    setComments(row.comments || '');

    alert('📋 Vehicle copied into the form.');
  } catch (e) {
    console.error('copy vehicle error:', e);
    alert('Could not copy vehicle.');
  } finally {
    // allow the date-change effects to run again after prefill is done
    setIsPrefilling(true)
  }
}
  

  return (
    <div  className=" min-h-screen transition-colors bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800 dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100 "  style={{ fontFamily: "Arial, sans-serif" }} >
      <Header user={user} />
      <div className="flex items-start gap-5 px-3 py-4">
        {/* FORM */}
        <form onSubmit={handleSubmit} className={`flex-1 ${panel}`}>
          <h3 style={{ fontWeight: 700, color: "#FCA5A5", marginTop: 0 }}>Vehicle availability</h3>

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900/40">
              <label style={{ fontWeight: 700 }}>Loading</label>
              <AutoCompleteInput
                key={`load-${resetKey}`}
                apiKey={HERE_API_KEY}
                value={loadingLoc}
                onSelect={handleSelectLoading}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <input type="date" value={loadStartDate} onChange={(e) => setLoadStartDate(e.target.value)} className={field} />
                <input type="time" value={loadStartTime} onChange={(e) => setLoadStartTime(e.target.value)} step="60" className={field} />
                <input type="date" value={loadEndDate} onChange={(e) => setLoadEndDate(e.target.value)} className={field} />
                <input type="time" value={loadEndTime} onChange={(e) => setLoadEndTime(e.target.value)} step="60" className={field} />
              </div>
            </div>

            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900/40">
              <label style={{ fontWeight: 700 }}>Unloading</label>
              <AutoCompleteInput
                key={`unload-${resetKey}`}
                apiKey={HERE_API_KEY}
                value={unloadingLoc}
                onSelect={handleSelectUnloading}
              />
              <div style={{ marginTop: 8 }}>
                <label style={{ fontWeight: 700, marginRight: 8 }}>Range</label>
                  {RANGE_OPTIONS.map(v => (
                  <label key={v} style={{ marginRight: 12 }}>
                    <input
                      type="radio"
                      name="range"
                      checked={Number(rangeKm) === v}
                      onChange={() => setRangeKm(v)}
                    />{" "}
                  +{v} km
                </label>
                ))}
              </div>
            </div>
          </div>

          {/* Requirements */}
          <fieldset className="p-3 rounded-lg border border-gray-300 dark:border-gray-700 mb-4 bg-white dark:bg-gray-900/40">
            <legend style={{ fontWeight: 700, color: "#FCA5A5" }}>Requirements</legend>

            {/* Vehicle type (radio) */}
            <div style={{ marginBottom: 8 }}>
              {Object.entries(vehicleTypes).map(([id, label]) => (
                <label key={id} style={{ marginRight: 12 }}>
                  <input type="radio" name="vehType" checked={vehicleType === Number(id)} onChange={() => setVehicleType(Number(id))} />{" "}
                  {label}
                </label>
              ))}
            </div>

            {/* Trailer type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <label>
                <span style={{ fontWeight: 700 }}>Trailer Type</span>
                <select value={trailerType} onChange={(e) => setTrailerType(Number(e.target.value))} className={field}>
                  {Object.entries(trailerTypes).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={interestedLtl} onChange={(e) => setInterestedLtl(e.target.checked)} />
                Interested in LTL
              </label>
            </div>

            {/* Numeric fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <label>
                <span style={{ fontWeight: 700 }}>Weight (t)</span>
                <input value={capacityT} onChange={(e) => setCapacityT(e.target.value)} className={field} />
              </label>
              <label>
                <span style={{ fontWeight: 700 }}>LDM</span>
                <input value={ldm} onChange={(e) => setLdm(e.target.value)} className={field} />
              </label>
              <label>
                <span style={{ fontWeight: 700 }}>Pallets</span>
                <input value={pallets} onChange={(e) => setPallets(e.target.value)} className={field} />
              </label>
            </div>

            {/* Capabilities */}
            <div style={{ marginTop: 8 }}>
              <strong>Capabilities:</strong>{" "}
              {Object.entries(capabilityMap).map(([id, label]) => (
                <label key={id} style={{ marginRight: 16 }}>
                  <input
                    type="checkbox"
                    checked={capabilities.includes(Number(id))}
                    onChange={() => toggleCapability(Number(id))}
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Comments */}
          <div style={{ marginBottom: 12 }}>
            <label><strong>Comments</strong></label>
            <input value={comments} onChange={(e) => setComments(e.target.value)} className={field} />
          </div>
          <button type="submit" disabled={submitting} style={{ ...btn, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Publishing…" : "Publish"}
          </button>
        </form>

        {/* Tiny list of submitted vehicles (local) */}
        <div className={`flex-1 ${panel}`}>
          <h3 style={{ fontWeight: 700, color: "#FCA5A5", marginTop: 0 }}>Published vehicles</h3>
          {vehicles.length === 0 ? (
            <p>No vehicles yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-red-50 dark:bg-gray-800">
                  <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700">Owner</th>
                  <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700">Loading</th>
                  <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700">Unloading</th>
                  <th className="px-3 py-2 text-center border-b border-gray-200 dark:border-gray-700">Action</th>
                </tr>

              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800/40 dark:even:bg-gray-800/20"> 
                    <td style={{ padding: 8 }}>{v.owner}</td>
                    <td style={{ padding: 8 }}>{v.loading}</td>
                    <td style={{ padding: 8 }}>{v.unloading}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => handleCopy(v.id)} className="px-4 py-2 rounded font-bold text-white bg-sky-800 hover:bg-sky-900">
                          Copy
                        </button>
                        <button type="button" onClick={() => handleDelete(v.id)} className="px-4 py-2 rounded font-bold text-white bg-red-700 hover:bg-red-800">
                          Delete
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}