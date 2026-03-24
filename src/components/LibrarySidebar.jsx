import React, { useRef, useLayoutEffect } from "react";
import C from "./ComponentRenderer";
import { ErrorBoundary } from "./ErrorBoundary";
import { LIB } from "../constants";
import { varName } from "../utils";
import "./librarysidebar.css";

/** Check reduced-motion preference (module-level, avoids per-render overhead). */
const _prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const LibrarySidebar = React.memo(function LibrarySidebar({ expCat, setExpCat, catItems, prefV, p, pDrag, setPDrag, dRef, reorderLib, lastReorder }) {
  const cardRefs = useRef(new Map());
  const prevRects = useRef(new Map());

  /* ── FLIP reorder animation (respects prefers-reduced-motion) ── */
  useLayoutEffect(() => {
    if (prevRects.current.size === 0) return;
    const skipAnimation = _prefersReducedMotion();
    cardRefs.current.forEach((el, type) => {
      const oldR = prevRects.current.get(type);
      if (!el || !oldR) return;
      const newR = el.getBoundingClientRect();
      const dy = oldR.top - newR.top;
      if (Math.abs(dy) < 2) return;
      el.getAnimations().forEach(a => a.cancel());
      if (!skipAnimation) {
        el.animate(
          [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
          { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "none" }
        );
      }
    });
    prevRects.current = new Map();
  });

  const saveRects = () => {
    prevRects.current = new Map();
    cardRefs.current.forEach((el, type) => { if (el) prevRects.current.set(type, el.getBoundingClientRect()); });
  };

  const handleReorder = (fromType, toType) => {
    saveRects();
    reorderLib(fromType, toType);
  };

  return (
    <aside className="tp-lib-aside" style={{
      borderRight: `1px solid ${p.bd}`,
      background: p.card + "88",
    }} role="complementary" aria-label="Component library">

      {/* ── Category Nav ── */}
      <nav className="tp-lib-catnav" style={{ borderRight: `1px solid ${p.bd}` }} role="tablist" aria-label="Component categories">
        {LIB.map(cat => {
          const active = expCat === cat.cat;
          return (
            <div key={cat.cat} role="tab" aria-selected={active} tabIndex={0}
              onClick={() => setExpCat(cat.cat)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpCat(cat.cat); } }}
              className={`tp-lib-cattab${active ? " tp-lib-cattab--active" : ""}`}
              style={{
                color: active ? p.tx : p.mu,
                background: active ? p.su : undefined,
                borderRightColor: active ? p.ac : undefined,
              }}>
              {cat.cat}
            </div>
          );
        })}
      </nav>

      {/* ── Component Cards Panel ── */}
      <div className="tp-lib-cards" role="tabpanel" aria-label={`${expCat} components`}>
        <div role="list" aria-label={`${expCat} component list`} style={{ display: "contents" }}>
        {catItems.map(item => {
          const pv = prefV[item.type] || 0;
          const vn = varName(item.type, pv);
          const tw = 240, ts = Math.min(tw / item.w, 1), th = item.h * ts;
          const isDragging = pDrag === item.type;
          return (
            <div key={item.type}
              ref={el => { if (el) cardRefs.current.set(item.type, el); else cardRefs.current.delete(item.type); }}
              draggable
              role="listitem"
              aria-label={`${item.label} component — ${vn} variant`}
              onDragStart={e => { dRef.current = item; setPDrag(item.type); e.dataTransfer.effectAllowed = "copyMove"; }}
              onDragOver={e => { e.preventDefault(); if (pDrag && pDrag !== item.type && Date.now() - lastReorder.current > 250) { lastReorder.current = Date.now(); handleReorder(pDrag, item.type); } }}
              onDragEnd={() => setPDrag(null)}
              className={`tp-lib-card${isDragging ? " tp-lib-card--dragging" : ""}`}
              style={{
                border: `1px solid ${p.mu}22`,
                background: isDragging ? p.su + "88" : undefined,
              }}>
              <div className="tp-lib-card-header">
                <span className="tp-lib-card-label" style={{ color: p.tx }}>{item.label}</span>
                <span className="tp-lib-card-variant" style={{ color: p.mu }}>{vn}</span>
              </div>
              <div className="tp-lib-card-preview" style={{ width: tw, height: th }}>
                <div style={{ transform: `scale(${ts})`, transformOrigin: "top left", width: item.w, height: item.h }}>
                  <ErrorBoundary fallback={<div style={{ padding: 8, fontSize: 10, color: "#C53030" }}>Preview error</div>}>
                    <C type={item.type} v={pv} p={p} />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </aside>
  );
}, (prev, next) =>
  prev.expCat === next.expCat &&
  prev.catItems === next.catItems &&
  prev.prefV === next.prefV &&
  prev.p === next.p &&
  prev.pDrag === next.pDrag
);

export default LibrarySidebar;
