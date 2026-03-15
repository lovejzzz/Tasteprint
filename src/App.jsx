import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { toPng } from "html-to-image";
import { STORE_KEY, FONTS, FONT_URL, PAL, LIB, HAS_TEXT } from "./constants";
import { load, uid, maxV, varName, snap, validateImport } from "./utils";
import { useKeyboard } from "./hooks/useKeyboard";
import Header from "./components/Header";
import LibrarySidebar from "./components/LibrarySidebar";
import ShapeItem from "./components/ShapeItem";

export default function App() {
  const [shapes, setShapes] = useState(() => load("shapes", []));
  const [sel, setSel] = useState(null);
  const [selAll, setSelAll] = useState(new Set());
  const [drag, setDrag] = useState(null);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [guides, setGuides] = useState([]);
  const [pal, setPal] = useState(() => load("pal", "warm"));
  const [gest, setGest] = useState(() => load("gest", 0));
  const [hist, setHist] = useState([]);
  const [future, setFuture] = useState([]);
  const [rsz, setRsz] = useState(null);
  const [expCat, setExpCat] = useState("Structure");
  const [prefV, setPrefV] = useState(() => load("prefV", {}));
  const [cam, setCam] = useState({ x: 0, y: 0, z: 1 });
  const [pan, setPan] = useState(null);
  const [selFont, setSelFont] = useState(null);
  const [device, setDevice] = useState("free");
  const [libOrd, setLibOrd] = useState(() => load("libOrd", {}));
  const [pDrag, setPDrag] = useState(null);
  const cRef = useRef(null);
  const dRef = useRef(null);
  const dirtyText = useRef(null);
  const lastReorder = useRef(0);
  const camRef = useRef(cam);
  camRef.current = cam;

  /* ---- PERSIST ---- */
  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify({ shapes, pal, prefV, gest, libOrd }));
  }, [shapes, pal, prefV, gest, libOrd]);

  const updateText = useCallback((id, key, value) => {
    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const texts = { ...(s.texts || {}) };
      if (value === null || value === undefined) delete texts[key];
      else texts[key] = value;
      return { ...s, texts };
    }));
  }, []);

  const flushDirtyText = useCallback(() => {
    if (!dirtyText.current) return;
    const { id, key } = dirtyText.current;
    const ce = document.querySelector(`[data-text-key="${key}"]`);
    if (ce) updateText(id, key, ce.innerHTML);
    dirtyText.current = null;
  }, [updateText]);

  /* ---- EXPORT / IMPORT ---- */
  const exportJSON = useCallback(() => {
    flushDirtyText();
    const data = JSON.stringify({ shapes, pal, prefV, gest }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "tasteprint-layout.json"; a.click();
    URL.revokeObjectURL(url);
  }, [shapes, pal, prefV, gest, flushDirtyText]);

  const importJSON = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const raw = JSON.parse(ev.target.result);
          const d = validateImport(raw);
          if (!d) { console.error("Invalid Tasteprint file"); return; }
          if (d.shapes) setShapes(d.shapes);
          if (d.pal) setPal(d.pal);
          if (d.prefV) setPrefV(d.prefV);
          if (d.gest !== undefined) setGest(d.gest);
        } catch (err) {
          console.error("Failed to import JSON:", err);
        }
      };
      reader.onerror = () => console.error("Failed to read file");
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const exportPng = useCallback(() => {
    flushDirtyText();
    const el = cRef.current; if (!el) return;
    const prev = sel; const prevAll = selAll;
    setSel(null); setSelAll(new Set());
    requestAnimationFrame(() => {
      toPng(el, { pixelRatio: 2, cacheBust: true, filter: n => !n?.dataset?.noExport })
        .then(url => {
          const a = document.createElement("a"); a.href = url; a.download = "tasteprint.png"; a.click();
        })
        .catch(err => console.error("PNG export failed:", err))
        .finally(() => { setSel(prev); setSelAll(prevAll) });
    });
  }, [sel, selAll, flushDirtyText]);

  /* ---- CANVAS COORD HELPERS ---- */
  const toCanvas = useCallback((cx, cy) => {
    const r = cRef.current.getBoundingClientRect();
    if (device !== "free") return { x: cx - r.left, y: cy - r.top };
    const c = camRef.current;
    return { x: (cx - r.left - c.x) / c.z, y: (cy - r.top - c.y) / c.z };
  }, [device]);

  const push = useCallback(ns => { setHist(h => [...h.slice(-40), shapes]); setFuture([]); setShapes(ns) }, [shapes]);
  const undo = useCallback(() => { if (!hist.length) return; setFuture(f => [...f, shapes]); setShapes(hist[hist.length - 1]); setHist(h => h.slice(0, -1)) }, [hist, shapes]);
  const redo = useCallback(() => { if (!future.length) return; setHist(h => [...h, shapes]); setShapes(future[future.length - 1]); setFuture(f => f.slice(0, -1)) }, [future, shapes]);
  const clearAll = useCallback(() => { push([]); setSel(null); setSelAll(new Set()) }, [push]);
  const nudge = useCallback(d => { setGest(g => g + 1) }, []);

  const cycle = useCallback((id, dir) => {
    const s = shapes.find(x => x.id === id); if (!s) return;
    const mx = maxV(s.type); let nv = ((s.variant || 0) + dir) % mx; if (nv < 0) nv = mx - 1;
    setShapes(shapes.map(x => x.id === id ? { ...x, variant: nv } : x));
    setPrefV(pv => ({ ...pv, [s.type]: nv }));
  }, [shapes]);

  const cycleFont = useCallback((id, dir) => {
    const ws = window.getSelection();
    if (ws && !ws.isCollapsed && ws.rangeCount > 0) {
      const range = ws.getRangeAt(0);
      const anc = range.commonAncestorContainer;
      const ceEl = (anc.nodeType === 3 ? anc.parentElement : anc).closest?.("[contenteditable]");
      if (ceEl) {
        const base = selFont !== null ? selFont : (shapes.find(x => x.id === id)?.font || 0);
        let nf = (base + dir) % FONTS.length; if (nf < 0) nf = FONTS.length - 1;
        setSelFont(nf);
        const span = document.createElement("span");
        span.style.fontFamily = FONTS[nf].family;
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
        ws.removeAllRanges();
        const nr = document.createRange(); nr.selectNodeContents(span); ws.addRange(nr);
        const key = ceEl.dataset.textKey;
        if (key) dirtyText.current = { id, key };
        return;
      }
    }
    setSelFont(null);
    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      let nf = ((s.font || 0) + dir) % FONTS.length; if (nf < 0) nf = FONTS.length - 1;
      return { ...s, font: nf };
    }));
  }, [shapes, selFont]);

  const delShape = useCallback(() => {
    flushDirtyText();
    push(shapes.filter(s => !selAll.has(s.id)));
    setSel(null); setSelAll(new Set());
  }, [shapes, push, selAll, flushDirtyText]);

  const onDrop = useCallback(e => {
    e.preventDefault(); const info = dRef.current; if (!info) return;
    const pt = toCanvas(e.clientX, e.clientY);
    const ns = { id: uid(), type: info.type, x: pt.x - info.w / 2, y: pt.y - info.h / 2, w: info.w, h: info.h, variant: prefV[info.type] || 0, texts: {}, font: 0 };
    const sn = snap(ns, shapes); if (sn.x !== null) ns.x = sn.x; if (sn.y !== null) ns.y = sn.y;
    push([...shapes, ns]); setSel(ns.id); setSelAll(new Set([ns.id])); dRef.current = null;
  }, [shapes, push, prefV, toCanvas]);

  /* ---- DEVICE CANVAS HEIGHT ---- */
  const deviceH = useMemo(() => {
    if (device === "free") return 0;
    return shapes.reduce((h, s) => h + s.h + (device === "desktop" ? 16 : 12), device === "desktop" ? 32 : 16) + (device === "desktop" ? 32 : 16);
  }, [shapes, device]);

  const onDown = useCallback((e, s) => {
    e.stopPropagation(); flushDirtyText();
    if (e.shiftKey) {
      setSelAll(prev => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n });
      if (!sel) setSel(s.id);
    } else {
      if (s.group) {
        const members = shapes.filter(x => x.group === s.group);
        setSelAll(new Set(members.map(x => x.id)));
      } else {
        setSelAll(new Set([s.id]));
      }
      setSel(s.id);
    }
    setDrag(s.id);
    const pt = toCanvas(e.clientX, e.clientY);
    setOff({ x: pt.x - s.x, y: pt.y - s.y });
  }, [toCanvas, flushDirtyText, sel, shapes]);

  const onMove = useCallback(e => {
    if (pan) {
      setCam(c => ({ ...c, x: c.x + (e.clientX - pan.x), y: c.y + (e.clientY - pan.y) }));
      setPan({ x: e.clientX, y: e.clientY });
      return;
    }
    if (!drag && !rsz) return;
    const pt = toCanvas(e.clientX, e.clientY);
    if (rsz) {
      const s = shapes.find(x => x.id === rsz); if (!s) return;
      let nw = Math.max(40, pt.x - s.x), nh = Math.max(20, pt.y - s.y);
      if (e.shiftKey) { const ratio = s.w / s.h; if (nw / nh > ratio) nh = nw / ratio; else nw = nh * ratio; }
      setShapes(shapes.map(x => x.id === rsz ? { ...x, w: nw, h: nh } : x));
      return;
    }
    if (drag) {
      let nx = pt.x - off.x, ny = pt.y - off.y;
      const s = shapes.find(x => x.id === drag); if (!s) return;
      const others = shapes.filter(x => !selAll.has(x.id));
      const sn = snap({ ...s, x: nx, y: ny }, others);
      if (sn.x !== null) nx = sn.x; if (sn.y !== null) ny = sn.y;
      setGuides(sn.g);
      const ddx = nx - s.x, ddy = ny - s.y;
      setShapes(shapes.map(x => {
        if (x.id === drag) return { ...x, x: nx, y: ny };
        if (selAll.has(x.id)) return { ...x, x: x.x + ddx, y: x.y + ddy };
        return x;
      }));
    }
  }, [drag, rsz, shapes, off, pan, toCanvas, selAll]);

  const onUp = useCallback(() => {
    if (pan) setPan(null);
    if (drag) { setDrag(null); setGuides([]) }
    if (rsz) setRsz(null);
  }, [drag, rsz, pan]);

  const onDel = useCallback(() => {
    if (selAll.size === 0) return;
    push(shapes.filter(s => !selAll.has(s.id)));
    setSel(null); setSelAll(new Set());
  }, [selAll, shapes, push]);

  const dupShape = useCallback(() => {
    if (selAll.size === 0) return;
    const newGroup = selAll.size > 1 ? uid() : null;
    const duped = shapes.filter(s => selAll.has(s.id)).map(s => ({ ...s, id: uid(), x: s.x + 20, y: s.y + 20, texts: { ...(s.texts || {}) }, group: newGroup || s.group }));
    push([...shapes, ...duped]);
    setSelAll(new Set(duped.map(s => s.id))); setSel(duped[0]?.id || null);
  }, [selAll, shapes, push]);

  /* ---- KEYBOARD ---- */
  useKeyboard({ onDel, undo, redo, dupShape, selAll, setShapes });

  /* ---- WHEEL: pan & zoom ---- */
  useEffect(() => {
    const el = cRef.current; if (!el) return;
    const h = e => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        const dz = e.deltaY > 0 ? 0.92 : 1.08;
        setCam(c => { const nz = Math.max(.15, Math.min(4, c.z * dz)); return { x: mx - (mx - c.x) * (nz / c.z), y: my - (my - c.y) * (nz / c.z), z: nz } });
      } else {
        setCam(c => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

  /* ---- PANEL ITEM ORDERING ---- */
  const catItems = useMemo(() => {
    const base = (LIB.find(c => c.cat === expCat)?.items || []);
    const ord = libOrd[expCat];
    if (!ord) return base;
    const ordered = ord.map(t => base.find(i => i.type === t)).filter(Boolean);
    const rest = base.filter(i => !ord.includes(i.type));
    return [...ordered, ...rest];
  }, [expCat, libOrd]);

  const reorderLib = useCallback((fromType, toType) => {
    setLibOrd(prev => {
      const base = (LIB.find(c => c.cat === expCat)?.items || []).map(i => i.type);
      const cur = prev[expCat] || base;
      const arr = [...cur];
      const fi = arr.indexOf(fromType), ti = arr.indexOf(toType);
      if (fi < 0 || ti < 0 || fi === ti) return prev;
      arr.splice(fi, 1); arr.splice(ti, 0, fromType);
      return { ...prev, [expCat]: arr };
    });
  }, [expCat]);

  const p = PAL[pal];
  const zoomPct = Math.round(cam.z * 100);

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: p.bg, fontFamily: "'DM Sans',system-ui,sans-serif", color: p.tx, transition: "background .4s,color .4s" }}>
      <link href={FONT_URL} rel="stylesheet" />

      <Header pal={pal} setPal={setPal} device={device} setDevice={setDevice} shapes={shapes} setShapes={setShapes} setCam={setCam} clearAll={clearAll} exportPng={exportPng} exportJSON={exportJSON} importJSON={importJSON} undo={undo} redo={redo} p={p} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <LibrarySidebar expCat={expCat} setExpCat={setExpCat} catItems={catItems} prefV={prefV} p={p} pDrag={pDrag} setPDrag={setPDrag} dRef={dRef} reorderLib={reorderLib} lastReorder={lastReorder} />

        {/* CANVAS */}
        <main style={{ flex: 1, display: "flex", alignItems: device === "free" ? "stretch" : "flex-start", justifyContent: "center", overflow: device !== "free" ? "auto" : "hidden", background: device !== "free" ? p.su : "transparent", padding: device !== "free" ? "32px 40px" : "0" }}
          onDragOver={e => e.preventDefault()} onDrop={onDrop} role="application" aria-label="Design canvas">
          <div ref={cRef} onDrop={onDrop} onDragOver={e => e.preventDefault()} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            onMouseDown={e => {
              if (e.button === 1) { e.preventDefault(); setPan({ x: e.clientX, y: e.clientY }) }
              if (e.button === 0 && (e.target === cRef.current || e.target.closest("[data-c]"))) { flushDirtyText(); setSel(null); setSelAll(new Set()); setSelFont(null) }
            }}
            onContextMenu={e => e.preventDefault()}
            style={{ ...(device === "free" ? { flex: 1 } : device === "desktop" ? { width: 1280, flexShrink: 0 } : { width: 390, flexShrink: 0 }), height: device === "phone" ? 844 : device === "desktop" ? Math.max(720, (deviceH || 720)) : undefined, minHeight: device === "desktop" ? 720 : undefined, position: "relative", overflow: "hidden", cursor: pan ? "grabbing" : "default", borderRadius: device !== "free" ? 16 : 0, border: device !== "free" ? `1px solid ${p.bd}` : "none", boxShadow: device !== "free" ? `0 4px 24px ${p.tx}08` : "none", background: device !== "free" ? p.bg : "transparent" }}>

            {/* dot grid */}
            <svg data-c="1" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} aria-hidden="true">
              <defs><pattern id="dots" x={cam.x % 20} y={cam.y % 20} width={20 * cam.z} height={20 * cam.z} patternUnits="userSpaceOnUse"><circle cx={10 * cam.z} cy={10 * cam.z} r={Math.max(.3, .5 * cam.z)} fill={p.mu} opacity=".1" /></pattern></defs>
              <rect data-c="1" width="100%" height="100%" fill="url(#dots)" style={{ pointerEvents: "all" }} />
            </svg>

            {/* snap guides */}
            {guides.map((g, i) => <div key={i} aria-hidden="true" style={{ position: "absolute", pointerEvents: "none", zIndex: 300, background: p.ac + "40", ...(g.t === "v" ? { left: g.p * cam.z + cam.x, top: 0, width: 1, height: "100%" } : { top: g.p * cam.z + cam.y, left: 0, height: 1, width: "100%" }) }} />)}

            {/* transform layer */}
            <div style={{ position: "absolute", left: 0, top: 0, ...(device === "free" ? { transform: `translate(${cam.x}px,${cam.y}px) scale(${cam.z})`, transformOrigin: "0 0", willChange: "transform" } : {}), width: device !== "free" ? "100%" : undefined, minHeight: deviceH || undefined }}>
              {shapes.map(s => (
                <ShapeItem key={s.id} s={s} sel={sel} selAll={selAll} drag={drag} device={device} selFont={selFont} p={p}
                  onDown={onDown} onText={updateText} cycle={cycle} cycleFont={cycleFont} delShape={delShape} setRsz={setRsz} />
              ))}
            </div>

            {/* empty state */}
            {shapes.length === 0 && (
              <div data-c="1" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <p style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 26, color: p.mu, opacity: .3, margin: "0 0 6px" }}>Drag components here</p>
                <p style={{ fontSize: 13, color: p.mu, opacity: .2 }}>Switch styles with arrows. Your taste is remembered.</p>
              </div>
            )}

            {/* selection info */}
            {selAll.size > 1 && <div data-no-export="1" style={{ position: "absolute", bottom: 12, left: 14, display: "flex", alignItems: "center", gap: 6, zIndex: 60, background: p.card, border: `1px solid ${p.bd}`, borderRadius: 8, padding: "4px 10px", fontSize: 10, color: p.mu, boxShadow: `0 2px 8px ${p.tx}08` }}>
              {selAll.size} selected <span style={{ opacity: .5, marginLeft: 4 }}>⌘G group · ⌘⇧G ungroup</span>
            </div>}

            {/* zoom controls */}
            <div data-no-export="1" style={{ position: "absolute", bottom: 12, right: 14, display: "flex", alignItems: "center", gap: 6, zIndex: 60 }} role="group" aria-label="Zoom controls">
              <button aria-label="Zoom out" onClick={() => setCam(c => { const nz = Math.max(.15, c.z - 0.15); const el = cRef.current.getBoundingClientRect(); const mx = el.width / 2, my = el.height / 2; return { x: mx - (mx - c.x) * (nz / c.z), y: my - (my - c.y) * (nz / c.z), z: nz } })} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${p.bd}`, background: p.card, color: p.mu, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", padding: 0 }}>-</button>
              <button aria-label={`Reset zoom (${zoomPct}%)`} onClick={() => setCam({ x: 0, y: 0, z: 1 })} title="Reset zoom" style={{ fontSize: 10, color: p.mu, background: p.card, border: `1px solid ${p.bd}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", minWidth: 42, textAlign: "center" }}>{zoomPct}%</button>
              <button aria-label="Zoom in" onClick={() => setCam(c => { const nz = Math.min(4, c.z + 0.15); const el = cRef.current.getBoundingClientRect(); const mx = el.width / 2, my = el.height / 2; return { x: mx - (mx - c.x) * (nz / c.z), y: my - (my - c.y) * (nz / c.z), z: nz } })} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${p.bd}`, background: p.card, color: p.mu, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", padding: 0 }}>+</button>
            </div>
          </div>
        </main>
      </div>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(128,128,128,.12);border-radius:2px}`}</style>
    </div>
  );
}
