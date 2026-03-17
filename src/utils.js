import { STORE_KEY, VARIANTS } from "./constants";

export function load(k, d) {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return s[k] !== undefined ? s[k] : d;
  } catch {
    return d;
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 11);
}

export function maxV(t) {
  return (VARIANTS[t] || []).length || 1;
}

export function varName(t, v) {
  return (VARIANTS[t] || [])[v] || "Standard";
}

export function snap(s, all, thr = 10) {
  const r = { x: null, y: null, g: [] };
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  for (const o of all) {
    if (o.id === s.id) continue;
    const ox = o.x + o.w / 2, oy = o.y + o.h / 2;
    if (Math.abs(cx - ox) < thr) { r.x = ox - s.w / 2; r.g.push({ t: "v", p: ox }); }
    if (Math.abs(cy - oy) < thr) { r.y = oy - s.h / 2; r.g.push({ t: "h", p: oy }); }
    if (Math.abs(s.x - o.x) < thr) { r.x = o.x; r.g.push({ t: "v", p: o.x }); }
    if (Math.abs(s.x + s.w - (o.x + o.w)) < thr) { r.x = o.x + o.w - s.w; r.g.push({ t: "v", p: o.x + o.w }); }
    if (Math.abs(s.y - o.y) < thr) { r.y = o.y; r.g.push({ t: "h", p: o.y }); }
    if (Math.abs(s.y + s.h - (o.y + o.h)) < thr) { r.y = o.y + o.h - s.h; r.g.push({ t: "h", p: o.y + o.h }); }
    for (const g of [12, 16, 24]) {
      if (Math.abs(s.x - (o.x + o.w) - g) < thr) { r.x = o.x + o.w + g; r.g.push({ t: "v", p: o.x + o.w + g / 2 }); }
      if (Math.abs(s.y - (o.y + o.h) - g) < thr) { r.y = o.y + o.h + g; r.g.push({ t: "h", p: o.y + o.h + g / 2 }); }
    }
  }
  return r;
}

export function sanitizeHtml(html) {
  if (typeof html !== "string") return html;
  if (!/<\w/.test(html)) return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  div.querySelectorAll("script,iframe,object,embed,form,link,meta").forEach(el => el.remove());
  div.querySelectorAll("*").forEach(el => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("on") || attr.name === "href" && el.getAttribute("href")?.startsWith("javascript")) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return div.innerHTML;
}

export function validateImport(data) {
  if (!data || typeof data !== "object") return null;
  const result = {};
  if (Array.isArray(data.shapes)) {
    result.shapes = data.shapes.filter(s =>
      s && typeof s === "object" &&
      typeof s.id === "string" &&
      typeof s.type === "string" &&
      typeof s.x === "number" &&
      typeof s.y === "number" &&
      typeof s.w === "number" &&
      typeof s.h === "number"
    );
  }
  if (typeof data.pal === "string") result.pal = data.pal;
  if (typeof data.prefV === "object" && data.prefV) result.prefV = data.prefV;
  if (typeof data.gest === "number") result.gest = data.gest;
  return result;
}

/* ── Texture Modifier System ──
 * CSS-only textures applied via inline styles. Each component can accept
 * a `texture` prop (string) to overlay a visual texture effect.
 * Returns a style object to spread onto the target element.
 */
export function getTextureStyle(texture, p) {
  if (!texture) return {};
  switch (texture) {
    case "glass":
      return { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: p.card + "CC" };
    case "noise":
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      };
    case "gradient":
      return {
        backgroundImage: `radial-gradient(ellipse at 20% 50%, ${p.ac}12 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, ${p.ac2 || p.ac}10 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, ${p.su}15 0%, transparent 50%)`,
      };
    case "neumorphic":
      return {
        boxShadow: `6px 6px 14px ${p.tx}08, -6px -6px 14px ${p.bg}40`,
        border: "none",
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(circle, ${p.bd} 1px, transparent 1px)`,
        backgroundSize: "16px 16px",
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${p.bd}20 1px, transparent 1px), linear-gradient(90deg, ${p.bd}20 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
      };
    case "paper":
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
        backgroundColor: p.card,
      };
    case "brushed":
      return {
        backgroundImage: `repeating-linear-gradient(90deg, ${p.bd}06 0px, transparent 2px, transparent 4px)`,
      };
    case "marble":
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.015' numOctaves='5' seed='2'/%3E%3CfeDisplacementMap in='SourceGraphic' scale='30'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23m)' opacity='0.03'/%3E%3C/svg%3E")`,
        backgroundSize: "400px 400px",
      };
    case "frosted":
      return { backdropFilter: "blur(20px) saturate(0.8)", WebkitBackdropFilter: "blur(20px) saturate(0.8)", background: p.card + "DD" };
    case "holographic":
      return {
        backgroundImage: `linear-gradient(135deg, ${p.ac}15 0%, ${p.ac2 || p.su}15 25%, ${p.ac}10 50%, ${p.su}15 75%, ${p.ac}15 100%)`,
        backgroundSize: "200% 200%",
        animation: "tp-holo 6s ease infinite",
      };
    case "emboss":
      return {
        boxShadow: `inset 1px 1px 2px ${p.bg}40, inset -1px -1px 2px ${p.tx}06`,
      };
    default:
      return {};
  }
}

let debounceTimer = null;
export function debounce(fn, ms) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), ms);
  };
}

/* ══════════════════════════════════════════════════════════
   DESIGNER SYSTEM — Smart randomization for components
   ══════════════════════════════════════════════════════════ */

/* ── Font categories for harmonious pairing ── */
const FONT_CATS = {
  display: [0, 4, 5, 6, 9, 12, 13, 15],   // DM Sans, Space Grotesk, Outfit, Sora, Instrument Serif, Playfair, Bricolage, Cabinet
  body:    [1, 2, 3, 7, 8, 10, 14, 16],    // Inter, Plus Jakarta, Manrope, Work Sans, Figtree, Geist, General Sans, Poppins
  mono:    [11],                             // JetBrains Mono
  serif:   [9, 12],                          // Instrument Serif, Playfair Display
};

