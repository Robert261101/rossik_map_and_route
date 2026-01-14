import React, { useEffect, useRef, useState } from "react";
import AutoCompleteInput from "../AutoCompleteInput";
import TollCalculator from "../TollCalculator";
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from "../lib/supabase";
import { formatNum } from "../utils/number";
import { addLegalBreaks } from "../utils/driverTime";
import { fetchPostalCode } from "./helpers/reversePostal.js";
import DebugMouseOverlay from "../components/mouseOverlay.js";
import { extractCityFromLabel } from "../utils/segments.js";


import "./App.css";
import Header from "../components/header.js";

const MainPage = ({ user })  => {
  const [allIn, setAllIn] = useState(false);
  const [fixedTotalCost, setFixedTotalCost] = useState(''); // only used when allIn===true
  const [addresses, setAddresses] = useState([]);
  const [distance, setDistance] = useState(null);
  const [routes, setRoutes] = useState([]); // Array cu rutele alternative
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(null);
  const [vehicleType, setVehicleType] = useState({
    axles: 5,
    weight: 40000,
    EuroPerKm: null, // exemplu
    pricePerDay: null
  });
  const [routeTaxCosts, setRouteTaxCosts] = useState([]);
  const [tollCosts, setTollCosts] = useState([]);
  const [duration, setDuration] = useState(null);
  const [rawDistance, setRawDistance] = useState(null);
  const [rawDuration, setRawDuration] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const mapRef = useRef(null);
  const markerGroupRef = useRef(null);
  const navigate = useNavigate();
  const isManager = ['transport_manager','team_lead','admin'].includes(user.role);

  const location = useLocation();
  const editId = new URLSearchParams(location.search).get("edit"); // route id from History
  const [isEditMode, setIsEditMode] = useState(false);
  const [parentRouteId, setParentRouteId] = useState(null);

  
  //de aici am butonul de salvare rute
  const [trucks, setTrucks] = useState([]);        // lista de { id, plate }
  const [plate, setPlate] = useState('');          // selected truck plate
  const [identifier, setIdentifier] = useState(''); // unique run ID
  const [saveMsg, setSaveMsg] = useState('');
  const [durationWithBreaks, setDurationWithBreaks] = useState(null);

  const [addressQuery, setAddressQuery] = useState("");
  const [resetKey, setResetKey] = useState(0);

  const [contractPopupsByRoute, setContractPopupsByRoute] = useState([]); 
  // Array where index = routeIndex, value = [{id,name,msg}, ...]

  // ---- route sorting UI ----
const [routeSortMode, setRouteSortMode] = useState("time"); // "time" | "cost" | "km"

const routeSeconds = (rt) =>
  (rt?.sections || []).reduce((sum, s) => sum + (s.summary?.duration || 0), 0);

const routeMeters = (rt) =>
  (rt?.sections || []).reduce((sum, s) => sum + (s.summary?.length || 0), 0);

const routeKm = (rt) => routeMeters(rt) / 1000;

const totalCostForIndex = (idx) => {
  const rt = routes[idx];
  if (!rt) return Infinity;

  const km = routeKm(rt);
  const secs = routeSeconds(rt);

  const toll = routeTaxCosts[idx] || 0;

  const daysLocal = secs ? Math.ceil(secs / 86400) : 0;
  const dayCostLocal =
    vehicleType.pricePerDay != null ? daysLocal * vehicleType.pricePerDay : 0;

  if (allIn) return Number(fixedTotalCost || 0);

  const euroPerKm = Number(vehicleType.EuroPerKm || 0);
  const costPerKm = km * euroPerKm;

  return costPerKm + toll + dayCostLocal;
};

// derived list of indices to render (keeps arrays aligned)
const displayedRouteIndices = React.useMemo(() => {
  const idxs = routes.map((_, i) => i);

  const compare = (a, b) => {
    if (routeSortMode === "time") {
      return routeSeconds(routes[a]) - routeSeconds(routes[b]);
    }
    if (routeSortMode === "km") {
      return routeKm(routes[a]) - routeKm(routes[b]);
    }
    // "cost"
    return totalCostForIndex(a) - totalCostForIndex(b);
  };

  idxs.sort(compare);
  return idxs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  routes,
  routeSortMode,
  routeTaxCosts,
  vehicleType.EuroPerKm,
  vehicleType.pricePerDay,
  allIn,
  fixedTotalCost
]);

// meters -> lat/lng offset (approx)
const offsetLatLng = (lat, lng, metersEast, metersNorth) => {
  const R = 6378137; // Earth radius in meters
  const dLat = metersNorth / R;
  const dLng = metersEast / (R * Math.cos((Math.PI * lat) / 180));
  return {
    lat: lat + (dLat * 180) / Math.PI,
    lng: lng + (dLng * 180) / Math.PI,
  };
};

const makeCandidatesWithin1km = (lat, lng) => {
  const bearingsDeg = [0,45,90,135,180,225,270,315];
  const radii = [0, 400, 1000]; // <= 1km (tweak as you like)

  const out = [];
  for (const r of radii) {
    if (r === 0) {
      out.push({ lat, lng, meta: "click" });
      continue;
    }
    for (const b of bearingsDeg) {
      const rad = (b * Math.PI) / 180;
      const east = Math.cos(rad) * r;
      const north = Math.sin(rad) * r;
      const p = offsetLatLng(lat, lng, east, north);
      out.push({ ...p, meta: `${r}m@${b}°` });
    }
  }
  return out;
};

// Lightweight router call that returns just duration/length (no polyline)
const fetchRouteSummary = async ({ pts, viasByLeg }) => {
  const origin = pts?.[0];
  const destination = pts?.[pts.length - 1];
  if (!origin || !destination) return null;

  // Ensure numeric
  const oLat = Number(origin.lat), oLng = Number(origin.lng);
  const dLat = Number(destination.lat), dLng = Number(destination.lng);
  if (![oLat,oLng,dLat,dLng].every(Number.isFinite)) return null;

  const params = new URLSearchParams();
  params.set("apikey", process.env.REACT_APP_HERE_API_KEY);
  params.set("origin", `${oLat},${oLng}`);
  params.set("destination", `${dLat},${dLng}`);

  const orderedVias = buildOrderedVias(pts, viasByLeg);
  for (const v of orderedVias) {
    const vLat = Number(v.lat), vLng = Number(v.lng);
    if (Number.isFinite(vLat) && Number.isFinite(vLng)) {
      params.append("via", `${vLat},${vLng}`);
    }
  }

  params.set("return", "summary,tolls");
  // ✅ do NOT set alternatives at all

  // keep same truck params so comparisons are apples-to-apples
  params.set("transportMode", "truck");
  params.set("vehicle[weightPerAxle]", "11500");
  params.set("vehicle[height]", "400");
  params.set("vehicle[width]", "255");
  params.set("vehicle[length]", "1875");
  params.set("truck[axleCount]", String(vehicleType.axles));
  params.set("vehicle[grossWeight]", String(vehicleType.weight));
  params.set("truck[limitedWeight]", "7500");
  params.set("tolls[emissionType]", "euro6");

  const url = `https://router.hereapi.com/v8/routes?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.warn("[candidate] routing failed:", res.status, txt.slice(0, 500));
    return null;
  }

  const data = await res.json();
  const rt = data?.routes?.[0];
  if (!rt?.sections?.length) return null;

  let dur = 0;
  let len = 0;
  for (const s of rt.sections) {
    dur += s.summary?.duration || 0;
    len += s.summary?.length || 0;
  }
  return { duration: dur, length: len };
};

// Candidate chooser: pick the via point that yields fastest total route
const pickBestViaCandidate = async ({ clickGeo, legIdx }) => {
  const pts = [...addressesRef.current];
  const legCount = Math.max((pts?.length || 0) - 1, 0);

  const baseLegs = ensureLegSlots(viaStopsByLegRef.current, legCount).map(arr => [...(arr || [])]);

  const candidates = makeCandidatesWithin1km(clickGeo.lat, clickGeo.lng);

  // cap concurrency so you don't nuke the network
  const CONCURRENCY = 6;
  let best = null;

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const chunk = candidates.slice(i, i + CONCURRENCY);

    const results = await Promise.all(chunk.map(async (cand) => {
      const legs = baseLegs.map(arr => [...arr]);
      legs[legIdx] = [...(legs[legIdx] || []), { id: "tmp", lat: cand.lat, lng: cand.lng }];

      // buildOrderedVias will sort within the leg anyway
      const sum = await fetchRouteSummary({ pts, viasByLeg: legs });
      if (!sum) return null;

      return { cand, sum };
    }));

    for (const r of results) {
      if (!r) continue;
      const score = r.sum.duration * 1e6 + r.sum.length; // duration dominates; length is tiebreaker
      if (!best || score < best.score) {
        best = { ...r, score };
      }
    }
  }

  return best?.cand || { lat: clickGeo.lat, lng: clickGeo.lng };
};

  // ===== VIA PHASE 1: state scaffolding (per-leg) =====
  // viaStopsByLeg: Array of arrays, length = max(addresses.length - 1, 0)
  // Example for A->B->C: [ [vias on A-B], [vias on B-C] ]
  const [viaStopsByLeg, setViaStopsByLeg] = useState([]); // [[{id,lat,lng},...], ...]
  const [viaStack, setViaStack] = useState([]);           // [{legIdx, id}, ...] for LIFO delete
  const [viaDraft, setViaDraft] = useState(null);         // {lat, lng} while dragging-to-add (ghost)
  const [selectedVia, setSelectedVia] = useState(null);   // {legIdx, id} selected for delete
  // =================================================================

  const [activeLegIdx, setActiveLegIdx] = useState(0);

  const moveItem = (arr, from, to) => {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

const routesRef = useRef(routes);
useEffect(() => { routesRef.current = routes; }, [routes]);

useEffect(() => {
  if (!routes.length) return;
  // if nothing selected yet, select the first in the current sort mode
  if (selectedRouteIndex == null) {
    const firstIdx = displayedRouteIndices[0] ?? 0;
    setSelectedRouteIndex(firstIdx);
    if (routes[firstIdx]) displayedRoute(routes[firstIdx]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [routes.length, routeSortMode]);

const selectedRouteIndexRef = useRef(selectedRouteIndex);
useEffect(() => { selectedRouteIndexRef.current = selectedRouteIndex; }, [selectedRouteIndex]);

  const ghostMarkerRef = useRef(null);
  const behaviorRef = useRef(null);
  const viaGroupRef = useRef(null);
  const fullLineStringRef = useRef(null);

  const activeLegIdxRef = useRef(0);
  useEffect(() => { activeLegIdxRef.current = activeLegIdx; }, [activeLegIdx]);

  const addressesRef = useRef(addresses);
  const viaStopsByLegRef = useRef(viaStopsByLeg);

  useEffect(() => { addressesRef.current = addresses; }, [addresses]);
  useEffect(() => { viaStopsByLegRef.current = viaStopsByLeg; }, [viaStopsByLeg]);
  
  // HUD hint state
  const [hudMsg, setHudMsg] = useState("");
  const [hudVisible, setHudVisible] = useState(false);
  const hudTimerRef = useRef(null);

  function canEditRoute(route, user) {
  if (user.role === "admin") return true;
  if (user.role === "team_lead") return String(route.team_id) === String(user.team_id);
  return String(route.created_by) === String(user.id); // transport_manager
}

  // ——— mobile breakpoint (Tailwind: <640px) ———
  function useIsMobile() {
    const [m, setM] = React.useState(false);
    React.useEffect(() => {
      const mq = window.matchMedia("(max-width: 639px)");
      const f = () => setM(mq.matches);
      f();
      mq.addEventListener("change", f);
      return () => mq.removeEventListener("change", f);
    }, []);
    return m;
  }

  const isMobile = useIsMobile();
  const [mapOpen, setMapOpen] = React.useState(false);


  const syncLegArrays = (count) => {
    // grow/shrink to `count` legs
    setViaStopsByLeg(prev => {
      const copy = prev.slice(0, count).map(arr => arr || []);
      while (copy.length < count) copy.push([]);
      return copy;
    });
  };

  // Small helper to show a hint for N ms (default 5s)
  const showHint = (msg, ms = 5000) => {
    if (!msg) return;
    setHudMsg(msg);
    setHudVisible(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setHudVisible(false), ms);
  };

  // Decode a section's flexible polyline to a flat [lat,lng,lat,lng,...] array
const sectionLatLngs = (sec) => {
  const ls = window.H.geo.LineString.fromFlexiblePolyline(sec.polyline);
  return ls.getLatLngAltArray(); // [lat,lng,alt,...]; we use every 3rd item
};

// Squared distance between two lat/lng points (good enough for nearest tests)
const d2 = (aLat, aLng, bLat, bLng) => {
  const dlat = aLat - bLat, dlng = aLng - bLng;
  return dlat * dlat + dlng * dlng;
};

// Find index of the route.section that is closest to (lat,lng)
const nearestSectionIndex = (lat, lng, route) => {
  let best = { idx: 0, d2: Infinity };
  (route.sections || []).forEach((sec, idx) => {
    const arr = sectionLatLngs(sec);
    for (let i = 0; i < arr.length; i += 3) {
      const candLat = arr[i], candLng = arr[i + 1];
      const dd = d2(lat, lng, candLat, candLng);
      if (dd < best.d2) best = { idx, d2: dd };
    }
  });
  return best.idx;
};

// Map a section index to a leg index using the current per-leg via counts.
// Each leg i has (viaCount[i] + 1) sections.
const sectionIndexToLegIndex = (sectionIdx, viaStopsByLeg, addresses) => {
  const nLegs = Math.max((addresses?.length || 0) - 1, 0);
  const viaCounts = Array.from({ length: nLegs }, (_, i) => (viaStopsByLeg?.[i]?.length || 0));
  let cursor = 0;
  for (let i = 0; i < nLegs; i++) {
    const take = viaCounts[i] + 1;
    const start = cursor;
    const end = cursor + take - 1; // inclusive
    if (sectionIdx >= start && sectionIdx <= end) return i;
    cursor += take;
  }
  return Math.max(0, Math.min(nLegs - 1, sectionIdx)); // fallback safety
};

// Ensure viaStopsByLeg has exactly (addresses.length - 1) arrays
const ensureLegSlots = (legs, count) => {
  const copy = (legs || []).slice(0, count).map(a => a || []);
  while (copy.length < count) copy.push([]);
  return copy;
};

// Expand a HERE bbox by a factor (e.g., 1.08 = +8% on each half-extent)
const inflateRect = (rect, factor = 1.10) => {
  const c = rect.getCenter();
  const top    = rect.getTop();
  const left   = rect.getLeft();
  const bottom = rect.getBottom();
  const right  = rect.getRight();

  const halfLat = Math.max(top - c.lat, c.lat - bottom);
  const halfLng = Math.max(c.lng - left, right - c.lng);

  const newHalfLat = halfLat * factor;
  const newHalfLng = halfLng * factor;

  const newTop    = c.lat + newHalfLat;
  const newBottom = c.lat - newHalfLat;
  const newLeft   = c.lng - newHalfLng;
  const newRight  = c.lng + newHalfLng;

  return new window.H.geo.Rect(newTop, newLeft, newBottom, newRight);
};


// NEW: build ordered vias including mandatory intermediate stops
const buildOrderedVias = (pts, legs) => {
  const out = [];
  const nStops = Math.max((pts?.length || 0), 0);
  const nLegs  = Math.max(nStops - 1, 0);

  for (let i = 0; i < nLegs; i++) {
     // 1) per-leg custom vias, auto-sorted along leg direction
     const arr = Array.isArray(legs?.[i]) ? legs[i] : [];
     const legStart = pts[i];
     const legEnd   = pts[i + 1];
     const sorted = sortViasAlongLeg(
       arr.filter(v => typeof v.lat === 'number' && typeof v.lng === 'number'),
       legStart, legEnd
     );
     for (const v of sorted) out.push({ lat: v.lat, lng: v.lng });
    // 2) then the mandatory stop at the end of this leg (B for leg A→B, etc.)
    // (But do NOT push the final destination here; it will be the &destination)
    if (i < nLegs - 1) {
      const mandatoryStop = pts[i + 1];
      if (mandatoryStop && typeof mandatoryStop.lat === 'number' && typeof mandatoryStop.lng === 'number') {
        out.push({ lat: mandatoryStop.lat, lng: mandatoryStop.lng });
      }
    }
  }
  return out;
};

  useEffect(() => {
    return () => {
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, []);

  useEffect(() => {
  if (!editId) {
    setIsEditMode(false);
    setParentRouteId(null);
    return;
  }

  (async () => {
    try {
      setIsEditMode(true);
      setParentRouteId(editId);

      // simplest: load directly from supabase (since you already have it)
      const { data: rt, error } = await supabase
        .from("routes")
        .select("*")
        .eq("id", editId)
        .single();

      if (error) throw error;
      if (!rt) throw new Error("Route not found");

      const { data: me, error: meErr } = await supabase
        .from("users")
        .select("team_id, role")
        .eq("id", user.id)
        .single();
      if (meErr) throw meErr;

      const can =
        me.role === "admin" ||
        (me.role === "team_lead" && String(rt.team_id) === String(me.team_id)) ||
        (me.role === "transport_manager" && String(rt.created_by) === String(user.id));

      if (!can) {
        alert("You don't have access to edit this route.");
        navigate("/history");
        return;
      }

      // Prefill core fields
      setAddresses((rt.addresses || []).map(a => ({
  id: a.id || `addr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
  ...a
})));

      setIdentifier(rt.identifier || "");
      setPlate(rt.truck_id || "");

      // Restore via stops IF we store them (see section 4)
      if (rt.via_stops_by_leg) {
        const legs = ensureLegSlots(rt.via_stops_by_leg, Math.max((rt.addresses?.length || 0) - 1, 0));
        setViaStopsByLeg(legs);
        viaStopsByLegRef.current = legs;
        // rebuild stack so ESC works
        const stack = [];
        legs.forEach((arr, legIdx) => (arr || []).forEach(v => stack.push({ legIdx, id: v.id })));
        setViaStack(stack);
      } else {
        setViaStopsByLeg([]);
        setViaStack([]);
      }

      // All-in vs €/km (best is store flags, but we can infer for now)
      const inferredAllIn = (rt.euro_per_km === 0 && rt.cost_per_km === 0);
      setAllIn(inferredAllIn);
      setFixedTotalCost(inferredAllIn ? String(rt.total_cost ?? "") : "");

      setVehicleType(prev => ({
        ...prev,
        EuroPerKm: inferredAllIn ? prev.EuroPerKm : (rt.euro_per_km ?? prev.EuroPerKm),
        // axles / weight are NOT stored currently in your route payload
        // if you add them later, hydrate here
      }));

      // Make sure map is ready and then calculate route from loaded addresses/vias
      setTimeout(() => {
        if ((rt.addresses || []).length >= 2) {
          getRoute([...rt.addresses], rt.via_stops_by_leg || []);
          setHasCalculated(true);
        }
      }, 0);
    } catch (err) {
      console.error("Failed to load route for edit:", err);
      alert("Could not load route for editing: " + err.message);
    }
  })();
}, [editId]);


  const resetRouteState = () => {
   // clear computed data
   setRoutes([]);
   setSelectedRouteIndex(null);
   setRouteTaxCosts([]);
   setTollCosts([]);
   setDistance(null);
   setDuration(null);
   setDurationWithBreaks(null);
   setRawDistance(null);
   setRawDuration(null);
   setHasCalculated(false);
   setSaveMsg("");

     // ===== VIA PHASE 1: clear via state =====
    setViaStopsByLeg([]);
    setViaStack([]);
    setViaDraft(null);
    setSelectedVia(null);
    // ========================================

   // clear map artifacts
   const map = mapRef.current;
   if (!map) return;

   // remove numbered address group safely
   if (markerGroupRef.current) {
     try { markerGroupRef.current.removeAll(); } catch {}
     const stillOnMap = map.getObjects().includes(markerGroupRef.current);
     if (stillOnMap) { try { map.removeObject(markerGroupRef.current); } catch {} }
     markerGroupRef.current = null;
   }

   // remove remaining polylines/dom markers
   map.getObjects().forEach(obj => {
     if (obj instanceof window.H.map.Polyline || obj instanceof window.H.map.DomMarker) {
       try { map.removeObject(obj); } catch {}
     }
   });

   // recenter
   map.getViewModel().setLookAtData({
     position: { lat: 44.4268, lng: 26.1025 },
     zoom: 6
   });
};

