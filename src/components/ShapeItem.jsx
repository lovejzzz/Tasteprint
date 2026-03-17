import React, { memo } from "react";
import C from "./ComponentRenderer";
import PropsPanel from "./PropsPanel";
import { FONTS, HAS_TEXT, HAS_PROPS } from "../constants";
import { maxV, varName, getTextureStyle, DESIGN_MOODS } from "../utils";

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

const ShapeItem = memo(function ShapeItem({ s, sel, selAll, drag, device, selFont, p, onDown, onSelect, onText, onProp, cycle, cycleFont, cycleFsize, randomize, undoRandomize, hasRndUndo, copyStyle, pasteStyle, hasCopiedStyle, delShape, setRsz, texture, designMood, setDesignMood, dScore }) {
  const isDrg = drag === s.id;
  const sx = s.x, sy = s.y, sw = s.w, sh = s.h;
  const isSel = selAll.has(s.id), isPrimary = sel === s.id;
  const mx = maxV(s.type);
  const vn = varName(s.type, s.variant || 0);
  const fontIdx = selFont !== null && isPrimary ? selFont : (s.font || 0);
  const fn = FONTS[fontIdx]?.name || FONTS[0].name;
  const ff = FONTS[fontIdx]?.family || FONTS[0].family;
  const ds = s.dStyles || {};
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
      {isPrimary && !isDrg && (
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
          {sep}
          <button aria-label="Cycle design mood"
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); const idx = DESIGN_MOODS.findIndex(m => m.id === (designMood || "auto")); setDesignMood(DESIGN_MOODS[(idx + 1) % DESIGN_MOODS.length].id); }}
            {...ph}
            style={{ ...pb, width: "auto", padding: "0 7px", gap: 3, fontSize: 9, fontWeight: 500, color: designMood === "auto" ? p.mu : p.ac }}>
            <span style={{ fontSize: 10 }}>{(DESIGN_MOODS.find(m => m.id === (designMood || "auto")) || DESIGN_MOODS[0]).icon}</span>
            <span>{(DESIGN_MOODS.find(m => m.id === (designMood || "auto")) || DESIGN_MOODS[0]).label}</span>
          </button>
          <button aria-label="Randomize design"
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); randomize(s.id); }}
            onMouseEnter={e => { e.currentTarget.style.background = p.ac + "28"; e.currentTarget.style.transform = "scale(1.12) rotate(15deg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = p.su; e.currentTarget.style.transform = "scale(1)"; }}
            style={{ ...pb, fontSize: 13, transition: "background .15s ease, transform .2s cubic-bezier(.4,1,.6,1)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.ac} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="3" />
              <circle cx="8" cy="8" r="1.5" fill={p.ac} stroke="none" />
              <circle cx="16" cy="8" r="1.5" fill={p.ac} stroke="none" />
              <circle cx="8" cy="16" r="1.5" fill={p.ac} stroke="none" />
              <circle cx="16" cy="16" r="1.5" fill={p.ac} stroke="none" />
              <circle cx="12" cy="12" r="1.5" fill={p.ac} stroke="none" />
            </svg>
          </button>
          {hasRndUndo && <button aria-label="Undo randomize" {...ph}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); undoRandomize(); }}
            style={{ ...pb, fontSize: 11, width: "auto", padding: "0 6px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={p.mu} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>}
          {dScore > 0 && <span aria-label={`Design score: ${dScore} of 5`} style={{ display: "flex", gap: 1.5, alignItems: "center", padding: "0 4px" }}>
            {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ width: 4, height: 4, borderRadius: 2, background: i <= dScore ? (dScore >= 4 ? p.ac : dScore >= 3 ? p.mu : "#E0524D") : p.bd, transition: "background .2s ease" }} />)}
          </span>}
          {sep}
          <button aria-label="Copy style" {...ph}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); copyStyle(s.id); }}
            style={{ ...pb, fontSize: 10, fontWeight: 500, width: "auto", padding: "0 5px", color: p.mu }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          {hasCopiedStyle && <button aria-label="Paste style" {...ph}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); pasteStyle(s.id); }}
            style={{ ...pb, fontSize: 10, fontWeight: 500, width: "auto", padding: "0 5px", color: p.ac }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
          </button>}
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
          transition: isDrg ? "none" : "transform .15s ease, filter .2s ease, box-shadow .3s ease, border-radius .3s ease",
          transform: isDrg ? "scale(1.015)" : [ds.perspective && `perspective(${ds.perspective}px)`, ds.rotate && `rotate(${ds.rotate})`, ds.rotateY && `rotateY(${ds.rotateY}deg)`, ds.scale && `scale(${ds.scale})`, ds.skewX && `skewX(${ds.skewX}deg)`, ds.skewY && `skewY(${ds.skewY}deg)`, ds.translateY && `translateY(${ds.translateY}px)`].filter(Boolean).join(" ") || "scale(1)",
          filter: isDrg ? `drop-shadow(0 8px 20px ${p.ac}15)` : [ds.filter, ds.hueRotate && `hue-rotate(${ds.hueRotate}deg)`].filter(Boolean).join(" ") || "none",
          outline: isSel ? `2px solid ${p.ac}${isPrimary ? "88" : "44"}` : (ds.outline || "none"),
          outlineOffset: isSel ? 4 : (ds.outlineOffset ? parseInt(ds.outlineOffset) : 4),
          borderRadius: ds.borderRadius ?? 14,
          boxShadow: ds.boxShadow && ds.boxShadow !== "none" ? ds.boxShadow : undefined,
          backdropFilter: ds.backdropFilter,
          border: ds.border || undefined,
          borderTop: ds.borderTop || undefined,
          borderBottom: ds.borderBottom || undefined,
          borderLeft: ds.borderLeft || undefined,
          borderRight: ds.borderRight || undefined,
          textShadow: ds.textShadow || undefined,
          letterSpacing: ds.letterSpacing || undefined,
          wordSpacing: ds.wordSpacing || undefined,
          fontWeight: ds.fontWeight || undefined,
          textTransform: ds.textTransform || undefined,
          position: "relative",
          overflow: (device !== "free" || ds.borderRadius === 999) ? "hidden" : undefined,
          WebkitTapHighlightColor: "transparent", touchAction: "none",
        }}>
        {/* Gradient overlay layer */}
        {ds.gradientOverlay && <div style={{ position: "absolute", inset: 0, background: ds.gradientOverlay, borderRadius: ds.borderRadius ?? 14, pointerEvents: "none", zIndex: 1, mixBlendMode: ds.mixBlendMode || "normal" }} />}
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
    prev.selAll.has(id) === next.selAll.has(id) &&
    prev.designMood === next.designMood &&
    prev.hasRndUndo === next.hasRndUndo &&
    prev.hasCopiedStyle === next.hasCopiedStyle &&
    prev.dScore === next.dScore &&
    prev.s.dStyles === next.s.dStyles;
});

export default ShapeItem;
