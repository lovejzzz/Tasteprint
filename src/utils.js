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

/* ── Color math utilities for creative design ── */
function _hexToHsl(hex) {
  const h6 = hex.replace("#", "");
  let r = parseInt(h6.slice(0, 2), 16) / 255;
  let g = parseInt(h6.slice(2, 4), 16) / 255;
  let b = parseInt(h6.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function _hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)); l = Math.max(0, Math.min(100, l));
  const s1 = s / 100, l1 = l / 100;
  const a = s1 * Math.min(l1, 1 - l1);
  const f = n => { const k = (n + h / 30) % 12; return l1 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
}

// Derive creative colors from accent: complementary, analogous, triadic, split-complementary
function _deriveColors(acHex) {
  if (!acHex || acHex.length < 7) return { comp: acHex, analog1: acHex, analog2: acHex, triad1: acHex, triad2: acHex, split1: acHex, split2: acHex };
  const [h, s, l] = _hexToHsl(acHex);
  return {
    comp: _hslToHex(h + 180, s, l),              // complementary
    analog1: _hslToHex(h + 30, s, l),             // analogous warm
    analog2: _hslToHex(h - 30, s, l),             // analogous cool
    triad1: _hslToHex(h + 120, s, l),             // triadic 1
    triad2: _hslToHex(h + 240, s, l),             // triadic 2
    split1: _hslToHex(h + 150, s, l),             // split-complementary 1
    split2: _hslToHex(h + 210, s, l),             // split-complementary 2
    muted: _hslToHex(h, Math.max(10, s - 25), l), // desaturated variant
    vivid: _hslToHex(h, Math.min(100, s + 20), l), // saturated variant
  };
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
  const hueShifts = [];
  const hasGradient = [];
  const hasBorder = [];
  const fontCats = [];
  const hasTextTransform = [];
  for (const s of shapes) {
    const t = s.type;
    if (!variantsByType[t]) variantsByType[t] = [];
    variantsByType[t].push(s.variant || 0);
    fonts.push(s.font || 0);
    fsizes.push(s.fsize || 1);
    // Track font category
    const fc = Object.entries(FONT_CATS).find(([, ids]) => ids.includes(s.font || 0))?.[0] || "body";
    fontCats.push(fc);
    const ds = s.dStyles || {};
    radii.push(ds.borderRadius ?? 14);
    const sh = ds.boxShadow || "none";
    if (sh === "none") shadowTypes.push("none");
    else if (sh.includes("4px 4px")) shadowTypes.push("brutal");
    else if (sh.includes("20px") || sh.includes("40px")) shadowTypes.push("dramatic");
    else if (sh.includes("inset")) shadowTypes.push("inset");
    else shadowTypes.push("soft");
    if (ds.hueRotate) hueShifts.push(ds.hueRotate);
    hasGradient.push(!!ds.gradientOverlay);
    hasBorder.push(!!(ds.border || ds.borderTop || ds.borderBottom));
    hasTextTransform.push(!!ds.textTransform);
  }
  const avgFsize = fsizes.length ? fsizes.reduce((a, b) => a + b, 0) / fsizes.length : 1;
  const avgRadius = radii.length ? radii.reduce((a, b) => a + b, 0) / radii.length : 14;
  const dominantShadow = shadowTypes.length ? _mode(shadowTypes) : "none";
  const dominantFontCat = fontCats.length ? _mode(fontCats) : "body";
  const avgHueShift = hueShifts.length ? Math.round(hueShifts.reduce((a, b) => a + b, 0) / hueShifts.length) : 0;
  const gradientRate = hasGradient.length ? hasGradient.filter(Boolean).length / hasGradient.length : 0;
  const borderRate = hasBorder.length ? hasBorder.filter(Boolean).length / hasBorder.length : 0;
  const textTransformRate = hasTextTransform.length ? hasTextTransform.filter(Boolean).length / hasTextTransform.length : 0;
  return { variantsByType, fonts, fsizes, avgFsize, radii, avgRadius, shadowTypes, dominantShadow, fontCats, dominantFontCat, avgHueShift, gradientRate, borderRate, textTransformRate };
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
 * Generate a Design DNA — a shared style genome for an entire canvas randomization.
 * Call once per "randomize all" operation, then pass to each designerRandomize call.
 * Ensures all components share a cohesive aesthetic instead of each rolling independently.
 */
export function generateDesignDNA(palette, mood) {
  const dark = isDarkPalette(palette);
  const acHex = palette.ac || "#888";
  const ac2 = palette.ac2 || palette.ac || "#888";
  const m = mood || "auto";

  const RADIUS_FAMILIES = {
    sharp: { base: pick([0, 2, 4]), range: 4 },
    soft: { base: pick([8, 10, 12]), range: 6 },
    round: { base: pick([16, 20, 24]), range: 8 },
    pill: { base: 999, range: 0 },
    mixed: { base: pick([8, 12, 16]), range: 20 },
  };

  let radiusFamily, shadowFamily, borderStyle, hueDirection, gradientStyle;

  if (m === "minimal") {
    radiusFamily = pick(["sharp", "soft", "soft"]);
    shadowFamily = pick(["none", "none", "subtle", "subtle"]);
    borderStyle = Math.random() < 0.4 ? pick(["thin", "accent-top"]) : "none";
    hueDirection = 0; // minimal = no hue shifts
    gradientStyle = "none"; // minimal = no gradients
  } else if (m === "bold") {
    radiusFamily = pick(["sharp", "sharp", "round", "mixed"]);
    shadowFamily = pick(["dramatic", "brutal", "brutal", "elevated"]);
    borderStyle = Math.random() < 0.5 ? pick(["accent-bottom", "accent-top", "dashed"]) : "none";
    hueDirection = Math.random() < 0.4 ? pick([-15, -10, 10, 15]) : 0;
    gradientStyle = Math.random() < 0.45 ? pick(["diagonal", "diagonal", "radial"]) : "none";
  } else if (m === "elegant") {
    radiusFamily = pick(["soft", "round", "round"]);
    shadowFamily = pick(["subtle", "elevated", "elevated", "glow"]);
    borderStyle = Math.random() < 0.3 ? "thin" : "none";
    hueDirection = Math.random() < 0.25 ? pick([-10, -5, 5, 10]) : 0;
    gradientStyle = Math.random() < 0.5 ? pick(["diagonal", "radial", "radial"]) : "none";
  } else if (m === "playful") {
    radiusFamily = pick(["round", "pill", "pill", "mixed"]);
    shadowFamily = pick(["elevated", "glow", "brutal", "dramatic"]);
    borderStyle = Math.random() < 0.4 ? pick(["dashed", "accent-bottom", "accent-top"]) : "none";
    hueDirection = Math.random() < 0.5 ? pick([-20, -15, 15, 20, 25]) : 0;
    gradientStyle = Math.random() < 0.55 ? pick(["diagonal", "conic", "radial"]) : "none";
  } else {
    // auto: full random spectrum
    radiusFamily = pick(["sharp", "soft", "round", "pill", "mixed"]);
    shadowFamily = pick(["none", "subtle", "elevated", "dramatic", "brutal", "glow"]);
    borderStyle = Math.random() < 0.35 ? pick(["thin", "accent-top", "accent-bottom", "dashed"]) : "none";
    hueDirection = Math.random() < 0.3 ? pick([-15, -10, 10, 15, 20]) : 0;
    gradientStyle = Math.random() < 0.3 ? pick(["diagonal", "radial", "conic"]) : "none";
  }

  // Font pairing strategy — pick a heading category + body category for canvas cohesion
  let headingFontCat, bodyFontCat;
  if (m === "minimal") {
    headingFontCat = pick(["body", "body", "serif"]);
    bodyFontCat = "body";
  } else if (m === "bold") {
    headingFontCat = pick(["display", "display", "serif"]);
    bodyFontCat = pick(["body", "body", "display"]);
  } else if (m === "elegant") {
    headingFontCat = pick(["serif", "serif", "display"]);
    bodyFontCat = pick(["body", "serif"]);
  } else if (m === "playful") {
    headingFontCat = pick(["display", "display", "serif", "body"]);
    bodyFontCat = pick(["body", "display"]);
  } else {
    headingFontCat = pick(["display", "serif", "body"]);
    bodyFontCat = pick(["body", "body", "serif"]);
  }
  // Pre-pick specific fonts from categories for consistency
  const headingFont = pick(FONT_CATS[headingFontCat] || FONT_CATS.body);
  const bodyFont = pick(FONT_CATS[bodyFontCat] || FONT_CATS.body);

  // Color scheme: pre-select a derived color strategy for canvas-wide coherence
  // Instead of each component computing its own _deriveColors independently,
  // DNA picks a "color scheme" that defines which derived relationships to favor
  const allDerived = _deriveColors(acHex);
  let colorScheme, gradColor1, gradColor2, glowColor;
  if (m === "minimal") {
    colorScheme = "muted";
    gradColor1 = allDerived.muted;
    gradColor2 = ac2;
    glowColor = allDerived.muted;
  } else if (m === "bold") {
    colorScheme = pick(["complementary", "triadic", "split"]);
    if (colorScheme === "complementary") { gradColor1 = allDerived.comp; gradColor2 = allDerived.vivid; glowColor = allDerived.comp; }
    else if (colorScheme === "triadic") { gradColor1 = allDerived.triad1; gradColor2 = allDerived.triad2; glowColor = allDerived.vivid; }
    else { gradColor1 = allDerived.split1; gradColor2 = allDerived.split2; glowColor = allDerived.vivid; }
  } else if (m === "elegant") {
    colorScheme = pick(["analogous", "muted"]);
    gradColor1 = allDerived.analog1;
    gradColor2 = colorScheme === "muted" ? allDerived.muted : allDerived.analog2;
    glowColor = allDerived.muted;
  } else if (m === "playful") {
    colorScheme = pick(["triadic", "split", "complementary"]);
    if (colorScheme === "triadic") { gradColor1 = allDerived.triad1; gradColor2 = allDerived.triad2; glowColor = allDerived.vivid; }
    else if (colorScheme === "split") { gradColor1 = allDerived.split1; gradColor2 = allDerived.split2; glowColor = allDerived.comp; }
    else { gradColor1 = allDerived.comp; gradColor2 = allDerived.vivid; glowColor = allDerived.triad1; }
  } else {
    // auto: random scheme for variety
    colorScheme = pick(["analogous", "complementary", "triadic", "split", "muted"]);
    const schemes = {
      analogous: [allDerived.analog1, allDerived.analog2, allDerived.muted],
      complementary: [allDerived.comp, allDerived.vivid, allDerived.comp],
      triadic: [allDerived.triad1, allDerived.triad2, allDerived.vivid],
      split: [allDerived.split1, allDerived.split2, allDerived.vivid],
      muted: [allDerived.muted, allDerived.analog1, allDerived.muted],
    };
    [gradColor1, gradColor2, glowColor] = schemes[colorScheme];
  }

  // Typography rhythm: canvas-wide letter/word spacing + weight personality
  let typoRhythm;
  if (m === "minimal") {
    typoRhythm = pick([
      { spacing: "wide", ls: "0.02em", ws: "0.01em", weight: "light" },
      { spacing: "airy", ls: "0.03em", ws: "0.02em", weight: "light" },
      { spacing: "clean", ls: "0.01em", ws: "normal", weight: "normal" },
    ]);
  } else if (m === "bold") {
    typoRhythm = pick([
      { spacing: "tight", ls: "-0.01em", ws: "normal", weight: "heavy" },
      { spacing: "condensed", ls: "-0.02em", ws: "-0.01em", weight: "heavy" },
      { spacing: "punchy", ls: "0.04em", ws: "normal", weight: "heavy" },
      { spacing: "wide-heavy", ls: "0.06em", ws: "0.02em", weight: "heavy" },
    ]);
  } else if (m === "elegant") {
    typoRhythm = pick([
      { spacing: "luxe", ls: "0.04em", ws: "0.02em", weight: "light" },
      { spacing: "editorial", ls: "0.03em", ws: "0.01em", weight: "normal" },
      { spacing: "refined", ls: "0.05em", ws: "0.03em", weight: "light" },
    ]);
  } else if (m === "playful") {
    typoRhythm = pick([
      { spacing: "bouncy", ls: "0.01em", ws: "0.03em", weight: "mixed" },
      { spacing: "loose", ls: "0.02em", ws: "0.04em", weight: "mixed" },
      { spacing: "tight-fun", ls: "-0.01em", ws: "normal", weight: "heavy" },
    ]);
  } else {
    // auto: random across full spectrum
    typoRhythm = pick([
      { spacing: "tight", ls: "-0.01em", ws: "normal", weight: "heavy" },
      { spacing: "normal", ls: "normal", ws: "normal", weight: "normal" },
      { spacing: "wide", ls: "0.03em", ws: "0.01em", weight: "light" },
      { spacing: "editorial", ls: "0.04em", ws: "0.02em", weight: "normal" },
      { spacing: "condensed", ls: "-0.02em", ws: "-0.01em", weight: "heavy" },
      { spacing: "luxe", ls: "0.05em", ws: "0.03em", weight: "light" },
    ]);
  }

  // Gradient direction: canvas-wide angle so all gradients flow cohesively
  const gradientAngle = gradientStyle !== "none" ? pick([120, 135, 145, 160, 180, 200, 225]) : 135;
  // Radial gradient origin for canvas cohesion
  const gradientOrigin = gradientStyle === "radial" ? pick(["top left", "30% 20%", "70% 30%", "bottom right", "50% 20%"]) : "top left";

  // Effect personality: canvas-wide decisions for newer CSS dimensions
  // These ensure text-stroke, clip-path, transitions, and opacity feel cohesive
  let effectPersonality;
  if (m === "minimal") {
    effectPersonality = { textStroke: "none", clipStyle: "none", motionSpeed: "calm", depthLayer: "flat", surfaceTexture: "none" };
  } else if (m === "bold") {
    effectPersonality = {
      textStroke: pick(["thick", "thick", "hollow", "none"]),
      clipStyle: pick(["chamfer", "chamfer", "asymmetric", "none"]),
      motionSpeed: pick(["snappy", "snappy", "instant"]),
      depthLayer: pick(["layered", "heavy", "layered"]),
      surfaceTexture: pick(["stripes", "grid", "stripes", "none"]),
    };
  } else if (m === "elegant") {
    effectPersonality = {
      textStroke: pick(["hairline", "hairline", "none"]),
      clipStyle: pick(["subtle", "none", "none"]),
      motionSpeed: pick(["slow", "slow", "calm"]),
      depthLayer: pick(["soft", "soft", "subtle"]),
      surfaceTexture: pick(["pinstripe", "crosshatch", "none", "none"]),
    };
  } else if (m === "playful") {
    effectPersonality = {
      textStroke: pick(["colorful", "hollow", "none"]),
      clipStyle: pick(["notch", "flag", "none", "none"]),
      motionSpeed: pick(["bouncy", "bouncy", "snappy"]),
      depthLayer: pick(["layered", "soft", "vivid"]),
      surfaceTexture: pick(["dots", "zigzag", "dots", "none"]),
    };
  } else {
    effectPersonality = {
      textStroke: pick(["none", "none", "thick", "hairline", "hollow", "colorful"]),
      clipStyle: pick(["none", "none", "none", "chamfer", "subtle", "notch"]),
      motionSpeed: pick(["calm", "snappy", "slow", "bouncy"]),
      depthLayer: pick(["flat", "soft", "layered", "heavy"]),
      surfaceTexture: pick(["none", "none", "stripes", "dots", "pinstripe", "grid"]),
    };
  }

  // Color temperature: warm/cool/neutral bias that tints all shadows and glows
  // Creates a unified atmospheric feel across the entire canvas
  let colorTemperature;
  if (m === "minimal") {
    colorTemperature = pick(["neutral", "neutral", "cool"]);
  } else if (m === "bold") {
    colorTemperature = pick(["warm", "warm", "cool", "neutral"]);
  } else if (m === "elegant") {
    colorTemperature = pick(["cool", "cool", "warm", "neutral"]);
  } else if (m === "playful") {
    colorTemperature = pick(["warm", "warm", "neutral"]);
  } else {
    colorTemperature = pick(["warm", "cool", "neutral", "neutral"]);
  }

  return { radiusFamily, radiusMap: RADIUS_FAMILIES[radiusFamily], shadowFamily, borderStyle, hueDirection, gradientStyle, dark, acHex, ac2, headingFont, bodyFont, headingFontCat, bodyFontCat, colorScheme, gradColor1, gradColor2, glowColor, typoRhythm, gradientAngle, gradientOrigin, effectPersonality, colorTemperature };
}

/**
 * Smart designer randomization.
 * Returns { variant, font, fsize, props, dStyles } for a given component type + palette.
 * @param {string} mood - Design mood: "auto"|"minimal"|"bold"|"elegant"|"playful"
 * @param {object} dna - Optional Design DNA from generateDesignDNA for cohesive canvas
 */
export function designerRandomize(type, palette, defaults, mood = "auto", otherShapes = [], dna = null) {
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

  /* ── 2. Font selection (DNA > harmony > mood-aware) ── */
  let font;
  if (isCode) {
    font = pick(FONT_CATS.mono);
  } else if (dna && Math.random() < 0.75) {
    // DNA font pairing: heading components get heading font, others get body font
    // with slight variation (15% chance to swap) for natural variety
    if (isLarge) {
      font = Math.random() < 0.85 ? dna.headingFont : dna.bodyFont;
    } else if (isSmall || isNav || SIZE_CAT.input.has(type)) {
      font = dna.bodyFont;
    } else {
      font = Math.random() < 0.7 ? dna.bodyFont : dna.headingFont;
    }
  } else if (harmony && harmony.fonts.length >= 2 && Math.random() < 0.6) {
    // Harmonize: reuse dominant font category 60% of the time
    const dominantCat = harmony.dominantFontCat || _dominantFontCat(harmony.fonts);
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

  /* ── 5. Design style overrides — novel CSS treatments (harmony + DNA aware) ── */
  const dStyles = _generateDesignStyles(type, variant, palette, mood, sizeCat, dark, harmony, dna);

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

function _generateDesignStyles(type, variant, palette, mood, sizeCat, dark, harmony, dna) {
  const s = {};
  const isNav = sizeCat === "nav";
  const isCode = sizeCat === "code";
  const isSmall = sizeCat === "small";
  // Auto mode: pick a random sub-personality so each component gets a coherent micro-style
  // instead of bland average-of-everything
  let moodId = mood || "auto";
  if (moodId === "auto") {
    // 40% chance to adopt a random mood's personality for this component
    // 60% stays true auto (full spectrum) for variety
    if (Math.random() < 0.4) {
      moodId = pick(["minimal", "bold", "elegant", "playful"]);
    }
  }

  // --- Border radius (DNA > harmony > mood) ---
  // DNA takes priority for cohesive canvas-wide randomization
  if (dna && Math.random() < 0.8) {
    const { base, range } = dna.radiusMap;
    if (base === 999) s.borderRadius = 999;
    else s.borderRadius = Math.max(0, base + Math.floor(Math.random() * range * 2) - range);
  } else if (harmony && harmony.radii.length >= 2 && Math.random() < 0.6) {
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
    // auto: weighted spectrum — favor interesting values over boring midrange
    const r = Math.random();
    if (r < 0.15) s.borderRadius = 0;          // sharp
    else if (r < 0.25) s.borderRadius = pick([2, 4]); // nearly sharp
    else if (r < 0.50) s.borderRadius = pick([8, 12, 14, 16]); // standard
    else if (r < 0.70) s.borderRadius = pick([20, 24, 32]); // rounded
    else s.borderRadius = 999;                  // pill
  }
  // Small components get smaller radii
  if (isSmall && s.borderRadius > 16) s.borderRadius = pick([4, 8, 10, 12, 16]);
  // Nav components stay reasonable
  if (isNav) s.borderRadius = pick([0, 4, 8, 12]);

  // --- Organic border-radius: per-corner asymmetry + elliptical blobs ---
  // Upgrades simple numeric radius to complex CSS border-radius for organic shapes
  if (!isNav && !isCode && !isSmall && s.borderRadius !== 999 && s.borderRadius > 4) {
    const orgRoll = Math.random();
    const br = s.borderRadius;
    if (moodId === "playful" && orgRoll < 0.25) {
      // Playful: blob-like asymmetric corners — each corner different
      const corners = Array.from({ length: 4 }, () => br + pick([-8, -4, 0, 4, 8, 12, 16]));
      const clamped = corners.map(c => Math.max(4, Math.min(48, c)));
      s.borderRadius = `${clamped[0]}px ${clamped[1]}px ${clamped[2]}px ${clamped[3]}px`;
    } else if (moodId === "playful" && orgRoll < 0.35) {
      // Playful: elliptical blob — organic amoeba-like shapes
      const h = Array.from({ length: 4 }, () => pick([30, 40, 50, 60, 70, 80]) + "%");
      const v = Array.from({ length: 4 }, () => pick([30, 40, 50, 60, 70, 80]) + "%");
      s.borderRadius = `${h.join(" ")} / ${v.join(" ")}`;
    } else if (moodId === "elegant" && orgRoll < 0.18) {
      // Elegant: softly asymmetric — one corner more open, creates visual flow
      const base = br;
      const accent = Math.min(base + pick([8, 12, 16]), 40);
      s.borderRadius = pick([
        `${accent}px ${base}px ${accent}px ${base}px`,
        `${base}px ${accent}px ${base}px ${accent}px`,
        `${accent}px ${base}px ${base}px ${accent}px`,
      ]);
    } else if (moodId === "bold" && orgRoll < 0.15) {
      // Bold: sharp-round contrast — dramatic zero + large on alternating corners
      s.borderRadius = pick([
        `0 ${br * 2}px 0 ${br * 2}px`,
        `${br * 2}px 0 ${br * 2}px 0`,
        `0 0 ${br * 3}px 0`,
        `${br * 3}px 0 0 0`,
      ]);
    } else if (moodId === "minimal" && orgRoll < 0.08) {
      // Minimal: barely-there asymmetry — subtle difference between corners
      const slight = br + pick([2, 3, 4]);
      s.borderRadius = `${br}px ${slight}px ${br}px ${slight}px`;
    }
  }

  // --- Derived color palette for creative gradients/shadows ---
  // DNA pre-selected scheme for canvas coherence; fallback to per-component derived
  const acHex = palette.ac || "#888";
  const shHex = dark ? "#000" : palette.tx || "#333";
  const dc = _deriveColors(acHex);
  // DNA gradient/glow colors override local derived for canvas-wide consistency
  const gc1 = (dna && dna.gradColor1) || dc.analog1;
  const gc2 = (dna && dna.gradColor2) || dc.analog2;
  const gcGlow = (dna && dna.glowColor) || dc.vivid;

  // --- Box shadow (DNA > harmony > mood) ---
  // DNA takes priority for cohesive canvas
  if (dna && Math.random() < 0.75) {
    const sf = dna.shadowFamily;
    if (sf === "none") s.boxShadow = "none";
    else if (sf === "subtle") s.boxShadow = pick([SHADOW_PRESETS[1], SHADOW_PRESETS[2]]);
    else if (sf === "elevated") s.boxShadow = pick([SHADOW_PRESETS[3], SHADOW_PRESETS[6], SHADOW_PRESETS[10]]);
    else if (sf === "dramatic") s.boxShadow = pick([SHADOW_PRESETS[7], SHADOW_PRESETS[3]]);
    else if (sf === "brutal") s.boxShadow = pick([SHADOW_PRESETS[4], SHADOW_PRESETS[8]]);
    else if (sf === "glow") s.boxShadow = pick([SHADOW_PRESETS[9], `0 0 20px ${acHex}18`]);
    else s.boxShadow = pick(SHADOW_PRESETS);
  } else if (harmony && harmony.shadowTypes.length >= 2 && Math.random() < 0.55) {
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
    // auto: favor interesting shadows over "none"
    const r = Math.random();
    if (r < 0.15) s.boxShadow = "none";
    else if (r < 0.35) s.boxShadow = pick([SHADOW_PRESETS[1], SHADOW_PRESETS[2]]); // subtle/soft
    else if (r < 0.55) s.boxShadow = pick([SHADOW_PRESETS[3], SHADOW_PRESETS[6], SHADOW_PRESETS[10]]); // elevated/layered
    else if (r < 0.75) s.boxShadow = pick([SHADOW_PRESETS[7], SHADOW_PRESETS[9]]); // dramatic/glow
    else s.boxShadow = pick([SHADOW_PRESETS[4], SHADOW_PRESETS[5], SHADOW_PRESETS[8]]); // hard/inset/brutal
  }
  // Resolve shadow color placeholders — use derived colors for creative colored shadows
  if (s.boxShadow !== "none") {
    // Mood-driven colored shadows: replace {s} with palette-derived tints instead of pure dark
    let shadowColor = shHex;
    if (moodId === "elegant" && Math.random() < 0.55) {
      // Elegant: muted accent-tinted shadows for warmth
      shadowColor = dc.muted;
    } else if (moodId === "playful" && Math.random() < 0.45) {
      // Playful: vivid colored shadows
      shadowColor = pick([dc.analog1, dc.vivid, gc1]);
    } else if (moodId === "bold" && Math.random() < 0.35) {
      // Bold: complementary shadow for dramatic contrast
      shadowColor = pick([dc.comp, dc.split1, gcGlow]);
    }
    s.boxShadow = s.boxShadow.replace(/\{s\}/g, shadowColor).replace(/\{a\}/g, acHex);
  }
  // Creative multi-layer shadow stacking: combine base shadow with accent/glow layers
  // Creates hand-designed feel: elevation + color accent + ambient glow
  // Two tiers: standard stacking (~20%) adds 1 layer, deep composition (~10%) adds 3-5 layers
  if (s.boxShadow && s.boxShadow !== "none" && !isSmall) {
    const stackRoll = Math.random();
    const stackLayers = [];

    if (stackRoll < 0.10) {
      // === Deep composition: 3-5 layer shadow recipes (mood-exclusive) ===
      if (moodId === "bold") {
        // "Retro extrude": hard-offset color stack like 3D letterpress
        const dir = pick([1, -1]);
        const c = pick([gc1, gcGlow, dc.comp]);
        stackLayers.push(
          `${dir * 1}px 1px 0 ${c}30`,
          `${dir * 2}px 2px 0 ${c}22`,
          `${dir * 3}px 3px 0 ${c}16`,
          `${dir * 4}px 4px 0 ${c}0C`,
          `${dir * 6}px 8px 16px ${shHex}12`,
        );
      } else if (moodId === "elegant") {
        // "Ambient halo": graduated concentric glow rings
        const glowC = pick([dc.muted, gc1, dc.analog1]);
        stackLayers.push(
          `0 0 4px ${glowC}08`,
          `0 0 12px ${glowC}06`,
          `0 0 24px ${glowC}04`,
          `0 2px 8px ${shHex}06`,
        );
      } else if (moodId === "playful") {
        // "Confetti scatter": colored shadows in different directions
        const colors = [gc1, gc2, gcGlow, acHex];
        stackLayers.push(
          `${pick([-4, -3, 3, 4])}px ${pick([-3, -2, 2, 3])}px 0 ${pick(colors)}20`,
          `${pick([-2, 2, 5, -5])}px ${pick([3, 4, -3, -4])}px 0 ${pick(colors)}18`,
          `${pick([-1, 1, 3, -3])}px ${pick([-2, 2, 5])}px 0 ${pick(colors)}14`,
          `0 0 ${pick([12, 18])}px ${pick(colors)}0C`,
        );
      } else if (moodId === "minimal") {
        // "Whisper depth": barely-there layered directional light
        stackLayers.push(
          `0 1px 2px ${shHex}04`,
          `0 2px 6px ${shHex}03`,
          `0 0 1px ${acHex}06`,
        );
      } else {
        // Auto: random mood recipe
        const autoStyle = pick(["retro", "halo", "scatter"]);
        if (autoStyle === "retro") {
          const c = pick([gc1, gcGlow]);
          stackLayers.push(`2px 2px 0 ${c}22`, `4px 4px 0 ${c}14`, `6px 6px 12px ${shHex}10`);
        } else if (autoStyle === "halo") {
          stackLayers.push(`0 0 8px ${gc1}08`, `0 0 20px ${gc1}04`, `0 2px 8px ${shHex}08`);
        } else {
          stackLayers.push(`3px 2px 0 ${gc1}18`, `-2px 3px 0 ${gc2}14`, `0 0 12px ${gcGlow}0A`);
        }
      }
    } else if (stackRoll < 0.15) {
      // === Chromatic fan: prismatic color dispersion — light-through-a-prism effect ===
      // 3-5 shadows fan out in different directions, each a different palette color
      const fanColors = [gc1, gc2, gcGlow, dc.comp || acHex, dc.vivid || gc1];
      const fanCount = pick([3, 4, 5]);
      const fanSpread = moodId === "bold" ? pick([5, 6, 8]) : moodId === "playful" ? pick([4, 5, 6]) : pick([3, 4, 5]);
      const fanBlur = moodId === "elegant" ? pick([8, 12, 16]) : moodId === "minimal" ? pick([4, 6]) : pick([4, 8, 12]);
      const baseAngle = Math.random() * 360;
      const angleStep = 360 / fanCount;

      for (let i = 0; i < fanCount; i++) {
        const angle = ((baseAngle + angleStep * i) * Math.PI) / 180;
        const dx = Math.round(Math.cos(angle) * fanSpread);
        const dy = Math.round(Math.sin(angle) * fanSpread);
        const color = fanColors[i % fanColors.length];
        const opacity = moodId === "minimal" ? "08" : moodId === "elegant" ? "0C" : pick(["12", "15", "18"]);
        stackLayers.push(`${dx}px ${dy}px ${fanBlur}px ${color}${opacity}`);
      }
      // Add a soft base shadow for grounding
      stackLayers.push(`0 2px 8px ${shHex}06`);
    } else if (stackRoll < 0.30) {
      // === Standard stacking: 1 accent layer ===
      if (moodId === "bold" || moodId === "auto") {
        stackLayers.push(pick([
          `${pick([-3, -2, 2, 3])}px ${pick([3, 4, 5])}px 0 ${gc1}18`,
          `0 ${pick([2, 3])}px ${pick([8, 12])}px ${gcGlow}12`,
          `inset 0 -2px ${pick([6, 10])}px ${gc1}08`,
        ]));
      } else if (moodId === "elegant") {
        stackLayers.push(pick([
          `inset 0 0 ${pick([12, 18, 24])}px ${dc.muted}06`,
          `0 0 ${pick([20, 30])}px ${gc1}08`,
          `0 ${pick([1, 2])}px ${pick([4, 6])}px ${dc.analog1}0A`,
        ]));
      } else if (moodId === "playful") {
        stackLayers.push(pick([
          `${pick([2, 3, 4])}px ${pick([2, 3, 4])}px 0 ${gc1}20`,
          `${pick([-2, -3])}px ${pick([-2, -3])}px 0 ${gc2}18`,
          `0 0 ${pick([15, 25])}px ${gcGlow}15`,
        ]));
      } else if (moodId === "minimal") {
        stackLayers.push(`0 1px 0 ${acHex}08`);
      }
    }
    if (stackLayers.length > 0) {
      s.boxShadow = s.boxShadow + ", " + stackLayers.join(", ");
    }
  }

  // Nav/code skip shadows
  if (isNav || isCode) s.boxShadow = "none";

  // --- Subtle rotation (playful/bold only, skip nav/code) ---
  if (!isNav && !isCode && (moodId === "playful" || (moodId === "bold" && Math.random() < 0.3))) {
    const deg = pick([-3, -2, -1.5, -1, 1, 1.5, 2, 3]);
    s.rotate = `${deg}deg`;
  }

  // --- Compound filter recipes (mood-signature visual treatments) ---
  // Combines 2-3 CSS filters for distinctive looks — like Instagram filters per mood
  if (moodId === "bold" && Math.random() < 0.40) {
    s.filter = pick([
      `contrast(${randRange(1.04, 1.12).toFixed(2)})`,
      `contrast(${randRange(1.05, 1.10).toFixed(2)}) saturate(${randRange(1.05, 1.15).toFixed(2)})`,
      `contrast(${randRange(1.06, 1.14).toFixed(2)}) brightness(${randRange(0.97, 1.02).toFixed(2)})`,
      // "Punchy": high contrast + slight desaturation = editorial magazine look
      `contrast(${randRange(1.08, 1.15).toFixed(2)}) saturate(${randRange(0.88, 0.95).toFixed(2)})`,
      // "Gritty": micro grayscale + heavy contrast = raw industrial feel
      `grayscale(${randRange(0.05, 0.15).toFixed(2)}) contrast(${randRange(1.10, 1.20).toFixed(2)})`,
      // "Ink wash": desaturated + dark = printed poster vibe
      `grayscale(${randRange(0.10, 0.25).toFixed(2)}) contrast(${randRange(1.06, 1.14).toFixed(2)}) brightness(${randRange(0.95, 1.0).toFixed(2)})`,
    ]);
  } else if (moodId === "playful" && Math.random() < 0.35) {
    s.filter = pick([
      `saturate(${randRange(1.1, 1.35).toFixed(2)})`,
      `saturate(${randRange(1.15, 1.30).toFixed(2)}) brightness(${randRange(1.02, 1.06).toFixed(2)})`,
      // "Candy": vivid + warm brightness = bubbly pop feel
      `saturate(${randRange(1.20, 1.40).toFixed(2)}) contrast(${randRange(0.95, 1.02).toFixed(2)}) brightness(${randRange(1.03, 1.07).toFixed(2)})`,
      // "Dreamy": slight blur look via low contrast + high saturation
      `saturate(${randRange(1.15, 1.25).toFixed(2)}) contrast(${randRange(0.92, 0.98).toFixed(2)})`,
      // "Warm glow": sepia tint + high saturation = nostalgic warmth
      `sepia(${randRange(0.05, 0.12).toFixed(2)}) saturate(${randRange(1.15, 1.35).toFixed(2)}) brightness(${randRange(1.02, 1.06).toFixed(2)})`,
      // "Pop art": cranked saturation + slight hue rotation for unexpected color
      `saturate(${randRange(1.30, 1.50).toFixed(2)}) hue-rotate(${pick([5, 10, -5, -10, 15])}deg)`,
    ]);
  } else if (moodId === "elegant" && Math.random() < 0.30) {
    s.filter = pick([
      `brightness(${randRange(1.02, 1.08).toFixed(2)})`,
      // "Porcelain": bright + slightly desaturated = refined luxury
      `brightness(${randRange(1.03, 1.07).toFixed(2)}) saturate(${randRange(0.85, 0.95).toFixed(2)})`,
      // "Warm tone": subtle brightness + micro contrast for depth
      `brightness(${randRange(1.02, 1.05).toFixed(2)}) contrast(${randRange(1.01, 1.04).toFixed(2)})`,
      // "Matte": reduced saturation + slight brightness = editorial elegance
      `saturate(${randRange(0.82, 0.92).toFixed(2)}) brightness(${randRange(1.04, 1.08).toFixed(2)})`,
      // "Vintage silk": sepia wash + brightness = aged luxury fabric feel
      `sepia(${randRange(0.03, 0.08).toFixed(2)}) brightness(${randRange(1.04, 1.08).toFixed(2)}) saturate(${randRange(0.88, 0.96).toFixed(2)})`,
      // "Studio": grayscale hint + warmth = high-fashion photography
      `grayscale(${randRange(0.08, 0.20).toFixed(2)}) brightness(${randRange(1.03, 1.07).toFixed(2)}) contrast(${randRange(1.02, 1.06).toFixed(2)})`,
    ]);
  } else if (moodId === "minimal" && Math.random() < 0.20) {
    s.filter = pick([
      // "Clean": very subtle desaturation for airy neutrality
      `saturate(${randRange(0.88, 0.96).toFixed(2)})`,
      // "Paper": bright + desaturated = paper-like flatness
      `saturate(${randRange(0.85, 0.93).toFixed(2)}) brightness(${randRange(1.02, 1.05).toFixed(2)})`,
      // "Newsprint": grayscale wash for ultra-minimal monochrome-adjacent feel
      `grayscale(${randRange(0.15, 0.35).toFixed(2)}) brightness(${randRange(1.02, 1.06).toFixed(2)})`,
      // "Fog": heavy desaturation + brightness = faded, ethereal
      `saturate(${randRange(0.70, 0.82).toFixed(2)}) brightness(${randRange(1.05, 1.10).toFixed(2)}) contrast(${randRange(0.96, 1.0).toFixed(2)})`,
    ]);
  } else if (moodId === "auto" && Math.random() < 0.15) {
    // Auto: occasionally gets a random compound filter for surprise
    s.filter = pick([
      `contrast(${randRange(1.03, 1.10).toFixed(2)}) saturate(${randRange(1.05, 1.20).toFixed(2)})`,
      `brightness(${randRange(1.02, 1.06).toFixed(2)}) saturate(${randRange(0.90, 1.10).toFixed(2)})`,
      `contrast(${randRange(1.02, 1.08).toFixed(2)}) brightness(${randRange(0.98, 1.04).toFixed(2)})`,
      // Auto wildcards: any mood-specific recipe at lower intensity
      `sepia(${randRange(0.02, 0.08).toFixed(2)}) saturate(${randRange(1.0, 1.15).toFixed(2)})`,
      `grayscale(${randRange(0.05, 0.20).toFixed(2)}) contrast(${randRange(1.02, 1.10).toFixed(2)})`,
    ]);
  }

  // --- Outline decoration (mood-driven variety) ---
  if (!isNav && !isCode) {
    const outlineChance = moodId === "bold" ? 0.18 : moodId === "playful" ? 0.16 : moodId === "elegant" ? 0.10 : 0.12;
    if (Math.random() < outlineChance) {
      const offset = pick([2, 3, 4, 6]);
      if (moodId === "bold") {
        // Bold: thick accent outlines, sometimes dashed
        s.outline = pick([
          `${pick([2, 2.5, 3])}px solid ${pick([acHex, gc1, gcGlow])}${pick(["25", "30", "40"])}`,
          `${pick([2, 3])}px dashed ${acHex}${pick(["20", "28"])}`,
        ]);
        s.outlineOffset = `${pick([3, 4, 5, 6])}px`;
      } else if (moodId === "playful") {
        // Playful: colorful double-ring or dotted outlines
        s.outline = pick([
          `${pick([1.5, 2])}px dotted ${pick([gc1, gc2, gcGlow])}${pick(["22", "30"])}`,
          `${pick([2, 2.5])}px dashed ${pick([gc1, gcGlow])}${pick(["25", "35"])}`,
          `${pick([1.5, 2])}px solid ${gc1}28`,
        ]);
        s.outlineOffset = `${pick([3, 4, 5, 7])}px`;
      } else if (moodId === "elegant") {
        // Elegant: thin delicate rings with muted colors
        s.outline = `${pick([0.5, 1, 1])}px solid ${dc.muted}${pick(["12", "15", "18"])}`;
        s.outlineOffset = `${pick([4, 5, 6, 8])}px`;
      } else {
        // Auto/minimal: standard solid rings
        const width = pick([1, 1.5, 2]);
        const opacity = pick(["18", "22", "30"]);
        s.outline = `${width}px solid ${acHex}${opacity}`;
        s.outlineOffset = `${offset}px`;
      }
    }
  }

  // --- Backdrop effects (glass variants + mood-driven for non-glass) ---
  const tags = getVariantTags(type, (VARIANTS[type] || []).length || 1);
  if (variant === tags.glass && Math.random() < 0.6) {
    s.backdropFilter = `blur(${pick([8, 12, 16, 20])}px)`;
  } else if (!isNav && !isCode && !isSmall) {
    // Advanced material system — distinct surface feels beyond simple blur
    const matRoll = Math.random();

    if (moodId === "elegant" && matRoll < 0.22) {
      // Elegant materials: frosted crystal, smoky glass, silk veil
      const mat = Math.random();
      if (mat < 0.35) {
        // Frosted crystal — heavy blur + desaturation + subtle brightness lift
        const blr = pick([10, 14, 18]);
        s.backdropFilter = `blur(${blr}px) saturate(0.75) brightness(1.06)`;
        s.opacity = randRange(0.92, 0.97).toFixed(2);
        if (!s.border) s.border = `1px solid ${acHex}12`;
        if (!s.boxShadow) s.boxShadow = `inset 0 1px 0 ${acHex}08, 0 4px 20px ${shHex}06`;
      } else if (mat < 0.65) {
        // Smoky glass — medium blur + warmth + lower opacity
        s.backdropFilter = `blur(${pick([6, 8, 10])}px) saturate(0.85) brightness(0.97)`;
        s.opacity = randRange(0.88, 0.94).toFixed(2);
        if (!s.gradientOverlay) s.gradientOverlay = `linear-gradient(180deg, ${acHex}06 0%, ${shHex}08 100%)`;
      } else {
        // Silk veil — light blur + high brightness + ethereal feel
        s.backdropFilter = `blur(${pick([3, 5, 7])}px) brightness(1.10) saturate(0.9)`;
        s.opacity = randRange(0.94, 0.98).toFixed(2);
        if (!s.border) s.border = `1px solid ${acHex}0A`;
      }
    } else if (moodId === "bold" && matRoll < 0.18) {
      // Bold materials: tinted shield, dark acrylic, contrast glass
      const mat = Math.random();
      if (mat < 0.40) {
        // Tinted shield — blur + heavy saturation + contrast boost
        s.backdropFilter = `blur(${pick([6, 8, 12])}px) saturate(1.4) contrast(1.08)`;
        if (!s.gradientOverlay) s.gradientOverlay = `linear-gradient(${pick([135, 180, 225])}deg, ${gcGlow}10 0%, transparent 100%)`;
      } else if (mat < 0.70) {
        // Dark acrylic — heavy blur + desaturation + darkening
        s.backdropFilter = `blur(${pick([12, 16, 20])}px) brightness(0.88) saturate(0.7)`;
        s.opacity = randRange(0.90, 0.96).toFixed(2);
        if (!s.boxShadow) s.boxShadow = `inset 0 0 20px ${shHex}0A`;
      } else {
        // Contrast glass — sharp contrast + slight blur
        s.backdropFilter = `blur(${pick([3, 4, 6])}px) contrast(1.15) saturate(1.1)`;
      }
    } else if (moodId === "playful" && matRoll < 0.20) {
      // Playful materials: candy glass, rainbow blur, bubbly surface
      const mat = Math.random();
      if (mat < 0.40) {
        // Candy glass — warm blur + oversaturated + bright
        s.backdropFilter = `blur(${pick([6, 8, 10])}px) saturate(1.5) brightness(1.08)`;
        if (!s.border) s.border = `2px solid ${gc1}25`;
      } else if (mat < 0.70) {
        // Rainbow blur — heavy blur + hue rotation hint via overlay
        s.backdropFilter = `blur(${pick([8, 12, 16])}px) saturate(1.3)`;
        if (!s.gradientOverlay) s.gradientOverlay = `linear-gradient(${pick([45, 135])}deg, ${gc1}0C, ${gc2}0C, ${gcGlow}0C)`;
        s.opacity = randRange(0.93, 0.97).toFixed(2);
      } else {
        // Bubbly — light blur + brightness pop + inner glow
        s.backdropFilter = `blur(${pick([4, 6])}px) brightness(1.12) saturate(1.2)`;
        if (!s.boxShadow) s.boxShadow = `inset 0 0 12px ${gcGlow}08, 0 2px 8px ${shHex}06`;
      }
    } else if (moodId === "minimal" && matRoll < 0.08) {
      // Minimal: whisper frost — barely-there blur
      s.backdropFilter = `blur(${pick([2, 3, 4])}px) brightness(1.02)`;
    } else if (moodId === "auto" && matRoll < 0.10) {
      // Auto: pick from subtle end of any mood
      s.backdropFilter = pick([
        `blur(${pick([4, 6, 8])}px) saturate(${randRange(0.8, 1.2).toFixed(2)})`,
        `blur(${pick([3, 5])}px) brightness(${randRange(1.02, 1.08).toFixed(2)})`,
        `blur(${pick([6, 10])}px) saturate(0.85) brightness(1.05)`,
      ]);
    }
  }

  // --- Gradient overlay (DNA-driven or harmony-adaptive chance, skip nav/code/small) ---
  if (!isNav && !isCode && !isSmall) {
    const ac2 = palette.ac2 || palette.ac || "#888";
    const dnaGrad = dna && dna.gradientStyle !== "none";
    // Harmony-adaptive fallback rate: match canvas gradient density
    const gradFallback = harmony ? (harmony.gradientRate > 0.6 ? 0.55 : harmony.gradientRate > 0.3 ? 0.30 : 0.12) : 0.25;
    // DNA gradient style: 70% fire rate for cohesive canvas, else harmony-adaptive
    // Use derived colors for richer gradients (analogous, complementary, split-comp)
    if (dnaGrad && Math.random() < 0.70) {
      const gs = dna.gradientStyle;
      // Use DNA color scheme (gc1/gc2) for canvas-wide gradient coherence
      if (gs === "diagonal") {
        // Use DNA gradient angle for canvas-wide direction cohesion
        const a = dna.gradientAngle || 135;
        const a2 = (a + pick([-15, -10, 0, 10, 15])) % 360; // slight per-component variation
        s.gradientOverlay = pick([
          `linear-gradient(${a}deg, ${acHex}08 0%, transparent 60%)`,
          `linear-gradient(${a2}deg, ${gc1}0A 0%, ${acHex}06 100%)`,
          `linear-gradient(${a}deg, ${gc1}06 0%, ${gc2}04 50%, transparent 100%)`,
          `linear-gradient(${a2}deg, ${acHex}08 0%, ${gc2}06 60%, transparent 100%)`,
          // Multi-stop: 3-4 color transitions for richer depth
          `linear-gradient(${a}deg, ${gc1}0A 0%, ${acHex}06 35%, ${gc2}04 70%, transparent 100%)`,
          `linear-gradient(${a2}deg, ${gcGlow}08 0%, ${gc1}06 25%, transparent 50%, ${gc2}04 100%)`,
          `linear-gradient(${a}deg, ${acHex}06 0%, transparent 20%, ${gc1}05 60%, ${gc2}04 100%)`,
        ]);
      } else if (gs === "radial") {
        // Use DNA gradient origin for canvas-wide radial cohesion
        const o = dna.gradientOrigin || "top left";
        s.gradientOverlay = pick([
          `radial-gradient(ellipse at ${o}, ${acHex}0A 0%, transparent 65%)`,
          `radial-gradient(circle at ${o}, ${gc1}08 0%, transparent 50%)`,
          `radial-gradient(ellipse at ${o}, ${gc2}06 0%, transparent 70%)`,
          // Multi-stop radials: layered depth
          `radial-gradient(circle at ${o}, ${gc1}0A 0%, ${acHex}04 30%, transparent 60%)`,
          `radial-gradient(ellipse at ${o}, ${gcGlow}08 0%, ${gc2}05 40%, transparent 75%)`,
        ]);
      } else if (gs === "conic") {
        s.gradientOverlay = pick([
          `conic-gradient(from 180deg at 50% 50%, ${acHex}06, ${gc1}06, transparent)`,
          `conic-gradient(from 45deg, ${gc2}05, transparent 30%, ${gc1}04, transparent)`,
          // Multi-stop conics: smooth color wheels
          `conic-gradient(from 90deg, ${gc1}06, ${acHex}04, ${gc2}05, ${gcGlow}03, transparent)`,
          `conic-gradient(from 0deg at 30% 70%, ${gcGlow}06, transparent 25%, ${gc1}05, transparent 75%, ${gc2}04)`,
        ]);
      }
    } else if (Math.random() < gradFallback) {
      if (moodId === "bold") {
        s.gradientOverlay = pick([
          `linear-gradient(135deg, ${acHex}08 0%, ${dc.comp}06 60%, transparent 100%)`,
          `linear-gradient(to bottom, ${dc.vivid}0A 0%, transparent 40%)`,
          `linear-gradient(160deg, ${dc.triad1}0A 0%, ${acHex}06 100%)`,
          `linear-gradient(200deg, ${acHex}0C 0%, ${dc.split2}08 50%, transparent 100%)`,
          // Multi-stop bold: dramatic color sweeps
          `linear-gradient(135deg, ${dc.comp}0C 0%, ${acHex}08 30%, ${dc.vivid}06 65%, transparent 100%)`,
          `linear-gradient(180deg, ${dc.triad1}0A 0%, transparent 25%, ${dc.triad2}08 75%, ${acHex}06 100%)`,
        ]);
      } else if (moodId === "elegant") {
        s.gradientOverlay = pick([
          `linear-gradient(135deg, ${dc.muted}06 0%, transparent 70%)`,
          `linear-gradient(to right, ${acHex}04 0%, ${dc.analog1}04 100%)`,
          `radial-gradient(ellipse at top left, ${dc.analog2}06 0%, transparent 60%)`,
          // Multi-stop elegant: soft tonal shifts
          `linear-gradient(160deg, ${dc.analog1}05 0%, transparent 30%, ${dc.muted}04 70%, transparent 100%)`,
          `radial-gradient(ellipse at 30% 20%, ${dc.analog2}06 0%, ${dc.muted}03 40%, transparent 70%)`,
        ]);
      } else if (moodId === "playful") {
        s.gradientOverlay = pick([
          `linear-gradient(135deg, ${dc.vivid}0D 0%, ${dc.triad1}0A 50%, transparent 100%)`,
          `linear-gradient(45deg, ${dc.analog1}0C 0%, ${dc.analog2}0A 100%)`,
          `conic-gradient(from 180deg, ${dc.triad1}08, ${dc.triad2}06, ${acHex}04, transparent)`,
          `linear-gradient(90deg, ${dc.split1}0A 0%, transparent 30%, ${dc.split2}08 100%)`,
          // Multi-stop playful: vibrant color party
          `linear-gradient(135deg, ${dc.vivid}0C 0%, ${dc.triad1}08 25%, ${dc.triad2}06 55%, ${dc.comp}04 100%)`,
          `conic-gradient(from 120deg, ${dc.vivid}08, ${dc.triad1}06, transparent 40%, ${dc.split1}05, ${dc.triad2}04, transparent)`,
        ]);
      } else if (moodId !== "minimal") {
        s.gradientOverlay = pick([
          `linear-gradient(135deg, ${acHex}06 0%, transparent 50%)`,
          `linear-gradient(to bottom right, ${dc.analog1}05 0%, transparent 60%)`,
        ]);
      }
    }
  }

  // --- Border treatment (DNA-driven or harmony-adaptive chance, skip nav/code) ---
  if (!isNav && !isCode) {
    const dnaBorder = dna && dna.borderStyle !== "none";
    // Harmony-adaptive fallback rate: match canvas border density
    const borderFallback = harmony ? (harmony.borderRate > 0.5 ? 0.45 : harmony.borderRate > 0.2 ? 0.22 : 0.08) : 0.18;
    if (dnaBorder && Math.random() < 0.65) {
      const bs = dna.borderStyle;
      if (bs === "thin") s.border = `1px solid ${acHex}${pick(["12", "15", "18"])}`;
      else if (bs === "accent-top") { s.borderTop = `2px solid ${acHex}${pick(["25", "30", "35"])}`; }
      else if (bs === "accent-bottom") { s.borderBottom = `3px solid ${acHex}${pick(["30", "40", "50"])}`; }
      else if (bs === "dashed") s.border = `2px dashed ${acHex}${pick(["20", "25", "30"])}`;
    } else if (Math.random() < borderFallback) {
      // ~25% chance of creative asymmetric border combos instead of simple borders
      const useAsymmetric = !isSmall && Math.random() < 0.25;
      if (useAsymmetric) {
        if (moodId === "bold") {
          // Bold asymmetric: thick left accent + thin bottom rule
          pick([
            () => { s.borderLeft = `4px solid ${gc1}40`; s.borderBottom = `1px solid ${acHex}15`; },
            () => { s.borderBottom = `4px solid ${acHex}45`; s.borderRight = `2px solid ${gc1}20`; },
            () => { s.borderLeft = `3px solid ${gcGlow}35`; s.borderTop = `1px solid ${acHex}12`; },
          ])();
        } else if (moodId === "elegant") {
          // Elegant asymmetric: thin top + delicate left accent
          pick([
            () => { s.borderTop = `1px solid ${dc.muted}18`; s.borderLeft = `2px solid ${gc1}15`; },
            () => { s.borderBottom = `1px solid ${dc.muted}12`; s.borderLeft = `1px solid ${dc.analog1}18`; },
          ])();
        } else if (moodId === "playful") {
          // Playful asymmetric: mixed styles per side
          pick([
            () => { s.borderLeft = `3px dashed ${gc1}30`; s.borderBottom = `2px dotted ${gc2}25`; },
            () => { s.borderTop = `2px solid ${gcGlow}28`; s.borderRight = `3px dashed ${gc1}22`; },
            () => { s.borderBottom = `3px solid ${gc2}30`; s.borderLeft = `2px dotted ${gcGlow}25`; },
          ])();
        } else {
          // Auto: subtle multi-side
          pick([
            () => { s.borderLeft = `2px solid ${acHex}20`; s.borderBottom = `1px solid ${acHex}10`; },
            () => { s.borderTop = `1px solid ${acHex}15`; s.borderLeft = `2px solid ${gc1}18`; },
          ])();
        }
      } else {
        // Standard single-style borders
        if (moodId === "bold") {
          s.border = pick([`2px solid ${acHex}30`, `3px solid ${acHex}20`, `2px dashed ${acHex}25`]);
        } else if (moodId === "elegant") {
          s.border = pick([`1px solid ${acHex}15`, `1px solid ${palette.bd || acHex + "12"}`]);
        } else if (moodId === "playful") {
          s.border = pick([`2px dashed ${acHex}28`, `3px dotted ${acHex}20`, `2px solid ${acHex}35`]);
        } else if (moodId !== "minimal") {
          s.border = pick([`1px solid ${acHex}12`, `1.5px solid ${acHex}18`]);
        }
      }
    }
  }

  // --- Accent hue shift (DNA > harmony direction > random) ---
  if (dna && dna.hueDirection && !isCode) {
    // DNA: all components shift in the same direction with slight variation
    s.hueRotate = dna.hueDirection + pick([-5, -3, 0, 0, 3, 5]);
  } else if (!isCode && harmony && harmony.avgHueShift !== 0 && Math.random() < 0.55) {
    // Harmony: bias toward canvas hue direction with variation
    const base = harmony.avgHueShift;
    s.hueRotate = base + pick([-8, -4, 0, 4, 8]);
  } else if (!isCode && Math.random() < 0.15) {
    const shift = pick([-20, -15, -10, 10, 15, 20, 30, -30]);
    s.hueRotate = shift;
  }

  // --- Scale personality (10% chance, subtle) ---
  if (!isNav && !isCode && Math.random() < 0.10) {
    s.scale = pick([0.97, 0.98, 1.02, 1.03, 1.04]);
  }

  // --- Creative transform compositions: skew, translateY, perspective ---
  // Subtle spatial transforms that make components feel hand-placed and dynamic
  if (!isNav && !isCode && !isSmall) {
    const txChance = moodId === "playful" ? 0.30 : moodId === "bold" ? 0.22 : moodId === "elegant" ? 0.15 : moodId === "minimal" ? 0.06 : 0.18;
    if (Math.random() < txChance) {
      if (moodId === "playful") {
        // Playful: visible skews, bouncy translateY, tilted energy
        pick([
          () => { s.skewX = pick([-2, -1.5, -1, 1, 1.5, 2]); },
          () => { s.skewY = pick([-1.5, -1, 1, 1.5]); },
          () => { s.translateY = pick([-4, -3, -2, 2, 3, 4]); },
          () => { s.skewX = pick([-1, 1]); s.translateY = pick([-2, 2, 3]); },
        ])();
      } else if (moodId === "bold") {
        // Bold: strong architectural angles, confident offsets
        pick([
          () => { s.skewX = pick([-1.5, -1, 1, 1.5]); },
          () => { s.translateY = pick([-3, -2, 2, 3]); },
          () => { s.perspective = pick([800, 1000, 1200]); s.rotateY = pick([-2, -1, 1, 2]); },
        ])();
      } else if (moodId === "elegant") {
        // Elegant: barely perceptible, adds subtle depth without disruption
        pick([
          () => { s.translateY = pick([-2, -1, 1, 2]); },
          () => { s.perspective = pick([1000, 1400, 1800]); s.rotateY = pick([-1, -0.5, 0.5, 1]); },
        ])();
      } else if (moodId === "minimal") {
        // Minimal: micro-offset only
        s.translateY = pick([-1, 1, 2]);
      } else {
        // Auto: mix of everything
        pick([
          () => { s.skewX = pick([-1.5, -1, 1, 1.5]); },
          () => { s.translateY = pick([-3, -2, 2, 3]); },
          () => { s.skewX = pick([-1, 1]); s.translateY = pick([-2, 2]); },
          () => { s.perspective = pick([900, 1100, 1400]); s.rotateY = pick([-1.5, -1, 1, 1.5]); },
        ])();
      }
    }
  }

  // --- Typography dimension: rhythm + textTransform + mixBlendMode ---
  if (!isNav && !isCode) {
    // DNA typography rhythm: canvas-wide letter-spacing, word-spacing, font-weight
    const typo = dna && dna.typoRhythm;
    if (typo && Math.random() < 0.80) {
      // Letter-spacing from DNA with per-component jitter
      if (typo.ls !== "normal") {
        const baseLS = parseFloat(typo.ls);
        const jitter = (Math.random() - 0.5) * 0.01; // ±0.005em variation
        s.letterSpacing = `${(baseLS + jitter).toFixed(3)}em`;
      }
      // Word-spacing from DNA
      if (typo.ws !== "normal") {
        s.wordSpacing = typo.ws;
      }
      // Font-weight hints: headings get the weight personality, body stays normal
      if (typo.weight === "light") {
        s.fontWeight = sizeCat === "large" ? pick([300, 300, 400]) : pick([300, 400, 400]);
      } else if (typo.weight === "heavy") {
        s.fontWeight = sizeCat === "large" ? pick([700, 800, 900]) : pick([500, 600, 700]);
      } else if (typo.weight === "mixed") {
        // Playful: alternate between extremes for variety
        s.fontWeight = sizeCat === "large" ? pick([300, 700, 800]) : pick([400, 500, 700]);
      }
      // else "normal" — don't set fontWeight, let component defaults win
    } else if (!typo) {
      // Fallback: mood-driven letter-spacing (pre-DNA behavior)
      if (moodId === "minimal" && Math.random() < 0.3) {
        s.letterSpacing = pick(["0.01em", "0.015em", "0.02em"]);
      } else if (moodId === "elegant" && Math.random() < 0.4) {
        s.letterSpacing = pick(["0.02em", "0.03em", "0.04em", "0.05em"]);
      } else if (moodId === "bold" && Math.random() < 0.25) {
        s.letterSpacing = pick(["-0.01em", "-0.02em", "0.04em", "0.06em"]);
      }
    }

    // textTransform: harmony-adaptive + mood-aware
    const ttRate = harmony ? harmony.textTransformRate : 0;
    const ttBoost = ttRate > 0.4 ? 0.45 : ttRate > 0.2 ? 0.25 : 0;
    if (ttBoost > 0 && Math.random() < ttBoost) {
      s.textTransform = "uppercase";
    } else if (moodId === "bold" && sizeCat === "large" && Math.random() < 0.35) {
      s.textTransform = "uppercase";
    } else if (moodId === "elegant" && Math.random() < 0.25) {
      s.textTransform = pick(["uppercase", "lowercase"]);
    } else if (moodId === "playful" && Math.random() < 0.2) {
      s.textTransform = pick(["uppercase", "lowercase"]);
    } else if (moodId === "auto" && Math.random() < 0.12) {
      s.textTransform = pick(["uppercase", "lowercase", "uppercase"]);
    }
    // mixBlendMode for gradient overlays
    if (s.gradientOverlay) {
      if (moodId === "bold" && Math.random() < 0.3) {
        s.mixBlendMode = pick(["multiply", "overlay", "soft-light"]);
      } else if (moodId === "playful" && Math.random() < 0.25) {
        s.mixBlendMode = pick(["overlay", "screen", "color-dodge"]);
      } else if (moodId === "elegant" && Math.random() < 0.2) {
        s.mixBlendMode = pick(["soft-light", "luminosity"]);
      }
    }

    // --- Second gradient layer: stacked gradient depth for rich surfaces ---
    // Adds a second overlay on top of the first, creating complex layered backgrounds.
    // Only fires when there's already a gradient (enhances, doesn't replace).
    if (s.gradientOverlay && !isSmall) {
      const g2Chance = moodId === "bold" ? 0.25 : moodId === "playful" ? 0.22 : moodId === "elegant" ? 0.18 : moodId === "minimal" ? 0.06 : 0.15;
      if (Math.random() < g2Chance) {
        if (moodId === "bold") {
          s.gradientOverlay2 = pick([
            `radial-gradient(ellipse at ${pick([20, 80])}% ${pick([20, 80])}%, ${acHex}10 0%, transparent 60%)`,
            `linear-gradient(${pick([0, 45, 90])}deg, ${gc1}08 0%, transparent 40%, ${gc2}06 100%)`,
            `conic-gradient(from ${pick([90, 180, 270])}deg at 50% 50%, ${acHex}06, transparent, ${gc1}04, transparent)`,
          ]);
        } else if (moodId === "playful") {
          s.gradientOverlay2 = pick([
            `radial-gradient(circle at ${pick([25, 75])}% ${pick([25, 75])}%, ${dc.vivid}0C 0%, transparent 50%)`,
            `linear-gradient(${pick([60, 120, 240])}deg, ${dc.analog1}08 0%, transparent 35%, ${gcGlow}06 100%)`,
          ]);
        } else if (moodId === "elegant") {
          s.gradientOverlay2 = pick([
            `radial-gradient(ellipse at 50% 0%, ${gc1}06 0%, transparent 70%)`,
            `linear-gradient(180deg, ${dc.muted}04 0%, transparent 50%)`,
          ]);
        } else {
          s.gradientOverlay2 = pick([
            `radial-gradient(ellipse at ${pick([30, 70])}% ${pick([30, 70])}%, ${acHex}08 0%, transparent 55%)`,
            `linear-gradient(${pick([135, 225])}deg, ${gc1}05 0%, transparent 45%)`,
          ]);
        }
      }
    }

    // --- Text shadow dimension: mood-driven typographic depth ---
    // Apply to medium/large components (most have text content)
    if (sizeCat === "medium" || sizeCat === "large") {
      const tsChance = moodId === "bold" ? 0.35 : moodId === "elegant" ? 0.30 : moodId === "playful" ? 0.28 : moodId === "minimal" ? 0.12 : 0.20;
      if (Math.random() < tsChance) {
        if (moodId === "bold") {
          s.textShadow = pick([
            // Hard offset — retro/poster feel
            `2px 2px 0 ${gc1}30`,
            `3px 3px 0 ${acHex}25`,
            // Stacked 3D depth
            `1px 1px 0 ${gc1}20, 2px 2px 0 ${gc1}15, 3px 3px 0 ${gc1}10`,
            // Glow punch
            `0 0 ${pick([8, 12, 16])}px ${acHex}35`,
            // Double shadow — offset + glow
            `2px 2px 0 ${gc1}20, 0 0 10px ${acHex}15`,
          ]);
        } else if (moodId === "elegant") {
          s.textShadow = pick([
            // Soft ambient — barely visible, adds depth
            `0 1px 3px ${shHex}20`,
            `0 2px 4px ${dc.muted}15`,
            // Letterpress/emboss — inset feel
            `0 1px 0 ${gc1}08, 0 -1px 0 ${shHex}12`,
            // Delicate glow
            `0 0 6px ${dc.muted}18`,
            // Crisp thin shadow
            `1px 1px 1px ${shHex}15`,
          ]);
        } else if (moodId === "playful") {
          s.textShadow = pick([
            // Neon glow
            `0 0 ${pick([10, 14, 20])}px ${pick([dc.vivid, dc.analog1, gcGlow])}40`,
            // Rainbow stacked
            `1px 1px 0 ${dc.analog1}30, -1px -1px 0 ${dc.comp}25`,
            // Bold color offset
            `${pick([2, 3])}px ${pick([2, 3])}px 0 ${pick([gc1, dc.vivid])}35`,
            // Double neon
            `0 0 6px ${dc.vivid}30, 0 0 14px ${dc.analog1}20`,
            // Playful hard offset
            `-2px 2px 0 ${gc1}25`,
          ]);
        } else if (moodId === "minimal") {
          s.textShadow = pick([
            // Ultra-subtle ambient
            `0 1px 2px ${shHex}10`,
            // Barely-there depth
            `0 0 3px ${shHex}08`,
          ]);
        } else {
          // auto: mix of everything
          s.textShadow = pick([
            `0 1px 3px ${shHex}18`,
            `2px 2px 0 ${gc1}22`,
            `0 0 ${pick([8, 12])}px ${acHex}25`,
            `1px 1px 0 ${gc1}18, 2px 2px 0 ${gc1}12`,
            `0 1px 0 ${gc1}10, 0 -1px 0 ${shHex}08`,
            `0 0 8px ${dc.muted}20, 0 0 16px ${acHex}10`,
          ]);
        }
      }
    }

    // --- Text-stroke: outlined/hollow text effects ---
    // Outlined text is a huge design trend — creates dramatic typographic contrast.
    // Only on medium/large (headline-like) components, never nav/code/small.
    if (sizeCat === "medium" || sizeCat === "large") {
      // DNA effectPersonality boost: if canvas DNA says "use text-stroke", increase chance
      const ep = dna?.effectPersonality;
      const dnaStrokeBoost = ep && ep.textStroke !== "none" ? 0.15 : 0;
      const strokeChance = (moodId === "bold" ? 0.22 : moodId === "playful" ? 0.18 : moodId === "elegant" ? 0.10 : moodId === "minimal" ? 0.04 : 0.12) + dnaStrokeBoost;
      if (Math.random() < strokeChance) {
        if (moodId === "bold") {
          // Thick, punchy strokes — poster/brutalist aesthetic
          const sw = pick([1, 1.5, 2]);
          const sc = pick([gc1, acHex, dc.vivid]);
          s.textStroke = `${sw}px ${sc}60`;
          // Occasionally hollow text (stroke + transparent fill)
          if (Math.random() < 0.3) {
            s.textFillColor = "transparent";
            s.textStroke = `${pick([1.5, 2, 2.5])}px ${pick([acHex, gc1])}90`;
          }
        } else if (moodId === "playful") {
          // Colorful, fun strokes — neon outline feel
          const sw = pick([0.8, 1, 1.5]);
          s.textStroke = `${sw}px ${pick([dc.vivid, dc.analog1, gcGlow])}55`;
          // Hollow with color pop
          if (Math.random() < 0.25) {
            s.textFillColor = "transparent";
            s.textStroke = `${pick([1, 1.5])}px ${pick([dc.vivid, dc.analog1])}85`;
          }
        } else if (moodId === "elegant") {
          // Hairline stroke — barely perceptible refinement
          s.textStroke = `${pick([0.3, 0.5, 0.8])}px ${pick([gc1, dc.muted])}30`;
        } else if (moodId === "minimal") {
          // Ultra-thin functional stroke
          s.textStroke = `0.5px ${gc1}20`;
        } else {
          // Auto: mix of approaches
          const sw = pick([0.5, 0.8, 1, 1.5]);
          s.textStroke = `${sw}px ${pick([gc1, acHex, dc.muted])}45`;
          if (Math.random() < 0.15) {
            s.textFillColor = "transparent";
            s.textStroke = `${pick([1, 1.5])}px ${pick([acHex, gc1])}80`;
          }
        }
      }
    }
  }

  // --- Opacity depth layering: subtle transparency for visual hierarchy ---
  // Makes some components recede slightly, creating a depth hierarchy on the canvas
  if (!isNav && !isCode) {
    const opacityChance = moodId === "elegant" ? 0.20 : moodId === "minimal" ? 0.18 : moodId === "playful" ? 0.08 : moodId === "bold" ? 0.06 : 0.12;
    if (Math.random() < opacityChance) {
      if (moodId === "elegant") {
        s.opacity = pick([0.88, 0.90, 0.92, 0.94]); // ethereal layering
      } else if (moodId === "minimal") {
        s.opacity = pick([0.85, 0.88, 0.90]); // airy negative space
      } else {
        s.opacity = pick([0.90, 0.92, 0.95]); // subtle depth only
      }
    }
  }

  // --- Inner glow: inset boxShadow for warm/cool radiance from within ---
  // Adds an inner light source that makes components feel alive
  if (!isNav && !isCode && !isSmall && s.boxShadow && s.boxShadow !== "none") {
    const glowChance = moodId === "playful" ? 0.25 : moodId === "bold" ? 0.20 : moodId === "elegant" ? 0.18 : moodId === "minimal" ? 0.08 : 0.15;
    if (Math.random() < glowChance) {
      let innerGlow;
      if (moodId === "playful") {
        innerGlow = pick([
          `inset 0 0 ${pick([20, 30, 40])}px ${pick([dc.vivid, dc.analog1, gcGlow])}12`,
          `inset 0 ${pick([-15, -10, 10, 15])}px ${pick([20, 30])}px ${gc1}10`,
          `inset 0 0 ${pick([15, 25])}px ${acHex}15, inset 0 0 ${pick([40, 60])}px ${gcGlow}06`,
        ]);
      } else if (moodId === "bold") {
        innerGlow = pick([
          `inset 0 0 ${pick([25, 35])}px ${acHex}12`,
          `inset 0 -${pick([10, 15])}px ${pick([25, 35])}px ${gc1}10`,
          `inset ${pick([-20, 20])}px 0 ${pick([30, 40])}px ${gcGlow}08`,
        ]);
      } else if (moodId === "elegant") {
        innerGlow = pick([
          `inset 0 0 ${pick([20, 30])}px ${dc.muted}08`,
          `inset 0 ${pick([10, 15])}px ${pick([25, 35])}px ${acHex}06`,
        ]);
      } else if (moodId === "minimal") {
        innerGlow = `inset 0 0 ${pick([15, 20])}px ${shHex}04`;
      } else {
        innerGlow = pick([
          `inset 0 0 ${pick([20, 30])}px ${acHex}10`,
          `inset 0 ${pick([-12, 12])}px ${pick([20, 30])}px ${gc1}08`,
          `inset 0 0 ${pick([15, 25])}px ${gcGlow}08, inset 0 0 ${pick([40, 50])}px ${acHex}04`,
        ]);
      }
      s.boxShadow = s.boxShadow + ", " + innerGlow;
    }
  }

  // --- Clip-path: shaped component edges beyond border-radius ---
  // Angular cuts, beveled corners, notched edges — architectural shapes.
  // Only on medium/large non-nav non-code. Low probability to keep special.
  if (!isNav && !isCode && !isSmall) {
    // DNA effectPersonality boost: if canvas DNA says "use clip-path", increase chance
    const dnaClipBoost = dna?.effectPersonality?.clipStyle && dna.effectPersonality.clipStyle !== "none" ? 0.12 : 0;
    const clipChance = (moodId === "bold" ? 0.16 : moodId === "playful" ? 0.12 : moodId === "elegant" ? 0.08 : moodId === "minimal" ? 0.05 : 0.10) + dnaClipBoost;
    if (Math.random() < clipChance) {
      // When using clip-path, border-radius becomes irrelevant (clip overrides it)
      // and box-shadow gets clipped too, so we shift shadow to filter: drop-shadow
      const bevel = pick([4, 6, 8, 10, 12]);
      if (moodId === "bold") {
        s.clipPath = pick([
          // Angled cut corners — brutalist/geometric
          `polygon(${bevel}px 0, calc(100% - ${bevel}px) 0, 100% ${bevel}px, 100% calc(100% - ${bevel}px), calc(100% - ${bevel}px) 100%, ${bevel}px 100%, 0 calc(100% - ${bevel}px), 0 ${bevel}px)`,
          // Top-left chamfer only — asymmetric strength
          `polygon(${bevel * 2}px 0, 100% 0, 100% 100%, 0 100%, 0 ${bevel * 2}px)`,
          // Bottom-right notch — dynamic cut
          `polygon(0 0, 100% 0, 100% calc(100% - ${bevel * 2}px), calc(100% - ${bevel * 2}px) 100%, 0 100%)`,
        ]);
      } else if (moodId === "playful") {
        const notch = pick([8, 12, 16]);
        s.clipPath = pick([
          // Ticket/coupon notch — semicircle cuts on sides
          `polygon(0 0, 100% 0, 100% calc(50% - ${notch}px), calc(100% - ${notch/2}px) 50%, 100% calc(50% + ${notch}px), 100% 100%, 0 100%, 0 calc(50% + ${notch}px), ${notch/2}px 50%, 0 calc(50% - ${notch}px))`,
          // Diagonal slice bottom
          `polygon(0 0, 100% 0, 100% calc(100% - ${notch}px), 0 100%)`,
          // Flag/pennant edge
          `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%)`,
        ]);
      } else if (moodId === "elegant") {
        const trim = pick([3, 4, 6]);
        s.clipPath = pick([
          // Subtle inward curve — refined edge
          `inset(0 round ${trim * 3}px ${trim}px)`,
          // Tiny corner chamfer — barely noticeable refinement
          `polygon(${trim}px 0, calc(100% - ${trim}px) 0, 100% ${trim}px, 100% calc(100% - ${trim}px), calc(100% - ${trim}px) 100%, ${trim}px 100%, 0 calc(100% - ${trim}px), 0 ${trim}px)`,
        ]);
      } else if (moodId === "minimal") {
        // Clean geometric inset — breathing room
        s.clipPath = `inset(${pick([1, 2])}px round ${pick([4, 6, 8])}px)`;
      } else {
        // Auto: mix of everything
        s.clipPath = pick([
          `polygon(${bevel}px 0, calc(100% - ${bevel}px) 0, 100% ${bevel}px, 100% calc(100% - ${bevel}px), calc(100% - ${bevel}px) 100%, ${bevel}px 100%, 0 calc(100% - ${bevel}px), 0 ${bevel}px)`,
          `polygon(${bevel * 2}px 0, 100% 0, 100% 100%, 0 100%, 0 ${bevel * 2}px)`,
          `inset(0 round ${pick([6, 8, 12])}px ${pick([2, 4])}px)`,
        ]);
      }
      // Convert box-shadow to drop-shadow filter since clip-path clips box-shadow
      if (s.boxShadow && s.boxShadow !== "none") {
        const dropShadow = `drop-shadow(0 ${pick([2, 4, 6])}px ${pick([6, 10, 14])}px ${shHex}15)`;
        s.filter = s.filter ? s.filter + " " + dropShadow : dropShadow;
        s.boxShadow = "none";
      }
    }
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
      // Minimal-only: subtle brightness lift for airy feel
      if (Math.random() < 0.25) {
        s.filter = `brightness(${randRange(1.01, 1.04).toFixed(2)})`;
      }
      // Minimal-only: micro letter spacing (only if DNA didn't already set it)
      if (!s.letterSpacing && Math.random() < 0.3) {
        s.letterSpacing = pick(["0.01em", "0.015em", "0.02em"]);
      }
      // No gradients, no rotation, no hue shifts — strip them
      s.gradientOverlay = undefined;
      s.rotate = undefined;
      s.hueRotate = undefined;
      s.scale = undefined;
      // Minimal: cap shadow intensity — always understated
      if (s.boxShadow && s.boxShadow !== "none" && !s.boxShadow.includes("1px")) {
        s.boxShadow = pick(["none", `0 1px 3px ${shHex}08`, `0 2px 8px ${shHex}06`]);
      }
    }

    if (moodId === "bold") {
      // Signature: thick accent bottom border (grounding effect)
      if (Math.random() < 0.3 && !s.border) {
        s.borderBottom = `4px solid ${acHex}50`;
      }
      // Signature: double shadow (offset + glow) for dramatic depth — use DNA glow color
      if (Math.random() < 0.25 && s.boxShadow && s.boxShadow !== "none") {
        s.boxShadow += `, 0 0 30px ${pick([acHex, gcGlow, gc1])}10`;
      }
      // Bold always gets some visual weight — never "none" shadow
      if (s.boxShadow === "none") {
        s.boxShadow = `0 4px 14px ${shHex}12`;
      }
      // Bold-only: contrast bump for punch
      if (Math.random() < 0.35) {
        s.filter = `contrast(${randRange(1.04, 1.12).toFixed(2)})`;
      }
      // Bold-only: scale up slightly — bold commands space
      if (Math.random() < 0.2) {
        s.scale = pick([1.02, 1.03, 1.04, 1.05]);
      }
    }

    if (moodId === "elegant") {
      // Signature: subtle inner glow via inset shadow
      if (Math.random() < 0.3) {
        const inset = `inset 0 0 20px ${acHex}06`;
        s.boxShadow = s.boxShadow && s.boxShadow !== "none" ? `${s.boxShadow}, ${inset}` : inset;
      }
      // Signature: letterSpacing hint (only if DNA didn't already set it)
      if (!s.letterSpacing && Math.random() < 0.4) {
        s.letterSpacing = pick(["0.02em", "0.03em", "0.04em", "0.05em"]);
      }
      // Elegant-only: gentle radial gradient shimmer with DNA scheme tones
      if (Math.random() < 0.25 && !s.gradientOverlay) {
        s.gradientOverlay = pick([
          `radial-gradient(ellipse at 30% 20%, ${gc1}06 0%, transparent 55%)`,
          `radial-gradient(ellipse at 70% 80%, ${gc2}05 0%, transparent 50%)`,
          `linear-gradient(160deg, ${gc1}04 0%, ${gc2}03 100%)`,
        ]);
      }
      // Elegant-only: scale down slightly — refined, precise
      if (Math.random() < 0.15) {
        s.scale = pick([0.98, 0.99]);
      }
      // Elegant never rotates or skews, never has dotted/dashed borders
      s.rotate = undefined;
      s.skewX = undefined;
      s.skewY = undefined;
      if (s.border && (s.border.includes("dashed") || s.border.includes("dotted"))) {
        s.border = undefined;
      }
    }

    if (moodId === "playful") {
      // Signature: multicolor shadow using derived colors for genuinely colorful depth
      const ac2 = palette.ac2 || palette.ac || "#888";
      if (Math.random() < 0.3 && !isSmall) {
        s.boxShadow = pick([
          `3px 3px 0 ${acHex}25, -2px -2px 0 ${gc1}20`,
          `4px 4px 0 ${gc1}22, -3px -3px 0 ${gc2}18`,
          `3px 3px 0 ${gcGlow}28, -2px -2px 0 ${gc2}15`,
        ]);
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
      // Playful-only: occasional scale bounce personality
      if (Math.random() < 0.2) {
        s.scale = pick([1.03, 1.04, 1.05, 1.06]);
      }
      // Playful-only: mixed gradient overlays using DNA color scheme
      if (Math.random() < 0.2 && !s.gradientOverlay) {
        s.gradientOverlay = pick([
          `linear-gradient(135deg, ${gc1}0E 0%, ${gc2}0A 50%, transparent 100%)`,
          `conic-gradient(from ${pick([45, 90, 135, 180])}deg, ${gc1}08, ${gc2}08, transparent)`,
          `linear-gradient(90deg, ${gcGlow}0C 0%, ${gc1}08 100%)`,
        ]);
      }
    }

    // --- Transition hints: give components a living, interactive feel ---
    // Sets CSS transition so hover/interaction effects feel smooth, not snappy.
    // Different moods = different motion personalities.
    {
      // DNA effectPersonality: motionSpeed influences transition likelihood
      const dnaMotionBoost = dna?.effectPersonality?.motionSpeed && dna.effectPersonality.motionSpeed !== "calm" ? 0.10 : 0;
      const txnChance = (moodId === "playful" ? 0.40 : moodId === "bold" ? 0.30 : moodId === "elegant" ? 0.35 : moodId === "minimal" ? 0.20 : 0.25) + dnaMotionBoost;
      if (Math.random() < txnChance) {
        const props = [];
        // Collect which properties have been set and deserve smooth transitions
        if (s.boxShadow && s.boxShadow !== "none") props.push("box-shadow");
        if (s.scale || s.rotate) props.push("transform");
        if (s.filter) props.push("filter");
        if (s.opacity) props.push("opacity");
        if (s.border || s.borderTop || s.borderBottom) props.push("border-color");
        // Pick a subset to transition (not everything — that's expensive)
        const txnProps = props.length > 0 ? props.slice(0, pick([2, 3])).join(", ") : "transform, box-shadow";
        // Use DNA motion personality if available, fall back to mood
        const ms = dna?.effectPersonality?.motionSpeed;
        if (ms === "bouncy") {
          s.transition = `${txnProps} ${pick([0.25, 0.3, 0.35])}s ${pick(["cubic-bezier(0.34, 1.56, 0.64, 1)", "cubic-bezier(0.68, -0.55, 0.27, 1.55)"])}`;
        } else if (ms === "snappy" || ms === "instant") {
          s.transition = `${txnProps} ${pick([0.12, 0.15, 0.2])}s ${pick(["ease-in-out", "cubic-bezier(0.25, 0.46, 0.45, 0.94)"])}`;
        } else if (ms === "slow") {
          s.transition = `${txnProps} ${pick([0.4, 0.5, 0.6])}s ${pick(["ease", "cubic-bezier(0.4, 0, 0.2, 1)", "cubic-bezier(0.22, 0.61, 0.36, 1)"])}`;
        } else if (moodId === "playful") {
          s.transition = `${txnProps} ${pick([0.25, 0.3, 0.35])}s ${pick(["ease-out", "cubic-bezier(0.34, 1.56, 0.64, 1)", "cubic-bezier(0.68, -0.55, 0.27, 1.55)"])}`;
        } else if (moodId === "bold") {
          s.transition = `${txnProps} ${pick([0.15, 0.2, 0.25])}s ${pick(["ease-in-out", "cubic-bezier(0.25, 0.46, 0.45, 0.94)"])}`;
        } else if (moodId === "elegant") {
          s.transition = `${txnProps} ${pick([0.4, 0.5, 0.6])}s ${pick(["ease", "cubic-bezier(0.4, 0, 0.2, 1)", "cubic-bezier(0.22, 0.61, 0.36, 1)"])}`;
        } else if (moodId === "minimal") {
          s.transition = `${txnProps} ${pick([0.2, 0.25])}s ease`;
        } else {
          s.transition = `${txnProps} ${pick([0.2, 0.3, 0.35])}s ${pick(["ease-out", "ease-in-out"])}`;
        }
      }
    }

    // --- DNA depthLayer activation: canvas-wide depth personality ---
    // "flat" = strip layering, "soft" = gentle inset shadows, "layered" = stacked depth, "heavy" = dramatic multi-shadow
    if (dna?.effectPersonality?.depthLayer) {
      const dl = dna.effectPersonality.depthLayer;
      if (dl === "flat") {
        // Flatten: remove gradient overlays, cap shadow, strip opacity tricks
        if (s.gradientOverlay && Math.random() < 0.5) s.gradientOverlay = undefined;
        s.gradientOverlay2 = undefined;
        if (s.boxShadow && s.boxShadow !== "none" && Math.random() < 0.4) {
          s.boxShadow = pick(["none", `0 1px 2px ${shHex}06`]);
        }
      } else if (dl === "soft") {
        // Gentle inset glow for soft depth
        if (Math.random() < 0.3 && s.boxShadow && s.boxShadow !== "none") {
          s.boxShadow += `, inset 0 1px 4px ${acHex}05`;
        }
        if (Math.random() < 0.2) s.opacity = pick([0.92, 0.94, 0.96]);
      } else if (dl === "layered") {
        // Stacked: add secondary shadow layer for floating depth
        if (Math.random() < 0.35 && s.boxShadow && s.boxShadow !== "none") {
          s.boxShadow += `, 0 ${pick([8, 12, 16])}px ${pick([24, 32, 40])}px ${shHex}06`;
        }
      } else if (dl === "heavy") {
        // Dramatic: triple-depth shadow stacking + slight scale lift
        if (Math.random() < 0.3 && s.boxShadow && s.boxShadow !== "none") {
          s.boxShadow += `, 0 16px 48px ${shHex}08, 0 4px 12px ${acHex}06`;
        }
        if (Math.random() < 0.15 && !s.scale) s.scale = pick([1.01, 1.02, 1.03]);
      } else if (dl === "vivid") {
        // Vivid: colored shadow glow for lively depth
        if (Math.random() < 0.35 && s.boxShadow && s.boxShadow !== "none") {
          s.boxShadow += `, 0 0 ${pick([16, 24, 32])}px ${pick([gcGlow, gc1, acHex])}10`;
        }
      }
    }

    // --- Mask-image vignettes: gradient masks for soft edge fading ---
    // Creates depth illusion and dramatic edge treatments without box-shadow
    if (!isSmall && !isNav) {
      const maskChance = moodId === "elegant" ? 0.18 : moodId === "bold" ? 0.12 : moodId === "playful" ? 0.10 : moodId === "minimal" ? 0.03 : 0.08;
      if (Math.random() < maskChance) {
        if (moodId === "elegant") {
          // Elegant: soft radial vignette or gentle edge fade
          s.maskImage = pick([
            `radial-gradient(ellipse 85% 85% at center, black 60%, transparent 100%)`,
            `linear-gradient(to bottom, black 80%, transparent 100%)`,
            `radial-gradient(ellipse 90% 80% at 50% 40%, black 50%, transparent 100%)`,
          ]);
        } else if (moodId === "bold") {
          // Bold: sharp directional wipes, diagonal cuts
          s.maskImage = pick([
            `linear-gradient(${pick([135, 225, 315])}deg, black 70%, transparent 100%)`,
            `linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)`,
            `linear-gradient(to bottom, black 85%, transparent 100%)`,
          ]);
        } else if (moodId === "playful") {
          // Playful: wave-like organic fade
          s.maskImage = pick([
            `radial-gradient(ellipse 100% 80% at 50% 30%, black 55%, transparent 100%)`,
            `linear-gradient(to bottom, black 70%, transparent 100%)`,
          ]);
        } else {
          // Auto/minimal: subtle bottom fade
          s.maskImage = `linear-gradient(to bottom, black 85%, transparent 100%)`;
        }
      }
    }

    // --- Surface texture patterns: repeating gradient patterns for visual surface texture ---
    // These create subtle visual interest — pinstripes, dot grids, crosshatch, etc.
    if (!isSmall) {
      const dnaTexBoost = dna?.effectPersonality?.surfaceTexture && dna.effectPersonality.surfaceTexture !== "none" ? 0.12 : 0;
      const texChance = (moodId === "bold" ? 0.20 : moodId === "playful" ? 0.18 : moodId === "elegant" ? 0.15 : moodId === "minimal" ? 0.05 : 0.12) + dnaTexBoost;
      if (Math.random() < texChance) {
        const texColor = pick([acHex, gc1, gc2, shHex]);
        if (moodId === "bold") {
          // Bold: strong diagonal stripes or thick grid lines
          s.textureOverlay = pick([
            `repeating-linear-gradient(${pick([45, -45, 135])}deg, ${texColor}08 0px, ${texColor}08 2px, transparent 2px, transparent ${pick([10, 14, 18])}px)`,
            `repeating-linear-gradient(0deg, ${texColor}06 0px, ${texColor}06 3px, transparent 3px, transparent ${pick([12, 16, 20])}px), repeating-linear-gradient(90deg, ${texColor}06 0px, ${texColor}06 3px, transparent 3px, transparent ${pick([12, 16, 20])}px)`,
            `repeating-linear-gradient(${pick([30, 60, 120, 150])}deg, ${texColor}0a 0px, transparent 1px, transparent ${pick([6, 8])}px)`,
          ]);
        } else if (moodId === "playful") {
          // Playful: polka dots, zigzag, confetti-like scattered patterns
          const dotSize = pick([2, 3, 4]);
          const gap = pick([14, 18, 22, 28]);
          const playfulTex = pick(["dots", "zigzag", "grid"]);
          if (playfulTex === "dots") {
            s.textureOverlay = `radial-gradient(circle ${dotSize}px at ${Math.round(gap/2)}px ${Math.round(gap/2)}px, ${texColor}10 ${dotSize}px, transparent ${dotSize}px)`;
            s.textureSize = `${gap}px ${gap}px`;
          } else if (playfulTex === "zigzag") {
            s.textureOverlay = `repeating-linear-gradient(${pick([45, -45])}deg, ${texColor}08 0px, ${texColor}08 ${dotSize}px, transparent ${dotSize}px, transparent ${pick([8, 12])}px), repeating-linear-gradient(${pick([135, -135])}deg, ${pick([acHex, ac2])}06 0px, ${pick([acHex, ac2])}06 ${dotSize}px, transparent ${dotSize}px, transparent ${pick([8, 12])}px)`;
          } else {
            s.textureOverlay = `repeating-linear-gradient(90deg, ${texColor}06 0px, transparent 1px, transparent ${gap}px), repeating-linear-gradient(0deg, ${pick([acHex, ac2])}06 0px, transparent 1px, transparent ${gap}px)`;
          }
        } else if (moodId === "elegant") {
          // Elegant: fine pinstripes, delicate crosshatch, silk-like sheen
          const spacing = pick([20, 24, 30, 36]);
          s.textureOverlay = pick([
            `repeating-linear-gradient(${pick([0, 90])}deg, ${texColor}04 0px, ${texColor}04 1px, transparent 1px, transparent ${spacing}px)`,
            `repeating-linear-gradient(45deg, ${texColor}03 0px, ${texColor}03 1px, transparent 1px, transparent ${spacing}px), repeating-linear-gradient(-45deg, ${texColor}03 0px, ${texColor}03 1px, transparent 1px, transparent ${spacing}px)`,
            `linear-gradient(${pick([110, 130, 160])}deg, ${texColor}02 0%, ${texColor}05 50%, ${texColor}02 100%)`,
          ]);
        } else if (moodId === "minimal") {
          // Minimal: barely-there dot grid or single faint line direction
          const sp = pick([24, 32, 40]);
          s.textureOverlay = `repeating-linear-gradient(${pick([0, 90])}deg, ${texColor}03 0px, ${texColor}03 1px, transparent 1px, transparent ${sp}px)`;
        } else {
          // Auto: mix of all styles
          const autoTex = pick(["lines", "dots", "crosshatch"]);
          if (autoTex === "dots") {
            const ag = pick([16, 20, 24]);
            s.textureOverlay = `radial-gradient(circle 2px at ${Math.round(ag/2)}px ${Math.round(ag/2)}px, ${texColor}08 2px, transparent 2px)`;
            s.textureSize = `${ag}px ${ag}px`;
          } else if (autoTex === "crosshatch") {
            const sp = pick([14, 18]);
            s.textureOverlay = `repeating-linear-gradient(45deg, ${texColor}04 0px, ${texColor}04 1px, transparent 1px, transparent ${sp}px), repeating-linear-gradient(-45deg, ${texColor}04 0px, ${texColor}04 1px, transparent 1px, transparent ${sp}px)`;
          } else {
            s.textureOverlay = `repeating-linear-gradient(${pick([45, -45, 0, 90])}deg, ${texColor}06 0px, ${texColor}06 1px, transparent 1px, transparent ${pick([12, 16, 20])}px)`;
          }
        }
      }
    }

    // ── Compound texture layering: stack a second complementary pattern over the first ──
    // Creates richer surface complexity — dot grid over stripes, noise over crosshatch, etc.
    if (!isSmall && s.textureOverlay) {
      const ctRoll = Math.random();
      const texColor2 = pick([acHex, gc1, gc2, gcGlow || acHex]);
      if (moodId === "bold" && ctRoll < 0.18) {
        // Bold: heavy cross-layer — diagonal stripes + perpendicular thin lines
        const angle2 = pick([0, 90, 135]);
        const gap2 = pick([16, 20, 24]);
        s.textureOverlay += `, repeating-linear-gradient(${angle2}deg, ${texColor2}06 0px, ${texColor2}06 1px, transparent 1px, transparent ${gap2}px)`;
      } else if (moodId === "playful" && ctRoll < 0.20) {
        // Playful: dot scatter over existing pattern — confetti depth
        const dotR = pick([1, 2, 3]);
        const dotGap = pick([20, 26, 32]);
        const offsetX = pick([5, 8, 12]);
        const offsetY = pick([5, 8, 12]);
        s.textureOverlay += `, radial-gradient(circle ${dotR}px at ${offsetX}px ${offsetY}px, ${texColor2}0C ${dotR}px, transparent ${dotR}px)`;
        s.textureSize = s.textureSize ? undefined : `${dotGap}px ${dotGap}px`;
      } else if (moodId === "elegant" && ctRoll < 0.14) {
        // Elegant: silk sheen band over fine texture — luminous stripe
        const sheenAngle = pick([110, 130, 150, 170]);
        s.textureOverlay += `, linear-gradient(${sheenAngle}deg, transparent 30%, ${texColor2}05 48%, ${texColor2}08 52%, transparent 70%)`;
      } else if (moodId === "minimal" && ctRoll < 0.06) {
        // Minimal: barely-there perpendicular whisper
        const perpDir = s.textureOverlay.includes("0deg") ? 90 : 0;
        s.textureOverlay += `, repeating-linear-gradient(${perpDir}deg, ${texColor2}02 0px, ${texColor2}02 1px, transparent 1px, transparent ${pick([30, 36, 44])}px)`;
      } else if (moodId === "auto" && ctRoll < 0.12) {
        // Auto: random second layer from any style
        const autoLayer = pick(["lines", "dots", "sheen"]);
        if (autoLayer === "lines") {
          s.textureOverlay += `, repeating-linear-gradient(${pick([0, 45, 90, 135])}deg, ${texColor2}05 0px, ${texColor2}05 1px, transparent 1px, transparent ${pick([14, 18, 22])}px)`;
        } else if (autoLayer === "dots") {
          const ag = pick([18, 24, 30]);
          s.textureOverlay += `, radial-gradient(circle 1px at ${Math.round(ag/2)}px ${Math.round(ag/2)}px, ${texColor2}08 1px, transparent 1px)`;
        } else {
          s.textureOverlay += `, linear-gradient(${pick([120, 150, 210])}deg, transparent 35%, ${texColor2}04 50%, transparent 65%)`;
        }
      }
    }

    // ── Texture blend modes: mix texture patterns with underlying content for richer surfaces ──
    // backgroundBlendMode affects how texture layers interact with each other;
    // textureMixBlend affects how the texture div composites over the component beneath it
    if (s.textureOverlay) {
      const tbRoll = Math.random();
      if (moodId === "bold" && tbRoll < 0.25) {
        // Bold: high-contrast blending — textures cut through
        s.textureMixBlend = pick(["multiply", "overlay", "hard-light"]);
      } else if (moodId === "playful" && tbRoll < 0.22) {
        // Playful: luminous/colorful blending — textures glow
        s.textureMixBlend = pick(["screen", "color-dodge", "overlay", "soft-light"]);
      } else if (moodId === "elegant" && tbRoll < 0.18) {
        // Elegant: subtle sophisticated blending — silk-like sheen
        s.textureMixBlend = pick(["soft-light", "luminosity", "color"]);
      } else if (moodId === "minimal" && tbRoll < 0.08) {
        // Minimal: barely-there tonal interaction
        s.textureMixBlend = pick(["soft-light", "luminosity"]);
      } else if (moodId === "auto" && tbRoll < 0.15) {
        s.textureMixBlend = pick(["multiply", "screen", "overlay", "soft-light", "color-dodge"]);
      }
      // Compound textures get background-blend-mode for inter-layer blending
      if (s.textureOverlay.includes(",") && Math.random() < 0.30) {
        s.textureBlendMode = pick(["multiply", "screen", "overlay", "difference", "exclusion"]);
      }
    }

    /* ── WILD CARDS — creative surprise combos with DNA colors + mood-weighted selection ── */
    // Auto: 50%, Bold: 12%, Playful: 18%, Elegant: 10%, Minimal: 6%
    const wildChance = moodId === "auto" ? 0.50 : moodId === "bold" ? 0.12 : moodId === "playful" ? 0.18 : moodId === "elegant" ? 0.10 : moodId === "minimal" ? 0.06 : 0;
    if (wildChance > 0 && Math.random() < wildChance) {
      // Mood-weighted wild card selection — each mood favors certain aesthetics
      const WILD_CARDS = [
        "glassmorphism", "neumorphism", "retro", "glow", "paper-cutout",
        "monochrome-flat", "floating-card", "double-border", "ink-bleed",
        "chromatic-shift", "split-tone", "layered-depth", "accent-frame",
        "soft-bloom", "brutalist-type",
        "holographic-edge", "recessed-inset", "neon-outline", "frosted-matte", "duotone-wash",
        // Round 46: compound wild cards — combine 3-4 CSS dimensions for dramatic cohesive looks
        "stained-glass", "film-grain", "vapor-wave", "brutalist-stack", "silk-matte",
      ];
      const MOOD_WEIGHTS = {
        //                                                                                                    stain film vapor brut silk
        auto:    [7, 6, 5, 5, 5, 5, 4, 4, 9, 8, 8, 8, 8, 9, 9, 7, 5, 8, 6, 7,                              7, 6, 7, 6, 7],
        bold:    [3, 4, 12, 8, 6, 4, 5, 6, 5, 10, 8, 10, 12, 3, 12, 10, 8, 14, 3, 6,                        4, 3, 12, 14, 3],
        playful: [6, 5, 8, 10, 10, 3, 6, 8, 4, 12, 10, 8, 6, 8, 4, 12, 4, 14, 3, 8,                         10, 4, 14, 3, 5],
        elegant: [14, 4, 1, 8, 1, 2, 10, 3, 2, 3, 12, 8, 4, 14, 1, 6, 10, 3, 12, 10,                        8, 6, 1, 1, 14],
        minimal: [4, 10, 1, 1, 10, 14, 6, 4, 8, 1, 3, 2, 4, 8, 1, 2, 6, 1, 10, 4,                           2, 4, 1, 1, 8],
      };
      const weights = MOOD_WEIGHTS[moodId] || MOOD_WEIGHTS.auto;
      const totalW = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalW, wIdx = 0;
      for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { wIdx = i; break; } }
      const wildCard = WILD_CARDS[wIdx];

      // ac2 for backward compat in chromatic/split-tone
      const ac2 = palette.ac2 || palette.ac || "#888";

      if (wildCard === "glassmorphism") {
        s.backdropFilter = `blur(${pick([12, 16, 20])}px)`;
        s.border = `1px solid ${gc1}15`;
        s.boxShadow = `0 8px 32px ${shHex}10`;
      } else if (wildCard === "neumorphism") {
        s.boxShadow = dark
          ? `5px 5px 10px #00000030, -5px -5px 10px ${gc1}08`
          : `5px 5px 15px ${shHex}12, -5px -5px 15px #ffffff80`;
        s.border = "none";
        s.borderRadius = pick([12, 16, 20]);
      } else if (wildCard === "retro") {
        s.boxShadow = `6px 6px 0 ${gc1}35`;
        s.borderRadius = pick([0, 2, 4]);
        s.border = `2px solid ${gcGlow}40`;
        s.rotate = `${pick([-1, -0.5, 0.5, 1])}deg`;
        s.textTransform = "uppercase";
      } else if (wildCard === "glow") {
        s.boxShadow = `0 0 15px ${gcGlow}25, 0 0 40px ${gc1}10, inset 0 0 10px ${gcGlow}05`;
        s.border = `1px solid ${gcGlow}30`;
        s.borderRadius = pick([12, 16, 20, 999]);
      } else if (wildCard === "paper-cutout") {
        const offset = pick([4, 5, 6, 8]);
        s.boxShadow = `${offset}px ${offset}px 0 ${shHex}20`;
        s.borderRadius = pick([0, 2]);
        s.border = `1.5px solid ${shHex}15`;
        s.rotate = `${pick([-2, -1.5, -1, 1, 1.5, 2])}deg`;
        s.gradientOverlay = undefined;
      } else if (wildCard === "monochrome-flat") {
        s.boxShadow = "none";
        s.border = "none";
        s.borderRadius = pick([0, 4, 8]);
        s.filter = `saturate(0.${pick([2, 25, 3, 35])}) contrast(1.05)`;
        s.gradientOverlay = undefined;
        s.hueRotate = undefined;
      } else if (wildCard === "floating-card") {
        s.boxShadow = `0 20px 60px ${shHex}15, 0 8px 20px ${shHex}10`;
        s.scale = pick([1.02, 1.03, 1.04]);
        s.borderRadius = pick([16, 20, 24]);
        s.border = "none";
      } else if (wildCard === "double-border") {
        s.border = `2px solid ${gc1}20`;
        s.outline = `2px solid ${gc2}12`;
        s.outlineOffset = `${pick([3, 4, 5, 6])}px`;
        s.borderRadius = pick([8, 12, 16]);
        s.boxShadow = "none";
      } else if (wildCard === "ink-bleed") {
        const bleed = pick([3, 4, 5, 6]);
        s.boxShadow = `0 0 ${bleed}px ${shHex}18, 0 0 ${bleed * 3}px ${shHex}08`;
        s.filter = `saturate(0.${pick([5, 6, 7])}) contrast(${randRange(1.05, 1.15).toFixed(2)})`;
        s.borderRadius = pick([2, 4, 6]);
        s.border = `1px solid ${shHex}10`;
        s.gradientOverlay = undefined;
        s.letterSpacing = pick(["0.02em", "0.03em", "0.04em"]);
      } else if (wildCard === "chromatic-shift") {
        s.boxShadow = `${pick([2, 3])}px ${pick([1, 2])}px 0 ${gc1}20, ${pick([-2, -3])}px ${pick([-1, -2])}px 0 ${gc2}18`;
        s.borderRadius = pick([6, 10, 14]);
        s.hueRotate = pick([8, 12, 15, -8, -12]);
        s.border = "none";
      } else if (wildCard === "split-tone") {
        s.gradientOverlay = `linear-gradient(${pick([135, 160, 200])}deg, ${gc1}12 0%, transparent 40%, ${gc2}10 100%)`;
        s.mixBlendMode = pick(["overlay", "soft-light", "multiply"]);
        s.borderRadius = pick([12, 16, 20]);
        s.boxShadow = `0 4px 20px ${shHex}10`;
      } else if (wildCard === "layered-depth") {
        const d1 = pick([2, 3, 4]), d2 = pick([6, 8, 10]), d3 = pick([14, 18, 22]);
        s.boxShadow = `${d1}px ${d1}px ${d1 * 2}px ${shHex}15, ${d2}px ${d2}px ${d2 * 2}px ${shHex}08, ${d3}px ${d3}px ${d3 * 3}px ${shHex}04`;
        s.borderRadius = pick([10, 14, 18]);
        s.border = "none";
        s.scale = pick([1.01, 1.02, 1.03]);
      } else if (wildCard === "accent-frame") {
        const side = pick(["border", "borderLeft", "borderBottom"]);
        s[side] = `${pick([3, 4, 5])}px solid ${gcGlow}45`;
        s.borderRadius = pick([0, 4, 8]);
        s.textTransform = "uppercase";
        s.letterSpacing = pick(["0.05em", "0.08em", "0.1em"]);
        s.boxShadow = "none";
      } else if (wildCard === "soft-bloom") {
        s.boxShadow = `0 0 ${pick([30, 40, 50])}px ${gc1}12, inset 0 0 ${pick([15, 20])}px ${gcGlow}04`;
        s.filter = `saturate(0.${pick([7, 75, 8])}) brightness(${randRange(1.03, 1.08).toFixed(2)})`;
        s.borderRadius = pick([16, 20, 24, 999]);
        s.border = "none";
        s.gradientOverlay = `radial-gradient(circle at ${pick([30, 50, 70])}% ${pick([30, 50])}%, ${gc2}08 0%, transparent 60%)`;
      } else if (wildCard === "brutalist-type") {
        // Zero decoration, max typography presence
        s.boxShadow = "none";
        s.border = "none";
        s.borderRadius = 0;
        s.textTransform = "uppercase";
        s.letterSpacing = pick(["0.08em", "0.1em", "0.15em"]);
        s.gradientOverlay = undefined;
        s.filter = `contrast(${randRange(1.08, 1.2).toFixed(2)})`;
        s.scale = pick([1.02, 1.04, 1.06]);
      } else if (wildCard === "holographic-edge") {
        // Rainbow prismatic edge glow — like a holographic card catch
        const haloSpread = pick([3, 4, 6]);
        const haloBlur = pick([8, 12, 16]);
        s.boxShadow = [
          `${haloSpread}px 0 ${haloBlur}px ${acHex}25`,
          `-${haloSpread}px 0 ${haloBlur}px ${gc2}20`,
          `0 ${haloSpread}px ${haloBlur}px ${gcGlow}18`,
          `0 -${haloSpread}px ${haloBlur}px ${gc1}15`,
        ].join(", ");
        s.border = `1px solid ${gc1}12`;
        s.borderRadius = pick([8, 12, 16]);
        s.gradientOverlay = `linear-gradient(${pick([105, 135, 160])}deg, ${acHex}06 0%, ${gc2}04 35%, ${gcGlow}06 65%, ${gc1}04 100%)`;
      } else if (wildCard === "recessed-inset") {
        // Sunken/pressed-in appearance — like stamped into the surface
        const inDepth = pick([3, 4, 6]);
        s.boxShadow = [
          `inset ${inDepth}px ${inDepth}px ${inDepth * 2}px ${shHex}18`,
          `inset -${inDepth}px -${inDepth}px ${inDepth * 2}px ${dark ? gc1 : "#ffffff"}12`,
          `0 1px 2px ${shHex}06`,
        ].join(", ");
        s.border = `1px solid ${dark ? gc1 + "08" : shHex + "06"}`;
        s.borderRadius = pick([6, 8, 12]);
        s.filter = `brightness(${(dark ? randRange(0.92, 0.97) : randRange(0.97, 1.0)).toFixed(2)})`;
      } else if (wildCard === "neon-outline") {
        // Glowing outline with electric color pop
        const neonColor = pick([acHex, gcGlow, gc2]);
        const neonWidth = pick([1, 2]);
        const glowSize = pick([6, 10, 14]);
        s.border = `${neonWidth}px solid ${neonColor}90`;
        s.boxShadow = [
          `0 0 ${glowSize}px ${neonColor}30`,
          `0 0 ${glowSize * 2}px ${neonColor}15`,
          `inset 0 0 ${pick([8, 12])}px ${neonColor}08`,
        ].join(", ");
        s.borderRadius = pick([4, 8, 12, 999]);
        s.gradientOverlay = undefined;
      } else if (wildCard === "frosted-matte") {
        // Frosted glass with matte finish — soft and understated
        s.backdropFilter = `blur(${pick([8, 12, 16])}px) saturate(${randRange(0.6, 0.85).toFixed(2)})`;
        s.border = `1px solid ${gc1}08`;
        s.boxShadow = `0 2px 8px ${shHex}06`;
        s.borderRadius = pick([12, 16, 20]);
        s.gradientOverlay = `linear-gradient(${pick([160, 180, 200])}deg, ${gc1}04 0%, transparent 100%)`;
        s.filter = `brightness(${randRange(0.97, 1.02).toFixed(2)})`;
      } else if (wildCard === "duotone-wash") {
        // Two-color tonal wash — everything through a chromatic filter
        const dtAngle = pick([120, 145, 165, 200]);
        s.gradientOverlay = `linear-gradient(${dtAngle}deg, ${acHex}12 0%, ${gc2}10 50%, ${ac2}08 100%)`;
        s.filter = `saturate(${randRange(0.7, 0.9).toFixed(2)}) contrast(${randRange(1.02, 1.1).toFixed(2)})`;
        s.boxShadow = `0 4px 16px ${pick([acHex, gc2])}12`;
        s.border = `1px solid ${pick([acHex, gc2])}10`;
        s.borderRadius = pick([8, 12, 16]);
      }

      // ── Round 46: Compound wild cards — combine 3-4 CSS dimensions ──

      else if (wildCard === "stained-glass") {
        // Colored gradient overlay + thick colored border + vignette mask + inner glow
        const sgColor = pick([acHex, gc1, gc2, gcGlow]);
        const sgAngle = pick([120, 150, 200, 240, 300]);
        s.gradientOverlay = `linear-gradient(${sgAngle}deg, ${sgColor}18 0%, ${gc2}10 40%, ${gc1}14 70%, transparent 100%)`;
        s.border = `${pick([2, 3])}px solid ${sgColor}35`;
        s.maskImage = `radial-gradient(ellipse 90% 85% at center, black 55%, transparent 100%)`;
        s.boxShadow = [
          `inset 0 0 ${pick([12, 18, 24])}px ${sgColor}12`,
          `0 4px 16px ${shHex}10`,
          `0 0 ${pick([8, 12])}px ${sgColor}08`,
        ].join(", ");
        s.borderRadius = pick([8, 12, 16]);
        s.filter = `saturate(${randRange(1.05, 1.20).toFixed(2)}) brightness(${randRange(1.02, 1.06).toFixed(2)})`;
      } else if (wildCard === "film-grain") {
        // Sepia filter + fine dot texture + low contrast + soft edges — vintage cinema
        const filmColor = pick([shHex, gc1]);
        const dotGap = pick([6, 8, 10]);
        s.filter = `sepia(${randRange(0.08, 0.18).toFixed(2)}) contrast(${randRange(0.92, 0.98).toFixed(2)}) brightness(${randRange(1.02, 1.06).toFixed(2)})`;
        s.textureOverlay = `radial-gradient(circle 1px at ${Math.round(dotGap/2)}px ${Math.round(dotGap/2)}px, ${filmColor}0A 1px, transparent 1px)`;
        s.textureSize = `${dotGap}px ${dotGap}px`;
        s.boxShadow = `0 2px 12px ${shHex}08, inset 0 0 30px ${filmColor}04`;
        s.borderRadius = pick([4, 8, 12]);
        s.border = `1px solid ${filmColor}0C`;
        s.maskImage = `linear-gradient(to bottom, black 85%, transparent 100%)`;
      } else if (wildCard === "vapor-wave") {
        // Heavy hue-rotate + saturated gradient + neon glow + retro transform — synthwave aesthetic
        const vwHue = pick([30, 60, 90, 120, 180, 240, 270, 300]);
        const vwGlow = pick([gc1, gc2, gcGlow, acHex]);
        s.hueRotate = vwHue;
        s.filter = `saturate(${randRange(1.25, 1.50).toFixed(2)}) contrast(${randRange(1.04, 1.10).toFixed(2)})`;
        s.gradientOverlay = `linear-gradient(${pick([135, 180, 225])}deg, ${vwGlow}1A 0%, ${gc2}12 50%, ${gc1}18 100%)`;
        s.boxShadow = [
          `0 0 ${pick([12, 20, 28])}px ${vwGlow}20`,
          `0 0 ${pick([30, 40, 50])}px ${vwGlow}0C`,
          `inset 0 0 ${pick([8, 14])}px ${vwGlow}08`,
        ].join(", ");
        s.border = `1px solid ${vwGlow}40`;
        s.borderRadius = pick([4, 8, 999]);
        s.skewX = pick([-1, -0.5, 0.5, 1]);
      } else if (wildCard === "brutalist-stack") {
        // Thick offset shadow + heavy border + bold transform + texture — raw concrete modernism
        const bsColor = pick([gc1, gcGlow, dc.comp]);
        const bsOffset = pick([4, 6, 8]);
        s.boxShadow = [
          `${bsOffset}px ${bsOffset}px 0 ${bsColor}40`,
          `${bsOffset * 2}px ${bsOffset * 2}px 0 ${bsColor}20`,
          `${bsOffset * 3}px ${bsOffset * 3}px 0 ${bsColor}0C`,
        ].join(", ");
        s.border = `${pick([3, 4])}px solid ${bsColor}60`;
        s.borderRadius = pick([0, 2, 4]);
        s.textTransform = "uppercase";
        s.letterSpacing = pick(["0.04em", "0.06em", "0.08em"]);
        s.filter = `contrast(${randRange(1.08, 1.18).toFixed(2)}) grayscale(${randRange(0.0, 0.12).toFixed(2)})`;
        s.textureOverlay = `repeating-linear-gradient(${pick([45, -45])}deg, ${bsColor}06 0px, ${bsColor}06 2px, transparent 2px, transparent ${pick([8, 12])}px)`;
        s.rotate = `${pick([-1, -0.5, 0.5, 1])}deg`;
      } else if (wildCard === "silk-matte") {
        // Ultra-refined: soft desaturation + silk sheen gradient + fine border + whisper shadow — luxury fabric
        const smColor = pick([dc.muted, gc1, dc.analog1]);
        s.filter = `saturate(${randRange(0.75, 0.88).toFixed(2)}) brightness(${randRange(1.04, 1.08).toFixed(2)}) contrast(${randRange(1.01, 1.04).toFixed(2)})`;
        s.gradientOverlay = `linear-gradient(${pick([130, 150, 170])}deg, ${smColor}06 0%, ${smColor}0C 50%, ${smColor}04 100%)`;
        s.boxShadow = `0 2px 8px ${shHex}06, 0 0 1px ${smColor}10`;
        s.border = `1px solid ${smColor}0A`;
        s.borderRadius = pick([8, 12, 16, 20]);
        s.textureOverlay = `repeating-linear-gradient(${pick([0, 90])}deg, ${smColor}03 0px, ${smColor}03 1px, transparent 1px, transparent ${pick([24, 32])}px)`;
        s.letterSpacing = pick(["0.02em", "0.03em"]);
        s.maskImage = `radial-gradient(ellipse 95% 90% at center, black 60%, transparent 100%)`;
      }
    }
  }

  // ── 3D spatial transforms ──
  // Mood-driven perspective + rotation combos that make components feel dimensional
  // Combines perspective, rotateX/Y, translateY, and scale for spatial personality
  if (!isNav && !isCode && !isSmall && !s.perspective) {
    const tdRoll = Math.random();

    if (moodId === "elegant" && tdRoll < 0.18) {
      // Elegant: subtle isometric tilt — like a luxury product shot
      s.perspective = pick([900, 1100, 1400]);
      const axis = Math.random();
      if (axis < 0.45) {
        // Gentle Y-axis rotation — card slightly angled
        s.rotateY = pick([-2, -1.5, -1, 1, 1.5, 2]);
      } else if (axis < 0.75) {
        // Slight X-axis tilt — looking down at the card
        s.rotateX = pick([1, 1.5, 2, 2.5]);
        s.translateY = pick([-1, -2]);
      } else {
        // Combined subtle XY — true isometric hint
        s.rotateX = pick([1, 1.5]);
        s.rotateY = pick([-1, -0.5, 0.5, 1]);
        s.scale = pick([1.01, 1.02]);
      }
    } else if (moodId === "bold" && tdRoll < 0.15) {
      // Bold: dramatic tilt — confident, assertive angle
      s.perspective = pick([600, 800, 1000]);
      const axis = Math.random();
      if (axis < 0.50) {
        // Strong Y rotation — card dramatically angled
        s.rotateY = pick([-4, -3, 3, 4]);
        s.scale = pick([1.02, 1.03, 1.04]);
      } else {
        // Strong X tilt — looking up at the card (heroic angle)
        s.rotateX = pick([-3, -2, 2, 3]);
        s.translateY = pick([-2, -3, -4]);
      }
    } else if (moodId === "playful" && tdRoll < 0.20) {
      // Playful: fun asymmetric tilts — like a scattered desk
      s.perspective = pick([800, 1000, 1200]);
      s.rotateX = pick([-2, -1, 1, 2]);
      s.rotateY = pick([-3, -2, -1, 1, 2, 3]);
      s.rotate = `${pick([-1.5, -1, -0.5, 0.5, 1, 1.5])}deg`;
      if (Math.random() < 0.4) s.translateY = pick([-2, -1, 1, 2]);
    } else if (moodId === "minimal" && tdRoll < 0.06) {
      // Minimal: barely-there tilt — just enough to notice
      s.perspective = pick([1400, 1800, 2200]);
      s.rotateY = pick([-0.5, 0.5, -1, 1]);
    } else if (moodId === "auto" && tdRoll < 0.08) {
      // Auto: random subtle 3D from any personality
      s.perspective = pick([1000, 1200, 1500]);
      s.rotateY = pick([-2, -1, 1, 2]);
      if (Math.random() < 0.3) s.rotateX = pick([-1, 1, 1.5]);
    }
  }

  // ── Transform origin per mood ──
  // Shifts the pivot point for 3D rotations/scales so components feel spatially grounded
  if (s.perspective && !isNav && !isCode) {
    const toRoll = Math.random();
    if (moodId === "elegant" && toRoll < 0.55) {
      // Elegant: off-center origins for magazine-editorial feel
      s.transformOrigin = pick(["center bottom", "30% 60%", "70% 40%", "center 75%", "40% center"]);
    } else if (moodId === "bold" && toRoll < 0.50) {
      // Bold: corner/edge origins for dramatic pivots
      s.transformOrigin = pick(["left center", "right center", "top left", "bottom right", "left bottom", "20% 80%"]);
    } else if (moodId === "playful" && toRoll < 0.60) {
      // Playful: random asymmetric origins for scattered-pinboard feel
      const ox = pick([10, 20, 30, 70, 80, 90]);
      const oy = pick([15, 25, 40, 60, 75, 85]);
      s.transformOrigin = `${ox}% ${oy}%`;
    } else if (moodId === "minimal" && toRoll < 0.20) {
      // Minimal: slight off-center for subtle depth cue
      s.transformOrigin = pick(["45% 50%", "55% 50%", "50% 45%", "50% 55%"]);
    } else if (toRoll < 0.30) {
      // Auto fallback
      s.transformOrigin = pick(["center bottom", "center top", "left center", "right center"]);
    }
  }

  // ── Gradient border effects ──
  // Replace solid borders with gradient borders for striking visual impact
  // Uses border-image for linear/conic gradient borders per mood
  if (!isNav && !isCode && !isSmall && s.border && s.border !== "none") {
    const gbRoll = Math.random();
    const borderWidth = parseInt(s.border) || 1;

    if (moodId === "bold" && gbRoll < 0.22) {
      // Bold: intense directional gradients, thick borders
      const bw = Math.max(borderWidth, 2);
      s.border = `${bw}px solid transparent`;
      const angle = pick([45, 90, 135, 180, 225, 315]);
      s.borderImage = pick([
        `linear-gradient(${angle}deg, ${gcGlow}60, ${gc1}40, ${gc2}60) 1`,
        `linear-gradient(${angle}deg, ${acHex}50, transparent, ${gcGlow}50) 1`,
        `linear-gradient(${angle}deg, ${gc1}70, ${gc2}30, ${gcGlow}70) 1`,
        `conic-gradient(from ${pick([0, 90, 180])}deg, ${gcGlow}50, ${gc1}40, ${gc2}50, ${gcGlow}50) 1`,
      ]);
      s.borderImageSlice = 1;
    } else if (moodId === "elegant" && gbRoll < 0.18) {
      // Elegant: subtle shimmer gradients, fine borders
      s.border = `${Math.max(borderWidth, 1)}px solid transparent`;
      const angle = pick([135, 160, 180, 200]);
      s.borderImage = pick([
        `linear-gradient(${angle}deg, ${gc1}18, ${acHex}30, ${gc1}18) 1`,
        `linear-gradient(${angle}deg, ${acHex}20, ${gc2}12, ${gcGlow}20, ${gc1}12) 1`,
        `linear-gradient(${angle}deg, transparent, ${acHex}25, transparent) 1`,
      ]);
      s.borderImageSlice = 1;
    } else if (moodId === "playful" && gbRoll < 0.25) {
      // Playful: rainbow/multi-stop gradients, fun angles
      const bw = Math.max(borderWidth, 2);
      s.border = `${bw}px solid transparent`;
      s.borderImage = pick([
        `linear-gradient(${pick([45, 135, 225, 315])}deg, ${gc1}50, ${gcGlow}40, ${gc2}50, ${gc1}40) 1`,
        `conic-gradient(from ${pick([0, 45, 90, 135])}deg, ${gc1}45, ${gc2}45, ${gcGlow}45, ${acHex}45, ${gc1}45) 1`,
        `linear-gradient(${pick([90, 180])}deg, ${gcGlow}55, ${gc1}35, ${gc2}55, ${gcGlow}35, ${gc1}55) 1`,
      ]);
      s.borderImageSlice = 1;
    } else if (moodId === "minimal" && gbRoll < 0.06) {
      // Minimal: barely-there gradient fade
      s.border = `1px solid transparent`;
      s.borderImage = pick([
        `linear-gradient(180deg, ${acHex}15, transparent) 1`,
        `linear-gradient(90deg, transparent, ${acHex}12, transparent) 1`,
      ]);
      s.borderImageSlice = 1;
    }
  }

  // ── Mood-based micro-animations ──
  // Subtle CSS animations that make designs feel alive without being distracting
  // Only fires ~20-30% of the time to keep it special
  if (!isNav && !isCode) {
    const animRoll = Math.random();
    const animSpeed = dna?.effectPersonality?.motionSpeed || "normal";
    const durMul = animSpeed === "slow" ? 1.5 : animSpeed === "fast" ? 0.7 : 1.0;

    if (moodId === "elegant" && animRoll < 0.25) {
      // Elegant: gentle breathing, shimmer, morph, or shadow-shift
      const sub = Math.random();
      if (sub < 0.30) {
        // Slow breathe — ultra-subtle opacity pulse
        const dur = (6 + Math.random() * 4) * durMul;
        s.animation = `tp-d-breathe ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (sub < 0.55) {
        // Gradient shimmer on overlay
        const dur = (8 + Math.random() * 6) * durMul;
        s.animation = `tp-d-shimmer ${dur.toFixed(1)}s linear infinite`;
        if (!s.gradientOverlay) {
          s.gradientOverlay = `linear-gradient(90deg, transparent 0%, ${gcGlow}08 25%, transparent 50%, ${gcGlow}06 75%, transparent 100%)`;
          s.backgroundSize = "400% 100%";
        }
      } else if (sub < 0.75) {
        // Shadow-shift — moving light source, elegant ambiance
        const dur = (7 + Math.random() * 4) * durMul;
        s.cssVars = {
          ...(s.cssVars || {}),
          "--d-shad-a": `2px 2px 12px ${shHex}0C, 0 0 8px ${gcGlow}06`,
          "--d-shad-b": `-2px 4px 16px ${shHex}10, 0 0 12px ${gcGlow}0A`,
        };
        s.animation = `tp-d-shadow-shift ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (sub < 0.90) {
        // Morph — subtle organic border-radius shifting
        const dur = (10 + Math.random() * 6) * durMul;
        const br = s.borderRadius || 14;
        const v = Math.max(4, Math.round(br * 0.3));
        s.cssVars = {
          ...(s.cssVars || {}),
          "--d-morph-a": `${br}px ${br + v}px ${br}px ${br - v}px`,
          "--d-morph-b": `${br + v}px ${br}px ${br - v}px ${br}px`,
          "--d-morph-c": `${br - v}px ${br}px ${br + v}px ${br}px`,
        };
        s.animation = `tp-d-morph ${dur.toFixed(1)}s ease-in-out infinite`;
      } else {
        // Glow pulse — box-shadow oscillation
        const dur = (5 + Math.random() * 3) * durMul;
        s.cssVars = {
          ...(s.cssVars || {}),
          "--d-glow-base": `0 0 8px ${gcGlow}08, 0 2px 12px ${shHex}06`,
          "--d-glow-peak": `0 0 20px ${gcGlow}18, 0 4px 24px ${shHex}0C`,
        };
        s.animation = `tp-d-glow-pulse ${dur.toFixed(1)}s ease-in-out infinite`;
      }
    } else if (moodId === "playful" && animRoll < 0.30) {
      // Playful: float, tilt, morph, drift, pulse-scale — fun, bouncy energy
      const sub = Math.random();
      if (sub < 0.30) {
        // Gentle float — components hover slightly
        const dur = (3 + Math.random() * 2) * durMul;
        s.animation = `tp-d-float ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (sub < 0.50) {
        // Micro-tilt — gentle rocking
        const dur = (4 + Math.random() * 3) * durMul;
        s.animation = `tp-d-tilt ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (sub < 0.65) {
        // Morph — blobby border-radius shifting, more dramatic for playful
        const dur = (5 + Math.random() * 3) * durMul;
        const br = s.borderRadius || 14;
        const v = Math.max(6, Math.round(br * 0.5));
        s.cssVars = {
          ...(s.cssVars || {}),
          "--d-morph-a": `${br + v}px ${br - v}px ${br + v}px ${br}px`,
          "--d-morph-b": `${br}px ${br + v}px ${br - v}px ${br + v}px`,
          "--d-morph-c": `${br - v}px ${br + v}px ${br}px ${br - v}px`,
        };
        s.animation = `tp-d-morph ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (sub < 0.78) {
        // Pulse-scale — gentle heartbeat bounce
        const dur = (2.5 + Math.random() * 1.5) * durMul;
        s.cssVars = { ...(s.cssVars || {}), "--d-pulse-s": pick(["1.03", "1.04", "1.05"]) };
        s.animation = `tp-d-pulse-scale ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (sub < 0.90) {
        // Drift — slow horizontal sway
        const dur = (4 + Math.random() * 3) * durMul;
        s.cssVars = { ...(s.cssVars || {}), "--d-drift-x": pick(["3px", "4px", "5px", "-3px", "-4px"]) };
        s.animation = `tp-d-drift ${dur.toFixed(1)}s ease-in-out infinite`;
      } else {
        // Border color dance — cycling border hues
        const dur = (6 + Math.random() * 4) * durMul;
        const bc1 = gc1, bc2 = gc2, bc3 = gcGlow;
        s.cssVars = { ...(s.cssVars || {}), "--d-bc1": `${bc1}50`, "--d-bc2": `${bc2}50`, "--d-bc3": `${bc3}50` };
        s.border = `2px solid ${bc1}50`;
        s.animation = `tp-d-border-dance ${dur.toFixed(1)}s linear infinite`;
      }
    } else if (moodId === "bold" && animRoll < 0.20) {
      // Bold: intense glow pulse, shimmer, shadow-shift, pulse-scale — dramatic presence
      const sub = Math.random();
      if (sub < 0.35) {
        // Strong glow pulse
        const dur = (3 + Math.random() * 2) * durMul;
        s.cssVars = {
          ...(s.cssVars || {}),
          "--d-glow-base": `0 0 12px ${gcGlow}12, 0 4px 16px ${shHex}0A`,
          "--d-glow-peak": `0 0 30px ${gcGlow}28, 0 6px 32px ${shHex}14`,
        };
        s.animation = `tp-d-glow-pulse ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (sub < 0.60) {
        // Fast shimmer — energetic sweep
        const dur = (4 + Math.random() * 2) * durMul;
        s.animation = `tp-d-shimmer ${dur.toFixed(1)}s linear infinite`;
        if (!s.gradientOverlay) {
          s.gradientOverlay = `linear-gradient(90deg, transparent 0%, ${gcGlow}10 30%, transparent 50%, ${gc1}0C 70%, transparent 100%)`;
          s.backgroundSize = "400% 100%";
        }
      } else if (sub < 0.80) {
        // Shadow-shift — dramatic moving light source with bold spread
        const dur = (4 + Math.random() * 2) * durMul;
        s.cssVars = {
          ...(s.cssVars || {}),
          "--d-shad-a": `4px 4px 20px ${shHex}18, 0 0 12px ${gcGlow}10`,
          "--d-shad-b": `-4px 6px 28px ${shHex}20, 0 0 20px ${gcGlow}18`,
        };
        s.animation = `tp-d-shadow-shift ${dur.toFixed(1)}s ease-in-out infinite`;
      } else {
        // Pulse-scale — confident breathing scale
        const dur = (3 + Math.random() * 2) * durMul;
        s.cssVars = { ...(s.cssVars || {}), "--d-pulse-s": pick(["1.02", "1.03"]) };
        s.animation = `tp-d-pulse-scale ${dur.toFixed(1)}s ease-in-out infinite`;
      }
    } else if (moodId === "minimal" && animRoll < 0.08) {
      // Minimal: very rare, very subtle breathe only
      const dur = (8 + Math.random() * 4) * durMul;
      s.animation = `tp-d-breathe ${dur.toFixed(1)}s ease-in-out infinite`;
    } else if (moodId === "auto" && animRoll < 0.12) {
      // Auto: random pick from all animation types
      const autoPick = Math.random();
      if (autoPick < 0.25) {
        const dur = (5 + Math.random() * 3) * durMul;
        s.animation = `tp-d-float ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (autoPick < 0.40) {
        const dur = (7 + Math.random() * 3) * durMul;
        s.animation = `tp-d-breathe ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (autoPick < 0.55) {
        const dur = (6 + Math.random() * 4) * durMul;
        s.cssVars = {
          ...(s.cssVars || {}),
          "--d-glow-base": `0 0 6px ${gcGlow}06`,
          "--d-glow-peak": `0 0 14px ${gcGlow}12`,
        };
        s.animation = `tp-d-glow-pulse ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (autoPick < 0.70) {
        // Drift
        const dur = (5 + Math.random() * 3) * durMul;
        s.cssVars = { ...(s.cssVars || {}), "--d-drift-x": pick(["2px", "3px", "-2px", "-3px"]) };
        s.animation = `tp-d-drift ${dur.toFixed(1)}s ease-in-out infinite`;
      } else if (autoPick < 0.85) {
        // Morph
        const dur = (8 + Math.random() * 4) * durMul;
        const br = s.borderRadius || 14;
        const v = Math.max(4, Math.round(br * 0.35));
        s.cssVars = {
          ...(s.cssVars || {}),
          "--d-morph-a": `${br}px ${br + v}px ${br}px ${br - v}px`,
          "--d-morph-b": `${br + v}px ${br}px ${br - v}px ${br}px`,
          "--d-morph-c": `${br - v}px ${br}px ${br + v}px ${br}px`,
        };
        s.animation = `tp-d-morph ${dur.toFixed(1)}s ease-in-out infinite`;
      } else {
        // Shadow-shift
        const dur = (6 + Math.random() * 3) * durMul;
        s.cssVars = {
          ...(s.cssVars || {}),
          "--d-shad-a": `2px 2px 10px ${shHex}0A`,
          "--d-shad-b": `-2px 3px 14px ${shHex}0E`,
        };
        s.animation = `tp-d-shadow-shift ${dur.toFixed(1)}s ease-in-out infinite`;
      }
    }
  }

  // ── Color temperature tinting ──
  // DNA-driven warm/cool atmospheric bias applied to existing shadows and filters
  // Warm = amber/golden tint, Cool = blue/teal tint, Neutral = no change
  if (dna?.colorTemperature && dna.colorTemperature !== "neutral" && !isNav && !isCode) {
    const temp = dna.colorTemperature;
    // Apply subtle hue-rotate to existing filter (or add one)
    if (temp === "warm" && Math.random() < 0.40) {
      const warmShift = pick([5, 8, 10, -5, -8]); // slight warm direction
      if (s.filter && !s.filter.includes("hue-rotate")) {
        s.filter += ` hue-rotate(${warmShift}deg)`;
      } else if (!s.filter) {
        s.filter = `hue-rotate(${warmShift}deg) saturate(1.04)`;
      }
      // Warm tinted inner glow overlay
      if (!s.gradientOverlay && Math.random() < 0.25) {
        const warmColor = pick(["#F59E0B", "#D97706", "#EA580C", "#DC2626"]);
        s.gradientOverlay = `radial-gradient(ellipse at ${pick(["30% 20%", "70% 30%", "50% 50%"])} , ${warmColor}06 0%, transparent 70%)`;
      }
    } else if (temp === "cool" && Math.random() < 0.40) {
      const coolShift = pick([170, 175, 180, 185, 190]); // blue direction
      if (s.filter && !s.filter.includes("hue-rotate")) {
        s.filter += ` hue-rotate(${pick([5, -5, 8, -8])}deg)`;
      } else if (!s.filter) {
        s.filter = `hue-rotate(${pick([-8, -5, 5, 8])}deg) saturate(1.02)`;
      }
      // Cool tinted inner glow overlay
      if (!s.gradientOverlay && Math.random() < 0.25) {
        const coolColor = pick(["#0EA5E9", "#06B6D4", "#6366F1", "#8B5CF6"]);
        s.gradientOverlay = `radial-gradient(ellipse at ${pick(["30% 20%", "70% 30%", "50% 50%"])} , ${coolColor}06 0%, transparent 70%)`;
      }
    }
  }

  // ── Dual-blend overlay combos ──
  // When a component already has gradientOverlay, add a complementary second overlay
  // with blend modes to create rich visual depth — luminous veils, color washes, noise tints
  if (!isNav && !isCode && !isSmall && s.gradientOverlay && !s.gradientOverlay2) {
    const dbRoll = Math.random();
    if (moodId === "elegant" && dbRoll < 0.20) {
      // Elegant: luminous highlight veil + soft-light blend
      const dir = pick([135, 160, 200, 315]);
      s.gradientOverlay2 = `linear-gradient(${dir}deg, ${acHex}08 0%, transparent 50%, ${gcGlow || acHex}06 100%)`;
      s.mixBlendMode2 = pick(["soft-light", "luminosity", "color"]);
    } else if (moodId === "bold" && dbRoll < 0.18) {
      // Bold: vivid color wash + overlay/multiply blend
      const vividColor = pick([gc1, gc2, acHex]);
      s.gradientOverlay2 = `radial-gradient(ellipse at ${pick(["20% 20%", "80% 80%", "50% 0%"])}, ${vividColor}12 0%, transparent 65%)`;
      s.mixBlendMode2 = pick(["overlay", "multiply", "hard-light"]);
    } else if (moodId === "playful" && dbRoll < 0.22) {
      // Playful: rainbow corner blush + screen/color-dodge blend
      const c1 = pick([gc1, gc2, acHex, gcGlow || acHex]);
      const c2 = pick([gc1, gc2, acHex].filter(c => c !== c1)) || gc1;
      s.gradientOverlay2 = `conic-gradient(from ${pick([0, 90, 180, 270])}deg at ${pick(["0% 0%", "100% 0%", "100% 100%", "0% 100%"])}, ${c1}10, ${c2}08, transparent 60%)`;
      s.mixBlendMode2 = pick(["screen", "color-dodge", "overlay"]);
    } else if (moodId === "minimal" && dbRoll < 0.08) {
      // Minimal: barely-there tonal shift
      s.gradientOverlay2 = `linear-gradient(180deg, ${acHex}04 0%, transparent 100%)`;
      s.mixBlendMode2 = "soft-light";
    }
  }

  // ── Typography personality: line-height + text-decoration ──
  // Line-height creates breathing rhythm; text-decoration adds editorial flair
  if (!isNav && !isCode) {
    const typoRoll = Math.random();
    const isHeading = /heading|hero|title|h[1-3]/i.test(compType);
    const isBody = /body|paragraph|text|content/i.test(compType);

    // Line-height per mood — affects text rhythm and readability feel
    if (typoRoll < 0.35) {
      if (moodId === "elegant") {
        s.lineHeight = isHeading ? pick(["1.15", "1.2", "1.25"]) : pick(["1.7", "1.75", "1.8"]);
      } else if (moodId === "bold") {
        s.lineHeight = isHeading ? pick(["1.0", "1.05", "1.1"]) : pick(["1.5", "1.55", "1.6"]);
      } else if (moodId === "playful") {
        s.lineHeight = isHeading ? pick(["1.2", "1.3", "1.35"]) : pick(["1.65", "1.7", "1.8"]);
      } else if (moodId === "minimal") {
        s.lineHeight = isHeading ? pick(["1.1", "1.15"]) : pick(["1.6", "1.65", "1.7"]);
      }
    }

    // Text-decoration — editorial underlines, overlines for headings and accent elements
    if (isHeading && !isSmall) {
      const decRoll = Math.random();
      if (moodId === "elegant" && decRoll < 0.15) {
        // Elegant: thin sophisticated underlines with offset
        s.textDecoration = "underline";
        s.textDecorationColor = `${acHex}40`;
        s.textDecorationStyle = pick(["solid", "solid", "double"]);
        s.textDecorationThickness = pick(["1px", "1px", "2px"]);
        s.textUnderlineOffset = pick(["4px", "6px", "8px"]);
      } else if (moodId === "bold" && decRoll < 0.12) {
        // Bold: thick striking underlines or overlines
        s.textDecoration = pick(["underline", "underline", "overline"]);
        s.textDecorationColor = `${acHex}70`;
        s.textDecorationStyle = pick(["solid", "wavy"]);
        s.textDecorationThickness = pick(["2px", "3px", "4px"]);
        s.textUnderlineOffset = pick(["3px", "5px"]);
      } else if (moodId === "playful" && decRoll < 0.18) {
        // Playful: wavy/dotted decorations in accent colors
        s.textDecoration = pick(["underline", "underline", "line-through"]);
        s.textDecorationColor = pick([`${acHex}60`, gc1 + "50", gc2 + "50"]);
        s.textDecorationStyle = pick(["wavy", "dotted", "dashed"]);
        s.textDecorationThickness = pick(["2px", "3px"]);
        s.textUnderlineOffset = pick(["3px", "5px", "6px"]);
      } else if (moodId === "minimal" && decRoll < 0.08) {
        // Minimal: barely-there hairline underline
        s.textDecoration = "underline";
        s.textDecorationColor = `${acHex}20`;
        s.textDecorationStyle = "solid";
        s.textDecorationThickness = "1px";
        s.textUnderlineOffset = pick(["4px", "6px"]);
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

    // Hue shift cohesion — if canvas has a hue direction, matching is good
    const myHue = ds.hueRotate || 0;
    const otherHues = otherShapes.map(s => (s.dStyles || {}).hueRotate || 0).filter(h => h !== 0);
    if (otherHues.length >= 2) {
      const avgHue = otherHues.reduce((a, b) => a + b, 0) / otherHues.length;
      if (myHue !== 0 && Math.sign(myHue) === Math.sign(avgHue)) score += 0.15; // same direction
      else if (myHue !== 0 && Math.sign(myHue) !== Math.sign(avgHue)) score -= 0.15; // opposing
    }

    // Gradient cohesion — component should match canvas gradient density
    const myHasGrad = !!ds.gradientOverlay;
    const otherGrads = otherShapes.filter(s => !!(s.dStyles || {}).gradientOverlay).length;
    const canvasGradRate = otherShapes.length ? otherGrads / otherShapes.length : 0;
    if (canvasGradRate > 0.5 && myHasGrad) score += 0.2;        // gradient-heavy canvas, I have one too
    else if (canvasGradRate > 0.5 && !myHasGrad) score -= 0.15; // gradient-heavy canvas, I'm the odd one out
    else if (canvasGradRate < 0.2 && myHasGrad) score -= 0.1;   // clean canvas, my gradient sticks out

    // Border cohesion — component should match canvas border density
    const myHasBorder = !!(ds.border || ds.borderTop || ds.borderBottom);
    const otherBorders = otherShapes.filter(s => { const d = s.dStyles || {}; return !!(d.border || d.borderTop || d.borderBottom); }).length;
    const canvasBorderRate = otherShapes.length ? otherBorders / otherShapes.length : 0;
    if (canvasBorderRate > 0.5 && myHasBorder) score += 0.15;
    else if (canvasBorderRate > 0.5 && !myHasBorder) score -= 0.1;
    else if (canvasBorderRate < 0.15 && myHasBorder) score -= 0.1;
  }

  return Math.max(1, Math.min(5, Math.round(score)));
}
