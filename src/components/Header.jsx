import React from "react";
import { PAL } from "../constants";

export default function Header({ pal, setPal, device, setDevice, shapes, setShapes, setCam, clearAll, exportPng, exportJSON, importJSON, undo, redo, p }) {
  const btnSt = { background: "none", border: `1px solid ${p.bd}`, borderRadius: 8, padding: "5px 12px", fontSize: 11, color: p.mu, cursor: "pointer", fontFamily: "inherit" };

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