// ===== VIA PHASE 1: placeholder handlers =====
const cancelViaDraft = () => {
  if (ghostMarkerRef.current && mapRef.current) {
    mapRef.current.removeObject(ghostMarkerRef.current);
    ghostMarkerRef.current = null;
  }
  setViaDraft(null);
};

const deleteSelectedVia = () => {
  if (!selectedVia?.id && selectedVia?.legIdx == null) return;

  const { legIdx, id } = selectedVia;

  setViaStopsByLeg(prev => {
    const base = ensureLegSlots(prev, Math.max((addressesRef.current?.length || 0) - 1, 0));
    base[legIdx] = (base[legIdx] || []).filter(v => v.id !== id);
    return base;
  });

  setViaStack(stack => stack.filter(x => !(x.legIdx === legIdx && x.id === id)));

  setSelectedVia(null);

  // re-route after state settles
  setTimeout(() => {
    if (addressesRef.current?.length >= 2) {
      getRoute([...addressesRef.current], viaStopsByLegRef.current);
    }
  }, 0);
};

const popLastVia = () => {
  setViaStack(stack => {
    if (stack.length === 0) return stack;
    const last = stack[stack.length - 1]; // {legIdx, id}

    setViaStopsByLeg(prev => {
      const base = ensureLegSlots(prev, Math.max((addressesRef.current?.length || 0) - 1, 0));
      base[last.legIdx] = (base[last.legIdx] || []).filter(v => v.id !== last.id);
      return base;
    });

    setTimeout(() => {
      if (addressesRef.current?.length >= 2) {
        getRoute([...addressesRef.current], viaStopsByLegRef.current);
      }
    }, 0);

    return stack.slice(0, -1);
  });
};

