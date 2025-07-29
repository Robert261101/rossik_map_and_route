import React, { useEffect, useRef, useState } from "react";
import 'leaflet/dist/leaflet.css';
import AutoCompleteInput from "../AutoCompleteInput";
import TollCalculator from "../TollCalculator";
import { useNavigate } from 'react-router-dom';
import { supabase } from "../lib/supabase";
import SearchBar from "../helpers/SearchBar";
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import { Link } from "react-router-dom";
import RossikLogo from '../VektorLogo_Rossik_rot.gif';
import { formatNum } from "../utils/number";
import { addLegalBreaks } from "../utils/driverTime";
import { debounce } from 'lodash'
import { calculateAndDisplayLiveRoute } from "./helpers/liveRoute";
import { fetchPostalCode } from "./helpers/reversePostal.js";
import "./App.css";

const MainPage = ({ user })  => {
  const [allIn, setAllIn] = useState(false);
  const [fixedTotalCost, setFixedTotalCost] = useState(''); // only used when allIn===true
  const [activeTab, setActiveTab] = useState("input"); // "input" | "results"
  const [addresses, setAddresses] = useState([]);
  const [viaLocation, setViaLocation] = useState(null);
  const [viaPostal, setViaPostal]     = useState(null);
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

  const viaRef = useRef(null);
  const behaviorRef = useRef(null);
  const currentLineGeom = useRef(null);

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

      setSaveMsg('Route saved ✔️');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveMsg('Save failed: ' + err.message);
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
// always async, always await fetchPostalCode
const addAddress = async (coordsWithLabel) => {
  const code = await fetchPostalCode(coordsWithLabel.lat, coordsWithLabel.lng);
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
      postal: code || "",      // give it something, even if lookup failed
      country: countryCode, 
    }
  ]);
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
  };

  // Obținere rute
  const getRoute = async (pts = addresses) => {    
    setIsLoading(true);
    
    const startCoordinates = pts[0];
    const endCoordinates = pts[pts.length - 1];
    const intermediatePoints = pts.slice(1, pts.length - 1);
    try {
      let url = `https://router.hereapi.com/v8/routes?origin=${startCoordinates.lat},${startCoordinates.lng}`;
      intermediatePoints.forEach((point) => {
        const viaParam = point.radius ? 
          `${point.lat},${point.lng};r=${point.radius}` : 
          `${point.lat},${point.lng}`;
        url += `&via=${point.lat},${point.lng}`;
      });
      url += `&destination=${endCoordinates.lat},${endCoordinates.lng}`;
      url += `&return=polyline,summary,actions,instructions,tolls`;
      url += `&alternatives=3`; // max 3 rute alternative  
      url += `&vehicle[weightPerAxle]=11500`;
      url += `&transportMode=truck`;
      url += `&vehicle[height]=400`;
      url += `&vehicle[width]=255`;
      url += `&vehicle[length]=1875`;
      url += `&truck[axleCount]=${vehicleType.axles}`;
      url += `&vehicle[grossWeight]=${vehicleType.weight}`;
      url += `&truck[limitedWeight]=7500`;
      url += `&tolls[emissionType]=euro6`;
      url += `&apikey=${process.env.REACT_APP_HERE_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();


      if (!data.routes || data.routes.length === 0) {
        console.error("No routes found:", data);
        alert("No routes found for the selected addresses. Try other locations.");
        setIsLoading(false);
        return;
      }


      const rawRoutes = data.routes;

      const withDurations = rawRoutes.map(route => {
        const totalDuration = route.sections
          .reduce((sum, s) => sum + (s.summary?.duration || 0), 0);
        return { route, duration: totalDuration };
      });

      withDurations.sort((a, b) => a.duration - b.duration);

      const sortedRoutes = withDurations.map(({ route }) => route);

      const initialCosts = Array(sortedRoutes.length).fill(0);
      const initialTollLists = Array(sortedRoutes.length).fill({
        totalCost: 0,
        tollList: []
      });

      setRoutes(sortedRoutes);
      setRouteTaxCosts(initialCosts);
      setTollCosts(initialTollLists);
      setSelectedRouteIndex(0);
      displayRoute(sortedRoutes[0]);

      if (data.routes[0].sections && data.routes[0].sections.length > 0) {
        let totalDistance = 0;
        let totalDuration = 0;
        data.routes[0].sections.forEach((section) => {
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
      setActiveTab("results");
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching route:", error);
      alert("An error occurred while calculating the route. Please try again.");
      setIsLoading(false);
    }
  };

  const createDraggableMarker = (pt, idx) => {
  const el = document.createElement('div');
  el.className = 'via-handle';
  el.style.cursor = 'via-handle'

  const icon = new window.H.map.DomIcon(el, { volatility: false });
  const marker = new window.H.map.DomMarker({ lat: pt.lat, lng: pt.lng }, { icon, volatility: false });

  let dragging = false;

  el.addEventListener('pointerdown', (evt) => {
    evt.stopPropagation();
    dragging = true;
    el.style.cursor = 'grabbing';
    behaviorRef.current.disable(window.H.mapevents.Behavior.DRAGGING);
  });

  mapRef.current.addEventListener('pointermove', (evt) => {
    if (!dragging) return;
    const { viewportX, viewportY } = evt.currentPointer;
    const geo = mapRef.current.screenToGeo(viewportX, viewportY);
    marker.setGeometry(geo);
  });

  mapRef.current.addEventListener('pointerup', async () => {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = 'grab';
    behaviorRef.current.enable(window.H.mapevents.Behavior.DRAGGING);

    const newGeo = marker.getGeometry();
    const postal = await fetchPostalCode(newGeo.lat, newGeo.lng);

    // 🧠 Update this address in the list:
    setAddresses((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        lat: newGeo.lat,
        lng: newGeo.lng,
        postal: postal || updated[idx].postal
      };
      return updated;
    });
  });

  return marker;
};


  // Afișare rută pe hartă
const displayRoute = (route) => {
  if (!mapRef.current) return;
  const map = mapRef.current;

  // 1) clear old polylines & via-marker
  map.getObjects().forEach(obj => {
    if (obj instanceof window.H.map.Polyline) {
      map.removeObject(obj);
    }
    if (obj === viaRef.current) {
      try {
        map.removeObject(obj);
      } catch (err) {
        console.warn("Tried removing viaMarker but it was already removed:", err);
      }
    }
  });

  const spawnViaMarker = (lat, lng) => {
  if (!mapRef.current) return;
  const map = mapRef.current;

if (viaRef.current) {
  try {
    map.removeObject(viaRef.current);
  } catch (err) {
    console.warn("Marker cleanup failed:", err);
  }
}

  const el = document.createElement('div');
  el.className = 'via-handle';

  el.addEventListener('pointerenter', () => { el.style.opacity = '0.8'; });
  // el.addEventListener('pointerleave', () => { el.style.opacity = '0'; });

  const icon = new window.H.map.DomIcon(el, { volatility: true });
  const viaMarker = new window.H.map.DomMarker({ lat, lng }, { icon, volatility: true });
  map.addObject(viaMarker);
  console.log("Spawned via-handle marker element:", el);

  viaRef.current = viaMarker;

  let dragging = false;
  let activePointerId = null;


  const debouncedLive = debounce((lat, lng) => {
    calculateAndDisplayLiveRoute(
      map,
      addresses[0],
      addresses[addresses.length - 1],
      vehicleType,
      lat,
      lng,
      process.env.REACT_APP_HERE_API_KEY
    );
  }, 200);

requestAnimationFrame(() => {
  viaMarker.addEventListener('pointerdown', evt => {
    evt.stopPropagation();
    dragging = true;
    el.style.cursor = 'grabbing';

    try {
      if (el.setPointerCapture) {
        el.setPointerCapture(evt.pointerId);
      }
    } catch (err) {
      console.warn('Pointer capture failed:', err);
    }

    behaviorRef.current.disable(window.H.mapevents.Behavior.DRAGGING);
  });
});

  map.addEventListener('pointermove', evt => {
    if (!dragging) return;
    const geo = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
    viaMarker.setGeometry(geo);
    debouncedLive(geo.lat, geo.lng);
  });

  map.addEventListener('pointerup', async evt => {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = 'grab';
try {
  if (el.releasePointerCapture) {
    el.releasePointerCapture(evt.pointerId);
  }
} catch (err) {
  console.warn('Pointer release failed:', err);
}

    behaviorRef.current.enable(window.H.mapevents.Behavior.DRAGGING);
    debouncedLive.flush();

    const geo = viaMarker.getGeometry();
    setViaLocation({ lat: geo.lat, lng: geo.lng });

    const code = await fetchPostalCode(geo.lat, geo.lng);
    setViaPostal(code);
  });
};


  // 2) draw the route polyline
  const fullLineString = new window.H.geo.LineString();
route.sections.forEach(section => {
  const ls = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
  const pts = ls.getLatLngAltArray(); 
  for (let i = 0; i < pts.length; i += 3) {
    fullLineString.pushLatLngAlt(pts[i], pts[i+1], pts[i+2]);
  }

  const polyline = new window.H.map.Polyline(ls, {
    style: { strokeColor: 'blue', lineWidth: 4 }
  });

  // ✨ TAP TO ADD VIA POINT
  polyline.addEventListener('tap', evt => {
    const geo = evt.target.getGeometry().extractPoint(
      Math.floor(evt.target.getGeometry().getPointCount() / 2)
    );
    const screen = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
    spawnViaMarker(screen.lat, screen.lng); // 🔥 defined next
  });

  map.addObject(polyline);
});
  currentLineGeom.current = fullLineString;

  // 3) re-center map
  const bounds = fullLineString.getBoundingBox();
  if (bounds) {
    map.getViewModel().setLookAtData({ bounds });
  }

// 4) skip adding default viaMarker if user hasn't clicked the route yet
if (!viaLocation) return;

  // 6) re-attach drag logic (no snapping!)
  let dragging = false;
  const debouncedLive = debounce((lat, lng) => {
    calculateAndDisplayLiveRoute(
      map,
      addresses[0],
      addresses[addresses.length - 1],
      vehicleType,
      lat,
      lng,
      process.env.REACT_APP_HERE_API_KEY
    );
  }, 200);

  // viaMarker.addEventListener('pointerdown', evt => {
  //   evt.stopPropagation();
  //   dragging = true;
  //   viaEl.style.cursor = 'grabbing';
  //   behaviorRef.current.disable(window.H.mapevents.Behavior.DRAGGING);
  // });

  // map.addEventListener('pointermove', evt => {
  //   if (!dragging) return;
  //   const { viewportX, viewportY } = evt.currentPointer;
  //   const geo = map.screenToGeo(viewportX, viewportY);
  //   viaMarker.setGeometry(geo);
  //   debouncedLive(geo.lat, geo.lng);
  // });

  // map.addEventListener('pointerup', async () => {
  //   if (!dragging) return;
  //   dragging = false;
  //   viaEl.style.cursor = 'grab';
  //   behaviorRef.current.enable(window.H.mapevents.Behavior.DRAGGING);
  //   debouncedLive.flush();

  //   // ↳ save the raw drop coords, no snapping:
  //   const rawGeo = viaMarker.getGeometry();
  //   setViaLocation({ lat: rawGeo.lat, lng: rawGeo.lng });

  //   // ↳ lookup postal
  //   const code = await fetchPostalCode(rawGeo.lat, rawGeo.lng);
  //   setViaPostal(code);
  // });
};




  // Selectare rută
  const handleRouteSelect = (index) => {
    setSelectedRouteIndex(index);
    displayRoute(routes[index]);
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
      alert('Trebuie să adaugi minimum două adrese înainte de calcul.');
      return;
    }
    // If user dragged a via, insert it between start & end
    let coords = [...addresses];
    if (viaLocation) {
      coords = [ coords[0], viaLocation, coords[ coords.length - 1 ] ];
    }
    apiCallCount++;
    await getRoute(coords);
    // setViaLocation(null);
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

  //TODO: VEZI DACA RAMANE COMENTAT SAU IL FOLOSESTI

  // // Zoom-scaler pentru marker-ele DOM
  // useEffect(() => {
  //   if (!mapRef.current) return;
  //   const map = mapRef.current;

  //   const onMapViewChange = () => {
  //     const zoom = map.getZoom();
  //     if (markerGroupRef.current) {
  //       markerGroupRef.current.getObjects().forEach(marker => {
  //         const el = marker.__domElement;
  //         if (el) {
  //           const scale = 0.5 + zoom * 0.1;
  //           el.style.transform = `translate(-50%,-110%) scale(${scale})`;
  //           el.style.pointerEvents = 'auto'; // force it, in case zoom janks it

  //         }
  //       });
  //     }
  //   };
    

  //   map.addEventListener('mapviewchange', onMapViewChange);

  //   return () => {
  //     map.removeEventListener('mapviewchange', onMapViewChange);
  //   };
  // }, []);

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

  return (
  <div className="App flex flex-col h-screen">
    <div className={`flex flex-col flex-1 transition-colors duration-500 ${darkMode ? 'bg-gray-900 ' : 'bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800'}`}>
      
    {/* HEADER */}
    <header className={`top-0 z-30 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
        <div className="max-w-100xl mx-auto px-6 py-5 flex justify-between items-center">
          {/* LEFT: Logo / Titlu */}
           <div className="flex items-center">
            <Link to="/">
              <img
                src={RossikLogo}
                alt="Rossik Logo"
                className="h-12 object-contain cursor-pointer"
              />
            </Link>
          </div>

      {/* <SearchBar /> */}


      <div className="flex items-center space-x-3">
        {/* Butoane nav */}
          {/* <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 rounded hover:bg-white/40 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </button> */}
          <button
              onClick={() => navigate('/spotgo')}
              className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
            >
              SpotGo
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
            >
              Admin Panel
            </button>
          )}
          {(user.role === 'admin' || user.role === 'team_lead') && (
            <button
              onClick={() => navigate('/admin/teams')}
              className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
            >
              Teams
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
          >
            Main Page
          </button>

          <button
            onClick={() => navigate('/history')}
            className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
          >
            History
          </button>
          
          <button
            onClick={handleLogout}
            className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
          >
            Logout
          </button>

        {/* Numele user-ului */}
          <div className="text-xl font-semibold ml-3">
            {formatName(user?.email)}
          </div>
      </div>
    </div>
      
    </header>
     {/* MAIN CONTENT */}
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* LEFT SIDE */}
        <div className="bg-burgundy-200 w-1/2 p-4 overflow-auto space-y-4">
          {/* ROW 1: Address + Vehicle */}
          <div className="flex space-x-4">
            <div className="w-1/2 bg-white p-4 rounded shadow-sm ring-2 ring-red-300 hover:ring-red-500 transition">
              <h2 className="text-lg font-bold mb-2">Address</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div >
                  <label className="block mb-1 font-medium shadow-sm text-semibold text-gray-700">Enter the address:</label>
                    <div className="w-full rounded bg-gray-1000 ring-2 ring-red-300 focus-within:ring-red-500 transition">
                      <AutoCompleteInput
                        apiKey={process.env.REACT_APP_HERE_API_KEY}
                        onSelect={addAddress}
                        className="w-full p-2 bg-red-50 border-none focus:outline-none"
                    />
                    </div>
                </div>
                {addresses.length === 0 && <p className="text-sm text-gray-500">No address entered.</p>}
                {/* …inside your render… */}
                <ul className="border rounded p-2 max-h-40 overflow-y-auto space-y-1">
                  {addresses.map((pt, index) => {
                    // 1. Split the original label into comma-parts:
                    const parts = pt.label.split(",").map(s => s.trim());
                    // 2. Extract & remove the trailing country name:
                    const countryName = parts.pop();
                    // 3. Derive a 2-letter country code (override via pt.country if you set it):
                    const countryCode = (pt.country || countryName.slice(0,2)).toUpperCase();
                    // 4. Ensure we have a postal code (fallback to “—” if lookup failed):
                    const postal = pt.postal || "";
                    // 5. If the very first element equals that postal, drop it:
                    if (parts[0] === postal) parts.shift();
                    // 6. Join the rest back into the “address” chunk:
                    const addressOnly = parts.join(", ");
                    // 7. Compose the final display string:
                    let display = ""
                    if(postal === ""){
                      display = `${addressOnly}, ${countryName}`;
                    } else {
                      display = `${countryCode}-${postal} ${addressOnly}`;
                    }

                    return (
                      <li key={index} className="flex justify-between items-center">
                        <div className="text-sm text-black-800">{display}</div>
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

                {viaLocation && (
                  <div className="mt-2 text-sm text-gray-700">
                    <strong>VIA:</strong>{' '}
                    {viaPostal
                      ? <>postal code – {viaPostal}</>
                      : <>lat: {viaLocation.lat.toFixed(5)}, lng: {viaLocation.lng.toFixed(5)}</>
                    }
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`mt-3 ${isLoading ? "bg-red-400" : "bg-red-600 hover:bg-red-700"} text-white py-2 px-4 rounded font-semibold text-sm transition-colors`}
                >
                  {isLoading ? "Calculare..." : "Calculate route"}
                </button>
              </form>
            </div>
            <div className="w-1/2 bg-white p-4 rounded shadow-sm ring-2 ring-red-300 hover:ring-red-500 transition">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">Vehicle Parameters</h2>
                <label className="inline-flex items-center text-sm">
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
                  <label className="block text-sm font-bold mb-1">Number of axles</label> 
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
                    className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus-within:ring-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Tonnage (kg)</label>
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
                    className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus-within:ring-red-500 transition"
                  />
                </div>
                 {!allIn ? (
                   <div>
                     <label className="block text-sm font-bold mb-1">Euro/km</label>
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
                       className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus-within:ring-red-500 transition"
                     />
                   </div>
                 ) : (
                   <div>
                     <label className="block text-sm font-bold mb-1">Total Cost (EUR)</label>
                     <input
                       type="number"
                       step="0.01"
                       value={fixedTotalCost ?? ""}
                       onChange={e => setFixedTotalCost(e.target.value)}
                       className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus-within:ring-red-500 transition"
                     />
                   </div>
                 )}
                <div>
                  {/* ROW 4: Buton salvare ruta */}
                  {isManager && (
                    <div className="flex gap-4 items-end">
                      {/* Truck Plate Select */}
                      <div className="flex-1">
                        <label className="block text-sm font-bold mb-1">Truck Plate</label>
                        <select
                          className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus:ring-red-500 transition"
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
                        <label className="block text-sm font-bold mb-1">Tour Number</label>
                        <input
                          className="w-full rounded bg-gray-50 ring-2 ring-red-300 focus:ring-red-500 transition"
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
                    <p className="text-sm text-gray-700 italic mt-1">{saveMsg}</p>
                  )}

                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Alternative Routes */}
          {routes.length > 0 && (
            <div className="w-full bg-white p-4 rounded shadow-sm ring-2 ring-red-300 hover:ring-red-500 transition">
              <h2 className="text-md font-semibold mb-2">Alternative Routes</h2>
              <table className="min-w-full text-sm border border-red-200">
                <thead>
                  <tr className="bg-red-50">
                    <th className="px-3 py-2 border">Route</th>
                    <th className="px-3 py-2 border">Distance (km)</th>
                    <th className="px-3 py-2 border">Time</th>
                    {!allIn && (
                      <th className="px-3 py-2 border">Price per Km (EUR)</th>
                    )}
                    <th className="px-3 py-2 border">Tolls (EUR)</th>
                    {showPricePerDay && (
                      <th className="px-3 py-2 border">Price / Day</th>
                    )}
                    <th className="px-3 py-2 border">Total Cost (EUR)</th>
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
                    return (
                      <tr key={index} className={`cursor-pointer ${selectedRouteIndex===index?"bg-red-50":""} hover:bg-red-50`} onClick={()=>handleRouteSelect(index)}>
                        <td className="px-3 py-2 border text-center">Route {index+1}</td>
                        <td className="px-3 py-2 border text-center">{km}</td>
                        <td className="px-3 py-2 border text-center">{displayTime}</td>
                        {!allIn && <td className="px-3 py-2 border text-center">{formatNum(costPerKm)}</td>}
                        <td className="px-3 py-2 border text-center">{formatNum(routeTax)}</td>
                        {showPricePerDay && (<td className="px-3 py-2 border text-center"> {formatNum(vehicleType.pricePerDay)}</td>)}
                        <td className="px-3 py-2 border text-center">{formatNum(totalCost)}</td>
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
              <div className="w-1/2 bg-white p-4 rounded shadow-sm ring-2 ring-red-300 hover:ring-red-500 transition">
                <h3 className="text-md font-semibold mb-2">List of aggregated costs</h3>
                {tollCosts[selectedRouteIndex] &&
                tollCosts[selectedRouteIndex].tollList &&
                tollCosts[selectedRouteIndex].tollList.length > 0 ? (
                  <ul className="space-y-1 text-sm text-black-700 max-h-40 overflow-y-auto">
                    {tollCosts[selectedRouteIndex].tollList.map((toll, idx) => (
                      <li key={idx} className={`px-2 py-1 ${idx % 2 === 0 ? "bg-white" : "bg-red-100"}`}>
                        {toll.name} - {toll.country}: {toll.cost.toFixed(2)} {toll.currency || "EUR"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">Loading toll costs...</p>
                )}
              </div>

              <div className="w-1/2 bg-white p-4 rounded shadow-sm ring-2 ring-red-300 hover:ring-red-500 transition">
                <h3 className="text-md font-semibold mb-2">Route Results</h3>
                {distance ? (
                  <>
                    <p className="text-sm text-gray-700">
                      <strong>Distance:</strong> {distance} km
                    </p>
                    <p className="text-sm text-gray-700 flex items-center">
                      <strong>Total trip time:</strong>&nbsp;{durationWithBreaks}
                      <span
                        className="ml-1 cursor-help text-blue-500"
                        title={`Includes ${((secWithBreaks - rawDuration)/3600).toFixed(2)} hours breaks` }
                      >ⓘ</span>
                    </p>
                    {!allIn && (
                    <p className="text-sm text-gray-700">
                      <strong>Price per Km:</strong>{" "}
                      {formatNum(Number(distance) * vehicleType.EuroPerKm)} EUR
                    </p>
                    )}
                    <p className="text-sm text-gray-700">
                      <strong>Tolls:</strong> {formatNum(routeTaxCosts[selectedRouteIndex] || 0)} EUR
                    </p>
                    {showPricePerDay && (
                      <p className="text-sm text-gray-700">
                        <strong>Days × Rate:</strong> {days} d × {formatNum(vehicleType.pricePerDay)} = {formatNum(dayCost)} EUR
                      </p>
                    )}
                    <p className="text-sm text-gray-700 font-semibold">
                      <strong>Total Cost:</strong>{" "}
                      {formatNum(
                        allIn
                        ? Number(fixedTotalCost || 0)
                        : costPerKmForSelected() + (routeTaxCosts[selectedRouteIndex] || 0) + dayCost
                      )} EUR
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">There are no results available.</p>
                )}
              </div>
            </div>
          )}
        
          {/*{/* ROW 4: Buton salvare ruta 
          {routes.length > 0 && isManager && (
            <div className="mt-4 p-4 border rounded bg-red-50 shadow-sm">
              <h3 className="font-semibold mb-2">Save this route</h3>
              <div className="flex flex-row gap-4 items-end mb-4">

                {/* ← Truck Plate Select 
                <div className="flex-1">
                  <label className="block text-sm">Truck Plate</label>
                  <select
                    className="border p-1 w-full"
                    value={plate}
                    onChange={e => setPlate(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select your truck</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.plate}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tour Number stays the same 
                <div className="flex-1">
                  <label className="block text-sm">Tour Number</label>
                  <input
                    className="border p-1 w-full"
                    placeholder="unique ID"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                  />
                </div>

                <button
                  onClick={handleSaveRoute}
                  className="bg-green-600 text-white px-4 py-2"
                >
                  Save Route
                </button>
              </div>
              {saveMsg && <p className="mt-2 text-sm">{saveMsg}</p>}
            </div>
          )}   */}

        </div>

        {/* RIGHT SIDE - MAP */}
        <div className="w-1/2 h-full" id="mapContainer"></div>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500">
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

//TODO1: check toll calculation and why its different from desktop app

//TODO3: edit via station - not working properly

//TODO4: integrate in translogica

//Ticketing system:
