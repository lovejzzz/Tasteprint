import { memo } from "react";
import C from "./ComponentRenderer";
import { ErrorBoundary } from "./ErrorBoundary";
import PropsPanel from "./PropsPanel";
import { FONTS, HAS_TEXT, HAS_PROPS } from "../constants";
import { maxV, varName } from "../utils";
import "./shapeitem.css";


const ShapeItem = memo(function ShapeItem({ s, sel, selAll, drag, device, selFont, p, reducedMotion, onDown, onSelect, onText, onProp, cycle, cycleFont, cycleFsize, randomize, styleSource, setStyleSource, copyStyle, delShape, setRsz }) {
  const isDrg = drag === s.id;
  const sx = s.x, sy = s.y, sw = s.w, sh = s.h;
  const isSel = selAll.has(s.id), isPrimary = sel === s.id;
  const isStyleSource = styleSource === s.id;
  const hasActiveSource = styleSource != null && styleSource !== s.id;
  const mx = maxV(s.type);
  const vn = varName(s.type, s.variant || 0);
  const fontIdx = selFont !== null && isPrimary ? selFont : (s.font || 0);
  const fn = FONTS[fontIdx]?.name || FONTS[0].name;
  const ff = FONTS[fontIdx]?.family || FONTS[0].family;
  const ds = s.dStyles || {};

  return (
    <div
      data-shape="1"
      onMouseDownCapture={() => onSelect(s)}
      onTouchStartCapture={() => onSelect(s)}
      className={s._pickyDelay != null && !reducedMotion ? "tp-picky-shape-enter" : undefined}
      style={{
        position: "absolute", left: sx, top: sy, width: sw, zIndex: isDrg ? 100 : isSel ? 50 : 1,
        ...(s._pickyDelay != null && !reducedMotion ? { animationDelay: `${s._pickyDelay}ms` } : {}),
      }}>

      {/* ── Top toolbar (variants, fonts, font size) ── */}
      {isPrimary && !isDrg && (
        <div className="tp-shape-toolbar"
          style={{ background: p.card + "EE", border: `1px solid ${p.bd}`, boxShadow: `0 4px 16px ${p.tx}10` }}>
          {/* Drag handle */}
          <div className="tp-drag-handle"
            onMouseDown={e => { e.stopPropagation(); onDown(e, s); }}
            onTouchStart={e => { e.stopPropagation(); onDown(e, s); }}
            style={{ color: p.mu }}
            title="Drag to move"
          >
            <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
              <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
              <circle cx="2" cy="5" r="1.2"/><circle cx="6" cy="5" r="1.2"/>
              <circle cx="2" cy="8" r="1.2"/><circle cx="6" cy="8" r="1.2"/>
            </svg>
          </div>
          {mx > 1 && <>
            <button aria-label="Previous variant" className="tp-pill-btn"
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycle(s.id, -1); }}
              style={{ background: p.su, color: p.tx, fontSize: 15 }}>{"‹"}</button>
            <span className="tp-toolbar-label tp-toolbar-label--variant" style={{ color: p.mu }}>{vn}</span>
            <button aria-label="Next variant" className="tp-pill-btn"
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycle(s.id, 1); }}
              style={{ background: p.su, color: p.tx, fontSize: 15 }}>{"›"}</button>
            {(HAS_TEXT.has(s.type) || s.type === "code-block") && <div className="tp-toolbar-sep" style={{ background: p.bd }} />}
          </>}
          {HAS_TEXT.has(s.type) && s.type !== "code-block" && <>
            <button aria-label="Previous font" className="tp-pill-btn"
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycleFont(s.id, -1); }}
              style={{ background: p.su, color: p.tx, fontSize: 15 }}>{"‹"}</button>
            <span className="tp-toolbar-label tp-toolbar-label--font" style={{ color: p.ac, fontFamily: ff }}>{fn}</span>
            <button aria-label="Next font" className="tp-pill-btn"
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycleFont(s.id, 1); }}
              style={{ background: p.su, color: p.tx, fontSize: 15 }}>{"›"}</button>
            <div className="tp-toolbar-sep" style={{ background: p.bd }} />
          </>}
          {(HAS_TEXT.has(s.type) || s.type === "code-block") && <>
            <button aria-label="Decrease font size" className="tp-pill-btn"
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycleFsize(s.id, -1); }}
              style={{ background: p.su, color: p.tx, fontSize: 11, fontWeight: 600 }}>A&#x2212;</button>
            <span className="tp-toolbar-label tp-toolbar-label--fsize" style={{ color: p.mu }}>{Math.round((s.fsize || 1) * 100)}%</span>
            <button aria-label="Increase font size" className="tp-pill-btn"
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycleFsize(s.id, 1); }}
              style={{ background: p.su, color: p.tx, fontSize: 13, fontWeight: 600 }}>A+</button>
          </>}
          <div className="tp-toolbar-sep" style={{ background: p.bd }} />
          {/* Dice — randomize design */}
          <button aria-label="Randomize design" className="tp-pill-btn tp-pill-btn--dice"
            onPointerDown={e => {
              e.stopPropagation(); e.preventDefault();
              const btn = e.currentTarget;
              btn.style.transition = "transform .4s cubic-bezier(.2,.8,.2,1.4)";
              btn.style.transform = "scale(1.2) rotate(360deg)";
              setTimeout(() => { btn.style.transition = "transform .2s cubic-bezier(.4,1,.6,1)"; btn.style.transform = "scale(1)"; }, 400);
              randomize(s.id);
            }}
            style={{ background: p.su, color: p.tx, fontSize: 13 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.ac} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="3" />
              <circle cx="8" cy="8" r="1.5" fill={p.ac} stroke="none" />
              <circle cx="16" cy="8" r="1.5" fill={p.ac} stroke="none" />
              <circle cx="8" cy="16" r="1.5" fill={p.ac} stroke="none" />
              <circle cx="16" cy="16" r="1.5" fill={p.ac} stroke="none" />
              <circle cx="12" cy="12" r="1.5" fill={p.ac} stroke="none" />
            </svg>
          </button>
          {/* Copy style */}
          <button aria-label={isStyleSource ? "Cancel copy" : "Copy style"} className="tp-pill-btn"
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); isStyleSource ? setStyleSource(null) : setStyleSource(s.id); }}
            style={{ background: isStyleSource ? p.ac + "18" : p.su, color: isStyleSource ? p.ac : p.mu, fontSize: 11 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          {/* Paste style */}
          {hasActiveSource && (
            <button aria-label="Paste style" className="tp-pill-btn"
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); copyStyle(styleSource, s.id); }}
              style={{ background: p.ac + "18", color: p.ac, fontSize: 11 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ── Delete button ── */}
      {isPrimary && !isDrg && s.type !== "code-block" && (
        <button aria-label="Delete component" className="tp-delete-btn"
          onPointerDown={e => { e.stopPropagation(); e.preventDefault(); delShape(s.id); }}
          style={{ background: p.mu + "88" }}>
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
          transition: isDrg || reducedMotion ? "none" : (ds.transition || "transform .15s ease, filter .2s ease, box-shadow .3s ease, border-radius .3s ease"),
          transformOrigin: ds.transformOrigin || "center center",
          transform: isDrg ? "scale(1.015)" : [ds.perspective && `perspective(${ds.perspective}px)`, ds.rotate && `rotate(${ds.rotate})`, ds.rotateX && `rotateX(${ds.rotateX}deg)`, ds.rotateY && `rotateY(${ds.rotateY}deg)`, ds.scale && `scale(${ds.scale})`, ds.transform, ds.skewX && `skewX(${ds.skewX}deg)`, ds.skewY && `skewY(${ds.skewY}deg)`, ds.translateY && `translateY(${ds.translateY}px)`].filter(Boolean).join(" ") || "scale(1)",
          filter: isDrg ? `drop-shadow(0 8px 20px ${p.ac}15)` : [ds.filter, ds.hueRotate && `hue-rotate(${ds.hueRotate}deg)`].filter(Boolean).join(" ") || "none",
          outline: isStyleSource ? `2px dashed ${p.ac}` : isSel ? `2px solid ${p.ac}${isPrimary ? "88" : "44"}` : (ds.outline || "none"),
          outlineOffset: isStyleSource ? 6 : isSel ? 4 : (ds.outlineOffset ? parseInt(ds.outlineOffset) : 4),
          color: ds.color || undefined,
          background: ds.background || undefined,
          padding: ds.densityPadding ? ds.densityPadding : undefined,
          borderRadius: ds.borderRadius ?? 14,
          boxShadow: ds.boxShadow && ds.boxShadow !== "none" ? ds.boxShadow : undefined,
          backdropFilter: ds.backdropFilter,
          WebkitBackdropFilter: ds.backdropFilter,
          border: ds.border || undefined,
          borderImage: ds.borderImage || undefined,
          borderImageSlice: ds.borderImageSlice || undefined,
          borderTop: ds.borderTop || undefined,
          borderBottom: ds.borderBottom || undefined,
          borderLeft: ds.borderLeft || undefined,
          borderRight: ds.borderRight || undefined,
          textShadow: ds.textShadow || undefined,
          WebkitTextStroke: ds.textStroke || undefined,
          WebkitTextFillColor: ds.textFillColor || undefined,
          letterSpacing: ds.letterSpacing || undefined,
          wordSpacing: ds.wordSpacing || undefined,
          fontWeight: ds.fontWeight || undefined,
          fontStyle: ds.fontStyle || undefined,
          fontVariant: ds.fontVariant || undefined,
          textIndent: ds.textIndent || undefined,
          textTransform: ds.textTransform || undefined,
          textDecoration: ds.textDecoration || undefined,
          textDecorationColor: ds.textDecorationColor || undefined,
          textDecorationStyle: ds.textDecorationStyle || undefined,
          textDecorationThickness: ds.textDecorationThickness || undefined,
          textUnderlineOffset: ds.textUnderlineOffset || undefined,
          lineHeight: ds.lineHeight || undefined,
          opacity: ds.opacity || undefined,
          clipPath: ds.clipPath || undefined,
          WebkitMaskImage: ds.maskImage || undefined,
          maskImage: ds.maskImage || undefined,
          animation: isDrg || reducedMotion ? "none" : (ds.animation || undefined),
          ...(ds.cssVars || {}),
          position: "relative",
          overflow: (device !== "free" || ds.borderRadius === 999) ? "hidden" : undefined,
          WebkitTapHighlightColor: "transparent", touchAction: "none",
        }}>
        {/* Gradient overlay layer */}
        {ds.gradientOverlay && <div style={{ position: "absolute", inset: 0, background: ds.gradientOverlay, borderRadius: ds.borderRadius ?? 14, pointerEvents: "none", zIndex: 1, mixBlendMode: ds.mixBlendMode || "normal" }} />}
        {ds.gradientOverlay2 && <div style={{ position: "absolute", inset: 0, background: ds.gradientOverlay2, borderRadius: ds.borderRadius ?? 14, pointerEvents: "none", zIndex: 2, mixBlendMode: ds.mixBlendMode2 || "normal" }} />}
        {ds.gradientOverlay3 && <div style={{ position: "absolute", inset: 0, background: ds.gradientOverlay3, borderRadius: ds.borderRadius ?? 14, pointerEvents: "none", zIndex: 2 }} />}
        {ds.gradientOverlay4 && <div style={{ position: "absolute", inset: 0, background: ds.gradientOverlay4, borderRadius: ds.borderRadius ?? 14, pointerEvents: "none", zIndex: 2, mixBlendMode: ds.mixBlendMode4 || "normal" }} />}
        {ds.textureOverlay && <div style={{ position: "absolute", inset: 0, backgroundImage: ds.textureOverlay, backgroundSize: ds.textureSize || undefined, backgroundBlendMode: ds.textureBlendMode || undefined, mixBlendMode: ds.textureMixBlend || undefined, borderRadius: ds.borderRadius ?? 14, pointerEvents: "none", zIndex: 3 }} />}
        <ErrorBoundary>
          <C type={s.type} v={s.variant || 0} p={p} editable={isPrimary} texts={s.texts || {}} onText={(k, val) => onText(s.id, k, val)} props={s.props || {}} onProp={(k, val) => onProp(s.id, k, val)} font={s.font || 0} fsize={s.fsize || 1} dStyles={ds} />
        </ErrorBoundary>

        {/* ── Resize handle ── */}
        {isPrimary && (
          <div className="tp-resize-handle"
            onMouseDown={e => { e.stopPropagation(); setRsz(s.id); }}
            onTouchStart={e => { e.stopPropagation(); setRsz(s.id); }}
            style={{ background: p.ac }}
          />
        )}
      </div>

      {/* ── Style source badge (visible when not primary-selected) ── */}
      {isStyleSource && !isPrimary && (
        <div className="tp-style-badge" style={{ background: p.ac, boxShadow: `0 2px 8px ${p.ac}40` }}>Style Source</div>
      )}

      {/* ── Paste style target button (visible on non-source when source is active and not primary) ── */}
      {hasActiveSource && !isPrimary && (
        <button aria-label="Apply style from source" className="tp-apply-style-btn"
          onPointerDown={e => { e.stopPropagation(); e.preventDefault(); copyStyle(styleSource, s.id); }}
          style={{ background: p.ac + "CC", boxShadow: `0 2px 8px ${p.ac}30` }}>Apply Style</button>
      )}

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
    prev.styleSource === next.styleSource &&
    prev.s.dStyles === next.s.dStyles &&
    prev.reducedMotion === next.reducedMotion;
});

export default ShapeItem;
