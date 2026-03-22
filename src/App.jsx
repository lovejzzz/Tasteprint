import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { toPng } from "html-to-image";
import { STORE_KEY, FONTS, PAL, LIB } from "./constants";
import { load, uid, maxV, snap, validateImport, debounce, getReadableTextColor } from "./utils";
import { useKeyboard } from "./hooks/useKeyboard";
import { useTpApi } from "./hooks/useTpApi";
import { useDesigner } from "./hooks/useDesigner";
import { TpContext } from "./contexts/TpContext";
import { useViewport } from "./hooks/useViewport";
import { usePicky } from "./hooks/usePicky";
import Header from "./components/Header";
import PickyOverlay from "./components/PickyOverlay";
import LibrarySidebar from "./components/LibrarySidebar";
import ShapeItem from "./components/ShapeItem";
import MobileDrawer from "./components/MobileDrawer";
import "./global.css";
import "./canvas.css";

export default function App() {
  const { width: viewportWidth, mobile, reducedMotion } = useViewport();
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
  // Default to Starter for first-run velocity (designer-first onboarding).
  const [expCat, setExpCat] = useState("Starter");
  const [prefV, setPrefV] = useState(() => load("prefV", {}));
  const [cam, setCam] = useState({ x: 0, y: 0, z: 1 });
  const [pan, setPan] = useState(null);
  const [selFont, setSelFont] = useState(null);
  // Designer-first default: start constrained on Desktop instead of free-canvas mode.
  const [device, setDevice] = useState("desktop");
  const [libOrd, setLibOrd] = useState(() => load("libOrd", {}));
  const [pDrag, setPDrag] = useState(null);
  const [libOpen, setLibOpen] = useState(false);
  const cRef = useRef(null);
  const dRef = useRef(null);
  const dirtyText = useRef(null);
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const lastReorder = useRef(0);
  const camRef = useRef(cam);
  camRef.current = cam;
  const p = PAL[pal];
  const pRef = useRef(p);
  pRef.current = p;
  const selAllRef = useRef(selAll);
  selAllRef.current = selAll;
  const prefVRef = useRef(prefV);
  prefVRef.current = prefV;

  const {
    designMood, setDesignMood,
    styleSource, setStyleSource,
    candidates,
    lastRandomizeStats,
    randomize, randomizeAll, undoRandomize, undoDesign,
    toggleLock, copyStyle, cycleVariation, cycleMood,
    resetDesignerState,
  } = useDesigner({ shapesRef, prefVRef, pRef, selAllRef, setShapes, setPrefV });

  const resetTransientEditorState = useCallback(() => {
    setSel(null);
    setSelAll(new Set());
    setHist([]);
    setFuture([]);
    setCam({ x: 0, y: 0, z: 1 });
    resetDesignerState();
  }, [resetDesignerState]);

  /* ---- PERSIST (debounced to avoid thrashing during drag/resize) ---- */
  const persistRef = useRef(debounce((data) => {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }, 300));
  useEffect(() => {
    persistRef.current({ shapes, pal, prefV, gest, libOrd });
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

  const updateProp = useCallback((id, key, value) => {
    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const props = { ...(s.props || {}) };
      if (value === null || value === undefined) delete props[key];
      else props[key] = value;
      return { ...s, props };
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
  const palRef = useRef(pal);
  palRef.current = pal;
  const gestRef = useRef(gest);
  gestRef.current = gest;
  const exportJSON = useCallback(() => {
    flushDirtyText();
    const data = JSON.stringify({ shapes: shapesRef.current, pal: palRef.current, prefV: prefVRef.current, gest: gestRef.current }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "tasteprint-layout.json"; a.click();
    URL.revokeObjectURL(url);
  }, [flushDirtyText]);

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

          // Reset ephemeral editing state after import so old selections/history
          // never point to stale shape IDs from the previous document.
          resetTransientEditorState();
        } catch (err) {
          console.error("Failed to import JSON:", err);
        }
      };
      reader.onerror = () => console.error("Failed to read file");
      reader.readAsText(file);
    };
    input.click();
  }, [resetTransientEditorState]);

  const selRef = useRef(sel);
  selRef.current = sel;
  const exportPng = useCallback(() => {
    flushDirtyText();
    const el = cRef.current; if (!el) return;
    const prev = selRef.current; const prevAll = selAllRef.current;
    setSel(null); setSelAll(new Set());
    requestAnimationFrame(() => {
      toPng(el, { pixelRatio: 2, cacheBust: true, filter: n => !n?.dataset?.noExport })
        .then(url => {
          const a = document.createElement("a"); a.href = url; a.download = "tasteprint.png"; a.click();
        })
        .catch(err => console.error("PNG export failed:", err))
        .finally(() => { setSel(prev); setSelAll(prevAll) });
    });
  }, [flushDirtyText]);

  /* ---- CANVAS COORD HELPERS ---- */
  const deviceRef = useRef(device);
  deviceRef.current = device;
  const toCanvas = useCallback((cx, cy) => {
    const r = cRef.current.getBoundingClientRect();
    if (deviceRef.current !== "free") return { x: cx - r.left, y: cy - r.top };
    const c = camRef.current;
    return { x: (cx - r.left - c.x) / c.z, y: (cy - r.top - c.y) / c.z };
  }, []);

  const push = useCallback(ns => { setHist(h => [...h.slice(-40), shapesRef.current]); setFuture([]); setShapes(ns) }, []);
  const histRef = useRef(hist);
  histRef.current = hist;
  const futureRef = useRef(future);
  futureRef.current = future;
  const undo = useCallback(() => { const h = histRef.current; if (!h.length) return; setFuture(f => [...f, shapesRef.current]); setShapes(h[h.length - 1]); setHist(h.slice(0, -1)); }, []);
  const redo = useCallback(() => { const f = futureRef.current; if (!f.length) return; setHist(h => [...h, shapesRef.current]); setShapes(f[f.length - 1]); setFuture(f.slice(0, -1)); }, []);
  const clearAll = useCallback(() => {
    push([]);
    resetTransientEditorState();
  }, [push, resetTransientEditorState]);
  // nudge removed — was unused, caused lint warning with --max-warnings=0

  /* ── Picky Mode ── */
  const [pickyMode, setPickyMode] = useState(false);
  const picky = usePicky({ pRef, device, mobile });
  const pickyRef = useRef(picky);
  pickyRef.current = picky;

  const enterPicky = useCallback(() => {
    setPickyMode(true);
    pickyRef.current.enterPicky();
  }, []);

  const exitPicky = useCallback((assembledShapes) => {
    if (assembledShapes?.length) {
      push(assembledShapes);
      // Clean up _pickyDelay after entrance animation completes
      const maxDelay = assembledShapes.length * 120 + 500;
      setTimeout(() => {
        setShapes(prev => prev.map(s => s._pickyDelay != null ? { ...s, _pickyDelay: undefined } : s));
      }, maxDelay);
    }
    setPickyMode(false);
    pickyRef.current.cancelPicky();
  }, [push]);

  const cancelPicky = useCallback(() => {
    pickyRef.current.cancelPicky();
    setPickyMode(false);
  }, []);

  const cycle = useCallback((id, dir) => {
    setShapes(prev => {
      const s = prev.find(x => x.id === id); if (!s) return prev;
      const mx = maxV(s.type); let nv = ((s.variant || 0) + dir) % mx; if (nv < 0) nv = mx - 1;
      setPrefV(pv => ({ ...pv, [s.type]: nv }));
      return prev.map(x => x.id === id ? { ...x, variant: nv } : x);
    });
  }, []);

  const selFontRef = useRef(selFont);
  selFontRef.current = selFont;
  const cycleFont = useCallback((id, dir) => {
    const ws = window.getSelection();
    if (ws && !ws.isCollapsed && ws.rangeCount > 0) {
      const range = ws.getRangeAt(0);
      const anc = range.commonAncestorContainer;
      const ceEl = (anc.nodeType === 3 ? anc.parentElement : anc).closest?.("[contenteditable]");
      if (ceEl) {
        const base = selFontRef.current !== null ? selFontRef.current : (shapesRef.current.find(x => x.id === id)?.font || 0);
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
  }, []);

  const cycleFsize = useCallback((id, dir) => {
    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const cur = s.fsize || 1;
      const nf = Math.max(0.5, Math.min(2, +(cur + dir * 0.1).toFixed(2)));
      return { ...s, fsize: nf };
    }));
  }, []);

  /* randomize, randomizeAll, undoRandomize, undoDesign, toggleLock,
     copyStyle, cycleVariation, cycleMood — all provided by useDesigner */

  // delShape: unified delete handler used by both the toolbar button (ShapeItem)
  // and keyboard shortcut (useKeyboard, via onDel alias below).
  const delShape = useCallback(() => {
    if (selAllRef.current.size === 0) return;
    flushDirtyText();
    push(shapesRef.current.filter(s => !selAllRef.current.has(s.id)));
    setSel(null); setSelAll(new Set());
  }, [push, flushDirtyText]);

  const onDrop = useCallback(e => {
    e.preventDefault(); const info = dRef.current; if (!info) return;
    const pt = toCanvas(e.clientX, e.clientY);
    const cur = shapesRef.current;
    const ns = { id: uid(), type: info.type, x: pt.x - info.w / 2, y: pt.y - info.h / 2, w: info.w, h: info.h, variant: prefVRef.current[info.type] || 0, texts: {}, font: 0 };
    const sn = snap(ns, cur); if (sn.x !== null) ns.x = sn.x; if (sn.y !== null) ns.y = sn.y;
    push([...cur, ns]); setSel(ns.id); setSelAll(new Set([ns.id])); dRef.current = null;
  }, [push, toCanvas]);

  /* Tap-to-add for mobile */
  const addShape = useCallback((item) => {
    const cur = shapesRef.current;
    const lastY = cur.length ? Math.max(...cur.map(s => s.y + s.h)) + 20 : 40;
    const vw = viewportWidth;
    const ns = { id: uid(), type: item.type, x: Math.max(10, vw / 2 - item.w / 2), y: lastY, w: Math.min(item.w, vw - 20), h: item.h, variant: prefVRef.current[item.type] || 0, texts: {}, font: 0 };
    push([...cur, ns]); setSel(ns.id); setSelAll(new Set([ns.id]));
  }, [push, viewportWidth]);

  const addStarterScreen = useCallback(() => {
    const starter = LIB.find(c => c.cat === "Starter")?.items || [];
    const navbar = starter.find(i => i.type === "navbar");
    const hero = starter.find(i => i.type === "hero");
    const button = starter.find(i => i.type === "button");
    if (!navbar || !hero || !button) return;

    const isPhone = device === "phone" || mobile;
    const canvasWidth = isPhone ? 390 : 1280;
    const pad = isPhone ? 16 : 32;
    const gap = isPhone ? 12 : 16;
    const maxW = canvasWidth - pad * 2;

    const fit = (item) => {
      const scale = Math.min(1, maxW / item.w);
      return { w: item.w * scale, h: item.h * scale };
    };

    const n = fit(navbar);
    const h = fit(hero);
    const b = fit(button);

    const firstY = pad;
    const pv = prefVRef.current;
    const newShapes = [
      { id: uid(), type: navbar.type, x: canvasWidth / 2 - n.w / 2, y: firstY, w: n.w, h: n.h, variant: pv[navbar.type] || 0, texts: {}, font: 0 },
      { id: uid(), type: hero.type, x: canvasWidth / 2 - h.w / 2, y: firstY + n.h + gap, w: h.w, h: h.h, variant: pv[hero.type] || 0, texts: {}, font: 0 },
      { id: uid(), type: button.type, x: canvasWidth / 2 - b.w / 2, y: firstY + n.h + gap + h.h + gap, w: b.w, h: b.h, variant: pv[button.type] || 0, texts: {}, font: 0 },
    ];

    push(newShapes);
    setSel(newShapes[1].id);
    setSelAll(new Set([newShapes[1].id]));
  }, [device, mobile, push]);

  /* ---- DEVICE CANVAS HEIGHT ---- */
  // Uses actual shape positions (y + h) instead of summing heights, so overlapping
  // shapes don't inflate the canvas and gaps between shapes are respected.
  const deviceH = useMemo(() => {
    if (device === "free" || shapes.length === 0) return 0;
    const pad = device === "desktop" ? 32 : 16;
    const maxBottom = shapes.reduce((m, s) => Math.max(m, s.y + s.h), 0);
    return maxBottom + pad;
  }, [shapes, device]);

  /* Select only — no drag. Used by capture-phase handler so clicks inside
     interactive components still set the shape as selected. */
  const onSelect = useCallback((s) => {
    flushDirtyText();
    if (s.group) {
      const members = shapesRef.current.filter(x => x.group === s.group);
      setSelAll(new Set(members.map(x => x.id)));
    } else {
      setSelAll(new Set([s.id]));
    }
    setSel(s.id);
  }, [flushDirtyText]);

  const onDown = useCallback((e, s) => {
    e.stopPropagation(); flushDirtyText();
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    if (e.shiftKey) {
      setSelAll(prev => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n });
      if (!selRef.current) setSel(s.id);
    } else {
      if (s.group) {
        const members = shapesRef.current.filter(x => x.group === s.group);
        setSelAll(new Set(members.map(x => x.id)));
      } else {
        setSelAll(new Set([s.id]));
      }
      setSel(s.id);
    }
    setDrag(s.id);
    const pt = toCanvas(cx, cy);
    setOff({ x: pt.x - s.x, y: pt.y - s.y });
  }, [toCanvas, flushDirtyText]);

  const dragRef = useRef(drag);
  dragRef.current = drag;
  const rszRef = useRef(rsz);
  rszRef.current = rsz;
  const offRef = useRef(off);
  offRef.current = off;
  const panRef = useRef(pan);
  panRef.current = pan;
  const onMove = useCallback(e => {
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    if (cx === undefined) return;
    const curPan = panRef.current;
    if (curPan) {
      setCam(c => ({ ...c, x: c.x + (cx - curPan.x), y: c.y + (cy - curPan.y) }));
      setPan({ x: cx, y: cy });
      return;
    }
    const curDrag = dragRef.current;
    const curRsz = rszRef.current;
    if (!curDrag && !curRsz) return;
    const pt = toCanvas(cx, cy);
    if (curRsz) {
      setShapes(prev => {
        const s = prev.find(x => x.id === curRsz); if (!s) return prev;
        let nw = Math.max(40, pt.x - s.x), nh = Math.max(20, pt.y - s.y);
        if (e.shiftKey) { const ratio = s.w / s.h; if (nw / nh > ratio) nh = nw / ratio; else nw = nh * ratio; }
        return prev.map(x => x.id === curRsz ? { ...x, w: nw, h: nh } : x);
      });
      return;
    }
    if (curDrag) {
      const curOff = offRef.current;
      setShapes(prev => {
        const s = prev.find(x => x.id === curDrag); if (!s) return prev;
        let nx = pt.x - curOff.x, ny = pt.y - curOff.y;
        const sa = selAllRef.current;
        const others = prev.filter(x => !sa.has(x.id));
        const sn = snap({ ...s, x: nx, y: ny }, others);
        if (sn.x !== null) nx = sn.x; if (sn.y !== null) ny = sn.y;
        setGuides(sn.g);
        const ddx = nx - s.x, ddy = ny - s.y;
        return prev.map(x => {
          if (x.id === curDrag) return { ...x, x: nx, y: ny };
          if (sa.has(x.id)) return { ...x, x: x.x + ddx, y: x.y + ddy };
          return x;
        });
      });
    }
  }, [toCanvas]);

  const onUp = useCallback(() => {
    if (panRef.current) setPan(null);
    if (dragRef.current) { setDrag(null); setGuides([]) }
    if (rszRef.current) setRsz(null);
  }, []);

  // Stable touch-move handler: reads drag/rsz from refs instead of closing
  // over state (same pattern as onMove/onUp from Runs 28-32).
  const onTouchMove = useCallback(e => {
    if (dragRef.current || rszRef.current) {
      e.preventDefault();
      onMove(e.touches[0]);
    }
  }, [onMove]);

  // onDel is an alias for delShape — keeps the useKeyboard API name clear
  // while avoiding a duplicate implementation.
  const onDel = delShape;

  // Zoom helper: applies a zoom step centered on the canvas midpoint.
  // Used by both zoom-in and zoom-out buttons to avoid duplicated logic.
  const zoomBy = useCallback((step) => {
    setCam(c => {
      const nz = Math.max(0.15, Math.min(4, c.z + step));
      const el = cRef.current.getBoundingClientRect();
      const mx = el.width / 2, my = el.height / 2;
      return { x: mx - (mx - c.x) * (nz / c.z), y: my - (my - c.y) * (nz / c.z), z: nz };
    });
  }, []);

  const dupShape = useCallback(() => {
    if (selAllRef.current.size === 0) return;
    const cur = shapesRef.current;
    const sa = selAllRef.current;
    const newGroup = sa.size > 1 ? uid() : null;
    const duped = cur.filter(s => sa.has(s.id)).map(s => ({ ...s, id: uid(), x: s.x + 20, y: s.y + 20, texts: { ...(s.texts || {}) }, props: { ...(s.props || {}) }, group: newGroup || s.group }));
    push([...cur, ...duped]);
    setSelAll(new Set(duped.map(s => s.id))); setSel(duped[0]?.id || null);
  }, [push]);

  /* ---- KEYBOARD ---- */
  useKeyboard({ onDel, undo, redo, dupShape, selAll, setShapes, sel, randomize, randomizeAll, undoRandomize, cycleMood, toggleLock, undoDesign, cycleVariation, candidates, setStyleSource });

  /* ---- WHEEL: pan & zoom ---- */
  useEffect(() => {
    const el = cRef.current; if (!el) return;
    const h = e => {
      if (e.target.closest('[data-ide-scroll]')) return;
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
  const zoomPct = Math.round(cam.z * 100);

  /* ---- tp API for Live IDE ---- */
  const tp = useTpApi({
    shapesRef, palRef, deviceRef,
    setShapes, setHist, setFuture, setPal, setDevice,
    resetTransientEditorState,
  });

  // Expose tp API on window for console scripting (dev only).
  // See API.md for the full reference.
  useEffect(() => { window.tp = tp; return () => { delete window.tp; }; }, [tp]);

  return (
    <TpContext.Provider value={tp}>
    <div className="tp-app-root" style={{ background: p.bg, color: p.tx }}>
      {/* Skip link: WCAG 2.4.1 — lets keyboard users jump past toolbar to canvas */}
      <a href="#tp-canvas" className="tp-skip-link" style={{ background: p.ac, color: getReadableTextColor(p.ac) }}>Skip to canvas</a>
      <Header pal={pal} setPal={setPal} device={device} setDevice={setDevice} shapeCount={shapes.length} setShapes={setShapes} setCam={setCam} clearAll={clearAll} exportPng={exportPng} exportJSON={exportJSON} importJSON={importJSON} undo={undo} redo={redo} canUndo={hist.length > 0} canRedo={future.length > 0} p={p} mobile={mobile} randomizeAll={randomizeAll} designMood={designMood} setDesignMood={setDesignMood} lastRandomizeStats={lastRandomizeStats} pickyMode={pickyMode} enterPicky={enterPicky} cancelPicky={cancelPicky} />

      {pickyMode ? (
        <PickyOverlay picky={picky} p={p} mobile={mobile} device={device} onExit={exitPicky} onCancel={cancelPicky} />
      ) : (
      <>
      <div className={`tp-layout${mobile ? " tp-layout--mobile" : ""}`}>
        {!mobile && <LibrarySidebar expCat={expCat} setExpCat={setExpCat} catItems={catItems} prefV={prefV} p={p} pDrag={pDrag} setPDrag={setPDrag} dRef={dRef} reorderLib={reorderLib} lastReorder={lastReorder} />}

        {/* CANVAS */}
        <main className={`tp-canvas-main${device !== "free" && !mobile ? " tp-canvas-main--device" : ""}${mobile ? " tp-canvas-main--mobile" : ""}`}
          style={{ background: device !== "free" && !mobile ? p.su : "transparent" }}
          id="tp-canvas" onDragOver={e => e.preventDefault()} onDrop={onDrop} role="application" aria-label="Design canvas">
          <div ref={cRef} onDrop={onDrop} onDragOver={e => e.preventDefault()} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            onTouchMove={onTouchMove}
            onTouchEnd={onUp}
            onMouseDown={e => {
              if (e.button === 1) { e.preventDefault(); setPan({ x: e.clientX, y: e.clientY }) }
              if (e.button === 0 && !e.target.closest("[data-shape]") && (e.target === cRef.current || e.target.closest("[data-c]"))) { flushDirtyText(); setSel(null); setSelAll(new Set()); setSelFont(null) }
            }}
            onContextMenu={e => e.preventDefault()}
            className={`tp-canvas${device === "free" || mobile ? " tp-canvas--free" : ""}${mobile ? " tp-canvas--mobile" : ""}${!mobile && device === "desktop" ? " tp-canvas--desktop tp-canvas--device-frame" : ""}${!mobile && device === "phone" ? " tp-canvas--phone tp-canvas--device-frame" : ""}`}
            style={{ height: !mobile && device === "desktop" ? Math.max(720, (deviceH || 720)) : undefined, minHeight: !mobile && device === "desktop" ? 720 : undefined, cursor: pan ? "grabbing" : "default", borderColor: device !== "free" && !mobile ? p.bd : undefined, boxShadow: device !== "free" && !mobile ? `0 4px 24px ${p.tx}08` : "none", background: device !== "free" && !mobile ? p.bg : "transparent" }}>

            {/* dot grid */}
            <svg data-c="1" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} aria-hidden="true">
              <defs><pattern id="dots" x={cam.x % 20} y={cam.y % 20} width={20 * cam.z} height={20 * cam.z} patternUnits="userSpaceOnUse"><circle cx={10 * cam.z} cy={10 * cam.z} r={Math.max(.3, .5 * cam.z)} fill={p.mu} opacity=".1" /></pattern></defs>
              <rect data-c="1" width="100%" height="100%" fill="url(#dots)" style={{ pointerEvents: "all" }} />
            </svg>

            {/* snap guides */}
            {guides.map((g, i) => <div key={i} aria-hidden="true" className="tp-snap-guide" style={{ background: p.ac + "40", ...(g.t === "v" ? { left: g.p * cam.z + cam.x, top: 0, width: 1, height: "100%" } : { top: g.p * cam.z + cam.y, left: 0, height: 1, width: "100%" }) }} />)}

            {/* transform layer */}
            <div style={{ position: "absolute", left: 0, top: 0, ...(device === "free" && !mobile ? { transform: `translate(${cam.x}px,${cam.y}px) scale(${cam.z})`, transformOrigin: "0 0", willChange: "transform" } : mobile ? { width: "100%", padding: "10px" } : {}), width: device !== "free" && !mobile ? "100%" : undefined, minHeight: !mobile ? deviceH || undefined : undefined }}>
              {shapes.map(s => (
                <ShapeItem key={s.id} s={s} sel={sel} selAll={selAll} drag={drag} device={device} selFont={selFont} p={p} reducedMotion={reducedMotion}
                  onDown={onDown} onSelect={onSelect} onText={updateText} onProp={updateProp} cycle={cycle} cycleFont={cycleFont} cycleFsize={cycleFsize} randomize={randomize} styleSource={styleSource} setStyleSource={setStyleSource} copyStyle={copyStyle} delShape={delShape} setRsz={setRsz} />
              ))}
            </div>

            {/* empty state */}
            {shapes.length === 0 && (
              <div data-c="1" className="tp-empty" style={{ padding: mobile ? 24 : 0 }}>
                <p className={`tp-empty-title${mobile ? " tp-empty-title--mobile" : ""}`} style={{ color: p.mu }}>
                  {mobile ? "Tap + to start your first screen" : "Build your first screen in 2 minutes"}
                </p>
                <p className={`tp-empty-sub${mobile ? " tp-empty-sub--mobile" : ""}`} style={{ color: p.mu }}>
                  {mobile ? "Pick a device → add a few blocks → export" : "Pick a device, drop a few blocks, then export PNG or JSON"}
                </p>
                <div className={`tp-empty-steps${mobile ? " tp-empty-steps--mobile" : ""}`} style={{ color: p.mu }}>
                  <span>{mobile ? "1) Choose Phone or Desktop" : "1) Start in Desktop or Phone (use Free later if needed)"}</span>
                  <span>{mobile ? "2) Add Hero + Navbar + Button" : "2) Drag Hero + Navbar + Button from the library"}</span>
                  <span>3) Randomize once, then export</span>
                </div>
                <button
                  type="button"
                  onClick={addStarterScreen}
                  className={`tp-empty-btn${mobile ? " tp-empty-btn--mobile" : ""}`}
                  style={{ border: `1px solid ${p.bd}`, background: p.card, color: p.tx }}
                >
                  Start with Hero + Navbar + Button
                </button>
                <button
                  type="button"
                  onClick={enterPicky}
                  className={`tp-empty-btn${mobile ? " tp-empty-btn--mobile" : ""}`}
                  style={{ border: `1px solid ${p.ac}30`, background: "transparent", color: p.ac, marginTop: 8 }}
                >
                  Or try Picky — build step by step
                </button>
              </div>
            )}

            {/* selection info */}
            {selAll.size > 1 && <div data-no-export="1" className={`tp-sel-info${mobile ? " tp-sel-info--mobile" : ""}`} style={{ background: p.card, border: `1px solid ${p.bd}`, color: p.mu, boxShadow: `0 2px 8px ${p.tx}08` }}>
              {selAll.size} selected {!mobile && <span style={{ opacity: .5, marginLeft: 4 }}>⌘G group · ⌘⇧G ungroup</span>}
            </div>}

            {/* zoom controls - hide on mobile */}
            {!mobile && <div data-no-export="1" className="tp-zoom-group" role="group" aria-label="Zoom controls">
              <button aria-label="Zoom out" onClick={() => zoomBy(-0.15)} className="tp-zoom-btn" style={{ border: `1px solid ${p.bd}`, background: p.card, color: p.mu }}>-</button>
              <button aria-label={`Reset zoom (${zoomPct}%)`} onClick={() => setCam({ x: 0, y: 0, z: 1 })} title="Reset zoom" className="tp-zoom-label" style={{ color: p.mu, background: p.card, border: `1px solid ${p.bd}` }}>{zoomPct}%</button>
              <button aria-label="Zoom in" onClick={() => zoomBy(0.15)} className="tp-zoom-btn" style={{ border: `1px solid ${p.bd}`, background: p.card, color: p.mu }}>+</button>
            </div>}
          </div>
        </main>
      </div>

      {/* Mobile bottom drawer - component library */}
      {mobile && <MobileDrawer libOpen={libOpen} setLibOpen={setLibOpen} expCat={expCat} setExpCat={setExpCat} catItems={catItems} prefV={prefV} p={p} viewportWidth={viewportWidth} addShape={addShape} />}
      </>
      )}

    </div>
    </TpContext.Provider>
  );
}
