import React, { useState, useEffect, useRef } from "react";
import C from "./ComponentRenderer";
import { ErrorBoundary } from "./ErrorBoundary";
import PickyCard from "./PickyCard";
import { PAGE_TEMPLATES, PICKY_MOODS, QUICK_PRESETS, assembleShapes } from "../hooks/usePicky";
import { LIB } from "../constants";
import { getReadableTextColor } from "../utils";

/* Look up LIB entry for a component type */
function libEntry(type) {
  for (const cat of LIB) {
    const item = cat.items.find(i => i.type === type);
    if (item) return item;
  }
  return { type, label: type, w: 300, h: 200 };
}

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
function DonePhase({ pickCount, skipCount, template, picks, p, device, onBuild, onBack, onCancel }) {
  const [previewDevice, setPreviewDevice] = useState(device === "phone" ? "phone" : "desktop");

  if (pickCount === 0) {
    return (
      <div className="tp-picky" style={{ background: p.bg }}>
        <div className="tp-picky-center">
          <h2 style={{ color: p.tx, fontSize: 22, fontWeight: 600, margin: "0 0 8px", fontFamily: "inherit" }}>No sections picked</h2>
          <p style={{ color: p.mu, fontSize: 13, margin: "0 0 24px" }}>Go back and pick at least one section.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="tp-picky-btn-secondary" onClick={onBack} style={{ color: p.tx, borderColor: p.bd }}>Go Back</button>
            <button className="tp-picky-text-btn" onClick={onCancel} style={{ color: p.mu }}>Cancel</button>
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

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
          <button className="tp-picky-btn-primary" onClick={onBuild} style={{ background: p.ac, color: getReadableTextColor(p.ac) }}>
            Build Page
          </button>
          <button className="tp-picky-btn-secondary" onClick={onBack} style={{ color: p.tx, borderColor: p.bd }}>
            Go Back
          </button>
          <button className="tp-picky-text-btn" onClick={onCancel} style={{ color: p.mu }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-screen Picky overlay — template picker, option grid, progress.
 */
const PickyOverlay = React.memo(function PickyOverlay({ picky, p, mobile, device, onExit, onCancel }) {
  const { phase, template, step, totalSteps, options, picks, currentSlot } = picky;

  /* ── Keyboard shortcuts ── */
  const pickyRef = useRef(picky);
  pickyRef.current = picky;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

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
                className="tp-picky-preset-btn"
                onClick={() => picky.quickStart(pr.template, pr.mood)}
                style={{ borderColor: p.bd, color: p.tx, "--ac": p.ac, "--su": p.su }}
              >
                {pr.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 11, color: p.mu, margin: "18px 0 14px", opacity: .5 }}>or choose your own</div>

          <div className="tp-picky-templates">
            {PAGE_TEMPLATES.map(tmpl => (
              <button
                key={tmpl.id}
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
            className="tp-picky-text-btn"
            onClick={onCancel}
            style={{ color: p.mu, marginTop: 20 }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ── Mood Picker (phase === "mood") ── */
  if (phase === "mood") {
    return (
      <div className="tp-picky" style={{ background: p.bg }}>
        <div className="tp-picky-center">
          <h2 style={{ color: p.tx, fontSize: 22, fontWeight: 600, margin: "0 0 4px", fontFamily: "inherit" }}>
            Set the vibe
          </h2>
          <p style={{ color: p.mu, fontSize: 13, margin: "0 0 28px" }}>
            Choose a design mood for your {template?.label || "page"}.
          </p>
          <div className="tp-picky-moods">
            {PICKY_MOODS.map(m => (
              <button
                key={m.id}
                className="tp-picky-mood-card"
                onClick={() => picky.selectMood(m.id)}
                style={{ background: p.card, borderColor: p.bd, "--ac": p.ac, "--su": p.su }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: p.tx }}>{m.label}</span>
                <span style={{ fontSize: 11, color: p.mu }}>{m.desc}</span>
              </button>
            ))}
          </div>
          <button
            className="tp-picky-btn-primary"
            onClick={() => picky.selectMood("surprise")}
            style={{ background: p.ac, color: getReadableTextColor(p.ac), marginTop: 18 }}
          >
            Surprise me
          </button>
          <button
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

  /* ── Done Phase ── */
  if (phase === "done") {
    const pickCount = picks.size;
    const skipCount = totalSteps - pickCount;
    return (
      <DonePhase
        pickCount={pickCount} skipCount={skipCount}
        template={template} picks={picks} p={p} device={device}
        onBuild={() => onExit(picky.assemble())}
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
        <div style={{ fontSize: 13, color: p.mu, marginBottom: 4 }}>
          Step {step + 1} of {totalSteps}
        </div>
        <h2 style={{ color: p.tx, fontSize: 20, fontWeight: 600, margin: "0 0 12px", fontFamily: "inherit" }}>
          {currentSlot.label}
        </h2>

        {/* Progress dots */}
        <div className="tp-picky-dots" role="tablist" aria-label="Step navigation">
          {Array.from({ length: totalSteps }, (_, i) => (
            <button
              key={i}
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
              <div
                key={i}
                className={`tp-picky-preview-slot${isCurrent ? " tp-picky-preview-slot--active" : ""}`}
                style={{ borderColor: isCurrent ? p.ac : "transparent" }}
                title={slot.label}
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
              </div>
            );
          })}
        </div>
      )}

      {/* Option cards */}
      <div className={`tp-picky-options${mobile ? " tp-picky-options--mobile" : ""}`}>
        {options.map((opt, idx) => (
          <div key={`${step}-${idx}`} className="tp-picky-card-enter" style={{ animationDelay: `${idx * 70}ms` }}>
            <PickyCard
              option={opt}
              type={currentSlot.type}
              libItem={lib}
              p={p}
              selected={picks.get(step) === opt}
              onClick={() => picky.pickOption(idx)}
            />
          </div>
        ))}
      </div>

      {/* Mobile card indicator dots */}
      {mobile && (
        <div className="tp-picky-card-dots">
          {options.map((_, i) => (
            <span key={i} className="tp-picky-card-dot" style={{ background: p.mu + "40" }} />
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="tp-picky-nav">
        <button
          className="tp-picky-btn-secondary"
          onClick={picky.prevStep}
          style={{ color: p.tx, borderColor: p.bd }}
        >
          {step === 0 ? "Mood" : "Back"}
        </button>
        <button
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
          <kbd>1</kbd>–<kbd>4</kbd> pick &middot; <kbd>R</kbd> shuffle &middot; <kbd>B</kbd> back &middot; <kbd>S</kbd> skip &middot; <kbd>Esc</kbd> cancel
        </div>
      )}
    </div>
  );
});

export default PickyOverlay;
