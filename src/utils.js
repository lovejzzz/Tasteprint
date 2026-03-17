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
