import React, { useEffect, useRef, useState } from "react";
import 'leaflet/dist/leaflet.css';
import AutoCompleteInput from "../AutoCompleteInput";
import TollCalculator from "../TollCalculator";
import { useNavigate } from 'react-router-dom';
import { supabase } from "../lib/supabase";
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import { Link } from "react-router-dom";
import RossikLogo from '../VektorLogo_Rossik_rot.gif';
import { formatNum } from "../utils/number";
import { addLegalBreaks } from "../utils/driverTime";
import { debounce } from 'lodash'
import { calculateAndDisplayLiveRoute } from "./helpers/liveRoute";
import { fetchPostalCode } from "./helpers/reversePostal.js";
import DebugMouseOverlay from "../components/mouseOverlay.js";
import { extractCityFromLabel } from "../utils/segments.js";

import "./App.css";
import Header from "../components/header.js";

const MainPage = ({ user })  => {
  const [allIn, setAllIn] = useState(false);
  const [fixedTotalCost, setFixedTotalCost] = useState(''); // only used when allIn===true
  const [activeTab, setActiveTab] = useState("input"); // "input" | "results"
  const [addresses, setAddresses] = useState([]);
  const [distance, setDistance] = useState(null);
  const [routes, setRoutes] = useState([]); // Array cu rutele alternative
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
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
  const mapRef = useRef(null);
  const markerGroupRef = useRef(null);
  const navigate = useNavigate();
  let apiCallCount = 0;
  const isManager = ['transport_manager','team_lead','admin'].includes(user.role);
  const [darkMode, setDarkMode] = React.useState(false);

  //de aici am butonul de salvare rute
  const [trucks, setTrucks] = useState([]);        // lista de { id, plate }
  const [plate, setPlate] = useState('');          // selected truck plate
  const [identifier, setIdentifier] = useState(''); // unique run ID
  const [saveMsg, setSaveMsg] = useState('');
  const [durationWithBreaks, setDurationWithBreaks] = useState(null);
  const [viaPoints, setViaPoints] = useState([]); // [{lat, lng, postal, legIndex}, ...]

  // visual hint state
  const [undoCount, setUndoCount] = useState(0);               // number of placed-via items
  const [pendingLeg, setPendingLeg] = useState(null);          // legIdx being dragged or null
  const [mapHint, setMapHint] = useState(null);

  // at the top of MainPage
  const [addressQuery, setAddressQuery] = useState("");
  
  const viaMarkersRef = useRef([]);            // H.map.DomMarker refs per point
  const behaviorRef = useRef(null);
  const currentLineGeom = useRef(null);

  const pendingViaRef = useRef(null);                // { marker, legIdx, onMove, onUp }
  const placedViaStackRef = useRef([]);              // LIFO: [{ legIdx, marker }]
  const liveOverlaysRef = useRef(new Map());         // legIdx -> { remove() }

  // support multiple vias per leg
  const viaIdRef = useRef(0);            // incremental id for via points
  const viaPointsRef = useRef(viaPoints); // always-current viaPoints for handlers
  useEffect(() => { viaPointsRef.current = viaPoints; }, [viaPoints]);

  // ⬇️ add after your existing refs:
  const legGeomsRef = useRef([]); // legIdx -> [{lat,lng,distFromStart}, ...] for ordering along the leg

  // --- tiny geo helpers to measure along a leg ---
  function haversine(a, b) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat/2), s2 = Math.sin(dLng/2);
    const q = s1*s1 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2;
    return 2 * R * Math.asin(Math.sqrt(q));
  }
  function buildLegCumulative(points) {
    let acc = 0;
    return points.map((p,i,arr)=>{
      if (i>0) acc += haversine(arr[i-1], p);
      return { ...p, distFromStart: acc };
    });
  }
  // project a point to the closest vertex on the leg polyline (good enough for ordering)
  function projectOnLeg(legIdx, lat, lng) {
    const leg = legGeomsRef.current[legIdx] || [];
    if (!leg.length) return 0;
    let best = { i: 0, d: Infinity };
    const pt = { lat, lng };
    for (let i=0; i<leg.length; i++) {
      const d = haversine(pt, leg[i]);
      if (d < best.d) best = { i, d };
    }
    return leg[best.i].distFromStart;
  }


  // layout helpers driven by hasCalculated
  const leftWidth   = hasCalculated ? "w-1/2" : "w-1/3";
  const rightWidth  = hasCalculated ? "w-1/2" : "w-2/3";
  const cardsLayout = hasCalculated ? "flex-row space-x-4" : "flex-col space-y-4";
  const cardWidth   = hasCalculated ? "w-1/2" : "w-full";


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
  setViaPoints([]);
  setSaveMsg("");
  setMapHint(null);

  // clear map artifacts
  const map = mapRef.current;
  if (!map) return;

  // 1) remove any live overlays you might have registered
  for (const h of liveOverlaysRef.current.values()) {
    if (h && typeof h.remove === "function") h.remove();
  }
  liveOverlaysRef.current.clear();

  // 2) remove via markers (detach from parent if present)
  viaMarkersRef.current.forEach(m => {
    const parent = m.getParent && m.getParent();
    if (parent) {
      try { parent.removeObject(m); } catch (_) {}
    } else {
      try { map.removeObject(m); } catch (_) {}
    }
  });
  viaMarkersRef.current = [];
  placedViaStackRef.current = [];
  pendingViaRef.current = null;

  // 3) remove numbered address group safely (avoid double-removal)
  if (markerGroupRef.current) {
    try { markerGroupRef.current.removeAll(); } catch (_) {}
    // only remove if it’s still on the map
    const stillOnMap = map.getObjects().includes(markerGroupRef.current);
    if (stillOnMap) {
      try { map.removeObject(markerGroupRef.current); } catch (_) {}
    }
    markerGroupRef.current = null;
  }

  // 4) remove remaining polylines/strays (be selective to avoid double work)
  map.getObjects().forEach(obj => {
    if (obj instanceof window.H.map.Polyline || obj instanceof window.H.map.DomMarker) {
      try { map.removeObject(obj); } catch (_) {}
    }
  });

  currentLineGeom.current = null;

  // 5) recenter
  map.getViewModel().setLookAtData({
    position: { lat: 44.4268, lng: 26.1025 },
    zoom: 6
  });
};

  const [selectedSegmentByIndex, setSelectedSegmentByIndex] = useState({});

  // când lista de rute se schimbă, resetăm selecțiile
  useEffect(() => {
    setSelectedSegmentByIndex({});
  }, [routes]);

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

  // live preview while dragging: use all vias on the leg, ordered along the leg
  const debouncedLive = debounce(async (legIdx, lat, lng, excludeViaId = null) => {
    if (!addresses[legIdx] || !addresses[legIdx + 1]) return;

    // existing vias on this leg (with their saved positions)
    const base = viaPointsRef.current
      .filter(p => p.legIndex === legIdx && p.id !== excludeViaId)
      .map(p => ({ lat: p.lat, lng: p.lng, pos: p.pos ?? projectOnLeg(legIdx, p.lat, p.lng) }));

    // the moving point (transient)
    const moving = (lat != null && lng != null)
      ? [{ lat, lng, pos: projectOnLeg(legIdx, lat, lng) }]
      : [];

    // order by pos → just lat/lng for the API
    const viaArray = [...base, ...moving]
      .sort((a,b)=>a.pos - b.pos)
      .map(v => ({ lat: v.lat, lng: v.lng }));

    const handle = await calculateAndDisplayLiveRoute(
      mapRef.current,
      addresses[legIdx],
      viaArray,
      addresses[legIdx + 1],
      vehicleType,
      process.env.REACT_APP_HERE_API_KEY,
      legIdx
    );

    const prev = liveOverlaysRef.current.get(legIdx);
    if (prev && typeof prev.remove === 'function') prev.remove();
    liveOverlaysRef.current.set(legIdx, handle);
  }, 50);

  const renderLiveForLeg = async (legIdx) => {
    if (!addresses[legIdx] || !addresses[legIdx + 1]) return;

    const viaArray = viaPointsRef.current
      .filter(p => p.legIndex === legIdx)
      .map(p => ({ lat: p.lat, lng: p.lng, pos: p.pos ?? projectOnLeg(legIdx, p.lat, p.lng) }))
      .sort((a,b)=>a.pos - b.pos)
      .map(v => ({ lat: v.lat, lng: v.lng }));

    const handle = await calculateAndDisplayLiveRoute(
      mapRef.current,
      addresses[legIdx],
      viaArray,
      addresses[legIdx + 1],
      vehicleType,
      process.env.REACT_APP_HERE_API_KEY,
      legIdx
    );

    const prev = liveOverlaysRef.current.get(legIdx);
    if (prev && typeof prev.remove === 'function') prev.remove();
    liveOverlaysRef.current.set(legIdx, handle);
  };

  //compute total wall-clock seconds (driving + breaks) once per render
  const secWithBreaks = rawDuration != null
    ? addLegalBreaks(rawDuration)
    : 0;

  const showPricePerDay = vehicleType.pricePerDay != null;
  const days = Math.ceil(rawDuration / 86400);
  const dayCost = showPricePerDay
    ? days * vehicleType.pricePerDay
    : 0;


  const formatName = (email = "") => {
    const local = email.split("@")[0];            // "robert.balacescu"
    const parts = local.split(".");                // ["robert","balacescu"]
    return parts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");                                  // ["Robert","Balacescu"] → "Robert Balacescu"
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    navigate('/login');
  };

  const token = localStorage.getItem('token');
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


      const newRoute = {
        team_id: profile.team_id,
        created_by: user.id,
        date: new Date().toISOString(),
        identifier,
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

      alert('Route saved ✔️');
      setHasCalculated(false);
      resetRouteState();
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

    setAddresses(prev => [
      ...prev,
      { 
        ...coordsWithLabel,
        postal: code || "",
        country: countryCode, 
        city,
      }
    ]);
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
  const removeAddress = (index) => {
    const newArr = [...addresses];
    newArr.splice(index, 1);
    setAddresses(newArr);
    if (newArr.length === 0) {
      resetRouteState();
    }
  };

  // Obținere rute
const getRoute = async (pts = addresses) => {
  setIsLoading(true);

  try {
  // Build waypoints and insert all vias sorted by position on that leg
  const combined = [];
  pts.forEach((addr, idx) => {
    combined.push(addr);
    viaPoints
      .filter(p => p.legIndex === idx)
      .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))   // ← ensure start→end order
      .forEach(p => combined.push({ lat: p.lat, lng: p.lng }));
  });
    const waypoints = combined;
    // ③ Now waypoints = [start, …vias…, end]
    const origin      = waypoints[0];
    const destination = waypoints[waypoints.length - 1];

    let url = `https://router.hereapi.com/v8/routes?apikey=${process.env.REACT_APP_HERE_API_KEY}`;
    url += `&origin=${origin.lat},${origin.lng}`;

    // ④ Add each “via” (everything except first & last)
    waypoints.slice(1, -1).forEach(pt => {
      url += `&via=${pt.lat},${pt.lng}`;
    });

    url += `&destination=${destination.lat},${destination.lng}`;
    // return what we need
    url += `&return=polyline,summary,actions,instructions,tolls`;
    url += `&alternatives=3`;

    // truck profile
    url += `&transportMode=truck`;
    url += `&vehicle[weightPerAxle]=11500`;
    url += `&vehicle[height]=400`;
    url += `&vehicle[width]=255`;
    url += `&vehicle[length]=1875`;
    url += `&truck[axleCount]=${vehicleType.axles}`;
    url += `&vehicle[grossWeight]=${vehicleType.weight}`;
    url += `&truck[limitedWeight]=7500`;
    url += `&tolls[emissionType]=euro6`;

    

    // 2️⃣ Fetch & parse
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.error("No routes found:", data);
      alert("No routes found. Try different points.");
      return;
    }

    // 3️⃣ Sort by raw duration
    const sorted = data.routes
      .map(route => ({
        route,
        duration: route.sections.reduce((sum, s) => sum + (s.summary?.duration || 0), 0)
      }))
      .sort((a, b) => a.duration - b.duration)
      .map(item => item.route);

    // 4️⃣ Initialize state
    setRoutes(sorted);
    setRouteTaxCosts(Array(sorted.length).fill(0));
    setTollCosts(Array(sorted.length).fill({ totalCost: 0, tollList: [] }));
    setSelectedRouteIndex(0);

    // 5️⃣ Render the fastest one on the map
    displayRoute(sorted[0]);
    setMapHint("spawn");


    // 6️⃣ Extract summary for the first route
    const first = sorted[0];
    let totalDist = 0;
    let totalDur = 0;
    first.sections.forEach(sec => {
      if (sec.summary) {
        totalDist += sec.summary.length;
        totalDur  += sec.summary.duration;
      }
    });
    setDistance((totalDist / 1000).toFixed(2));
    setRawDistance(totalDist);
    setRawDuration(totalDur);

    const breaks = addLegalBreaks(totalDur);
    const h = Math.floor(breaks / 3600);
    const m = Math.floor((breaks % 3600) / 60);
    setDurationWithBreaks(`${h}h ${m}m`);

    const hh = Math.floor(totalDur / 3600);
    const mm = Math.floor((totalDur % 3600) / 60);
    setDuration(`${hh}h ${mm}m`);

    setActiveTab("results");

  } catch (err) {
    console.error("Error fetching route:", err);
    alert("Error calculating route. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

  // Split the full route.sections into N−1 “legs” (one per interval between stops)
  const buildLegs = (routeSections) => {
    const stops = addresses.length;
    const total = routeSections.length;
    const per = Math.floor(total / (stops - 1));
    const legs = [];
    for (let i = 0; i < stops - 1; i++) {
      const start = i * per;
      // last leg takes any remainder
      const end = (i === stops - 2) ? total : (i + 1) * per;
      legs.push(routeSections.slice(start, end));
    }
    return legs;
  };

  // Afișare rută pe hartă
const displayRoute = (route) => {
  if (!mapRef.current) return;
  const map = mapRef.current;

  // remove any existing live previews
for (const h of liveOverlaysRef.current.values()) {
  if (h && typeof h.remove === 'function') h.remove();
}
liveOverlaysRef.current.clear();
placedViaStackRef.current = [];
pendingViaRef.current = null;
setPendingLeg(null);
setUndoCount(0);



  // 1) clear old polylines & via-markers
  map.getObjects().forEach(obj => {
    if (obj instanceof window.H.map.Polyline) {
      map.removeObject(obj);
    }
  });

  viaMarkersRef.current.forEach(m => map.removeObject(m));
  viaMarkersRef.current = [];

const spawnViaMarker = (lat, lng, legIdx) => {
  if (!mapRef.current) return;
  const map = mapRef.current;

  const el = document.createElement('div');
  el.className = 'via-handle';
  el.style.cursor = 'grab';
  el.style.touchAction = 'none';

  const icon = new window.H.map.DomIcon(el, { volatility: true });
  const marker = new window.H.map.DomMarker({ lat, lng }, { icon, volatility: true });
  marker.__viaId = null; // will be set on drop
  map.addObject(marker);
  viaMarkersRef.current.push(marker);

  setMapHint("drag");
  
  let dragging = false;

  const onDown = (evt) => {
    evt.stopPropagation();
    dragging = true;
    el.style.cursor = 'grabbing';
    if (behaviorRef.current) {
    behaviorRef.current.disable(window.H.mapevents.Behavior.DRAGGING);
    }
    pendingViaRef.current = { marker, legIdx, onMove, onUp };
    setPendingLeg(legIdx);
    setMapHint(null);
  };

  const onMove = (evt) => {
    if (!dragging) return;
    const { viewportX, viewportY } = evt.currentPointer;
    const geo = map.screenToGeo(viewportX, viewportY);
    marker.setGeometry(geo);
    debouncedLive(legIdx, geo.lat, geo.lng, marker.__viaId || null);
  };

  const onUp = async () => {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = 'grab';
    if (behaviorRef.current) {
      behaviorRef.current.enable(window.H.mapevents.Behavior.DRAGGING);
    }
    debouncedLive.flush();

    const { lat: finalLat, lng: finalLng } = marker.getGeometry();
    const pos = projectOnLeg(legIdx, finalLat, finalLng); // ← position along leg
    const postal = await fetchPostalCode(finalLat, finalLng);

    if (marker.__viaId) {
      const id = marker.__viaId;
      setViaPoints(prev =>
        prev.map(p =>
          p.id === id ? { ...p, lat: finalLat, lng: finalLng, postal, pos } : p
        )
      );
    } else {
      const newId = ++viaIdRef.current;
      marker.__viaId = newId;

      setViaPoints(prev => [
        ...prev,
        { id: newId, lat: finalLat, lng: finalLng, postal, legIndex: legIdx, pos }
      ]);

      placedViaStackRef.current = [
        ...placedViaStackRef.current,
        { id: newId, legIdx, marker },
      ];
      setUndoCount(placedViaStackRef.current.length);
    }

    if (pendingViaRef.current?.marker === marker) pendingViaRef.current = null;
    setPendingLeg(null);

    // redraw preview using sorted vias
    renderLiveForLeg(legIdx);
  };

  marker.addEventListener('pointerdown', onDown);
  map.addEventListener('pointermove', onMove);
  map.addEventListener('pointerup', onUp);

  marker.addEventListener('remove', () => {
    map.removeEventListener('pointermove', onMove);
    map.removeEventListener('pointerup', onUp);

    if (marker.__viaId) {
      const id = marker.__viaId;

      // drop from stack and state
      placedViaStackRef.current = placedViaStackRef.current.filter(e => e.id !== id);
      setViaPoints(prev => prev.filter(p => p.id !== id));
      setUndoCount(placedViaStackRef.current.length);

      // redraw the live preview for this leg (might become empty)
      renderLiveForLeg(legIdx);
    }

    // ensure we don't keep dangling pending refs
    if (pendingViaRef.current?.marker === marker) pendingViaRef.current = null;
  });
};

  // 2) draw the route polyline
  const fullLineString = new window.H.geo.LineString();

  const legs = buildLegs(route.sections);
  legs.forEach((legSections, legIdx) => {
    // stitch together this leg’s sections into one LineString
    const ls = new window.H.geo.LineString();
    legSections.forEach(sec => {
      const part = window.H.geo.LineString.fromFlexiblePolyline(sec.polyline);
      const arr = part.getLatLngAltArray();
      for (let i = 0; i < arr.length; i += 3) {
        ls.pushLatLngAlt(arr[i], arr[i+1], arr[i+2]);
      }
    });

    // cache leg vertices + cumulative distance for ordering vias
    const raw = ls.getLatLngAltArray();
    const pts = [];
    for (let i = 0; i < raw.length; i += 3) {
      pts.push({ lat: raw[i], lng: raw[i + 1] });
    }
    legGeomsRef.current[legIdx] = buildLegCumulative(pts);

    // draw the leg
    const legPolyline = new window.H.map.Polyline(ls, {
      style: { strokeColor: 'blue', lineWidth: 4 }
    });
    // tapping any leg sets viaLegIndex and drops a via-marker
    legPolyline.addEventListener('pointerdown', (evt) => {
      const btn = evt.originalEvent && typeof evt.originalEvent.button === 'number'
        ? evt.originalEvent.button
        : 0; // left by default
      if (btn !== 0 && btn !== 2) return;

      const { lat, lng } = map.screenToGeo(
        evt.currentPointer.viewportX,
        evt.currentPointer.viewportY
      );
      spawnViaMarker(lat, lng, legIdx);
    });
    map.addObject(legPolyline);
  });

  currentLineGeom.current = fullLineString;

  // 3) re-center map
  const bounds = fullLineString.getBoundingBox();
  if (bounds) {
    map.getViewModel().setLookAtData({ bounds });
  }
};

  // Selectare rută
  const handleRouteSelect = (index) => {
    setSelectedRouteIndex(index);
    displayRoute(routes[index]);
    setMapHint("spawn");
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
  apiCallCount++;
  try {
    await getRoute(coords);
    setHasCalculated(true);
  } finally {
    setIsLoading(false);
  }
};

  // 3) Callback - când TollCalculator calculează costul pt o rută, îl salvăm și într-un array numeric simplu routeTaxCosts, și în tollCosts (pt listă).
  const updateTollCostForRoute = (index, tollData) => {

    // actualizăm array-ul numeric
    setRouteTaxCosts((prev) => {
      const newArr = [...prev];
      newArr[index] = tollData.totalCost || 0;
      return newArr;
    });

    // actualizăm array-ul complet
    setTollCosts((prev) => {
      const newArr = [...prev];
      newArr[index] = tollData; // { totalCost, tollList, duration }
      return newArr;
    });
  };
  
  useEffect(() => {
    if (mapRef.current) return; 
  
    const platform = new window.H.service.Platform({
      apikey: process.env.REACT_APP_HERE_API_KEY,
    });
    const defaultLayers = platform.createDefaultLayers();
    const map = new window.H.Map(
      document.getElementById("mapContainer"),
      defaultLayers.vector.normal.map,
      { zoom: 6, center: { lat: 44.4268, lng: 26.1025 } }
    );

    map.getElement().addEventListener('contextmenu', e => e.preventDefault());
    
    // Important: initialize behavior & UI
    const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
    behaviorRef.current = behavior;
    // 👇 Force-init mapevents by toggling behavior quickly
setTimeout(() => {
  behavior.disable(window.H.mapevents.Behavior.DRAGGING);
  behavior.enable(window.H.mapevents.Behavior.DRAGGING);
}, 50); // short delay to let HERE fully bind event listeners

    const ui = window.H.ui.UI.createDefault(map, defaultLayers);
  
    // Important: asigurăm vector base layer activ
    const mapSettings = ui.getControl('mapsettings');
  
    mapRef.current = map;
    
    setTimeout(() => {
      map.getViewPort().resize();
    }, 0);
  
    window.addEventListener("resize", () => map.getViewPort().resize());
    return () => {
      window.removeEventListener("resize", () => map.getViewPort().resize());
    };
  }, [tollCosts, selectedRouteIndex]);
  
  // cost per km pt ruta selectată
  const costPerKmForSelected = () => {
    if (selectedRouteIndex === null || routes.length === 0) return 0;
    const { costPerKm } = computeRouteMetrics(routes[selectedRouteIndex]);
    return costPerKm;
  };

  useEffect(() => {
    if (!mapRef.current) return;
    if (addresses.length === 0) return;
  
    if (markerGroupRef.current) {
      mapRef.current.removeObject(markerGroupRef.current);
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
    
      // Fix: asigurăm că dimensiunea DOM-ului e gata
      document.body.appendChild(el);
      const { offsetWidth, offsetHeight } = el;
      document.body.removeChild(el);

      el.style.marginLeft = `-${offsetWidth/2}px`;   // center horizontally
      el.style.marginTop  = `0px`;                   // pin the TOP edge at the geo point

      const domIcon = new window.H.map.DomIcon(el);
    
      const marker = new window.H.map.DomMarker(
        { lat: pt.lat, lng: pt.lng },
        { icon: domIcon, volatility: false }
      );
      marker.__domElement = el;
      group.addObject(marker);
    });
    
  
    mapRef.current.addObject(group);
    markerGroupRef.current = group;
  }, [addresses, mapRef.current]);
  
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

  // ▶︎ new effect: once routes arrive, pick the fastest by total duration
  useEffect(() => {
    if (routes.length === 0) return;

    // Calculate each route’s total travel time (in seconds)
    const durations = routes.map(r =>
      r.sections.reduce((sum, s) => sum + (s.summary?.duration || 0), 0)
    );

    // Find the index of the shortest one
    const fastestIdx = durations.indexOf(Math.min(...durations));

    // Only switch if it’s a different route
    if (fastestIdx !== selectedRouteIndex) {
      setSelectedRouteIndex(fastestIdx);
      displayRoute(routes[fastestIdx]);
    }
  }, [routes]);  // Re-run whenever the routes array changes

  // close dropdown when clicking outside of the arrow button
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;

      const map = mapRef.current;
      if (!map) return;

      // 1️⃣ cancel a drag-in-progress
      const pending = pendingViaRef.current;
      if (pending) {
        if (pending.onMove) map.removeEventListener('pointermove', pending.onMove);
        if (pending.onUp)   map.removeEventListener('pointerup', pending.onUp);

        map.removeObject(pending.marker);
        viaMarkersRef.current = viaMarkersRef.current.filter(m => m !== pending.marker);

        const h = liveOverlaysRef.current.get(pending.legIdx);
        if (h && typeof h.remove === 'function') h.remove();
        liveOverlaysRef.current.delete(pending.legIdx);

        if (behaviorRef.current) {
          behaviorRef.current.enable(window.H.mapevents.Behavior.DRAGGING);
        }
        placedViaStackRef.current = placedViaStackRef.current.filter(e => e.marker !== pending.marker);
        pendingViaRef.current = null;
        return;
      }

      // 2️⃣ undo last placed via (only one item)
      const stack = placedViaStackRef.current;
      if (stack.length) {
        const { id, legIdx, marker } = stack.pop();

        // remove marker from map + local refs
        map.removeObject(marker);
        viaMarkersRef.current = viaMarkersRef.current.filter(m => m !== marker);

        // remove the via point with that id
        const remainingForLeg = viaPointsRef.current.filter(p => !(p.legIndex === legIdx && p.id === id));
        setViaPoints(prev => prev.filter(p => p.id !== id));
        setUndoCount(placedViaStackRef.current.length);
        if (placedViaStackRef.current.length === 0) {
          setMapHint("spawn"); // ⬅️ show hint again when none remain
        }

        // update preview for that leg:
        const stillHasVias = remainingForLeg.some(p => p.legIndex === legIdx);
        if (stillHasVias) {
          // redraw preview with remaining vias
          renderLiveForLeg(legIdx);
        } else {
          // no vias left → remove live overlay for this leg
          const h = liveOverlaysRef.current.get(legIdx);
          if (h && typeof h.remove === 'function') h.remove();
          liveOverlaysRef.current.delete(legIdx);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);



  // return (
  // <div className="App flex flex-col h-screen">
  //   <div className={`flex flex-col flex-1 transition-colors duration-500 ${darkMode ? 'bg-gray-900 ' : 'bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800'}`}>
  //     <DebugMouseOverlay />
  //   <Header user = {user} />
  //    {/* MAIN CONTENT */}
  //     {/*<div className="flex flex-row flex-1 overflow-hidden">*/}
  //     <div
  //       className="
  //         flex flex-row flex-1 overflow-hidden min-h-screen transition-colors
  //         bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800
  //         dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
  //       "
  //     >

  //       {/* LEFT SIDE */}
  //       <div className="bg-burgundy-200 w-1/2 p-4 overflow-auto space-y-4">
  //         {/* ROW 1: Address + Vehicle */}
  //         <div className="flex space-x-4">
  //           <div className="w-1/2 bg-white p-4 rounded shadow-sm ring-2 ring-red-300 hover:ring-red-500 transition ">
  //             <h2 className="text-lg font-bold mb-2">Address</h2>
  //             <form onSubmit={handleSubmit} className="flex flex-col gap-3">
  //               <div >
  //                 <label className="block mb-1 font-medium shadow-sm text-semibold text-gray-700">Enter the address:</label>
  //                   <div className="w-full rounded bg-gray-1000 ring-2 ring-red-300 focus-within:ring-red-500 transition">
  //                     <AutoCompleteInput
  //                       apiKey={process.env.REACT_APP_HERE_API_KEY}
  //                       value={addressQuery}                 // ← control the text
  //                       onChange={setAddressQuery}           // ← update as user types
  //                       onSelect={(picked) => {              // ← when a suggestion is chosen
  //                         addAddress(picked);
  //                         setAddressQuery("");               // ← clear the box
  //                       }}
  //                       className="w-full p-2 bg-red-50 border-none focus:outline-none"
  //                     />
  //                   </div>
  //               </div>
  //               {addresses.length === 0 && <p className="text-sm text-gray-500">No address entered.</p>}
  //               {/* …inside your render… */}
  //               <ul className="border rounded p-2 max-h-40 overflow-y-auto space-y-1">
  //                 {addresses.map((pt, index) => {
  //                   // 1. Split the original label into comma-parts:
  //                   const parts = pt.label.split(",").map(s => s.trim());
  //                   // 2. Extract & remove the trailing country name:
  //                   const countryName = parts.pop();
  //                   // 3. Derive a 2-letter country code (override via pt.country if you set it):
  //                   const countryCode = (pt.country || countryName.slice(0,2)).toUpperCase();
  //                   // 4. Ensure we have a postal code (fallback to “—” if lookup failed):
  //                   const postal = pt.postal || "";
  //                   // 5. If the very first element equals that postal, drop it:
  //                   if (parts[0] === postal) parts.shift();
  //                   // 6. Join the rest back into the “address” chunk:
  //                   const addressOnly = parts.join(", ");
  //                   // 7. Compose the final display string:
  //                   let display = ""
  //                   if(postal === ""){
  //                     display = `${addressOnly}, ${countryName}`;
  //                   } else {
  //                     display = `${countryCode}-${postal} ${addressOnly}`;
  //                   }

  //                   return (
  //                     <li key={index} className="flex justify-between items-center">
  //                       <div className="text-sm text-black-800">{display}</div>
  //                       <div className="flex gap-2">
  //                         <button
  //                           type="button"
  //                           onClick={() => moveUp(index)}
  //                           className="text-xs text-red-600 hover:underline"
  //                         >Up</button>
  //                         <button
  //                           type="button"
  //                           onClick={() => moveDown(index)}
  //                           className="text-xs text-red-600 hover:underline"
  //                         >Down</button>
  //                         <button
  //                           type="button"
  //                           onClick={() => removeAddress(index)}
  //                           className="text-xs text-red-600 hover:underline"
  //                         >X</button>
  //                       </div>
  //                     </li>
  //                   );
  //                 })}
  //               </ul>

  //               <button
  //                 type="submit"
  //                 disabled={isLoading}
  //                 className={`mt-3 ${isLoading ? "bg-red-400" : "bg-red-600 hover:bg-red-700"} text-white py-2 px-4 rounded font-semibold text-sm transition-colors`}
  //               >
  //                 {isLoading ? "Calculating..." : (hasCalculated ? "Update route" : "Calculate route")}
  //               </button>
  //             </form>
  //           </div>
  //           <div className="w-1/2 bg-white p-4 rounded shadow-sm ring-2 ring-red-300 hover:ring-red-500 transition">
  //             <div className="flex justify-between items-center mb-2">
  //               <h2 className="text-lg font-bold">Vehicle Parameters</h2>
  //               <label className="inline-flex items-center text-sm">
  //                 <input
  //                   type="checkbox"
  //                   className="form-checkbox mr-2"
  //                   checked={allIn}
  //                   onChange={e => setAllIn(e.target.checked)}
  //                 />
  //                 Fixed cost
  //               </label>
  //             </div>
  //             <div className="grid grid-cols-1 gap-2">
  //               <div>
  //                 <label className="block text-sm font-bold mb-1">Number of axles</label> 
  //                 <input
  //                   type="number"
  //                   name="axles"
  //                   value={vehicleType.axles ?? ""}
  //                   onChange={(e) => {
  //                     const value = parseFloat(e.target.value);
  //                     setVehicleType((prev) => ({ ...prev, axles: isNaN(value) ? prev.axles : value }));
  //                   }}
  //                   min="2"
  //                   max="10"
  //                   className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus-within:ring-red-500 transition"
  //                 />
  //               </div>
  //               <div>
  //                 <label className="block text-sm font-bold mb-1">Tonnage (kg)</label>
  //                 <input
  //                   type="number"
  //                   name="weight"
  //                   value={vehicleType.weight ?? ""}
  //                   onChange={(e) => {
  //                     const value = parseFloat(e.target.value);
  //                     setVehicleType((prev) => ({ ...prev, weight: isNaN(value) ? prev.weight : value }));
  //                   }}
  //                   min="1000"
  //                   max="60000"
  //                   className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus-within:ring-red-500 transition"
  //                 />
  //               </div>
  //                {!allIn ? (
  //                  <div>
  //                    <label className="block text-sm font-bold mb-1">Euro/km</label>
  //                    <input
  //                      type="number"
  //                      inputMode="decimal"
  //                      step="0.01"
  //                      name="EuroPerKm"
  //                      value={vehicleType.EuroPerKm ?? ""}
  //                      onChange={e => {
  //                        const raw = e.target.value.trim().replace(',', '.')
  //                        const parsed = parseFloat(raw)
  //                        setVehicleType(v => ({
  //                          ...v,
  //                          EuroPerKm: isNaN(parsed) ? v.EuroPerKm : parsed
  //                        }))
  //                      }}
  //                      min="0"
  //                      max="10"
  //                      className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus-within:ring-red-500 transition"
  //                    />
  //                  </div>
  //                ) : (
  //                  <div>
  //                    <label className="block text-sm font-bold mb-1">Total Cost (EUR)</label>
  //                    <input
  //                      type="number"
  //                      step="0.01"
  //                      value={fixedTotalCost ?? ""}
  //                      onChange={e => setFixedTotalCost(e.target.value)}
  //                      className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus-within:ring-red-500 transition"
  //                    />
  //                  </div>
  //                )}
  //               <div>
  //                 {/* ROW 4: Buton salvare ruta */}
  //                 {isManager && (
  //                   <div className="flex gap-4 items-end">
  //                     {/* Truck Plate Select */}
  //                     <div className="flex-1">
  //                       <label className="block text-sm font-bold mb-1">Truck Plate</label>
  //                       <select
  //                         className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus:ring-red-500 transition"
  //                         value={plate}
  //                         required
  //                         onChange={e => setPlate(e.target.value)}
  //                       >
  //                         <option value="" disabled>
  //                           Select your truck
  //                         </option>
  //                         {trucks.map(t => (
  //                           <option key={t.id} value={t.id}>
  //                             {t.plate}
  //                           </option>
  //                         ))}
  //                       </select>
  //                     </div>

  //                     {/* Tour Identifier */}
  //                     <div className="flex-1">
  //                       <label className="block text-sm font-bold mb-1">Tour Number</label>
  //                       <input
  //                         className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus:ring-red-500 transition"
  //                         placeholder="unique ID"
  //                         value={identifier}
  //                         onChange={e => setIdentifier(e.target.value)}
  //                         required
  //                       />
  //                     </div>

  //                     {/* Save Route Button */}
  //                     <div>
  //                       <button
  //                         onClick={handleSaveRoute}
  //                         className="bg-green-600 text-white font-bold px-4 py-2 rounded shadow hover:bg-green-700 transition"
  //                       >
  //                         Save Route
  //                       </button>
  //                     </div>
  //                   </div>
  //                 )}

  //                 {isManager && saveMsg && (
  //                   <p className="text-sm text-gray-700 italic mt-1">{saveMsg}</p>
  //                 )}

  //               </div>
  //             </div>
  //           </div>
  //         </div>

  //         {/* ROW 2: Alternative Routes */}
  //         {routes.length > 0 && (
  //           <div className="w-full bg-white p-4 rounded shadow-sm ring-2 ring-red-300 hover:ring-red-500 transition">
  //             <h2 className="text-md font-semibold mb-2">Alternative Routes</h2>
  //             <table className="min-w-full text-sm border border-red-200">
  //               <thead>
  //                 <tr className="bg-red-50">
  //                   <th className="px-3 py-2 border">Route</th>
  //                   <th className="px-3 py-2 border">Distance (km)</th>
  //                   <th className="px-3 py-2 border">Segment distances</th>
  //                   <th className="px-3 py-2 border">Time</th>
  //                   {!allIn && (
  //                     <th className="px-3 py-2 border">Price per Km (EUR)</th>
  //                   )}
  //                   <th className="px-3 py-2 border">Tolls (EUR)</th>
  //                   {showPricePerDay && (
  //                     <th className="px-3 py-2 border">Price / Day</th>
  //                   )}
  //                   <th className="px-3 py-2 border">Total Cost (EUR)</th>
  //                 </tr>
  //               </thead>
  //               <tbody>
  //                 {routes.map((rt, index) => {
  //                   const { totalDuration, km, costPerKm } = computeRouteMetrics(rt);
  //                   const hours = Math.floor(totalDuration/3600);
  //                   const minutes = Math.floor((totalDuration%3600)/60);
  //                   const displayTime = `${hours}h ${minutes}m`;
  //                   const routeTax = routeTaxCosts[index]||0;
  //                   const totalCost = allIn
  //                     ? parseFloat(fixedTotalCost || 0)
  //                     : costPerKm + routeTax + dayCost;

  //                   const segs = getSegmentsForRoute(rt);
  //                   // valoarea selectată pentru rândul curent
  //                   const selected = selectedSegmentByIndex[index] ?? (segs[0]?.key || "");

  //                   return (
  //                     <tr key={index} className={`cursor-pointer ${selectedRouteIndex===index?"bg-red-50":""} hover:bg-red-50`} onClick={()=>handleRouteSelect(index)}>
  //                       <td className="px-3 py-2 border text-center">Route {index+1}</td>
  //                       <td className="px-3 py-2 border text-center">{km}</td>
  //                       <td className="px-3 py-2 border text-center">
  //                         {segs.length > 0 ? (
  //                           <select
  //                             className="border rounded px-2 py-1 w-full"
  //                             value={selected}
  //                             onChange={(e) =>
  //                               setSelectedSegmentByIndex((s) => ({
  //                                 ...s,
  //                                 [index]: e.target.value,
  //                               }))
  //                             }
  //                           >
  //                             {segs.map((s) => (
  //                               <option key={s.key} value={s.key}>
  //                                 {s.display}
  //                               </option>
  //                             ))}
  //                           </select>
  //                         ) : (
  //                           <span>-</span>
  //                         )}
  //                       </td>
  //                       <td className="px-3 py-2 border text-center">{displayTime}</td>
  //                       {!allIn && <td className="px-3 py-2 border text-center">{formatNum(costPerKm)}</td>}
  //                       <td className="px-3 py-2 border text-center">{formatNum(routeTax)}</td>
  //                       {showPricePerDay && (<td className="px-3 py-2 border text-center"> {formatNum(vehicleType.pricePerDay)}</td>)}
  //                       <td className="px-3 py-2 border text-center">{formatNum(totalCost)}</td>
  //                     </tr>
  //                   );
  //                 })}
  //               </tbody>
  //             </table>
  //           </div>
  //         )}


  //         {/* ROW 3: List of aggregated costs + Route Results */}
  //         {routes.length > 0 && (
  //           <div className="flex space-x-4">
  //             <div className="w-1/2 bg-white p-4 rounded shadow-sm ring-2 ring-red-300 hover:ring-red-500 transition">
  //               <h3 className="text-md font-semibold mb-2">List of aggregated costs</h3>
  //               {tollCosts[selectedRouteIndex] &&
  //               tollCosts[selectedRouteIndex].tollList &&
  //               tollCosts[selectedRouteIndex].tollList.length > 0 ? (
  //                 <ul className="space-y-1 text-sm text-black-700 max-h-40 overflow-y-auto">
  //                   {tollCosts[selectedRouteIndex].tollList.map((toll, idx) => (
  //                     <li key={idx} className={`px-2 py-1 ${idx % 2 === 0 ? "bg-white" : "bg-red-100"}`}>
  //                       {toll.name} - {toll.country}: {toll.cost.toFixed(2)} {toll.currency || "EUR"}
  //                     </li>
  //                   ))}
  //                 </ul>
  //               ) : (
  //                 <p className="text-gray-500">Loading toll costs...</p>
  //               )}
  //             </div>

  //             <div className="w-1/2 bg-white p-4 rounded shadow-sm ring-2 ring-red-300 hover:ring-red-500 transition">
  //               <h3 className="text-md font-semibold mb-2">Route Results</h3>
  //               {distance ? (
  //                 <>
  //                   <p className="text-sm text-gray-700">
  //                     <strong>Distance:</strong> {distance} km
  //                   </p>
  //                   <p className="text-sm text-gray-700 flex items-center">
  //                     <strong>Total trip time:</strong>&nbsp;{durationWithBreaks}
  //                     <span
  //                       className="ml-1 cursor-help text-blue-500"
  //                       title={`Includes ${((secWithBreaks - rawDuration)/3600).toFixed(2)} hours breaks` }
  //                     >ⓘ</span>
  //                   </p>
  //                   {!allIn && (
  //                   <p className="text-sm text-gray-700">
  //                     <strong>Price per Km:</strong>{" "}
  //                     {formatNum(Number(distance) * vehicleType.EuroPerKm)} EUR
  //                   </p>
  //                   )}
  //                   <p className="text-sm text-gray-700">
  //                     <strong>Tolls:</strong> {formatNum(routeTaxCosts[selectedRouteIndex] || 0)} EUR
  //                   </p>
  //                   {showPricePerDay && (
  //                     <p className="text-sm text-gray-700">
  //                       <strong>Days × Rate:</strong> {days} d × {formatNum(vehicleType.pricePerDay)} = {formatNum(dayCost)} EUR
  //                     </p>
  //                   )}
  //                   <p className="text-sm text-gray-700 font-semibold">
  //                     <strong>Total Cost:</strong>{" "}
  //                     {formatNum(
  //                       allIn
  //                       ? Number(fixedTotalCost || 0)
  //                       : costPerKmForSelected() + (routeTaxCosts[selectedRouteIndex] || 0) + dayCost
  //                     )} EUR
  //                   </p>
  //                 </>
  //               ) : (
  //                 <p className="text-gray-500">There are no results available.</p>
  //               )}
  //             </div>
  //           </div>
  //         )}
  //       </div>

  //       {/* RIGHT SIDE - MAP */}
  //       <div
  //         id="mapContainer"
  //         className="w-1/2 h-full relative overflow-hidden"
  //       >
  //         {(pendingLeg !== null || undoCount > 0) && (
  //           <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
  //             <div className="px-3 py-2 rounded-xl shadow-lg bg-black/70 text-white text-xs sm:text-sm font-medium flex items-center gap-2">
  //               <span className="inline-block w-5 h-5 rounded-md bg-white/15 grid place-items-center">⎋</span>
  //               {pendingLeg !== null ? (
  //                 <span>Drag to adjust. <b>Esc</b> cancels.</span>
  //               ) : (
  //                 <span>Press <b>Esc</b> to undo last via ({undoCount}).</span>
  //               )}
  //             </div>
  //           </div>
  //         )}
  //         {/* Hints for spawn / drag */}
  //         {mapHint === "spawn" && (
  //           <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[999]">
  //             <div className="px-3 py-2 rounded-xl shadow-lg bg-black/70 text-white text-xs sm:text-sm font-medium">
  //               <b>Left-click</b> the route to spawn a via marker.
  //             </div>
  //           </div>
  //         )}

  //         {mapHint === "drag" && (
  //           <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[999]">
  //             <div className="px-3 py-2 rounded-xl shadow-lg bg-black/70 text-white text-xs sm:text-sm font-medium">
  //               Use <b>Right Mouse Button</b> to drag the marker.
  //             </div>
  //           </div>
  //         )}
  //       </div>
  //     </div>

  //     {/* FOOTER */}
  //     <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500">
  //       © 2025 Rossik Route Calculation
  //     </footer>

  //     {/* Montăm un TollCalculator (invizibil) pentru fiecare rută */}
  //     <div style={{ display: "none" }}>
  //       {routes.map((route, index) => (
  //         <TollCalculator
  //           key={index}
  //           routeIndex={index}
  //           startCoordinates={addresses.length >= 2 ? addresses[0] : null}
  //           endCoordinates={addresses.length >= 2 ? addresses[addresses.length - 1] : null}
  //           intermediatePoints={addresses.length > 2 ? addresses.slice(1, addresses.length - 1) : []}
  //           vehicleType={vehicleType}
  //           rawDuration={rawDuration}
  //           rawDistance={rawDistance}
  //           selectedRoute={route}
  //           onTollUpdate={(tollData) => updateTollCostForRoute(index, tollData)}
  //         />
  //       ))}
  //     </div>
  //   </div>
  //   </div>
  // );
  
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
            flex flex-row flex-1 overflow-hidden min-h-screen transition-colors
            bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800
            dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
          "
        >

          {/* LEFT SIDE */}
          <div className="bg-burgundy-200 w-1/2 p-4 overflow-auto space-y-4">
            {/* ROW 1: Address + Vehicle */}
            <div className="flex space-x-4">
              <div className="w-1/2 bg-white dark:bg-gray-800/70 p-4 rounded shadow-sm ring-2 ring-red-300 dark:ring-white/10 hover:ring-red-500 transition ">
                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Address</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div >
                    <label className="block mb-1 font-medium shadow-sm text-semibold text-gray-700 dark:text-gray-300">Enter the address:</label>
                      <div className="w-full rounded bg-gray-1000 ring-2 ring-red-300 focus-within:ring-red-500 transition">
                        <AutoCompleteInput
                          apiKey={process.env.REACT_APP_HERE_API_KEY}
                          value={addressQuery}
                          onChange={setAddressQuery}
                          onSelect={(picked) => {
                            addAddress(picked);
                            setAddressQuery("");
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

                      return (
                        <li key={index} className="flex justify-between items-center">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{display}</div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => moveUp(index)}
                              className="text-xs text-red-600 hover:underline"
                            >Up</button>
                            <button
                              type="button"
                              onClick={() => moveDown(index)}
                              className="text-xs text-red-600 hover:underline"
                            >Down</button>
                            <button
                              type="button"
                              onClick={() => removeAddress(index)}
                              className="text-xs text-red-600 hover:underline"
                            >X</button>
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
              <div className="w-1/2 bg-white dark:bg-gray-800/70 p-4 rounded shadow-sm ring-2 ring-red-300 dark:ring-white/10 hover:ring-red-500 transition">
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
                            Save Route
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
                <h2 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">Alternative Routes</h2>
                <table className="min-w-full text-sm border border-red-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-100">
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
                    {routes.map((rt, index) => {
                      const { totalDuration, km, costPerKm } = computeRouteMetrics(rt);
                      const hours = Math.floor(totalDuration/3600);
                      const minutes = Math.floor((totalDuration%3600)/60);
                      const displayTime = `${hours}h ${minutes}m`;
                      const routeTax = routeTaxCosts[index]||0;
                      const totalCost = allIn
                        ? parseFloat(fixedTotalCost || 0)
                        : costPerKm + routeTax + dayCost;

                      const segs = getSegmentsForRoute(rt);
                      const selected = selectedSegmentByIndex[index] ?? (segs[0]?.key || "");

                      return (
                        <tr
                          key={index}
                          className={`cursor-pointer ${selectedRouteIndex===index?"bg-red-50 dark:bg-gray-900/40":""} hover:bg-red-50 dark:hover:bg-gray-800`}
                          onClick={()=>handleRouteSelect(index)}
                        >
                          <td className="px-3 py-2 border dark:border-gray-700 text-center">Route {index+1}</td>
                          <td className="px-3 py-2 border dark:border-gray-700 text-center">{km}</td>
                          <td className="px-3 py-2 border dark:border-gray-700 text-center">
                            {segs.length > 0 ? (
                              <select
                                className="border dark:border-gray-600 rounded px-2 py-1 w-full bg-white dark:bg-gray-700 dark:text-gray-100"
                                value={selected}
                                onChange={(e) =>
                                  setSelectedSegmentByIndex((s) => ({
                                    ...s,
                                    [index]: e.target.value,
                                  }))
                                }
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
                          {!allIn && <td className="px-3 py-2 border dark:border-gray-700 text-center">{formatNum(costPerKm)}</td>}
                          <td className="px-3 py-2 border dark:border-gray-700 text-center">{formatNum(routeTax)}</td>
                          {showPricePerDay && (<td className="px-3 py-2 border dark:border-gray-700 text-center"> {formatNum(vehicleType.pricePerDay)}</td>)}
                          <td className="px-3 py-2 border dark:border-gray-700 text-center">{formatNum(totalCost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
            id="mapContainer"
            className="w-1/2 h-full relative overflow-hidden"
          >
            {(pendingLeg !== null || undoCount > 0) && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
                <div className="px-3 py-2 rounded-xl shadow-lg bg-black/70 text-white text-xs sm:text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-5 h-5 rounded-md bg-white/15 grid place-items-center">⎋</span>
                  {pendingLeg !== null ? (
                    <span>Drag to adjust. <b>Esc</b> cancels.</span>
                  ) : (
                    <span>Press <b>Esc</b> to undo last via ({undoCount}).</span>
                  )}
                </div>
              </div>
            )}
            {/* Hints for spawn / drag */}
            {mapHint === "spawn" && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[999]">
                <div className="px-3 py-2 rounded-xl shadow-lg bg-black/70 text-white text-xs sm:text-sm font-medium">
                  <b>Left-click</b> the route to spawn a via marker.
                </div>
              </div>
            )}

            {mapHint === "drag" && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[999]">
                <div className="px-3 py-2 rounded-xl shadow-lg bg-black/70 text-white text-xs sm:text-sm font-medium">
                  Use <b>Right Mouse Button</b> to drag the marker.
                </div>
              </div>
            )}
          </div>
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
in the future: possible to have multiple via stations per leg
vedem daca putem modifica ANUMITE toll-uri dupa nume/contractele noastre (mont blanc, frejous, euro tunelul franta-regatul unit )
*/
