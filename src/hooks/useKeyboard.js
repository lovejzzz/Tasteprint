import { useEffect } from "react";
import { uid } from "../utils";
import { useLatestRef } from "./useLatestRef";

export function useKeyboard({ onDel, undo, redo, dupShape, selAll, setShapes, sel, randomize, randomizeAll, undoRandomize, cycleMood, toggleLock, undoDesign, cycleVariation, candidates, setStyleSource }) {
  // Store all handler props in a single ref so the keydown listener
  // never needs to be torn down and re-attached when props change.
  const ref = useLatestRef({ onDel, undo, redo, dupShape, selAll, setShapes, sel, randomize, randomizeAll, undoRandomize, cycleMood, toggleLock, undoDesign, cycleVariation, candidates, setStyleSource });

  useEffect(() => {
    const h = e => {
      const { onDel, undo, redo, dupShape, selAll, setShapes, sel, randomize, randomizeAll, undoRandomize, cycleMood, toggleLock, undoDesign, cycleVariation, candidates, setStyleSource } = ref.current;
      const ae = document.activeElement;
      const isEditing = ae && (ae.isContentEditable || ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.closest?.("[contenteditable]"));
      if ((e.key === "Backspace" || e.key === "Delete") && !isEditing) {
        e.preventDefault(); onDel(); return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); dupShape(); return; }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "g") {
        e.preventDefault();
        setShapes(prev => prev.map(s => selAll.has(s.id) ? { ...s, group: undefined } : s));
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "g") {
        e.preventDefault();
        if (selAll.size > 1) {
          const gid = uid();
          setShapes(prev => prev.map(s => selAll.has(s.id) ? { ...s, group: gid } : s));
        }
        return;
      }
      // Designer shortcuts (no modifier keys, not while editing text)
      if (!isEditing && !(e.metaKey || e.ctrlKey || e.altKey)) {
        if (e.key === "r" && !e.shiftKey && sel && randomize) { e.preventDefault(); randomize(sel); return; }
        if (e.key === "R" && e.shiftKey && randomizeAll) { e.preventDefault(); randomizeAll(); return; }
        if (e.key === "u" && undoRandomize) { e.preventDefault(); undoRandomize(); return; }
        if (e.key === "m" && cycleMood) { e.preventDefault(); cycleMood(); return; }
        if (e.key === "l" && sel && toggleLock) { e.preventDefault(); toggleLock(sel); return; }
        if (e.key === "z" && sel && undoDesign) { e.preventDefault(); undoDesign(sel); return; }
        if (e.key === "c" && sel && setStyleSource) { e.preventDefault(); setStyleSource(sel); return; }
        if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.shiftKey && sel && cycleVariation && candidates && candidates[sel] && candidates[sel].length > 1) { e.preventDefault(); cycleVariation(sel); return; }
      }
      if (selAll.size > 0 && !isEditing && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        setShapes(prev => prev.map(s => selAll.has(s.id) ? { ...s, x: s.x + dx, y: s.y + dy } : s));
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
}