/* ── Component size categories for font sizing ── */
const SIZE_CAT = {
  large:  new Set(["hero", "heading", "pricing-card", "profile-card", "modal"]),
  medium: new Set(["card", "card-sm", "stat-card", "dash-panel", "testimonial", "bento-grid", "product-card", "order-summary", "receipt", "feature-table", "kanban"]),
  small:  new Set(["button", "badge", "toggle", "pagination", "breadcrumb", "tag-input", "avatar-row", "tooltip", "checkbox", "slider"]),
  nav:    new Set(["navbar", "tabs", "sidebar", "footer"]),
  input:  new Set(["input", "search", "select", "dropdown", "cmd-palette"]),
  code:   new Set(["code-block"]),
};

/* ── Variant style tags — which variant indices map to which aesthetic ── */
// Most components follow: [Standard, ..., Glass(~idx3-4), Brutal(~idx5), Gradient(~idx6)]
// We tag the LAST 3 indices as glass/brutal/gradient for most components
function getVariantTags(type, variantCount) {
  const tags = {};
  if (variantCount < 4) return tags; // too few variants to categorize
  // Most components: Glass is idx variantCount-3, Brutal is idx variantCount-2, Gradient is idx variantCount-1
  tags.glass = variantCount - 3;
  tags.brutal = variantCount - 2;
  tags.gradient = variantCount - 1;
  // Terminal variants (certain components have them at specific indices)
  if (["card","toast","sidebar","table","navbar","stat-card","code-block","media-player","profile-card","sub-toggle"].includes(type)) {
    // Terminal is usually at a fixed position, but varies per component
    // For simplicity, just mark it — not critical for palette matching
  }
  return tags;
}

