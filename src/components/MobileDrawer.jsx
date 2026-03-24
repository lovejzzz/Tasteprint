import React from "react";
import C from "./ComponentRenderer";
import { ErrorBoundary } from "./ErrorBoundary";
import { LIB } from "../constants";
import { getReadableTextColor } from "../utils";
import "./mobiledrawer.css";

/**
 * Mobile bottom drawer for the component library.
 * Extracts the FAB toggle, backdrop, category tabs, and component grid
 * from App.jsx to reduce top-level complexity.
 */
const MobileDrawer = React.memo(function MobileDrawer({
  libOpen, setLibOpen, expCat, setExpCat, catItems, prefV, p,
  viewportWidth, addShape,
}) {
  return (
    <>
      {/* FAB toggle */}
      <button
        type="button"
        onClick={() => setLibOpen(!libOpen)}
        aria-label={libOpen ? "Close library" : "Open library"}
        className={`tp-mob-fab ${libOpen ? "tp-mob-fab--open" : "tp-mob-fab--closed"}`}
        style={{ background: p.ac, color: getReadableTextColor(p.ac), boxShadow: `0 4px 20px ${p.ac}40` }}
      >
        +
      </button>

      {/* Drawer backdrop */}
      {libOpen && (
        <div
          className="tp-mob-backdrop"
          aria-hidden="true"
          onClick={() => setLibOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Component library"
        aria-hidden={!libOpen}
        className={`tp-mob-drawer ${libOpen ? "tp-mob-drawer--open" : "tp-mob-drawer--closed"}`}
        style={{
          background: p.card,
          borderTop: `1px solid ${p.bd}`,
          boxShadow: libOpen ? `0 -8px 32px ${p.tx}10` : "none",
        }}
      >
        {/* Handle */}
        <div className="tp-mob-handle">
          <div className="tp-mob-handle-bar" style={{ background: p.mu + "30" }} />
        </div>

        {/* Category tabs - horizontal scroll */}
        <div
          role="tablist"
          aria-label="Component categories"
          className="tp-mob-tabs"
        >
          {LIB.map(cat => (
            <button
              type="button"
              key={cat.cat}
              role="tab"
              aria-selected={expCat === cat.cat}
              onClick={() => setExpCat(cat.cat)}
              className="tp-mob-tab"
              style={{
                fontWeight: expCat === cat.cat ? 600 : 400,
                color: expCat === cat.cat ? p.tx : p.mu,
                background: expCat === cat.cat ? p.su : "transparent",
              }}
            >
              {cat.cat}
            </button>
          ))}
        </div>

        {/* Component grid */}
        <div
          role="tabpanel"
          aria-label={`${expCat} components`}
          className="tp-mob-grid"
        >
          {catItems.map(item => {
            const pv = prefV[item.type] || 0;
            const tw = (viewportWidth - 44) / 2;
            const ts = Math.min(tw / item.w, 1);
            const th = Math.min(item.h * ts, 120);
            return (
              <button
                type="button"
                key={item.type}
                onClick={() => { addShape(item); setLibOpen(false); }}
                className="tp-mob-card"
                style={{ border: `1px solid ${p.bd}`, background: p.card }}

              >
                <div className="tp-mob-card-preview" style={{ height: th }}>
                  <div style={{ transform: `scale(${ts})`, transformOrigin: "top center", width: item.w, height: item.h }}>
                    <ErrorBoundary fallback={<div style={{ padding: 8, fontSize: 10, color: "#C53030" }}>Preview error</div>}>
                      <C type={item.type} v={pv} p={p} />
                    </ErrorBoundary>
                  </div>
                </div>
                <span className="tp-mob-card-label" style={{ color: p.tx }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
});

export default MobileDrawer;
