// src/HistoryPage.js
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchBar from './helpers/SearchBar';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import RossikLogo from '../VektorLogo_Rossik_rot.gif';
import { Link } from 'react-router-dom';
import { formatNum } from '../utils/number';
import RouteDetailsModal from '../components/RouteDetailsModal';
import { addLegalBreaks } from '../utils/driverTime';
import { exportRoutesExcel } from './helpers/exportRoutesExcel';
import Header from '../components/header';
import ConversationViewer from '../components/ConversationViewer';


export default function HistoryPage({ user }) {
  const navigate = useNavigate();
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const mapRef = useRef(null);
  const mapVisible = Boolean(selectedId);
  const isLeadOrAdmin = ['team_lead','admin'].includes(user.role);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const normalize = str => str.toLowerCase().replace(/\s+/g, '');
  const filterQuery = params.get('filter') || '';
  const normalizedQuery = normalize(filterQuery);

  const [modalOpenId, setModalOpenId] = useState(null);
  const [activeConvo, setActiveConvo] = useState(null);
  const [convByRoute, setConvByRoute] = useState(new Map());
  const [convByPlate, setConvByPlate] = useState(new Map());

  const openModal = id => setModalOpenId(id);
  const closeModal = () => setModalOpenId(null);

  const filteredRoutes = savedRoutes.filter(route => {
    const normalizedIdentifier = normalize(route.identifier);
    const normalizedTruckPlate = normalize(route.truck_plate || '');

    return (
      normalizedIdentifier.includes(normalizedQuery) ||
      normalizedTruckPlate.includes(normalizedQuery)
    );
  });

  const rowsToShow = selectedId
    ? savedRoutes.filter(r => r.id === selectedId)
    : (filterQuery ? filteredRoutes : savedRoutes)
  
  const [darkMode, setDarkMode] = React.useState(false);
  // 1️⃣ Load your routes + truck plates + HERE 'sections'
  useEffect(() => {
    (async () => {
      try {
        // Get user's team_id first from 'users' table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;

        // Fetch routes directly from Supabase, filtering by team_id if you want
        const { data: routes, error: routesError } = await supabase
          .from('routes')
          .select('*, trucks(plate,price_per_day), users(username)')  // join trucks and users for related fields
          .eq('team_id', profile.team_id)
          .order('created_at', { ascending: false });

        if (routesError) throw routesError;

        setSavedRoutes(routes.map(r => ({
          ...r,
          truck_plate: r.trucks?.plate,
          created_by_email: r.users?.username || 'unknown',
          pricePerDay:    r.trucks?.price_per_day ?? null
        })));

        // build lists to look up convos by route_id_text or truck_plate
        const identifiers = routes.map(r => r.identifier).filter(Boolean);
        const plates      = routes.map(r => r.trucks?.plate).filter(Boolean);

        // fetch by route identifiers
        let all = [];
        if (identifiers.length) {
          const { data, error } = await supabase
            .from('wa_conversation')
            .select('id, phone, status, updated_at, route_id_text, truck_plate, started_at')
            .in('route_id_text', identifiers);
          if (error) console.error(error);
          if (data) all = all.concat(data);
        }

        // fetch by plates
        if (plates.length) {
          const { data, error } = await supabase
            .from('wa_conversation')
            .select('id, phone, status, updated_at, route_id_text, truck_plate, started_at')
            .in('truck_plate', plates);
          if (error) console.error(error);
          if (data) all = all.concat(data);
        }

        // index: prefer OPEN; else latest by updated_at
        const byRoute = new Map();
        const byPlate = new Map();

        for (const c of all) {
          if (c.route_id_text) {
            const prev = byRoute.get(c.route_id_text);
            if (!prev ||
                (prev.status !== 'open' && c.status === 'open') ||
                new Date(c.updated_at) > new Date(prev.updated_at)) {
              byRoute.set(c.route_id_text, c);
            }
          }
          if (c.truck_plate) {
            const prev = byPlate.get(c.truck_plate);
            if (!prev ||
                (prev.status !== 'open' && c.status === 'open') ||
                new Date(c.updated_at) > new Date(prev.updated_at)) {
              byPlate.set(c.truck_plate, c);
            }
          }
        }

        setConvByRoute(byRoute);
        setConvByPlate(byPlate);

      } catch (error) {
        console.error('Error fetching routes:', error);
        setSavedRoutes([]);
      }
    })();
  }, [user]);


  // 2️⃣ One‐time HERE map init
  useEffect(() => {
    if (mapRef.current) return;
    const platform = new window.H.service.Platform({
      apikey: process.env.REACT_APP_HERE_API_KEY
    });
    const layers = platform.createDefaultLayers();
    const map = new window.H.Map(
      document.getElementById('historyMapContainer'),
      layers.vector.normal.map,
      { zoom: 6, center: { lat: 44.4268, lng: 26.1025 } }
    );
    new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
    window.H.ui.UI.createDefault(map, layers);
    mapRef.current = map;
  }, []);

  // 3️⃣ When selection changes: clear, draw & zoom
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old polylines
    map.getObjects()
      .filter(o => o instanceof window.H.map.Polyline)
      .forEach(o => map.removeObject(o));

    if (!mapVisible) return;

    const rt = savedRoutes.find(r => r.id === selectedId);
    if (!rt?.sections) return;

    rt.sections.forEach(section => {
      const lineString = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
      const poly = new window.H.map.Polyline(lineString, {
        style: { strokeColor: 'red', lineWidth: 4 }
      });
      map.addObject(poly);
    });

    // manually compute the union of all polyline bounds
    let minLat = Infinity, minLng = Infinity;
    let maxLat = -Infinity, maxLng = -Infinity;

    // pull out the selected route
    const route = savedRoutes.find(r => r.id === selectedId);
    if (route?.sections) {
      route.sections.forEach(section => {
        const ls = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
        const coords = ls.getLatLngAltArray();
        for (let i = 0; i < coords.length; i += 3) {
          const lat = coords[i], lng = coords[i+1];
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        }
      });

      if (minLat < Infinity) {
        // fit the map to that bounding box
        const rect = new window.H.geo.Rect(minLat, minLng, maxLat, maxLng);
        map.getViewModel().setLookAtData({ bounds: rect });
      }
    }

    // bump the zoom in one notch for a tighter view
    const currentZoom = map.getZoom();
    map.getViewModel().setLookAtData({ zoom: currentZoom });

    // ensure it redraws after the container animates open
    setTimeout(() => map.getViewPort().resize(), 100);
  }, [mapVisible, selectedId, savedRoutes, expandedIds]);

  // Scroll table up & show only selected row
  const handleSelect = id => {
    setSelectedId(cur => (cur === id ? null : id));
    setTimeout(() => {
      const tbl = document.getElementById('historyTableContainer');
      if (tbl) tbl.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

async function openConvoForRoute(rt) {
  // Try prefetched best match first
  const bestPref =
    (rt.identifier && convByRoute.get(rt.identifier)) ||
    (rt.truck_plate && convByPlate.get(rt.truck_plate));

  if (bestPref) {
    setActiveConvo({
      id: bestPref.id,
      phone: bestPref.phone,
      status: bestPref.status,
      started_at: bestPref.started_at,
      updated_at: bestPref.updated_at,
      route_identifier: bestPref.route_id_text || null,
      truck_plate: bestPref.truck_plate || null,
    });
    return;
  }

  // Fallback: live lookup by OR (identifier/plate)
  const filters = [];
  if (rt.identifier)  filters.push(`route_id_text.eq.${rt.identifier}`);
  if (rt.truck_plate) filters.push(`truck_plate.eq.${rt.truck_plate}`);
  if (!filters.length) {
    alert('No route identifier or truck plate on this row to match conversations.');
    return;
  }

  const { data: allMatches, error } = await supabase
    .from('wa_conversation')
    .select('id, phone, status, started_at, updated_at, route_id_text, truck_plate')
    .or(filters.join(','))
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Convo lookup failed:', error);
    alert('Could not look up conversations for this route.');
    return;
  }
  if (!allMatches?.length) {
    alert('No conversation found for this route / truck yet.');
    return;
  }

  const best = allMatches.find(c => c.status === 'open') || allMatches[0];
  setActiveConvo({
    id: best.id,
    phone: best.phone,
    status: best.status,
    started_at: best.started_at,
    updated_at: best.updated_at,
    route_identifier: best.route_id_text || null,
    truck_plate: best.truck_plate || null,
  });
}

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedIds(curr =>
      curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Actualizează poziția tabelului pentru hartă
  useEffect(() => {
    const updateTablePosition = () => {
      const table = document.getElementById('historyTableContainer');
      if (table) {
        const rect = table.getBoundingClientRect();
        document.documentElement.style.setProperty(
          '--table-bottom', 
          `${rect.bottom}px`
        );
        // Forțează redimensionarea hărții
        if (mapRef.current) {
          setTimeout(() => mapRef.current.getViewPort().resize(), 100);
        }
      }
    };

    // Actualizează la încărcare inițială
    updateTablePosition();

    // Adaugă event listener pentru resize
    window.addEventListener('resize', updateTablePosition);
    
    // Curăță event listener la unmount
    return () => window.removeEventListener('resize', updateTablePosition);
  }, [savedRoutes, expandedIds, selectedId]); // Adăugăm expandedIds la dependencies

  //TODO2: edit button on history

  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800'}`}>
      <Header user = {user} />
      {/* Top toolbar */}
      <div className="p-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Routes History</h1>
        <SearchBar savedRoutes={savedRoutes} />
      </div>
      {/* CONTENT */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* TABLE */}
        <div id="historyTableContainer" className="flex-none overflow-auto p-4">
          <table className="min-w-full border bg-white">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 border">Created By</th>
                <th className="px-3 py-2 border">Date</th>
                <th className="px-3 py-2 border">Identifier</th>
                <th className="px-3 py-2 border">Truck</th>
                <th className="px-3 py-2 border">Distance</th>
                <th className="px-3 py-2 border">Duration</th>
                <th className="px-3 py-2 border">€ / km</th>
                <th className="px-3 py-2 border">Toll</th>
                <th className="px-3 py-2 border">Route Cost</th>
                <th className="px-3 py-2 border">Total</th>
                <th className="px-3 py-2 border">Addresses</th>
                {/* Removed All Fees column */}
                <th className="px-3 py-2 border w-24"></th> {/* Actions column */}
              </tr>
            </thead>

            <tbody>
              {rowsToShow.map(rt => {
                const km        = formatNum(rt.distance_km);
                const dur       = rt.duration;
                // parse "Xh Ym" → total hours
                const [hPart, mPart] = dur.split(' ').map(s => parseInt(s));
                const rawSec    = (hPart || 0) * 3600 + (mPart || 0) * 60;
                // inject legal breaks
                const secWithBreaks = addLegalBreaks(rawSec);
                // format back to "Xh Ym"
                const wbH = Math.floor(secWithBreaks / 3600);
                const wbM = Math.floor((secWithBreaks % 3600) / 60);
                const durWithBreaks = `${wbH}h ${wbM}m`;

                const totalHours     = (hPart || 0) + ((mPart || 0) / 60);
                const days           = Math.ceil(totalHours / 24);
                const epkm      = rt.euro_per_km.toFixed(2);
                const toll      = formatNum(rt.toll_cost);
                const routeCost = formatNum(rt.distance_km * rt.euro_per_km);
                const extra = rt.pricePerDay != null
                                ? days * rt.pricePerDay
                                : 0;
                const tot       = formatNum(rt.total_cost + extra);
                const feesList  = Array.isArray(rt.tolls)
                  ? rt.tolls.map(t => `${t.name} (${t.country}): €${t.cost.toFixed(2)}`).join(', ')
                  : '';
                const savedBy = rt.created_by_email || 'Unknown';

                return (
                  <tr
                    key={rt.id}
                    onClick={() => handleSelect(rt.id)}
                    className={`cursor-pointer ${selectedId === rt.id ? 'bg-red-50' : ''} hover:bg-gray-100`}
                  >
                    <td className="px-3 py-2 border text-center">{savedBy}</td>
                    <td className="px-3 py-2 border text-center">{rt.date}</td>
                    <td className="px-3 py-2 border text-center">{rt.identifier}</td>
                    <td className="px-3 py-2 border text-center">{rt.truck_plate}</td>
                    <td className="px-3 py-2 border text-center">{km}</td>
                    <td className="px-3 py-2 border text-center">
                      {durWithBreaks}
                      <span
                        className="ml-1 cursor-help text-blue-500"
                        title={`Includes ${((secWithBreaks - rawSec)/3600).toFixed(2)} hours of breaks`}
                      >
                        ⓘ
                      </span>
                    </td>
                    <td className="px-3 py-2 border text-center">{epkm}</td>
                    <td className="px-3 py-2 border text-center">{toll}</td>
                    <td className="px-3 py-2 border text-center">{routeCost}</td>
                    <td className="px-3 py-2 border text-center">{tot}</td>
                    <td className="px-3 py-2 border">
                      {rt.addresses[0].label} → {rt.addresses.slice(-1)[0].label}
                      <button
                      //TODO: make it look better/ possibly change functionality to previous method - see "thingy" text file in your notes
                        className="ml-2 text-s text-red-600 underline"
                        onClick={e => { e.stopPropagation(); openModal(rt.id); }}
                      >
                        Details
                      </button>

                      {expandedIds.includes(rt.id) && (
                        <div className="mt-1 text-sm bg-gray-50 p-2 rounded shadow space-y-2">
                          <strong>Addresses:</strong>
                          <ul>
                            {rt.addresses.map((a, i) => (
                              <li key={i}>
                                {i + 1}. {a.label}
                              </li>
                            ))}
                          </ul>

                          {/* Show All Fees here */}
                          {Array.isArray(rt.tolls) && rt.tolls.length > 0 && (
                            <div>
                              <strong>All Fees:</strong>
                              <ul className="list-disc list-inside">
                                {rt.tolls.map((t, i) => (
                                  <li key={i}>
                                    {t.name} ({t.country}): €{t.cost.toFixed(2)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          { rt.pricePerDay != null && (
                            <div className="mt-2">
                              <strong>Extra costs:</strong>
                              <ul className="list-disc list-inside">
                                <li>Price / Day: €{formatNum(rt.pricePerDay)}</li>
                              </ul>
                              <ul className="list-disc list-inside">
                                <li>Days: {days}</li>
                              </ul>
                            </div>
                          ) }
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 border">
                      {isLeadOrAdmin && (
                        <div className="flex items-center justify-between space-x-2">
                          {/* Export on the left, Delete on the right */}
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); openConvoForRoute(rt); }}
                            className="w-24 whitespace-nowrap text-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded px-2 py-1"
                          >
                            Conversation
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              exportRoutesExcel([rt], rt.identifier);
                            }}
                            className="w-24 whitespace-nowrap text-center bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-2 py-1"
                          >
                            Export XLSX
                          </button>
                          <button
                            onClick={async e => {
                              e.stopPropagation();
                              if (!window.confirm('Delete this route?')) return;

                              // pull the real access token from Supabase
                              const {
                                data: { session },
                                error: sessionErr
                              } = await supabase.auth.getSession();
                              if (sessionErr || !session?.access_token) {
                                alert('You must be logged in to delete a route');
                                return;
                              }
                              const token = session.access_token;

                              try {
                                const res = await fetch(`/api/routes/${rt.id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                  }
                                });

                                if (!res.ok) {
                                  const body = await res.json().catch(() => null);
                                  const msg = body?.error || body?.message || res.statusText;
                                  alert('Delete failed: ' + msg);
                                  return;
                                }

                                setSavedRoutes(curr => curr.filter(r => r.id !== rt.id));
                              } catch (err) {
                                alert('Delete failed: ' + err.message);
                              }
                            }}
                            className="w-24 whitespace-nowrap text-center bg-red-600 hover:bg-red-700 text-white text-sm rounded px-2 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>

        {/* Route details popup */}
          {modalOpenId && (() => {
            const rt = savedRoutes.find(r => r.id === modalOpenId);
            if (!rt) return null;
            const [h, m] = rt.duration.split(' ').map(s => parseInt(s));
            const totalHours = (h||0) + ((m||0)/60);
            const days = Math.ceil(totalHours/24);
            const extra = rt.pricePerDay != null ? days * rt.pricePerDay : 0;

            return (
              <RouteDetailsModal
                route={rt}
                days={days}
                extraCost={extra}
                onClose={closeModal}
              />
            );
          })()}
          {activeConvo ? (
            <ConversationViewer
              convo={activeConvo}
              onClose={() => setActiveConvo(null)}
            />
          ) : null}


        {/* MAP DETAIL */}
        <div
          id="historyMapContainer"
          className="fixed inset-x-0 bottom-0"
          style={{ 
            top: 'var(--table-bottom, 100px)',
            display: selectedId ? 'block' : 'none' 
          }}
        />
      </div>
    </div>
  );
}

//TODO: via station edit