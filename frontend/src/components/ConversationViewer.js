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

  // realtime updates
  useEffect(() => {
    const ch = supabase
      .channel(`wa-convo-${convo.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wa_inbox', filter: `conversation_id=eq.${convo.id}` },
        payload => {
          const row = payload.new || payload.old;
          if (!row) return;
          setMsgs(curr => [
            ...curr,
            {
              id: row.id,
              conversation_id: row.conversation_id,
              route_id: row.route_id ?? null,
              created_at: row.created_at ?? new Date().toISOString(),
              direction: 'in',
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
              direction: 'out',
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
        <div
          className={[
            'max-w-[75%] rounded-2xl px-3 py-2 shadow',
            mine
              ? 'bg-blue-600 text-white dark:bg-blue-500'
              : 'bg-gray-200 text-gray-900 dark:bg-neutral-800 dark:text-gray-100',
          ].join(' ')}
        >
          {m.text_body ? <div className="whitespace-pre-wrap leading-relaxed">{m.text_body}</div> : null}
          {m.media_url ? (
            <div className="mt-2">
              {String(m.media_mime || '').startsWith('image/') ? (
                <img
                  src={m.media_url}
                  alt={m.media_id || 'media'}
                  className="rounded-lg max-h-64 border border-gray-200 dark:border-neutral-700"
                />
              ) : (
                <a
                  className="underline underline-offset-2 hover:opacity-80"
                  href={m.media_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open media
                </a>
              )}
            </div>
          ) : null}
          <div className={`mt-1 text-xs ${mine ? 'text-blue-100/90 dark:text-blue-50/80' : 'text-gray-600 dark:text-gray-400'}`}>
            {new Date(m.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* overlay (click to close) */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div
        className="
          relative w-[900px] max-w-[95vw] h-[80vh]
          bg-white/90 dark:bg-neutral-900/80
          border border-gray-200 dark:border-neutral-700
          rounded-2xl shadow-2xl overflow-hidden
          text-gray-900 dark:text-gray-100
        "
      >
        {/* header */}
        <div
          className="
            px-4 py-3 border-b border-gray-200 dark:border-neutral-700
            bg-white/80 dark:bg-neutral-900/60 backdrop-blur
            flex items-center justify-between
          "
        >
          <div className="font-semibold truncate">
            Conversation • {convo.truck_plate || '—'} • {convo.route_identifier || '—'} • {convo.phone}
          </div>
          <button
            onClick={onClose}
            className="
              rounded-full px-3 py-1 text-sm
              bg-gray-200 hover:bg-gray-300 text-gray-900
              dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-100
              focus:outline-none focus:ring-2 focus:ring-red-500/60
            "
          >
            Close
          </button>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-gray-600 dark:text-gray-400">Loading messages…</div>
          ) : msgs.length ? (
            msgs.map(bubble)
          ) : (
            <div className="text-gray-600 dark:text-gray-400">No messages yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