/* ── Palette darkness detection ── */
function isDarkPalette(p) {
  // Parse bg color to check luminance
  const hex = p.bg.replace("#", "");
  if (hex.length < 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randRange = (min, max) => +(min + Math.random() * (max - min)).toFixed(2);

/* ── Design mood presets ── */
export const DESIGN_MOODS = [
  { id: "auto",    label: "Auto",    icon: "✦" },
  { id: "minimal", label: "Minimal", icon: "○" },
  { id: "bold",    label: "Bold",    icon: "■" },
  { id: "elegant", label: "Elegant", icon: "◇" },
  { id: "playful", label: "Playful", icon: "★" },
];

/* Mood-specific overrides for variant/font/size selection */
const MOOD_CONFIG = {
  auto: null, // uses default smart logic
  minimal: {
    // Clean variants (first 2 standard), body fonts, near-1.0 sizing
    variantBias: (tags, varCount, dark) => Math.floor(Math.random() * Math.min(2, varCount)),
    fontPool: () => pick(FONT_CATS.body),
    fsizeRange: (cat) => cat === "large" ? randRange(1.0, 1.15) : cat === "small" ? randRange(0.88, 0.98) : randRange(0.92, 1.05),
    propTweak: (props) => { if (props.featured !== undefined) props.featured = false; },
  },
  bold: {
    // Brutal/gradient variants, display fonts, larger sizing
    variantBias: (tags, varCount, dark) => {
      const r = Math.random();
      if (tags.brutal !== undefined && r < 0.45) return tags.brutal;
      if (tags.gradient !== undefined && r < 0.75) return tags.gradient;
      return Math.floor(Math.random() * varCount);
    },
    fontPool: (isLarge, isSmall) => isSmall ? pick(FONT_CATS.body) : pick(FONT_CATS.display),
    fsizeRange: (cat) => cat === "large" ? randRange(1.2, 1.5) : cat === "small" ? randRange(0.95, 1.1) : randRange(1.0, 1.25),
    propTweak: (props) => { if (props.featured !== undefined) props.featured = true; },
  },
  elegant: {
    // Glass/gradient variants, serif fonts, refined sizing
    variantBias: (tags, varCount, dark) => {
      const r = Math.random();
      if (tags.glass !== undefined && r < 0.5) return tags.glass;
      if (tags.gradient !== undefined && r < 0.75) return tags.gradient;
      return Math.max(0, varCount - 4) + Math.floor(Math.random() * Math.min(2, varCount));
    },
    fontPool: (isLarge, isSmall) => {
      if (isSmall) return pick(FONT_CATS.body);
      const rr = Math.random();
      return rr < 0.5 ? pick(FONT_CATS.serif) : rr < 0.85 ? pick(FONT_CATS.display) : pick(FONT_CATS.body);
    },
    fsizeRange: (cat) => cat === "large" ? randRange(1.1, 1.35) : cat === "small" ? randRange(0.85, 0.95) : randRange(0.95, 1.1),
    propTweak: (props) => { if (props.verified !== undefined) props.verified = 1; },
  },
  playful: {
    // Any variant, fun display fonts, varied sizing
    variantBias: (tags, varCount, dark) => Math.floor(Math.random() * varCount),
    fontPool: (isLarge, isSmall) => {
      const funFonts = [...FONT_CATS.display, ...FONT_CATS.serif];
      return isSmall ? pick([...FONT_CATS.body, ...FONT_CATS.display]) : pick(funFonts);
    },
    fsizeRange: (cat) => cat === "large" ? randRange(1.15, 1.5) : cat === "small" ? randRange(0.8, 1.1) : randRange(0.88, 1.2),
    propTweak: (props) => {
      if (props.stars !== undefined) props.stars = 4 + Math.round(Math.random());
      if (props.pct !== undefined) props.pct = 60 + Math.floor(Math.random() * 35);
    },
  },
};

/* ── Multi-component harmony helpers ── */
function _analyzeHarmony(shapes) {
  const variantsByType = {};
  const fonts = [];
  const fsizes = [];
  const radii = [];
  const shadowTypes = []; // "none", "soft", "hard", "glow", "brutal"
  for (const s of shapes) {
    const t = s.type;
    if (!variantsByType[t]) variantsByType[t] = [];
    variantsByType[t].push(s.variant || 0);
    fonts.push(s.font || 0);
    fsizes.push(s.fsize || 1);
    const ds = s.dStyles || {};
    radii.push(ds.borderRadius ?? 14);
    const sh = ds.boxShadow || "none";
    if (sh === "none") shadowTypes.push("none");
    else if (sh.includes("4px 4px")) shadowTypes.push("brutal");
    else if (sh.includes("20px") || sh.includes("40px")) shadowTypes.push("dramatic");
    else if (sh.includes("inset")) shadowTypes.push("inset");
    else shadowTypes.push("soft");
  }
  const avgFsize = fsizes.length ? fsizes.reduce((a, b) => a + b, 0) / fsizes.length : 1;
  const avgRadius = radii.length ? radii.reduce((a, b) => a + b, 0) / radii.length : 14;
  const dominantShadow = shadowTypes.length ? _mode(shadowTypes) : "none";
  return { variantsByType, fonts, fsizes, avgFsize, radii, avgRadius, shadowTypes, dominantShadow };
}

function _mode(arr) {
  const counts = {};
  let best = arr[0], bestC = 0;
  for (const v of arr) { counts[v] = (counts[v] || 0) + 1; if (counts[v] > bestC) { best = v; bestC = counts[v]; } }
  return best;
}

function _dominantFontCat(fonts) {
  const catCount = { display: 0, body: 0, mono: 0, serif: 0 };
  for (const f of fonts) {
    for (const [cat, indices] of Object.entries(FONT_CATS)) {
      if (indices.includes(f)) { catCount[cat]++; break; }
    }
  }
  let best = "body", bestC = 0;
  for (const [cat, c] of Object.entries(catCount)) { if (c > bestC) { best = cat; bestC = c; } }
  return best;
}

/* ── Curated preset combinations — dice cycles through these first ── */
const CURATED_COMBOS = {
  // Structure
  hero:         [{ v: 0, f: 0, fs: 1.2 }, { v: 1, f: 12, fs: 1.3 }, { v: 4, f: 4, fs: 1.15 }, { v: 5, f: 13, fs: 1.1 }, { v: 6, f: 9, fs: 1.25 }],
  heading:      [{ v: 0, f: 1, fs: 1.15 }, { v: 3, f: 12, fs: 1.3 }, { v: 4, f: 5, fs: 1.1 }, { v: 5, f: 13, fs: 1.2 }, { v: 6, f: 9, fs: 1.25 }],
  card:         [{ v: 0, f: 1, fs: 1.0 }, { v: 1, f: 3, fs: 0.95 }, { v: 5, f: 7, fs: 1.0 }, { v: 6, f: 12, fs: 1.05 }, { v: 3, f: 2, fs: 1.0 }],
  "card-sm":    [{ v: 0, f: 2, fs: 0.95 }, { v: 3, f: 1, fs: 1.0 }, { v: 5, f: 4, fs: 0.95 }, { v: 4, f: 8, fs: 1.0 }],
  // Navigation
  navbar:       [{ v: 0, f: 1, fs: 1.0 }, { v: 3, f: 0, fs: 0.95 }, { v: 5, f: 4, fs: 1.0 }, { v: 2, f: 3, fs: 0.95 }],
  sidebar:      [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 3, fs: 0.95 }, { v: 3, f: 10, fs: 1.0 }, { v: 6, f: 0, fs: 0.95 }],
  tabs:         [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 5, fs: 0.95 }, { v: 3, f: 0, fs: 1.0 }, { v: 5, f: 4, fs: 0.95 }],
  footer:       [{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 3, fs: 1.0 }, { v: 4, f: 0, fs: 0.95 }, { v: 5, f: 7, fs: 1.0 }],
  // Data
  "stat-card":  [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 0, fs: 1.05 }, { v: 4, f: 4, fs: 1.0 }, { v: 6, f: 12, fs: 1.1 }],
  "dash-panel": [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 10, fs: 0.95 }, { v: 4, f: 0, fs: 1.0 }, { v: 3, f: 5, fs: 1.05 }],
  table:        [{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 10, fs: 1.0 }, { v: 3, f: 11, fs: 0.9 }, { v: 6, f: 3, fs: 0.95 }],
  chart:        [{ v: 0, f: 1, fs: 1.0 }, { v: 1, f: 0, fs: 0.95 }, { v: 4, f: 10, fs: 1.0 }, { v: 6, f: 5, fs: 1.05 }],
  // Commerce
  "pricing-card": [{ v: 0, f: 1, fs: 1.05 }, { v: 3, f: 12, fs: 1.15 }, { v: 4, f: 0, fs: 1.1 }, { v: 5, f: 4, fs: 1.0 }, { v: 1, f: 9, fs: 1.1 }],
  "product-card": [{ v: 0, f: 2, fs: 1.0 }, { v: 1, f: 5, fs: 1.0 }, { v: 4, f: 1, fs: 0.95 }, { v: 3, f: 3, fs: 1.05 }],
  "order-summary":[{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 3, fs: 0.95 }, { v: 4, f: 10, fs: 1.0 }, { v: 5, f: 0, fs: 0.95 }],
  receipt:      [{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 10, fs: 1.0 }, { v: 3, f: 11, fs: 0.9 }, { v: 4, f: 0, fs: 0.95 }],
  // Interactive
  button:       [{ v: 0, f: 0, fs: 1.0 }, { v: 1, f: 4, fs: 0.95 }, { v: 3, f: 5, fs: 1.0 }, { v: 5, f: 12, fs: 1.05 }, { v: 4, f: 13, fs: 1.0 }],
  input:        [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 3, fs: 0.95 }, { v: 4, f: 10, fs: 1.0 }, { v: 5, f: 0, fs: 0.95 }],
  modal:        [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 3, fs: 1.05 }, { v: 3, f: 12, fs: 1.1 }, { v: 5, f: 4, fs: 1.0 }],
  search:       [{ v: 0, f: 1, fs: 1.0 }, { v: 1, f: 4, fs: 0.95 }, { v: 3, f: 10, fs: 1.0 }, { v: 4, f: 0, fs: 0.95 }],
  toggle:       [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 3, fs: 0.95 }, { v: 3, f: 0, fs: 1.0 }, { v: 5, f: 10, fs: 0.95 }],
  badge:        [{ v: 0, f: 1, fs: 0.9 }, { v: 1, f: 4, fs: 0.85 }, { v: 3, f: 10, fs: 0.9 }, { v: 5, f: 13, fs: 0.95 }],
  toast:        [{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 3, fs: 1.0 }, { v: 3, f: 10, fs: 0.95 }, { v: 6, f: 11, fs: 0.9 }],
  progress:     [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 0, fs: 0.95 }, { v: 4, f: 10, fs: 1.0 }, { v: 5, f: 4, fs: 0.95 }],
  dropdown:     [{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 3, fs: 1.0 }, { v: 3, f: 10, fs: 0.95 }, { v: 5, f: 0, fs: 1.0 }],
  select:       [{ v: 0, f: 1, fs: 1.0 }, { v: 1, f: 4, fs: 0.95 }, { v: 3, f: 10, fs: 1.0 }, { v: 5, f: 0, fs: 0.95 }],
  checkbox:     [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 3, fs: 0.95 }, { v: 4, f: 16, fs: 1.0 }, { v: 3, f: 0, fs: 0.95 }],
  slider:       [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 4, fs: 0.95 }, { v: 3, f: 10, fs: 1.0 }, { v: 4, f: 0, fs: 0.95 }],
  alert:        [{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 3, fs: 1.0 }, { v: 3, f: 10, fs: 0.95 }, { v: 6, f: 11, fs: 0.9 }],
  pagination:   [{ v: 0, f: 1, fs: 0.9 }, { v: 2, f: 4, fs: 0.85 }, { v: 4, f: 10, fs: 0.9 }, { v: 3, f: 0, fs: 0.9 }],
  // Content
  testimonial:  [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 9, fs: 1.05 }, { v: 3, f: 12, fs: 1.1 }, { v: 5, f: 4, fs: 1.0 }],
  "profile-card":[{ v: 0, f: 1, fs: 1.0 }, { v: 3, f: 12, fs: 1.1 }, { v: 4, f: 0, fs: 1.05 }, { v: 5, f: 4, fs: 1.0 }],
  "bento-grid": [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 5, fs: 1.05 }, { v: 3, f: 0, fs: 1.0 }, { v: 4, f: 10, fs: 0.95 }],
  "image-placeholder": [{ v: 0, f: 1, fs: 1.0 }, { v: 1, f: 0, fs: 0.95 }, { v: 6, f: 9, fs: 1.05 }, { v: 3, f: 10, fs: 1.0 }],
  "avatar-row": [{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 4, fs: 0.9 }, { v: 4, f: 10, fs: 0.95 }, { v: 3, f: 0, fs: 0.9 }],
  "list-item":  [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 3, fs: 0.95 }, { v: 3, f: 10, fs: 1.0 }, { v: 4, f: 0, fs: 0.95 }],
  accordion:    [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 3, fs: 0.95 }, { v: 3, f: 10, fs: 1.0 }, { v: 4, f: 9, fs: 1.05 }],
  notification: [{ v: 0, f: 1, fs: 0.95 }, { v: 3, f: 10, fs: 1.0 }, { v: 4, f: 0, fs: 0.95 }, { v: 2, f: 3, fs: 0.9 }],
  "tag-input":  [{ v: 0, f: 1, fs: 0.9 }, { v: 3, f: 4, fs: 0.85 }, { v: 4, f: 10, fs: 0.9 }, { v: 5, f: 0, fs: 0.9 }],
  skeleton:     [{ v: 0, f: 1, fs: 1.0 }, { v: 1, f: 0, fs: 0.95 }, { v: 2, f: 3, fs: 1.0 }, { v: 4, f: 10, fs: 0.95 }],
  breadcrumb:   [{ v: 0, f: 1, fs: 0.9 }, { v: 1, f: 4, fs: 0.85 }, { v: 3, f: 10, fs: 0.9 }, { v: 2, f: 0, fs: 0.85 }],
  tooltip:      [{ v: 0, f: 1, fs: 0.9 }, { v: 1, f: 0, fs: 0.85 }, { v: 3, f: 10, fs: 0.9 }, { v: 4, f: 4, fs: 0.9 }],
  "sub-toggle": [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 4, fs: 0.95 }, { v: 3, f: 10, fs: 1.0 }, { v: 5, f: 13, fs: 1.05 }],
  stepper:      [{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 4, fs: 0.9 }, { v: 3, f: 10, fs: 0.95 }, { v: 4, f: 0, fs: 0.9 }],
  timeline:     [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 9, fs: 1.05 }, { v: 3, f: 3, fs: 1.0 }, { v: 4, f: 12, fs: 1.05 }],
  "cmd-palette":[{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 11, fs: 0.9 }, { v: 3, f: 10, fs: 0.95 }, { v: 4, f: 0, fs: 0.95 }],
  "feature-table": [{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 3, fs: 1.0 }, { v: 3, f: 10, fs: 0.95 }, { v: 4, f: 0, fs: 0.95 }],
  "promo-banner": [{ v: 0, f: 13, fs: 1.15 }, { v: 1, f: 5, fs: 1.1 }, { v: 3, f: 12, fs: 1.2 }, { v: 4, f: 15, fs: 1.1 }],
  rating:       [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 9, fs: 1.05 }, { v: 3, f: 0, fs: 1.0 }, { v: 4, f: 10, fs: 0.95 }],
  "cart-item":  [{ v: 0, f: 1, fs: 1.0 }, { v: 1, f: 3, fs: 0.95 }, { v: 4, f: 10, fs: 1.0 }, { v: 5, f: 0, fs: 0.95 }],
  "media-player": [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 11, fs: 0.95 }, { v: 3, f: 10, fs: 1.0 }, { v: 4, f: 9, fs: 1.05 }],
  kanban:       [{ v: 0, f: 1, fs: 0.95 }, { v: 2, f: 11, fs: 0.9 }, { v: 3, f: 10, fs: 0.95 }, { v: 4, f: 0, fs: 0.95 }],
  chat:         [{ v: 0, f: 1, fs: 1.0 }, { v: 2, f: 11, fs: 0.95 }, { v: 3, f: 10, fs: 1.0 }, { v: 4, f: 0, fs: 1.0 }],
};

