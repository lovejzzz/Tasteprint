import React, { useState, useRef, useLayoutEffect } from "react";
import C from "./ComponentRenderer";
import { LIB } from "../constants";
import { varName, getTextureStyle } from "../utils";

const LibrarySidebar = React.memo(function LibrarySidebar({ expCat, setExpCat, catItems, prefV, p, pDrag, setPDrag, dRef, reorderLib, lastReorder, texture }) {
  const cardRefs = useRef(new Map());
  const prevRects = useRef(new Map());
  const [hovCat, setHovCat] = useState(null);
  const [hovCard, setHovCard] = useState(null);

  /* ── FLIP reorder animation ── */
  useLayoutEffect(() => {
    if (prevRects.current.size === 0) return;
    cardRefs.current.forEach((el, type) => {
      const oldR = prevRects.current.get(type);
      if (!el || !oldR) return;
      const newR = el.getBoundingClientRect();
      const dy = oldR.top - newR.top;
      if (Math.abs(dy) < 2) return;
      el.getAnimations().forEach(a => a.cancel());
      el.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
        { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "none" }
      );
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

  const texStyle = getTextureStyle(texture, p);

  return (
    <aside style={{
      display: "flex", flexShrink: 0,
      borderRight: `1px solid ${p.bd}`,
      background: p.card + "88",
      backdropFilter: "blur(8px)",
      transition: "all .4s",
      ...texStyle,
    }} role="complementary" aria-label="Component library">

      {/* ── Category Nav ── */}
      <nav style={{
        width: 100, padding: "10px 0", overflowY: "auto",
        borderRight: `1px solid ${p.bd}`,
        display: "flex", flexDirection: "column", gap: 1,
        scrollbarWidth: "thin",
      }} role="tablist" aria-label="Component categories">
        {LIB.map(cat => {
          const active = expCat === cat.cat;
          const hovered = hovCat === cat.cat && !active;
          return (
            <div key={cat.cat} role="tab" aria-selected={active} tabIndex={0}
              onClick={() => setExpCat(cat.cat)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpCat(cat.cat); } }}
              onMouseEnter={() => setHovCat(cat.cat)}
              onMouseLeave={() => setHovCat(null)}
              style={{
                padding: "10px 12px", fontSize: 11, cursor: "pointer", userSelect: "none",
                fontWeight: active ? 600 : 400,
                color: active ? p.tx : hovered ? p.tx : p.mu,
                background: active ? p.su : hovered ? p.su + "66" : "transparent",
                borderRight: active ? `2px solid ${p.ac}` : "2px solid transparent",
                transition: "all .15s ease",
                outline: "none",
              }}>
              {cat.cat}
            </div>
          );
        })}
      </nav>

      {/* ── Component Cards Panel ── */}
      <div style={{
        width: 280, padding: 12, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 14,
        scrollbarWidth: "thin",
      }} role="tabpanel" aria-label={`${expCat} components`}>
        {catItems.map(item => {
          const pv = prefV[item.type] || 0;
          const vn = varName(item.type, pv);
          const tw = 240, ts = Math.min(tw / item.w, 1), th = item.h * ts;
          const isDragging = pDrag === item.type;
          const isHovered = hovCard === item.type && !isDragging;
          return (
            <div key={item.type}
              ref={el => { if (el) cardRefs.current.set(item.type, el); else cardRefs.current.delete(item.type); }}
              draggable
              role="listitem"
              aria-label={`${item.label} component — ${vn} variant`}
              onDragStart={e => { dRef.current = item; setPDrag(item.type); e.dataTransfer.effectAllowed = "copyMove"; }}
              onDragOver={e => { e.preventDefault(); if (pDrag && pDrag !== item.type && Date.now() - lastReorder.current > 250) { lastReorder.current = Date.now(); handleReorder(pDrag, item.type); } }}
              onDragEnd={() => setPDrag(null)}
              onMouseEnter={() => setHovCard(item.type)}
              onMouseLeave={() => setHovCard(null)}
              style={{
                padding: 10, borderRadius: 10, cursor: "grab",
                display: "flex", flexDirection: "column", gap: 6,
                border: `1px solid ${isHovered ? p.mu + "44" : p.mu + "22"}`,
                background: isDragging ? p.su + "88" : isHovered ? p.su : "transparent",
                opacity: isDragging ? .5 : 1,
                boxShadow: isHovered ? `0 2px 8px ${p.tx}06` : "none",
                transition: "opacity .2s, background .15s, border-color .15s, box-shadow .2s",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: p.tx }}>{item.label}</span>
                <span style={{
                  fontSize: 10, color: p.mu,
                  opacity: isHovered ? .8 : .6,
                  transition: "opacity .15s",
                }}>{vn}</span>
              </div>
              <div style={{
                width: tw, height: th, borderRadius: 6,
                overflow: "hidden", pointerEvents: "none", alignSelf: "center",
              }}>
                <div style={{ transform: `scale(${ts})`, transformOrigin: "top left", width: item.w, height: item.h }}>
                  <C type={item.type} v={pv} p={p} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}, (prev, next) =>
  prev.expCat === next.expCat &&
  prev.catItems === next.catItems &&
  prev.prefV === next.prefV &&
  prev.p === next.p &&
  prev.pDrag === next.pDrag &&
  prev.texture === next.texture
);

export default LibrarySidebar;
