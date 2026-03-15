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

let debounceTimer = null;
export function debounce(fn, ms) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), ms);
  };
}