/**
 * Get curated preset for a component type at a given cycle index.
 * Returns preset object or null if no presets / index past presets.
 */
export function getCuratedPreset(type, cycleIndex) {
  const presets = CURATED_COMBOS[type];
  if (!presets || cycleIndex >= presets.length) return null;
  const p = presets[cycleIndex % presets.length];
  return { variant: p.v, font: p.f, fsize: p.fs };
}

/**
 * Smart designer randomization.
 * Returns { variant, font, fsize, props } for a given component type + palette.
 * @param {string} mood - Design mood: "auto"|"minimal"|"bold"|"elegant"|"playful"
 */
export function designerRandomize(type, palette, defaults, mood = "auto", otherShapes = []) {
  const varCount = (VARIANTS[type] || []).length || 1;
  const dark = isDarkPalette(palette);
  const tags = getVariantTags(type, varCount);
  const moodCfg = MOOD_CONFIG[mood];

  const isCode = SIZE_CAT.code.has(type);
  const isLarge = SIZE_CAT.large.has(type);
  const isSmall = SIZE_CAT.small.has(type);
  const isNav = SIZE_CAT.nav.has(type);
  const sizeCat = isLarge ? "large" : isSmall ? "small" : isNav ? "nav" : isCode ? "code" : "medium";

  /* ── 0. Harmony profile from canvas context ── */
  const harmony = otherShapes.length > 0 ? _analyzeHarmony(otherShapes) : null;

  /* ── 1. Variant selection (harmony + mood-aware) ── */
  let variant;
  if (harmony && harmony.variantsByType[type]?.length && Math.random() < 0.65) {
    // Complementary: avoid the dominant variant of same-type components
    const used = harmony.variantsByType[type];
    const dominant = _mode(used);
    const candidates = [];
    for (let i = 0; i < varCount; i++) {
      if (i === dominant) continue;
      const dist = Math.abs(i - dominant);
      candidates.push({ idx: i, w: dist >= 2 ? 3 : 1 });
    }
    if (candidates.length) {
      const total = candidates.reduce((a, c) => a + c.w, 0);
      let r = Math.random() * total;
      for (const c of candidates) { r -= c.w; if (r <= 0) { variant = c.idx; break; } }
      if (variant === undefined) variant = candidates[0].idx;
    }
  }
  if (variant === undefined) {
    if (moodCfg && moodCfg.variantBias) {
      variant = moodCfg.variantBias(tags, varCount, dark);
    } else {
      const r = Math.random();
      if (dark && tags.glass !== undefined && r < 0.35) variant = tags.glass;
      else if (!dark && tags.brutal !== undefined && r < 0.2) variant = tags.brutal;
      else if (r < 0.25 && tags.gradient !== undefined) variant = tags.gradient;
      else { const sc = Math.max(1, varCount - 3); variant = Math.floor(Math.random() * sc); }
    }
  }

  /* ── 2. Font selection (harmony + mood-aware) ── */
  let font;
  if (isCode) {
    font = pick(FONT_CATS.mono);
  } else if (harmony && harmony.fonts.length >= 2 && Math.random() < 0.6) {
    // Harmonize: reuse dominant font category 60% of the time
    const dominantCat = _dominantFontCat(harmony.fonts);
    font = pick(FONT_CATS[dominantCat] || FONT_CATS.body);
  } else if (moodCfg && moodCfg.fontPool) {
    font = moodCfg.fontPool(isLarge, isSmall);
  } else if (isLarge) {
    const rr = Math.random();
    font = rr < 0.6 ? pick(FONT_CATS.display) : rr < 0.9 ? pick(FONT_CATS.serif) : pick(FONT_CATS.body);
  } else if (isNav || SIZE_CAT.input.has(type)) {
    font = pick(FONT_CATS.body);
  } else if (isSmall) {
    font = pick(FONT_CATS.body);
  } else {
    const rr = Math.random();
    font = rr < 0.7 ? pick(FONT_CATS.body) : rr < 0.9 ? pick(FONT_CATS.display) : pick(FONT_CATS.serif);
  }

  /* ── 3. Font sizing (harmony + mood-aware) ── */
  let fsize;
  if (harmony && harmony.fsizes.length >= 2 && Math.random() < 0.55) {
    // Sympathetic: stay within ±0.15 of canvas average
    const avg = harmony.avgFsize;
    const lo = Math.max(0.6, avg - 0.15);
    const hi = Math.min(1.8, avg + 0.15);
    fsize = randRange(lo, hi);
  } else if (moodCfg && moodCfg.fsizeRange) {
    fsize = moodCfg.fsizeRange(sizeCat);
  } else if (isLarge)       fsize = randRange(1.05, 1.4);
  else if (isSmall)  fsize = randRange(0.85, 1.05);
  else if (isNav)    fsize = randRange(0.9, 1.1);
  else if (isCode)   fsize = randRange(0.85, 1.1);
  else               fsize = randRange(0.9, 1.15);

  /* ── 4. Smart prop randomization ── */
  let props = {};
  if (defaults) {
    for (const [k, dv] of Object.entries(defaults)) {
      if (typeof dv === "boolean") {
        props[k] = Math.random() > 0.5;
      } else if (typeof dv === "number") {
        if (k === "pct" || k === "ring")      props[k] = 20 + Math.floor(Math.random() * 70);  // 20-89, realistic
        else if (k === "stars")               props[k] = Math.random() < 0.7 ? (4 + Math.round(Math.random())) : (2 + Math.floor(Math.random() * 3)); // trend 4-5
        else if (k === "active")              props[k] = Math.floor(Math.random() * Math.min(5, 3));
        else if (k === "highlight")           props[k] = Math.floor(Math.random() * 4);
        else if (k === "level")               props[k] = Math.floor(Math.random() * 4);
        else if (k === "qty")                 props[k] = Math.random() < 0.6 ? 1 : (2 + Math.floor(Math.random() * 3));
        else if (k === "total")               props[k] = pick([5, 8, 10, 12]);
        else if (k === "tip")                 props[k] = Math.floor(Math.random() * 3);
        else if (k === "period")              props[k] = Math.floor(Math.random() * 2);
        else if (k === "verified")            props[k] = Math.random() > 0.3 ? 1 : 0; // 70% verified
        else if (k === "shipping")            props[k] = Math.floor(Math.random() * 2);
        else if (k === "sortCol")             props[k] = -1;
        else                                  props[k] = dv; // keep default for unknown numeric
      } else if (Array.isArray(dv)) {
        if (k === "bars")                     props[k] = dv.map(() => 15 + Math.floor(Math.random() * 75));
        else if (k === "checked")             props[k] = dv.map(() => Math.random() > 0.4);
        else if (k === "open")                props[k] = dv.map((_, i) => i === 0 ? true : Math.random() > 0.7);
        else if (k === "read")                props[k] = dv.map(() => Math.random() > 0.5);
        else                                  props[k] = dv.map(() => Math.random() > 0.5);
      }
    }
    // Smart correlations
    if (type === "pricing-card" && props.featured) {
      props.period = props.period || 0; // featured usually monthly
    }
    if (type === "product-card" && props.rating !== undefined) {
      props.rating = 3 + Math.floor(Math.random() * 3); // 3-5 for products
    }
    if (type === "progress" && props.pct !== undefined && props.indeterminate) {
      props.indeterminate = false; // don't show indeterminate with a real percentage
    }
    // Apply mood-specific prop tweaks
    if (moodCfg && moodCfg.propTweak) moodCfg.propTweak(props);
  }

  /* ── 5. Design style overrides — novel CSS treatments (harmony-aware) ── */
  const dStyles = _generateDesignStyles(type, variant, palette, mood, sizeCat, dark, harmony);

  return { variant, font, fsize, props, dStyles };
}

