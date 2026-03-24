import React, { useState, useCallback, useEffect } from "react";
import { PAL } from "../constants";
import { DESIGN_MOODS, getReadableTextColor } from "../utils";
import "./header.css";

/* ── Shared layout logic for device mode switching ── */
function reflowForDevice(deviceKey, setShapes, setDevice, setCam) {
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

export default React.memo(function Header({ pal, setPal, device, setDevice, shapeCount, setShapes, setCam, clearAll, exportPng, exportJSON, importJSON, undo, redo, canUndo, canRedo, p, mobile, randomizeAll, designMood, setDesignMood, lastRandomizeStats, pickyMode, enterPicky, cancelPicky }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);

  const activeMood = DESIGN_MOODS.find(m => m.id === (designMood || "auto")) || DESIGN_MOODS[0];

  /* Auto-show/dismiss randomize stats toast */
  useEffect(() => {
    if (!lastRandomizeStats) { setShowStats(false); return; }
    setShowStats(true);
    const timer = setTimeout(() => setShowStats(false), 3000);
    return () => clearTimeout(timer);
  }, [lastRandomizeStats]);

  const switchDevice = useCallback((key) => {
    reflowForDevice(key, setShapes, setDevice, setCam);
  }, [setShapes, setDevice, setCam]);

  /* ── Palette swatch ── */
  const swatch = (k, v, size = 18) => {
    const active = pal === k;
    return (
      <button key={k} type="button" onClick={() => { setPal(k); if (mobile) setMenuOpen(false); }}
        title={v.name} aria-label={`${v.name} palette`} aria-pressed={active}
        className={`tp-swatch${active ? " tp-swatch--active" : ""}`}
        style={{
          width: size, height: size,
          borderColor: active ? p.ac : undefined,
          background: k === "noir" || k === "neon" ? "#1A1A1E" : v.ac,
          boxShadow: active ? `0 0 0 3px ${p.ac}22` : "none",
        }} />
    );
  };

  /* ── Device toggle segment ── */
  const deviceSeg = (d, closeFn) => {
    const active = device === d.k;
    return (
      <button key={d.k} type="button" aria-pressed={active}
        onClick={() => { switchDevice(d.k); closeFn?.(); }}
        className={`tp-dev-seg${mobile ? " tp-dev-seg--mobile" : " tp-dev-seg--desktop"}${active ? " tp-dev-seg--active" : ""}`}>
        {d.l}
      </button>
    );
  };

  // Designer-first ordering: keep constrained outputs front-and-center,
  // with free canvas available but de-emphasized.
  const devices = [{ k: "desktop", l: "Desktop" }, { k: "phone", l: "Phone" }, { k: "free", l: "Free" }];

  /* ════════ Mobile Layout ════════ */
  if (mobile) {
    return (
      <header className="tp-header tp-header--mobile"
        style={{ background: p.card + "cc" }}
        role="toolbar" aria-label="Canvas toolbar">
        <span className="tp-header-brand tp-header-brand--mobile">
          Tasteprint
        </span>
        <div className="tp-header-actions tp-header-actions--mobile">
          {pickyMode ? (
            <button type="button" onClick={cancelPicky} className="tp-hdr-btn" style={{ padding: "5px 10px", fontSize: 11 }}>
              Exit Picky
            </button>
          ) : <>
          <button type="button" onClick={undo} aria-label="Undo" disabled={!canUndo}
            className="tp-hdr-btn" style={{ padding: "5px 8px", fontSize: 13 }}>↩</button>
          <button type="button" onClick={redo} aria-label="Redo" disabled={!canRedo}
            className="tp-hdr-btn" style={{ padding: "5px 8px", fontSize: 13 }}>↪</button>
          {shapeCount > 0 && <span className="tp-btn-wrap">
            <button type="button" onClick={randomizeAll} aria-label="Randomize all"
              className="tp-hdr-btn" style={{ padding: "5px 8px", fontSize: 12 }}>🎲</button>
            {showStats && lastRandomizeStats && (
              <span className="tp-rnd-stats tp-rnd-stats--mobile"
                style={{ background: p.ac, color: getReadableTextColor(p.ac), boxShadow: `0 2px 8px ${p.ac}44` }}>
                {lastRandomizeStats.skipped > 0
                  ? `\u2713 ${lastRandomizeStats.count} \u00b7 ${lastRandomizeStats.skipped} locked`
                  : `\u2713 ${lastRandomizeStats.count} updated`}
              </span>
            )}
          </span>}
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu"
            className="tp-hdr-btn" style={{ padding: "5px 10px", fontSize: 16, background: menuOpen ? p.su : "none" }}>
            ☰
          </button>
          </>}
        </div>

        {menuOpen && <>
          <div className="tp-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="tp-menu-dropdown"
            style={{ background: p.card, border: `1px solid ${p.bd}`, boxShadow: `0 8px 32px ${p.tx}12`, animation: "tp-tooltip-in .15s ease-out both" }}>
            {/* Palette */}
            <div>
              <span className="tp-menu-section-label">Palette</span>
              <div className="tp-palette-group tp-palette-group--mobile" role="radiogroup" aria-label="Color palette">
                {Object.entries(PAL).map(([k, v]) => swatch(k, v, 28))}
              </div>
            </div>
            {/* Device */}
            <div>
              <span className="tp-menu-section-label">Device</span>
              <div className="tp-dev-group" role="radiogroup" aria-label="Device mode">
                {devices.map(d => deviceSeg(d, () => setMenuOpen(false)))}
              </div>
            </div>
            {/* Mood */}
            {designMood !== undefined && <div>
              <span className="tp-menu-section-label">Mood</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DESIGN_MOODS.map(m => {
                  const active = (designMood || "auto") === m.id;
                  return (
                    <button key={m.id} type="button"
                      onClick={() => { setDesignMood(m.id); setMenuOpen(false); }}
                      className={`tp-mood-btn tp-mood-btn--mobile${active ? " tp-mood-btn--active" : ""}`}
                      style={{
                        background: active ? p.ac + "18" : "none",
                        borderColor: active ? p.ac + "44" : "transparent",
                        color: active ? p.ac : p.tx,
                      }}>
                      <span style={{ fontSize: 14 }}>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>}
            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                { label: "Picky Mode", fn: () => { enterPicky(); setMenuOpen(false); } },
                { label: "New canvas", fn: () => { clearAll(); setMenuOpen(false); } },
                { label: "Export PNG", fn: () => { exportPng(); setMenuOpen(false); }, dis: !shapeCount },
                { label: "Export JSON", fn: () => { exportJSON(); setMenuOpen(false); }, dis: !shapeCount },
                { label: "Import JSON", fn: () => { importJSON(); setMenuOpen(false); } },
              ].map(a => (
                <button key={a.label} type="button" onClick={a.fn} disabled={a.dis}
                  className="tp-menu-action"
                  style={{ color: a.dis ? p.mu + "44" : p.tx }}>
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
    <header className="tp-header tp-header--desktop"
      style={{ background: p.card + "cc" }}
      role="toolbar" aria-label="Canvas toolbar">
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="tp-header-brand tp-header-brand--desktop">
          Tasteprint
        </span>
      </div>
      <div className="tp-header-actions tp-header-actions--desktop">
        <div className="tp-palette-group tp-palette-group--desktop" role="radiogroup" aria-label="Color palette">
          {Object.entries(PAL).map(([k, v]) => swatch(k, v, 18))}
        </div>
        {!pickyMode && <>
        <div className="tp-hdr-sep" />
        <div className="tp-dev-group" role="radiogroup" aria-label="Device mode">
          {devices.map(d => deviceSeg(d))}
        </div>
        <div className="tp-hdr-sep" />
        <button type="button" onClick={clearAll} title="New canvas" aria-label="New canvas"
          className="tp-hdr-btn">New canvas</button>
        <button type="button" onClick={exportPng} title="Export as PNG" aria-label="Export as PNG"
          disabled={!shapeCount}
          className="tp-hdr-btn">PNG</button>
        <button type="button" onClick={exportJSON} title="Export JSON" aria-label="Export as JSON"
          disabled={!shapeCount}
          className="tp-hdr-btn">JSON</button>
        <button type="button" onClick={importJSON} title="Import JSON" aria-label="Import JSON"
          className="tp-hdr-btn">Import</button>
        <button type="button" onClick={undo} title="Undo (⌘Z)" aria-label="Undo" disabled={!canUndo}
          className="tp-hdr-btn">Undo</button>
        <button type="button" onClick={redo} title="Redo (⌘⇧Z)" aria-label="Redo" disabled={!canRedo}
          className="tp-hdr-btn">Redo</button>
        {shapeCount > 0 && <>
          <div className="tp-hdr-sep tp-hdr-sep--small" />
          {designMood !== undefined && <span className="tp-btn-wrap">
            <button
              type="button"
              onClick={() => setMoodOpen(v => !v)}
              title={`Design mood: ${activeMood.label} (M key to cycle)`}
              aria-label="Open mood picker"
              aria-expanded={moodOpen}
              className="tp-hdr-btn"
              style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 500, color: designMood === "auto" ? undefined : p.ac }}>
              <span style={{ fontSize: 12 }}>{activeMood.icon}</span>
              <span>{activeMood.label}</span>
              <span className="tp-mood-caret">▾</span>
            </button>
            {moodOpen && <>
              <div className="tp-menu-backdrop" onClick={() => setMoodOpen(false)} />
              <div className="tp-mood-grid"
                style={{ background: p.card, border: `1px solid ${p.bd}`, boxShadow: `0 8px 32px ${p.tx}12`, animation: "tp-tooltip-in .15s ease-out both" }}>
                {DESIGN_MOODS.map(m => {
                  const active = (designMood || "auto") === m.id;
                  return (
                    <button key={m.id} type="button"
                      onClick={() => { setDesignMood(m.id); setMoodOpen(false); }}
                      className={`tp-mood-btn tp-mood-btn--desktop${active ? " tp-mood-btn--active" : ""}`}
                      style={{
                        background: active ? p.ac + "18" : "none",
                        borderColor: active ? p.ac + "44" : "transparent",
                        color: active ? p.ac : p.tx,
                      }}>
                      <span style={{ fontSize: 13 }}>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </>}
          </span>}
          <span className="tp-btn-wrap">
            <button type="button" onClick={randomizeAll} title="Randomize all components" aria-label="Randomize canvas"
              className="tp-hdr-btn" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              All
            </button>
            {showStats && lastRandomizeStats && (
              <span className="tp-rnd-stats tp-rnd-stats--desktop"
                style={{ background: p.ac, color: getReadableTextColor(p.ac), boxShadow: `0 2px 8px ${p.ac}44` }}>
                {lastRandomizeStats.skipped > 0
                  ? `\u2713 ${lastRandomizeStats.count} updated \u00b7 ${lastRandomizeStats.skipped} locked`
                  : `\u2713 ${lastRandomizeStats.count} updated`}
              </span>
            )}
          </span>
          {/* Picky mode button */}
          <button type="button" onClick={enterPicky} title="Picky — build a page step by step" aria-label="Picky mode"
            className="tp-hdr-btn" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            Picky
          </button>
        </>}
        </>}
        {/* Simplified header during Picky mode */}
        {pickyMode && (
          <button type="button" onClick={cancelPicky} className="tp-hdr-btn">
            Exit Picky
          </button>
        )}
      </div>
    </header>
  );
})
