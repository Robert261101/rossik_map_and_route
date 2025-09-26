// src/ConversationsPage.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/header';
import ConversationViewer from '../components/ConversationViewer';

// ⬇️ new: shared UI
import AppShell from '../ui/AppShell';
import SectionCard from '../ui/SectionCard';
import { H1 } from '../ui/Typography';
import { Input } from '../ui/Controls';

export default function ConversationsPage({ user }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null); // {id, phone, route_identifier, truck_plate}
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

  async function searchRoutes(term) {
    const { data, error } = await supabase
      .from('routes')
      .select('identifier')
      .ilike('identifier', `%${term}%`)
      .limit(10);
    if (error) throw error;
    return data || [];
  }

  // 1) initial load
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    (async () => {
      // A) conversations
      const { data: convs, error: convErr } = await supabase
        .from('wa_conversation')
        .select('id, phone, status, started_at, updated_at, route_id_text, truck_plate')
        .order('started_at', { ascending: false });

      if (convErr) {
        console.error(convErr);
        setRows([]);
        loadingRef.current = false;
        return;
      }

      const base = (convs || []).map(c => ({
        id: c.id,
        phone: c.phone,
        status: c.status,
        started_at: c.started_at,
        updated_at: c.updated_at,
        route_identifier: c.route_id_text || null,
        truck_plate: c.truck_plate || null,
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
            phone: c.phone,
            status: c.status,
            started_at: c.started_at,
            updated_at: c.updated_at,
            route_identifier: c.route_id_text || null,
            truck_plate: c.truck_plate || null,
          };
          setRows(curr => upsertById(curr, shaped));
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
    <>
<Header user={user} />

<AppShell withLogo={false} className="items-start">
  {/* page gutters so it doesn't hug the viewport edge */}
  <div className="w-full px-4 md:px-6 lg:px-8 mt-6">

    {/* still using the glass card for the header/search */}
    <SectionCard maxWidth="xl">
      <div className="mb-3 flex items-center gap-3">
        <H1 className="!text-3xl !text-left !mb-0">WhatsApp Conversations</H1>
        <Input
          className="w-72"
          placeholder="Search plate / route / phone / status…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
    </SectionCard>

    {/* FULL-WIDTH TABLE (fills the page like before) */}
    <div className="mt-4 w-full overflow-auto rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
      <table className="w-full text-center">
        <thead className="bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300">
          <tr>
            <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-left">Truck (Plate)</th>
            <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-left">Route</th>
            <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-left">Phone</th>
            <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-left">Status</th>
            <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-left">Started At</th>
            <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-left w-32"></th>
          </tr>
        </thead>
        <tbody className="text-gray-800 dark:text-gray-100">
          {filtered.map(r => (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60">
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-700">{r.truck_plate || '—'}</td>
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-700">{r.route_identifier || '—'}</td>
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-700">{r.phone}</td>
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-700">
                <span className={r.status === 'open' ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}>
                  {r.status}
                </span>
              </td>
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-700">{fmt(r.started_at)}</td>
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between gap-2">
                  {r.status === 'open' && (
                    <button
                      onClick={() => onClose(r.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      Close
                    </button>
                  )}
                  <button
                    onClick={() => setActive(r)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-3 py-1 w-full focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    View
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-center text-gray-500 dark:text-gray-300 border border-gray-300 dark:border-gray-700" colSpan={6}>
                No conversations
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {active ? (
      <ConversationViewer convo={active} onClose={() => setActive(null)} />
    ) : null}
  </div>
</AppShell>
    </>
  );
}
