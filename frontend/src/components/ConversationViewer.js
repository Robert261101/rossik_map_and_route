// src/components/ConversationViewer.jsx
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ConversationViewer({ convo, onClose }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const subRef = useRef(null);

  // fetch history
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_wa_messages')
        .select('id, conversation_id, route_id, created_at, direction, text_body, media_url, media_mime, media_id')
        .eq('conversation_id', convo.id)
        .order('created_at', { ascending: true });

      if (!cancelled) {
        if (error) console.error(error);
        setMsgs(data || []);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [convo.id]);

  // realtime updates (listen to both inbox & outbox for this conversation)
  useEffect(() => {
    const ch = supabase
      .channel(`wa-convo-${convo.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wa_inbox', filter: `conversation_id=eq.${convo.id}` },
        payload => {
          const row = payload.new || payload.old;
          if (!row) return;
          // map inbox -> v_wa_messages shape
          setMsgs(curr => [
            ...curr,
            {
              id: row.id,
              conversation_id: row.conversation_id,
              route_id: row.route_id ?? null,
              created_at: row.created_at ?? new Date().toISOString(),
              direction: 'in', // inbox = from driver
              text_body: row.text_body,
              media_url: row.media_url,
              media_mime: row.media_mime,
              media_id: row.media_id,
            },
          ].sort((a,b) => new Date(a.created_at) - new Date(b.created_at)));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wa_outbox', filter: `conversation_id=eq.${convo.id}` },
        payload => {
          const row = payload.new || payload.old;
          if (!row) return;
          setMsgs(curr => [
            ...curr,
            {
              id: row.id,
              conversation_id: row.conversation_id,
              route_id: row.route_id ?? null,
              created_at: row.sent_at || row.scheduled_at || new Date().toISOString(),
              direction: 'out', // outbox = from us
              text_body: row.text_body,
              media_url: row.media_url,
              media_mime: row.media_mime,
              media_id: row.media_id,
            },
          ].sort((a,b) => new Date(a.created_at) - new Date(b.created_at)));
        }
      )
      .subscribe();

    subRef.current = ch;
    return () => {
      if (subRef.current) supabase.removeChannel(subRef.current);
    };
  }, [convo.id]);

  const bubble = (m) => {
    const mine = m.direction === 'out';
    return (
      <div key={`${m.id}-${m.created_at}`} className={`flex ${mine ? 'justify-end' : 'justify-start'} my-1`}>
        <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow ${mine ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}>
          {m.text_body ? <div className="whitespace-pre-wrap">{m.text_body}</div> : null}
          {m.media_url ? (
            <div className="mt-2">
              {/* naive media preview */}
              {String(m.media_mime || '').startsWith('image/') ? (
                <img src={m.media_url} alt={m.media_id || 'media'} className="rounded-lg max-h-64" />
              ) : (
                <a className="underline" href={m.media_url} target="_blank" rel="noreferrer">Open media</a>
              )}
            </div>
          ) : null}
          <div className={`mt-1 text-xs ${mine ? 'text-blue-100' : 'text-gray-500'}`}>
            {new Date(m.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex">
      <div className="m-auto w-[900px] max-w-[95vw] h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">
            Conversation • {convo.truck_plate || '—'} • {convo.route_identifier || '—'} • {convo.phone}
          </div>
          <button onClick={onClose} className="rounded px-3 py-1 bg-gray-200 hover:bg-gray-300">Close</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-gray-500">Loading messages…</div>
          ) : msgs.length ? (
            msgs.map(bubble)
          ) : (
            <div className="text-gray-500">No messages yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
