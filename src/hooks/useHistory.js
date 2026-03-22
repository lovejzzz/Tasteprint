import { useState, useCallback } from "react";

/**
 * Generic undo/redo history hook with a 40-step cap.
 *
 * NOTE: App.jsx currently manages its own undo/redo inline (hist/future state +
 * push/undo/redo callbacks) because the Designer System needs direct access to
 * shapesRef and other refs that are awkward to thread through a generic hook.
 * This hook exists as a clean, tested abstraction for future refactoring or for
 * use in sub-features that need independent history stacks.
 */
export function useHistory(initial) {
  const [current, setCurrent] = useState(initial);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const push = useCallback((next) => {
    setCurrent(prev => {
      setPast(h => [...h.slice(-40), prev]);
      setFuture([]);
      return next;
    });
  }, []);

  const set = useCallback((next) => {
    setCurrent(next);
  }, []);

  const undo = useCallback(() => {
    setPast(h => {
      if (!h.length) return h;
      setCurrent(prev => {
        setFuture(f => [...f, prev]);
        return h[h.length - 1];
      });
      return h.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture(f => {
      if (!f.length) return f;
      setCurrent(prev => {
        setPast(h => [...h, prev]);
        return f[f.length - 1];
      });
      return f.slice(0, -1);
    });
  }, []);

  return { current, set, push, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
