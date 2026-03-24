import React, { useState, useEffect, useRef } from "react";
import C from "./ComponentRenderer";
import { ErrorBoundary } from "./ErrorBoundary";
import PickyCard from "./PickyCard";
import { PAGE_TEMPLATES, PICKY_MOODS, QUICK_PRESETS, CUSTOM_SLOT_OPTIONS, assembleShapes, loadPickyHistory, libEntry } from "../hooks/usePicky";
import { toPng } from "html-to-image";
import { PAL } from "../constants";
import { getReadableTextColor } from "../utils";
import { useLatestRef } from "../hooks/useLatestRef";
import "./picky.css";

const TEMPLATE_ICONS = {
  rocket: "\u{1F680}",
  chart: "\u{1F4CA}",
  palette: "\u{1F3A8}",
  cart: "\u{1F6D2}",
  pencil: "\u{270F}\uFE0F",
  cloud: "\u{2601}\uFE0F",
  fork: "\u{1F374}",
  calendar: "\u{1F4C5}",
  user: "\u{1F464}",
};

/**
 * Done phase with responsive preview toggle.
 */
function DonePhase({ pickCount, skipCount, template, picks, p, device, onBuild, onAddSlot, onRemix, onBack, onCancel }) {
  const [previewDevice, setPreviewDevice] = useState(device === "phone" ? "phone" : "desktop");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const previewRef = useRef(null);
  // Types already in the template
  const usedTypes = new Set(template?.slots.map(s => s.type) || []);

  if (pickCount === 0) {
    return (
      <div className="tp-picky" style={{ background: p.bg }}>
        <div className="tp-picky-center">
          <h2 style={{ color: p.tx, fontSize: 22, fontWeight: 600, margin: "0 0 8px", fontFamily: "inherit" }}>No sections picked</h2>
          <p style={{ color: p.mu, fontSize: 13, margin: "0 0 24px" }}>Go back and pick at least one section.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button type="button" className="tp-picky-btn-secondary" onClick={onBack} style={{ color: p.tx, borderColor: p.bd }}>Go Back</button>
            <button type="button" className="tp-picky-text-btn" onClick={onCancel} style={{ color: p.mu }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // Build preview shapes for the selected device
  const previewShapes = assembleShapes(template, picks, previewDevice, false);
  const previewW = previewDevice === "phone" ? 390 : 1280;
  const previewScale = Math.min(280 / previewW, 1);
  const totalH = previewShapes.length > 0
    ? previewShapes[previewShapes.length - 1].y + previewShapes[previewShapes.length - 1].h + 32
    : 200;
  const scaledH = Math.min(totalH * previewScale, 360);

  return (
    <div className="tp-picky" style={{ background: p.bg }}>
      <div className="tp-picky-center" style={{ maxWidth: 440 }}>
        <h2 style={{ color: p.tx, fontSize: 22, fontWeight: 600, margin: "0 0 8px", fontFamily: "inherit" }}>
          Your page is ready!
        </h2>
        <p style={{ color: p.mu, fontSize: 13, margin: "0 0 16px" }}>
          {pickCount} section{pickCount > 1 ? "s" : ""} selected{skipCount > 0 ? `, ${skipCount} skipped` : ""}.
        </p>

        {/* Device toggle */}
        <div className="tp-picky-device-toggle" style={{ borderColor: p.bd }}>
          {["desktop", "phone"].map(d => (
            <button
              key={d}
              type="button"
              className={`tp-picky-device-btn${previewDevice === d ? " tp-picky-device-btn--active" : ""}`}
              onClick={() => setPreviewDevice(d)}
              style={{
                color: previewDevice === d ? p.tx : p.mu,
                background: previewDevice === d ? p.su : "transparent",
              }}
            >
              {d === "desktop" ? "Desktop" : "Phone"}
            </button>
          ))}
        </div>

        {/* Scaled page preview */}
        <div
          ref={previewRef}
          className="tp-picky-page-preview"
          style={{
            width: previewW * previewScale,
            height: scaledH,
            background: p.bg,
            borderColor: p.bd,
            borderRadius: previewDevice === "phone" ? 16 : 8,
          }}
        >
          <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: previewW, position: "relative" }}>
            {previewShapes.map((s, i) => (
              <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: s.w, height: s.h, pointerEvents: "none", overflow: "hidden" }}>
                <ErrorBoundary fallback={<div style={{ width: s.w, height: s.h, background: p.su, borderRadius: 4 }} />}>
                  <C type={s.type} v={s.variant} p={p} font={s.font} fsize={s.fsize} props={s.props} />
                </ErrorBoundary>
              </div>
            ))}
          </div>
        </div>

        {/* Add another section */}
        {onAddSlot && (
          <div style={{ position: "relative", display: "inline-flex", justifyContent: "center", marginTop: 16 }}>
            <button
              type="button"
              className="tp-picky-text-btn"
              onClick={() => setShowAddMenu(v => !v)}
              style={{ color: p.ac, fontSize: 12, fontWeight: 500 }}
            >
              + Add another section
            </button>
            {showAddMenu && (
              <div className="tp-picky-add-menu" style={{ background: p.card, borderColor: p.bd, boxShadow: `0 8px 24px ${p.tx}10` }}>
                {CUSTOM_SLOT_OPTIONS.filter(o => !usedTypes.has(o.type)).slice(0, 8).map(o => (
                  <button
                    key={o.type}
                    type="button"
                    className="tp-picky-add-item"
                    onClick={() => { setShowAddMenu(false); onAddSlot(o.type); }}
                    style={{ color: p.tx }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" className="tp-picky-btn-primary" onClick={onBuild} style={{ background: p.ac, color: getReadableTextColor(p.ac) }}>
            Build Page
          </button>
          <button type="button" className="tp-picky-btn-secondary" onClick={() => {
            if (!previewRef.current) return;
            toPng(previewRef.current, { pixelRatio: 2, backgroundColor: p.bg })
              .then(url => { const a = document.createElement("a"); a.href = url; a.download = "picky-preview.png"; a.click(); })
              .catch(() => {});
          }} style={{ color: p.tx, borderColor: p.bd }}>
            Export PNG
          </button>
          <button type="button" className="tp-picky-btn-secondary" onClick={onRemix} style={{ color: p.ac, borderColor: p.ac + "40" }}>
            Remix
          </button>
          <button type="button" className="tp-picky-btn-secondary" onClick={onBack} style={{ color: p.tx, borderColor: p.bd }}>
            Go Back
          </button>
          <button type="button" className="tp-picky-text-btn" onClick={onCancel} style={{ color: p.mu }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom template builder — checklist of component types.
 */
function CustomBuilder({ p, picky, onCancel }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (type) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  return (
    <div className="tp-picky" style={{ background: p.bg }}>
      <div className="tp-picky-center" style={{ maxWidth: 480 }}>
        <h2 style={{ color: p.tx, fontSize: 22, fontWeight: 600, margin: "0 0 4px", fontFamily: "inherit" }}>
          Build your own template
        </h2>
        <p style={{ color: p.mu, fontSize: 13, margin: "0 0 20px" }}>
          Pick the sections you want. Order matches your selection.
        </p>
        <div className="tp-picky-custom-grid">
          {CUSTOM_SLOT_OPTIONS.map(opt => {
            const active = selected.has(opt.type);
            return (
              <button
                key={opt.type}
                type="button"
                className={`tp-picky-custom-chip${active ? " tp-picky-custom-chip--active" : ""}`}
                onClick={() => toggle(opt.type)}
                style={{
                  background: active ? p.ac + "18" : p.card,
                  borderColor: active ? p.ac : p.bd,
                  color: active ? p.ac : p.tx,
                }}
              >
                {active && <span style={{ fontSize: 10, marginRight: 3 }}>&#10003;</span>}
                {opt.label}
              </button>
            );
          })}
        </div>
        {selected.size > 0 && (
          <div aria-live="polite" style={{ fontSize: 11, color: p.mu, margin: "12px 0 0" }}>
            {selected.size} section{selected.size > 1 ? "s" : ""} selected
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
          <button
            type="button"
            className="tp-picky-btn-primary"
            onClick={() => picky.confirmCustom([...selected])}
            disabled={selected.size === 0}
            style={{
              background: selected.size > 0 ? p.ac : p.mu + "40",
              color: selected.size > 0 ? getReadableTextColor(p.ac) : p.mu,
              cursor: selected.size > 0 ? "pointer" : "default",
            }}
          >
            Continue
          </button>
          <button
            type="button"
            className="tp-picky-btn-secondary"
            onClick={() => picky.enterPicky()}
            style={{ color: p.tx, borderColor: p.bd }}
          >
            Back
          </button>
          <button type="button" className="tp-picky-text-btn" onClick={onCancel} style={{ color: p.mu }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mood picker with blend support.
 */
function MoodPicker({ picky, p, template, onCancel }) {
  const [blendMode, setBlendMode] = useState(false);
  const [blendFirst, setBlendFirst] = useState(null);

  const handleMoodClick = (moodId) => {
    if (blendMode) {
      if (!blendFirst) {
        setBlendFirst(moodId); // first mood selected
      } else {
        if (moodId === blendFirst) { setBlendFirst(null); return; } // deselect
        picky.selectMood(`blend:${blendFirst}+${moodId}`);
        setBlendMode(false);
        setBlendFirst(null);
      }
    } else {
      picky.selectMood(moodId);
    }
  };

  return (
    <div className="tp-picky" style={{ background: p.bg }}>
      <div className="tp-picky-center">
        <h2 style={{ color: p.tx, fontSize: 22, fontWeight: 600, margin: "0 0 4px", fontFamily: "inherit" }}>
          {blendFirst ? `Blend: ${blendFirst} + ?` : blendMode ? "Pick first mood" : "Set the vibe"}
        </h2>
        <p style={{ color: p.mu, fontSize: 13, margin: "0 0 28px" }}>
          {blendFirst
            ? "Now pick a second mood to blend with."
            : blendMode
              ? "Pick the first mood."
              : `Choose a design mood for your ${template?.label || "page"}.`}
        </p>
        <div className="tp-picky-moods">
          {PICKY_MOODS.map(m => (
            <button
              key={m.id}
              type="button"
              className={`tp-picky-mood-card${blendFirst === m.id ? " tp-picky-mood-card--selected" : ""}`}
              onClick={() => handleMoodClick(m.id)}
              style={{
                background: blendFirst === m.id ? p.ac + "18" : p.card,
                borderColor: blendFirst === m.id ? p.ac : p.bd,
                "--ac": p.ac, "--su": p.su,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: blendFirst === m.id ? p.ac : p.tx }}>{m.label}</span>
              <span style={{ fontSize: 11, color: p.mu }}>{m.desc}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
          <button
            type="button"
            className="tp-picky-btn-primary"
            onClick={() => picky.selectMood("surprise")}
            style={{ background: p.ac, color: getReadableTextColor(p.ac) }}
          >
            Surprise me
          </button>
          <button
            type="button"
            className="tp-picky-btn-secondary"
            onClick={() => { setBlendMode(v => !v); setBlendFirst(null); }}
            style={{ color: blendMode ? p.mu : p.ac, borderColor: blendMode ? p.bd : p.ac + "40" }}
          >
            {blendMode ? "Cancel blend" : "Blend two moods"}
          </button>
        </div>
        <button
          type="button"
          className="tp-picky-text-btn"
          onClick={() => { picky.cancelPicky(); picky.enterPicky(); }}
          style={{ color: p.mu, marginTop: 10 }}
        >
          Back to templates
        </button>
      </div>
    </div>
  );
}

/**
 * Full-screen Picky overlay — template picker, option grid, progress.
 */
const PickyOverlay = React.memo(function PickyOverlay({ picky, p, pal, setPal, mobile, device, onExit, onCancel }) {
  const { phase, template, step, totalSteps, options, picks, currentSlot } = picky;

  /* ── Hover preview (desktop only) ── */
  const [hoveredIdx, setHoveredIdx] = useState(-1);

  /* ── Mobile swipe gestures ── */
  const touchRef = useRef(null);
  const mobileScrollRef = useRef(null);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const onTouchEnd = (e) => {
    if (!touchRef.current || !mobile || phase !== "picking") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.time;
    touchRef.current = null;
    if (dt > 500) return; // too slow, not a swipe

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const THRESHOLD = 50;

    if (absDy > absDx && absDy > THRESHOLD) {
      // Vertical swipe
      if (dy < 0) {
        // Swipe up → pick the visible card
        const el = mobileScrollRef.current;
        if (el) {
          const cardW = el.scrollWidth / options.length;
          const visibleIdx = Math.round(el.scrollLeft / cardW);
          picky.pickOption(Math.min(visibleIdx, options.length - 1));
        }
      } else {
        // Swipe down → skip
        picky.skipSlot();
      }
    }
    // Horizontal swipes are handled natively by scroll-snap
  };

  /* ── Compare mode (Shift+click two cards) ── */
  const [comparing, setComparing] = useState(new Set());
  // Reset compare when step changes
  useEffect(() => { setComparing(new Set()); }, [step]);

  const handleCardClick = (idx, e) => {
    if (e.shiftKey && !mobile && phase === "picking") {
      setComparing(prev => {
        const next = new Set(prev);
        if (next.has(idx)) { next.delete(idx); }
        else if (next.size < 2) { next.add(idx); }
        else { /* already 2 — replace oldest: clear and add new */ return new Set([...prev].slice(1).concat(idx)); }
        return next;
      });
    } else {
      setComparing(new Set());
      picky.pickOption(idx);
    }
  };

  /* ── Keyboard shortcuts ── */
  const pickyRef = useLatestRef(picky);
  const onCancelRef = useLatestRef(onCancel);

  // Escape key: cancel Picky from any phase (standard UX expectation)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onCancelRef.current(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Picking-phase shortcuts: 1-4 pick, S skip, B back, R shuffle
  useEffect(() => {
    if (phase !== "picking") return;
    const handler = (e) => {
      // Ignore if focus is in an input/textarea
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key >= "1" && key <= "4") {
        e.preventDefault();
        pickyRef.current.pickOption(parseInt(key, 10) - 1);
        return;
      }
      if (key === "s") { e.preventDefault(); pickyRef.current.skipSlot(); return; }
      if (key === "b") { e.preventDefault(); pickyRef.current.prevStep(); return; }
      if (key === "r") { e.preventDefault(); pickyRef.current.regenerate(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  /* ── Template Picker (phase === "template") ── */
  if (phase === "template") {
    return (
      <div className="tp-picky" style={{ background: p.bg }}>
        <div className="tp-picky-center">
          <h2 style={{ color: p.tx, fontSize: 22, fontWeight: 600, margin: "0 0 4px", fontFamily: "inherit" }}>
            Pick a page type
          </h2>
          <p style={{ color: p.mu, fontSize: 13, margin: "0 0 20px" }}>
            Quick start with a preset, or choose a template below.
          </p>

          {/* Quick Presets */}
          <div className="tp-picky-presets">
            {QUICK_PRESETS.map(pr => (
              <button
                key={`${pr.template}-${pr.mood}`}
                type="button"
                className="tp-picky-preset-btn"
                onClick={() => picky.quickStart(pr.template, pr.mood)}
                style={{ borderColor: p.bd, color: p.tx, "--ac": p.ac, "--su": p.su }}
              >
                {pr.label}
              </button>
            ))}
          </div>

          {/* Recent sessions */}
          {(() => {
            const hist = loadPickyHistory();
            if (!hist.length) return null;
            return (
              <div style={{ marginTop: 16, width: "100%", maxWidth: 480 }}>
                <div style={{ fontSize: 11, color: p.mu, marginBottom: 6, opacity: .5 }}>recent</div>
                <div className="tp-picky-presets">
                  {hist.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      className="tp-picky-preset-btn"
                      onClick={() => picky.quickStart(h.templateId, h.mood)}
                      style={{ borderColor: p.ac + "30", color: p.ac, "--ac": p.ac, "--su": p.su }}
                    >
                      {h.templateLabel} &middot; {h.mood}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <div style={{ fontSize: 11, color: p.mu, margin: "18px 0 14px", opacity: .5 }}>or choose your own</div>

          <div className="tp-picky-templates">
            {PAGE_TEMPLATES.map(tmpl => (
              <button
                key={tmpl.id}
                type="button"
                className="tp-picky-template-card"
                onClick={() => picky.selectTemplate(tmpl.id)}
                style={{ background: p.card, borderColor: p.bd, "--ac": p.ac, "--su": p.su }}
              >
                <span style={{ fontSize: 28 }}>{TEMPLATE_ICONS[tmpl.icon] || tmpl.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: p.tx }}>{tmpl.label}</span>
                <span style={{ fontSize: 11, color: p.mu }}>
                  {tmpl.slots.length} sections
                </span>
                <span className="tp-picky-template-slots">
                  {tmpl.slots.map((slot, si) => (
                    <span key={si} className="tp-picky-template-slot-tag" style={{ background: p.su, color: p.mu }}>
                      {slot.label.length > 6 ? slot.label.slice(0, 5) + "\u2026" : slot.label}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="tp-picky-btn-secondary"
            onClick={() => picky.enterCustom()}
            style={{ color: p.ac, borderColor: p.ac + "40", marginTop: 16 }}
          >
            Build Your Own
          </button>
          <button
            type="button"
            className="tp-picky-text-btn"
            onClick={onCancel}
            style={{ color: p.mu, marginTop: 8 }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ── Custom Template Builder (phase === "custom") ── */
  if (phase === "custom") {
    return <CustomBuilder p={p} picky={picky} onCancel={onCancel} />;
  }

  /* ── Mood Picker (phase === "mood") ── */
  if (phase === "mood") {
    return <MoodPicker picky={picky} p={p} template={template} onCancel={onCancel} />;
  }

  /* ── Done Phase ── */
  if (phase === "done") {
    const pickCount = picks.size;
    const skipCount = totalSteps - pickCount;
    return (
      <DonePhase
        pickCount={pickCount} skipCount={skipCount}
        template={template} picks={picks} p={p} device={device}
        onBuild={() => onExit(picky.assemble())}
        onAddSlot={(type) => picky.addSlot(type)}
        onRemix={() => picky.remix()}
        onBack={() => picky.prevStep()}
        onCancel={onCancel}
      />
    );
  }

  /* ── Picking Phase ── */
  if (phase !== "picking" || !currentSlot) return null;

  const lib = libEntry(currentSlot.type);

  return (
    <div className="tp-picky" style={{ background: p.bg }}>
      {/* Step header */}
      <div className="tp-picky-header">
        <div aria-live="polite" aria-atomic="true" style={{ fontSize: 13, color: p.mu, marginBottom: 4 }}>
          Step {step + 1} of {totalSteps}: {currentSlot.label}
        </div>
        <h2 aria-hidden="true" style={{ color: p.tx, fontSize: 20, fontWeight: 600, margin: "0 0 12px", fontFamily: "inherit" }}>
          {currentSlot.label}
        </h2>

        {/* Palette swatches */}
        {setPal && (
          <div className="tp-picky-palette-row">
            {Object.entries(PAL).map(([k, v]) => (
              <button
                key={k}
                type="button"
                className={`tp-picky-palette-swatch${pal === k ? " tp-picky-palette-swatch--active" : ""}`}
                onClick={() => { setPal(k); picky.clearCache(); }}
                title={v.name}
                aria-label={`${v.name} palette`}
                aria-pressed={pal === k}
                style={{
                  background: k === "noir" || k === "neon" ? "#1A1A1E" : v.ac,
                  borderColor: pal === k ? p.ac : "transparent",
                  boxShadow: pal === k ? `0 0 0 2px ${p.ac}22` : "none",
                }}
              />
            ))}
          </div>
        )}

        {/* Progress dots */}
        <div className="tp-picky-dots" role="tablist" aria-label="Step navigation">
          {Array.from({ length: totalSteps }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={`Step ${i + 1}: ${template.slots[i].label}`}
              className={`tp-picky-dot${i === step ? " tp-picky-dot--active" : ""}${picks.has(i) ? " tp-picky-dot--done" : ""}`}
              style={{
                background: i === step ? p.ac : picks.has(i) ? p.ac + "60" : p.bd,
              }}
              onClick={() => picky.goToStep(i)}
            />
          ))}
        </div>
      </div>

      {/* Live assembly preview strip */}
      {picks.size > 0 && (
        <div className="tp-picky-preview" style={{ borderColor: p.bd }}>
          {template.slots.map((slot, i) => {
            const pick = picks.get(i);
            const slotLib = libEntry(slot.type);
            const thumbW = 56;
            const thumbScale = Math.min(thumbW / slotLib.w, 1);
            const thumbH = Math.min(slotLib.h * thumbScale, 36);
            const isCurrent = i === step;
            return (
              <button
                key={i}
                type="button"
                className={`tp-picky-preview-slot${isCurrent ? " tp-picky-preview-slot--active" : ""}${pick ? " tp-picky-preview-slot--picked" : ""}`}
                style={{ borderColor: isCurrent ? p.ac : "transparent" }}
                title={`${slot.label}${pick ? " (click to re-pick)" : ""}`}
                onClick={() => picky.goToStep(i)}
                aria-label={`Go to step ${i + 1}: ${slot.label}`}
              >
                {pick ? (
                  <div style={{ width: thumbW, height: thumbH, overflow: "hidden", pointerEvents: "none", borderRadius: 3, background: p.bg }}>
                    <div style={{ transform: `scale(${thumbScale})`, transformOrigin: "top left", width: slotLib.w, height: slotLib.h }}>
                      <ErrorBoundary fallback={<div style={{ width: thumbW, height: thumbH, background: p.su }} />}>
                        <C type={slot.type} v={pick.variant} p={p} font={pick.font} fsize={pick.fsize} props={pick.props} />
                      </ErrorBoundary>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: thumbW, height: thumbH, borderRadius: 3, background: p.su, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 8, color: p.mu, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {slot.label.slice(0, 3)}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Compare overlay (2 cards selected) */}
      {comparing.size === 2 && (
        <div className="tp-picky-compare" style={{ borderColor: p.bd, background: p.card }}>
          <div style={{ fontSize: 11, color: p.mu, marginBottom: 8, textAlign: "center" }}>
            Compare — click one to pick
          </div>
          <div className="tp-picky-compare-cards">
            {[...comparing].map(idx => (
              <div key={idx} className="tp-picky-compare-card">
                <PickyCard
                  option={options[idx]}
                  type={currentSlot.type}
                  libItem={lib}
                  p={p}
                  selected={false}
                  onClick={() => { setComparing(new Set()); picky.pickOption(idx); }}
                />
              </div>
            ))}
          </div>
          <button type="button" className="tp-picky-text-btn" onClick={() => setComparing(new Set())} style={{ color: p.mu, marginTop: 8 }}>
            Cancel compare
          </button>
        </div>
      )}

      {/* Option cards */}
      <div
        ref={mobile ? mobileScrollRef : undefined}
        className={`tp-picky-options${mobile ? " tp-picky-options--mobile" : ""}${comparing.size === 2 ? " tp-picky-options--dimmed" : ""}`}
        onTouchStart={mobile ? onTouchStart : undefined}
        onTouchEnd={mobile ? onTouchEnd : undefined}
      >
        {options.map((opt, idx) => (
          <div
            key={`${step}-${idx}`}
            className="tp-picky-card-enter"
            style={{ animationDelay: `${idx * 70}ms` }}
            onMouseEnter={!mobile ? () => setHoveredIdx(idx) : undefined}
            onMouseLeave={!mobile ? () => setHoveredIdx(-1) : undefined}
          >
            <PickyCard
              option={opt}
              type={currentSlot.type}
              libItem={lib}
              p={p}
              selected={picks.get(step) === opt}
              comparing={comparing.has(idx)}
              onClick={(e) => handleCardClick(idx, e)}
            />
          </div>
        ))}
      </div>

      {/* Hover preview (desktop only) */}
      {!mobile && hoveredIdx >= 0 && hoveredIdx < options.length && (
        <div className="tp-picky-hover-preview" style={{ background: p.bg, borderColor: p.bd, boxShadow: `0 8px 32px ${p.tx}10` }}>
          <div style={{ width: lib.w, height: lib.h, overflow: "hidden", pointerEvents: "none", transform: `scale(${Math.min(480 / lib.w, 1)})`, transformOrigin: "top center" }}>
            <ErrorBoundary fallback={<div style={{ padding: 16, color: p.mu }}>Preview error</div>}>
              <C
                type={currentSlot.type}
                v={options[hoveredIdx].variant}
                p={p}
                font={options[hoveredIdx].font}
                fsize={options[hoveredIdx].fsize}
                props={options[hoveredIdx].props}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* Mobile card indicator dots + swipe hint */}
      {mobile && (
        <div className="tp-picky-card-dots">
          {options.map((_, i) => (
            <span key={i} className="tp-picky-card-dot" style={{ background: p.mu + "40" }} />
          ))}
          <div style={{ fontSize: 9, color: p.mu, opacity: .5, marginTop: 4, width: "100%", textAlign: "center" }}>
            swipe up to pick &middot; down to skip
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="tp-picky-nav">
        <button
          type="button"
          className="tp-picky-btn-secondary"
          onClick={picky.prevStep}
          style={{ color: p.tx, borderColor: p.bd }}
        >
          {step === 0 ? "Mood" : "Back"}
        </button>
        <button
          type="button"
          className="tp-picky-btn-secondary tp-picky-btn-shuffle"
          onClick={picky.regenerate}
          style={{ color: p.ac, borderColor: p.ac + "40" }}
          title="Shuffle — generate new options"
          aria-label="Shuffle options"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          Shuffle
        </button>
        <button
          type="button"
          className="tp-picky-text-btn"
          onClick={picky.skipSlot}
          style={{ color: p.mu }}
        >
          Skip
        </button>
      </div>

      {/* Keyboard hints (desktop only) */}
      {!mobile && (
        <div className="tp-picky-kbd-hint" style={{ color: p.mu }}>
          <kbd>1</kbd>–<kbd>4</kbd> pick &middot; <kbd>Shift</kbd>+click compare &middot; <kbd>R</kbd> shuffle &middot; <kbd>B</kbd> back &middot; <kbd>S</kbd> skip &middot; <kbd>Esc</kbd> cancel
        </div>
      )}
    </div>
  );
});

export default PickyOverlay;
