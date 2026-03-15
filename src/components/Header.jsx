import React, { useState } from "react";
import { PAL } from "../constants";

export default function Header({ pal, setPal, device, setDevice, shapes, setShapes, setCam, clearAll, exportPng, exportJSON, importJSON, undo, redo, p, mobile }) {
  const btnSt = { background: "none", border: `1px solid ${p.bd}`, borderRadius: 8, padding: "5px 12px", fontSize: 11, color: p.mu, cursor: "pointer", fontFamily: "inherit" };
  const [menuOpen, setMenuOpen] = useState(false);

  if (mobile) {
    return (
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: `1px solid ${p.bd}`, background: p.card + "cc", backdropFilter: "blur(12px)", zIndex: 50, transition: "all .4s", position: "relative" }}
        role="toolbar" aria-label="Canvas toolbar">
        <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 18, color: p.tx, letterSpacing: "-0.02em" }}>Tasteprint</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={undo} aria-label="Undo" style={{ ...btnSt, padding: "5px 8px", fontSize: 13 }}>↩</button>
          <button onClick={redo} aria-label="Redo" style={{ ...btnSt, padding: "5px 8px", fontSize: 13 }}>↪</button>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" style={{ ...btnSt, padding: "5px 10px", fontSize: 16, background: menuOpen ? p.su : "none" }}>☰</button>
        </div>
        {menuOpen && <>
          <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={() => setMenuOpen(false)} />
          <div style={{ position: "absolute", top: "100%", right: 8, zIndex: 999, background: p.card, border: `1px solid ${p.bd}`, borderRadius: 14, padding: 16, boxShadow: `0 8px 32px ${p.tx}12`, display: "flex", flexDirection: "column", gap: 14, minWidth: 240 }}>
            {/* Palette */}
            <div>
              <span style={{ fontSize: 10, color: p.mu, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "block" }}>Palette</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="radiogroup" aria-label="Color palette">
                {Object.entries(PAL).map(([k, v]) => (
                  <button key={k} onClick={() => { setPal(k); setMenuOpen(false) }} title={v.name} aria-label={`${v.name} palette`} aria-pressed={pal === k}
                    style={{ width: 28, height: 28, borderRadius: 999, border: pal === k ? `2.5px solid ${p.ac}` : "2px solid transparent", background: k === "noir" || k === "neon" ? "#1A1A1E" : v.ac, cursor: "pointer", transition: "all .2s", transform: pal === k ? "scale(1.15)" : "scale(1)" }} />
                ))}
              </div>
            </div>
            {/* Device */}
            <div>
              <span style={{ fontSize: 10, color: p.mu, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "block" }}>Device</span>
              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${p.bd}`, borderRadius: 8, overflow: "hidden" }} role="radiogroup" aria-label="Device mode">
                {[{ k: "free", l: "Free" }, { k: "desktop", l: "Desktop" }, { k: "phone", l: "Phone" }].map(d => (
                  <button key={d.k} aria-pressed={device === d.k} onClick={() => {
                    if (d.k !== "free") {
                      const cw = d.k === "desktop" ? 1280 : 390, pd = d.k === "desktop" ? 32 : 16, gp = d.k === "desktop" ? 16 : 12, mw = cw - pd * 2;
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
                    setDevice(d.k); setCam({ x: 0, y: 0, z: 1 }); setMenuOpen(false);
                  }}
                    style={{ flex: 1, background: device === d.k ? p.su : "none", border: "none", padding: "8px 10px", fontSize: 12, color: device === d.k ? p.tx : p.mu, cursor: "pointer", fontFamily: "inherit", fontWeight: device === d.k ? 500 : 400 }}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>
            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                { label: "New canvas", fn: () => { clearAll(); setMenuOpen(false) } },
                { label: "Export PNG", fn: () => { exportPng(); setMenuOpen(false) }, dis: !shapes.length },
                { label: "Export JSON", fn: () => { exportJSON(); setMenuOpen(false) }, dis: !shapes.length },
                { label: "Import JSON", fn: () => { importJSON(); setMenuOpen(false) } },
              ].map(a => (
                <button key={a.label} onClick={a.fn} disabled={a.dis}
                  style={{ background: "none", border: "none", padding: "10px 12px", fontSize: 13, color: a.dis ? p.mu + "44" : p.tx, cursor: a.dis ? "default" : "pointer", fontFamily: "inherit", textAlign: "left", borderRadius: 8, transition: "background .15s" }}
                  onTouchStart={e => { if (!a.dis) e.currentTarget.style.background = p.su }}
                  onTouchEnd={e => e.currentTarget.style.background = "none"}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </>}
      </header>
    );
  }

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: `1px solid ${p.bd}`, background: p.card + "cc", backdropFilter: "blur(12px)", zIndex: 50, transition: "all .4s" }}
      role="toolbar" aria-label="Canvas toolbar">
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 22, color: p.tx, letterSpacing: "-0.02em" }}>Tasteprint</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 220 }} role="radiogroup" aria-label="Color palette">
          {Object.entries(PAL).map(([k, v]) => (
            <button key={k} onClick={() => setPal(k)} title={v.name} aria-label={`${v.name} palette`} aria-pressed={pal === k}
              style={{ width: 18, height: 18, borderRadius: 999, border: pal === k ? `2px solid ${p.ac}` : "2px solid transparent", background: k === "noir" || k === "neon" ? "#1A1A1E" : v.ac, cursor: "pointer", transition: "all .2s", transform: pal === k ? "scale(1.2)" : "scale(1)" }} />
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: p.bd }} />
        <div style={{ display: "flex", alignItems: "center", border: `1px solid ${p.bd}`, borderRadius: 8, overflow: "hidden" }} role="radiogroup" aria-label="Device mode">
          {[{ k: "free", l: "Free" }, { k: "desktop", l: "Desktop" }, { k: "phone", l: "Phone" }].map(d => (
            <button key={d.k} aria-pressed={device === d.k} onClick={() => {
              if (d.k !== "free") {
                const cw = d.k === "desktop" ? 1280 : 390, pd = d.k === "desktop" ? 32 : 16, gp = d.k === "desktop" ? 16 : 12, mw = cw - pd * 2;
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
              setDevice(d.k);
              setCam({ x: 0, y: 0, z: 1 });
            }}
              style={{ background: device === d.k ? p.su : "none", border: "none", padding: "5px 10px", fontSize: 10, color: device === d.k ? p.tx : p.mu, cursor: "pointer", fontFamily: "inherit", fontWeight: device === d.k ? 500 : 400 }}>
              {d.l}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: p.bd }} />
        <button onClick={clearAll} title="New canvas" aria-label="New canvas" style={btnSt}>New</button>
        <button onClick={exportPng} title="Export as PNG" aria-label="Export as PNG" disabled={!shapes.length} style={{ ...btnSt, opacity: shapes.length ? 1 : .4, cursor: shapes.length ? "pointer" : "default" }}>PNG</button>
        <button onClick={exportJSON} title="Export JSON" aria-label="Export as JSON" disabled={!shapes.length} style={{ ...btnSt, opacity: shapes.length ? 1 : .4, cursor: shapes.length ? "pointer" : "default" }}>JSON</button>
        <button onClick={importJSON} title="Import JSON" aria-label="Import JSON" style={btnSt}>Import</button>
        <button onClick={undo} title="Undo (⌘Z)" aria-label="Undo" style={btnSt}>Undo</button>
        <button onClick={redo} title="Redo (⌘⇧Z)" aria-label="Redo" style={btnSt}>Redo</button>
      </div>
    </header>
  );
}
