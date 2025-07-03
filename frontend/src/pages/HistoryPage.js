// src/HistoryPage.js
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchBar from '../helpers/SearchBar';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import RossikLogo from '../VektorLogo_Rossik_rot.gif';
import { Link } from 'react-router-dom';

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
      <header className="top-0 z-50">
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

          <SearchBar savedRoutes={savedRoutes} />

          {/* RIGHT: Butoane */}
          <div className="flex items-center space-x-3">
            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => navigate('/admin')}
                  className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                >
                  Admin Panel
                </button>
                <button
                  onClick={() => navigate('/admin/teams')}
                  className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                >
                  Teams
                </button>
              </>
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
              {user.email
                .split('@')[0]
                .replace('.', ' ')
                .replace(/\b\w/g, c => c.toUpperCase())}
            </div>
          </div>
        </div>
      </header>

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
                <th className="px-3 py-2 border"></th> {/* Actions column */}
              </tr>
            </thead>

            <tbody>
              {rowsToShow.map(rt => {
                const km        = rt.distance_km.toFixed(2);
                const dur       = rt.duration;
                const epkm      = rt.euro_per_km.toFixed(2);
                const toll      = rt.toll_cost.toFixed(2);
                const routeCost = (rt.distance_km * rt.euro_per_km).toFixed(2);
                const extra = rt.pricePerDay != null ? rt.pricePerDay : 0;
                const tot       = (rt.total_cost + extra).toFixed(2);
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
                    <td className="px-3 py-2 border text-center">{dur}</td>
                    <td className="px-3 py-2 border text-center">{epkm}</td>
                    <td className="px-3 py-2 border text-center">{toll}</td>
                    <td className="px-3 py-2 border text-center">{routeCost}</td>
                    <td className="px-3 py-2 border text-center">{tot}</td>
                    <td className="px-3 py-2 border">
                      {rt.addresses[0].label} → {rt.addresses.slice(-1)[0].label}
                      <button
                      //TODO: make it look better/ possibly change functionality to previous method - see "thingy" text file in your notes
                        className="ml-2 text-s text-red-600 underline"
                        onClick={e => {
                          e.stopPropagation();
                          toggleExpand(rt.id, e);
                        }}
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
                                <li>Price / Day: €{rt.pricePerDay.toFixed(2)}</li>
                              </ul>
                            </div>
                          ) }
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 border text-center flex space-x-2">
                      {isLeadOrAdmin && (
                        <button
                          onClick={async e => {
                            e.stopPropagation();
                            if (!window.confirm('Delete this route?')) return;

                            // pull the real access token from the Supabase client
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
                              const res = await fetch(
                                `/api/routes/${rt.id}`,
                                {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                  }
                                }
                              );

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
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>

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