// src/HistoryPage.js
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function HistoryPage({ user }) {
  const navigate = useNavigate();
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const mapRef = useRef(null);
  const mapVisible = Boolean(selectedId);
  const isLeadOrAdmin = ['team_lead','admin'].includes(user.role);
  const rowsToShow = selectedId
    ? savedRoutes.filter(r => r.id === selectedId)
    : savedRoutes;

  // TODO2: afisarea de harta pe history AND admin can only delete stuff if he's part of team
  
  // 1️⃣ Load your routes + truck plates + HERE 'sections'
  useEffect(() => {
    (async () => {
      const { data: profile } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .single();
      const raw = await fetch('/api/routes', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        }
      });
      const routes = await raw.json();

      setSavedRoutes(routes.map(r => ({
        ...r,
        truck_plate: r.trucks?.plate,
        created_by_email: r.users?.username || 'unknown'
      })));
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

    // Fit to all segment bounds
    const lines = map.getObjects().filter(o => o instanceof window.H.map.Polyline);
    let bbox = lines[0].getBoundingBox();
    lines.slice(1).forEach(p => { bbox = bbox.merge(p.getBoundingBox()); });
    map.getViewModel().setLookAtData({ bounds: bbox });

    // bump the zoom in one notch for a tighter view
    const currentZoom = map.getZoom();
    map.getViewModel().setLookAtData({ zoom: currentZoom + 1 });

    // ensure it redraws after the container animates open
    setTimeout(() => map.getViewPort().resize(), 100);
  }, [mapVisible, selectedId, savedRoutes]);

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

  console.log("Current user:", user);
  console.log("User role:", user.role);
  console.log("isLeadOrAdmin:", isLeadOrAdmin);

  return (
    <div className="App flex flex-col h-screen">
      {/* HEADER */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Saved Route History</h1>
        <div className="flex space-x-2">
          {user.role === 'admin' && (
            <>
              <button
                onClick={() => navigate('/admin')}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Panou Admin
              </button>
              <button
                onClick={() => navigate('/admin/teams')}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Vezi Echipe
              </button>
            </>
          )}
          <button onClick={() => navigate('/')} className="bg-red-600 text-white px-3 py-1 rounded">
            Main Page
          </button>
          <button onClick={() => navigate('/history')} className="bg-red-600 text-white px-3 py-1 rounded">
            History
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
          >
            Log out
          </button>
          <div className="text-lg font-semibold text-gray-800">
            {user.email
              .split('@')[0]
              .replace('.', ' ')
              .replace(/\b\w/g, c => c.toUpperCase())}
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex flex-col flex-1">
        {/* TABLE */}
        <div id="historyTableContainer" className="flex-none overflow-auto p-4">
          <table className="min-w-full border">
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
                <th className="px-3 py-2 border">All Fees</th>
                <th className="px-3 py-2 border"></th>
              </tr>
            </thead>
            <tbody>
              {savedRoutes.map(rt => {
                const km        = rt.distance_km.toFixed(2);
                const dur       = rt.duration;
                const epkm      = rt.euro_per_km.toFixed(2);
                const toll      = rt.toll_cost.toFixed(2);
                const routeCost = (rt.distance_km * rt.euro_per_km).toFixed(2);
                const tot       = rt.total_cost.toFixed(2);
                const feesList  = Array.isArray(rt.tolls)
                  ? rt.tolls.map(t => `${t.name} (${t.country}): €${t.cost.toFixed(2)}`).join(', ')
                  : '';
                const savedBy = rt.created_by_email || 'Unknown';


                return (
                  <tr
                    key={rt.id}
                    onClick={() => handleSelect(rt.id)}
                    className={`cursor-pointer ${selectedId===rt.id?'bg-red-50':''} hover:bg-gray-100`}
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
                      <button className="ml-2 text-xs text-red-600" onClick={e => toggleExpand(rt.id, e)}>
                        ▼
                      </button>
                      {expandedIds.includes(rt.id) && (
                        <ul className="mt-1 text-sm bg-gray-50 p-2 rounded shadow">
                          {rt.addresses.map((a,i) => <li key={i}>{i+1}. {a.label}</li>)}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-2 border">{feesList}</td>
                    <td className="px-3 py-2 border text-center flex space-x-2">
                      {isLeadOrAdmin && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            // TODO: open edit form/modal for rt.id
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                        >
                          Edit
                        </button>
                      )}
                      {isLeadOrAdmin && (
                        <button
                          onClick={async e => {
                            e.stopPropagation();
                            if (!window.confirm('Delete this route?')) return;

                            const token = localStorage.getItem('token');
                            if (!token) {
                              alert('No auth token—please log in again');
                              return;
                            }

                            try {
                              const res = await fetch(
                                `http://localhost:4000/api/routes/${rt.id}`,
                                {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                  }
                                }
                              );

                              console.log('DELETE status:', res.status);
                              const body = await res.json().catch(() => null);
                              console.log('DELETE body:', body);

                              if (!res.ok) {
                                const msg = body?.error || body?.message || res.statusText;
                                alert('Delete failed: ' + msg);
                                return;
                              }

                              // remove from state so it disappears from the table
                              setSavedRoutes(curr => curr.filter(r => r.id !== rt.id));

                            } catch (err) {
                              console.error('Delete exception:', err);
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
          className={`w-full ${mapVisible?'flex-1':'h-0'} overflow-hidden transition-[height] duration-300`}
        />
      </div>
    </div>
  );
}
