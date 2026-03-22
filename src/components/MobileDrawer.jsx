import React from "react";
import C from "./ComponentRenderer";
import { ErrorBoundary } from "./ErrorBoundary";
import { LIB } from "../constants";
import { getReadableTextColor } from "../utils";

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
        onClick={() => setLibOpen(!libOpen)}
        aria-label={libOpen ? "Close library" : "Open library"}
        style={{
          position: "fixed", bottom: libOpen ? "55vh" : 20, right: 16, zIndex: 1001,
          width: 52, height: 52, borderRadius: 999, background: p.ac, border: "none",
          color: getReadableTextColor(p.ac), fontSize: 24, fontWeight: 300, cursor: "pointer",
          boxShadow: `0 4px 20px ${p.ac}40`, display: "flex", alignItems: "center",
          justifyContent: "center", transition: "bottom .3s ease, transform .2s",
          transform: libOpen ? "rotate(45deg)" : "none",
        }}
      >
        +
      </button>

      {/* Drawer backdrop */}
      {libOpen && (
        <div
          onClick={() => setLibOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 999 }}
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Component library"
        aria-hidden={!libOpen}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: "55vh",
          background: p.card, borderTop: `1px solid ${p.bd}`, borderRadius: "20px 20px 0 0",
          zIndex: 1000, transform: libOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform .3s ease", display: "flex", flexDirection: "column",
          boxShadow: libOpen ? `0 -8px 32px ${p.tx}10` : "none",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: p.mu + "30" }} />
        </div>

        {/* Category tabs - horizontal scroll */}
        <div
          role="tablist"
          aria-label="Component categories"
          style={{
            display: "flex", gap: 2, padding: "0 12px 8px", overflowX: "auto",
            flexShrink: 0, WebkitOverflowScrolling: "touch",
          }}
        >
          {LIB.map(cat => (
            <button
              key={cat.cat}
              role="tab"
              aria-selected={expCat === cat.cat}
              onClick={() => setExpCat(cat.cat)}
              style={{
                padding: "6px 14px", fontSize: 12, fontWeight: expCat === cat.cat ? 600 : 400,
                color: expCat === cat.cat ? p.tx : p.mu, background: expCat === cat.cat ? p.su : "transparent",
                border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                whiteSpace: "nowrap", transition: "all .15s", flexShrink: 0,
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
          style={{
            flex: 1, overflowY: "auto", padding: "8px 12px 20px",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
            alignContent: "start", WebkitOverflowScrolling: "touch",
          }}
        >
          {catItems.map(item => {
            const pv = prefV[item.type] || 0;
            const tw = (viewportWidth - 44) / 2;
            const ts = Math.min(tw / item.w, 1);
            const th = Math.min(item.h * ts, 120);
            return (
              <button
                key={item.type}
                onClick={() => { addShape(item); setLibOpen(false); }}
                style={{
                  padding: 8, borderRadius: 10, border: `1px solid ${p.bd}`, background: p.card,
                  cursor: "pointer", display: "flex", flexDirection: "column", gap: 4,
                  alignItems: "center", fontFamily: "inherit", transition: "background .15s",
                  WebkitTapHighlightColor: "transparent",
                }}
                onTouchStart={e => { e.currentTarget.style.background = p.su; }}
                onTouchEnd={e => { e.currentTarget.style.background = p.card; }}
              >
                <div
                  style={{
                    width: "100%", height: th, borderRadius: 6, overflow: "hidden",
                    pointerEvents: "none", display: "flex", justifyContent: "center",
                  }}
                >
                  <div style={{ transform: `scale(${ts})`, transformOrigin: "top center", width: item.w, height: item.h }}>
                    <ErrorBoundary fallback={<div style={{ padding: 8, fontSize: 10, color: "#C53030" }}>Preview error</div>}>
                      <C type={item.type} v={pv} p={p} />
                    </ErrorBoundary>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: p.tx }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
});

export default MobileDrawer;