/* ── Design Style Generator — produces CSS overrides beyond predefined variants ── */
const SHADOW_PRESETS = [
  "none",
  "0 1px 3px {s}15",                         // subtle
  "0 4px 14px {s}12",                         // soft
  "0 8px 30px {s}18",                         // elevated
  "0 2px 0 {s}20",                            // hard bottom
  "inset 0 2px 6px {s}10",                    // inset glow
  "0 0 0 1px {s}08, 0 4px 16px {s}10",       // ring + float
  "0 20px 40px -12px {s}20",                  // dramatic lift
  "4px 4px 0 {a}30",                          // brutalist offset
  "0 0 20px {a}18",                           // neon glow
  "0 1px 2px {s}08, 0 8px 24px {s}10",       // layered
];

const RADIUS_PRESETS = [0, 4, 8, 12, 16, 20, 24, 32, 999];

function _generateDesignStyles(type, variant, palette, mood, sizeCat, dark, harmony) {
  const s = {};
  const isNav = sizeCat === "nav";
  const isCode = sizeCat === "code";
  const isSmall = sizeCat === "small";
  const moodId = mood || "auto";

  // --- Border radius (harmony-aware) ---
  // If canvas has an established radius feel, lean toward it 60% of the time
  if (harmony && harmony.radii.length >= 2 && Math.random() < 0.6) {
    const avg = harmony.avgRadius;
    // Stay within ±8 of canvas average for cohesion
    const lo = Math.max(0, Math.round(avg - 8));
    const hi = Math.min(999, Math.round(avg + 8));
    s.borderRadius = lo + Math.floor(Math.random() * (Math.min(hi, 32) - lo + 1));
    // But if canvas avg is pill (>100), sometimes join it
    if (avg > 100 && Math.random() < 0.4) s.borderRadius = 999;
  } else if (moodId === "minimal") {
    s.borderRadius = pick([4, 6, 8, 10, 12]);
  } else if (moodId === "bold") {
    s.borderRadius = pick([0, 2, 4, 16, 20, 999]);
  } else if (moodId === "elegant") {
    s.borderRadius = pick([12, 14, 16, 20, 24]);
  } else if (moodId === "playful") {
    s.borderRadius = pick([16, 20, 24, 32, 999]);
  } else {
    // auto: full spectrum
    s.borderRadius = pick(RADIUS_PRESETS);
  }
  // Small components get smaller radii
  if (isSmall && s.borderRadius > 16) s.borderRadius = pick([4, 8, 10, 12, 16]);
  // Nav components stay reasonable
  if (isNav) s.borderRadius = pick([0, 4, 8, 12]);

  // --- Box shadow (harmony-aware) ---
  const acHex = palette.ac || "#888";
  const shHex = dark ? "#000" : palette.tx || "#333";
  // Lean toward canvas dominant shadow style if one exists
  if (harmony && harmony.shadowTypes.length >= 2 && Math.random() < 0.55) {
    const dom = harmony.dominantShadow;
    if (dom === "none") s.boxShadow = pick(["none", "none", SHADOW_PRESETS[1]]);
    else if (dom === "brutal") s.boxShadow = pick([SHADOW_PRESETS[4], SHADOW_PRESETS[8]]);
    else if (dom === "dramatic") s.boxShadow = pick([SHADOW_PRESETS[7], SHADOW_PRESETS[3]]);
    else s.boxShadow = pick([SHADOW_PRESETS[1], SHADOW_PRESETS[2], SHADOW_PRESETS[10]]);
  } else if (moodId === "minimal") {
    s.boxShadow = pick(["none", "none", SHADOW_PRESETS[1], SHADOW_PRESETS[2]]);
  } else if (moodId === "bold") {
    s.boxShadow = pick([SHADOW_PRESETS[4], SHADOW_PRESETS[7], SHADOW_PRESETS[8], SHADOW_PRESETS[3]]);
  } else if (moodId === "elegant") {
    s.boxShadow = pick([SHADOW_PRESETS[2], SHADOW_PRESETS[6], SHADOW_PRESETS[10], SHADOW_PRESETS[3]]);
  } else if (moodId === "playful") {
    s.boxShadow = pick([SHADOW_PRESETS[9], SHADOW_PRESETS[7], SHADOW_PRESETS[8], SHADOW_PRESETS[3], SHADOW_PRESETS[6]]);
  } else {
    s.boxShadow = pick(SHADOW_PRESETS);
  }
  // Resolve shadow color placeholders
  if (s.boxShadow !== "none") {
    s.boxShadow = s.boxShadow.replace(/\{s\}/g, shHex).replace(/\{a\}/g, acHex);
  }
  // Nav/code skip shadows
  if (isNav || isCode) s.boxShadow = "none";

  // --- Subtle rotation (playful/bold only, skip nav/code) ---
  if (!isNav && !isCode && (moodId === "playful" || (moodId === "bold" && Math.random() < 0.3))) {
    const deg = pick([-3, -2, -1.5, -1, 1, 1.5, 2, 3]);
    s.rotate = `${deg}deg`;
  }

  // --- Filter: brightness/saturation shifts ---
  if (moodId === "bold" && Math.random() < 0.4) {
    s.filter = `contrast(${randRange(1.02, 1.12).toFixed(2)})`;
  } else if (moodId === "playful" && Math.random() < 0.35) {
    s.filter = `saturate(${randRange(1.1, 1.35).toFixed(2)})`;
  } else if (moodId === "elegant" && Math.random() < 0.25) {
    s.filter = `brightness(${randRange(1.02, 1.08).toFixed(2)})`;
  }

  // --- Outline ring decoration ---
  if (Math.random() < 0.12 && !isNav && !isCode) {
    const offset = pick([2, 3, 4, 6]);
    const width = pick([1, 1.5, 2]);
    const opacity = pick(["18", "22", "30"]);
    s.outline = `${width}px solid ${acHex}${opacity}`;
    s.outlineOffset = `${offset}px`;
  }

  // --- Backdrop blur for glass-tagged variants ---
  const tags = getVariantTags(type, (VARIANTS[type] || []).length || 1);
  if (variant === tags.glass && Math.random() < 0.6) {
    s.backdropFilter = `blur(${pick([8, 12, 16, 20])}px)`;
  }

  // --- Gradient overlay (25% chance, skip nav/code/small) ---
  if (!isNav && !isCode && !isSmall && Math.random() < 0.25) {
    const ac2 = palette.ac2 || palette.ac || "#888";
    if (moodId === "bold") {
      s.gradientOverlay = pick([
        `linear-gradient(135deg, ${acHex}08 0%, transparent 60%)`,
        `linear-gradient(to bottom, ${acHex}0A 0%, transparent 40%)`,
        `linear-gradient(160deg, ${ac2}0C 0%, ${acHex}06 100%)`,
      ]);
    } else if (moodId === "elegant") {
      s.gradientOverlay = pick([
        `linear-gradient(135deg, ${acHex}06 0%, transparent 70%)`,
        `linear-gradient(to right, ${acHex}04 0%, ${ac2}04 100%)`,
        `radial-gradient(ellipse at top left, ${acHex}08 0%, transparent 60%)`,
      ]);
    } else if (moodId === "playful") {
      s.gradientOverlay = pick([
        `linear-gradient(135deg, ${acHex}0D 0%, ${ac2}0D 50%, transparent 100%)`,
        `linear-gradient(45deg, ${ac2}0A 0%, ${acHex}0A 100%)`,
        `conic-gradient(from 180deg, ${acHex}06, ${ac2}06, transparent)`,
      ]);
    } else if (moodId !== "minimal") {
      s.gradientOverlay = pick([
        `linear-gradient(135deg, ${acHex}06 0%, transparent 50%)`,
        `linear-gradient(to bottom right, ${ac2}05 0%, transparent 60%)`,
      ]);
    }
  }

  // --- Border treatment (18% chance, skip nav/code) ---
  if (!isNav && !isCode && Math.random() < 0.18) {
    if (moodId === "bold") {
      s.border = pick([
        `2px solid ${acHex}30`,
        `3px solid ${acHex}20`,
        `2px dashed ${acHex}25`,
      ]);
    } else if (moodId === "elegant") {
      s.border = pick([
        `1px solid ${acHex}15`,
        `1px solid ${palette.bd || acHex + "12"}`,
      ]);
    } else if (moodId === "playful") {
      s.border = pick([
        `2px dashed ${acHex}28`,
        `3px dotted ${acHex}20`,
        `2px solid ${acHex}35`,
      ]);
    } else if (moodId !== "minimal") {
      s.border = pick([
        `1px solid ${acHex}12`,
        `1.5px solid ${acHex}18`,
      ]);
    }
  }

  // --- Accent hue shift (15% chance — each component gets a unique color twist) ---
  if (!isCode && Math.random() < 0.15) {
    const shift = pick([-20, -15, -10, 10, 15, 20, 30, -30]);
    s.hueRotate = shift;
  }

  // --- Scale personality (10% chance, subtle) ---
  if (!isNav && !isCode && Math.random() < 0.10) {
    s.scale = pick([0.97, 0.98, 1.02, 1.03, 1.04]);
  }

  /* ── MOOD SIGNATURE EFFECTS — unique treatments per mood ── */
  if (!isNav && !isCode) {
    if (moodId === "minimal") {
      // Signature: ultra-thin top accent line + negative space emphasis
      if (Math.random() < 0.35) {
        s.borderTop = `2px solid ${acHex}20`;
        s.border = undefined; // clean, only top accent
      }
      // Muted, desaturated feel
      if (Math.random() < 0.3) {
        s.filter = `saturate(${randRange(0.85, 0.95).toFixed(2)})`;
      }
      // No gradients, no rotation, no hue shifts — strip them
      s.gradientOverlay = undefined;
      s.rotate = undefined;
      s.hueRotate = undefined;
      s.scale = undefined;
    }

    if (moodId === "bold") {
      // Signature: thick accent bottom border (grounding effect)
      if (Math.random() < 0.3 && !s.border) {
        s.borderBottom = `4px solid ${acHex}50`;
      }
      // Signature: double shadow (offset + glow) for dramatic depth
      if (Math.random() < 0.25 && s.boxShadow && s.boxShadow !== "none") {
        s.boxShadow += `, 0 0 30px ${acHex}10`;
      }
      // Bold always gets some visual weight — never "none" shadow
      if (s.boxShadow === "none") {
        s.boxShadow = `0 4px 14px ${shHex}12`;
      }
    }

    if (moodId === "elegant") {
      // Signature: subtle inner glow via inset shadow
      if (Math.random() < 0.3) {
        const inset = `inset 0 0 20px ${acHex}06`;
        s.boxShadow = s.boxShadow && s.boxShadow !== "none" ? `${s.boxShadow}, ${inset}` : inset;
      }
      // Signature: letterSpacing hint (wide, airy feel)
      if (Math.random() < 0.35) {
        s.letterSpacing = pick(["0.02em", "0.03em", "0.04em"]);
      }
      // Elegant never rotates, never has dotted/dashed borders
      s.rotate = undefined;
      if (s.border && (s.border.includes("dashed") || s.border.includes("dotted"))) {
        s.border = undefined;
      }
    }

    if (moodId === "playful") {
      // Signature: multicolor shadow (accent + accent2 offset shadows)
      const ac2 = palette.ac2 || palette.ac || "#888";
      if (Math.random() < 0.3 && !isSmall) {
        s.boxShadow = `3px 3px 0 ${acHex}25, -2px -2px 0 ${ac2}20`;
      }
      // Signature: stronger rotation — playful tilts more
      if (s.rotate) {
        const deg = pick([-4, -3, -2.5, 2.5, 3, 4, 5]);
        s.rotate = `${deg}deg`;
      } else if (Math.random() < 0.4) {
        s.rotate = `${pick([-3, -2, 2, 3])}deg`;
      }
      // Signature: higher saturation boost
      if (Math.random() < 0.4) {
        s.filter = `saturate(${randRange(1.15, 1.4).toFixed(2)})`;
      }
      // Playful gets more hue variation
      if (!s.hueRotate && Math.random() < 0.3) {
        s.hueRotate = pick([-25, -15, 15, 25, 35, -35]);
      }
    }
  }

  return s;
}

