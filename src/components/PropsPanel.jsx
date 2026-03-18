import React from "react";
import { DEFAULT_PROPS, HAS_PROPS } from "../constants";
import { getTextureStyle } from "../utils";

/* ── Toggle switch helper ── */
function Sw({ on, color, stop, onClick }) {
  return (
    <button style={{
      width: 32, height: 18, borderRadius: 999, padding: 2, border: "none",
      display: "flex", alignItems: "center",
      justifyContent: on ? "flex-end" : "flex-start",
      background: on ? color : "rgba(128,128,128,.2)",
      cursor: "pointer", transition: "background .2s ease",
    }} onMouseDown={stop} onClick={onClick}>
      <div style={{
        width: 14, height: 14, borderRadius: 999, background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,.12)",
        transition: "transform .15s cubic-bezier(.4,1,.6,1)",
      }} />
    </button>
  );
}

/* Compact props panel for customizing component visual state */
export default function PropsPanel({ type, props, onProp, p, texture }) {
  if (!HAS_PROPS.has(type)) return null;
  const defaults = DEFAULT_PROPS[type] || {};
  const G = (k) => props[k] !== undefined ? props[k] : defaults[k];
  const stop = e => e.stopPropagation();

  const sty = {
    position: "absolute", bottom: -6, left: "50%",
    transform: "translate(-50%, 100%)", zIndex: 200,
    background: p.card + "EE", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    border: `1px solid ${p.bd}`, borderRadius: 10,
    padding: "6px 10px", boxShadow: `0 4px 16px ${p.tx}10`,
    display: "flex", gap: 6, alignItems: "center",
    userSelect: "none", whiteSpace: "nowrap",
    ...getTextureStyle(texture, p),
  };
  const label = { fontSize: 8, color: p.mu, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 2 };
  const btn = (active) => ({
    width: 22, height: 22, borderRadius: 6,
    border: active ? `1.5px solid ${p.ac}` : `1px solid ${p.bd}`,
    background: active ? p.ac + "18" : "transparent",
    color: active ? p.ac : p.mu,
    fontSize: 10, fontWeight: 500, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, fontFamily: "inherit",
    transition: "all .15s ease", outline: "none",
  });

  const controls = [];

  /* Toggle on/off */
  if ("on" in defaults) {
    const on = G("on");
    controls.push(<React.Fragment key="on"><span style={label}>On</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("on", !on)} />
    </React.Fragment>);
  }

  /* Verified toggle (testimonial uses 0/1, profile-card uses bool) */
  if ("verified" in defaults) {
    const vf = G("verified");
    const isOn = !!vf;
    const color = type === "profile-card" ? "#3b82f6" : p.ac;
    controls.push(<React.Fragment key="verified"><span style={label}>{isOn ? "Verified" : "Unverified"}</span>
      <Sw on={isOn} color={color} stop={stop} onClick={() => onProp("verified", isOn ? (typeof vf === "number" ? 0 : false) : (typeof defaults.verified === "number" ? 1 : true))} />
    </React.Fragment>);
  }

  /* Shuffle toggle (media-player) */
  if ("shuffle" in defaults) {
    const sh = G("shuffle");
    controls.push(<React.Fragment key="shuffle"><span style={label}>{sh ? "Shuffle" : "Order"}</span>
      <Sw on={sh} color={p.ac} stop={stop} onClick={() => onProp("shuffle", !sh)} />
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
    if (Array.isArray(open)) {
      controls.push(<React.Fragment key="open"><span style={label}>Open</span>
        {open.map((o, i) => <button key={i} style={btn(o)} onMouseDown={stop} onClick={() => { const next = [...open]; next[i] = !next[i]; onProp("open", next); }}>{o ? "▾" : "›"}</button>)}
      </React.Fragment>);
    } else {
      controls.push(<React.Fragment key="open"><span style={label}>{open ? "Open" : "Closed"}</span>
        <Sw on={open} color={p.ac} stop={stop} onClick={() => onProp("open", !open)} />
      </React.Fragment>);
    }
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

  /* Rating (product-card) */
  if ("rating" in defaults) {
    const rt = G("rating");
    controls.push(<React.Fragment key="rating"><span style={label}>Rating</span>
      {[0, 1, 2, 3, 4, 5].map(n => <button key={n} style={{ ...btn(rt === n), fontSize: n === 0 ? 8 : 12, width: 18, height: 18, border: "none", background: "transparent", color: n === 0 ? (rt === 0 ? p.ac : p.mu + "40") : n <= rt ? p.ac : p.mu + "40" }} onMouseDown={stop} onClick={() => onProp("rating", n)}>{n === 0 ? "∅" : "★"}</button>)}
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
      {scLabels.map((l, i) => { const ci = i < 3 ? i : -1; return <button key={i} style={{ ...btn(sc === ci), fontSize: 8, minWidth: i < 3 ? 28 : 18, height: 18 }} onMouseDown={stop} onClick={() => onProp("sortCol", ci)}>{l}</button>; })}
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
      <Sw on={on} color={p.mu + "70"} stop={stop} onClick={() => onProp("muted", !on)} />
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

  /* Featured toggle (pricing-card, card) */
  if ("featured" in defaults) {
    const on = G("featured");
    controls.push(<React.Fragment key="feat"><span style={label}>Featured</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("featured", !on)} />
    </React.Fragment>);
  }

  /* Liked toggle (card, media-player) */
  if ("liked" in defaults) {
    const on = G("liked");
    controls.push(<React.Fragment key="liked"><span style={label}>{on ? "Liked" : "Like"}</span>
      <Sw on={on} color="#ef4444" stop={stop} onClick={() => onProp("liked", !on)} />
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
      <Sw on={!!pd} color="#4CAF50" stop={stop} onClick={() => onProp("paid", pd ? 0 : 1)} />
    </React.Fragment>);
  }

  /* Wishlisted toggle (product-card) */
  if ("wishlisted" in defaults) {
    const on = G("wishlisted");
    controls.push(<React.Fragment key="wish"><span style={label}>♥</span>
      <button style={{ ...btn(on), width: 22, height: 22, fontSize: 12, border: "none", background: "transparent", color: on ? "#EF4444" : p.mu + "40", transition: "all .2s ease" }} onMouseDown={stop} onClick={() => onProp("wishlisted", !on)}>{on ? "♥" : "♡"}</button>
    </React.Fragment>);
  }

  /* Playing toggle (media-player) */
  if ("playing" in defaults) {
    const on = G("playing");
    controls.push(<React.Fragment key="playing"><span style={label}>{on ? "▶" : "⏸"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("playing", !on)} />
    </React.Fragment>);
  }

  /* Online status toggle (profile-card) */
  if ("online" in defaults) {
    const on = G("online");
    controls.push(<React.Fragment key="online"><span style={label}>{on ? "Online" : "Offline"}</span>
      <Sw on={on} color="#22c55e" stop={stop} onClick={() => onProp("online", !on)} />
    </React.Fragment>);
  }

  /* Followed toggle (profile-card) */
  if ("followed" in defaults) {
    const on = G("followed");
    controls.push(<React.Fragment key="followed"><span style={label}>{on ? "Following" : "Follow"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("followed", !on)} />
    </React.Fragment>);
  }

  /* In Cart toggle (product-card) */
  if ("inCart" in defaults) {
    const on = G("inCart");
    controls.push(<React.Fragment key="inCart"><span style={label}>{on ? "In Cart" : "Not in Cart"}</span>
      <Sw on={on} color="#10B981" stop={stop} onClick={() => onProp("inCart", !on)} />
    </React.Fragment>);
  }

  /* Loading toggle (skeleton, button) */
  if ("loading" in defaults) {
    const on = G("loading");
    controls.push(<React.Fragment key="loading"><span style={label}>{on ? "Loading" : "Loaded"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("loading", !on)} />
    </React.Fragment>);
  }

  /* Disabled toggle (button) */
  if ("disabled" in defaults) {
    const on = G("disabled");
    controls.push(<React.Fragment key="disabled"><span style={label}>{on ? "Disabled" : "Enabled"}</span>
      <Sw on={on} color="#EF4444" stop={stop} onClick={() => onProp("disabled", !on)} />
    </React.Fragment>);
  }

  /* Pinned toggle (list-item) */
  if ("pinned" in defaults) {
    const on = G("pinned");
    controls.push(<React.Fragment key="pinned"><span style={label}>{on ? "Pinned" : "Unpinned"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("pinned", !on)} />
    </React.Fragment>);
  }

  /* Indeterminate toggle (progress) */
  if ("indeterminate" in defaults) {
    const on = G("indeterminate");
    controls.push(<React.Fragment key="indeterminate"><span style={label}>{on ? "Loading" : "Determinate"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("indeterminate", !on)} />
    </React.Fragment>);
  }

  /* Focused toggle (input) */
  if ("focused" in defaults) {
    const on = G("focused");
    controls.push(<React.Fragment key="focused"><span style={label}>{on ? "Focused" : "Blurred"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("focused", !on)} />
    </React.Fragment>);
  }

  /* Error toggle (input) */
  if ("error" in defaults) {
    const on = G("error");
    controls.push(<React.Fragment key="error"><span style={label}>{on ? "Error" : "Valid"}</span>
      <Sw on={on} color="#EF4444" stop={stop} onClick={() => onProp("error", !on)} />
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

  /* Line numbers toggle (code-block) */
  if ("lineNumbers" in defaults) {
    const on = G("lineNumbers");
    controls.push(<React.Fragment key="lineNumbers"><span style={label}>{on ? "Lines" : "No lines"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("lineNumbers", !on)} />
    </React.Fragment>);
  }

  /* Copied state (code-block) */
  if ("copied" in defaults) {
    const on = G("copied");
    controls.push(<React.Fragment key="copied"><span style={label}>{on ? "Copied!" : "Copy"}</span>
      <button style={{ ...btn(on), fontSize: 10, width: 24, height: 20, color: on ? "#4CAF50" : p.mu, borderColor: on ? "#4CAF5060" : p.bd, background: on ? "#4CAF5015" : "transparent" }} onMouseDown={stop} onClick={() => { onProp("copied", true); setTimeout(() => onProp("copied", false), 2000); }}>{on ? "✓" : "⎘"}</button>
    </React.Fragment>);
  }

  /* Count (badge) */
  if ("count" in defaults) {
    const ct = G("count");
    controls.push(<React.Fragment key="count"><span style={label}>Count</span>
      <button style={btn(false)} onMouseDown={stop} onClick={() => onProp("count", Math.max(0, ct - 1))}>−</button>
      <span style={{ fontSize: 11, fontWeight: 500, color: p.tx, minWidth: 14, textAlign: "center" }}>{ct}</span>
      <button style={btn(false)} onMouseDown={stop} onClick={() => onProp("count", Math.min(99, ct + 1))}>+</button>
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
      <Sw on={on} color="#4CAF50" stop={stop} onClick={() => onProp("discount", !on)} />
    </React.Fragment>);
  }

  /* Trend direction (stat-card) — color-coded buttons */
  if ("trend" in defaults) {
    const trend = G("trend");
    const trendData = [
      { ic: "▲", label: "Up", color: "#4CAF50" },
      { ic: "▼", label: "Down", color: "#EF4444" },
      { ic: "→", label: "Flat", color: p.mu },
    ];
    controls.push(<React.Fragment key="trend"><span style={label}>Trend</span>
      {trendData.map((t, i) => <button key={i} style={{ ...btn(trend === i), fontSize: 10, minWidth: 24, height: 20, color: trend === i ? t.color : p.mu, borderColor: trend === i ? t.color + "60" : p.bd, background: trend === i ? t.color + "15" : "transparent" }} onMouseDown={stop} onClick={() => onProp("trend", i)} title={t.label}>{t.ic}</button>)}
    </React.Fragment>);
  }

  /* Sparkline toggle (stat-card) */
  if ("sparkline" in defaults) {
    const on = G("sparkline");
    controls.push(<React.Fragment key="sparkline"><span style={label}>{on ? "Sparkline" : "No chart"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("sparkline", !on)} />
    </React.Fragment>);
  }

  /* Tooltip position (top/bottom) */
  if ("position" in defaults) {
    const pos = G("position");
    controls.push(<React.Fragment key="position"><span style={label}>Pos</span>
      <button style={{ ...btn(pos === 0), fontSize: 9, minWidth: 22, height: 20 }} onMouseDown={stop} onClick={() => onProp("position", 0)}>↑</button>
      <button style={{ ...btn(pos === 1), fontSize: 9, minWidth: 22, height: 20 }} onMouseDown={stop} onClick={() => onProp("position", 1)}>↓</button>
    </React.Fragment>);
  }

  /* Completed steps (timeline) */
  if ("completed" in defaults) {
    const completed = G("completed");
    controls.push(<React.Fragment key="completed"><span style={label}>Done</span>
      {completed.map((c, i) => <button key={i} style={btn(c)} onMouseDown={stop} onClick={() => { const next = [...completed]; next[i] = !next[i]; onProp("completed", next); }}>{c ? "✓" : i + 1}</button>)}
    </React.Fragment>);
  }

  /* Modal size (small/medium/large) */
  if ("size" in defaults && type === "modal") {
    const sz = G("size");
    const szLabels = ["S", "M", "L"];
    controls.push(<React.Fragment key="size"><span style={label}>Size</span>
      {szLabels.map((l, i) => <button key={i} style={{ ...btn(sz === i), fontSize: 9, minWidth: 22, height: 20 }} onMouseDown={stop} onClick={() => onProp("size", i)}>{l}</button>)}
    </React.Fragment>);
  }

  /* Removable toggle (tag-input) */
  if ("removable" in defaults) {
    const on = G("removable");
    controls.push(<React.Fragment key="removable"><span style={label}>{on ? "Editable" : "Read-only"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("removable", !on)} />
    </React.Fragment>);
  }

  /* Compact toggle (kanban) */
  if ("compact" in defaults) {
    const on = G("compact");
    controls.push(<React.Fragment key="compact"><span style={label}>{on ? "Compact" : "Full"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("compact", !on)} />
    </React.Fragment>);
  }

  /* Collapsed toggle (breadcrumb, sidebar) */
  if ("collapsed" in defaults) {
    const on = G("collapsed");
    controls.push(<React.Fragment key="collapsed"><span style={label}>{on ? "Collapsed" : "Expanded"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("collapsed", !on)} />
    </React.Fragment>);
  }

  /* Animated toggle (accordion) */
  if ("animated" in defaults) {
    const on = G("animated");
    controls.push(<React.Fragment key="animated"><span style={label}>{on ? "Animated" : "Instant"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("animated", !on)} />
    </React.Fragment>);
  }

  /* Interactive toggle (rating) */
  if ("interactive" in defaults) {
    const on = G("interactive");
    controls.push(<React.Fragment key="interactive"><span style={label}>{on ? "Interactive" : "Read-only"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("interactive", !on)} />
    </React.Fragment>);
  }

  /* On Sale toggle (product-card) */
  if ("onSale" in defaults) {
    const on = G("onSale");
    controls.push(<React.Fragment key="onSale"><span style={label}>{on ? "Sale" : "Regular"}</span>
      <Sw on={on} color="#EF4444" stop={stop} onClick={() => onProp("onSale", !on)} />
    </React.Fragment>);
  }

  /* Newsletter toggle (footer) */
  if ("newsletter" in defaults) {
    const on = G("newsletter");
    controls.push(<React.Fragment key="newsletter"><span style={label}>{on ? "Newsletter" : "No signup"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("newsletter", !on)} />
    </React.Fragment>);
  }

  /* Uploadable toggle (image-placeholder) */
  if ("uploadable" in defaults) {
    const on = G("uploadable");
    controls.push(<React.Fragment key="uploadable"><span style={label}>{on ? "Upload" : "Static"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("uploadable", !on)} />
    </React.Fragment>);
  }

  /* Show label toggle (progress) */
  if ("showLabel" in defaults) {
    const on = G("showLabel");
    controls.push(<React.Fragment key="showLabel"><span style={label}>{on ? "Label" : "No Label"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("showLabel", !on)} />
    </React.Fragment>);
  }

  /* Show action toggle (alert) */
  if ("showAction" in defaults) {
    const on = G("showAction");
    controls.push(<React.Fragment key="showAction"><span style={label}>{on ? "Action" : "No Action"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("showAction", !on)} />
    </React.Fragment>);
  }

  /* Show total toggle (pagination) */
  if ("showTotal" in defaults) {
    const on = G("showTotal");
    controls.push(<React.Fragment key="showTotal"><span style={label}>{on ? "Total" : "No Total"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("showTotal", !on)} />
    </React.Fragment>);
  }

  /* Dismissible toggle (modal) */
  if ("dismissible" in defaults) {
    const on = G("dismissible");
    controls.push(<React.Fragment key="dismissible"><span style={label}>{on ? "Closable" : "No Close"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("dismissible", !on)} />
    </React.Fragment>);
  }

  /* Show header toggle (notification) */
  if ("showHeader" in defaults) {
    const on = G("showHeader");
    controls.push(<React.Fragment key="showHeader"><span style={label}>{on ? "Header" : "No Header"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("showHeader", !on)} />
    </React.Fragment>);
  }

  /* Editable toggle (tag-input) */
  if ("editable" in defaults) {
    const on = G("editable");
    controls.push(<React.Fragment key="editable"><span style={label}>{on ? "Edit" : "Read-only"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("editable", !on)} />
    </React.Fragment>);
  }

  /* Annual toggle (pricing-card) */
  if ("annual" in defaults) {
    const on = G("annual");
    controls.push(<React.Fragment key="annual"><span style={label}>{on ? "Annual" : "Monthly"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("annual", !on)} />
    </React.Fragment>);
  }

  /* Compact toggle (feature-table, kanban) */
  if ("compact" in defaults) {
    const on = G("compact");
    controls.push(<React.Fragment key="compact"><span style={label}>{on ? "Compact" : "Normal"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("compact", !on)} />
    </React.Fragment>);
  }

  /* Show count toggle (rating) */
  if ("showCount" in defaults) {
    const on = G("showCount");
    controls.push(<React.Fragment key="showCount"><span style={label}>{on ? "Count" : "No Count"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("showCount", !on)} />
    </React.Fragment>);
  }

  /* Saved toggle (cart-item) */
  if ("saved" in defaults) {
    const on = G("saved");
    controls.push(<React.Fragment key="saved"><span style={label}>{on ? "Saved" : "In Cart"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("saved", !on)} />
    </React.Fragment>);
  }

  /* Centered toggle (hero) */
  if ("centered" in defaults) {
    const on = G("centered");
    controls.push(<React.Fragment key="centered"><span style={label}>{on ? "Center" : "Left"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("centered", !on)} />
    </React.Fragment>);
  }

  /* Clearable toggle (search) */
  if ("clearable" in defaults) {
    const on = G("clearable");
    controls.push(<React.Fragment key="clearable"><span style={label}>{on ? "Clear ×" : "No Clear"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("clearable", !on)} />
    </React.Fragment>);
  }

  /* Actionable toggle (toast) */
  if ("actionable" in defaults) {
    const on = G("actionable");
    controls.push(<React.Fragment key="actionable"><span style={label}>{on ? "Action" : "No Action"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("actionable", !on)} />
    </React.Fragment>);
  }

  /* Show value toggle (slider) */
  if ("showValue" in defaults) {
    const on = G("showValue");
    controls.push(<React.Fragment key="showValue"><span style={label}>{on ? "Value" : "No Value"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("showValue", !on)} />
    </React.Fragment>);
  }

  /* Animated toggle (chart) */
  if ("animated" in defaults && type === "chart") {
    const on = G("animated");
    controls.push(<React.Fragment key="animated"><span style={label}>{on ? "Animated" : "Static"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("animated", !on)} />
    </React.Fragment>);
  }

  /* Show legend toggle (chart) */
  if ("showLegend" in defaults) {
    const on = G("showLegend");
    controls.push(<React.Fragment key="showLegend"><span style={label}>{on ? "Legend" : "No Legend"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("showLegend", !on)} />
    </React.Fragment>);
  }

  /* Searchable toggle (select) */
  if ("searchable" in defaults) {
    const on = G("searchable");
    controls.push(<React.Fragment key="searchable"><span style={label}>{on ? "Search" : "No Search"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("searchable", !on)} />
    </React.Fragment>);
  }

  /* Disabled toggle (input) */
  if ("disabled" in defaults && type === "input") {
    const on = G("disabled");
    controls.push(<React.Fragment key="disabled"><span style={label}>{on ? "Disabled" : "Enabled"}</span>
      <Sw on={!on} color={p.ac} stop={stop} onClick={() => onProp("disabled", !on)} />
    </React.Fragment>);
  }

  /* Success toggle (input) */
  if ("success" in defaults) {
    const on = G("success");
    controls.push(<React.Fragment key="success"><span style={label}>{on ? "Valid" : "No Valid"}</span>
      <Sw on={on} color="#10B981" stop={stop} onClick={() => onProp("success", !on)} />
    </React.Fragment>);
  }

  /* Sortable toggle (table) */
  if ("sortable" in defaults) {
    const on = G("sortable");
    controls.push(<React.Fragment key="sortable"><span style={label}>{on ? "Sort" : "No Sort"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("sortable", !on)} />
    </React.Fragment>);
  }

  /* Loading toggle (card) */
  if ("loading" in defaults && type === "card") {
    const on = G("loading");
    controls.push(<React.Fragment key="loading"><span style={label}>{on ? "Loading" : "Loaded"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("loading", !on)} />
    </React.Fragment>);
  }

  /* Subscribed toggle (footer) */
  if ("subscribed" in defaults) {
    const on = G("subscribed");
    controls.push(<React.Fragment key="subscribed"><span style={label}>{on ? "Subscribed" : "Not Sub"}</span>
      <Sw on={on} color="#10B981" stop={stop} onClick={() => onProp("subscribed", !on)} />
    </React.Fragment>);
  }

  /* Highlighted toggle (pricing-card) */
  if ("highlighted" in defaults) {
    const on = G("highlighted");
    controls.push(<React.Fragment key="highlighted"><span style={label}>{on ? "Selected" : "Default"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("highlighted", !on)} />
    </React.Fragment>);
  }

  /* Stacked toggle (avatar-row) */
  if ("stacked" in defaults) {
    const on = G("stacked");
    controls.push(<React.Fragment key="stacked"><span style={label}>{on ? "Stacked" : "Spread"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("stacked", !on)} />
    </React.Fragment>);
  }

  /* Muted toggle (media-player) */
  if ("muted" in defaults) {
    const on = G("muted");
    controls.push(<React.Fragment key="muted"><span style={label}>{on ? "Muted" : "Sound"}</span>
      <Sw on={!on} color={p.ac} stop={stop} onClick={() => onProp("muted", !on)} />
    </React.Fragment>);
  }

  /* Sold out toggle (product-card) */
  if ("soldOut" in defaults) {
    const on = G("soldOut");
    controls.push(<React.Fragment key="soldOut"><span style={label}>{on ? "Sold Out" : "In Stock"}</span>
      <Sw on={!on} color="#EF4444" stop={stop} onClick={() => onProp("soldOut", !on)} />
    </React.Fragment>);
  }

  /* Icon toggle (button) */
  if ("icon" in defaults) {
    const on = G("icon");
    controls.push(<React.Fragment key="icon"><span style={label}>{on ? "Icon" : "No Icon"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("icon", !on)} />
    </React.Fragment>);
  }

  /* Dot mode toggle (badge) */
  if ("dot" in defaults) {
    const on = G("dot");
    controls.push(<React.Fragment key="dot"><span style={label}>{on ? "Dot" : "Label"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("dot", !on)} />
    </React.Fragment>);
  }

  /* Show CTA toggle (navbar) */
  if ("showCta" in defaults) {
    const on = G("showCta");
    controls.push(<React.Fragment key="showCta"><span style={label}>{on ? "CTA" : "No CTA"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("showCta", !on)} />
    </React.Fragment>);
  }

  /* Closable toggle (promo-banner) */
  if ("closable" in defaults) {
    const on = G("closable");
    controls.push(<React.Fragment key="closable"><span style={label}>{on ? "Closable" : "Permanent"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("closable", !on)} />
    </React.Fragment>);
  }

  /* Decorated toggle (heading) */
  if ("decorated" in defaults) {
    const on = G("decorated");
    controls.push(<React.Fragment key="decorated"><span style={label}>{on ? "Decorated" : "Plain"}</span>
      <Sw on={on} color={p.ac} stop={stop} onClick={() => onProp("decorated", !on)} />
    </React.Fragment>);
  }

  /* Dismissed toggle (promo-banner) */
  if ("dismissed" in defaults) {
    const on = G("dismissed");
    controls.push(<React.Fragment key="dismissed"><span style={label}>{on ? "Hidden" : "Visible"}</span>
      <Sw on={!on} color={p.ac} stop={stop} onClick={() => onProp("dismissed", !on)} />
    </React.Fragment>);
  }

  /* Completed toggle (list-item) */
  if ("completed" in defaults) {
    const on = G("completed");
    controls.push(<React.Fragment key="completed"><span style={label}>{on ? "Done" : "To Do"}</span>
      <Sw on={on} color="#4CAF50" stop={stop} onClick={() => onProp("completed", !on)} />
    </React.Fragment>);
  }

  if (controls.length === 0) return null;

  return <div style={sty} onMouseDown={stop}>{controls}</div>;
}
