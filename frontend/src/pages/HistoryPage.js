import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchBar from './helpers/SearchBar';
import { formatNum } from '../utils/number';
import RouteDetailsModal from '../components/RouteDetailsModal';
import { addLegalBreaks } from '../utils/driverTime';
import { exportRoutesExcel } from './helpers/exportRoutesExcel';
import Header from '../components/header';
import ConversationViewer from '../components/ConversationViewer';

export default function HistoryPage({ user }) {
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
    : (filterQuery ? filteredRoutes : savedRoutes);

  // 1) Load routes + conversation hints
  useEffect(() => {
    (async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;

        const { data: routes, error: routesError } = await supabase
          .from('routes')
          .select('*, trucks(plate,price_per_day), users(username)')
          .eq('team_id', profile.team_id)
          .order('created_at', { ascending: false });

        if (routesError) throw routesError;

        setSavedRoutes((routes || []).map(r => ({
          ...r,
          truck_plate: r.trucks?.plate,
          created_by_email: r.users?.username || 'unknown',
          pricePerDay: r.trucks?.price_per_day ?? null
        })));

        const identifiers = (routes || []).map(r => r.identifier).filter(Boolean);
        const plates      = (routes || []).map(r => r.trucks?.plate).filter(Boolean);

        let all = [];
        if (identifiers.length) {
          const { data, error } = await supabase
            .from('wa_conversation')
            .select('id, phone, status, updated_at, route_id_text, truck_plate, started_at')
            .in('route_id_text', identifiers);
          if (!error && data) all = all.concat(data);
        }
        if (plates.length) {
          const { data, error } = await supabase
            .from('wa_conversation')
            .select('id, phone, status, updated_at, route_id_text, truck_plate, started_at')
            .in('truck_plate', plates);
          if (!error && data) all = all.concat(data);
        }

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

  // 2) HERE map init (once)
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

  // 3) Draw selected route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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

    let minLat = Infinity, minLng = Infinity;
    let maxLat = -Infinity, maxLng = -Infinity;

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
        const rect = new window.H.geo.Rect(minLat, minLng, maxLat, maxLng);
        map.getViewModel().setLookAtData({ bounds: rect });
      }
    }

    const currentZoom = map.getZoom();
    map.getViewModel().setLookAtData({ zoom: currentZoom });
    setTimeout(() => map.getViewPort().resize(), 100);
  }, [mapVisible, selectedId, savedRoutes, expandedIds]);

  const handleSelect = id => {
    setSelectedId(cur => (cur === id ? null : id));
    setTimeout(() => {
      const tbl = document.getElementById('historyTableContainer');
      if (tbl) tbl.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  async function openConvoForRoute(rt) {
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

  // Keep the table-bottom CSS var in sync for the map’s top edge
  useEffect(() => {
    const updateTablePosition = () => {
      const table = document.getElementById('historyTableContainer');
      if (table) {
        const rect = table.getBoundingClientRect();
        document.documentElement.style.setProperty('--table-bottom', `${rect.bottom}px`);
        if (mapRef.current) {
          setTimeout(() => mapRef.current.getViewPort().resize(), 100);
        }
      }
    };
    updateTablePosition();
    window.addEventListener('resize', updateTablePosition);
    return () => window.removeEventListener('resize', updateTablePosition);
  }, [savedRoutes, expandedIds, selectedId]);

  return (
    <div
      className="
        flex flex-col min-h-screen
        bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800
        dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
      "
    >
      <Header user={user} />

      {/* Top toolbar */}
      <div className="p-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Routes History</h1>
        <SearchBar savedRoutes={savedRoutes} />
      </div>

      {/* CONTENT */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* TABLE */}
        <div id="historyTableContainer" className="flex-none overflow-auto p-4">
          <table
            className="
              w-full table-auto border
              bg-white dark:bg-neutral-900
              border-gray-200 dark:border-neutral-700
              text-gray-800 dark:text-gray-100
              rounded-lg overflow-hidden
            "
          >
            <thead className="bg-gray-50 dark:bg-neutral-800">
              <tr>
                {[
                  'Created By','Date','Identifier','Truck','Distance','Duration',
                  '€ / km','Toll','Route Cost','Total','Addresses',''
                ].map((h, i) => (
                  <th
                    key={i}
                    className="
                      px-3 py-2 border
                      border-gray-200 dark:border-neutral-700
                      text-left font-semibold
                    "
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rowsToShow.map(rt => {
                const km  = formatNum(rt.distance_km);
                const dur = rt.duration;
                const [hPart, mPart] = dur.split(' ').map(s => parseInt(s));
                const rawSec = (hPart || 0) * 3600 + (mPart || 0) * 60;
                const secWithBreaks = addLegalBreaks(rawSec);
                const wbH = Math.floor(secWithBreaks / 3600);
                const wbM = Math.floor((secWithBreaks % 3600) / 60);
                const durWithBreaks = `${wbH}h ${wbM}m`;

                const totalHours = (hPart || 0) + ((mPart || 0) / 60);
                const days       = Math.ceil(totalHours / 24);
                const epkm      = rt.euro_per_km.toFixed(2);
                const toll      = formatNum(rt.toll_cost);
                const routeCost = formatNum(rt.distance_km * rt.euro_per_km);
                const extra     = rt.pricePerDay != null ? days * rt.pricePerDay : 0;
                const tot       = formatNum(rt.total_cost + extra);
                const savedBy   = rt.created_by_email || 'Unknown';

                return (
                  <tr
                    key={rt.id}
                    onClick={() => handleSelect(rt.id)}
                    className={`
                      cursor-pointer
                      hover:bg-gray-100 dark:hover:bg-neutral-800
                      ${selectedId === rt.id ? 'bg-red-50 dark:bg-red-900/20' : ''}
                    `}
                  >
                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700 text-center">{savedBy}</td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700 text-center">{rt.date}</td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700 text-center">{rt.identifier}</td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700 text-center">{rt.truck_plate}</td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700 text-center">{km}</td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700 text-center">
                      {durWithBreaks}
                      <span
                        className="ml-1 cursor-help text-blue-600 dark:text-blue-400"
                        title={`Includes ${((secWithBreaks - rawSec)/3600).toFixed(2)} hours of breaks`}
                      >
                        ⓘ
                      </span>
                    </td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700 text-center">{epkm}</td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700 text-center">{toll}</td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700 text-center">{routeCost}</td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700 text-center">{tot}</td>

                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700">
                      <div className="text-gray-900 dark:text-gray-100">
                        {rt.addresses[0].label} → {rt.addresses.slice(-1)[0].label}
                        <button
                          className="ml-2 text-xs text-red-600 dark:text-red-400 underline"
                          onClick={e => { e.stopPropagation(); openModal(rt.id); }}
                        >
                          Details
                        </button>
                      </div>

                      {expandedIds.includes(rt.id) && (
                        <div
                          className="
                            mt-2 text-sm
                            bg-gray-50 dark:bg-neutral-800/70
                            border border-gray-200 dark:border-neutral-700
                            text-gray-800 dark:text-gray-100
                            p-3 rounded-lg shadow
                            space-y-2
                          "
                        >
                          <strong>Addresses:</strong>
                          <ul className="list-disc list-inside">
                            {rt.addresses.map((a, i) => (
                              <li key={i}>{i + 1}. {a.label}</li>
                            ))}
                          </ul>

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

                          {rt.pricePerDay != null && (
                            <div className="mt-2">
                              <strong>Extra costs:</strong>
                              <ul className="list-disc list-inside">
                                <li>Price / Day: €{formatNum(rt.pricePerDay)}</li>
                                <li>Days: {Math.ceil(((hPart||0)+((mPart||0)/60))/24)}</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 border border-gray-200 dark:border-neutral-700">
                      {isLeadOrAdmin && (
                        <div className="flex items-center justify-between space-x-2">
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); openConvoForRoute(rt); }}
                            className="
                              w-24 whitespace-nowrap text-center
                              bg-emerald-600 hover:bg-emerald-700
                              text-white text-sm rounded px-2 py-1
                              focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                            "
                          >
                            Conversation
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              exportRoutesExcel([rt], rt.identifier);
                            }}
                            className="
                              w-24 whitespace-nowrap text-center
                              bg-blue-600 hover:bg-blue-700
                              text-white text-sm rounded px-2 py-1
                              focus:outline-none focus:ring-2 focus:ring-blue-400/60
                            "
                          >
                            Export XLSX
                          </button>
                          <button
                            onClick={async e => {
                              e.stopPropagation();
                              if (!window.confirm('Delete this route?')) return;

                              const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
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
                            className="
                              w-24 whitespace-nowrap text-center
                              bg-red-600 hover:bg-red-700
                              text-white text-sm rounded px-2 py-1
                              focus:outline-none focus:ring-2 focus:ring-red-400/60
                            "
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