/**
 * Design quality score for a component's current style.
 * Returns 1-5 (stars). Evaluates variant-palette fit, font appropriateness,
 * fsize proportionality, and cross-component consistency.
 */
export function designScore(shape, palette, otherShapes = []) {
  let score = 3; // baseline: decent
  const { type, variant = 0, font = 0, fsize = 1 } = shape;
  const varCount = (VARIANTS[type] || []).length || 1;
  const tags = getVariantTags(type, varCount);
  const dark = isDarkPalette(palette);
  const isLarge = SIZE_CAT.large.has(type);
  const isSmall = SIZE_CAT.small.has(type);
  const isCode = SIZE_CAT.code.has(type);

  // 1. Variant-palette fit (+1/-1)
  if (dark && tags.glass !== undefined && variant === tags.glass) score += 0.5;      // glass on dark = great
  if (!dark && tags.brutal !== undefined && variant === tags.brutal) score += 0.5;   // brutal on light = great
  if (dark && tags.brutal !== undefined && variant === tags.brutal) score -= 0.4;    // brutal on dark = meh
  if (!dark && tags.glass !== undefined && variant === tags.glass) score -= 0.3;     // glass on light = weaker

  // 2. Font appropriateness (+0.5/-0.5)
  const fontCat = Object.entries(FONT_CATS).find(([, ids]) => ids.includes(font))?.[0] || "body";
  if (isLarge && (fontCat === "display" || fontCat === "serif")) score += 0.5;
  if (isLarge && fontCat === "mono") score -= 0.5;
  if (isSmall && fontCat === "body") score += 0.3;
  if (isSmall && fontCat === "display") score -= 0.3;
  if (isCode && fontCat === "mono") score += 0.5;
  if (isCode && fontCat !== "mono") score -= 0.5;

  // 3. Fsize proportionality (+0.5/-0.5)
  if (isLarge && fsize >= 1.05 && fsize <= 1.4) score += 0.4;
  else if (isLarge && (fsize < 0.85 || fsize > 1.6)) score -= 0.4;
  if (isSmall && fsize >= 0.8 && fsize <= 1.05) score += 0.3;
  else if (isSmall && fsize > 1.3) score -= 0.4;

  // 4. Cross-component consistency (+0.5/-0.5)
  if (otherShapes.length >= 2) {
    const otherFonts = otherShapes.map(s => s.font || 0);
    const otherFontCats = otherFonts.map(f => Object.entries(FONT_CATS).find(([, ids]) => ids.includes(f))?.[0] || "body");
    const dominantCat = _dominantFontCat(otherFonts);
    if (fontCat === dominantCat) score += 0.4; // matches canvas font vibe
    else score -= 0.2;

    // Variant diversity: having some variety is good, all same is boring
    const sameType = otherShapes.filter(s => s.type === type);
    if (sameType.length > 0) {
      const allSameVariant = sameType.every(s => (s.variant || 0) === variant);
      if (allSameVariant && sameType.length >= 2) score -= 0.3; // too monotonous
    }

    // 5. dStyles harmony — radius cohesion and shadow consistency
    const ds = shape.dStyles || {};
    const myRadius = ds.borderRadius ?? 14;
    const otherRadii = otherShapes.map(s => (s.dStyles || {}).borderRadius ?? 14);
    const allRadii = [myRadius, ...otherRadii];
    const radiusSpread = Math.max(...allRadii) - Math.min(...allRadii);
    if (radiusSpread <= 12) score += 0.3;           // cohesive radius palette
    else if (radiusSpread > 40) score -= 0.3;       // jarring mix (e.g., 0 + 999)

    // Shadow style clash detection
    const myShadow = ds.boxShadow || "none";
    const myShadowType = myShadow === "none" ? "none" : myShadow.includes("4px 4px") ? "brutal" : myShadow.includes("20px") || myShadow.includes("40px") ? "dramatic" : "soft";
    const otherShadowTypes = otherShapes.map(s => {
      const sh = (s.dStyles || {}).boxShadow || "none";
      return sh === "none" ? "none" : sh.includes("4px 4px") ? "brutal" : sh.includes("20px") || sh.includes("40px") ? "dramatic" : "soft";
    });
    const dominantShadow = otherShadowTypes.length ? _mode(otherShadowTypes) : "none";
    if (myShadowType === dominantShadow) score += 0.2;             // matches canvas shadow vibe
    else if ((myShadowType === "brutal" && dominantShadow === "soft") ||
             (myShadowType === "soft" && dominantShadow === "brutal")) score -= 0.3; // brutal + soft = clash
  }

  return Math.max(1, Math.min(5, Math.round(score)));
}
