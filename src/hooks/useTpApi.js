import { useMemo, useRef } from "react";
import { PAL, LIB, FONTS, VARIANTS } from "../constants";
import { uid, validateImport } from "../utils";

/**
 * Encapsulates the `tp` Live IDE API (window.tp) as a custom hook.
 *
 * This keeps the scriptable console API self-contained and independently
 * testable, while reducing App.jsx complexity.
 *
 * @param {object} params
 * @param {React.MutableRefObject<Array>} params.shapesRef - ref to current shapes array
 * @param {React.MutableRefObject<string>} params.palRef - ref to current palette name
 * @param {React.MutableRefObject<string>} params.deviceRef - ref to current device mode
 * @param {React.MutableRefObject<object>} params.prefVRef - ref to current preferred variants
 * @param {Function} params.setShapes - shapes state setter
 * @param {Function} params.setHist - history state setter
 * @param {Function} params.setFuture - future state setter
 * @param {Function} params.setPal - palette state setter
 * @param {Function} params.setPrefV - preferred-variants state setter
 * @param {Function} params.setDevice - device mode setter
 * @param {Function} params.resetTransientEditorState - clears ephemeral editing state
 * @returns {object} The tp API object (also exposed as window.tp)
 */
export function useTpApi({
  shapesRef, palRef, deviceRef, prefVRef,
  setShapes, setHist, setFuture, setPal, setPrefV, setDevice,
  resetTransientEditorState,
}) {
  const libSizes = useMemo(() => {
    const m = {};
    LIB.forEach(cat => cat.items.forEach(it => { m[it.type] = { w: it.w, h: it.h }; }));
    return m;
  }, []);

  // Internal helpers for undo-aware mutations
  const _pushRef = useRef(null);
  _pushRef.current = (prev) => { setHist(h => [...h.slice(-39), prev]); setFuture([]); };
  const _setRef = useRef(null);
  _setRef.current = (next) => { shapesRef.current = next; setShapes(next); };

  return useMemo(() => {
    const _push = (prev) => _pushRef.current(prev);
    const _set = (next) => _setRef.current(next);

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
        const data = { shapes: shapesRef.current, pal: palRef.current, prefV: prefVRef.current, device: deviceRef.current };
        localStorage.setItem(key, JSON.stringify(data));
        return key;
      },
      load: (name) => {
        const key = name ? `tp_save_${name}` : 'tp_save_default';
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        try {
          const data = JSON.parse(raw);
          const validated = validateImport(data);
          if (!validated) return false;
          const prev = shapesRef.current; _push(prev);
          if (validated.shapes) _set(validated.shapes);
          if (validated.pal && PAL[validated.pal]) setPal(validated.pal);
          if (validated.prefV) setPrefV(validated.prefV);
          if (data.device && ['free', 'desktop', 'phone'].includes(data.device)) setDevice(data.device);
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
        _set([]);
        setPal('warm');
        setDevice('desktop');
        resetTransientEditorState();
      },
      export: () => ({ shapes: shapesRef.current, pal: palRef.current, prefV: prefVRef.current, device: deviceRef.current }),
    };
  }, [libSizes, shapesRef, palRef, deviceRef, prefVRef, setPal, setPrefV, setDevice, resetTransientEditorState, setShapes, setHist, setFuture]);
}
