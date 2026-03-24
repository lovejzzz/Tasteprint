import React from "react";
import C from "./ComponentRenderer";
import { ErrorBoundary } from "./ErrorBoundary";
import { DESIGN_MOODS, varName } from "../utils";

function moodLabel(moodId) {
  const m = DESIGN_MOODS.find(d => d.id === moodId);
  return m ? m.label : moodId;
}

/**
 * Single option card for Picky mode.
 * Renders a scaled ComponentRenderer preview with mood label.
 */
const PickyCard = React.memo(function PickyCard({ option, type, libItem, p, selected, comparing, onClick }) {
  const containerW = 260;
  const ts = Math.min(containerW / libItem.w, 1);
  const th = Math.min(libItem.h * ts, 200);

  return (
    <button
      type="button"
      className={`tp-picky-card${selected ? " tp-picky-card--selected" : ""}${comparing ? " tp-picky-card--comparing" : ""}`}
      onClick={onClick}
      style={{
        background: p.card,
        borderColor: selected ? p.ac : p.bd,
        "--ac": p.ac,
        "--ac20": p.ac + "30",
      }}
    >
      <div
        style={{
          width: containerW, height: th, borderRadius: 8,
          overflow: "hidden", pointerEvents: "none",
          display: "flex", justifyContent: "center", background: p.bg,
        }}
      >
        <div style={{ transform: `scale(${ts})`, transformOrigin: "top center", width: libItem.w, height: libItem.h }}>
          <ErrorBoundary fallback={<div style={{ padding: 8, fontSize: 10, color: "#C53030" }}>Preview error</div>}>
            <C
              type={type}
              v={option.variant}
              p={p}
              font={option.font}
              fsize={option.fsize}
              props={option.props}
            />
          </ErrorBoundary>
        </div>
      </div>
      <span className="tp-picky-card-label" style={{ color: p.mu }}>
        <span style={{ color: p.tx, fontWeight: 600 }}>{varName(type, option.variant)}</span>
        {" "}
        <span style={{ opacity: .65 }}>{moodLabel(option.mood)}</span>
      </span>
      {selected && (
        <span className="tp-picky-card-check" style={{ background: p.ac, color: p.card }}>
          &#10003;
        </span>
      )}
    </button>
  );
});

export default PickyCard;
