import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * DebugMouseOverlay — a zero-dependency overlay that visualizes mouse/pointer input.
 *
 * Features
 * - Crosshair cursor that tracks the mouse (does not block clicks)
 * - Click ripples for L / M / R buttons
 * - Tiny HUD with live coords, buttons, and modifiers
 * - Toggle visibility with Ctrl/Cmd + Alt + M
 * - Pointer-events: none on the canvas so it won't interfere with your app
 *
 * Usage: <DebugMouseOverlay /> anywhere in your app (ideally near the root)
 */
export default function DebugMouseOverlay() {
  const [visible, setVisible] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [buttons, setButtons] = useState({ left: false, middle: false, right: false });
  const [mods, setMods] = useState({ alt: false, ctrl: false, meta: false, shift: false });
  const [under, setUnder] = useState({ tag: "", id: "", cls: "" });
  const [ripples, setRipples] = useState([]);
  const idCounter = useRef(0);

  const onMove = (e) => {
    setPos({ x: e.pageX, y: e.pageY });
    setMods({ alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey });
    const t = e.target;
    if (t && t instanceof Element) {
      setUnder({ tag: t.tagName?.toLowerCase?.() || "", id: t.id || "", cls: (t.className || "").toString().trim() });
    }
  };

  const onDown = (e) => {
    if (e.button === 0) setButtons((b) => ({ ...b, left: true }));
    if (e.button === 1) setButtons((b) => ({ ...b, middle: true }));
    if (e.button === 2) setButtons((b) => ({ ...b, right: true }));
    // Add a ripple
    const color = e.button === 0 ? "rgba(59,130,246,0.6)" : e.button === 1 ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)";
    const id = idCounter.current++;
    setRipples((rs) => [...rs, { id, x: e.pageX, y: e.pageY, color }]);
  };

  const onUp = (e) => {
    if (e.button === 0) setButtons((b) => ({ ...b, left: false }));
    if (e.button === 1) setButtons((b) => ({ ...b, middle: false }));
    if (e.button === 2) setButtons((b) => ({ ...b, right: false }));
  };

  const onContext = () => {
    // Let the app handle context menu; no preventDefault here.
  };

  const onKey = (e) => {
    // Ctrl/Cmd + Alt + M toggles visibility
    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === "m" || e.key === "M")) {
      setVisible((v) => !v);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("mouseup", onUp, true);
    window.addEventListener("contextmenu", onContext, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("mouseup", onUp, true);
      window.removeEventListener("contextmenu", onContext, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  // Auto-trim old ripples
  useEffect(() => {
    if (!ripples.length) return;
    const t = setTimeout(() => {
      setRipples((rs) => rs.slice(1));
    }, 600);
    return () => clearTimeout(t);
  }, [ripples]);

  const btnBadge = (on, label) => (
    <span
      style={{
        display: "inline-block",
        padding: "2px 6px",
        marginRight: 6,
        borderRadius: 6,
        fontSize: 12,
        lineHeight: 1.2,
        background: on ? "#111827" : "#e5e7eb",
        color: on ? "#fff" : "#374151",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {label}
    </span>
  );

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none", // overlay itself doesn't capture interactions
        zIndex: 999999,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Noto Sans', 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
      }}
    >
      {/* HUD card */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          pointerEvents: "auto",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "saturate(180%) blur(6px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          padding: 10,
          minWidth: 220,
        }}
        title="Ctrl/Cmd + Alt + M to toggle"
      >
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>DebugMouseOverlay</div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          {Math.round(pos.x)} × {Math.round(pos.y)} px
        </div>
        <div style={{ marginBottom: 8 }}>
          {btnBadge(buttons.left, "LMB")} {btnBadge(buttons.middle, "MMB")} {btnBadge(buttons.right, "RMB")}
        </div>
        <div style={{ marginBottom: 8 }}>
          {btnBadge(mods.shift, "Shift")} {btnBadge(mods.ctrl, "Ctrl")} {btnBadge(mods.alt, "Alt")} {btnBadge(mods.meta, "Meta")}
        </div>
        <div style={{ fontSize: 12, color: "#374151", wordBreak: "break-all" }}>
          {under.tag}
          {under.id ? `#${under.id}` : ""}
          {under.cls ? `.${under.cls.replace(/\s+/g, ".")}` : ""}
        </div>
      </div>

      {/* Crosshair */}
      <div
        style={{
          position: "absolute",
          transform: `translate(${pos.x - 8}px, ${pos.y - 8}px)`,
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `2px solid ${buttons.left || buttons.right || buttons.middle ? "#111827" : "#6b7280"}`,
          background: buttons.left ? "rgba(59,130,246,0.15)" : buttons.right ? "rgba(239,68,68,0.15)" : buttons.middle ? "rgba(16,185,129,0.15)" : "transparent",
          boxShadow: "0 0 0 2px rgba(255,255,255,0.8)",
        }}
      />

      {/* Ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{
            position: "absolute",
            transform: `translate(${r.x - 15}px, ${r.y - 15}px)`,
            width: 30,
            height: 30,
            borderRadius: "9999px",
            border: `2px solid ${r.color}`,
            opacity: 0,
            animation: "dbg-ripple 600ms ease-out forwards",
          }}
        />
      ))}

      {/* Keyframes */}
      <style>{`
        @keyframes dbg-ripple {
          0% { opacity: 0.9; transform: translate(var(--x,0), var(--y,0)) scale(0.5); }
          70% { opacity: 0.4; }
          100% { opacity: 0; transform: translate(var(--x,0), var(--y,0)) scale(2.2); }
        }
      `}</style>
    </div>
  );
}
