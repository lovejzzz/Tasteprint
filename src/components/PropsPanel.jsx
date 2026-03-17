import React from "react";
import { DEFAULT_PROPS, HAS_PROPS } from "../constants";

/* Compact props panel for customizing component visual state */
export default function PropsPanel({ type, props, onProp, p }) {
  if (!HAS_PROPS.has(type)) return null;
  const defaults = DEFAULT_PROPS[type] || {};
  const G = (k) => props[k] !== undefined ? props[k] : defaults[k];
  const stop = e => e.stopPropagation();
  const sty = { position: "absolute", bottom: -6, left: "50%", transform: "translate(-50%, 100%)", zIndex: 200, background: p.card, border: `1px solid ${p.bd}`, borderRadius: 10, padding: "6px 10px", boxShadow: `0 4px 16px ${p.tx}10`, display: "flex", gap: 6, alignItems: "center", userSelect: "none", whiteSpace: "nowrap" };
  const label = { fontSize: 8, color: p.mu, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 2 };
  const btn = (active) => ({ width: 22, height: 22, borderRadius: 6, border: active ? `1.5px solid ${p.ac}` : `1px solid ${p.bd}`, background: active ? p.ac + "18" : "transparent", color: active ? p.ac : p.mu, fontSize: 10, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontFamily: "inherit", transition: "all .15s" });

  const controls = [];

  /* Toggle on/off */
  if ("on" in defaults) {
    const on = G("on");
    controls.push(<React.Fragment key="on"><span style={label}>On</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? p.ac : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("on", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  if ("verified" in defaults) {
    const ver = G("verified");
    controls.push(<React.Fragment key="verified"><span style={label}>Verified</span>
      <button style={{ ...btn(ver), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: ver ? "flex-end" : "flex-start", background: ver ? p.ac : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("verified", ver ? 0 : 1)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  if ("liked" in defaults) {
    const lk = G("liked");
    controls.push(<React.Fragment key="liked"><span style={label}>Liked</span>
      <button style={{ ...btn(lk), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: lk ? "flex-end" : "flex-start", background: lk ? "#ef4444" : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("liked", !lk)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Shuffle toggle (media-player) */
  if ("shuffle" in defaults) {
    const sh = G("shuffle");
    controls.push(<React.Fragment key="shuffle"><span style={label}>{sh ? "Shuffle" : "Order"}</span>
      <button style={{ ...btn(sh), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: sh ? "flex-end" : "flex-start", background: sh ? p.ac : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("shuffle", !sh)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Checkbox array */
  if ("checked" in defaults) {
    const checked = G("checked");
    controls.push(<React.Fragment key="chk"><span style={label}>Checked</span>
      {checked.map((c, i) => <button key={i} style={btn(c)} onMouseDown={stop} onClick={() => { const next = [...checked]; next[i] = !next[i]; onProp("checked", next); }}>{c ? "✓" : i + 1}</button>)}
    </React.Fragment>);
  }

  /* Active index (tabs, navbar, sidebar, cmd-palette, dropdown, stepper, timeline, sub-toggle) */
  if ("active" in defaults) {
    const active = G("active");
    const counts = { tabs: 3, navbar: 3, sidebar: 4, pagination: 5, stepper: 3, timeline: 3, accordion: 3, dropdown: 3, "cmd-palette": 4, "sub-toggle": 2, kanban: 3, "avatar-row": 4, "tag-input": 3, footer: 4, hero: 2, breadcrumb: 3, select: 4 };
    const n = counts[type] || 4;
    const isPage = type === "pagination";
    controls.push(<React.Fragment key="active"><span style={label}>{isPage ? "Page" : "Active"}</span>
      {Array.from({ length: n }, (_, i) => {
        const val = isPage ? i + 1 : i;
        return <button key={i} style={btn(active === val)} onMouseDown={stop} onClick={() => onProp("active", val)}>{isPage ? val : i + 1}</button>;
      })}
    </React.Fragment>);
  }

  /* Accordion open items */
  if ("open" in defaults) {
    const open = G("open");
    controls.push(<React.Fragment key="open"><span style={label}>Open</span>
      {open.map((o, i) => <button key={i} style={btn(o)} onMouseDown={stop} onClick={() => { const next = [...open]; next[i] = !next[i]; onProp("open", next); }}>{o ? "▾" : "›"}</button>)}
    </React.Fragment>);
  }

  /* Percentage (progress, slider, media-player) */
  if ("pct" in defaults) {
    const pct = G("pct");
    controls.push(<React.Fragment key="pct"><span style={label}>{Math.round(pct)}%</span>
      <input type="range" min={0} max={100} value={pct} onMouseDown={stop} onChange={e => onProp("pct", Number(e.target.value))} style={{ width: 80, height: 4, accentColor: p.ac, cursor: "pointer" }} />
    </React.Fragment>);
  }

  /* Star rating */
  if ("stars" in defaults) {
    const stars = G("stars");
    controls.push(<React.Fragment key="stars"><span style={label}>Stars</span>
      {[1, 2, 3, 4, 5].map(n => <button key={n} style={{ ...btn(n <= stars), fontSize: 12, width: 18, height: 18, border: "none", background: "transparent", color: n <= stars ? p.ac : p.mu + "40" }} onMouseDown={stop} onClick={() => onProp("stars", n)}>★</button>)}
    </React.Fragment>);
  }

  /* Ring percent (dash-panel) */
  if ("ring" in defaults) {
    const ring = G("ring");
    controls.push(<React.Fragment key="ring"><span style={label}>Ring {Math.round(ring)}%</span>
      <input type="range" min={0} max={100} value={ring} onMouseDown={stop} onChange={e => onProp("ring", Number(e.target.value))} style={{ width: 70, height: 4, accentColor: p.ac, cursor: "pointer" }} />
    </React.Fragment>);
  }

  /* Highlight (chart bar or feature-table row) */
  if ("highlight" in defaults) {
    const hl = G("highlight");
    const bars = G("bars") || defaults.bars;
    const hlCount = bars ? bars.length : ({ "feature-table": 4, table: 3 }[type] || 4);
    controls.push(<React.Fragment key="hl"><span style={label}>{bars ? "Highlight" : "Row"}</span>
      {Array.from({ length: hlCount }, (_, i) => <button key={i} style={{ ...btn(hl === i), width: 18, height: 18, fontSize: 8 }} onMouseDown={stop} onClick={() => onProp("highlight", i)}>{i + 1}</button>)}
    </React.Fragment>);
  }

  /* Sort column (table) */
  if ("sortCol" in defaults) {
    const sc = G("sortCol");
    const scLabels = ["Name", "Status", "Amt", "—"];
    controls.push(<React.Fragment key="sortCol"><span style={label}>Sort</span>
      {scLabels.map((l, i) => { const ci = i < 3 ? i : -1; return <button key={i} style={{ ...btn(sc === ci), fontSize: 8, minWidth: i < 3 ? 28 : 18, height: 18 }} onMouseDown={stop} onClick={() => onProp("sortCol", ci)}>{l}</button> })}
    </React.Fragment>);
  }

  /* Bar heights (chart) — mini draggable bars for adjusting chart data */
  if ("bars" in defaults) {
    const bars = G("bars") || defaults.bars;
    controls.push(<React.Fragment key="bars"><span style={label}>Bars</span>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 28, padding: "0 2px" }}>
        {bars.map((h, i) => (
          <div key={i} style={{ position: "relative", width: 10, height: 28, display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: "ns-resize" }}
            onMouseDown={(e) => {
              stop(e);
              const startY = e.clientY;
              const startH = h;
              const onMove = (ev) => {
                const delta = startY - ev.clientY;
                const next = [...bars];
                next[i] = Math.max(5, Math.min(100, startH + delta * 2));
                onProp("bars", next);
              };
              const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}>
            <div style={{ width: "100%", height: `${h * 0.28}px`, minHeight: 2, background: p.ac, borderRadius: 2, transition: "height .1s" }} />
          </div>
        ))}
      </div>
    </React.Fragment>);
  }

  /* Notification read state */
  if ("read" in defaults) {
    const read = G("read");
    controls.push(<React.Fragment key="read"><span style={label}>Read</span>
      {read.map((r, i) => <button key={i} style={btn(r)} onMouseDown={stop} onClick={() => { const next = [...read]; next[i] = !next[i]; onProp("read", next); }}>{r ? "✓" : i + 1}</button>)}
    </React.Fragment>);
  }

  /* Notification muted toggle */
  if ("muted" in defaults) {
    const on = G("muted");
    controls.push(<React.Fragment key="muted"><span style={label}>{on ? "Muted" : "Mute"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? p.mu + "50" : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("muted", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Alert/toast severity level */
  if ("level" in defaults) {
    const level = G("level");
    const levels = [
      { emoji: "ℹ", name: "Info" },
      { emoji: "⚠", name: "Warn" },
      { emoji: "✓", name: "OK" },
      { emoji: "✕", name: "Err" },
    ];
    controls.push(<React.Fragment key="level"><span style={label}>Level</span>
      {levels.map((l, i) => <button key={i} style={{ ...btn(level === i), fontSize: 9, width: 24, height: 20 }} onMouseDown={stop} onClick={() => onProp("level", i)} title={l.name}>{l.emoji}</button>)}
    </React.Fragment>);
  }

  /* Featured toggle (pricing-card) */
  if ("featured" in defaults) {
    const on = G("featured");
    controls.push(<React.Fragment key="feat"><span style={label}>Featured</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? p.ac : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("featured", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Liked toggle (card) */
  if ("liked" in defaults) {
    const on = G("liked");
    controls.push(<React.Fragment key="liked"><span style={label}>{on ? "Liked" : "Like"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? "#ef4444" : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("liked", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Period toggle (pricing-card) */
  if ("period" in defaults) {
    const per = G("period");
    controls.push(<React.Fragment key="period"><span style={label}>Billing</span>
      <button style={{ ...btn(!per), fontSize: 8, width: "auto", height: 18, padding: "0 6px", borderRadius: 4 }} onMouseDown={stop} onClick={() => onProp("period", 0)}>Mo</button>
      <button style={{ ...btn(!!per), fontSize: 8, width: "auto", height: 18, padding: "0 6px", borderRadius: 4 }} onMouseDown={stop} onClick={() => onProp("period", 1)}>Yr</button>
    </React.Fragment>);
  }

  /* Shipping mode (order-summary) */
  if ("shipping" in defaults) {
    const sh = G("shipping");
    const shipOpts = [{ l: "Std", v: 0 }, { l: "Exp", v: 1 }, { l: "Free", v: 2 }];
    controls.push(<React.Fragment key="shipping"><span style={label}>Ship</span>
      {shipOpts.map(o => <button key={o.v} style={{ ...btn(sh === o.v), fontSize: 8, width: "auto", height: 18, padding: "0 5px", borderRadius: 4 }} onMouseDown={stop} onClick={() => onProp("shipping", o.v)}>{o.l}</button>)}
    </React.Fragment>);
  }

  /* Paid status toggle (receipt) */
  if ("paid" in defaults) {
    const pd = G("paid");
    controls.push(<React.Fragment key="paid"><span style={label}>{pd ? "Paid" : "Pending"}</span>
      <button style={{ ...btn(pd), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: pd ? "flex-end" : "flex-start", background: pd ? "#4CAF50" : "#F59E0B", border: "none" }} onMouseDown={stop} onClick={() => onProp("paid", pd ? 0 : 1)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Wishlisted toggle (product-card) */
  if ("wishlisted" in defaults) {
    const on = G("wishlisted");
    controls.push(<React.Fragment key="wish"><span style={label}>♥</span>
      <button style={{ ...btn(on), width: 22, height: 22, fontSize: 12, border: "none", background: "transparent", color: on ? "#EF4444" : p.mu + "40" }} onMouseDown={stop} onClick={() => onProp("wishlisted", !on)}>{on ? "♥" : "♡"}</button>
    </React.Fragment>);
  }

  /* Playing toggle (media-player) */
  if ("playing" in defaults) {
    const on = G("playing");
    controls.push(<React.Fragment key="playing"><span style={label}>{on ? "▶" : "⏸"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? p.ac : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("playing", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Online status toggle (profile-card) */
  if ("online" in defaults) {
    const on = G("online");
    controls.push(<React.Fragment key="online"><span style={label}>{on ? "Online" : "Offline"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? "#22c55e" : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("online", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Verified badge toggle (profile-card) */
  if ("verified" in defaults) {
    const vf = G("verified");
    controls.push(<React.Fragment key="verified"><span style={label}>{vf ? "Verified" : "Unverified"}</span>
      <button style={{ ...btn(vf), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: vf ? "flex-end" : "flex-start", background: vf ? "#3b82f6" : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("verified", !vf)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Loading toggle (skeleton) */
  if ("loading" in defaults) {
    const on = G("loading");
    controls.push(<React.Fragment key="loading"><span style={label}>{on ? "Loading" : "Loaded"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? p.ac : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("loading", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Disabled toggle (button) */
  if ("disabled" in defaults) {
    const on = G("disabled");
    controls.push(<React.Fragment key="disabled"><span style={label}>{on ? "Disabled" : "Enabled"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? "#EF4444" : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("disabled", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Pinned toggle (list-item) */
  if ("pinned" in defaults) {
    const on = G("pinned");
    controls.push(<React.Fragment key="pinned"><span style={label}>{on ? "Pinned" : "Unpinned"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? p.ac : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("pinned", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Indeterminate toggle (progress) */
  if ("indeterminate" in defaults) {
    const on = G("indeterminate");
    controls.push(<React.Fragment key="indeterminate"><span style={label}>{on ? "Loading" : "Determinate"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? p.ac : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("indeterminate", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Focused toggle (input) */
  if ("focused" in defaults) {
    const on = G("focused");
    controls.push(<React.Fragment key="focused"><span style={label}>{on ? "Focused" : "Blurred"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? p.ac : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("focused", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Results count (search) */
  if ("results" in defaults) {
    const res = G("results");
    controls.push(<React.Fragment key="results"><span style={label}>Results</span>
      <button style={btn(false)} onMouseDown={stop} onClick={() => onProp("results", Math.max(0, res - 1))}>−</button>
      <span style={{ fontSize: 11, fontWeight: 500, color: p.tx, minWidth: 14, textAlign: "center" }}>{res}</span>
      <button style={btn(false)} onMouseDown={stop} onClick={() => onProp("results", Math.min(6, res + 1))}>+</button>
    </React.Fragment>);
  }

  /* Shape (image-placeholder) */
  if ("shape" in defaults) {
    const sh = G("shape");
    const shLabels = ["◻", "●", "■"];
    controls.push(<React.Fragment key="shape"><span style={label}>Shape</span>
      {shLabels.map((l, i) => <button key={i} style={btn(sh === i)} onMouseDown={stop} onClick={() => onProp("shape", i)}>{l}</button>)}
    </React.Fragment>);
  }

  /* Align (heading) */
  if ("align" in defaults) {
    const al = G("align");
    const alLabels = ["L", "C", "R"];
    controls.push(<React.Fragment key="align"><span style={label}>Align</span>
      {alLabels.map((l, i) => <button key={i} style={btn(al === i)} onMouseDown={stop} onClick={() => onProp("align", i)}>{l}</button>)}
    </React.Fragment>);
  }

  /* Size (heading) */
  if ("size" in defaults) {
    const sz = G("size");
    const szLabels = ["H1", "H2", "H3"];
    controls.push(<React.Fragment key="size"><span style={label}>Size</span>
      {szLabels.map((l, i) => <button key={i} style={{ ...btn(sz === i), fontSize: 9, minWidth: 24, height: 20 }} onMouseDown={stop} onClick={() => onProp("size", i)}>{l}</button>)}
    </React.Fragment>);
  }

  /* Quantity (cart-item) */
  if ("qty" in defaults) {
    const qty = G("qty");
    controls.push(<React.Fragment key="qty"><span style={label}>Qty</span>
      <button style={btn(false)} onMouseDown={stop} onClick={() => onProp("qty", Math.max(1, qty - 1))}>−</button>
      <span style={{ fontSize: 11, fontWeight: 500, color: p.tx, minWidth: 14, textAlign: "center" }}>{qty}</span>
      <button style={btn(false)} onMouseDown={stop} onClick={() => onProp("qty", qty + 1)}>+</button>
    </React.Fragment>);
  }

  /* Tip (receipt) */
  if ("tip" in defaults) {
    const tip = G("tip");
    const tipLabels = ["None", "15%", "18%", "20%"];
    controls.push(<React.Fragment key="tip"><span style={label}>Tip</span>
      {tipLabels.map((tl, i) => <button key={i} style={{ ...btn(tip === i), fontSize: 8, minWidth: 26, height: 20 }} onMouseDown={stop} onClick={() => onProp("tip", i)}>{tl}</button>)}
    </React.Fragment>);
  }

  /* Discount toggle (order-summary) */
  if ("discount" in defaults) {
    const on = G("discount");
    controls.push(<React.Fragment key="discount"><span style={label}>{on ? "Promo" : "No promo"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? "#4CAF50" : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("discount", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Trend direction (stat-card) */
  if ("trend" in defaults) {
    const trend = G("trend");
    const trendIcons = ["▲", "▼", "→"];
    const trendLabels = ["Up", "Down", "Flat"];
    controls.push(<React.Fragment key="trend"><span style={label}>Trend</span>
      {trendIcons.map((ic, i) => <button key={i} style={{ ...btn(trend === i), fontSize: 10, minWidth: 24, height: 20 }} onMouseDown={stop} onClick={() => onProp("trend", i)} title={trendLabels[i]}>{ic}</button>)}
    </React.Fragment>);
  }

  /* Sparkline toggle (stat-card) */
  if ("sparkline" in defaults) {
    const on = G("sparkline");
    controls.push(<React.Fragment key="sparkline"><span style={label}>{on ? "Sparkline" : "No chart"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? p.ac : p.mu + "30", border: "none" }} onMouseDown={stop} onClick={() => onProp("sparkline", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  /* Dismissed toggle (promo-banner) */
  if ("dismissed" in defaults) {
    const on = G("dismissed");
    controls.push(<React.Fragment key="dismissed"><span style={label}>{on ? "Hidden" : "Visible"}</span>
      <button style={{ ...btn(on), width: 32, height: 18, borderRadius: 999, padding: 2, justifyContent: on ? "flex-end" : "flex-start", background: on ? p.mu + "50" : p.ac, border: "none" }} onMouseDown={stop} onClick={() => onProp("dismissed", !on)}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
      </button>
    </React.Fragment>);
  }

  if (controls.length === 0) return null;

  return <div style={sty} onMouseDown={stop}>{controls}</div>;
}
