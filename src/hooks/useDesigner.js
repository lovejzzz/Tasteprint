import { useState, useRef, useCallback } from "react";
import { DEFAULT_PROPS } from "../constants";
import { maxV, designerRandomize, getCuratedPreset, generateDesignDNA, DESIGN_MOODS } from "../utils";

/**
 * Encapsulates all designer randomization state and logic.
 *
 * Extracted from App.jsx to isolate the design-mood / randomize / candidate-cycling /
 * style-transfer / lock / undo-design system into one independently testable hook.
 *
 * @param {object} params
 * @param {React.MutableRefObject<Array>} params.shapesRef - ref to current shapes array
 * @param {React.MutableRefObject<object>} params.prefVRef - ref to preferred variants
 * @param {React.MutableRefObject<object>} params.pRef - ref to current palette object
 * @param {React.MutableRefObject<Set>} params.selAllRef - ref to current multi-selection set
 * @param {Function} params.setShapes - shapes state setter
 * @param {Function} params.setPrefV - preferred-variants state setter
 * @returns {object} Designer state and callbacks
 */
export function useDesigner({ shapesRef, prefVRef, pRef, selAllRef, setShapes, setPrefV }) {
  const [designMood, setDesignMood] = useState("auto");
  const [styleSource, setStyleSource] = useState(null);
  const [lockedShapes, setLockedShapes] = useState(new Set());
  const [candidates, setCandidates] = useState({});
  const [candidateIdx, setCandidateIdx] = useState({});
  const [, setDesignHistory] = useState({});
  const [lastRandomizeStats, setLastRandomizeStats] = useState(null);

  const rndUndo = useRef(null);
  const curatedIdx = useRef({});

  // Keep refs current for stable callbacks
  const designMoodRef = useRef(designMood);
  designMoodRef.current = designMood;
  const lockedShapesRef = useRef(lockedShapes);
  lockedShapesRef.current = lockedShapes;
  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;
  const candidateIdxRef = useRef(candidateIdx);
  candidateIdxRef.current = candidateIdx;

  const randomize = useCallback((id) => {
    const sa = selAllRef.current;
    const currentShapes = shapesRef.current;
    const currentPrefV = prefVRef.current;
    const currentP = pRef.current;
    const currentMood = designMoodRef.current;
    const targets = sa.size > 1 && sa.has(id) ? [...sa] : [id];

    // Snapshot for undo
    const snapShapes = currentShapes.filter(s => targets.includes(s.id));
    if (snapShapes.length) {
      rndUndo.current = { ids: targets, prevShapes: snapShapes.map(s => ({ ...s })), prevPrefV: { ...currentPrefV } };
    }

    const targetSet = new Set(targets);
    const otherShapes = currentShapes.filter(s => !targetSet.has(s.id));

    // Single target: generate 3 candidates for cycling
    if (targets.length === 1) {
      const shape = currentShapes.find(s => s.id === id);
      if (!shape) return;
      // Push current state onto per-component history (cap at 5)
      setDesignHistory(prev => {
        const stack = prev[id] || [];
        const entry = { variant: shape.variant || 0, font: shape.font || 0, fsize: shape.fsize || 1, props: { ...(shape.props || {}) }, dStyles: shape.dStyles ? { ...shape.dStyles } : undefined };
        return { ...prev, [id]: [...stack.slice(-(5 - 1)), entry] };
      });
      const defaults = DEFAULT_PROPS[shape.type];
      const allCandidates = [];
      const moodPool = DESIGN_MOODS.map(m => m.id);
      for (let c = 0; c < 3; c++) {
        const ci = (curatedIdx.current[id] || 0) + c;
        const preset = getCuratedPreset(shape.type, ci);
        const rollMood = currentMood === "auto" ? moodPool[Math.floor(Math.random() * moodPool.length)] : currentMood;
        const dna = generateDesignDNA(currentP, rollMood);
        const rnd = designerRandomize(shape.type, currentP, defaults, rollMood, otherShapes, dna, shape.w, shape.h);
        if (preset) {
          allCandidates.push({ variant: preset.variant, font: preset.font, fsize: preset.fsize, props: { ...(shape.props || {}), ...rnd.props }, dStyles: rnd.dStyles });
        } else {
          allCandidates.push({ variant: rnd.variant, font: rnd.font, fsize: rnd.fsize, props: { ...(shape.props || {}), ...rnd.props }, dStyles: rnd.dStyles });
        }
      }
      curatedIdx.current = { ...curatedIdx.current, [id]: (curatedIdx.current[id] || 0) + 3 };

      setCandidates(prev => ({ ...prev, [id]: allCandidates }));
      setCandidateIdx(prev => ({ ...prev, [id]: 0 }));
      const first = allCandidates[0];
      const newPrefV = { ...currentPrefV, [shape.type]: first.variant };
      setShapes(prev => prev.map(s => s.id === id ? { ...s, variant: first.variant, font: first.font, fsize: first.fsize, props: first.props, dStyles: first.dStyles } : s));
      setPrefV(newPrefV);
      return;
    }

    // Multi-target: no candidate cycling, randomize directly
    const rollMood2 = currentMood === "auto" ? DESIGN_MOODS[Math.floor(Math.random() * DESIGN_MOODS.length)].id : currentMood;
    const dna = generateDesignDNA(currentP, rollMood2);
    const newPrefV = { ...currentPrefV };
    setShapes(prev => {
      const updated = [...prev];
      const alreadyRandomized = [...otherShapes];
      for (let i = 0; i < updated.length; i++) {
        const s = updated[i];
        if (!targetSet.has(s.id)) continue;
        const defaults = DEFAULT_PROPS[s.type];
        const result = designerRandomize(s.type, currentP, defaults, rollMood2, alreadyRandomized, dna, s.w, s.h);
        updated[i] = { ...s, variant: result.variant, font: result.font, fsize: result.fsize, props: { ...(s.props || {}), ...result.props }, dStyles: result.dStyles };
        newPrefV[s.type] = result.variant;
        alreadyRandomized.push(updated[i]);
      }
      return updated;
    });
    setPrefV(newPrefV);
    setCandidates(prev => {
      const next = { ...prev };
      for (const tid of targets) delete next[tid];
      return next;
    });
    setCandidateIdx(prev => {
      const next = { ...prev };
      for (const tid of targets) delete next[tid];
      return next;
    });
  }, [selAllRef, shapesRef, prefVRef, pRef, setShapes, setPrefV]);

  const cycleVariation = useCallback((shapeId) => {
    const cands = candidatesRef.current[shapeId];
    if (!cands || cands.length <= 1) return;
    const curIdx = (candidateIdxRef.current[shapeId] || 0);
    const nextIdx = (curIdx + 1) % cands.length;
    setCandidateIdx(prev => ({ ...prev, [shapeId]: nextIdx }));
    const cand = cands[nextIdx];
    const shape = shapesRef.current.find(s => s.id === shapeId);
    if (!shape) return;
    setPrefV(pv => ({ ...pv, [shape.type]: cand.variant }));
    setShapes(prev => prev.map(s => s.id === shapeId ? { ...s, variant: cand.variant, font: cand.font, fsize: cand.fsize, props: cand.props, dStyles: cand.dStyles } : s));
  }, [shapesRef, setShapes, setPrefV]);

  const randomizeAll = useCallback(() => {
    const currentShapes = shapesRef.current;
    if (currentShapes.length === 0) return;
    const currentPrefV = prefVRef.current;
    const currentP = pRef.current;
    const currentMood = designMoodRef.current;
    const currentLocked = lockedShapesRef.current;
    rndUndo.current = { ids: currentShapes.map(s => s.id), prevShapes: currentShapes.map(s => ({ ...s })), prevPrefV: { ...currentPrefV } };
    const rollMoodAll = currentMood === "auto" ? DESIGN_MOODS[Math.floor(Math.random() * DESIGN_MOODS.length)].id : currentMood;
    const dna = generateDesignDNA(currentP, rollMoodAll);
    const newPrefV = { ...currentPrefV };
    let randomizedCount = 0;
    let lockedCount = 0;
    setShapes(prev => {
      const updated = [...prev];
      const already = [];
      for (let i = 0; i < updated.length; i++) {
        const s = updated[i];
        if (currentLocked.has(s.id)) { already.push(s); lockedCount++; continue; }
        const defaults = DEFAULT_PROPS[s.type];
        const result = designerRandomize(s.type, currentP, defaults, rollMoodAll, already, dna, s.w, s.h);
        updated[i] = { ...s, variant: result.variant, font: result.font, fsize: result.fsize, props: { ...(s.props || {}), ...result.props }, dStyles: result.dStyles };
        newPrefV[s.type] = result.variant;
        already.push(updated[i]);
        randomizedCount++;
      }
      return updated;
    });
    setPrefV(newPrefV);
    setLastRandomizeStats({ count: randomizedCount, skipped: lockedCount, timestamp: Date.now() });
  }, [shapesRef, prefVRef, pRef, setShapes, setPrefV]);

  const undoRandomize = useCallback(() => {
    if (!rndUndo.current) return;
    const { prevShapes, prevPrefV } = rndUndo.current;
    const prevMap = new Map(prevShapes.map(s => [s.id, s]));
    setShapes(sh => sh.map(s => prevMap.has(s.id) ? prevMap.get(s.id) : s));
    setPrefV(prevPrefV);
    rndUndo.current = null;
  }, [setShapes, setPrefV]);

  const undoDesign = useCallback((shapeId) => {
    setDesignHistory(prev => {
      const stack = prev[shapeId];
      if (!stack || stack.length === 0) return prev;
      const entry = stack[stack.length - 1];
      setShapes(sh => sh.map(s => {
        if (s.id !== shapeId) return s;
        return { ...s, variant: entry.variant, font: entry.font, fsize: entry.fsize, props: entry.props, dStyles: entry.dStyles };
      }));
      setPrefV(pv => {
        const shape = shapesRef.current.find(s => s.id === shapeId);
        if (!shape) return pv;
        return { ...pv, [shape.type]: entry.variant };
      });
      setCandidates(c => { const n = { ...c }; delete n[shapeId]; return n; });
      setCandidateIdx(ci => { const n = { ...ci }; delete n[shapeId]; return n; });
      return { ...prev, [shapeId]: stack.slice(0, -1) };
    });
  }, [shapesRef, setShapes, setPrefV]);

  const toggleLock = useCallback((shapeId) => {
    setLockedShapes(prev => {
      const next = new Set(prev);
      if (next.has(shapeId)) next.delete(shapeId); else next.add(shapeId);
      return next;
    });
  }, []);

  const copyStyle = useCallback((sourceId, targetId) => {
    const src = shapesRef.current.find(x => x.id === sourceId);
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
      const tgt = shapesRef.current.find(x => x.id === targetId);
      if (!tgt) return pv;
      const targetMax = maxV(tgt.type);
      const safeVariant = (src.variant || 0) < targetMax ? (src.variant || 0) : (src.variant || 0) % targetMax;
      return { ...pv, [tgt.type]: safeVariant };
    });
    setStyleSource(null);
    setCandidates(c => { const n = { ...c }; delete n[targetId]; return n; });
    setCandidateIdx(ci => { const n = { ...ci }; delete n[targetId]; return n; });
  }, [shapesRef, setShapes, setPrefV]);

  const cycleMood = useCallback(() => {
    const idx = DESIGN_MOODS.findIndex(m => m.id === (designMoodRef.current || "auto"));
    setDesignMood(DESIGN_MOODS[(idx + 1) % DESIGN_MOODS.length].id);
  }, []);

  /** Reset all designer-specific transient state (called on clear/import). */
  const resetDesignerState = useCallback(() => {
    setStyleSource(null);
    setLockedShapes(new Set());
    setCandidates({});
    setCandidateIdx({});
    setDesignHistory({});
    rndUndo.current = null;
    setLastRandomizeStats(null);
  }, []);

  return {
    // State
    designMood,
    setDesignMood,
    styleSource,
    setStyleSource,
    lockedShapes,
    candidates,
    lastRandomizeStats,

    // Callbacks
    randomize,
    randomizeAll,
    undoRandomize,
    undoDesign,
    toggleLock,
    copyStyle,
    cycleVariation,
    cycleMood,
    resetDesignerState,
  };
}
