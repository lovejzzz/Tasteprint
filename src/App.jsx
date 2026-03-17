import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { toPng } from "html-to-image";
import { STORE_KEY, FONTS, FONT_URL, PAL, LIB, HAS_TEXT, HAS_PROPS, VARIANTS, DEFAULT_PROPS } from "./constants";
import { load, uid, maxV, varName, snap, validateImport, designerRandomize, getCuratedPreset, designScore, generateDesignDNA, DESIGN_MOODS } from "./utils";
import { useKeyboard } from "./hooks/useKeyboard";
import { TpContext } from "./contexts/TpContext";
import Header from "./components/Header";
import LibrarySidebar from "./components/LibrarySidebar";
import ShapeItem from "./components/ShapeItem";
import C from "./components/ComponentRenderer";

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

export default function App() {
  const mobile = useIsMobile();
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
  const [libOpen, setLibOpen] = useState(false);
  const [designMood, setDesignMood] = useState("auto");
  const rndUndo = useRef(null); // { id, prev: shapeSnapshot, prevPrefV }
  const [hasRndUndo, setHasRndUndo] = useState(false);
  const [styleSource, setStyleSource] = useState(null); // shape ID for style transfer
  const [lockedShapes, setLockedShapes] = useState(new Set()); // locked shape IDs (skip randomize-all)
  const [candidates, setCandidates] = useState({}); // { [shapeId]: [candidate1, candidate2, candidate3] }
  const [candidateIdx, setCandidateIdx] = useState({}); // { [shapeId]: currentIndex }
  const [designHistory, setDesignHistory] = useState({}); // { [shapeId]: [{ variant, font, fsize, props, dStyles }, ...] } max 5
  const [lastRandomizeStats, setLastRandomizeStats] = useState(null); // { count, skipped, timestamp }
  const curatedIdx = useRef({}); // { [shapeId]: nextPresetIndex }
  const cRef = useRef(null);
  const dRef = useRef(null);
  const dirtyText = useRef(null);
  const lastReorder = useRef(0);
  const camRef = useRef(cam);
  camRef.current = cam;
  const p = PAL[pal];

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

  const cycleFsize = useCallback((id, dir) => {
    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const cur = s.fsize || 1;
      const nf = Math.max(0.5, Math.min(2, +(cur + dir * 0.1).toFixed(2)));
      return { ...s, fsize: nf };
    }));
  }, []);

  const randomize = useCallback((id) => {
    // Determine targets: if multi-selected, randomize all selected; otherwise just the one
    const targets = selAll.size > 1 && selAll.has(id) ? [...selAll] : [id];

    // Snapshot for undo (store all affected shapes)
    const snapShapes = shapes.filter(s => targets.includes(s.id));
    if (snapShapes.length) {
      rndUndo.current = { ids: targets, prevShapes: snapShapes.map(s => ({ ...s })), prevPrefV: { ...prefV } };
      setHasRndUndo(true);
    }

    const targetSet = new Set(targets);
    const otherShapes = shapes.filter(s => !targetSet.has(s.id));

    // Generate 3 candidate designs for single-target randomization
    if (targets.length === 1) {
      const shape = shapes.find(s => s.id === id);
      if (!shape) return;
      // Push current design state onto per-component history (cap at 5)
      setDesignHistory(prev => {
        const stack = prev[id] || [];
        const entry = { variant: shape.variant || 0, font: shape.font || 0, fsize: shape.fsize || 1, props: { ...(shape.props || {}) }, dStyles: shape.dStyles ? { ...shape.dStyles } : undefined };
        return { ...prev, [id]: [...stack.slice(-(5 - 1)), entry] };
      });
      const defaults = DEFAULT_PROPS[shape.type];
      const allCandidates = [];
      for (let c = 0; c < 3; c++) {
        const ci = (curatedIdx.current[id] || 0) + c;
        const preset = getCuratedPreset(shape.type, ci);
        const dna = generateDesignDNA(p, designMood);
        const rnd = designerRandomize(shape.type, p, defaults, designMood, otherShapes, dna, shape.w, shape.h);
        if (preset) {
          allCandidates.push({ variant: preset.variant, font: preset.font, fsize: preset.fsize, props: { ...(shape.props || {}), ...rnd.props }, dStyles: rnd.dStyles });
        } else {
          allCandidates.push({ variant: rnd.variant, font: rnd.font, fsize: rnd.fsize, props: { ...(shape.props || {}), ...rnd.props }, dStyles: rnd.dStyles });
        }
      }
      curatedIdx.current = { ...curatedIdx.current, [id]: (curatedIdx.current[id] || 0) + 3 };

      // Store candidates and apply first one
      setCandidates(prev => ({ ...prev, [id]: allCandidates }));
      setCandidateIdx(prev => ({ ...prev, [id]: 0 }));
      const first = allCandidates[0];
      const newPrefV = { ...prefV, [shape.type]: first.variant };
      setShapes(prev => prev.map(s => s.id === id ? { ...s, variant: first.variant, font: first.font, fsize: first.fsize, props: first.props, dStyles: first.dStyles } : s));
      setPrefV(newPrefV);
      return;
    }

    // Multi-target: no candidate cycling, just randomize directly
    const dna = generateDesignDNA(p, designMood);
    const newPrefV = { ...prefV };
    setShapes(prev => {
      const updated = [...prev];
      const alreadyRandomized = [...otherShapes];
      for (let i = 0; i < updated.length; i++) {
        const s = updated[i];
        if (!targetSet.has(s.id)) continue;
        const defaults = DEFAULT_PROPS[s.type];
        const result = designerRandomize(s.type, p, defaults, designMood, alreadyRandomized, dna, s.w, s.h);
        updated[i] = { ...s, variant: result.variant, font: result.font, fsize: result.fsize, props: { ...(s.props || {}), ...result.props }, dStyles: result.dStyles };
        newPrefV[s.type] = result.variant;
        alreadyRandomized.push(updated[i]);
      }
      return updated;
    });
    setPrefV(newPrefV);
    // Clear any lingering candidates for multi-target
    for (const tid of targets) {
      setCandidates(prev => { const n = { ...prev }; delete n[tid]; return n; });
      setCandidateIdx(prev => { const n = { ...prev }; delete n[tid]; return n; });
    }
  }, [shapes, p, designMood, prefV, selAll]);

  const cycleVariation = useCallback((shapeId) => {
    const cands = candidates[shapeId];
    if (!cands || cands.length <= 1) return;
    const curIdx = (candidateIdx[shapeId] || 0);
    const nextIdx = (curIdx + 1) % cands.length;
    setCandidateIdx(prev => ({ ...prev, [shapeId]: nextIdx }));
    const cand = cands[nextIdx];
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;
    const newPrefV = { ...prefV, [shape.type]: cand.variant };
    setShapes(prev => prev.map(s => s.id === shapeId ? { ...s, variant: cand.variant, font: cand.font, fsize: cand.fsize, props: cand.props, dStyles: cand.dStyles } : s));
    setPrefV(newPrefV);
  }, [candidates, candidateIdx, shapes, prefV]);

  const randomizeAll = useCallback(() => {
    if (shapes.length === 0) return;
    rndUndo.current = { ids: shapes.map(s => s.id), prevShapes: shapes.map(s => ({ ...s })), prevPrefV: { ...prefV } };
    setHasRndUndo(true);
    const dna = generateDesignDNA(p, designMood);
    const newPrefV = { ...prefV };
    let randomizedCount = 0;
    let lockedCount = 0;
    setShapes(prev => {
      const updated = [...prev];
      const already = [];
      for (let i = 0; i < updated.length; i++) {
        const s = updated[i];
        // Skip locked shapes — preserve their current design
        if (lockedShapes.has(s.id)) { already.push(s); lockedCount++; continue; }
        const defaults = DEFAULT_PROPS[s.type];
        const result = designerRandomize(s.type, p, defaults, designMood, already, dna, s.w, s.h);
        updated[i] = { ...s, variant: result.variant, font: result.font, fsize: result.fsize, props: { ...(s.props || {}), ...result.props }, dStyles: result.dStyles };
        newPrefV[s.type] = result.variant;
        already.push(updated[i]);
        randomizedCount++;
      }
      return updated;
    });
    setPrefV(newPrefV);
    setLastRandomizeStats({ count: randomizedCount, skipped: lockedCount, timestamp: Date.now() });
  }, [shapes, p, designMood, prefV, lockedShapes]);

  const undoRandomize = useCallback(() => {
    if (!rndUndo.current) return;
    const { ids, prevShapes, prevPrefV } = rndUndo.current;
    const prevMap = new Map(prevShapes.map(s => [s.id, s]));
    setShapes(sh => sh.map(s => prevMap.has(s.id) ? prevMap.get(s.id) : s));
    setPrefV(prevPrefV);
    rndUndo.current = null;
    setHasRndUndo(false);
  }, []);

  const undoDesign = useCallback((shapeId) => {
    setDesignHistory(prev => {
      const stack = prev[shapeId];
      if (!stack || stack.length === 0) return prev;
      const entry = stack[stack.length - 1];
      // Apply the popped design state
      setShapes(sh => sh.map(s => {
        if (s.id !== shapeId) return s;
        return { ...s, variant: entry.variant, font: entry.font, fsize: entry.fsize, props: entry.props, dStyles: entry.dStyles };
      }));
      setPrefV(pv => {
        const shape = shapes.find(s => s.id === shapeId);
        if (!shape) return pv;
        return { ...pv, [shape.type]: entry.variant };
      });
      // Clear candidates since we're restoring a previous state
      setCandidates(c => { const n = { ...c }; delete n[shapeId]; return n; });
      setCandidateIdx(ci => { const n = { ...ci }; delete n[shapeId]; return n; });
      return { ...prev, [shapeId]: stack.slice(0, -1) };
    });
  }, [shapes]);

  const toggleLock = useCallback((shapeId) => {
    setLockedShapes(prev => {
      const next = new Set(prev);
      if (next.has(shapeId)) next.delete(shapeId); else next.add(shapeId);
      return next;
    });
  }, []);

  const copyStyle = useCallback((sourceId, targetId) => {
    const src = shapes.find(x => x.id === sourceId);
    if (!src) return;
    setShapes(prev => prev.map(s => {
      if (s.id !== targetId) return s;
      const targetMax = maxV(s.type);
      const safeVariant = (src.variant || 0) < targetMax ? (src.variant || 0) : (src.variant || 0) % targetMax;
      let mergedProps = { ...(s.props || {}) };
      if (src.props) {
        const targetDefaults = DEFAULT_PROPS[s.type];
        if (targetDefaults) {
          for (const [k, v] of Object.entries(src.props)) {
            if (k in targetDefaults) mergedProps[k] = v;
          }
        }
      }
      return { ...s, variant: safeVariant, font: src.font || 0, fsize: src.fsize || 1, props: mergedProps, dStyles: src.dStyles ? { ...src.dStyles } : undefined };
    }));
    setPrefV(pv => {
      const tgt = shapes.find(x => x.id === targetId);
      if (!tgt) return pv;
      const targetMax = maxV(tgt.type);
      const safeVariant = (src.variant || 0) < targetMax ? (src.variant || 0) : (src.variant || 0) % targetMax;
      return { ...pv, [tgt.type]: safeVariant };
    });
    setStyleSource(null);
    // Clear stale candidates for target since its style was replaced
    setCandidates(c => { const n = { ...c }; delete n[targetId]; return n; });
    setCandidateIdx(ci => { const n = { ...ci }; delete n[targetId]; return n; });
  }, [shapes]);

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

  /* Tap-to-add for mobile */
  const addShape = useCallback((item) => {
    const lastY = shapes.length ? Math.max(...shapes.map(s => s.y + s.h)) + 20 : 40;
    const vw = window.innerWidth;
    const ns = { id: uid(), type: item.type, x: Math.max(10, vw / 2 - item.w / 2), y: lastY, w: Math.min(item.w, vw - 20), h: item.h, variant: prefV[item.type] || 0, texts: {}, font: 0 };
    push([...shapes, ns]); setSel(ns.id); setSelAll(new Set([ns.id]));
  }, [shapes, push, prefV]);

  /* ---- DEVICE CANVAS HEIGHT ---- */
  const deviceH = useMemo(() => {
    if (device === "free") return 0;
    return shapes.reduce((h, s) => h + s.h + (device === "desktop" ? 16 : 12), device === "desktop" ? 32 : 16) + (device === "desktop" ? 32 : 16);
  }, [shapes, device]);

  /* Select only — no drag. Used by capture-phase handler so clicks inside
     interactive components still set the shape as selected. */
  const onSelect = useCallback((s) => {
    flushDirtyText();
    if (s.group) {
      const members = shapes.filter(x => x.group === s.group);
      setSelAll(new Set(members.map(x => x.id)));
    } else {
      setSelAll(new Set([s.id]));
    }
    setSel(s.id);
  }, [flushDirtyText, shapes]);

  const onDown = useCallback((e, s) => {
    e.stopPropagation(); flushDirtyText();
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
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
    const pt = toCanvas(cx, cy);
    setOff({ x: pt.x - s.x, y: pt.y - s.y });
  }, [toCanvas, flushDirtyText, sel, shapes]);

  const onMove = useCallback(e => {
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    if (cx === undefined) return;
    if (pan) {
      setCam(c => ({ ...c, x: c.x + (cx - pan.x), y: c.y + (cy - pan.y) }));
      setPan({ x: cx, y: cy });
      return;
    }
    if (!drag && !rsz) return;
    const pt = toCanvas(cx, cy);
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
    const duped = shapes.filter(s => selAll.has(s.id)).map(s => ({ ...s, id: uid(), x: s.x + 20, y: s.y + 20, texts: { ...(s.texts || {}) }, props: { ...(s.props || {}) }, group: newGroup || s.group }));
    push([...shapes, ...duped]);
    setSelAll(new Set(duped.map(s => s.id))); setSel(duped[0]?.id || null);
  }, [selAll, shapes, push]);

  const cycleMood = useCallback(() => {
    const idx = DESIGN_MOODS.findIndex(m => m.id === (designMood || "auto"));
    setDesignMood(DESIGN_MOODS[(idx + 1) % DESIGN_MOODS.length].id);
  }, [designMood]);

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
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const palRef = useRef(pal);
  palRef.current = pal;
  const deviceRef = useRef(device);
  deviceRef.current = device;

  const libSizes = useMemo(() => {
    const m = {};
    LIB.forEach(cat => cat.items.forEach(it => { m[it.type] = { w: it.w, h: it.h }; }));
    return m;
  }, []);

  const tp = useMemo(() => {
    const _push = (prev) => { setHist(h => [...h.slice(-39), prev]); setFuture([]); };
    const _set = (next) => { shapesRef.current = next; setShapes(next); };
    return {
      /* ---- READ ---- */
      palette: () => palRef.current,
      palettes: () => Object.keys(PAL),
      colors: () => ({ ...PAL[palRef.current] }),
      shapes: () => shapesRef.current.map(s => ({
        id: s.id, type: s.type, x: Math.round(s.x), y: Math.round(s.y), w: s.w, h: s.h,
        variant: s.variant || 0, font: s.font || 0, fsize: s.fsize || 1,
        texts: { ...(s.texts || {}) }, props: { ...(s.props || {}) },
      })),
      get: (id) => {
        const s = shapesRef.current.find(x => x.id === id);
        if (!s) return null;
        return { id: s.id, type: s.type, x: Math.round(s.x), y: Math.round(s.y), w: s.w, h: s.h, variant: s.variant || 0, font: s.font || 0, fsize: s.fsize || 1, texts: { ...(s.texts || {}) }, props: { ...(s.props || {}) } };
      },
      find: (type) => shapesRef.current.filter(s => s.type === type).map(s => s.id),
      device: () => deviceRef.current,
      fonts: () => FONTS.map(f => f.name),
      types: () => { const t = []; LIB.forEach(c => c.items.forEach(i => t.push(i.type))); return t; },
      variants: (type) => { const v = VARIANTS[type]; return v ? [...v] : []; },

      /* ---- WRITE ---- */
      setPalette: (name) => { if (PAL[name]) setPal(name); },
      setDevice: (m) => { if (['free', 'desktop', 'phone'].includes(m)) setDevice(m); },
      add: (type, opts = {}) => {
        const sz = libSizes[type] || { w: 200, h: 100 };
        const id = uid();
        const ns = { id, type, variant: opts.variant || 0, x: opts.x ?? 100, y: opts.y ?? 100, w: opts.w || sz.w, h: opts.h || sz.h, font: opts.font || 0, fsize: opts.fsize || 1, texts: opts.texts || {}, props: opts.props || {} };
        const prev = shapesRef.current; _push(prev); _set([...prev, ns]);
        return id;
      },
      remove: (id) => { const prev = shapesRef.current; _push(prev); _set(prev.filter(s => s.id !== id)); },
      update: (id, ch) => {
        const prev = shapesRef.current; _push(prev);
        _set(prev.map(s => {
          if (s.id !== id) return s;
          const next = { ...s };
          if (ch.x !== undefined) next.x = ch.x;
          if (ch.y !== undefined) next.y = ch.y;
          if (ch.w !== undefined) next.w = ch.w;
          if (ch.h !== undefined) next.h = ch.h;
          if (ch.variant !== undefined) next.variant = ch.variant;
          if (ch.font !== undefined) next.font = ch.font;
          if (ch.fsize !== undefined) next.fsize = ch.fsize;
          if (ch.texts) next.texts = { ...(s.texts || {}), ...ch.texts };
          if (ch.props) next.props = { ...(s.props || {}), ...ch.props };
          return next;
        }));
      },
      setText: (id, key, value) => {
        const prev = shapesRef.current; _push(prev);
        _set(prev.map(s => {
          if (s.id !== id) return s;
          const texts = { ...(s.texts || {}) };
          if (value === null || value === undefined) delete texts[key]; else texts[key] = value;
          return { ...s, texts };
        }));
      },
      setProp: (id, key, value) => {
        const prev = shapesRef.current; _push(prev);
        _set(prev.map(s => {
          if (s.id !== id) return s;
          const props = { ...(s.props || {}) };
          if (value === null || value === undefined) delete props[key]; else props[key] = value;
          return { ...s, props };
        }));
      },
      setFont: (id, fontIndex) => {
        const prev = shapesRef.current; _push(prev);
        _set(prev.map(s => s.id === id ? { ...s, font: fontIndex } : s));
      },
      setFsize: (id, size) => {
        const prev = shapesRef.current; _push(prev);
        _set(prev.map(s => s.id === id ? { ...s, fsize: Math.max(0.5, Math.min(2, size)) } : s));
      },
      clear: () => { const prev = shapesRef.current; _push(prev); _set(prev.filter(s => s.type === 'code-block')); },

      /* ---- SAVE / RESET ---- */
      save: (name) => {
        const key = name ? `tp_save_${name}` : 'tp_save_default';
        const data = { shapes: shapesRef.current, pal: palRef.current, device: deviceRef.current };
        localStorage.setItem(key, JSON.stringify(data));
        return key;
      },
      load: (name) => {
        const key = name ? `tp_save_${name}` : 'tp_save_default';
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        try {
          const data = JSON.parse(raw);
          const prev = shapesRef.current; _push(prev);
          if (data.shapes) _set(data.shapes);
          if (data.pal && PAL[data.pal]) setPal(data.pal);
          if (data.device) setDevice(data.device);
          return true;
        } catch { return false; }
      },
      saves: () => {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.startsWith('tp_save_')) keys.push(k.replace('tp_save_', ''));
        }
        return keys;
      },
      deleteSave: (name) => { localStorage.removeItem(name ? `tp_save_${name}` : 'tp_save_default'); },
      reset: () => {
        const prev = shapesRef.current; _push(prev);
        _set([]); setPal('warm'); setDevice('free');
      },
      export: () => ({ shapes: shapesRef.current, pal: palRef.current, device: deviceRef.current }),
    };
  }, [libSizes]);

  return (
    <TpContext.Provider value={tp}>
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: p.bg, fontFamily: "'DM Sans',system-ui,sans-serif", color: p.tx, transition: "background .4s,color .4s" }}>
      <link href={FONT_URL} rel="stylesheet" />

      <Header pal={pal} setPal={setPal} device={device} setDevice={setDevice} shapes={shapes} setShapes={setShapes} setCam={setCam} clearAll={clearAll} exportPng={exportPng} exportJSON={exportJSON} importJSON={importJSON} undo={undo} redo={redo} p={p} mobile={mobile} randomizeAll={randomizeAll} hasRndUndo={hasRndUndo} undoRandomize={undoRandomize} designMood={designMood} setDesignMood={setDesignMood} lastRandomizeStats={lastRandomizeStats} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: mobile ? "column" : "row" }}>
        {!mobile && <LibrarySidebar expCat={expCat} setExpCat={setExpCat} catItems={catItems} prefV={prefV} p={p} pDrag={pDrag} setPDrag={setPDrag} dRef={dRef} reorderLib={reorderLib} lastReorder={lastReorder} />}

        {/* CANVAS */}
        <main style={{ flex: 1, display: "flex", alignItems: device === "free" || mobile ? "stretch" : "flex-start", justifyContent: "center", overflow: device !== "free" && !mobile ? "auto" : "hidden", background: device !== "free" && !mobile ? p.su : "transparent", padding: device !== "free" && !mobile ? "32px 40px" : "0" }}
          onDragOver={e => e.preventDefault()} onDrop={onDrop} role="application" aria-label="Design canvas">
          <div ref={cRef} onDrop={onDrop} onDragOver={e => e.preventDefault()} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            onTouchMove={e => { if (drag || rsz) { e.preventDefault(); onMove(e.touches[0]) } }}
            onTouchEnd={onUp}
            onMouseDown={e => {
              if (e.button === 1) { e.preventDefault(); setPan({ x: e.clientX, y: e.clientY }) }
              if (e.button === 0 && !e.target.closest("[data-shape]") && (e.target === cRef.current || e.target.closest("[data-c]"))) { flushDirtyText(); setSel(null); setSelAll(new Set()); setSelFont(null) }
            }}
            onContextMenu={e => e.preventDefault()}
            style={{ ...(device === "free" || mobile ? { flex: 1 } : device === "desktop" ? { width: 1280, flexShrink: 0 } : { width: 390, flexShrink: 0 }), height: !mobile && device === "phone" ? 844 : !mobile && device === "desktop" ? Math.max(720, (deviceH || 720)) : undefined, minHeight: !mobile && device === "desktop" ? 720 : undefined, position: "relative", overflow: "hidden", cursor: pan ? "grabbing" : "default", borderRadius: device !== "free" && !mobile ? 16 : 0, border: device !== "free" && !mobile ? `1px solid ${p.bd}` : "none", boxShadow: device !== "free" && !mobile ? `0 4px 24px ${p.tx}08` : "none", background: device !== "free" && !mobile ? p.bg : "transparent" }}>

            {/* dot grid */}
            <svg data-c="1" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} aria-hidden="true">
              <defs><pattern id="dots" x={cam.x % 20} y={cam.y % 20} width={20 * cam.z} height={20 * cam.z} patternUnits="userSpaceOnUse"><circle cx={10 * cam.z} cy={10 * cam.z} r={Math.max(.3, .5 * cam.z)} fill={p.mu} opacity=".1" /></pattern></defs>
              <rect data-c="1" width="100%" height="100%" fill="url(#dots)" style={{ pointerEvents: "all" }} />
            </svg>

            {/* snap guides */}
            {guides.map((g, i) => <div key={i} aria-hidden="true" style={{ position: "absolute", pointerEvents: "none", zIndex: 300, background: p.ac + "40", ...(g.t === "v" ? { left: g.p * cam.z + cam.x, top: 0, width: 1, height: "100%" } : { top: g.p * cam.z + cam.y, left: 0, height: 1, width: "100%" }) }} />)}

            {/* transform layer */}
            <div style={{ position: "absolute", left: 0, top: 0, ...(device === "free" && !mobile ? { transform: `translate(${cam.x}px,${cam.y}px) scale(${cam.z})`, transformOrigin: "0 0", willChange: "transform" } : mobile ? { width: "100%", padding: "10px" } : {}), width: device !== "free" && !mobile ? "100%" : undefined, minHeight: !mobile ? deviceH || undefined : undefined }}>
              {shapes.map(s => (
                <ShapeItem key={s.id} s={s} sel={sel} selAll={selAll} drag={drag} device={device} selFont={selFont} p={p}
                  onDown={onDown} onSelect={onSelect} onText={updateText} onProp={updateProp} cycle={cycle} cycleFont={cycleFont} cycleFsize={cycleFsize} randomize={randomize} undoRandomize={undoRandomize} hasRndUndo={hasRndUndo} styleSource={styleSource} setStyleSource={setStyleSource} copyStyle={copyStyle} delShape={delShape} setRsz={setRsz} designMood={designMood} setDesignMood={setDesignMood} dScore={sel === s.id ? designScore(s, p, shapes.filter(x => x.id !== s.id)) : 0} candidates={candidates[s.id]} candidateIdx={candidateIdx[s.id] ?? -1} cycleVariation={cycleVariation} designHistory={designHistory[s.id]} undoDesign={undoDesign} isLocked={lockedShapes.has(s.id)} toggleLock={toggleLock} />
              ))}
            </div>

            {/* empty state */}
            {shapes.length === 0 && (
              <div data-c="1" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: mobile ? 24 : 0 }}>
                <p style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: mobile ? 20 : 26, color: p.mu, opacity: .3, margin: "0 0 6px", textAlign: "center" }}>{mobile ? "Tap + to add components" : "Drag components here"}</p>
                <p style={{ fontSize: mobile ? 11 : 13, color: p.mu, opacity: .2, textAlign: "center" }}>{mobile ? "Tap to select, drag to move" : "Switch styles with arrows. Your taste is remembered."}</p>
              </div>
            )}

            {/* selection info */}
            {selAll.size > 1 && <div data-no-export="1" style={{ position: "absolute", bottom: mobile ? 70 : 12, left: 14, display: "flex", alignItems: "center", gap: 6, zIndex: 60, background: p.card, border: `1px solid ${p.bd}`, borderRadius: 8, padding: "4px 10px", fontSize: 10, color: p.mu, boxShadow: `0 2px 8px ${p.tx}08` }}>
              {selAll.size} selected {!mobile && <span style={{ opacity: .5, marginLeft: 4 }}>⌘G group · ⌘⇧G ungroup</span>}
            </div>}

            {/* zoom controls - hide on mobile */}
            {!mobile && <div data-no-export="1" style={{ position: "absolute", bottom: 12, right: 14, display: "flex", alignItems: "center", gap: 6, zIndex: 60 }} role="group" aria-label="Zoom controls">
              <button aria-label="Zoom out" onClick={() => setCam(c => { const nz = Math.max(.15, c.z - 0.15); const el = cRef.current.getBoundingClientRect(); const mx = el.width / 2, my = el.height / 2; return { x: mx - (mx - c.x) * (nz / c.z), y: my - (my - c.y) * (nz / c.z), z: nz } })} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${p.bd}`, background: p.card, color: p.mu, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", padding: 0 }}>-</button>
              <button aria-label={`Reset zoom (${zoomPct}%)`} onClick={() => setCam({ x: 0, y: 0, z: 1 })} title="Reset zoom" style={{ fontSize: 10, color: p.mu, background: p.card, border: `1px solid ${p.bd}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", minWidth: 42, textAlign: "center" }}>{zoomPct}%</button>
              <button aria-label="Zoom in" onClick={() => setCam(c => { const nz = Math.min(4, c.z + 0.15); const el = cRef.current.getBoundingClientRect(); const mx = el.width / 2, my = el.height / 2; return { x: mx - (mx - c.x) * (nz / c.z), y: my - (my - c.y) * (nz / c.z), z: nz } })} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${p.bd}`, background: p.card, color: p.mu, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", padding: 0 }}>+</button>
            </div>}
          </div>
        </main>
      </div>

      {/* Mobile bottom drawer - component library */}
      {mobile && <>
        {/* FAB toggle */}
        <button onClick={() => setLibOpen(!libOpen)} aria-label={libOpen ? "Close library" : "Open library"}
          style={{ position: "fixed", bottom: libOpen ? "55vh" : 20, right: 16, zIndex: 1001, width: 52, height: 52, borderRadius: 999, background: p.ac, border: "none", color: (() => { const hex = p.ac.replace("#", ""); const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16); return (r*299+g*587+b*114)/1000 > 150 ? "#1a1a1a" : "#fff" })(), fontSize: 24, fontWeight: 300, cursor: "pointer", boxShadow: `0 4px 20px ${p.ac}40`, display: "flex", alignItems: "center", justifyContent: "center", transition: "bottom .3s ease, transform .2s", transform: libOpen ? "rotate(45deg)" : "none" }}>+</button>

        {/* Drawer backdrop */}
        {libOpen && <div onClick={() => setLibOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 999 }} />}

        {/* Drawer */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "55vh", background: p.card, borderTop: `1px solid ${p.bd}`, borderRadius: "20px 20px 0 0", zIndex: 1000, transform: libOpen ? "translateY(0)" : "translateY(100%)", transition: "transform .3s ease", display: "flex", flexDirection: "column", boxShadow: libOpen ? `0 -8px 32px ${p.tx}10` : "none" }}>
          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: p.mu + "30" }} />
          </div>

          {/* Category tabs - horizontal scroll */}
          <div style={{ display: "flex", gap: 2, padding: "0 12px 8px", overflowX: "auto", flexShrink: 0, WebkitOverflowScrolling: "touch" }}>
            {LIB.map(cat => (
              <button key={cat.cat} onClick={() => setExpCat(cat.cat)}
                style={{ padding: "6px 14px", fontSize: 12, fontWeight: expCat === cat.cat ? 600 : 400, color: expCat === cat.cat ? p.tx : p.mu, background: expCat === cat.cat ? p.su : "transparent", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .15s", flexShrink: 0 }}>
                {cat.cat}
              </button>
            ))}
          </div>

          {/* Component grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignContent: "start", WebkitOverflowScrolling: "touch" }}>
            {catItems.map(item => {
              const pv = prefV[item.type] || 0;
              const tw = (window.innerWidth - 44) / 2;
              const ts = Math.min(tw / item.w, 1);
              const th = Math.min(item.h * ts, 120);
              return (
                <button key={item.type} onClick={() => { addShape(item); setLibOpen(false) }}
                  style={{ padding: 8, borderRadius: 10, border: `1px solid ${p.bd}`, background: p.card, cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, alignItems: "center", fontFamily: "inherit", transition: "background .15s", WebkitTapHighlightColor: "transparent" }}
                  onTouchStart={e => e.currentTarget.style.background = p.su}
                  onTouchEnd={e => e.currentTarget.style.background = p.card}>
                  <div style={{ width: "100%", height: th, borderRadius: 6, overflow: "hidden", pointerEvents: "none", display: "flex", justifyContent: "center" }}>
                    <div style={{ transform: `scale(${ts})`, transformOrigin: "top center", width: item.w, height: item.h }}>
                      <C type={item.type} v={pv} p={p} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: p.tx }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </>}

      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(128,128,128,.12);border-radius:2px}html,body{overscroll-behavior:none;-webkit-overflow-scrolling:touch}body{position:fixed;width:100%;height:100%}#root{width:100%;height:100%}@keyframes tp-rnd-toast{from{opacity:0;transform:translateX(-50%) translateY(4px) scale(.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}`}</style>
    </div>
    </TpContext.Provider>
  );
}
