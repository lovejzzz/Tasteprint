import React, { memo, useState } from "react";
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

/* ── Keyboard shortcut hint badge ── */
const KBHint = ({ label, p: pal, style: extraStyle }) => (
  <span style={{ fontSize: 8, padding: "1px 3px", borderRadius: 3, background: pal.su, color: pal.mu, fontFamily: "system-ui", lineHeight: 1, pointerEvents: "none", fontWeight: 500, letterSpacing: ".02em", whiteSpace: "nowrap", ...extraStyle }}>{label}</span>
);

const ShapeItem = memo(function ShapeItem({ s, sel, selAll, drag, device, selFont, p, onDown, onSelect, onText, onProp, cycle, cycleFont, cycleFsize, randomize, undoRandomize, hasRndUndo, styleSource, setStyleSource, copyStyle, delShape, setRsz, texture, designMood, setDesignMood, dScore, candidates, candidateIdx, cycleVariation, designHistory, undoDesign, isLocked, toggleLock }) {
  const [hovered, setHovered] = useState(false);
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
  const pb = pillBtn(p);
  const ph = pillHover(p);
  const sep = <div style={{ width: 1, height: 16, background: p.bd, margin: "0 2px", flexShrink: 0 }} />;

  return (
    <div
      data-shape="1"
      onMouseDownCapture={() => onSelect(s)}
      onTouchStartCapture={() => onSelect(s)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button aria-label={isLocked ? "Unlock from randomize-all" : "Lock to protect from randomize-all"}
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); toggleLock(s.id); }}
              onMouseEnter={e => { e.currentTarget.style.background = isLocked ? p.ac + "28" : p.ac + "18"; e.currentTarget.style.transform = "scale(1.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = isLocked ? p.ac + "18" : p.su; e.currentTarget.style.transform = "scale(1)"; }}
              style={{ ...pb, fontSize: 12, background: isLocked ? p.ac + "18" : p.su, color: isLocked ? p.ac : p.mu }}>
              {isLocked ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={p.ac} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={p.mu} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
              )}
            </button>
            {hovered && isPrimary && <KBHint label="L" p={p} style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)" }} />}
          </div>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button aria-label="Randomize design"
              onPointerDown={e => {
                e.stopPropagation(); e.preventDefault();
                // Dice roll animation: spin + bounce
                const btn = e.currentTarget;
                btn.style.transition = "transform .4s cubic-bezier(.2,.8,.2,1.4)";
                btn.style.transform = "scale(1.2) rotate(360deg)";
                setTimeout(() => { btn.style.transition = "transform .2s cubic-bezier(.4,1,.6,1)"; btn.style.transform = "scale(1)"; }, 400);
                randomize(s.id);
              }}
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
            {hovered && isPrimary && <KBHint label="R" p={p} style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)" }} />}
          </div>
          {designHistory && designHistory.length > 0 && (
            <div style={{ position: "relative", display: "inline-flex" }}>
              <button aria-label={`Undo design (${designHistory.length} available)`}
                onPointerDown={e => { e.stopPropagation(); e.preventDefault(); undoDesign(s.id); }}
                onMouseEnter={e => { e.currentTarget.style.background = p.ac + "28"; e.currentTarget.style.transform = "scale(1.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = p.su; e.currentTarget.style.transform = "scale(1)"; }}
                style={{ ...pb, fontSize: 11, width: "auto", padding: "0 5px", gap: 2, position: "relative" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={p.ac} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                {designHistory.length > 1 && (
                  <span style={{ position: "absolute", top: -4, right: -4, minWidth: 13, height: 13, borderRadius: 999, background: p.ac, color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: "0 3px" }}>
                    {designHistory.length}
                  </span>
                )}
              </button>
              {hovered && isPrimary && <KBHint label="Z" p={p} style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)" }} />}
            </div>
          )}
          {candidates && candidates.length > 1 && (
            <div style={{ position: "relative", display: "inline-flex" }}>
              <button aria-label="Cycle to next design variation"
                onPointerDown={e => { e.stopPropagation(); e.preventDefault(); cycleVariation(s.id); }}
                onMouseEnter={e => { e.currentTarget.style.background = p.ac + "28"; e.currentTarget.style.transform = "scale(1.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = p.ac + "14"; e.currentTarget.style.transform = "scale(1)"; }}
                style={{ ...pb, width: "auto", padding: "0 7px", gap: 3, fontSize: 9, fontWeight: 600, background: p.ac + "14", color: p.ac, letterSpacing: ".02em" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={p.ac} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span>{(candidateIdx >= 0 ? candidateIdx : 0) + 1}/{candidates.length}</span>
              </button>
              {hovered && isPrimary && <KBHint label="\u2190/\u2192" p={p} style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)" }} />}
            </div>
          )}
          {hasRndUndo && <button aria-label="Undo randomize" {...ph}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); undoRandomize(); }}
            style={{ ...pb, fontSize: 11, width: "auto", padding: "0 6px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={p.mu} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>}
          {dScore > 0 && <span aria-label={`Design score: ${dScore} of 5`} style={{ display: "flex", gap: 2, alignItems: "center", padding: "0 5px", cursor: "default" }}
            title={dScore >= 5 ? "Perfect harmony" : dScore >= 4 ? "Great design" : dScore >= 3 ? "Decent — try another roll" : dScore >= 2 ? "Clashing styles" : "Needs work"}>
            {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ width: 4, height: 4, borderRadius: 2, background: i <= dScore ? (dScore >= 4 ? p.ac : dScore >= 3 ? p.mu : "#E0524D") : p.bd, transition: "background .2s ease" }} />)}
            <span style={{ fontSize: 8, fontWeight: 600, color: dScore >= 4 ? p.ac : dScore >= 3 ? p.mu : "#E0524D", marginLeft: 1, opacity: 0.8 }}>
              {dScore >= 5 ? "✦" : dScore >= 4 ? "◆" : dScore <= 2 ? "⚠" : ""}
            </span>
          </span>}
          {sep}
          {/* Style transfer: eyedropper to set source, or paste if source is active */}
          {hasActiveSource ? (
            <button aria-label="Paste style from source"
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); copyStyle(styleSource, s.id); }}
              onMouseEnter={e => { e.currentTarget.style.background = p.ac + "30"; e.currentTarget.style.transform = "scale(1.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = p.ac + "18"; e.currentTarget.style.transform = "scale(1)"; }}
              style={{ ...pb, fontSize: 9, fontWeight: 600, width: "auto", padding: "0 7px", gap: 3, background: p.ac + "18", color: p.ac }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
              </svg>
              <span>Apply</span>
            </button>
          ) : (
            <div style={{ position: "relative", display: "inline-flex" }}>
              <button aria-label={isStyleSource ? "Cancel style source" : "Set as style source"}
                onPointerDown={e => { e.stopPropagation(); e.preventDefault(); isStyleSource ? setStyleSource(null) : setStyleSource(s.id); }}
                onMouseEnter={e => { e.currentTarget.style.background = isStyleSource ? "#E0524D22" : p.ac + "28"; e.currentTarget.style.transform = "scale(1.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isStyleSource ? p.ac + "18" : p.su; e.currentTarget.style.transform = "scale(1)"; }}
                style={{ ...pb, fontSize: 9, fontWeight: 500, width: "auto", padding: "0 6px", gap: 3, color: isStyleSource ? p.ac : p.mu, background: isStyleSource ? p.ac + "18" : p.su }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.54 3.54 3.75 3.75 3.54-3.54a1 1 0 0 0 0-1.41z" />
                  <path d="M13.42 6.83L3 17.25V21h3.75L17.17 10.58" />
                </svg>
                {isStyleSource && <span>Source</span>}
              </button>
              {hovered && isPrimary && <KBHint label="C" p={p} style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)" }} />}
            </div>
          )}
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
          transition: isDrg ? "none" : (ds.transition || "transform .15s ease, filter .2s ease, box-shadow .3s ease, border-radius .3s ease"),
          transformOrigin: ds.transformOrigin || "center center",
          transform: isDrg ? "scale(1.015)" : [ds.perspective && `perspective(${ds.perspective}px)`, ds.rotate && `rotate(${ds.rotate})`, ds.rotateX && `rotateX(${ds.rotateX}deg)`, ds.rotateY && `rotateY(${ds.rotateY}deg)`, ds.scale && `scale(${ds.scale})`, ds.transform, ds.skewX && `skewX(${ds.skewX}deg)`, ds.skewY && `skewY(${ds.skewY}deg)`, ds.translateY && `translateY(${ds.translateY}px)`].filter(Boolean).join(" ") || "scale(1)",
          filter: isDrg ? `drop-shadow(0 8px 20px ${p.ac}15)` : [ds.filter, ds.hueRotate && `hue-rotate(${ds.hueRotate}deg)`].filter(Boolean).join(" ") || "none",
          outline: isStyleSource ? `2px dashed ${p.ac}` : isSel ? `2px solid ${p.ac}${isPrimary ? "88" : "44"}` : (ds.outline || "none"),
          outlineOffset: isStyleSource ? 6 : isSel ? 4 : (ds.outlineOffset ? parseInt(ds.outlineOffset) : 4),
          background: ds.background || undefined,
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
          textTransform: ds.textTransform || undefined,
          textDecoration: ds.textDecoration || undefined,
          textDecorationColor: ds.textDecorationColor || undefined,
          textDecorationStyle: ds.textDecorationStyle || undefined,
          textDecorationThickness: ds.textDecorationThickness || undefined,
          textUnderlineOffset: ds.textUnderlineOffset || undefined,
          lineHeight: ds.lineHeight || undefined,
          opacity: ds.opacity || undefined,
          /* transition handled above (merged with drag state) */
          clipPath: ds.clipPath || undefined,
          WebkitMaskImage: ds.maskImage || undefined,
          maskImage: ds.maskImage || undefined,
          animation: isDrg ? "none" : (ds.animation || undefined),
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
        <C type={s.type} v={s.variant || 0} p={p} editable={isPrimary} texts={s.texts || {}} onText={(k, val) => onText(s.id, k, val)} props={s.props || {}} onProp={(k, val) => onProp(s.id, k, val)} font={s.font || 0} fsize={s.fsize || 1} texture={texture} dStyles={ds} />

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

      {/* ── Style source badge (visible when not primary-selected) ── */}
      {isStyleSource && !isPrimary && (
        <div style={{
          position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
          background: p.ac, color: "#fff", fontSize: 9, fontWeight: 600,
          padding: "2px 8px", borderRadius: 999, zIndex: 200,
          letterSpacing: ".03em", whiteSpace: "nowrap",
          boxShadow: `0 2px 8px ${p.ac}40`,
        }}>Style Source</div>
      )}

      {/* ── Paste style target button (visible on non-source when source is active and not primary) ── */}
      {hasActiveSource && !isPrimary && (
        <button
          aria-label="Apply style from source"
          onPointerDown={e => { e.stopPropagation(); e.preventDefault(); copyStyle(styleSource, s.id); }}
          onMouseEnter={e => { e.currentTarget.style.background = p.ac; e.currentTarget.style.transform = "translateX(-50%) scale(1.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = p.ac + "CC"; e.currentTarget.style.transform = "translateX(-50%) scale(1)"; }}
          style={{
            position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
            background: p.ac + "CC", color: "#fff", fontSize: 9, fontWeight: 600,
            padding: "2px 10px", borderRadius: 999, zIndex: 200,
            border: "none", cursor: "pointer", whiteSpace: "nowrap",
            boxShadow: `0 2px 8px ${p.ac}30`,
            transition: "background .15s, transform .15s",
            fontFamily: "system-ui",
          }}>Apply Style</button>
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
    prev.designMood === next.designMood &&
    prev.hasRndUndo === next.hasRndUndo &&
    prev.styleSource === next.styleSource &&
    prev.dScore === next.dScore &&
    prev.s.dStyles === next.s.dStyles &&
    prev.candidates === next.candidates &&
    prev.candidateIdx === next.candidateIdx &&
    prev.designHistory === next.designHistory &&
    prev.isLocked === next.isLocked;
});

export default ShapeItem;
