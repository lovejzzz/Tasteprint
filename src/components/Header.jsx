import React, { useState, useCallback, useEffect } from "react";
import { PAL } from "../constants";
import { DESIGN_MOODS } from "../utils";

/* ── Shared layout logic for device mode switching ── */
function reflowForDevice(deviceKey, shapes, setShapes, setDevice, setCam) {
  if (deviceKey !== "free") {
    const cw = deviceKey === "desktop" ? 1280 : 390;
    const pd = deviceKey === "desktop" ? 32 : 16;
    const gp = deviceKey === "desktop" ? 16 : 12;
    const mw = cw - pd * 2;
    setShapes(prev => {
      const sorted = [...prev].sort((a, b) => a.y - b.y || a.x - b.x);
      let cy = pd;
      return sorted.map(s => {
        const sc = Math.min(1, mw / s.w);
        const nw = s.w * sc, nh = s.h * sc;
        const ns = { ...s, x: cw / 2 - nw / 2, y: cy, w: nw, h: nh };
        cy += nh + gp;
        return ns;
      });
    });
  }
  setDevice(deviceKey);
  setCam({ x: 0, y: 0, z: 1 });
}

export default function Header({ pal, setPal, device, setDevice, shapes, setShapes, setCam, clearAll, exportPng, exportJSON, importJSON, undo, redo, p, mobile, randomizeAll, hasRndUndo, undoRandomize, designMood, setDesignMood, lastRandomizeStats }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [showStats, setShowStats] = useState(false);

  /* Auto-show/dismiss randomize stats toast */
  useEffect(() => {
    if (!lastRandomizeStats) { setShowStats(false); return; }
    setShowStats(true);
    const timer = setTimeout(() => setShowStats(false), 3000);
    return () => clearTimeout(timer);
  }, [lastRandomizeStats]);

  const switchDevice = useCallback((key) => {
    reflowForDevice(key, shapes, setShapes, setDevice, setCam);
  }, [shapes, setShapes, setDevice, setCam]);

  /* ── Button style with hover support ── */
  const btn = (id, extra = {}) => ({
    background: hoveredBtn === id ? p.su : "none",
    border: `1px solid ${hoveredBtn === id ? p.ac + "44" : p.bd}`,
    borderRadius: 8,
    padding: "5px 12px",
    fontSize: 11,
    color: hoveredBtn === id ? p.tx : p.mu,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all .15s ease",
    outline: "none",
    ...extra,
  });

  const btnHandlers = (id) => ({
    onMouseEnter: () => setHoveredBtn(id),
    onMouseLeave: () => setHoveredBtn(null),
    onFocus: () => setHoveredBtn(id),
    onBlur: () => setHoveredBtn(null),
  });

  /* ── Palette swatch ── */
  const swatch = (k, v, size = 18) => {
    const active = pal === k;
    return (
      <button key={k} onClick={() => { setPal(k); if (mobile) setMenuOpen(false); }}
        title={v.name} aria-label={`${v.name} palette`} aria-pressed={active}
        {...btnHandlers(`pal-${k}`)}
        style={{
          width: size, height: size, borderRadius: 999,
          border: active ? `2.5px solid ${p.ac}` : hoveredBtn === `pal-${k}` ? `2px solid ${p.mu}` : "2px solid transparent",
          background: k === "noir" || k === "neon" ? "#1A1A1E" : v.ac,
          cursor: "pointer",
          transition: "all .2s ease",
          transform: active ? "scale(1.2)" : hoveredBtn === `pal-${k}` ? "scale(1.1)" : "scale(1)",
          outline: "none",
          boxShadow: active ? `0 0 0 3px ${p.ac}22` : "none",
        }} />
    );
  };

  /* ── Device toggle segment ── */
  const deviceSeg = (d, closeFn) => {
    const active = device === d.k;
    const hovered = hoveredBtn === `dev-${d.k}`;
    return (
      <button key={d.k} aria-pressed={active}
        onClick={() => { switchDevice(d.k); closeFn?.(); }}
        {...btnHandlers(`dev-${d.k}`)}
        style={{
          flex: 1, background: active ? p.su : hovered ? p.su + "66" : "none",
          border: "none", padding: mobile ? "8px 10px" : "5px 10px",
          fontSize: mobile ? 12 : 10, color: active ? p.tx : p.mu,
          cursor: "pointer", fontFamily: "inherit",
          fontWeight: active ? 500 : 400,
          transition: "all .15s ease", outline: "none",
        }}>
        {d.l}
      </button>
    );
  };

  const devices = [{ k: "free", l: "Free" }, { k: "desktop", l: "Desktop" }, { k: "phone", l: "Phone" }];
  const separator = <div style={{ width: 1, height: 20, background: p.bd, flexShrink: 0 }} />;

  /* ════════ Mobile Layout ════════ */
  if (mobile) {
    return (
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", borderBottom: `1px solid ${p.bd}`,
        background: p.card + "cc", backdropFilter: "blur(12px)",
        zIndex: 50, transition: "all .4s", position: "relative",
      }} role="toolbar" aria-label="Canvas toolbar">
        <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 18, color: p.tx, letterSpacing: "-0.02em" }}>
          Tasteprint
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={undo} aria-label="Undo" {...btnHandlers("m-undo")}
            style={btn("m-undo", { padding: "5px 8px", fontSize: 13 })}>↩</button>
          <button onClick={redo} aria-label="Redo" {...btnHandlers("m-redo")}
            style={btn("m-redo", { padding: "5px 8px", fontSize: 13 })}>↪</button>
          {shapes.length > 0 && <span style={{ position: "relative", display: "inline-flex" }}>
            <button onClick={randomizeAll} aria-label="Randomize all" {...btnHandlers("m-rndAll")}
              style={btn("m-rndAll", { padding: "5px 8px", fontSize: 12 })}>🎲</button>
            {showStats && lastRandomizeStats && (
              <span style={{
                position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                background: p.ac, color: (() => { const hex = p.ac.replace("#", ""); const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16); return (r*299+g*587+b*114)/1000 > 150 ? "#1a1a1a" : "#fff"; })(),
                fontSize: 9, fontWeight: 600, fontFamily: "inherit",
                padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap",
                pointerEvents: "none", zIndex: 100,
                animation: "tp-rnd-toast .2s ease-out, tp-rnd-toast .3s ease-out 2.5s reverse both",
                boxShadow: `0 2px 8px ${p.ac}44`,
              }}>
                {lastRandomizeStats.skipped > 0
                  ? `\u2713 ${lastRandomizeStats.count} \u00b7 ${lastRandomizeStats.skipped} locked`
                  : `\u2713 ${lastRandomizeStats.count} updated`}
              </span>
            )}
          </span>}
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" {...btnHandlers("m-menu")}
            style={btn("m-menu", { padding: "5px 10px", fontSize: 16, background: menuOpen ? p.su : hoveredBtn === "m-menu" ? p.su : "none" })}>
            ☰
          </button>
        </div>

        {menuOpen && <>
          <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={() => setMenuOpen(false)} />
          <div style={{
            position: "absolute", top: "100%", right: 8, zIndex: 999,
            background: p.card, border: `1px solid ${p.bd}`, borderRadius: 14,
            padding: 16, boxShadow: `0 8px 32px ${p.tx}12`,
            display: "flex", flexDirection: "column", gap: 14, minWidth: 240,
            animation: "tp-tooltip-in .15s ease-out both",
          }}>
            {/* Palette */}
            <div>
              <span style={{ fontSize: 10, color: p.mu, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "block" }}>
                Palette
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="radiogroup" aria-label="Color palette">
                {Object.entries(PAL).map(([k, v]) => swatch(k, v, 28))}
              </div>
            </div>
            {/* Device */}
            <div>
              <span style={{ fontSize: 10, color: p.mu, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "block" }}>
                Device
              </span>
              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${p.bd}`, borderRadius: 8, overflow: "hidden" }}
                role="radiogroup" aria-label="Device mode">
                {devices.map(d => deviceSeg(d, () => setMenuOpen(false)))}
              </div>
            </div>
            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                { id: "m-new", label: "New canvas", fn: () => { clearAll(); setMenuOpen(false); } },
                { id: "m-png", label: "Export PNG", fn: () => { exportPng(); setMenuOpen(false); }, dis: !shapes.length },
                { id: "m-json", label: "Export JSON", fn: () => { exportJSON(); setMenuOpen(false); }, dis: !shapes.length },
                { id: "m-import", label: "Import JSON", fn: () => { importJSON(); setMenuOpen(false); } },
              ].map(a => (
                <button key={a.id} onClick={a.fn} disabled={a.dis}
                  {...(!a.dis ? btnHandlers(a.id) : {})}
                  style={{
                    background: hoveredBtn === a.id ? p.su : "none",
                    border: "none", padding: "10px 12px", fontSize: 13,
                    color: a.dis ? p.mu + "44" : p.tx,
                    cursor: a.dis ? "default" : "pointer",
                    fontFamily: "inherit", textAlign: "left", borderRadius: 8,
                    transition: "background .15s", outline: "none",
                  }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </>}
      </header>
    );
  }

  /* ════════ Desktop Layout ════════ */
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 20px", borderBottom: `1px solid ${p.bd}`,
      background: p.card + "cc", backdropFilter: "blur(12px)",
      zIndex: 50, transition: "all .4s",
    }} role="toolbar" aria-label="Canvas toolbar">
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 22, color: p.tx, letterSpacing: "-0.02em" }}>
          Tasteprint
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 220 }} role="radiogroup" aria-label="Color palette">
          {Object.entries(PAL).map(([k, v]) => swatch(k, v, 18))}
        </div>
        {separator}
        <div style={{ display: "flex", alignItems: "center", border: `1px solid ${p.bd}`, borderRadius: 8, overflow: "hidden" }}
          role="radiogroup" aria-label="Device mode">
          {devices.map(d => deviceSeg(d))}
        </div>
        {separator}
        <button onClick={clearAll} title="New canvas" aria-label="New canvas"
          {...btnHandlers("new")} style={btn("new")}>New</button>
        <button onClick={exportPng} title="Export as PNG" aria-label="Export as PNG"
          disabled={!shapes.length} {...(shapes.length ? btnHandlers("png") : {})}
          style={btn("png", { opacity: shapes.length ? 1 : .4, cursor: shapes.length ? "pointer" : "default" })}>PNG</button>
        <button onClick={exportJSON} title="Export JSON" aria-label="Export as JSON"
          disabled={!shapes.length} {...(shapes.length ? btnHandlers("json") : {})}
          style={btn("json", { opacity: shapes.length ? 1 : .4, cursor: shapes.length ? "pointer" : "default" })}>JSON</button>
        <button onClick={importJSON} title="Import JSON" aria-label="Import JSON"
          {...btnHandlers("import")} style={btn("import")}>Import</button>
        <button onClick={undo} title="Undo (⌘Z)" aria-label="Undo"
          {...btnHandlers("undo")} style={btn("undo")}>Undo</button>
        <button onClick={redo} title="Redo (⌘⇧Z)" aria-label="Redo"
          {...btnHandlers("redo")} style={btn("redo")}>Redo</button>
        {shapes.length > 0 && <>
          <div style={{ width: 1, height: 16, background: p.bd, margin: "0 2px", flexShrink: 0 }} />
          {designMood !== undefined && <button
            onClick={() => { const idx = DESIGN_MOODS.findIndex(m => m.id === (designMood || "auto")); setDesignMood(DESIGN_MOODS[(idx + 1) % DESIGN_MOODS.length].id); }}
            title={`Design mood: ${(DESIGN_MOODS.find(m => m.id === (designMood || "auto")) || DESIGN_MOODS[0]).label} (click to cycle, M key)`}
            aria-label="Cycle design mood"
            {...btnHandlers("mood")}
            style={btn("mood", { display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 500, color: designMood === "auto" ? p.mu : p.ac })}>
            <span style={{ fontSize: 12 }}>{(DESIGN_MOODS.find(m => m.id === (designMood || "auto")) || DESIGN_MOODS[0]).icon}</span>
            <span>{(DESIGN_MOODS.find(m => m.id === (designMood || "auto")) || DESIGN_MOODS[0]).label}</span>
          </button>}
          <span style={{ position: "relative", display: "inline-flex" }}>
            <button onClick={randomizeAll} title="Randomize all components" aria-label="Randomize canvas"
              {...btnHandlers("rndAll")} style={btn("rndAll", { display: "flex", alignItems: "center", gap: 4 })}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              All
            </button>
            {showStats && lastRandomizeStats && (
              <span style={{
                position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                background: p.ac, color: (() => { const hex = p.ac.replace("#", ""); const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16); return (r*299+g*587+b*114)/1000 > 150 ? "#1a1a1a" : "#fff"; })(),
                fontSize: 10, fontWeight: 600, fontFamily: "inherit",
                padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
                pointerEvents: "none", zIndex: 100,
                animation: "tp-rnd-toast .2s ease-out, tp-rnd-toast .3s ease-out 2.5s reverse both",
                boxShadow: `0 2px 8px ${p.ac}44`,
              }}>
                {lastRandomizeStats.skipped > 0
                  ? `\u2713 ${lastRandomizeStats.count} updated \u00b7 ${lastRandomizeStats.skipped} locked`
                  : `\u2713 ${lastRandomizeStats.count} updated`}
              </span>
            )}
          </span>
          {hasRndUndo && <button onClick={undoRandomize} title="Undo last randomize" aria-label="Undo randomize"
            {...btnHandlers("rndUndo")} style={btn("rndUndo", { fontSize: 11 })}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>}
        </>}
      </div>
    </header>
  );
}
