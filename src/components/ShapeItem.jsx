import React, { memo } from "react";
import C from "./ComponentRenderer";
import PropsPanel from "./PropsPanel";
import { FONTS, HAS_TEXT, HAS_PROPS } from "../constants";
import { maxV, varName, getTextureStyle } from "../utils";

/* ── Shared toolbar pill button ── */
const pillBtn = (p) => ({
  width: 26, height: 26, borderRadius: 999, border: "none",
  background: p.su, display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", color: p.tx, fontFamily: "system-ui", padding: 0,
  transition: "background .15s ease, transform .1s ease", outline: "none",
});

const pillHover = (p) => ({
  onMouseEnter: e => { e.currentTarget.style.background = p.ac + "28"; e.currentTarget.style.transform = "scale(1.08)"; },
  onMouseLeave: e => { e.currentTarget.style.background = p.su; e.currentTarget.style.transform = "scale(1)"; },
});

const ShapeItem = memo(function ShapeItem({ s, sel, selAll, drag, device, selFont, p, onDown, onSelect, onText, onProp, cycle, cycleFont, cycleFsize, delShape, setRsz, texture }) {
  const isDrg = drag === s.id;
  const sx = s.x, sy = s.y, sw = s.w, sh = s.h;
  const isSel = selAll.has(s.id), isPrimary = sel === s.id;
  const mx = maxV(s.type);
  const vn = varName(s.type, s.variant || 0);
  const fontIdx = selFont !== null && isPrimary ? selFont : (s.font || 0);
  const fn = FONTS[fontIdx]?.name || FONTS[0].name;
  const ff = FONTS[fontIdx]?.family || FONTS[0].family;
  const pb = pillBtn(p);
  const ph = pillHover(p);
  const sep = <div style={{ width: 1, height: 16, background: p.bd, margin: "0 2px", flexShrink: 0 }} />;

  return (
    <div
      data-shape="1"
      onMouseDownCapture={() => onSelect(s)}
      onTouchStartCapture={() => onSelect(s)}
      style={{ position: "absolute", left: sx, top: sy, width: sw, zIndex: isDrg ? 100 : isSel ? 50 : 1 }}>

      {/* ── Top toolbar (variants, fonts, font size) ── */}
      {isPrimary && !isDrg && (mx > 1 || HAS_TEXT.has(s.type)) && (
        <div style={{
          position: "absolute", top: -44, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 1, zIndex: 200,
          background: p.card + "EE", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${p.bd}`, borderRadius: 999,
          padding: "2px 3px", boxShadow: `0 4px 16px ${p.tx}10`,
          whiteSpace: "nowrap", userSelect: "none",
          ...getTextureStyle(texture, p),
        }}>
          {mx > 1 && <>
            <button aria-label="Previous variant" {...ph}
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycle(s.id, -1); }}
              style={{ ...pb, fontSize: 15 }}>{"‹"}</button>
            <span style={{ fontSize: 9, color: p.mu, padding: "0 4px", width: 68, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>{vn}</span>
            <button aria-label="Next variant" {...ph}
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycle(s.id, 1); }}
              style={{ ...pb, fontSize: 15 }}>{"›"}</button>
            {(HAS_TEXT.has(s.type) || s.type === "code-block") && sep}
          </>}
          {HAS_TEXT.has(s.type) && s.type !== "code-block" && <>
            <button aria-label="Previous font" {...ph}
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycleFont(s.id, -1); }}
              style={{ ...pb, fontSize: 15 }}>{"‹"}</button>
            <span style={{ fontSize: 9, color: p.ac, padding: "0 4px", width: 100, textAlign: "center", fontFamily: ff, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{fn}</span>
            <button aria-label="Next font" {...ph}
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycleFont(s.id, 1); }}
              style={{ ...pb, fontSize: 15 }}>{"›"}</button>
            {sep}
          </>}
          {(HAS_TEXT.has(s.type) || s.type === "code-block") && <>
            <button aria-label="Decrease font size" {...ph}
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycleFsize(s.id, -1); }}
              style={{ ...pb, fontSize: 11, fontWeight: 600 }}>A&#x2212;</button>
            <span style={{ fontSize: 9, color: p.mu, padding: "0 2px", width: 32, textAlign: "center" }}>{Math.round((s.fsize || 1) * 100)}%</span>
            <button aria-label="Increase font size" {...ph}
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycleFsize(s.id, 1); }}
              style={{ ...pb, fontSize: 13, fontWeight: 600 }}>A+</button>
          </>}
        </div>
      )}

      {/* ── Delete button ── */}
      {isPrimary && !isDrg && s.type !== "code-block" && (
        <button aria-label="Delete component"
          onPointerDown={e => { e.stopPropagation(); e.preventDefault(); delShape(s.id); }}
          onMouseEnter={e => { e.currentTarget.style.background = "#E0524D"; e.currentTarget.style.transform = "scale(1.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = p.mu + "88"; e.currentTarget.style.transform = "scale(1)"; }}
          style={{
            position: "absolute", top: -12, right: -12, width: 28, height: 28,
            borderRadius: 999, background: p.mu + "88", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 201,
            transition: "background .15s ease, transform .15s ease", outline: "none",
          }}>
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" /></svg>
        </button>
      )}

      {/* ── Component body ── */}
      <div
        onMouseDown={e => { if ((s.type === "code-block" || s.type === "chat") && !e.target.closest("[data-ide-drag]")) return; onDown(e, s); }}
        onTouchStart={e => { if ((s.type === "code-block" || s.type === "chat") && !e.target.closest("[data-ide-drag]")) return; onDown(e, s); }}
        style={{
          width: sw, height: sh,
          cursor: (s.type === "code-block" || s.type === "chat") ? "default" : (isDrg ? "grabbing" : "grab"),
          transition: isDrg ? "none" : "transform .15s ease, filter .2s ease",
          transform: isDrg ? "scale(1.015)" : "scale(1)",
          filter: isDrg ? `drop-shadow(0 8px 20px ${p.ac}15)` : "none",
          outline: isSel ? `2px solid ${p.ac}${isPrimary ? "88" : "44"}` : "none",
          outlineOffset: 4, borderRadius: 14,
          ...(device !== "free" ? { overflow: "hidden" } : {}),
          WebkitTapHighlightColor: "transparent", touchAction: "none",
        }}>
        <C type={s.type} v={s.variant || 0} p={p} editable={isPrimary} texts={s.texts || {}} onText={(k, val) => onText(s.id, k, val)} props={s.props || {}} onProp={(k, val) => onProp(s.id, k, val)} font={s.font || 0} fsize={s.fsize || 1} texture={texture} />

        {/* ── Resize handle ── */}
        {isPrimary && (
          <div
            onMouseDown={e => { e.stopPropagation(); setRsz(s.id); }}
            onTouchStart={e => { e.stopPropagation(); setRsz(s.id); }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.2)"; e.currentTarget.style.boxShadow = `0 0 6px ${p.ac}40`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
            style={{
              position: "absolute", right: -4, bottom: -4, width: 14, height: 14,
              background: p.ac, borderRadius: 3, cursor: "nwse-resize", zIndex: 11,
              transition: "transform .15s ease, box-shadow .15s ease",
            }}
          />
        )}
      </div>

      {/* ── Props panel ── */}
      {isPrimary && !isDrg && HAS_PROPS.has(s.type) && (
        <PropsPanel type={s.type} props={s.props || {}} onProp={(k, val) => onProp(s.id, k, val)} p={p} />
      )}
    </div>
  );
}, (prev, next) => {
  const id = prev.s.id;
  const wasPrimary = prev.sel === id, isPrimary = next.sel === id;
  return prev.s === next.s &&
    wasPrimary === isPrimary &&
    (prev.drag === id) === (next.drag === id) &&
    prev.device === next.device &&
    (wasPrimary ? prev.selFont : null) === (isPrimary ? next.selFont : null) &&
    prev.p === next.p &&
    prev.selAll.has(id) === next.selAll.has(id);
});

export default ShapeItem;
