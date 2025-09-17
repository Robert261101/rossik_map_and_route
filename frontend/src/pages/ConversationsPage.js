// src/ConversationsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/header';

export default function ConversationsPage({ user }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const loadingRef = useRef(false);

  // helpers
  const upsertById = (arr, row) => {
    const i = arr.findIndex(r => r.id === row.id);
    if (i === -1) return [row, ...arr];
    const next = arr.slice();
    next[i] = { ...next[i], ...row };
    return next;
  };

  const addOrUpdatePlate = (convid, plate) => {
    setRows(curr => curr.map(r =>
      r.id === convid ? { ...r, truck_plate: plate } : r
    ));
  };

  const fmt = (ts) => (ts ? new Date(ts).toLocaleString() : '—');

  const onClose = async (id) => {
    const { error } = await supabase
      .from('wa_conversation')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setRows(curr => curr.map(r => (r.id === id ? { ...r, status: 'closed' } : r)));
    } else {
      console.error('Close failed:', error);
      alert('Failed to close conversation');
    }
  };

  // 1) initial load
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    (async () => {
      // A) conversations
      const { data: convs, error: convErr } = await supabase
        .from('wa_conversation')
        .select('id, id, phone, status, started_at, updated_at, route_id, routes(identifier)')
        .order('started_at', { ascending: false });

      if (convErr) {
        console.error(convErr);
        setRows([]);
        loadingRef.current = false;
        return;
      }

      const base = (convs || []).map(c => ({
        id: c.id,
        id: c.id,
        phone: c.phone,
        status: c.status,
        started_at: c.started_at,
        updated_at: c.updated_at,
        route_identifier: c.routes?.identifier ?? null,
        truck_plate: null, // filled next
      }));

      setRows(base);

      // B) latest plate per conversation
      const convids = base.map(b => b.id);
      if (convids.length) {
        const { data: plates, error: plateErr } = await supabase
          .from('wa_checklist')
          .select('conversation_id, value, updated_at')
          .eq('step_key', 'plate_number')
          .in('conversation_id', convids)
          .order('updated_at', { ascending: false });

        if (!plateErr && plates?.length) {
          const latestPlateByConv = new Map();
          for (const p of plates) {
            if (!latestPlateByConv.has(p.conversation_id)) {
              latestPlateByConv.set(p.conversation_id, p.value);
            }
          }
          setRows(curr =>
            curr.map(r => ({
              ...r,
              truck_plate: latestPlateByConv.get(r.id) ?? r.truck_plate,
            }))
          );
        }
      }

      loadingRef.current = false;
    })();
  }, []);

  // 2) realtime—conversations
  useEffect(() => {
    const ch1 = supabase
      .channel('conv-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wa_conversation' },
        (payload) => {
          const c = payload.new || payload.old;
          if (!c) return;

          const shaped = {
            id: c.id,
            id: c.id,
            phone: c.phone,
            status: c.status,
            started_at: c.started_at,
            updated_at: c.updated_at,
            route_identifier: null,
          };

          if (c.route_id) {
            supabase
              .from('routes')
              .select('identifier')
              .eq('id', c.route_id)
              .single()
              .then(({ data }) => {
                setRows(curr =>
                  upsertById(curr, { ...shaped, route_identifier: data?.identifier ?? null })
                );
              });
          } else {
            setRows(curr => upsertById(curr, shaped));
          }
        }
      )
      .subscribe();

    // 3) realtime—plates
    const ch2 = supabase
      .channel('plate-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wa_checklist' },
        (payload) => {
          const row = payload.new || payload.old;
          if (!row || row.step_key !== 'plate_number') return;
          const val = payload.new?.value ?? row.value ?? null;
          addOrUpdatePlate(row.conversation_id, val);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, []);

  // 4) filter
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r => {
      const plate = (r.truck_plate || '').toLowerCase();
      const route = (r.route_identifier || '').toLowerCase();
      const phone = (r.phone || '').toLowerCase();
      const status = (r.status || '').toLowerCase();
      return plate.includes(needle) || route.includes(needle) || phone.includes(needle) || status.includes(needle);
    });
  }, [q, rows]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header user={user} />

      <div className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <h1 className="text-xl font-semibold">WhatsApp Conversations</h1>
          <input
            className="border rounded px-3 py-2 w-72"
            placeholder="Search plate / route / phone / status…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        <div className="overflow-auto">
          <table className="min-w-full border bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 border text-left">Truck (Plate)</th>
                <th className="px-3 py-2 border text-left">Route</th>
                <th className="px-3 py-2 border text-left">Phone</th>
                <th className="px-3 py-2 border text-left">Status</th>
                <th className="px-3 py-2 border text-left">Started At</th>
                <th className="px-3 py-2 border w-32"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border">{r.truck_plate || '—'}</td>
                  <td className="px-3 py-2 border">{r.route_identifier || '—'}</td>
                  <td className="px-3 py-2 border">{r.phone}</td>
                  <td className="px-3 py-2 border">
                    <span className={r.status === 'open' ? 'text-green-700' : 'text-gray-600'}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 border">{fmt(r.started_at)}</td>
                  <td className="px-3 py-2 border">
                    <div className="flex items-center justify-between space-x-2">
                    {r.status === 'open' ? 
                      <button
                        onClick={() => onClose(r.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm rounded px-3 py-1"
                      >
                        Close
                      </button>
                        : null}
                    <button
                        // onClick={() => onClose(r.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm mx-auto rounded w-full px-3 py-1"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                    No conversations
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