// Sort vias by their progress along the straight line from leg start -> leg end.
// We project each via onto the start->end vector and sort by that scalar "t".
const sortViasAlongLeg = (vias, legStart, legEnd) => {
  if (!Array.isArray(vias) || vias.length <= 1) return vias || [];

  const ax = legEnd.lng - legStart.lng;
  const ay = legEnd.lat - legStart.lat;
  const denom = ax*ax + ay*ay || 1;

  const progress = (p) => {
    const px = p.lng - legStart.lng;
    const py = p.lat - legStart.lat;
    return (px*ax + py*ay) / denom; // smaller -> closer to start, larger -> closer to end
  };

  return vias.slice().sort((a, b) => progress(a) - progress(b));
};

const _registerVia = (legIdx, via) => {
  const legCount = Math.max((addressesRef.current?.length || 0) - 1, 0);
  const base = ensureLegSlots(viaStopsByLegRef.current, legCount).map(a => [...a]);
  base[legIdx] = [...(base[legIdx] || []), via];

  // ✅ sync both
  viaStopsByLegRef.current = base;
  setViaStopsByLeg(base);

  setViaStack(stack => [...stack, { legIdx, id: via.id }]);
  setSelectedVia({ legIdx, id: via.id });
};

  // Segmente etichetate cu orașele din `addresses`
  function getSegmentsForRoute(rt) {
    if (!rt?.sections?.length || addresses.length < 2) return [];
    const legs = buildLegs(rt.sections); // N−1 liste de secțiuni
    return legs.map((legSecs, i) => {
      const from = addresses[i];
      const to   = addresses[i + 1];
      const fromName = from?.city || extractCityFromLabel(from?.label) || `Adresa${i + 1}`;
      const toName   = to?.city   || extractCityFromLabel(to?.label)   || `Adresa${i + 2}`;
      const meters = legSecs.reduce((sum, s) => sum + (s.summary?.length || 0), 0);
      const km = Math.round((meters / 1000) * 10) / 10;
      return {
        key: String(i),
        label: `${fromName}→${toName}`,
        km,
        display: `${fromName}→${toName}  -  ${km} km`,
      };
    });
  }

  //compute total wall-clock seconds (driving + breaks) once per render
  const secWithBreaks = rawDuration != null
    ? addLegalBreaks(rawDuration)
    : 0;

  const showPricePerDay = vehicleType.pricePerDay != null;
  const days = rawDuration != null ? Math.ceil(rawDuration / 86400) : 0;
  const dayCost = showPricePerDay
    ? days * vehicleType.pricePerDay
    : 0;

  const handleSaveRoute = async () => {
    if (addresses.length < 2) {
      alert('Need at least start and end addresses');
      return;
    }
    if (!plate) {
      alert('Select a truck');
      return;
    }
    if (!identifier) {
      alert('Enter a unique tour number');
      return;
    }

    setSaveMsg('');
    try {
      const { data: profile, error: pErr } = await supabase
        .from('users')
        .select('team_id, role')
        .eq('id', user.id)
        .single();
      if (pErr) throw pErr;

      const { data: truck, error: tErr } = await supabase
        .from('trucks')
        .select('team_id')
        .eq('id', plate)
        .single();
      if (tErr) throw tErr;

      const privileged = ['admin'];
      if (!privileged.includes(profile.role) && String(truck.team_id) !== String(profile.team_id)) {
        throw new Error('Selected truck is not on your team');
      }

      const minimalSections = routes[selectedRouteIndex].sections.map(s => ({ polyline: s.polyline, summary: s.summary }));
      // decide cost_per_km: null if allIn, otherwise computed
      // question: possible unwanted
      const costPerKmValue = allIn ? 0 : costPerKmForSelected();
      const euroPerKmValue = allIn ? 0 : vehicleType.EuroPerKm;

      let identifierToSave = identifier;

      if (isEditMode) {
        // naive: timestamp suffix (fast + collision-proof)
        identifierToSave = `${identifier}-rev${new Date().toISOString().slice(0,19).replace(/[-:T]/g,'')}`;
      }

      const newRoute = {
        team_id: profile.team_id,
        created_by: user.id,
        date: new Date().toISOString(),
        identifier: identifierToSave,
        truck_id: plate,
        euro_per_km: euroPerKmValue,
        distance_km: parseFloat(distance),
        cost_per_km: costPerKmValue,
        tolls: tollCosts[selectedRouteIndex].tollList,
        sections: minimalSections,
        addresses,
        toll_cost: tollCosts[selectedRouteIndex].totalCost,
        total_cost: (allIn ? parseFloat(fixedTotalCost || 0) : (costPerKmValue + tollCosts[selectedRouteIndex].totalCost)),
        duration,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_route_id: isEditMode ? parentRouteId : null,
        via_stops_by_leg: viaStopsByLegRef.current,
      };

      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !session) {
        alert('Your session has expired. Please log in again.');
        return;
      }

      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(newRoute)
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.message || res.statusText);
      }

      alert(isEditMode ? "Route updated (new version saved) ✔️" : "Route saved ✔️");
      resetRouteState();
      if (isEditMode) {
  navigate(`/history?filter=${encodeURIComponent(identifier)}`);
}
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed: ' + err.message);
    }
  };

  const computeRouteMetrics = (route) => {
    let totalDistance = 0, totalDuration = 0;
    route.sections.forEach(section => {
      if (section.summary) {
        totalDistance += section.summary.length;
        totalDuration += section.summary.duration;
      }
    });
    const km = totalDistance / 1000;
    const costPerKm = km * vehicleType.EuroPerKm;
    return { totalDistance, totalDuration, km, costPerKm };
  };

  // Adaugă adrese
  const addAddress = async (coordsWithLabel) => {
    const code = await fetchPostalCode(coordsWithLabel.lat, coordsWithLabel.lng);
    const city = extractCityFromLabel(coordsWithLabel.label);
    const countryCode = coordsWithLabel.label
      .split(',')
      .pop()
      .trim()
      .slice(0, 2)
      .toUpperCase();

    setAddresses(prev => {
  const next = [
    ...prev,
    {
      id: `addr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      ...coordsWithLabel,
      postal: code || "",
      country: countryCode,
      city,
    }
  ];
  return next;
});

    console.log('picked address: ', coordsWithLabel)
  };
  const moveUp = (index) => {
    if (index === 0) return;
    const newArr = [...addresses];
    [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
    setAddresses(newArr);
  };
  const moveDown = (index) => {
    if (index === addresses.length - 1) return;
    const newArr = [...addresses];
    [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
    setAddresses(newArr);
  };
  const removeAddressById = (id) => {
  setAddresses((prev) => {
    const next = prev.filter((a) => a.id !== id);
    if (next.length === 0) resetRouteState();
    return next;
  });
};


const getRoute = async (pts = addresses, viasByLeg = viaStopsByLegRef.current) => {
  setIsLoading(true);
  try {
    const origin = pts[0];
    const destination = pts[pts.length - 1];

    let url = `https://router.hereapi.com/v8/routes?apikey=${process.env.REACT_APP_HERE_API_KEY}`;
    url += `&origin=${origin.lat},${origin.lng}`;
    url += `&destination=${destination.lat},${destination.lng}`;

    const orderedVias = buildOrderedVias(pts, viasByLeg);
    for (const v of orderedVias) {
      url += `&via=${v.lat},${v.lng}`;
    }

    url += `&return=polyline,summary,actions,instructions,tolls`;
    url += `&alternatives=3`;

    // truck profile…
    url += `&transportMode=truck`;
    url += `&vehicle[weightPerAxle]=11500`;
    url += `&vehicle[height]=400`;
    url += `&vehicle[width]=255`;
    url += `&vehicle[length]=1875`;
    url += `&truck[axleCount]=${vehicleType.axles}`;
    url += `&vehicle[grossWeight]=${vehicleType.weight}`;
    url += `&truck[limitedWeight]=7500`;
    url += `&tolls[emissionType]=euro6`;

    const response = await fetch(url);
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      console.error("No routes found:", data);
      alert("No routes found. Try different points.");
      return;
    }

    const sorted = data.routes
      .map(route => ({ route, duration: route.sections.reduce((s, x) => s + (x.summary?.duration || 0), 0) }))
      .sort((a, b) => a.duration - b.duration)
      .map(item => item.route);

    setRoutes(sorted);
    setRouteTaxCosts(Array(sorted.length).fill(0));
    setTollCosts(Array(sorted.length).fill({ totalCost: 0, tollList: [] }));
    setContractPopupsByRoute(Array(sorted.length).fill([]));
    setSelectedRouteIndex(idx => (idx == null ? 0 : Math.max(0, Math.min(idx, sorted.length - 1))));


    const legCount = Math.max((addressesRef.current?.length || 0) - 1, 0);
    syncLegArrays(legCount);

    // Teach the gesture based on per-leg vias
    const hasAnyVia = (viaStopsByLegRef.current || []).some(arr => (arr?.length || 0) > 0);
    if (!hasAnyVia) {
      showHint("Left-click and hold on the route to place a via");
    } else {
      const n = (viaStopsByLegRef.current || []).reduce((acc, arr) => acc + (arr?.length || 0), 0);
      showHint(n === 1 ? "Press ESC to remove the via" : "Press ESC to remove the last via");
    }

    // draw fastest, compute summaries…
    displayedRoute(sorted[0]);
    const first = sorted[0];
    let totalDist = 0, totalDur = 0;
    first.sections.forEach(sec => {
      if (sec.summary) { totalDist += sec.summary.length; totalDur += sec.summary.duration; }
    });
    setDistance((totalDist / 1000).toFixed(2));
    setRawDistance(totalDist);
    setRawDuration(totalDur);

    const breaks = addLegalBreaks(totalDur);
    setDurationWithBreaks(`${Math.floor(breaks / 3600)}h ${Math.floor((breaks % 3600) / 60)}m`);
    setDuration(`${Math.floor(totalDur / 3600)}h ${Math.floor((totalDur % 3600) / 60)}m`);
  } catch (err) {
    console.error("Error fetching route:", err);
    alert("Error calculating route. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

 // Split sections by via counts: leg i has (vias[i] + 1) sections
const buildLegs = (routeSections) => {
  const nLegs = Math.max((addressesRef.current?.length || 0) - 1, 0);
  const viaCounts = Array.from({ length: nLegs }, (_, i) => (viaStopsByLegRef.current?.[i]?.length || 0));
  const needed = viaCounts.map(c => c + 1);

  const legs = [];
  let cursor = 0;
  for (let i = 0; i < nLegs; i++) {
    const take = needed[i];
    const slice = routeSections.slice(cursor, cursor + take);
    legs.push(slice);
    cursor += take;
  }
  // Safety: any leftover sections (rare) go to the last leg
  if (cursor < routeSections.length && legs.length > 0) {
    legs[legs.length - 1] = legs[legs.length - 1].concat(routeSections.slice(cursor));
  }
  return legs;
};

  // Afișare rută pe hartă
const displayedRoute = (route) => {
  if (!mapRef.current) return;
  const map = mapRef.current;

  //clear old polylines
  map.getObjects().forEach(obj => {
    if (obj instanceof window.H.map.Polyline) {
      map.removeObject(obj);
    }
  });
  // draw the route polyline (single LineString over all sections)
  const fullLineString = new window.H.geo.LineString();
  route.sections.forEach(sec => {
    const part = window.H.geo.LineString.fromFlexiblePolyline(sec.polyline);
    const arr = part.getLatLngAltArray();
    for (let i = 0; i < arr.length; i += 3) {
      fullLineString.pushLatLngAlt(arr[i], arr[i + 1], arr[i + 2]);
    }
  });
  fullLineStringRef.current = fullLineString;
  const poly = new window.H.map.Polyline(fullLineString, {
    style: { strokeColor: 'blue', lineWidth: 4 }
  });
  map.addObject(poly);

  // ===== VIA PHASE 2/3: ghost via drag scaffold + commit =====
  if(!isMobile) {
    poly.addEventListener('pointerdown', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();

      // freeze map panning while we drag the ghost
      if (behaviorRef.current) {
        try {
          behaviorRef.current.disable(window.H.mapevents.Behavior.DRAGGING);
          behaviorRef.current.disable(window.H.mapevents.Behavior.KINETIC);
        } catch {}
      }

      const { viewportX, viewportY } = evt.currentPointer || {};
      if (typeof viewportX !== 'number') return;

      const map = mapRef.current;
      const geo = map.screenToGeo(viewportX, viewportY);
      setViaDraft({ lat: geo.lat, lng: geo.lng });

      // Create ghost DOM marker if none
      if (!ghostMarkerRef.current) {
        const ghostEl = document.createElement('div');
        ghostEl.style.width = '14px';
        ghostEl.style.height = '14px';
        ghostEl.style.borderRadius = '50%';
        ghostEl.style.background = 'rgba(30,144,255,0.6)';
        ghostEl.style.boxShadow = '0 0 6px rgba(30,144,255,0.6)';
        ghostEl.style.transform = 'translate(-50%,-50%)';
        const ghostIcon = new window.H.map.DomIcon(ghostEl);
        const marker = new window.H.map.DomMarker(geo, { icon: ghostIcon });
        ghostMarkerRef.current = marker;
        map.addObject(marker);
      }

      // start listening to pointermove while dragging
      const onMove = (moveEvt) => {
        const { viewportX: x, viewportY: y } = moveEvt.currentPointer;
        const g = map.screenToGeo(x, y);
        setViaDraft({ lat: g.lat, lng: g.lng });
        if (ghostMarkerRef.current) ghostMarkerRef.current.setGeometry(g);
      };

      const onUp = async () => {
        map.removeEventListener('pointermove', onMove);
        map.removeEventListener('pointerup', onUp);
        if (behaviorRef.current) {
          try {
            behaviorRef.current.enable(window.H.mapevents.Behavior.DRAGGING);
            behaviorRef.current.enable(window.H.mapevents.Behavior.KINETIC);
          } catch {}
        }
        // Commit the via: turn ghost into a real via stop and reroute
        let committed = null;
        if (ghostMarkerRef.current) {
          const { lat, lng } = ghostMarkerRef.current.getGeometry();
          committed = { id: `via_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, lat, lng };
        }
        if (ghostMarkerRef.current) { map.removeObject(ghostMarkerRef.current); ghostMarkerRef.current = null; }
        setViaDraft(null);

        if (committed) {
          // 🔎 Figure out which section is closest to the drop, then map section→leg
          const sectionIdx = nearestSectionIndex(committed.lat, committed.lng, route);
          const legIdx = sectionIndexToLegIndex(
            sectionIdx,
            viaStopsByLegRef.current,
            addressesRef.current
          );

          console.log('[via] commit on leg', legIdx, 'coords:', committed.lat, committed.lng);
          _registerVia(legIdx, committed);
          setTimeout(() => {
            const pts = [...addressesRef.current];
            getRoute(pts, viaStopsByLegRef.current);
          }, 0);
        }
        showHint("Press ESC to remove the last via", 4000);
      };

      map.addEventListener('pointermove', onMove);
      map.addEventListener('pointerup', onUp);
    }, true);
  }
  // ==============================================

  // fit bounds
const bounds = fullLineString.getBoundingBox();
if (bounds) {
   // Tweak factor: 1.06 (subtle) … 1.15 (more generous)
   const padded = inflateRect(bounds, 1.10);
   map.getViewModel().setLookAtData({ bounds: padded, animate: false });
 }
  // Paint via dots right after the new polyline settles
  setTimeout(renderViaMarkers, 0);
};

// Render persistent via markers from viaStops
const renderViaMarkers = () => {
  const map = mapRef.current;
  if (!map) return;

  if (viaGroupRef.current) {
    try { map.removeObject(viaGroupRef.current); } catch {}
    viaGroupRef.current = null;
  }

  const legs = viaStopsByLegRef.current || [];
  const totalCount = legs.reduce((a, arr) => a + (arr?.length || 0), 0);
  if (totalCount === 0) return;

  const group = new window.H.map.Group();
  let globalCounter = 0;

  legs.forEach((arr, legIdx) => {
    (arr || []).forEach((v, idxInLeg) => {
      const isSelected = !!(selectedVia && selectedVia.legIdx === legIdx && selectedVia.id === v.id);

      const el = document.createElement('div');
      el.style.width = isSelected ? '16px' : '14px';
      el.style.height = isSelected ? '16px' : '14px';
      el.style.borderRadius = '50%';
      el.style.transform = 'translate(-50%,-50%)';
      el.style.background = isSelected ? 'rgba(0,160,255,0.95)' : 'rgba(0,160,255,0.65)';
      el.style.boxShadow = isSelected ? '0 0 10px rgba(0,160,255,0.9)' : '0 0 6px rgba(0,0,0,0.3)';
      el.style.border = isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.8)';
      el.style.cursor = 'pointer';

      const badge = document.createElement('div');
      const displayIdx = ++globalCounter;
      badge.textContent = `${displayIdx}`;
      badge.style.position = 'absolute';
      badge.style.top = '-18px';
      badge.style.left = '50%';
      badge.style.transform = 'translateX(-50%)';
      badge.style.padding = '1px 4px';
      badge.style.fontSize = '10px';
      badge.style.lineHeight = '12px';
      badge.style.borderRadius = '6px';
      badge.style.background = 'rgba(0,0,0,0.7)';
      badge.style.color = 'white';
      badge.style.userSelect = 'none';
      el.appendChild(badge);

      const icon = new window.H.map.DomIcon(el);
      const m = new window.H.map.DomMarker({ lat: v.lat, lng: v.lng }, { icon, volatility: true });

      // select
      m.addEventListener('pointerdown', (evt) => {
        evt.stopPropagation();
        setSelectedVia({ legIdx, id: v.id });
      }, true);

      // drag-move within the same leg (reorder by progress)
      let dragging = false;
      const onPointerDown = (evt) => {
        evt.stopPropagation();
        dragging = true;
        el.style.cursor = 'grabbing';
        if (behaviorRef.current) {
          try {
            behaviorRef.current.disable(window.H.mapevents.Behavior.DRAGGING);
            behaviorRef.current.disable(window.H.mapevents.Behavior.KINETIC);
          } catch {}
        }
        map.addEventListener('pointermove', onPointerMove, true);
        map.addEventListener('pointerup', onPointerUp, true);
      };
      const onPointerMove = (moveEvt) => {
        if (!dragging) return;
        const { viewportX, viewportY } = moveEvt.currentPointer || {};
        if (typeof viewportX !== 'number') return;
        const g = map.screenToGeo(viewportX, viewportY);
        try { m.setGeometry(g); } catch {}
      };
      const onPointerUp = () => {
        if (!dragging) return;
        dragging = false;
        el.style.cursor = 'grab';
        map.removeEventListener('pointermove', onPointerMove, true);
        map.removeEventListener('pointerup', onPointerUp, true);
        if (behaviorRef.current) {
          try {
            behaviorRef.current.enable(window.H.mapevents.Behavior.DRAGGING);
            behaviorRef.current.enable(window.H.mapevents.Behavior.KINETIC);
          } catch {}
        }

        const g = m.getGeometry();
       // Build next state synchronously, then apply and route with *that* snapshot
       const legCount = Math.max((addressesRef.current?.length || 0) - 1, 0);
       const base = ensureLegSlots(viaStopsByLegRef.current, legCount).map(arr => [...arr]);
       const arrNow = (base[legIdx] || []).map(x => x.id === v.id ? { ...x, lat: g.lat, lng: g.lng } : x);
       const withP = arrNow.map(x => ({ ...x, __p: routeProgressIndex(x.lat, x.lng) }));
       withP.sort((a, b) => a.__p - b.__p);
       base[legIdx] = withP.map(({ __p, ...rest }) => rest);

       // Commit to state + ref
       setViaStopsByLeg(base);
       viaStopsByLegRef.current = base;

       // Re-route using the *new* legs
       if (addressesRef.current?.length >= 2) {
         getRoute([...addressesRef.current], base);
       }
      };

      m.addEventListener('pointerdown', onPointerDown, true);
      m.setData({ title: `Via ${legIdx + 1}.${idxInLeg + 1} (ESC to remove)` });

      group.addObject(m);
    });
  });

  map.addObject(group);
  viaGroupRef.current = group;
};


const routeProgressIndex = (lat, lng) => {
  const ls = fullLineStringRef.current;
  if (!ls) return 0;

  const arr = ls.getLatLngAltArray(); // [lat, lng, alt, lat, lng, alt, ...]
  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < arr.length; i += 3) {
    const dLat = arr[i] - lat;
    const dLng = arr[i + 1] - lng;
    const d = dLat * dLat + dLng * dLng; // squared distance is fine
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i / 3; // vertex index
    }
  }
  return bestIdx;
};


  // Selectare rută
  const handleRouteSelect = (index) => {
    setSelectedRouteIndex(index);
    // setSelectedSegmentByIndex(s => ({ ...s, [index]: s[index] ?? "0" }));
    if (mapRef.current) {
      displayedRoute(routes[index]);
    }

    if (routes[index].sections && routes[index].sections.length > 0) {
      let totalDistance = 0;
      let totalDuration = 0;
      routes[index].sections.forEach((section) => {
        if (section.summary) {
          totalDistance += section.summary.length;
          totalDuration += section.summary.duration;
        }
      });
      setDistance((totalDistance / 1000).toFixed(2));
      setRawDistance(totalDistance);
      setRawDuration(totalDuration);
      const secWithBreaks = addLegalBreaks(totalDuration);
      const hWB = Math.floor(secWithBreaks/3600);
      const mWB = Math.floor((secWithBreaks%3600)/60);
      setDurationWithBreaks(`${hWB}h ${mWB}m`);
      const hours = Math.floor(totalDuration / 3600);
      const minutes = Math.floor((totalDuration % 3600) / 60);
      setDuration(`${hours}h ${minutes}m`);
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (addresses.length < 2) {
    alert('At least two addresses required!');
    return;
  }

  // 🚀 Only the addresses array defines your waypoints
  const coords = [...addresses];

  setIsLoading(true);
  try {
    await getRoute(coords);
    setHasCalculated(true);
  } finally {
    setIsLoading(false);
  }
};

  // 3) Callback - când TollCalculator calculează costul pt o rută, îl salvăm și într-un array numeric simplu routeTaxCosts, și în tollCosts (pt listă).
const updateTollCostForRoute = (index, tollData) => {
  // numeric totals
  setRouteTaxCosts((prev) => {
    const newArr = [...prev];
    newArr[index] = tollData.totalCost || 0;
    return newArr;
  });

  // full toll object (includes tollList + contractHits now)
  setTollCosts((prev) => {
    const newArr = [...prev];
    newArr[index] = tollData;
    return newArr;
  });

  // ✅ store contract hits for this route
  const hits = tollData?.contractHits || [];
  setContractPopupsByRoute((prev) => {
    const next = [...prev];
    next[index] = hits;
    return next;
  });

  // ✅ optional: show a popup immediately when hits appear
if (hits.length) {
  showHint(hits.map(h => h.msg).join(" • "), 5000);
}
};
  
  // useEffect(() => {
  //   if (mapRef.current) return; 
  
  //   const platform = new window.H.service.Platform({
  //     apikey: process.env.REACT_APP_HERE_API_KEY,
  //   });
  //   const defaultLayers = platform.createDefaultLayers();
  //   const map = new window.H.Map(
  //     document.getElementById("mapContainer"),
  //     defaultLayers.vector.normal.map,
  //     { zoom: 6, center: { lat: 44.4268, lng: 26.1025 } }
  //   );

  //   map.getElement().addEventListener('contextmenu', e => e.preventDefault());

  //   // ⬇️ THIS is the spot: store Behavior in behaviorRef
  //   const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
  //   behaviorRef.current = behavior; // <— important
    
  //   mapRef.current = map;
    
  //   setTimeout(() => {
  //     map.getViewPort().resize();
  //   }, 0);

  //   const onResize = () => map.getViewPort().resize();
  //   window.addEventListener("resize", onResize);
  //   return () => {
  //     window.removeEventListener("resize", onResize);
  //   };
  // }, []);

const initMapIfNeeded = React.useCallback((elId) => {
  const el = document.getElementById(elId);
    if (!el) return;

  // If the map exists but is attached to a different element, dispose it
  if (mapRef.current && mapRef.current.getElement && mapRef.current.getElement() !== el) {
    try { mapRef.current.dispose(); } catch {}
    mapRef.current = null;
  }
  if (mapRef.current) return; // already mounted on the right element

   const platform = new window.H.service.Platform({ apikey: process.env.REACT_APP_HERE_API_KEY });
   const defaultLayers = platform.createDefaultLayers();
   const map = new window.H.Map(
     el,
     defaultLayers.vector.normal.map,
     { zoom: 6, center: { lat: 44.4268, lng: 26.1025 } }
   );

   map.getElement().addEventListener('contextmenu', e => e.preventDefault());
   const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
   behaviorRef.current = behavior;
   mapRef.current = map;

map.getElement().addEventListener("contextmenu", async (e) => {
  e.preventDefault();

  if ((addressesRef.current?.length || 0) < 2) {
    showHint("Add at least 2 addresses first (start + destination).", 2500);
    return;
  }

  const rts = routesRef.current || [];
  if (rts.length === 0) return;

  const idx = selectedRouteIndexRef.current ?? 0;
  const route = rts[idx] || rts[0];
  if (!route?.sections?.length) return;

  const rect = map.getElement().getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const geo = map.screenToGeo(x, y);
  if (!geo) return;

  // Determine leg as you already do
  const sectionIdx = nearestSectionIndex(geo.lat, geo.lng, route);
  const legIdx = sectionIndexToLegIndex(
    sectionIdx,
    viaStopsByLegRef.current,
    addressesRef.current
  );

  showHint("Finding best road-side via…", 1200);

  // ✅ Pick best nearby candidate within 1km by routing score
  let bestPoint = null;
  try {
    bestPoint = await pickBestViaCandidate({ clickGeo: geo, legIdx });
  } catch (err) {
    console.warn("Candidate picking failed, falling back to click:", err);
    bestPoint = { lat: geo.lat, lng: geo.lng };
  }

  const committed = {
    id: `via_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    lat: bestPoint.lat,
    lng: bestPoint.lng,
  };

  _registerVia(legIdx, committed);

  // Re-route using updated vias
  setTimeout(() => {
    if (addressesRef.current?.length >= 2) {
      getRoute([...addressesRef.current], viaStopsByLegRef.current);
    }
  }, 0);

  showHint("Via added (smart). Press ESC to remove last via", 2500);
});

   // first resize tick
   setTimeout(() => map.getViewPort().resize(), 0);
   const onResize = () => map.getViewPort().resize();
   window.addEventListener("resize", onResize);
   // Note: if you ever unmount the page entirely, remove the listener.
 }, []);

   const paintAddressMarkers = React.useCallback(() => {
  if (!mapRef.current) return;
  if (addresses.length === 0) return;

  const map = mapRef.current;

  const legCount = Math.max(addresses.length - 1, 0);
  syncLegArrays(legCount);

  if (activeLegIdx >= legCount) {
    setActiveLegIdx(Math.max(legCount - 1, 0));
  }

  if (markerGroupRef.current) {
    map.removeObject(markerGroupRef.current);
  }

  const group = new window.H.map.Group();

  addresses.forEach((pt, idx) => {
    const el = document.createElement('div');
    el.className = 'numbered-marker';
    el.style.transform = 'translate(-50%,-110%)';

    let color = "blue";
    if (idx === 0) color = "green";
    else if (idx === addresses.length - 1) color = "red";

    el.innerHTML = 
    `<svg viewBox="0 0 24 24" class="arrow-icon">
      <path d="M12 2 L15 8 H9 L12 2 Z" fill="${ idx===0 ? 'green' : idx===addresses.length-1 ? 'red' : 'blue' }" />
    </svg>
    <span class="marker-label">${idx+1}</span>
    `;

    document.body.appendChild(el);
    const { offsetWidth } = el;
    document.body.removeChild(el);

    el.style.marginLeft = `-${offsetWidth/2}px`;
    el.style.marginTop  = `0px`;

    const domIcon = new window.H.map.DomIcon(el);
    const marker = new window.H.map.DomMarker(
      { lat: pt.lat, lng: pt.lng },
      { icon: domIcon, volatility: false }
    );
    marker.__domElement = el;
    group.addObject(marker);
  });

  map.addObject(group);
  markerGroupRef.current = group;
}, [addresses, activeLegIdx]);

useEffect(() => {
  paintAddressMarkers();
}, [addresses, mapOpen, paintAddressMarkers]);

 
 // Desktop: init immediately
 React.useEffect(() => {
   if (!isMobile) initMapIfNeeded("mapContainerDesktop");
 }, [isMobile, initMapIfNeeded]);
 // Mobile: init when the sheet opens
// Mobile: init (fresh) when the sheet opens
React.useEffect(() => {
  if (!isMobile) return;
  if (!mapOpen) return;

  const el = document.getElementById("mapContainerMobile");
  if (!el) return;

  // 🔥 1) Always dispose old map when opening the sheet on mobile
  if (mapRef.current) {
    try { mapRef.current.dispose(); } catch {}
    mapRef.current = null;
  }
  behaviorRef.current = null;
  markerGroupRef.current = null;
  viaGroupRef.current = null;
  ghostMarkerRef.current = null;
  fullLineStringRef.current = null;

  // 🔁 2) Create a brand new map instance
  const platform = new window.H.service.Platform({
    apikey: process.env.REACT_APP_HERE_API_KEY,
  });
  const defaultLayers = platform.createDefaultLayers();
  const map = new window.H.Map(
    el,
    defaultLayers.vector.normal.map,
    { zoom: 6, center: { lat: 44.4268, lng: 26.1025 } }
  );

  map.getElement().addEventListener("contextmenu", e => e.preventDefault());

  const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
  behaviorRef.current = behavior;
  mapRef.current = map;

  const onResize = () => map.getViewPort().resize();
  window.addEventListener("resize", onResize);

  // avoid scroll behind the sheet
  document.body.style.overflow = "hidden";

  // 3) After the slide animation finishes, resize + redraw everything
  const t = setTimeout(() => {
    if (!mapRef.current) return;

    mapRef.current.getViewPort().resize();

    // Redraw current route (if any)
    if (routes.length > 0) {
      const idx = selectedRouteIndex ?? 0;
      const rt = routes[idx] || routes[0];
      if (rt) {
        displayedRoute(rt);
      }
    }

    // Address markers
    if (addresses.length > 0) {
      paintAddressMarkers();
    }

    // Via markers
    renderViaMarkers();
  }, 250);

  return () => {
    document.body.style.overflow = "";
    clearTimeout(t);
    window.removeEventListener("resize", onResize);
    // ❗ do NOT dispose map here – we keep it alive while sheet is just hidden
    // we dispose only on next open to avoid weird "half-dead" state
  };
}, [isMobile, mapOpen, routes, selectedRouteIndex, addresses, paintAddressMarkers]);

  // cost per km pt ruta selectată
  const costPerKmForSelected = () => {
    if (selectedRouteIndex === null || routes.length === 0) return 0;
    const { costPerKm } = computeRouteMetrics(routes[selectedRouteIndex]);
    return costPerKm;
  };

  // ===== VIA PHASE 1: global ESC handler =====
useEffect(() => {
  const isEditable = (el) => {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase?.();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    return false;
  };

  const onKeyDown = (e) => {
    if (e.key !== 'Escape') return;
    // don’t hijack ESC while user is typing
    if (isEditable(document.activeElement)) return;

    if (viaDraft) {
      cancelViaDraft();
      return;
    }
    if (selectedVia?.id) {
      deleteSelectedVia();
      return;
    }
    if (viaStack.length > 0) {
      popLastVia();
      return;
    }
    // nothing to do — no-ops
  };

  window.addEventListener('keydown', onKeyDown, true);
  return () => window.removeEventListener('keydown', onKeyDown, true);
}, [viaDraft, selectedVia?.id, viaStack.length]); 
// ===========================================

  useEffect(() => {
    renderViaMarkers();
  }, [routes, selectedRouteIndex, selectedVia?.id]);

  useEffect(() => {
    if (!selectedVia) return;
    const exists = viaStopsByLeg.some(
      (arr, i) => i === selectedVia.legIdx && (arr || []).some(v => v.id === selectedVia.id)
    );
    if (!exists) setSelectedVia(null);
  }, [viaStopsByLeg, selectedVia]);

  useEffect(() => {
    renderViaMarkers();
  }, [viaStopsByLeg]);

  useEffect(() => {
    if (!routes.length) return;
    const totalVias = (viaStopsByLeg || []).reduce((acc, arr) => acc + (arr?.length || 0), 0);
    if (totalVias === 0) {
      showHint("Left-click and hold on the route to place a via", 3500);
    } else {
      showHint(totalVias === 1 ? "Press ESC to remove the via"
                              : "Press ESC to remove the last via", 4000);
    }
  }, [viaStopsByLeg, routes.length]);

  useEffect(() => {
    (async () => {
      // 1️⃣ fetch the user’s team & role
      const { data: profile, error: pErr } = await supabase
        .from('users')
        .select('team_id, role')
        .eq('id', user.id)
        .single()
      if (pErr) {
        console.error('Could not load profile:', pErr)
        return
      }

      // 2️⃣ fetch trucks, including euro_per_km
      let q = supabase
        .from('trucks')
        .select('id, plate, euro_per_km, price_per_day')

      if (profile.role !== 'admin') {
        q = q.eq('team_id', profile.team_id)
      }

      const { data: truckList, error: tErr } = await q
      if (tErr) {
        console.error('Could not load trucks:', tErr)
        return
      }
      setTrucks(truckList)
    })()
  }, [user])

  useEffect(() => {
    if (!plate) return
    const found = trucks.find(t => t.id === plate)
    if (found) {
      setVehicleType(prev => ({
        ...prev,
        EuroPerKm:   found.euro_per_km  ?? null,
        pricePerDay:  found.price_per_day ?? null
      }));
    } else {
      setVehicleType(v => ({ ...v, EuroPerKm: null, pricePerDay: null }));
    }
  }, [plate, trucks])

  useEffect(() => {
    if (mapRef.current && routes.length > 0) {
      window.dispatchEvent(new Event('resize'));
    }
  }, [routes]);

useEffect(() => {
  if (!mapRef.current) return;
  if (routes.length === 0) return;
  if (selectedRouteIndex != null) return; // 👈 don't override user

  // default to fastest
  const durations = routes.map(r =>
    r.sections.reduce((sum, s) => sum + (s.summary?.duration || 0), 0)
  );
  const fastestIdx = durations.indexOf(Math.min(...durations));
  setSelectedRouteIndex(fastestIdx);
  displayedRoute(routes[fastestIdx]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [routes, mapOpen]);

  return (
    <div className="App flex flex-col h-screen">
      <div
        className="
          flex flex-col flex-1 transition-colors duration-500
          bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800
          dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
        "
      >
        <DebugMouseOverlay />
        <Header user = {user} />
        {/* MAIN CONTENT */}
        {/*<div className="flex flex-row flex-1 overflow-hidden">*/}
        <div
          className="
          flex flex-col sm:flex-row flex-1 overflow-hidden min-h-screen transition-colors
          bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800
          dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
          "
        >

          {/* LEFT SIDE */}
          <div className="bg-burgundy-200 w-full sm:w-1/2 p-4 overflow-auto space-y-4">
            {/* ROW 1: Address + Vehicle */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/2 bg-white dark:bg-gray-800/70 p-4 rounded shadow-sm ring-2 ring-red-300 dark:ring-white/10 hover:ring-red-500 transition ">
                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Address</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div >
                    <label className="block mb-1 font-medium shadow-sm text-semibold text-gray-700 dark:text-gray-300">Enter the address:</label>
                      <div className="w-full rounded bg-gray-1000 ring-2 ring-red-300 focus-within:ring-red-500 transition">
                        <AutoCompleteInput
                          key={resetKey}                // <- forces remount = no stale value
                          apiKey={process.env.REACT_APP_HERE_API_KEY}
                          value={addressQuery}
                          onChange={setAddressQuery}
                          onSelect={(picked) => {
                            addAddress(picked);
                            setAddressQuery("");
                            setResetKey(k => k + 1);
                          }}
                          className="w-full p-2 bg-red-50 dark:bg-gray-700 dark:text-gray-100 border-none focus:outline-none"
                        />
                      </div>
                  </div>
                  {addresses.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No address entered.</p>}
                  {/* …inside your render… */}
                  <ul className="border border-gray-200 dark:border-gray-700 rounded p-2 max-h-40 overflow-y-auto space-y-1 bg-white dark:bg-gray-900/40">
                    {addresses.map((pt, index) => {
                      const parts = pt.label.split(",").map(s => s.trim());
                      const countryName = parts.pop();
                      const countryCode = (pt.country || countryName.slice(0,2)).toUpperCase();
                      const postal = pt.postal || "";
                      if (parts[0] === postal) parts.shift();
                      const addressOnly = parts.join(", ");
                      let display = "";
                      if(postal === ""){
                        display = `${addressOnly}, ${countryName}`;
                      } else {
                        display = `${countryCode}-${postal} ${addressOnly}`;
                      }

                      const canDrag = addresses.length > 1;


                      return (
                        <li
  key={pt.id || index}
  draggable={addresses.length > 1}
  onDragStart={(e) => {
    if (addresses.length <= 1) return;
    setDraggingId(pt.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", pt.id);
  }}
  onDragEnd={() => setDraggingId(null)}
  onDragOver={(e) => {
    if (addresses.length <= 1) return;
    e.preventDefault(); // enables drop
    e.dataTransfer.dropEffect = "move";
  }}
  onDrop={(e) => {
    if (addresses.length <= 1) return;
    e.preventDefault();

    const fromId = e.dataTransfer.getData("text/plain");
    const toId = pt.id;
    if (!fromId || !toId || fromId === toId) return;

    setAddresses((prev) => {
      const from = prev.findIndex((a) => a.id === fromId);
      const to = prev.findIndex((a) => a.id === toId);
      if (from < 0 || to < 0) return prev;
      return moveItem(prev, from, to);
    });
  }}
  className={`
    py-2 px-2 rounded-md transition
    odd:bg-gray-100 even:bg-white
    dark:odd:bg-gray-800 dark:even:bg-gray-900
    hover:bg-gray-200 dark:hover:bg-gray-600
    ${draggingId === pt.id ? "opacity-60" : ""}
  `}
>
  <div className="flex items-center gap-3">
    <span
      className={`
        mt-0.5 select-none
        ${addresses.length > 1
          ? "cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          : "opacity-30 cursor-not-allowed"}
      `}
      title={addresses.length > 1 ? "Drag to reorder" : ""}
      aria-hidden="true"
    >
      ⋮⋮
    </span>

    <div className="min-w-0 flex-1">
      <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
        {display}
      </div>
    </div>

    <button
      type="button"
      onClick={() => removeAddressById(pt.id)}
      className="
        ml-auto shrink-0
        h-7 w-7 rounded
        grid place-items-center
        text-red-700 hover:text-white
        hover:bg-red-600
        transition
      "
      aria-label="Remove address"
      title="Remove"
    >
      ×
    </button>
  </div>
</li>

                      );
                    })}
                  </ul>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`mt-3 ${isLoading ? "bg-red-400" : "bg-red-600 hover:bg-red-700"} text-white py-2 px-4 rounded font-semibold text-sm transition-colors`}
                  >
                    {isLoading ? "Calculating..." : (hasCalculated ? "Update route" : "Calculate route")}
                  </button>
                </form>
              </div>
              <div className="w-full sm:w-1/2 bg-white dark:bg-gray-800/70 p-4 rounded shadow-sm ring-2 ring-red-300 dark:ring-white/10 hover:ring-red-500 transition">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Vehicle Parameters</h2>
                  <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      className="form-checkbox mr-2"
                      checked={allIn}
                      onChange={e => setAllIn(e.target.checked)}
                    />
                    Fixed cost
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-gray-200">Number of axles</label> 
                    <input
                      type="number"
                      name="axles"
                      value={vehicleType.axles ?? ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setVehicleType((prev) => ({ ...prev, axles: isNaN(value) ? prev.axles : value }));
                      }}
                      min="2"
                      max="10"
                      className="w-full rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 ring-2 ring-red-300 focus-within:ring-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-gray-200">Tonnage (kg)</label>
                    <input
                      type="number"
                      name="weight"
                      value={vehicleType.weight ?? ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setVehicleType((prev) => ({ ...prev, weight: isNaN(value) ? prev.weight : value }));
                      }}
                      min="1000"
                      max="60000"
                      className="w-full rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 ring-2 ring-red-300 focus-within:ring-red-500 transition"
                    />
                  </div>
                  {!allIn ? (
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-gray-200">Euro/km</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        name="EuroPerKm"
                        value={vehicleType.EuroPerKm ?? ""}
                        onChange={e => {
                          const raw = e.target.value.trim().replace(',', '.')
                          const parsed = parseFloat(raw)
                          setVehicleType(v => ({
                            ...v,
                            EuroPerKm: isNaN(parsed) ? v.EuroPerKm : parsed
                          }))
                        }}
                        min="0"
                        max="10"
                        className="w-full rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 ring-2 ring-red-300 focus-within:ring-red-500 transition"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-gray-200">Total Cost (EUR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fixedTotalCost ?? ""}
                        onChange={e => setFixedTotalCost(e.target.value)}
                        className="w-full rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 ring-2 ring-red-300 focus-within:ring-red-500 transition"
                      />
                    </div>
                  )}
                  <div>
                    {/* ROW 4: Buton salvare ruta */}
                    {isManager && (
                      <div className="flex gap-4 items-end">
                        {/* Truck Plate Select */}
                        <div className="flex-1">
                          <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-gray-200">Truck Plate</label>
                          <select
                            className="w-full rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 ring-2 ring-red-300 focus:ring-red-500 transition"
                            value={plate}
                            required
                            onChange={e => setPlate(e.target.value)}
                          >
                            <option value="" disabled>
                              Select your truck
                            </option>
                            {trucks.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.plate}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Tour Identifier */}
                        <div className="flex-1">
                          <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-gray-200">Tour Number</label>
                          <input
                            className="w-full rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 ring-2 ring-red-300 focus:ring-red-500 transition"
                            placeholder="unique ID"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            required
                          />
                        </div>

                        {/* Save Route Button */}
                        <div>
                          <button
                            onClick={handleSaveRoute}
                            className="bg-green-600 text-white font-bold px-4 py-2 rounded shadow hover:bg-green-700 transition"
                          >
                            {isEditMode ? "Update Route" : "Save Route"}
                          </button>
                        </div>
                      </div>
                    )}

                    {isManager && saveMsg && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic mt-1">{saveMsg}</p>
                    )}

                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Alternative Routes */}
            {routes.length > 0 && (
              <div className="w-full bg-white dark:bg-gray-800/70 p-4 rounded shadow-sm ring-2 ring-red-300 dark:ring-white/10 hover:ring-red-500 transition">
                <div className="flex items-center mb-3">
                <h2 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">Alternative Routes</h2>

                  <div className="flex items-center gap-2 ml-auto">
                    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {[
                        { key: "time", label: "Time" },
                        { key: "cost", label: "Cost" },
                        { key: "km", label: "Km" },
                      ].map((opt) => {
                        const active = routeSortMode === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setRouteSortMode(opt.key)}
                            className={[
                              "px-3 py-1.5 text-sm font-semibold transition",
                              active
                                ? "bg-red-600 text-white"
                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            ].join(" ")}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {/* 👇 horizontal scroll container (mobile) */}
                <div className="relative -mx-2 sm:mx-0">
                  <div className="overflow-x-auto px-2">
                    <table className="min-w-[900px] sm:min-w-full text-sm border border-red-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      <thead>
                        <tr className="bg-red-50 dark:bg-gray-800">
                          <th className="px-3 py-2 border dark:border-gray-700">Route</th>
                          <th className="px-3 py-2 border dark:border-gray-700">Distance (km)</th>
                          <th className="px-3 py-2 border dark:border-gray-700">Segment distances</th>
                          <th className="px-3 py-2 border dark:border-gray-700">Time</th>
                          {!allIn && (
                            <th className="px-3 py-2 border dark:border-gray-700">Price per Km (EUR)</th>
                          )}
                          <th className="px-3 py-2 border dark:border-gray-700">Tolls (EUR)</th>
                          {showPricePerDay && (
                            <th className="px-3 py-2 border dark:border-gray-700">Price / Day</th>
                          )}
                          <th className="px-3 py-2 border dark:border-gray-700">Total Cost (EUR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRouteIndices.map((index) => {
                          const rt = routes[index];
                          const { totalDuration, km, costPerKm } = computeRouteMetrics(rt);

                          const hours = Math.floor(totalDuration / 3600);
                          const minutes = Math.floor((totalDuration % 3600) / 60);
                          const displayTime = `${hours}h ${minutes}m`;

                          const routeTax = routeTaxCosts[index] || 0;

                          // IMPORTANT: dayCost is currently global (based on rawDuration of selected route)
                          // For per-row accuracy, compute it per route:
                          const perRouteDays = Math.ceil(totalDuration / 86400) || 0;
                          const perRouteDayCost = showPricePerDay
                            ? perRouteDays * Number(vehicleType.pricePerDay || 0)
                            : 0;

                          const totalCost = allIn
                            ? parseFloat(fixedTotalCost || 0)
                            : costPerKm + routeTax + perRouteDayCost;

                          const segs = getSegmentsForRoute(rt);
                          const selected = String(index === selectedRouteIndex ? activeLegIdx : 0);

                          return (
                            <tr
                              key={index}
                              className={`cursor-pointer ${selectedRouteIndex === index ? "bg-red-50 dark:bg-gray-900/40" : ""} hover:bg-red-50 dark:hover:bg-gray-800`}
                              onClick={() => handleRouteSelect(index)}
                            >
                              <td className="px-3 py-2 border dark:border-gray-700 text-center">Route {index + 1}</td>
                              <td className="px-3 py-2 border dark:border-gray-700 text-center">{km}</td>
                              <td className="px-3 py-2 border dark:border-gray-700 text-center">
                                {segs.length > 0 ? (
                                  <select
                                    className="border dark:border-gray-600 rounded px-2 py-1 w-44 sm:w-full bg-white dark:bg-gray-700 dark:text-gray-100"
                                    value={selected}
                                    onChange={(e) => setActiveLegIdx(Number(e.target.value))}
                                  >
                                    {segs.map((s) => (
                                      <option key={s.key} value={s.key}>
                                        {s.display}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span>-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 border dark:border-gray-700 text-center">{displayTime}</td>
                              {!allIn && (
                                <td className="px-3 py-2 border dark:border-gray-700 text-center">
                                  {formatNum(costPerKm)}
                                </td>
                              )}
                              <td className="px-3 py-2 border dark:border-gray-700 text-center">{formatNum(routeTax)}</td>
                              {showPricePerDay && (
                                <td className="px-3 py-2 border dark:border-gray-700 text-center">
                                  {formatNum(perRouteDayCost)}
                                </td>
                              )}
                              <td className="px-3 py-2 border dark:border-gray-700 text-center">{formatNum(totalCost)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ROW 3: List of aggregated costs + Route Results */}
            {routes.length > 0 && (
              <div className="flex space-x-4">
                <div className="w-1/2 bg-white dark:bg-gray-800/70 p-4 rounded shadow-sm ring-2 ring-red-300 dark:ring-white/10 hover:ring-red-500 transition">
                  <h3 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">List of aggregated costs</h3>
                  {tollCosts[selectedRouteIndex] &&
                  tollCosts[selectedRouteIndex].tollList &&
                  tollCosts[selectedRouteIndex].tollList.length > 0 ? (
                    <ul className="space-y-1 text-sm text-gray-900 dark:text-gray-100 max-h-40 overflow-y-auto bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded p-2">
                      {tollCosts[selectedRouteIndex].tollList.map((toll, idx) => (
                        <li key={idx} className={`px-2 py-1 ${idx % 2 === 0 ? "bg-white dark:bg-gray-800/60" : "bg-red-100 dark:bg-gray-800/40"}`}>
                          {toll.name} - {toll.country}: {toll.cost.toFixed(2)} {toll.currency || "EUR"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Loading toll costs...</p>
                  )}
                </div>

                <div className="w-1/2 bg-white dark:bg-gray-800/70 p-4 rounded shadow-sm ring-2 ring-red-300 dark:ring-white/10 hover:ring-red-500 transition">
                  <h3 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">Route Results</h3>
                  {distance ? (
                    <>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Distance:</strong> {distance} km
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                        <strong>Total trip time:</strong>&nbsp;{durationWithBreaks}
                        <span
                          className="ml-1 cursor-help text-blue-500"
                          title={`Includes ${((secWithBreaks - rawDuration)/3600).toFixed(2)} hours breaks` }
                        >ⓘ</span>
                      </p>
                      {!allIn && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Price per Km:</strong>{" "}
                        {formatNum(Number(distance) * vehicleType.EuroPerKm)} EUR
                      </p>
                      )}
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Tolls:</strong> {formatNum(routeTaxCosts[selectedRouteIndex] || 0)} EUR
                      </p>
                      {showPricePerDay && (
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Days × Rate:</strong> {days} d × {formatNum(vehicleType.pricePerDay)} = {formatNum(dayCost)} EUR
                        </p>
                      )}
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                        <strong>Total Cost:</strong>{" "}
                        {formatNum(
                          allIn
                          ? Number(fixedTotalCost || 0)
                          : costPerKmForSelected() + (routeTaxCosts[selectedRouteIndex] || 0) + dayCost
                        )} EUR
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">There are no results available.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE - MAP */}
          <div
            id="mapContainerDesktop"
            className="hidden sm:block sm:w-1/2 h-full relative overflow-hidden"
          >
            {/* Hints HUD (inside the map, top-center) */}
            <div
              aria-live="polite"
              style={{
                position: "absolute",
                left: "50%",
                top: "calc(12px + env(safe-area-inset-top, 0px))",
                transform: `translate(-50%, ${hudVisible ? "0" : "-6px"})`,
                zIndex: 1000,
                pointerEvents: "none",
                transition: "opacity 200ms ease, transform 200ms ease",
                opacity: hudVisible ? 1 : 0,
                maxWidth: 420,
              }}
            >
              {hudMsg && (
                <div
                  style={{
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    background: "rgba(17, 24, 39, 0.72)", // slate-900 w/ alpha
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: "8px 12px",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                    fontSize: 13,
                    lineHeight: "18px",
                    textAlign: "center",
                  }}
                >
                  {hudMsg}
                </div>
              )}
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setMapOpen(true)}
              aria-controls="map-sheet"
              aria-expanded={mapOpen}
              className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-2xl
                          bg-[#a82424] text-white flex items-center justify-center
                          focus:outline-none focus:ring-2 focus:ring-white/40"
              title="Open map"
            >
              {/* simple map glyph */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 3v15M15 6v15" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          )}
          {isMobile && (
            <div
              id="map-sheet"
              className={`fixed inset-0 z-50 md:hidden transition
                          ${mapOpen ? "pointer-events-auto" : "pointer-events-none"}`}
            >
              {/* Backdrop */}
              <button
                onClick={() => setMapOpen(false)}
                aria-label="Close map"
                className={`absolute inset-0 bg-black/40 transition-opacity
                            ${mapOpen ? "opacity-100" : "opacity-0"}`}
              />

              {/* Slide-up panel */}
              <div
                className={`absolute left-0 right-0 bottom-0 h-[80dvh]
                            bg-white/95 dark:bg-gray-900/95 backdrop-blur
                            border-t border-black/10 dark:border-white/10
                            rounded-t-2xl shadow-2xl overflow-hidden
                            transform transition-transform duration-300
                            ${mapOpen ? "translate-y-0" : "translate-y-[105%]"}`}
              >
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={() => setMapOpen(false)}
                    className="h-10 w-10 rounded-lg border border-black/10 dark:border-white/20
                                flex items-center justify-center bg-white/80 dark:bg-gray-800/80"
                    aria-label="Close map"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>

                {/* Mobile map container */}
                <div id="mapContainerMobile" className="h-full w-full" />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
          © 2025 Rossik Route Calculation
        </footer>

        {/* Montăm un TollCalculator (invizibil) pentru fiecare rută */}
        <div style={{ display: "none" }}>
          {routes.map((route, index) => (
            <TollCalculator
              key={index}
              routeIndex={index}
              startCoordinates={addresses.length >= 2 ? addresses[0] : null}
              endCoordinates={addresses.length >= 2 ? addresses[addresses.length - 1] : null}
              intermediatePoints={addresses.length > 2 ? addresses.slice(1, addresses.length - 1) : []}
              vehicleType={vehicleType}
              rawDuration={rawDuration}
              rawDistance={rawDistance}
              selectedRoute={route}
              onTollUpdate={(tollData) => updateTollCostForRoute(index, tollData)}
            />
          ))}
        </div>
      </div>
    </div>
  );

};

export default MainPage;

/* TODOS:
- vedem daca putem modifica ANUMITE toll-uri dupa nume/contractele noastre (mont blanc, frejous, euro tunelul franta-regatul unit )
- numar de timocom, verificam care e mai vechi si sa verifice daca mai sunt actuale. daca da, sa se importeze datele, daca nu, sa-l blocheze
*/