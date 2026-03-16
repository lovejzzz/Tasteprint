import { useEffect } from "react";
import { uid } from "../utils";

export function useKeyboard({ onDel, undo, redo, dupShape, selAll, setShapes }) {
  useEffect(() => {
    const h = e => {
      const ae = document.activeElement;
      const isEditing = ae && (ae.isContentEditable || ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.closest?.("[contenteditable]"));
      if ((e.key === "Backspace" || e.key === "Delete") && !isEditing) {
        e.preventDefault(); onDel();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); dupShape(); }
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
  }, [onDel, undo, redo, dupShape, selAll, setShapes]);
}
